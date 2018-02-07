// Color space conversion methods
// Original methods written by Brian Grinstead in TinyColors library
// http://bgrins.github.io/TinyColor/docs/tinycolor.html
function HSV(h, s, v) {
  this.h = h;
  this.s = s;
  this.v = v;
}

function RGB(r, g, b) {
  this.r = r;
  this.g = g;
  this.b = b;
}

function Colors() {
    this.mathMin = Math.min;
    this.mathMax = Math.max;
    this.mathRound = Math.round;
    this.mathAbs = Math.abs;
    this.referenceColorsHsv = {
        maroon: new HSV(16, 25, 60),
        green: new HSV(170, 20, 76),
        grey: new HSV(16, 15, 55),
        yellow: new HSV(33, 30, 75)
    };
    this.referenceColorsRgb = {
        maroon: new RGB(153, 125, 115),
        green: new RGB(155, 194, 187),
        grey: new RGB(140, 125, 119),
        yellow: new RGB(191, 165, 134)
    };
    this.referenceColorsLabArray = [
      this.rgb2lab(this.referenceColorsRgb.maroon),
      this.rgb2lab(this.referenceColorsRgb.green),
      this.rgb2lab(this.referenceColorsRgb.grey),
      this.rgb2lab(this.referenceColorsRgb.yellow)
    ];
}

Colors.prototype.isPercentage = function(n) {
    return typeof n === "string" && n.indexOf('%') != -1;
};

Colors.prototype.isOnePointZero = function(n) {
    return typeof n == "string" && n.indexOf('.') != -1 && parseFloat(n) === 1;
};

Colors.prototype.bound01 = function(n, max) {
    if (this.isOnePointZero(n)) {
        n = "100%";
    }
    var processPercent = this.isPercentage(n);
    n = this.mathMin(max, this.mathMax(0, parseFloat(n)));
    if (processPercent) {
        n = parseInt(n * max, 10) / 100;
    }
    if ((Math.abs(n - max) < 0.000001)) {
        return 1;
    }
    return (n % max) / parseFloat(max);
};

Colors.prototype.rgbToHsv = function(r, g, b) {
    r = this.bound01(r, 255);
    g = this.bound01(g, 255);
    b = this.bound01(b, 255);

    var max = this.mathMax(r, g, b),
        min = this.mathMin(r, g, b);
    var h, s, v = max;
    var d = max - min;
    s = max === 0 ? 0 : d / max;
    if (max == min) {
        h = 0; // achromatic
    } else {
        switch (max) {
            case r:
                h = (g - b) / d + (g < b ? 6 : 0);
                break;
            case g:
                h = (b - r) / d + 2;
                break;
            case b:
                h = (r - g) / d + 4;
                break;
        }
        h /= 6;
    }
    //return { h: h, s: s, v: v };
    var h = this.mathRound(h * 360),
        s = this.mathRound(s * 100),
        v = this.mathRound(v * 100);

    var color = new HSV(h, s, v)
    return color;
};

Colors.prototype.hsvToRgb = function(h, s, v) {
    h = this.bound01(h, 360) * 6;
    s = this.bound01(s, 100);
    v = this.bound01(v, 100);

    var i = Math.floor(h),
        f = h - i,
        p = v * (1 - s),
        q = v * (1 - f * s),
        t = v * (1 - (1 - f) * s),
        mod = i % 6,
        r = [v, q, p, p, t, v][mod],
        g = [t, v, v, q, p, p][mod],
        b = [p, p, t, v, v, q][mod];

    return {
        r: r * 255,
        g: g * 255,
        b: b * 255
    };
};

Colors.prototype.toHsvString = function(hsvColor) {
    return `hsv(${hsvColor.h}, ${hsvColor.s}, ${hsvColor.v})`;
};

Colors.prototype.euclideanDistance = function(hsvColor1, hsvColor2) {
    var i, d = 0;
    var dh = this.mathMin(this.mathAbs(hsvColor1.h - hsvColor2.h),
        360 - this.mathAbs(hsvColor1.h - hsvColor2.h)) / 180;
    var ds = this.mathAbs(hsvColor1.s - hsvColor2.s) / 100;
    var dv = this.mathAbs(hsvColor1.v - hsvColor2.v) / 100;
    d = dh * dh + ds * ds + dv * dv;
    return Math.sqrt(d);
};

Colors.prototype.matchColorHsv = function (hsvColor) {
    var refColors = [this.referenceColorsHsv.maroon, this.referenceColorsHsv.green,
        this.referenceColorsHsv.grey, this.referenceColorsHsv.yellow
    ];
    var ds = [];
    var d = ds[0] = this.euclideanDistance(hsvColor, refColors[0]);
    var idx = 0;
    for (let i = 1; i < refColors.length; i++) {
        var dist = this.euclideanDistance(hsvColor, refColors[i]);
        ds[i] = dist;
        if (dist < d) {
            d = dist;
            idx = i;
        }
    }
    console.log("distances " + ds + "closest color: " + idx);
    return refColors[idx];
    //return this.toHsvString(refColors[idx]);
};

Colors.prototype.matchColor = function (rgbColor) {
  // Returns the index of the most similar color in reference array
  var labColor = this.rgb2lab(rgbColor);
  var d = this.deltaE(labColor, this.referenceColorsLabArray[0]);
  var idx = 0;
  for (let i = 1; i < this.referenceColorsLabArray.length; i++) {
      var dist = this.deltaE(labColor, this.referenceColorsLabArray[i]);
      if (dist < d) {
          d = dist;
          idx = i;
      }
  }
  /*
   * 0 -> maroon
   * 1 -> green
   * 2 -> grey
   * 3 -> yellow
   */
  return idx;
  //return this.lab2rgb(refColors[idx]);
};

// the following functions are based off of the pseudocode
// found on www.easyrgb.com
Colors.prototype.lab2rgb = function(lab) {
    var y = (lab[0] + 16) / 116,
        x = lab[1] / 500 + y,
        z = y - lab[2] / 200,
        r, g, b;

    x = 0.95047 * ((x * x * x > 0.008856) ? x * x * x : (x - 16 / 116) / 7.787);
    y = 1.00000 * ((y * y * y > 0.008856) ? y * y * y : (y - 16 / 116) / 7.787);
    z = 1.08883 * ((z * z * z > 0.008856) ? z * z * z : (z - 16 / 116) / 7.787);

    r = x * 3.2406 + y * -1.5372 + z * -0.4986;
    g = x * -0.9689 + y * 1.8758 + z * 0.0415;
    b = x * 0.0557 + y * -0.2040 + z * 1.0570;

    r = (r > 0.0031308) ? (1.055 * Math.pow(r, 1 / 2.4) - 0.055) : 12.92 * r;
    g = (g > 0.0031308) ? (1.055 * Math.pow(g, 1 / 2.4) - 0.055) : 12.92 * g;
    b = (b > 0.0031308) ? (1.055 * Math.pow(b, 1 / 2.4) - 0.055) : 12.92 * b;

    return [
      Math.max(0, Math.min(1, r)) * 255,
      Math.max(0, Math.min(1, g)) * 255,
      Math.max(0, Math.min(1, b)) * 255
    ]
};


Colors.prototype.rgb2lab = function(rgb) {
    var r = rgb.r / 255,
        g = rgb.g / 255,
        b = rgb.b / 255,
        x, y, z;

    r = (r > 0.04045) ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
    g = (g > 0.04045) ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
    b = (b > 0.04045) ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

    x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
    y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.00000;
    z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;

    x = (x > 0.008856) ? Math.pow(x, 1 / 3) : (7.787 * x) + 16 / 116;
    y = (y > 0.008856) ? Math.pow(y, 1 / 3) : (7.787 * y) + 16 / 116;
    z = (z > 0.008856) ? Math.pow(z, 1 / 3) : (7.787 * z) + 16 / 116;

    return [(116 * y) - 16, 500 * (x - y), 200 * (y - z)]
};

// calculate the perceptual distance between colors in CIELAB
// https://github.com/THEjoezack/ColorMine/blob/master/ColorMine/ColorSpaces/Comparisons/Cie94Comparison.cs

Colors.prototype.deltaE = function(labA, labB) {
    var deltaL = labA[0] - labB[0];
    var deltaA = labA[1] - labB[1];
    var deltaB = labA[2] - labB[2];
    var c1 = Math.sqrt(labA[1] * labA[1] + labA[2] * labA[2]);
    var c2 = Math.sqrt(labB[1] * labB[1] + labB[2] * labB[2]);
    var deltaC = c1 - c2;
    var deltaH = deltaA * deltaA + deltaB * deltaB - deltaC * deltaC;
    deltaH = deltaH < 0 ? 0 : Math.sqrt(deltaH);
    var sc = 1.0 + 0.045 * c1;
    var sh = 1.0 + 0.015 * c1;
    var deltaLKlsl = deltaL / (1.0);
    var deltaCkcsc = deltaC / (sc);
    var deltaHkhsh = deltaH / (sh);
    var i = deltaLKlsl * deltaLKlsl + deltaCkcsc * deltaCkcsc + deltaHkhsh * deltaHkhsh;
    return i < 0 ? 0 : Math.sqrt(i);
};
