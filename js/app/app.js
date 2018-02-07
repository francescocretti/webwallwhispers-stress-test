// TEMP performance logger
function PerformanceLogger(log) {
  'use strict';
  this.startTimes = [];
  this.sendStart = function(_i, _fragment, _time) {
    this.startTimes[_i] = _time;
    // log.trace("Fragment "+_fragment.loadIdx+" started loading for audio "+_i);
  };
  this.sendEnd = function (_i, _fragment, _time) {
    var loadTime = _time - this.startTimes[_i];
    // log.trace(_i + ',' + _fragment.sn + ',' + loadTime);
  };
}

Array.prototype.diff = function (a) {
    return this.filter(function (i) {
        return a.indexOf(i) === -1;
    });
};

Array.prototype.uniqueArray = function () {
  return this.filter(function(elem, pos, arr) {
    return arr.indexOf(elem) == pos;
  });
};

var splsApp = splsApp === undefined ? {} : splsApp;

(function (s) {
  /* **********
   * PROPERTIES
   * **********/
  // Audio data
  s.streamSounds = [];
  s.actionSounds = [];
  s.appMuted = false;
  s.ASfinishLoad = false;
  s.rvb = '';
  // Viewer
  s.img = '';
  s.zoomStartLevel = '';
  // DOM
  s.splash = document.getElementById('splash');
  s.audioLogger = document.getElementById('audioLogs');
  s.audioLogResetButton = document.getElementById('resetAudioLog');
  s.pLogger = '';
  // Stream attractors
  s.streamAttractors = [];
  s.currentAttractor = '';
  s.playingStreams = [];
  s.insideAttractors = [];

  s.lastActionTime = Date.now();
  s.stbyCheckId = null;
  s.insideApp = false;

  s.audioLog = document.getElementById('audioLogs');
  /* **********
   * FUNCTIONS
   * **********/

  // ******** INIT FUNCTION ********
  s.onLoad = function (e) {
    s.getJSON('config.json', s.init);
  };

  s.init = function (err, config) {
    if (err !== null) {
      console.error(`Error in loading configuration file: ${err}`);
    } else {
      // Init app with loaded config
      console.log('JSON Configuration loaded');
      s.dLog = config.debugLogs;
      s.startLogger();
      // Image
      s.setUpViewer(config.image);
      // User controls
      s.setUserControls(document);
      // Get stream attractors
      s.streamAttractors = config.attractors;
      s.currentAttractor = config.attractors[0];
      // Play area playAreaRatios
      s.playAreaRatios = config.playarearatios;
      // Audio
      s.loadAudioData(config.audio);
      // Init effects
      // s.initializeEffects();
      console.log(s.getDeviceInfo());
      console.log('Version 47');
    }
  };

  s.getDeviceInfo = function () {
    var d;
    if (s.checkDevice.isMobile.Android()) {
      d = 'Android - ';
    } else if (s.checkDevice.isMobile.iOS()) {
      d = 'iOS - ';
    } else if (!s.checkDevice.isMobile.any()) {
      d = 'Desktop - ';
    }
    var sr = s.checkDevice.getAspectRatio();
    var ss = s.checkDevice.getScreenSize();
    var sa = s.checkDevice.getScreenArea();
    return `Device: ${d}${sr}, ${ss}, ${sa}px`;
  };

  s.enter = function () {
    if (s.ASfinishLoad) {
      s.img.goHome();
      s.splash.parentNode.removeChild(splash);
      s.stbyCheckId = setInterval(s.checkUserInactivity, 3000);
      // TEMP - for mobile devices
      for (var i = 0; i < s.streamSounds.length; i++) {
        s.streamSounds[i].audioElement.play();
        s.streamSounds[i].audioElement.pause();
      }
      //s.img.zoomTo(s.img.zooms[1]);
      if (s.checkDevice.isMobile.any()) {
        s.img.viewer.setFullScreen(true);
        s.img.viewer.addHandler('full-screen', function (event) {
          if (!event.fullScreen) {
            //window.alert('Thank for visiting SPLS');
              s.splash.innerHTML = '<p>THANK YOU FOR USING SPLS APP</p>'+
                  '<p></p><p>Touch or click anywhere to start again</p>';
            document.body.appendChild(s.splash);
          } else if (event.fullScreen) {
            console.log('mobile full screen');
            // Set timout to prevent automatic adjustments to stop action sound
            setTimeout(function() {
              s.actionSounds[0].setLoop(true);
              s.actionSounds[0].fadeIn(3);
              s.actionSounds[0].filter.lowPassFilter(1000);
            }, 1000);
          }
        });
      } else {
        s.actionSounds[0].setLoop(true);
        s.actionSounds[0].fadeIn(3);
        s.actionSounds[0].filter.lowPassFilter(1000);
      }
      s.insideApp = true;
    }
  };

  // TEMP log4javascript
  s.startLogger = function () {
    s.log = log4javascript.getLogger();
    s.log.setLevel(log4javascript.Level.TRACE);
    var appender = new log4javascript.InPageAppender(logger, [false, false]);
    //var appender = new log4javascript.PopUpAppender([false,true]);
    var appenderLayout = new log4javascript.PatternLayout('%d{HH:mm:ss} %-5p - %m%n');
    //var appenderLayout = new log4javascript.PatternLayout("%m%n");
    appender.setLayout(appenderLayout);
    s.log.addAppender(appender);
    s.pLogger = new PerformanceLogger(s.log);
  };

  // ******** AUDIO ********
  s.loadAudioData = function (audioConfig) {
    // Create audio context
    var audioCtx = s.createAudioContext();
    // Load buffers for action sounds
    var actionSoundsURL = '../shared_media/audio/action_sounds/';
    var actionSounds = ['standby_mosso_long96.m4a', 'tap1.m4a', 'tap2.m4a', 'tap3.m4a', 'spread.m4a'];
    for (var i = 0; i < actionSounds.length; i++) {
      actionSounds[i] = actionSoundsURL.concat(actionSounds[i]);
    }
    var buffLoader = new BufferLoader(audioCtx, actionSounds, s.feedWebAudioNodes);
    buffLoader.load();
    // Set streams
    s.streamSounds = s.loadStreamSounds(audioCtx, audioConfig);
  };

  s.createAudioContext = function () {
    var contextClass = (window.AudioContext || window.webkitAudioContext ||
      window.mozAudioContext || window.oAudioContext || window.msAudioContext);
    if (contextClass) {
      var context = new contextClass();
      reverbjs.extend(context); // extend with reverbjs methods
      return context;
    } else {
      window.alert('Cannot run app. WebAudioAPI are not supported by this browser');
    }
  };

  s.feedWebAudioNodes = function (sounds, context) {
    for (var i = 0; i < sounds.length; i++) {
      s.actionSounds[i] = new ActionSound(context, sounds[i], i, s.audioLog);
      s.actionSounds[i].init();
    }
    s.ASfinishLoad = true;
    console.log('Action sounds loaded');
  };

  s.loadStreamSounds = function (context, audioConfig) {
    if (Hls.isSupported()) {
      var streams = [];
      for (let i = 0; i < audioConfig.hlsStreamNumber; i++) {
        streams[i] = new StreamSound(context, i, s.audioLog, s.dLog);
        streams[i].init(audioConfig.preloadHls[i]);
        // See all HLS Events - https://goo.gl/e2F3Ki
        streams[i].hls.on(Hls.Events.FRAG_LOADING, function (event, object) {
          // s.log.warn(`Started loading frag ${object.frag.sn} for audio ${i}`);
          s.pLogger.sendStart(i, object.frag,performance.now());
        });
        streams[i].hls.on(Hls.Events.FRAG_LOADED, function (event, object) {
          // s.log.warn(`Ended loading frag ${object.frag.sn} for audio ${i}`);
          s.pLogger.sendEnd(i, object.frag,performance.now());
        });
        /** BUG: when track changes, if random starting fragment
         * is the same of the last played fragment, event is not fired
         **/
        streams[i].hls.on(Hls.Events.FRAG_CHANGED, function (event, object) {
          // s.log.info("Fragment "+object.frag.sn+" changed in audio "+i);
          var loadTime = performance.now();
          if (streams[i].seekTime !== null) {
            // s.log.info(`New audio took ${loadTime - streams[i].seekTime} msecs`);
            streams[i].seekTime = null;
          }
        });
      }
      console.log('Stream sounds loaded');
      return streams;
    } else {
      window.alert('Cannot run app. HLS is not supported by this browser');
    }
  };

  s.initializeEffects = function (layer) {
    var effectOptions;
    switch (layer) {
      case 1:
        effectOptions = {
          lpFilter: true,
          lpFreq: 22000,
          reverb: true,
          wetGain: 0.25,
          binaural: true
        };
        break;
      case 2:
        effectOptions = {
          lpFilter: true,
          lpFreq: 300,
          reverb: true,
          wetGain: 0.15,
          distortion: true,
          distAmount: 15,
          binaural: true
        };
        break;
      case 3:
        effectOptions = {
          lpFilter: true,
          lpFreq: 22000,
          reverb: true,
          wetGain: 0.25,
          binaural: true
        };
        break;
      case 4:
        effectOptions = {
          lpFilter: true,
          lpFreq: 22000,
          reverb: true,
          wetGain: 0.25,
          binaural: true
        };
        break;
      case 5:
        effectOptions = {
          lpFilter: false,
          reverb: false,
          binaural: true
        };
        break;
    }
    // Effect initialization
    s.streamAttractors[layer].forEach(function (el) {
      s.streamSounds[el.stream].setEffectChain(effectOptions);
    });
  };

  s.checkPlayingAudios = function () {
    var activeAudiosIndex = [];
    for(var i = 0; i < s.streamSounds.length; i++) {
      if (s.streamSounds[i].isPlaying()) {
        activeAudiosIndex.push(i);
      }
    }
    return activeAudiosIndex;
  };

  s.muteAll = function () {
    s.streamSounds.forEach(function (el) {
      el.mute();
    });
    s.actionSounds.forEach(function (el) {
      el.mute();
    });
    s.appMuted = true;
  };

  s.unMuteAll = function () {
    s.streamSounds.forEach(function (el) {
      el.unmute();
    });
    s.actionSounds.forEach(function (el) {
      el.unmute();
    });
    s.appMuted = false;
  };

  // ******** IMAGE VIEWER ********
  s.setUpViewer = function (imageConfig) {
    console.log(`iOs: ${s.checkDevice.isMobile.iOS()}`);
    s.img = new SplsViewer(document, imageConfig, s.checkDevice.isMobile.any(),
      s.checkDevice.isMobile.iOS());
    s.img.init();
    s.zoomStartLevel = s.img.matchZoomLevel(s.img.getZoomValue());
    s.setHandlers();

  };

  s.setHandlers = function () {
    s.img.on('animation-finish', s.manageAnimationFinish); // Raised when any spring animation ends (zoom, pan, etc.).
    s.img.on('animation-start', s.manageAnimationStart); // Raised when any spring animation starts (zoom, pan, etc.).
    s.img.on('canvas-click', s.manageTap);
    s.img.on('pan', s.managePan); // Raised (continuously) when the viewport is panned
    s.img.on('zoom', s.logZoom); // Raised (continuously) when the viewport zoom level changes
    s.img.on('update-viewport', s.updateViewer);
    // s.img.on('animation', function(){// console.log('animation');}); // Raised when any spring animation update occurs (zoom, pan, etc.), after the viewer has drawn the new location
    // s.img.on('viewport-change', function(){// console.log('viewport change');}); // Raised when any spring animation update occurs (zoom, pan, etc.), before the viewer has drawn the new location
    // s.img.on('add-overlay', ...); // Raised when an overlay is added to the viewer
    // s.img.on('remove-overlay', ...); // Raised when an overlay is removed from the viewer
  };


  // ***************************/
  // ***************************/
  // ******** APP CORE ********

  s.manageAnimationStart = function () {
    s.zoomStartLevel = s.img.getZoomLevel(true);
  };

  s.updateViewer = function () {
    var z = s.img.getZoomLevel(false);
    s.img.drawPlayArea(s.playAreaRatios[z], s.streamAttractors[z.toString()]);
  };

  s.prevZoom = 0;
  s.logZoom = function (e) {
    if (s.insideApp) {
      //s.dLog && console.log(`zoom event ${e.zoom}`);
      var z = e.zoom;
      if (z > s.prevZoom) {
        s.dLog && console.log('zoomin in');
        s.actionSounds[4].fadeIn(0.5);
      } else if (z < s.prevZoom) {
        s.dLog && console.log('zoomin out');
        s.actionSounds[4].fadeIn(0.5);
      }
      s.prevZoom = z;
    }
  };

  s.manageTap = function (e) {
    var z = s.img.getZoomLevel(true);
    var posY = s.img.getCenter().y;
    var posX = s.img.viewer.viewport.pointFromPixel(e.position).x;
    var targetCenter = new OpenSeadragon.Point(posX, posY);
    var leftBound = s.img.viewer.viewport.getHomeBounds().x;
    var rightBound = leftBound + s.img.viewer.viewport.getHomeBounds().width;
    // s.dLog && console.log(`Tap target x: ${posX}`);
    switch (z) {
      case 0:
        // TODO prevent any user action
        break;
      case 1:
        if (e.quick && posX > leftBound && posX < rightBound) {
          s.img.panTo(targetCenter);
        }
        break;
      case 2:
        if (e.quick && posX > leftBound && posX < rightBound) {
          s.img.panTo(targetCenter);
          var si = s.randomInt(1, 3);
          s.actionSounds[si].fire();
        }
        break;
      default:
        if (e.quick && posX > leftBound && posX < rightBound) {
          s.img.panTo(targetCenter);
        }
    }
  };

  s.anyUserAction = function () {
    // Fade out standby sound
    if (typeof s.actionSounds[0] !== 'undefined' && s.insideApp) {
      s.actionSounds[0].fadeOut(3);
      // Update time
      s.lastActionTime = Date.now();
      // Set interval
      if (s.stbyCheckId === null) {
        s.stbyCheckId = setInterval(s.checkUserInactivity, 3000);
        s.setStandbyVolumes(false); // false for exit
        s.dLog && console.log('STANBY EXIT');
      }
    }
  };

  s.checkUserInactivity = function () {
    var t = Date.now();
    var timeOccurred = (t - s.lastActionTime) / 1000;
    // // s.dLog && console.log(timeOccurred);
    if (timeOccurred > 120) {
      s.dLog && console.log(`Inactivity time: ${timeOccurred} secs.`);
      if (s.appMuted) {
        s.actionSounds[0].play(); //starts but not plays sound
      } else {
        s.actionSounds[0].fadeIn(3);
        s.setStandbyVolumes(true); // true for enter
        s.dLog && console.log('STANBY ENTER');
      }
      clearInterval(s.stbyCheckId);
      s.stbyCheckId = null;
    }
  };

  s.setStandbyVolumes = function (enter) {
    var delta;
    if (enter) {
      delta = -0.6;
    } else {
      delta = 0.6;
    }
    s.checkPlayingAudios().forEach(function (el) {
      var newGain = s.streamSounds[el].getMasterGain() + delta;
      if (newGain > 0) {
        s.streamSounds[el].fadeToGain(newGain, 3);
      }
    });
  };

  s.panSleep = false;
  s.managePan = function (e) {
    if (s.insideApp && !s.panSleep) {
      var z = s.img.getZoomLevel(false);
      switch (z) {
        case 1:
          s.layer1Pan();
          break;
        case 2:
          s.layer2Pan();
          break;
        case 5:
          s.panSleep = true;
          setTimeout(function () {
            s.panSleep = false;
          }, 200);
          s.layer5Pan(z);
          break;
        default:
      }
    }
  };

  s.layer1Pan = function () {
    // Get current view center
    var center = s.img.getCenter();
    // For each attractor inside PA
    //var tI = performance.now();
    s.insideAttractors.forEach(function(el) {
      // **** BINAURAL *****
      var c1 = center.x - el.x;
      var c2 = center.y - el.y;
      var r2 = Math.pow(c1, 2) + Math.pow(c2, 2);
      // Clip values to avoid abrupt passage left/right if close to attr. point
      var K2 = Math.pow(0.02, 2); // Clipping area const = 4*10^-4
      if (r2 < K2) {
        c2 = s.sign(c2) * Math.sqrt(K2 - Math.pow(c1, 2));
        s.dLog && console.log(`Clipping c2...`);
      }
      //s.dLog && console.log(`K2: ${K2} | C1: ${c1} | C2: ${c2} | R2: ${r2}`);
      // Calc azimuth
      var azimuth = s.degrees(Math.atan2(c1, -c2));
      // Assign to binaural node
      s.streamSounds[el.stream].binauralizator.setPosition(-azimuth);
      // **** FILTER FREQ *****
      // Create OSD point object
      var attractor = new OpenSeadragon.Point(el.x, el.y);
      // Calc distance
      var distance = center.distanceTo(attractor);
      var KF = 0.0821; // --> so when dist = 0 freq = 22 kHz
      // Calc frequency
      var freq = 1 / Math.pow(KF + distance, 4);
      // Assign to LPF cut frequency. Force if fading
      s.streamSounds[el.stream].filter.setLPFrequency(freq, true);
      // **** DRY GAIN *****
      // Calc gain
      var gain = 1 / Math.pow(1 + distance, 16);
      // Assign to dry gain
      s.streamSounds[el.stream].filter.setDryGain(gain);
      s.dLog && console.log(`Dist: ${distance} | LPFf: ${freq} | Gain: ${gain} | Azimuth: ${azimuth}`);
    });
  };

  s.layer2Pan = function () {
    // Get current view center
    var center = s.img.getCenter();
    // For each attractor inside PA
    //var tI = performance.now();
    s.insideAttractors.forEach(function(el) {
      // **** BINAURAL *****
      var c1 = center.x - el.x;
      var c2 = center.y - el.y;
      var r2 = Math.pow(c1, 2) + Math.pow(c2, 2);
      // Clip values to avoid abrupt passage left/right if close to attr. point
      var K2 = Math.pow(0.02, 2); // Clipping area const = 4*10^-4
      if (r2 < K2) {
        c2 = s.sign(c2) * Math.sqrt(K2 - Math.pow(c1, 2));
        s.dLog && console.log(`Clipping c2...`);
      }
      //s.dLog && console.log(`K2: ${K2} | C1: ${c1} | C2: ${c2} | R2: ${r2}`);
      // Calc azimuth
      var azimuth = s.degrees(Math.atan2(c1, -c2));
      // Assign to binaural node
      s.streamSounds[el.stream].binauralizator.setPosition(-azimuth);
      // **** DRY GAIN *****
      // Create OSD point object
      var attractor = new OpenSeadragon.Point(el.x, el.y);
      // Calc distance
      var distance = center.distanceTo(attractor);
      // Calc gain
      var gain = 1 / Math.pow(1 + distance, 16);
      // Assign to dry gain
      s.streamSounds[el.stream].filter.setDryGain(gain);
      s.dLog && console.log(`Dist: ${distance} | Gain: ${gain} | Azimuth: ${azimuth}`);
    });
  };

  s.layer5Pan = function (z) {
    // TODO Perlin noise test
    // noise.seed(Math.random());
    // var noiseVal = noise.perlin2(x, y);
    // s.dLog && console.log(`Perlin noise: ${noiseVal}`);
    // Set binaural position to layer 5 streams
    // TODO check bugs in this funcion
    var increment = 20; // degrees
    s.streamAttractors[z.toString()].forEach(function (el) {
      var gain = s.streamSounds[el.stream].getMasterGain();
      var oldPos = s.streamSounds[el.stream].binauralizator.getPosition();
      var newPos = (oldPos + increment * gain) % 360;
      // s.dLog && console.log(`Old position for stream ${el.stream}: ${oldPos} deg`);
      // s.dLog && console.log(`New position for stream ${el.stream}: ${newPos} deg`);
      s.streamSounds[el.stream].binauralizator.setPosition(newPos);
    });
  };

  s.manageAnimationFinish = function (e) {
    if (s.insideApp) {
      s.actionSounds[4].fadeOut(1);
      var center = s.img.getCenter();
      var x = center.x.toFixed(3);
      var y = center.y.toFixed(3);
      var zv = s.img.getZoomValue(false);
      var z = s.img.getZoomLevel(false);
      s.dLog && console.log(`Animation end at: ${x}, ${y}, ${zv} -> ${z}`);
      switch (z) {
        case 0:
          s.layer0Animation(center, z);
          break;
        case 1:
          s.layer1Animation(center, z);
          break;
        case 2:
          s.layer2Animation(center, z);
          break;
        case 3:
          s.layer3Animation(center, z);
          break;
        case 4:
          s.layer4Animation(center, z);
          break;
        case 5:
          s.layer5Animation(z);
          break;
        default:
          s.dLog && console.warn(`Missing logic for zoom ${z}`);
      }
      s.manageActiveZones(center, z);
    }
  };

  s.fadeOutLayer5 = function () {
    s.streamAttractors[5].forEach(function (el) {;
      s.streamSounds[el.stream].fadeOut(3);
    });
  };

  s.layer0Animation = function (center, z) {
    if (z !== s.zoomStartLevel) {
      s.dLog && console.log(`Landed on layer ${z}`);
      // Prepare effect for later 1
      s.initializeEffects(1);
      // Trigger play area calc to fade out other layers streams
      s.playAreaTransition(center, z);
      // Fade out layer 5 streams (do not belongs to play area mechanism)
      s.fadeOutLayer5();
      s.actionSounds[0].fadeIn(2);
    }
  };

  s.layer1Animation = function (center, z) {
    s.anyUserAction();
    // Trigger transition function
    s.playAreaTransition(center, z);
    if (z !== s.zoomStartLevel) {
      s.dLog && console.log(`Landed on layer ${z}`);
      s.fadeOutLayer5();
      // Set effects
      s.initializeEffects(z);
      // Raise pan event to update effects parameter for new loaded streams
      s.img.viewer.raiseEvent('pan'); // See layer1Pan() function
    }
  };

  s.layer2Animation = function (center, z) {
    s.anyUserAction();
    // Trigger transition function
    s.playAreaTransition(center, z);
    if (z !== s.zoomStartLevel) {
      s.dLog && console.log(`Landed on layer ${z}`);
      s.fadeOutLayer5();
      // Set effects
      s.initializeEffects(z);
      // Raise pan event to update effects parameter for new loaded streams
      // s.img.viewer.raiseEvent('pan'); // See layer1Pan() function
    }
  };

  s.layer3Animation = function (center, z) {
    s.anyUserAction();
    s.playAreaTransition(center, z);
    if (z !== s.zoomStartLevel) {
      s.dLog && console.log(`Landed on layer ${z}`);
      s.fadeOutLayer5();
      // Init stuff
    }
  };

  s.layer4Animation = function (center, z) {
    s.anyUserAction();
    s.playAreaTransition(center, z);
    if (z !== s.zoomStartLevel) {
      s.dLog && console.log(`Landed on layer ${z}`);
      s.fadeOutLayer5();
      // Init stuff
    }
  };

  s.layer5Animation = function (z) {
    s.anyUserAction();
    var colorsGain = s.img.getColorsWeight();
    s.dLog && console.log(`Colors gain: ${colorsGain}`);
    // Divide circumference for equidistant binaural positioning
    var shift = 360 / s.streamAttractors[z.toString()].length;
    var offset = 45;
    // If landed from another layer
    if (z !== s.zoomStartLevel) {
      s.dLog && console.log(`Landed on layer ${z}`);
      // Init effect chain for layer 5
      s.initializeEffects(z);
      // For each stream in layer 5
      s.streamAttractors[z.toString()].forEach(function (el, idx) {
        // Set binaural position
        s.streamSounds[el.stream].binauralizator.setPosition(offset + shift * idx);
        // Play silently
        s.streamSounds[el.stream].setMasterGain(0);
        s.streamSounds[el.stream].play();
      });
    }
    // s.dLog && console.log(`Op ${idx}: set gain ${colorsGain[idx]} to stream N.${el.stream}`);
    // Adjust gain
    s.streamAttractors[z.toString()].forEach(function (el, idx) {
      s.streamSounds[el.stream].fadeToGain(colorsGain[idx], 0.5);
    });
  };

  s.findAttractorsInPlayArea = function (playAreaRatio, attractors, center) {
    s.dLog && console.log(`Current play area ratio: ${playAreaRatio}`);
    var insideStreams = [];
    var insideAttr = [];
    for (let i = 0; i < attractors.length; i++) {
      var attrPoint = new OpenSeadragon.Point(attractors[i].x, attractors[i].y);
      var newdistance = center.distanceTo(attrPoint) / attractors[i].coeff;
      s.dLog && console.log(`center index: ${i} | distance: ${newdistance}`);
      if (newdistance < playAreaRatio) {
        s.dLog && console.log(`Attractor ${i} is inside the playing area`);
        // Push stream index inside array
        insideStreams.push(attractors[i].stream);
        // Push attractor object in global array (to use in managePan)
        insideAttr.push(attractors[i]);

      }
    }
    s.insideAttractors = insideAttr.uniqueArray();
    // TODO check if multiple streams are associated to one attractor
    return insideStreams;
  };

  s.playAreaTransition = function (center, z) {
    // Get correct attractors array
    var attractors = s.streamAttractors[z.toString()];
    // Find streams inside the playing area
    var insideStreams = s.findAttractorsInPlayArea(s.playAreaRatios[z], attractors, center);
    s.dLog && console.log(`Inside PA: ${insideStreams}`);
    // Get streams gone out
    var outgoingStreams = s.playingStreams.diff(insideStreams);
    // Remove duplicates and NanNs
    outgoingStreams = outgoingStreams.uniqueArray();
    s.dLog && console.log(`Outgoing streams: ${outgoingStreams}`);
    // For each stream...
    outgoingStreams.forEach(function (el) {
      // Check if not already fading
      if (!s.streamSounds[el].isFading()) {
        // Fade out
        s.streamSounds[el].fadeOut(3);
        // Schedule to check if user has moved during fade
        setTimeout(function () {
          s.reCheckIncomingStatus(el);
        }, 3001);
        s.dLog && console.log(`Stream ${el} fading out`);
      } else {
        s.dLog && console.log(`Stream ${el} is already fading`);
      }
    });
    // Get streams come in
    var incomingStreams = insideStreams.diff(s.playingStreams);
    // Remove duplicates and NanNs
    incomingStreams = incomingStreams.uniqueArray();
    s.dLog && console.log(`Incoming streams: ${incomingStreams}`);
    // For each stream...
    incomingStreams.forEach(function (el) {
        // Check if not already fading
        if (!s.streamSounds[el].isFading()) {
          // Fade in
          s.streamSounds[el].fadeIn(3, true);
          // Schedule to check if user has moved during fade
          setTimeout(function () {
            s.reCheckOutgoingStatus(el);
          }, 3001);
          s.dLog && console.log(`Stream ${el} fading in`);
        } else {
          s.dLog && console.log(`Stream ${el} is already fading`);
        }
      });
    // Update current playing streams
    s.playingStreams = insideStreams;
  };

  s.reCheckIncomingStatus = function (streamId) {
    s.dLog && console.log(`Re checking status fo stream ${streamId}`);
    // Force remove stream from playing streams (if present)
    s.playingStreams = s.playingStreams.filter(function (n) {
      return n !== streamId;
    });
    // Raise event 'animation finish' and check again
    s.img.viewer.raiseEvent('animation-start');
    s.img.viewer.raiseEvent('animation-finish');
  };

  s.reCheckOutgoingStatus = function (streamId) {
    s.dLog && console.log(`Re checking status fo stream ${streamId}`);
    // Force push stream in playing streams
    s.playingStreams.push(streamId);
    // Raise event 'animation finish' and check again
    s.img.viewer.raiseEvent('animation-start');
    s.img.viewer.raiseEvent('animation-finish');
  };


  s.findClosestAttractor = function (attractors, center) {
    var closestAttractor;
    if (attractors instanceof Array) {
      var idx = 0;
      var attrPoint = new OpenSeadragon.Point(attractors[0].x, attractors[0].y);
      var distance = center.squaredDistanceTo(attrPoint) / attractors[0].coeff;
      for (let i = 1; i < attractors.length; i++) {
        attrPoint = new OpenSeadragon.Point(attractors[i].x, attractors[i].y);
        var newdistance = center.squaredDistanceTo(attrPoint) / attractors[i].coeff;
        if (newdistance < distance) {
          idx = i;
          distance = newdistance;
        }
      }
      closestAttractor = attractors[idx];
    } else {
      closestAttractor = attractors;
    }
    // TODO check is multiple streams are associated to one attractor
    s.dLog && console.log(`The closest attractor point is ${closestAttractor.x}, ${closestAttractor.y}`);
    return closestAttractor;
  };

  s.transition = function (center, z) {
    var fading = false;
    // Get correct attractors array
    var attractors = s.streamAttractors[z.toString()];
    // Find closest
    var closestAttractor = s.findClosestAttractor(attractors, center);
    var streamIdx = parseInt(closestAttractor.stream);
    s.dLog && console.log(`Stream associated id: ${streamIdx}`);
    // TODO For each attractor inside the playing area
    // Check if stream attractor is changed
    if (streamIdx !== s.currentAttractor.stream) {
      // Check if current has associated streams
      if (typeof s.currentAttractor.stream !== 'undefined') {
        // Check if current is not already fading
        if (!s.streamSounds[s.currentAttractor.stream].isFading()) {
          // If not fade out current
          s.streamSounds[s.currentAttractor.stream].fadeOut(4);
          // In any case update current attractor
          s.currentAttractor = closestAttractor;
        } else {
          fading = true;
        }
      }
      // Check if new has associated streams
      if (!isNaN(streamIdx) && !fading) {
        s.streamSounds[streamIdx].fadeIn(4, true);
        // s.dLog && console.log(`Fading in stream ${streamIdx}`);
        s.currentAttractor = closestAttractor;
      }
    }
  };

  s.manageActiveZones = function (center, z) {
    if (z > 2) {
      if ( !s.img.getActiveZoneById('child').visible ) { // Check if not already shown
        s.img.showActiveZone('child');
      }
    } else {
      if ( s.img.getActiveZoneById('child').visible) { // Check if not already hidden
        s.img.hideActiveZone('child');
      }
    }
  };

  // ***************************/
  // ***************************/
  // ******** UTILITIES ********
  s.manageBrowsers = function () {
    // TODO
  };

  // Converts from degrees to radians
  s.radians = function (degrees) {
    return degrees * Math.PI / 180;
  };

  // Converts from radians to degrees
  s.degrees = function (radians) {
    return radians * 180 / Math.PI;
  };

  s.sign = function (val) {
    return val >= 0 ? 1 : -1;
  };

  s.map = function (value, istart, istop, ostart, ostop) {
    return ostart + (ostop - ostart) * ((value - istart) / (istop - istart));
  };

  s.randomInt = function (min, max) {
    // Max and min both inclusive
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

 /**
  * @function expSmooth exponential smoothing
  *
  * @param {Number} curVal
  *      Value to be smoothed
  *
  * @param {Number} prevVal
  *      Previous value got from the source
  *
  * @param {Number} N
  *      Equivalent moving average window length
  *
  * Usage example for sound gain:
  *   sound.setGain(expSmooth(newGain, sound.getMasterGain(), 5));
  **/
  s.expSmooth = function (currVal, prevVal, N) {
    var tiny = 1 - (1/N);
    return tiny * prevVal + (1 - tiny) * currVal;
  };

  // JSON AJAX CALL
  s.getJSON = function (url, callback) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.responseType = 'json';
      xhr.onload = function() {
        var status = xhr.status;
        if (status === 200) {
          callback(null, xhr.response);
        } else {
          callback(status, xhr.response);
        }
      };
      xhr.send();
  };

  // USER CONTROLS
  s.setUserControls = function (HTMLdoc) {
    HTMLdoc.getElementById('muteButton').addEventListener('click', function () {
      if (!s.appMuted) {
        s.muteAll();
        this.setAttribute("class", "unMuteButton");
      } else if (s.appMuted) {
        s.unMuteAll();
        this.setAttribute("class", "muteButton");
      }
    });
    HTMLdoc.getElementById('resetViewButton').addEventListener('click', function () {
      s.img.goHome();
    });
    s.splash.addEventListener('click', s.enter);
    s.audioLogResetButton.addEventListener('click', function () {
      s.audioLogger.innerHTML = '';
    });
  };
})(splsApp);


window.addEventListener('load', splsApp.onLoad, false);
