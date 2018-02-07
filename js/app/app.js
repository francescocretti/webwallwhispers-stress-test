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
  // s.streamSounds = [];
  s.bufferedSounds10s = [];
  s.bufferedSounds20s = [];
  s.bufferedSounds60s = [];
  s.bufferedSounds100s = [];
  s.bufferedSounds200s = [];
  s.appMuted = false;
  s.ASfinishLoad = false;
  // DOM
  s.splash = document.getElementById('splash');
  s.audioLogger = document.getElementById('audioLogs');
  s.audioLogResetButton = document.getElementById('resetAudioLog');
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
      console.log('Stress test version 1');
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
      s.splash.parentNode.removeChild(splash);
      // s.stbyCheckId = setInterval(s.checkUserInactivity, 3000);
      // TEMP - for mobile devices
      if (s.checkDevice.isMobile.any()) {
        window.alert('Modible device');
      }
    }
  };

  // ******** AUDIO ********
  s.loadAudioData = function (audioConfig) {
    // Create audio context
    var audioCtx = s.createAudioContext();
    // Load buffers for action sounds
    var bufferedSoundsURL = '../shared_media/audio/pseudostreams/';
    var bufferedSounds = [
      'pseudostream0_10s.m4a',
      'pseudostream1_10s.m4a',
      'pseudostream2_10s.m4a',
      'pseudostream3_10s.m4a',
      'pseudostream4_10s.m4a',
      'pseudostream0_20s.m4a',
      'pseudostream1_20s.m4a',
      'pseudostream2_20s.m4a',
      'pseudostream3_20s.m4a',
      'pseudostream4_20s.m4a',
      'pseudostream0_60s.m4a',
      'pseudostream1_60s.m4a',
      'pseudostream2_60s.m4a',
      'pseudostream3_60s.m4a',
      'pseudostream4_60s.m4a',
      'pseudostream0_100s.m4a',
      'pseudostream1_100s.m4a',
      'pseudostream2_100s.m4a',
      'pseudostream3_100s.m4a',
      'pseudostream4_100s.m4a',
      'pseudostream0_200s.m4a',
      'pseudostream1_200s.m4a',
      'pseudostream2_200s.m4a',
      'pseudostream3_200s.m4a',
      'pseudostream4_200s.m4a',
    ];
    for (var i = 0; i < bufferedSounds.length; i++) {
      bufferedSounds[i] = bufferedSoundsURL.concat(bufferedSounds[i]);
    }
    var buffLoader = new BufferLoader(audioCtx, bufferedSounds, s.feedWebAudioNodes);
    buffLoader.load();
    // Set streams
    // s.streamSounds = s.loadStreamSounds(audioCtx, audioConfig);
  };

  s.createAudioContext = function () {
    var contextClass = (window.AudioContext || window.webkitAudioContext ||
      window.mozAudioContext || window.oAudioContext || window.msAudioContext);
    if (contextClass) {
      var context = new contextClass();
      return context;
    } else {
      window.alert('Cannot run app. WebAudioAPI are not supported by this browser');
    }
  };

  s.feedWebAudioNodes = function (sounds, context) {
    for (var i = 0; i < sounds.length; i++) {
      if (i < 5) {
        s.bufferedSounds10s[i] = new BufferedSound(context, sounds[i], i, s.audioLog, s.dLog);
        s.bufferedSounds10s[i].init();
      } else if (i < 10) {
        s.bufferedSounds20s[i-5] = new BufferedSound(context, sounds[i], i - 5, s.audioLog, s.dLog);
        s.bufferedSounds20s[i-5].init();
      } else if (i < 15) {
        s.bufferedSounds60s[i-10] = new BufferedSound(context, sounds[i], i - 10, s.audioLog, s.dLog);
        s.bufferedSounds60s[i-10].init();
      } else if (i < 20) {
        s.bufferedSounds100s[i-15] = new BufferedSound(context, sounds[i], i - 15, s.audioLog, s.dLog);
        s.bufferedSounds100s[i-15].init();
      } else if (i < 25) {
        s.bufferedSounds200s[i-20] = new BufferedSound(context, sounds[i], i - 20, s.audioLog, s.dLog);
        s.bufferedSounds200s[i-20].init();
      }
    }
    s.ASfinishLoad = true;
    console.log('Buffered sounds loaded');
  };

  // s.loadStreamSounds = function (context, audioConfig) {
  //   if (Hls.isSupported()) {
  //     var streams = [];
  //     for (let i = 0; i < audioConfig.hlsStreamNumber; i++) {
  //       streams[i] = new StreamSound(context, i, s.audioLog, s.dLog);
  //       streams[i].init(audioConfig.preloadHls[i]);
  //       // See all HLS Events - https://goo.gl/e2F3Ki
  //       streams[i].hls.on(Hls.Events.FRAG_LOADING, function (event, object) {
  //         // s.log.warn(`Started loading frag ${object.frag.sn} for audio ${i}`);
  //       });
  //       streams[i].hls.on(Hls.Events.FRAG_LOADED, function (event, object) {
  //         // s.log.warn(`Ended loading frag ${object.frag.sn} for audio ${i}`);
  //       });
  //       /** BUG: when track changes, if random starting fragment
  //        * is the same of the last played fragment, event is not fired
  //        **/
  //       streams[i].hls.on(Hls.Events.FRAG_CHANGED, function (event, object) {
  //         // s.log.info("Fragment "+object.frag.sn+" changed in audio "+i);
  //         var loadTime = performance.now();
  //         if (streams[i].seekTime !== null) {
  //           // s.log.info(`New audio took ${loadTime - streams[i].seekTime} msecs`);
  //           streams[i].seekTime = null;
  //         }
  //       });
  //     }
  //     console.log('Stream sounds loaded');
  //     return streams;
  //   } else {
  //     window.alert('Cannot run app. HLS is not supported by this browser');
  //   }
  // };

  s.checkPlayingAudios = function () {
    var activeAudiosIndex = [];
    for(var i = 0; i < s.bufferedSounds.length; i++) {
      if (s.bufferedSounds[i].playing) {
        activeAudiosIndex.push(i);
      }
    }
    return activeAudiosIndex;
  };

  s.muteAll = function () {
    // s.streamSounds.forEach(function (el) {
    //   el.mute();
    // });
    s.bufferedSounds.forEach(function (el) {
      el.mute();
    });
    s.appMuted = true;
  };

  s.unMuteAll = function () {
    // s.streamSounds.forEach(function (el) {
    //   el.unmute();
    // });
    s.bufferedSounds.forEach(function (el) {
      el.unmute();
    });
    s.appMuted = false;
  };

  // ***************************/
  // ***************************/
  // ******** UTILITIES ********
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
    s.splash.addEventListener('click', s.enter);
    s.audioLogResetButton.addEventListener('click', function () {
      s.audioLogger.innerHTML = '';
    });
  };
})(splsApp);


window.addEventListener('load', splsApp.onLoad, false);
