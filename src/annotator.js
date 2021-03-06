var $ = require("jquery");
var _ = require("underscore");
var range = ace.acequire("ace/range");

var parser = require("./lang/parser");

module.exports = function createAnnotator(editSession) {
  return new Annotator(editSession);
};

function Annotator(editSession) {
  var markerIds = [];

  this.codeHighlight = function(code, i, clazz) {
    if (_.isNumber(i)) {
      var lAndC = parser.indexToLineAndColumn(i, code);

      // Add overhang if marked char is actually off end of line.
      // This happens because Ace doesn't support extending markers
      // outside text in this context and if we marked the first char
      // of the next line it would look a bit weird to the user.
      var overhangClass = isOffEndOfLine(code, i) ? " overhang" : "";

      var r = new range.Range(lAndC.line - 1,
                              lAndC.column - 1,
                              lAndC.line - 1,
                              lAndC.column);

      markerIds.push(editSession.addMarker(r,
                                           "ace_code_highlight " +
                                           clazz + " " +
                                           overhangClass,
                                           "text",
                                           true));
    }
  };

  this.lineMessage = function(code, i, clazz, message) {
    var line = parser.indexToLineAndColumn(i, code).line;
    var currentLineMessageHolders = $("#line-messages");
    for (var i = 0; i < line; i++) {
      var inner = i === line - 1 ? "<span>" + message + "</span>" : "&nbsp;";
      currentLineMessageHolders.append("<div class='line-message'>" + inner + "</div>");
    }
  };

  this.clear = function() {
    markerIds.forEach(function(x) { editSession.removeMarker(x); });
    markerIds = [];
    $("#line-messages").empty();
  };
};

function isOffEndOfLine(code, i) {
  var lAndC = parser.indexToLineAndColumn(i, code);
  var lineStr = code.split("\n")[lAndC.line - 1];
  return lineStr === undefined || lineStr[lAndC.column - 1] === undefined;
};
