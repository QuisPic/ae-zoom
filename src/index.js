import Zoom, { isModalStartupError } from "./zoom";
import {
  STARTUP_DELAY_MS,
  STARTUP_MAX_RETRIES,
  STARTUP_RETRY_DELAY_MS,
} from "./constants";
import windows from "./windows";
import SettingsWindow from "./ui/settings/settings-window";

var zoom;
var startupRetries = 0;

function scheduleStartup(delayMs) {
  app.scheduleTask("$.global.__quis_zoom_custom_startup()", delayMs, false);
}

function startZoom() {
  if (zoom) {
    return;
  }

  try {
    zoom = new Zoom(__zoomThisObj);

    if (zoom.w instanceof Panel) {
      zoom.w.layout.layout(true);
      zoom.w.layout.resize();
    } else {
      zoom.w.show();
    }
  } catch (error) {
    zoom = undefined;

    if (isModalStartupError(error) && startupRetries < STARTUP_MAX_RETRIES) {
      startupRetries += 1;
      scheduleStartup(STARTUP_RETRY_DELAY_MS);
      return;
    }

    throw error;
  }
}

$.global.__quis_zoom_custom_apply_slider_preview = function () {
  if (zoom && typeof zoom.applyPendingSliderPreview === "function") {
    zoom.applyPendingSliderPreview();
  }
};

$.global.__quis_zoom_open_settings = function () {
  if (zoom) {
    windows.new(new SettingsWindow(zoom));
  }
};

if (__zoomThisObj instanceof Panel) {
  startZoom();
} else {
  $.global.__quis_zoom_custom_startup = startZoom;
  scheduleStartup(STARTUP_DELAY_MS);
}
