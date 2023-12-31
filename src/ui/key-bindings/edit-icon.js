function EditIcon(parentEl, interactive, enabled, onClickFn) {
  enabled = enabled || (enabled === undefined ? true : false);

  this.element = parentEl.add(
    "Group { \
      icon: Custom { \
        preferredSize: [16, 19], \
      }, \
    }",
  );

  function handleMouseOver(event) {
    if (event.eventPhase === "target") {
      this.icon.notify("onDraw");
    }
  }

  if (interactive) {
    this.element.addEventListener("mouseover", handleMouseOver);
    this.element.addEventListener("mouseout", handleMouseOver);
  }

  this.element.icon.enabled = enabled;
  this.element.icon.onDraw = function (drawState) {
    var g = this.graphics;

    var c = drawState.mouseOver ? [0.75, 0.75, 0.75, 1] : [0.55, 0.55, 0.55, 1];
    c = this.enabled ? c : [0.2, 0.2, 0.2, 1];

    var b = g.newBrush(g.BrushType.SOLID_COLOR, c);
    var p = g.newPen(g.BrushType.SOLID_COLOR, c, 3);

    g.moveTo(14, 1);
    g.lineTo.apply(g, g.currentPoint + [-3.8, 9]);
    g.strokePath(p);

    g.newPath();
    g.moveTo(8, 11);
    g.lineTo.apply(g, g.currentPoint + [3.5, 1.5]);
    g.lineTo.apply(g, g.currentPoint + [-3.5, 4]);
    g.fillPath(b);
  };

  if (typeof onClickFn === "function") {
    this.element.addEventListener("click", function (event) {
      onClickFn(event);
    });
  }
}

export default EditIcon;
