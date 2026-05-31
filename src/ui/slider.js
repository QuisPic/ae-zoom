import { checkOs, makeDivisibleBy } from "../utils";
import { BLUE_COLOR, OS, ZOOM_STEP_ON_BTN_CLICK } from "../constants";
import ScreenWindow from "./screen-window";

function Slider(
  zoom,
  parentEl,
  onChangeFn,
  onScrubStartFn,
  onScrubEndFn,
  initVal,
  min,
  max,
) {
  this.parentEl = parentEl;

  this.element = parentEl.add(
    "Group { \
      spacing: 1, \
      alignment: ['fill', 'center'], \
      grDecrement: Group { \
        orientation: 'stack', \
        alignment: ['left', 'center'], \
        alignChildren: ['fill', 'fill'], \
      }, \
      slider: Custom { \
        preferredSize: [150, 16], \
        alignment: ['fill', 'center'], \
      }, \
      grIncrement: Group { \
        orientation: 'stack', \
        alignment: ['right', 'center'], \
        alignChildren: ['fill', 'fill'], \
      }, \
    }",
  );

  this.setMin(min);
  this.setMax(max);
  this.setValue(initVal);
  this.lastValue = initVal;

  var slider = this.element.slider;
  var thisSlider = this;

  slider.scrubbing = false;
  slider.isMouseOver = false;

  function redrawSlider() {
    try {
      slider.notify("onDraw");
    } catch (error) {
      /**/
    }
  }

  function getLocalXFromEvent(event) {
    if (
      slider.scrubbing &&
      typeof event.screenX === "number" &&
      typeof slider.dragStartScreenX === "number" &&
      typeof slider.dragStartClientX === "number"
    ) {
      return slider.dragStartClientX + (event.screenX - slider.dragStartScreenX);
    }

    return typeof event.clientX === "number" ? event.clientX : 4;
  }

  function getValueFromEvent(event) {
    var width = slider.size && slider.size[0] ? slider.size[0] : 150;
    var margin = 4;
    var usableWidth = Math.max(1, width - margin * 2);
    var x = getLocalXFromEvent(event);
    var ratio;

    x = x < margin ? margin : x;
    x = x > width - margin ? width - margin : x;
    ratio = (x - margin) / usableWidth;

    return thisSlider.getMin() + ratio * (thisSlider.getMax() - thisSlider.getMin());
  }

  function setValueFromEvent(event, shouldPreview) {
    thisSlider.setValue(Math.round(getValueFromEvent(event)));

    if (shouldPreview && typeof onChangeFn === "function") {
      onChangeFn(thisSlider.getValue());
    }
  }

  function closeDragWindow() {
    var screenWin = slider.screenWin;
    slider.screenWin = undefined;

    if (screenWin && screenWin.element && screenWin.element.visible) {
      try {
        screenWin.element.close();
      } catch (error) {
        /**/
      }
    }
  }

  function getScreenForEvent(event) {
    if (!event || typeof event.screenX !== "number") {
      return undefined;
    }

    for (var i = 0; i < $.screens.length; i++) {
      if (
        event.screenX >= $.screens[i].left &&
        event.screenX <= $.screens[i].right &&
        event.screenY >= $.screens[i].top &&
        event.screenY <= $.screens[i].bottom
      ) {
        return $.screens[i];
      }
    }

    return $.screens.length ? $.screens[0] : undefined;
  }

  function openDragWindow(event) {
    var screen = getScreenForEvent(event);

    if (!screen) {
      return;
    }

    thisSlider.lastMousePosition = [event.screenX, event.screenY];
    slider.screenWin = new ScreenWindow(
      thisSlider,
      screen,
      function (moveEvent) {
        setValueFromEvent(moveEvent, true);
      },
      function (closeEvent) {
        finishScrub(closeEvent);
      },
    );
  }

  function finishScrub(event) {
    if (!slider.scrubbing) {
      return;
    }

    if (event && typeof event.screenX === "number") {
      setValueFromEvent(event, false);
    }

    slider.scrubbing = false;
    closeDragWindow();
    slider.dragStartScreenX = undefined;
    slider.dragStartClientX = undefined;
    redrawSlider();

    if (typeof onScrubEndFn === "function") {
      onScrubEndFn(thisSlider.getValue());
    }
  }

  slider.onDraw = function (drawState) {
    var g = this.graphics;
    var width = this.size && this.size[0] ? this.size[0] : 150;
    var height = this.size && this.size[1] ? this.size[1] : 16;
    var margin = 4;
    var trackHeight = 4;
    var thumbWidth = 8;
    var thumbHeight = 14;
    var min = thisSlider.getMin();
    var max = thisSlider.getMax();
    var range = Math.max(1, max - min);
    var ratio = (thisSlider.getValue() - min) / range;
    var trackLeft = margin;
    var trackTop = Math.floor((height - trackHeight) / 2);
    var trackWidth = Math.max(1, width - margin * 2);
    var thumbCenter = trackLeft + trackWidth * ratio;
    var thumbLeft = thumbCenter - thumbWidth / 2;
    var thumbTop = Math.floor((height - thumbHeight) / 2);
    var trackBrush = g.newBrush(g.BrushType.SOLID_COLOR, [0.28, 0.28, 0.28, 1]);
    var fillBrush = g.newBrush(g.BrushType.SOLID_COLOR, BLUE_COLOR);
    var thumbBrush = g.newBrush(
      g.BrushType.SOLID_COLOR,
      (drawState && drawState.mouseOver) || this.scrubbing || this.isMouseOver
        ? [0.9, 0.9, 0.9, 1]
        : [0.72, 0.72, 0.72, 1],
    );

    function fillRect(brush, left, top, rectWidth, rectHeight) {
      g.newPath();
      g.moveTo(left, top);
      g.lineTo(left + rectWidth, top);
      g.lineTo(left + rectWidth, top + rectHeight);
      g.lineTo(left, top + rectHeight);
      g.closePath();
      g.fillPath(brush);
    }

    fillRect(trackBrush, trackLeft, trackTop, trackWidth, trackHeight);
    fillRect(fillBrush, trackLeft, trackTop, thumbCenter - trackLeft, trackHeight);
    fillRect(thumbBrush, thumbLeft, thumbTop, thumbWidth, thumbHeight);
  };

  slider.addEventListener("mouseover", function (event) {
    if (event.eventPhase === "target") {
      this.isMouseOver = true;
      redrawSlider();
    }
  });

  slider.addEventListener("mouseout", function (event) {
    if (event.eventPhase === "target") {
      this.isMouseOver = false;
      redrawSlider();
    }
  });

  slider.addEventListener("mousedown", function (event) {
    if (event.eventPhase === "target") {
      closeDragWindow();
      slider.scrubbing = true;
      slider.dragStartScreenX = event.screenX;
      slider.dragStartClientX = event.clientX;

      if (typeof onScrubStartFn === "function") {
        onScrubStartFn();
      }

      setValueFromEvent(event, true);
      openDragWindow(event);
    }
  });

  slider.addEventListener("mousemove", function (event) {
    if (event.eventPhase === "target" && slider.scrubbing) {
      setValueFromEvent(event, true);
    }
  });

  slider.addEventListener("mouseup", function (event) {
    if (event.eventPhase === "target") {
      finishScrub(event);
    }
  });
}

Slider.prototype.addIncrementBtns = function (zoom, onIncrementFn) {
  var grIncrement = this.element.grIncrement;
  var grDecrement = this.element.grDecrement;

  grDecrement.zoomIcon = grDecrement.add("Group { preferredSize: [25, 16] }");
  grDecrement.grLight = grDecrement.add("Group { visible: false }");

  grIncrement.zoomIcon = grIncrement.add("Group { preferredSize: [25, 16] }");
  grIncrement.grLight = grIncrement.add("Group { visible: false }");

  var g = grDecrement.grLight.graphics;
  var lightBrush = g.newBrush(g.BrushType.SOLID_COLOR, [1, 1, 1, 0.06]);

  function increment(zoomStep, mouseEvent) {
    if (checkOs() === OS.WIN ? mouseEvent.ctrlKey : mouseEvent.metaKey) {
      zoomStep /= 10;
    } else if (mouseEvent.shiftKey) {
      zoomStep *= 10;
    }

    var newValue = makeDivisibleBy(
      zoom.zoomNumberValue.getValue() + zoomStep,
      zoomStep,
      zoomStep < 0,
    );

    // this.element.slider.value = newValue;
    zoom.zoomSlider.setValue(newValue);

    if (typeof onIncrementFn === "function") {
      onIncrementFn(newValue);
    }
  }

  function showLight(event) {
    if (event.eventPhase === "target") {
      this.zoomIcon.light = true;
      this.grLight.show();
    }
  }

  function hideLight(event) {
    if (event.eventPhase === "target") {
      this.zoomIcon.light = false;
      this.grLight.hide();
    }
  }

  grDecrement.grLight.graphics.backgroundColor = lightBrush;
  grIncrement.grLight.graphics.backgroundColor = lightBrush;

  grIncrement.zoomIcon.onDraw = function () {
    var g = this.graphics;
    var c = this.light ? [0.9, 0.9, 0.9, 1] : [0.65, 0.65, 0.65, 1];
    var b = g.newBrush(g.BrushType.SOLID_COLOR, c);

    g.moveTo(3, this.size[1] - 4);
    g.lineTo(g.currentPoint[0] + 6, g.currentPoint[1] - 6);
    g.lineTo(g.currentPoint[0] + 2, g.currentPoint[1] + 2);
    g.lineTo(g.currentPoint[0] - 4, g.currentPoint[1] + 4);
    g.fillPath(b);

    var lastPoint = g.currentPoint;
    g.currentPath = g.newPath();
    g.moveTo(lastPoint[0] + 1, lastPoint[1]);
    g.lineTo(g.currentPoint[0] + 7, g.currentPoint[1] - 8);
    g.lineTo(g.currentPoint[0] + 7, g.currentPoint[1] + 8);
    g.fillPath(b);
  };

  grDecrement.zoomIcon.onDraw = function () {
    var g = this.graphics;
    var c = this.light ? [0.9, 0.9, 0.9, 1] : [0.65, 0.65, 0.65, 1];
    var b = g.newBrush(g.BrushType.SOLID_COLOR, c);

    g.moveTo(8, this.size[1] - 5);
    g.lineTo(g.currentPoint[0] + 3, g.currentPoint[1] - 3);
    g.lineTo(g.currentPoint[0] + 1, g.currentPoint[1] + 1);
    g.lineTo(g.currentPoint[0] - 2, g.currentPoint[1] + 2);
    g.fillPath(b);

    var lastPoint = g.currentPoint;
    g.currentPath = g.newPath();
    g.moveTo(lastPoint[0], lastPoint[1]);
    g.lineTo(g.currentPoint[0] + 4, g.currentPoint[1] - 4);
    g.lineTo(g.currentPoint[0] + 4, g.currentPoint[1] + 4);
    g.fillPath(b);
  };

  grIncrement.addEventListener("click", function (event) {
    if (event.eventPhase === "target") {
      increment(ZOOM_STEP_ON_BTN_CLICK, event);
    }
  });

  grDecrement.addEventListener("click", function (event) {
    if (event.eventPhase === "target") {
      increment(-ZOOM_STEP_ON_BTN_CLICK, event);
    }
  });

  grDecrement.addEventListener("mouseover", showLight);
  grIncrement.addEventListener("mouseover", showLight);
  grDecrement.addEventListener("mouseout", hideLight);
  grIncrement.addEventListener("mouseout", hideLight);
};

Slider.prototype.getValue = function () {
  return Math.round(this.value);
};

Slider.prototype.setValue = function (val, skipDraw) {
  val = parseFloat(val);

  if (isNaN(val)) {
    val = this.getMin() || 0;
  }

  val = val < this.getMin() ? this.getMin() : val;
  val = val > this.getMax() ? this.getMax() : val;

  this.value = val;
  this.element.slider.value = val;
  this.lastValue = val;

  if (!skipDraw) {
    try {
      this.element.slider.notify("onDraw");
    } catch (error) {
      /**/
    }
  }
};

Slider.prototype.getMin = function () {
  return this.minValue;
};

Slider.prototype.getMax = function () {
  return this.maxValue;
};

Slider.prototype.setMin = function (min) {
  this.minValue = min;
  this.element.slider.minvalue = min;
};

Slider.prototype.setMax = function (max) {
  this.maxValue = max;
  this.element.slider.maxvalue = max;
};

export default Slider;
