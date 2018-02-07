/** ACTIVE ZONE PROTOTYPE
 *
 * @param {Object} HTMLdoc
 *			DOM document object
 *
 * @param {String} _id
 *			Unique string identifier of active zone
 *
 * @param {Object} loc
 *			OpenSeaDragon Rec Object for define active zone location
 *
 **/
function ActiveZone(HTMLdoc, _id, loc) {
  this.element = HTMLdoc.createElement('div');
  this.id = _id;
  this.location = loc;
  this.visible = false;
}

/**
 * @param {Array} rgbColor
 *			Array of RGB values
 *
 * @param {Number} alpha
 *			Transparency value
 *
 * @param {Number} z
 *			CSS z-index
 **/
ActiveZone.prototype.setStyle = function (rgbColor, alpha, z) {
  this.element.style.background = 'rgb('+rgbColor[0]+','+rgbColor[1]+','+rgbColor[2]+')';
  this.element.style.opacity = alpha.toString();
  this.element.style.zIndex = z.toString();
};

/**
 * @param {Function} callback
 *			Function to be called when clicked on active zone
 **/
ActiveZone.prototype.setAction = function (callback) {
  this.action = callback;
};

/**
 * @param {Number} val
 *			Starting opacity value for fade out
 *
 * @param {Function} callback
 *			Function to be called at the end of fade
 **/
ActiveZone.prototype.opacityFadeOut = function (val, callback) {
  const self = this;
  if (isNaN(val)) {
    val = 0.9;
  }
  (function fade() {
    self.element.style.opacity = val;
    if (val > 0) {
      val -= 0.05;
      setTimeout(fade, 5);
    } else {
      if (callback) callback();
    }
  }());
};

/**
 * @param {Number} val
 *			Starting opacity value for fade in
 *
 * @param {Number} fVal
 *			Ending opacity value for fade in
 *
 * @param {Function} callback
 *			Function to be called at the end of fade
 **/
ActiveZone.prototype.opacityFadeIn = function (val, fVal, callback) {
  const self = this;
  if (isNaN(val)) {
    val = 0;
  }
  (function fade() {
    self.element.style.opacity = val;
    if (val < fVal) {
      val += 0.02;
      setTimeout(fade, 40);
    } else {
      if (callback) callback();
    }
  }());
};

/** MAIN IMAGE VIEWER (IMPLEMENTED WITH OpenSeaDragon)
 *
 * @param {Object} HTMLdoc
 *			DOM document object
 *
 * @param {Boolean} dMode
 *			If true, debug mode is activated
 *
 **/
function SplsViewer(HTMLdoc, imageConfig, mobile, iOS) {
  this.document = HTMLdoc;
  this.mobile = mobile;
  this.debugMode = imageConfig.debugMode;
  this.zooms = imageConfig.zooms;
  this.acZones = [];
  this.viewer = OpenSeadragon(imageConfig.osdinit);
  this.homeBox = new OpenSeadragon.Rect(imageConfig.homeBox.x,
    imageConfig.homeBox.y, imageConfig.homeBox.width, imageConfig.homeBox.height);
  this.clipBox = new OpenSeadragon.Rect(imageConfig.clipBox.x,
    imageConfig.clipBox.y, imageConfig.clipBox.width, imageConfig.clipBox.height);
  this.viewer.debugMode = this.debugMode;
  this.viewer.iOSDevice = iOS;
  //this.debugMode && console.log(`iOS set to ${iOS}`);
  if (this.mobile) {
    this.viewer.immediateRender = true;
  } else {
    this.viewer.immediateRender = false;
  }
  this.colorManager = new Colors();
}

/**
 * @param {Number} _l
 *			Level number to be mapped
 *
 * @returns {Number} level mapped value
 **/
SplsViewer.prototype.mapLevel = function (_l) {
  var maxPossibleZoom = 11773.125614035089;
  var l = _l/maxPossibleZoom;
  //var l = this.viewer.viewport.viewportToImageZoom(_l);
  this.debugMode && console.log(`not mapped ${_l} | mapped level to image: ${l.toFixed(5)}`);
  return l;
};

/**
 * @param {Array} _z
 *			Array of zooms level that will be allowed
 **/
SplsViewer.prototype.setZoomLevels = function (_z) {
  var z = [];
  for (let i = 0; i < _z.length; i++) {
    z[i] = this.mapLevel(_z[i]);
  }
  this.viewer.zoomLevels ({
    levels: z,
  });
};

SplsViewer.prototype.init = function () {
  const self = this;
  if (self.mobile) {
    self.viewer.navigator.element.style.display = 'none';
    this.debugMode && console.log(`navigator hidden ${self.mobile}`);
  }
  self.viewer.addHandler('open', (function (v) {
    return function () {
      v.viewport.fitBounds(self.homeBox, true);
      v.world.getItemAt(0).setClip(self.clipBox);
      // v.viewport.goHome = function(immediately) {
      //   if (v) {
      //     v.raiseEvent( 'home', {
      //       immediately: immediately
      //     });
      //   }
      //   v.viewport.fitBounds(self.homeBox, immediately);
      // };
    };
  })(self.viewer));
  if (self.debugMode) {
    self.viewer.addHandler('open', (function (v) {
      return function () {
        var coordEl = self.document.getElementById('coordinates');
        var tracker = new OpenSeadragon.MouseTracker({
          element: v.container,
          moveHandler: function (event) {
            var webPoint = event.position;
            var viewportPoint = v.viewport.pointFromPixel(webPoint);
            var imagePoint = v.viewport.viewportToImageCoordinates(viewportPoint);
            coordEl.innerHTML = 'MOUSE POINTER COORDINATES<br><br>Web:<br>' + webPoint.toString() +
            '<br><br>Viewport:<br>' + viewportPoint.toString() +
            '<br><br>Image:<br>' + imagePoint.toString();
          }
        });
        tracker.setTracking(true);
       };
    })(self.viewer));
  }
  self.setZoomLevels(self.zooms);
  self.setActiveZones();
};

/**
 * @param {Number} _l
 *			Level number to match with allowed zooms
 *
 * @returns {Number} Allowed level value (viewport coords) closest to input value
 **/
SplsViewer.prototype.matchZoomLevel = function (_l) {
  var distance = Math.abs(this.zooms[0]-_l);
  var idx = 0;
  for (var i=1; i<this.zooms.length; i++) {
    var cdistance = Math.abs(this.zooms[i]-_l);
    if (cdistance < distance) {
      idx = i;
      distance = cdistance;
    }
  }
  return this.zooms[idx];
};
/**
 * @param {Number} _l
 *			Level number to match with allowed zooms
 *
 * @returns {Number} Index of allowed zoom level closest to input
 **/
SplsViewer.prototype.getMatchedZoomLevelIndex = function (_l) {
  var distance = Math.abs(this.zooms[0]-_l);
  var idx = 0;
  for (var i=1; i<this.zooms.length; i++) {
    var cdistance = Math.abs(this.zooms[i]-_l);
    if (cdistance < distance) {
      idx = i;
      distance = cdistance;
    }
  }
  return idx;
};

SplsViewer.prototype.goHome = function () {
  this.viewer.viewport.goHome();
};

/**
 * @param {String} event
 *			Event to listen to
 *
 * @param {Function} callback
 *      Callback function
 **/
SplsViewer.prototype.on = function (event, callback) {
  'use strict';
  const self = this;
  self.viewer.addHandler(event, function (e) {
    callback(e);
  });
};

/**
 * @param {Boolean} current
 *			Pass true for the current location; defaults to false (target location)
 *
 * @returns {Number} location zoom level value in viewport coords [2.55-500]
 **/
SplsViewer.prototype.getZoomValue = function (current) {
  return this.viewer.viewport.getZoom(current);
};

/**
 * @param {Boolean} current
 *			Pass true for the current location; defaults to false (target location)
 *
 * @returns {Number} location zoom level index (0-5)
 **/
SplsViewer.prototype.getZoomLevel = function (current) {
  var z = this.viewer.viewport.getZoom(current);
  return this.getMatchedZoomLevelIndex(z);
};

/**
 * @param {Boolean} current
 *			Pass true for the current location; defaults to false (target location)
 *
 * @returns {Object} OpenSeaDragon.Point, the center point
 **/
SplsViewer.prototype.getCenter = function (current) {
  return this.viewer.viewport.getCenter(current);
};

/**
 * @param {Number} zoom
 *			The zoom level to zoom to
 *
 * @param {Object} refPoint
 *			OSD Point object: point which will stay at the same screen location
 *      Defaults to the viewport center
 *
 * @param {Boolean} immediately
 *			If true skip amiation. Defaults false
 **/
SplsViewer.prototype.zoomTo = function (zoom, refPoint, immediately) {
  var self = this;
  var z = self.matchZoomLevel(zoom);
  self.viewer.viewport.zoomTo(z, refPoint, immediately);
};

/**
 * @param {Object} center
 *			OSD Point object: center of final view
 *
 * @param {Boolean} immediately
 *			If true skip amiation. Defaults false
 **/
SplsViewer.prototype.panTo = function (center, immediately) {
  this.viewer.viewport.panTo(center, immediately);
};

SplsViewer.prototype.setActiveZones = function () {
  const self = this;
  // CHILD ACTIVE ZONE
  var childLoc = new OpenSeadragon.Rect(0.246, 0.47, 0.005, 0.01);
  var child = new ActiveZone(self.document, 'child', childLoc);
  child.setStyle([255, 0, 0], 0.6, 3);
  child.setAction(function () {
    var targetsx = new OpenSeadragon.Point(0.05, 0.47);
    self.withSlowAnimation(function () {
      self.viewer.viewport.zoomTo(self.zooms[2]);
      self.viewer.viewport.panTo(targetsx);
    });
  });
  self.acZones[0] = child;
};

/**
 * @param {String} id
 *			Unique Id of active zone
 **/
SplsViewer.prototype.showActiveZone = function (id) {
  const self = this;
  var ac = self.getActiveZoneById(id);
  ac.opacityFadeIn(0, 0.6);
  self.viewer.addOverlay({
    element: ac.element,
    location: ac.location,
  });
  ac.element.addEventListener('click', ac.action);
  ac.visible = true;
};

/**
 * @param {String} id
 *			Unique Id of active zone
 **/
SplsViewer.prototype.hideActiveZone = function (id) {
  const self = this;
  var ac = this.getActiveZoneById(id);
  ac.opacityFadeOut(ac.element.style.opacity, function () {
    self.viewer.removeOverlay(ac.element);
    ac.element.removeEventListener('click', ac.action, true);
    ac.visible = false;
  });
};

/**
 * @param {String} id
 *			Unique Id of active zone
 * @returns {ActiveZone}
 **/
SplsViewer.prototype.getActiveZoneById = function (id) {
  for (var i = 0; i < this.acZones.length; i++) {
    if (id.localeCompare(this.acZones[i].id) === 0) {
      return this.acZones[i];
    }
  }
};

/**
 * @returns {Array}
 *			returns an array containing [r,g,b,a] value
 *      of the pixel in the view center
 **/
SplsViewer.prototype.getColorsWeight = function () {
  var canvasScaleFactor = OpenSeadragon.pixelDensityRatio;
  var ctx = this.viewer.drawer.context;
  var v = this.viewer.viewport;

  var N = 1;
  // Get image data of 1/N of the view area
  var canvasBounds = v.viewportToViewerElementRectangle(v.getBounds());
  var posX = (canvasBounds.width - canvasBounds.width / Math.sqrt(N)) / 2;
  var posY = (canvasBounds.height - canvasBounds.height / Math.sqrt(N)) / 2;
  var x = posX * canvasScaleFactor;
  var y = posY * canvasScaleFactor;
  var width = canvasBounds.width / Math.sqrt(N) * canvasScaleFactor;
  var height = canvasBounds.height / Math.sqrt(N) * canvasScaleFactor;
  // Color data
  var colorData = ctx.getImageData(x, y, width, height).data;
  // Decimation factor
  var M = 100;
  // Colors accumulators
  var maroon = 0;
  var green = 0;
  var grey = 0;
  var yellow = 0;
  var tI = performance.now();
  for (var i = 0; i < colorData.length; i += 4*M)
  {
    // Read color
    var c = new RGB(colorData[i], colorData[i+1], colorData[i+2]);
    // Find match
    var m = this.colorManager.matchColor(c);
    //var m = 0;
    // Increment accumulators
    switch (m) {
      case 0:
        maroon++;
        break;
      case 1:
        green++;
        break;
      case 2:
        grey++;
        break;
      case 3:
        yellow++;
        break;
    }
  }
  var pixelN = Math.floor(colorData.length / (4*M));

  var tF = performance.now();
  //this.debugMode && console.log(`Pixels analyzed: ${colorData.length}/(4*${M}) = ${pixelN}`);
  this.debugMode && console.log(`Pixel analysis took ${tF - tI} millisecs`);

  if (this.debugMode) {
    // Draw color picker target area
    ctx.beginPath();
    ctx.strokeStyle = "#800080";
    ctx.lineWidth = 10;
    ctx.rect(x, y, width, height);
    ctx.stroke();
  }
  //return this.colorManager.matchColor(centerColor);
  var maroonGain = Number.parseFloat((maroon/pixelN).toFixed(3));
  var greenGain = Number.parseFloat((green/pixelN).toFixed(3));
  var greyGain = Number.parseFloat((grey/pixelN).toFixed(3));
  var yellowGain = Number.parseFloat((yellow/pixelN).toFixed(3));
  return [maroonGain, greenGain, greyGain, yellowGain];
};

SplsViewer.prototype.drawPlayArea = function (ratio, streamAttractors) {
  if (this.debugMode) {
    var canvasScaleFactor = OpenSeadragon.pixelDensityRatio;
    var ctx = this.viewer.drawer.context;
    var v = this.viewer.viewport;
    // Center
    var bounds = v.getBounds();
    var canvasBounds = v.viewportToViewerElementRectangle(bounds);
    var x = canvasBounds.getCenter().x * canvasScaleFactor;
    var y = canvasBounds.getCenter().y * canvasScaleFactor;
    // Ratio
    var viewportCenter = bounds.getCenter();
    var ratioPoint = new OpenSeadragon.Point(viewportCenter.x, viewportCenter.y + ratio);
    var canvasRatioPoint = v.pixelFromPoint(ratioPoint);
    var canvasRatio = Math.abs(canvasRatioPoint.y - canvasBounds.getCenter().y);
    // Draw style
    ctx.lineWidth = 8;
    ctx.strokeStyle = "#00b300";
    //Draw circle
    ctx.beginPath();
    ctx.arc(x, y, canvasRatio * canvasScaleFactor, 0, 2 * Math.PI);
    ctx.stroke();
    // Draw rectangle
    ctx.beginPath();
    ctx.strokeStyle = "#0033cc";
    ctx.rect(canvasBounds.x, canvasBounds.y, canvasBounds.width * canvasScaleFactor,
      canvasBounds.height * canvasScaleFactor);
    ctx.stroke();
    // Draw stream attractors
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#f442f1';
    for (let i = 0; i < streamAttractors.length; i++) {
      //this.debugMode && console.log('Drawing stream attractor');
      var attr = new OpenSeadragon.Point(streamAttractors[i].x,
        streamAttractors[i].y);
      var canvasAttr = v.viewportToViewerElementCoordinates(attr);
      ctx.beginPath();

      ctx.arc(canvasAttr.x * canvasScaleFactor, canvasAttr.y * canvasScaleFactor,
         20, 0, 2 * Math.PI);
      ctx.fillStyle = '#f442f1';
      ctx.fill();
      ctx.stroke();
    }
  }
};

/**
 * @param {Function} action
 *			Action to be performed with the slower animation
 **/
SplsViewer.prototype.withSlowAnimation = function (action) {
  // save old one
  var oldValues = {};
  var v = this.viewer.viewport;
  oldValues.centerSpringXAnimationTime = v.centerSpringX.animationTime;
  oldValues.centerSpringYAnimationTime = v.centerSpringY.animationTime;
  oldValues.zoomSpringAnimationTime = v.zoomSpring.animationTime;
  // set slower times
  v.centerSpringX.animationTime = v.centerSpringY.animationTime = 5;
  v.zoomSpring.animationTime = 5;
  // perform action
  action();
  // restore old values
  v.centerSpringX.animationTime = oldValues.centerSpringXAnimationTime;
  v.centerSpringY.animationTime = oldValues.centerSpringYAnimationTime;
  v.zoomSpring.animationTime = oldValues.zoomSpringAnimationTime;
};
