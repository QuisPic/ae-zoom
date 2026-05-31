import Settings from "./ui/settings";
import NumberValue from "./ui/number-value";
import Slider from "./ui/slider";
import ValueList from "./ui/value-list";
import {
  CUSTOM_SLIDER_LIVE_INTERVAL_MS,
  KB_ACTION,
  STICK_TO,
} from "./constants";
import preferences from "./preferences";
import bind from "../extern/function-bind";
import zoomPlugin from "./zoomPlugin";

function Zoom(thisObj) {
  var currentZoom = 100;

  this.w =
    thisObj instanceof Panel
      ? thisObj
      : new Window("palette", "Zoom", undefined, {
          resizeable: true,
        });

  this.w.orientation = "row";
  this.w.alignChildren = ["left", "center"];
  this.w.spacing = 2;
  this.w.margins = this.w instanceof Panel ? [2, 0, 2, 0] : [5, 5, 8, 5];

  this.w.onResize = function () {
    this.layout.resize();
  };

  this.w.onResizing = this.w.onResize;

  this.zoomNumberValue = new NumberValue(
    this.w,
    "%",
    currentZoom,
    1,
    undefined,
    this.produceSetTo(),
  );

  this.zoomNumberValue.element.addEventListener(
    "mouseover",
    this.produceSyncOnMouseOver(),
  );

  this.zoomValueList = new ValueList(
    this.w,
    bind(function (val) {
      this.setTo(val);
      this.setUiTo(val);
    }, this),
    this.zoomNumberValue.element,
    STICK_TO.LEFT,
  );
  this.w.grSlider = this.w.add("group");
  this.settings = new Settings(this, this.w);

  if (preferences.showSlider) {
    this.addSlider();
  }
}

Zoom.prototype.getActiveViewer = function () {
  var activeViewer;

  try {
    activeViewer = app.activeViewer;
  } catch (error) {
    if (isModalStartupError(error)) {
      return this.lastActiveViewer;
    }

    throw error;
  }

  if (activeViewer) {
    this.lastActiveViewer = activeViewer;
    return activeViewer;
  } else if (this.lastActiveViewer) {
    return this.lastActiveViewer;
  } else {
    return;
  }
};

Zoom.prototype.getActiveViewIndex = function (viewer) {
  var viewIndex = 0;

  if (!viewer || !viewer.views || !viewer.views.length) {
    return viewIndex;
  }

  try {
    if (typeof viewer.activeViewIndex === "number") {
      viewIndex = viewer.activeViewIndex;
    }
  } catch (error) {
    viewIndex = 0;
  }

  if (isNaN(viewIndex) || viewIndex < 0 || viewIndex >= viewer.views.length) {
    viewIndex = 0;
  }

  return viewIndex;
};

Zoom.prototype.getActiveView = function (viewer) {
  viewer = viewer || this.getActiveViewer();

  if (!viewer || !viewer.views || !viewer.views.length) {
    return undefined;
  }

  return viewer.views[this.getActiveViewIndex(viewer)];
};

Zoom.prototype.canUsePluginZoom = function (viewer) {
  return (
    preferences.experimental.fixViewportPosition.enabled &&
    zoomPlugin.isAvailable() &&
    this.getActiveViewIndex(viewer) === 0
  );
};

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

  this.zoomSlider.addIncrementBtns(this, this.produceOnIncrement());

  this.w.grSlider.alignment = ["fill", "center"];
  this.settings.element.alignment = ["right", "center"];
};

Zoom.prototype.getViewZoom = function () {
  var viewer = this.getActiveViewer();
  var view = this.getActiveView(viewer);

  if (!view) {
    return undefined;
  }

  var zoomValue = view.options.zoom;
  zoomValue *= preferences.highDPI.enabled
    ? 100 * preferences.highDPI.scale
    : 100;

  return parseFloat(zoomValue.toFixed(2));
};

Zoom.prototype.setUiTo = function (zoomValue, skipSlider, skipLayout) {
  this.zoomNumberValue.setValue(zoomValue, skipLayout);

  if (!skipSlider && this.zoomSlider && isValid(this.zoomSlider.element)) {
    this.zoomSlider.setValue(zoomValue);
  }
};

Zoom.prototype.setTo = function (zoomValue, viewer, view, forceScriptZoom) {
  zoomValue = zoomValue < 0.8 ? 0.8 : zoomValue;
  viewer = viewer || this.getActiveViewer();
  view = view || this.getActiveView(viewer);
  var isActionPosted = false;

  if (!forceScriptZoom && this.canUsePluginZoom(viewer)) {
    isActionPosted = zoomPlugin.postZoomAction(KB_ACTION.SET_TO, zoomValue);
  }

  if (!isActionPosted && view) {
    zoomValue /= preferences.highDPI.enabled
      ? 100 * preferences.highDPI.scale
      : 100;
    view.options.zoom = zoomValue;
  }
};

Zoom.prototype.queueSliderZoom = function (zoomValue) {
  this.scrubZoomValue = zoomValue;
};

Zoom.prototype.queueSliderPreview = function (zoomValue) {
  this.queueSliderZoom(zoomValue);
  this.pendingSliderZoomValue = zoomValue;

  if (!this.sliderPreviewScheduled) {
    this.sliderPreviewScheduled = true;

    try {
      app.scheduleTask(
        "$.global.__quis_zoom_custom_apply_slider_preview()",
        CUSTOM_SLIDER_LIVE_INTERVAL_MS,
        false,
      );
    } catch (error) {
      this.applyPendingSliderPreview();
    }
  }
};

Zoom.prototype.applyPendingSliderPreview = function () {
  this.sliderPreviewScheduled = false;

  if (!this.sliderScrubbing || this.pendingSliderZoomValue === undefined) {
    return;
  }

  var zoomValue = this.pendingSliderZoomValue;
  var viewer = this.scrubViewer || this.getActiveViewer();
  var view = this.scrubView || this.getActiveView(viewer);

  this.pendingSliderZoomValue = undefined;
  this.setTo(zoomValue, viewer, view, true);
  this.setUiTo(zoomValue, true, true);
};

Zoom.prototype.syncWithView = function () {
  var viewZoomValue = this.getViewZoom();

  if (
    viewZoomValue !== undefined &&
    viewZoomValue !== this.zoomNumberValue.getValue()
  ) {
    this.setUiTo(viewZoomValue);
  }
};

// function factory for passing the func to other functions
Zoom.prototype.produceSetTo = function () {
  var thisZoom = this;

  return function (zoomValue) {
    thisZoom.setTo(zoomValue);
    thisZoom.setUiTo(zoomValue);
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
    var viewer = thisZoom.getActiveViewer();
    var view = thisZoom.getActiveView(viewer);

    thisZoom.sliderScrubbing = true;
    thisZoom.scrubViewer = viewer;
    thisZoom.scrubView = view;
    thisZoom.scrubZoomValue = undefined;
    thisZoom.pendingSliderZoomValue = undefined;
  };
};

Zoom.prototype.produceSliderOnChange = function () {
  var thisZoom = this;

  return function (zoomValue) {
    thisZoom.queueSliderPreview(zoomValue);
  };
};

Zoom.prototype.produceSliderOnScrubEnd = function () {
  var thisZoom = this;

  return function (zoomValue) {
    thisZoom.queueSliderZoom(
      zoomValue !== undefined ? zoomValue : thisZoom.zoomNumberValue.getValue(),
    );
    var finalZoomValue =
      thisZoom.scrubZoomValue !== undefined
        ? thisZoom.scrubZoomValue
        : thisZoom.zoomNumberValue.getValue();
    var viewer = thisZoom.scrubViewer || thisZoom.getActiveViewer();
    var view = thisZoom.scrubView || thisZoom.getActiveView(viewer);

    thisZoom.setTo(finalZoomValue, viewer, view, true);
    thisZoom.setUiTo(finalZoomValue);
    thisZoom.scrubZoomValue = undefined;
    thisZoom.pendingSliderZoomValue = undefined;
    thisZoom.scrubViewer = undefined;
    thisZoom.scrubView = undefined;
    thisZoom.sliderScrubbing = false;
  };
};

Zoom.prototype.produceOnIncrement = function () {
  var thisZoom = this;

  return function (zoomValue) {
    var currValue = thisZoom.zoomNumberValue.getValue();
    var viewValue = thisZoom.getViewZoom() || currValue;

    if (preferences.syncWithView && currValue !== viewValue) {
      zoomValue = viewValue + (zoomValue - currValue);
    }

    thisZoom.setTo(zoomValue);
    thisZoom.setUiTo(zoomValue);
  };
};

Zoom.prototype.showHideSlider = function (val) {
  val = val === undefined ? !preferences.showSlider : val;
  var hasSlider = this.zoomSlider && isValid(this.zoomSlider.element);

  if (val && !hasSlider) {
    this.addSlider();
  } else if (!val && hasSlider) {
    this.zoomSlider.parentEl.remove(this.zoomSlider.element);
    this.zoomSlider.parentEl.preferredSize = [0, 0];

    this.w.grSlider.alignment = ["left", "center"];
    this.settings.element.alignment = ["left", "center"];
  }

  preferences.save("showSlider", val);

  this.w.layout.layout(true);
  this.w.layout.resize();
};

export function isModalStartupError(error) {
  var message = error ? String(error.message || error) : "";
  return (
    message.indexOf("modal dialog") !== -1 ||
    message.indexOf("5027") !== -1 ||
    (error && error.number === 5027)
  );
}

export default Zoom;
