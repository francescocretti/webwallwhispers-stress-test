var splsApp = splsApp === undefined ? {} : splsApp;

splsApp.checkDevice = {};

function gcd (a, b) {
  return (b == 0) ? a : gcd (b, a%b);
}

splsApp.checkDevice.isMobile = {
  Android: function() {
    var m = navigator.userAgent.match(/Android/i);
    if (m === null) {
      return false;
    } else {
      return true;
    }
  },
  BlackBerry: function() {
    var m = navigator.userAgent.match(/BlackBerry/i);
    if (m === null) {
      return false;
    } else {
      return true;
    }
  },
  iOS: function() {
    var m = navigator.userAgent.match(/iPhone|iPad|iPod/i);
    if (m === null) {
      return false;
    } else {
      return true;
    }
  },
  Opera: function() {
    var m = navigator.userAgent.match(/Opera Mini/i);
    if (m === null) {
      return false;
    } else {
      return true;
    }
  },
  Windows: function() {
    var m = navigator.userAgent.match(/IEMobile/i);
    if (m === null) {
      return false;
    } else {
      return true;
    }
  },
  any: function() {
    return (this.Android() || this.BlackBerry() || this.iOS() || this.Opera() || this.Windows());
  }
};


splsApp.checkDevice.getAspectRatio = function () {
  var w = screen.width;
  var h = screen.height;
  var r = gcd(w, h);
  var arString = `${w/r}:${h/r}`;
  return arString;
};

splsApp.checkDevice.getScreenSize = function () {
  var sString = `${screen.width}x${screen.height}`;
  return sString;
};

splsApp.checkDevice.getScreenArea = function () {
  return screen.width * screen.height;
};
