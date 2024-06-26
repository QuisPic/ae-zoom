import bind from "../../extern/function-bind";
import { openURL } from "../utils";

function TextLink(parentEl, text, linkAddress) {
  this.element = parentEl.add(
    "Group { \
      orientation: 'column', \
      spacing: 0, \
      alignChildren: 'left', \
      txt: StaticText {}, \
      line: Custom { \
        alignment: 'fill', \
        preferredSize: [-1, 2], \
      }, \
    }",
  );

  var textSize = this.element.txt.graphics.measureString(text);
  var textGraphics = this.element.txt.graphics;
  var lightBluePen = textGraphics.newPen(
    textGraphics.PenType.SOLID_COLOR,
    [65 / 255, 160 / 255, 1, 1],
    2,
  );
  var darkBluePen = textGraphics.newPen(
    textGraphics.PenType.SOLID_COLOR,
    [0.176, 0.411, 0.921, 1],
    2,
  );

  this.element.txt.text = text;
  this.element.txt.graphics.foregroundColor = darkBluePen;

  this.element.txt.addEventListener("click", function () {
    openURL(linkAddress);
  });

  this.element.txt.addEventListener(
    "mouseover",
    bind(function () {
      this.element.txt.graphics.foregroundColor = lightBluePen;
      this.element.line.mouseOver = true;
      this.element.line.notify("onDraw");
    }, this),
  );

  this.element.txt.addEventListener(
    "mouseout",
    bind(function () {
      this.element.txt.graphics.foregroundColor = darkBluePen;
      this.element.line.mouseOver = false;
      this.element.line.notify("onDraw");
    }, this),
  );

  this.element.line.onDraw = function () {
    var g = this.graphics;
    var p = this.mouseOver ? lightBluePen : darkBluePen;

    g.moveTo(0, 0);
    g.lineTo(textSize[0], 0);
    g.strokePath(p);
  };
}

export default TextLink;
