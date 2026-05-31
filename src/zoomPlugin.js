import { AE_OS, OS, PLUGIN_FILE_NAME, ZOOM_PLUGIN_STATUS } from "./constants";
import { getPluginsFoldersPaths } from "./utils";

function ZoomPlugin() {
  this._status = undefined;
  this.foundEO = false;
  this.externalObject = undefined;
}

function isZoomPlugin(extObject) {
  return extObject && extObject.quis_zoom_plugin;
}

ZoomPlugin.prototype.loadPlugin = function (path) {
  try {
    var foundExtObject = ExternalObject.search("lib:" + path);
  } catch (error) {
    /**/
  }

  if (foundExtObject) {
    try {
      var extObject = new ExternalObject("lib:" + path);

      if (isZoomPlugin(extObject)) {
        this.foundEO = true;
        this.path = path;
        this.externalObject = extObject;
      }
    } catch (error) {
      /**/
    }
  }
};

ZoomPlugin.prototype.searchForPlugin = function (folder) {
  var files = folder.getFiles();

  for (var i = 0; i < files.length; i++) {
    this.loadPlugin(files[i].fsName);

    if (this.foundEO) {
      break;
    }
  }

  /** If plugin is not found is this folder search in sub-folders */
  if (!this.foundEO) {
    for (i = 0; i < files.length; i++) {
      if (files[i] instanceof Folder) {
        /** skip plug-ins on macos because they are treated as folders */
        if (AE_OS === OS.MAC && files[i].name.indexOf(".plugin") !== -1) {
          continue;
        }

        this.searchForPlugin(files[i]);

        if (this.foundEO) {
          break;
        }
      }
    }
  }
};

ZoomPlugin.prototype.findPlugin = function () {
  var pluginsFoldersPaths = getPluginsFoldersPaths();
  var separator = AE_OS === OS.WIN ? "\\" : "/";

  function normalizeFolderPath(path) {
    if (!path) {
      return "";
    }

    path = path.toString();
    var lastChar = path.charAt(path.length - 1);
    if (lastChar !== "\\" && lastChar !== "/") {
      path += separator;
    }

    return path;
  }

  function getCandidatePaths(folderPath) {
    folderPath = normalizeFolderPath(folderPath);
    if (!folderPath) {
      return [];
    }

    return [
      folderPath + PLUGIN_FILE_NAME,
      folderPath + "Zoom" + separator + PLUGIN_FILE_NAME,
    ];
  }

  function tryPluginPath(plugin, path) {
    if (!path || plugin.foundEO) {
      return;
    }

    try {
      var file = new File(path);
      if (file.exists) {
        plugin.loadPlugin(file.fsName);
      }
    } catch (error) {
      /**/
    }
  }

  /** Only probe the known Zoom plug-in locations. Recursive probing can crash AE. */
  var candidatePaths = getCandidatePaths(pluginsFoldersPaths.common).concat(
    getCandidatePaths(pluginsFoldersPaths.individual),
  );

  for (var i = 0; i < candidatePaths.length; i++) {
    tryPluginPath(this, candidatePaths[i]);

    if (this.foundEO) {
      break;
    }
  }
};

ZoomPlugin.prototype.status = function () {
  if (this._status === undefined) {
    this._status = ZOOM_PLUGIN_STATUS.NOT_FOUND;

    if ($.global.__quis_zoom_plugin_is_loaded) {
      this._status = ZOOM_PLUGIN_STATUS.INITIALIZED_NOT_FOUND;

      if (!this.externalObject) {
        this.findPlugin();
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
  if (this.externalObject.getError) {
    return this.externalObject.getError();
  }
};

ZoomPlugin.prototype.reload = function () {
  if (this.externalObject.reload) {
    this._status = this.externalObject.reload();
  }
};

ZoomPlugin.prototype.updateKeyBindings = function () {
  if (this.externalObject.updateKeyBindings) {
    this.externalObject.updateKeyBindings();
  }
};

ZoomPlugin.prototype.updateExperimentalOptions = function () {
  if (this.externalObject.updateExperimentalOptions) {
    this.externalObject.updateExperimentalOptions();
  }
};

ZoomPlugin.prototype.updateHighDpiOptions = function () {
  if (this.externalObject.updateHighDpiOptions) {
    this.externalObject.updateHighDpiOptions();
  }
};

ZoomPlugin.prototype.startKeyCapture = function () {
  if (this.externalObject.startKeyCapture) {
    this.externalObject.startKeyCapture();
  }
};

ZoomPlugin.prototype.endKeyCapture = function () {
  if (this.externalObject.endKeyCapture) {
    this.externalObject.endKeyCapture();
  }
};

ZoomPlugin.prototype.postZoomAction = function (actionType, amount) {
  var isActionPosted = false;

  if (this.externalObject.postZoomAction) {
    isActionPosted = this.externalObject.postZoomAction(actionType, amount);
  }

  return isActionPosted;
};

ZoomPlugin.prototype.getVersion = function () {
  var result;

  if (this.externalObject.getVersion) {
    result = this.externalObject.getVersion();
  }

  return result;
};

var zoomPlugin = new ZoomPlugin();

export default zoomPlugin;
