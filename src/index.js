require("babel-core/polyfill");
var fs = require("fs");
var parse = require("./lang/parser");
var interpret = require("./lang/interpreter");
var r = require("./runner");
var createEditor = require("./editor");
var createEnv = require("./env");
var range = ace.acequire("ace/range");

window.addEventListener("load", function() {
  var editor = createEditor(fs.readFileSync(__dirname + "/demo-program.txt", "utf8"));

  var tickStop = start(editor);
  editor.on("change", function() {
    if (tickStop !== undefined) {
      tickStop();
    }

    tickStop = start(editor);
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

function reportError(editSession, e) {
  var r = new range.Range(e.line - 1, e.column - 1, e.line - 1, e.column);
  return editSession.addMarker(r, "ace_parse_error", "text", true);
};

var markerIds = [];
function start(editor) {
  var code = editor.getValue();
  var editSession = editor.getSession();
  var screen = document.getElementById("screen").getContext("2d");
  var env = interpret.createScope(createEnv(screen));

  markerIds.forEach(function(x) { editSession.removeMarker(x); });
  markerIds = [];

  try {
    var g = r(code, env);
    console.log("Parsed ok");

    var going = true;
    (function tick() {
      if (going) {
        step(g);
        requestAnimationFrame(tick);
      }
    })();

    return function() {
      going = false;
    };
  } catch (exception) {
    if (exception instanceof parse.ParseError) {
      exception.errors.forEach(function(e) {
        console.log(e.message);
        markerIds.push(reportError(editor.getSession(), e));
      });
    } else {
      throw exception;
    }
  }
};
