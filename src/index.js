var fs = require("fs");
var _ = require("underscore");

require("babel-core/polyfill");

var parser = require("./lang/parser");
var interpret = require("./lang/interpreter");
var scope = require("./lang/scope");
var r = require("./runner");
var createEditor = require("./editor");
var createAnnotator = require("./annotator");
var createEnv = require("./env");

window.addEventListener("load", function() {
  var editor = createEditor(fs.readFileSync(__dirname + "/demo-program.txt", "utf8"));
  var annotator = createAnnotator(editor.getSession());

  var tickStop = start(editor, annotator);
  editor.on("change", function() {
    if (tickStop !== undefined) {
      tickStop();
    }

    tickStop = start(editor, annotator);
  });
});

function step(g) {
  try {
    r.step(g);
  } catch (e) {
    if (e instanceof r.DoneError) {
      console.log("Program complete.");
    } else if (e instanceof r.RuntimeError) {
      console.log(e.stack);
    } else {
      console.log(e.stack);
    }
  }
};

function parse(code, annotator) {
  try {
    parser.balanceParentheses(code);

    var ast = parser.parse(code);

    return ast;
  } catch(e) {
    if (e instanceof parser.ParseError) {
      annotator.codeHighlight(code, e.i, "error");
      annotator.lineMessage(code, e.i, "error", e.message);
    } else if (e instanceof parser.ParenthesisError) {
      annotator.codeHighlight(code, e.i, "error");
      displayRainbowParentheses(code, annotator);

      annotator.lineMessage(code, e.i, "error", e.message);
    }

    throw e;
  }
};

function timeToYieldToEventLoop(lastYield) {
  return new Date().getTime() - lastYield > 8;
};

function start(editor, annotator) {
  var code = editor.getValue();
  var screen = document.getElementById("screen").getContext("2d");
  var env = scope(createEnv(screen));

  annotator.clear();

  try {
    var g = r(parse(code, annotator), env);
    var lastEventLoopYield = new Date().getTime();

    var going = true;
    (function tick() {
      if (going) {
        step(g);
        if (timeToYieldToEventLoop(lastEventLoopYield)) {
          requestAnimationFrame(function() {
            lastEventLoopYield = new Date().getTime();
            tick();
          });
        } else {
          tick();
        }
      }
    })();

    return function() {
      going = false;
    };
  } catch (e) {
    console.log(e.message);
  }
};

function displayRainbowParentheses(code, annotator) {
  parser.rainbowParentheses(code)
    .forEach(function(p, i) {
      p.map(function(offset) {
        annotator.codeHighlight(code, offset, "rainbow-" + i % 4);  });
    });
};
