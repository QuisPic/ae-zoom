import { OS } from "./constants";

export function getPrimaryScreen() {
  for (var i = 0; i < $.screens.length; i++) {
    if ($.screens[i].primary) {
      return $.screens[i];
    }
  }

  return $.screens[0];
}

export function checkOs() {
  return $.os.indexOf("Win") !== -1 ? OS.WIN : OS.MAC;
}

export function makeDivisibleBy(val, divisor, goUp) {
  if (val % divisor) {
    var result;
    divisor = divisor < 0 ? Math.abs(divisor) : divisor;

    if (divisor < 1) {
      // float-point math...
      var epsilon = 0.00000000000001;

      divisor = 1 / divisor;

      result = goUp
        ? Math.ceil((val - epsilon) * divisor) / divisor
        : Math.floor((val + epsilon) * divisor) / divisor;
    } else {
      result = goUp
        ? Math.ceil(val / divisor) * divisor
        : Math.floor(val / divisor) * divisor;
    }

    return result;
  }

  return val;
}

export function isNaN(number) {
  return number != number;
}

export function getElementLocationInWindow(element) {
  var location = [element.bounds.left, element.bounds.top];
  var parent = element.parent;

  while (parent) {
    location[0] += parent.bounds.left;
    location[1] += parent.bounds.top;

    parent = parent.parent;
  }

  return location;
}

export function openURL(url) {
  try {
    if (checkOs() === OS.WIN) {
      system.callSystem("explorer " + url);
    } else {
      system.callSystem("open " + url);
    }
  } catch (error) {
    alert(error);
  }
}

export function saveFileFromBinaryString(binaryString) {
  function checkFileError(fo) {
    if (fo.error) {
      alert("Error saving file: " + fo.error, "Error", true);
      return fo.error;
    }

    return false;
  }

  var err = false;
  var fileObj = new File(Folder.current.absoluteURI + "/" + "ae-zoom.aex");
  fileObj = fileObj.saveDlg();

  if (fileObj) {
    fileObj.encoding = "BINARY";

    if (fileObj.open("w")) {
      fileObj.write(binaryString);

      err = checkFileError(fileObj);

      fileObj.close();
    }

    err = checkFileError(fileObj);

    return err;
  }
}

// export function drawLine(customEl) {
//   var parentEl = customEl.parent;

//   if (!parentEl.size) {
//     parentEl.parent.layout.layout(true);
//   }

//   if (parentEl.orientation === "row") {
//     customEl.size = [1, parentEl.size[1] + 5];
//   } else {
//     customEl.size = [parentEl.size[0] + 5, 1];
//   }

//   customEl.onDraw = function () {
//     var g = this.graphics;
//     var c = [0.3, 0.3, 0.3, 1];
//     var p = g.newPen(g.PenType.SOLID_COLOR, c, 1);

//     g.moveTo(-5, 0);
//     g.lineTo(this.size[0] + 5, 0);
//     g.strokePath(p);
//   };
// }
