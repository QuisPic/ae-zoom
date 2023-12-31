import Settings from "./ui/settings";
import NumberValue from "./ui/number-value";
import Slider from "./ui/slider";
import ValueList from "./ui/value-list";
import { ZOOM_LIST_VALUES, STICK_TO } from "./constants";
import preferences from "./preferences";

function Zoom(thisObj) {
  var currentZoom = Zoom.getViewZoom();
  var zoomSetToFn = this.produceSetTo();

  this.w =
    thisObj instanceof Panel
      ? thisObj
      : new Window("palette", "Zoom", undefined, { resizeable: true });

  this.w.orientation = "row";
  this.w.alignChildren = ["left", "center"];
  this.w.spacing = 2;
  this.w.margins = this.w instanceof Panel ? [2, 0, 2, 0] : 5;

  this.w.onResize = function () {
    this.layout.resize();
  };

  this.w.onResizing = this.w.onResize;

  this.zoomNumberValue = new NumberValue(
    this.w,
    "%",
    currentZoom,
    0.8,
    undefined,
    this.produceSetTo(),
  );

  this.zoomNumberValue.element.addEventListener(
    "mouseover",
    this.produceSyncOnMouseOver(),
  );

  this.zoomValueList = new ValueList(
    this.w,
    ZOOM_LIST_VALUES,
    function (val) {
      zoomSetToFn(parseFloat(val));
    },
    this.zoomNumberValue.element,
    STICK_TO.LEFT,
  );
  this.w.grSlider = this.w.add("group");
  this.settings = new Settings(this, this.w);

  if (preferences.showSlider) {
    this.addSlider();
  }
}

Zoom.prototype.addSlider = function () {
  this.zoomSlider = new Slider(
    this,
    this.w.grSlider,
    this.produceSliderOnChange(),
    this.produceSliderOnScrubStart(),
    this.produceSliderOnScrubEnd(),
    this.zoomNumberValue.getValue(),
    preferences.sliderMin || 1,
    preferences.sliderMax,
  );

  this.zoomSlider.element.addEventListener(
    "mouseover",
    this.produceSyncOnMouseOver(),
  );

  this.zoomSlider.addIncrementBtns(this, this.produceOnIncrement());

  this.w.grSlider.alignment = ["fill", "center"];
  this.settings.element.alignment = ["right", "center"];
};

Zoom.getViewZoom = function () {
  return parseFloat((app.activeViewer.views[0].options.zoom * 100).toFixed(2));
};

Zoom.prototype.setUiTo = function (zoomValue) {
  this.zoomNumberValue.setValue(zoomValue);

  if (this.zoomSlider && isValid(this.zoomSlider.element)) {
    this.zoomSlider.setValue(zoomValue);
  }
};

Zoom.prototype.setTo = function (zoomValue) {
  zoomValue = zoomValue < 0.8 ? 0.8 : zoomValue;

  this.setUiTo(zoomValue);
  app.activeViewer.views[0].options.zoom = zoomValue / 100;
};

Zoom.prototype.syncWithView = function () {
  var viewZoomValue = Zoom.getViewZoom();

  if (viewZoomValue !== this.zoomNumberValue.getValue()) {
    this.setUiTo(viewZoomValue);
  }
};

// function factory for passing the func to other functions
Zoom.prototype.produceSetTo = function () {
  var thisZoom = this;

  return function (zoomValue) {
    thisZoom.setTo(zoomValue);
  };
};

Zoom.prototype.produceSyncOnMouseOver = function () {
  var thisZoom = this;

  return function (event) {
    if (event.eventPhase === "target" && preferences.syncWithView) {
      thisZoom.syncWithView();
    }
  };
};

Zoom.prototype.produceSliderOnScrubStart = function () {
  var thisZoom = this;

  return function () {
    var viewer = app.activeViewer.views[0];

    thisZoom.origExposure = viewer.options.exposure;
  };
};

Zoom.prototype.produceSliderOnChange = function () {
  var thisZoom = this;

  return function (zoomValue) {
    var viewer = app.activeViewer.views[0];

    thisZoom.setTo(zoomValue);

    // this exposure trick makes AE refresh the view panel everytime we move the slider
    if (thisZoom.origExposure !== undefined) {
      viewer.options.exposure =
        viewer.options.exposure === thisZoom.origExposure
          ? thisZoom.origExposure + 0.01
          : thisZoom.origExposure;
    }
  };
};

Zoom.prototype.produceSliderOnScrubEnd = function () {
  var thisZoom = this;

  return function () {
    var viewer = app.activeViewer.views[0];

    if (thisZoom.origExposure !== undefined) {
      viewer.options.exposure = thisZoom.origExposure;
      thisZoom.origExposure = undefined;
    }
  };
};

Zoom.prototype.produceOnIncrement = function () {
  var thisZoom = this;

  return function (zoomValue) {
    var currValue = thisZoom.zoomNumberValue.getValue();
    var viewValue = Zoom.getViewZoom();

    if (preferences.syncWithView && currValue !== viewValue) {
      zoomValue = viewValue + (zoomValue - currValue);
    }

    thisZoom.setTo(zoomValue);
  };
};

Zoom.prototype.showHideSlider = function () {
  var val;

  if (this.zoomSlider && isValid(this.zoomSlider.element)) {
    this.zoomSlider.parentEl.remove(this.zoomSlider.element);
    this.zoomSlider.parentEl.preferredSize = [0, 0];

    this.w.grSlider.alignment = ["left", "center"];
    this.settings.element.alignment = ["left", "center"];

    val = false;
  } else {
    this.addSlider();

    val = true;
  }

  preferences.save("showSlider", val);

  this.w.layout.layout(true);
  this.w.layout.resize();
};

export default Zoom;
