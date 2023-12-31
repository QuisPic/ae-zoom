import { PLUGIN_FILE_NAME, ZOOM_PLUGIN_STATUS } from "./constants";
import { getPluginsFolder } from "./utils";

function ZoomPlugin() {
  this._status = undefined;
  this.foundEO = false;
  this.externalObject = undefined;
}

ZoomPlugin.prototype.status = function () {
  if (this._status === undefined) {
    this._status = ZOOM_PLUGIN_STATUS.NOT_FOUND;
    var libPath = "lib:" + PLUGIN_FILE_NAME;

    if (!this.foundEO) {
      try {
        this.foundEO = ExternalObject.search(libPath);
      } catch (error) {
        /* if the plugin isn't found in the standard search folders 
        try to search explicitly in the plugins folder */
        var pluginsFolder = getPluginsFolder();

        if (pluginsFolder) {
          var pluginFile = File(
            pluginsFolder.fullName + "/" + PLUGIN_FILE_NAME,
          );

          if (pluginFile.exists) {
            libPath = "lib:" + pluginFile.fsName;

            try {
              this.foundEO = ExternalObject.search(libPath);
            } catch (error) {
              /**/
            }
          }
        }
      }
    }

    if (this.foundEO && !this.externalObject) {
      try {
        this.externalObject = new ExternalObject(libPath);
      } catch (error) {
        alert(
          "Error loading Zoom plug-in.\nError at line " +
            $.line +
            ":\n" +
            error.message,
        );

        this.foundEO = false;
      }
    }

    if (this.externalObject) {
      try {
        if (this.externalObject.status) {
          this._status = ZOOM_PLUGIN_STATUS.FOUND_NOT_INITIALIZED;

          var pluginStatus = this.externalObject.status();

          if (pluginStatus !== undefined) {
            this._status = pluginStatus; // INITIALIZATION_ERROR or INITIALIZED
          }
        }
      } catch (error) {
        alert(
          "Error loading Zoom plug-in.\nError at line " +
            $.line +
            ":\n" +
            error.message,
        );
      }
    }
  }

  return this._status;
};

ZoomPlugin.prototype.resetStatus = function () {
  this._status = undefined;
};

ZoomPlugin.prototype.isAvailable = function () {
  return this.status() === ZOOM_PLUGIN_STATUS.INITIALIZED;
};

ZoomPlugin.prototype.getError = function () {
  return this.externalObject.getError();
};

ZoomPlugin.prototype.reload = function () {
  this._status = this.externalObject.reload();
};

ZoomPlugin.prototype.updateKeyBindings = function () {
  this.externalObject.updateKeyBindings();
};

ZoomPlugin.prototype.startKeyCapture = function () {
  this.externalObject.startKeyCapture();
};

ZoomPlugin.prototype.endKeyCapture = function () {
  this.externalObject.endKeyCapture();
};

var zoomPlugin = new ZoomPlugin();

export default zoomPlugin;
