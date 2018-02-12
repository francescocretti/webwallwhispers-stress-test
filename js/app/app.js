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
  s.s10Sounds = false;
  s.bufferedSounds20s = [];
  s.s20Sounds = false;
  s.bufferedSounds60s = [];
  s.s60Sounds = false;
  s.bufferedSounds100s = [];
  s.s100Sounds = false;
  s.bufferedSounds200s = [];
  s.s200Sounds = false;
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
  s.reverberator = '';
  s.lastActionTime = Date.now();
  s.stbyCheckId = null;
  s.insideApp = false;

  s.audioLog = document.getElementById('audioLogs');

  s.bufferedFiles = [
    'piano.mp3',
    'snare.mp3',
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
      s.setUserControls();
      // Get stream attractors
      s.streamAttractors = config.attractors;
      s.currentAttractor = config.attractors[0];
      // Play area playAreaRatios
      s.playAreaRatios = config.playarearatios;
      // Audio
      // Create audio context
      s.audioCtx = s.createAudioContext();
      s.reverberator = new Reverberator(s.audioCtx);
      s.audioConfig = config.audio;
      //s.loadAudioData(config.audio);
      // Init effects
      // s.initializeEffects();
      console.log(s.getDeviceInfo());
      console.log('Stress test version 8');
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

  s.createAudioContext = function () {
    var contextClass = (window.AudioContext || window.webkitAudioContext ||
      window.mozAudioContext || window.oAudioContext || window.msAudioContext);
    if (contextClass) {
      var context = new contextClass();
      s.ASfinishLoad = true;
      return context;
    } else {
      window.alert('Cannot run app. WebAudioAPI are not supported by this browser');
    }
  };

  // ******** AUDIO ********
  s.loadAudioData = function (audioConfig, slot) {
    // Load buffers for action sounds
    var bufferedSoundsURL = '../shared_media/audio/pseudostreams/';
    var bufferedSounds = [];
    var callback;
    switch (slot) {
      case 1:
        // 10 secs
        bufferedSounds = s.bufferedFiles.slice(0, 5);
        callback = s.feedWebAudioNodes10s;
        break;
      case 2:
        // 20 secs
        bufferedSounds = s.bufferedFiles.slice(5, 10);
        callback = s.feedWebAudioNodes20s;
        break;
      case 3:
        // 60 secs
        bufferedSounds = s.bufferedFiles.slice(10, 15);
        callback = s.feedWebAudioNodes60s;
        break;
      case 4:
        // 100 secs
        bufferedSounds = s.bufferedFiles.slice(15, 20);
        callback = s.feedWebAudioNodes100s;
        break;
      case 5:
        // 200 secs
        bufferedSounds = s.bufferedFiles.slice(20, 25);
        callback = s.feedWebAudioNodes200s;
        break;
    }
    for (var i = 0; i < bufferedSounds.length; i++) {
      bufferedSounds[i] = bufferedSoundsURL.concat(bufferedSounds[i]);
    }
    var buffLoader = new BufferLoader(s.audioCtx, bufferedSounds, callback);
    buffLoader.load();
    // Set streams
    // s.streamSounds = s.loadStreamSounds(audioCtx, audioConfig);
  };

  s.feedWebAudioNodes10s = function (sounds, context) {
    console.log('loading...');
    sounds.forEach(function (el, index) {
      s.bufferedSounds10s[index] = new BufferedSound(context, el, index, s.audioLog, s.dLog);
      s.bufferedSounds10s[index].init();
      s.bufferedSounds10s[index].setLoop(true);
    });
    document.getElementsByClassName('ctrl s10')[0].style.backgroundColor = 'green';
    window.alert('Loading 10 seconds sounds finished');
    document.getElementsByClassName('lbutton s10')[0].innerHTML = 'LOADED';
    s.setListeners(1);
    s.s10Sounds = true;
  };
  s.feedWebAudioNodes20s = function (sounds, context) {
    sounds.forEach(function (el, index) {
      s.bufferedSounds20s[index] = new BufferedSound(context, el, index, s.audioLog, s.dLog);
      s.bufferedSounds20s[index].init();
      s.bufferedSounds20s[index].setLoop(true);
    });
    document.getElementsByClassName('ctrl s20')[0].style.backgroundColor = 'green';
    window.alert('Loading 20 seconds sounds finished');
    document.getElementsByClassName('lbutton s20')[0].innerHTML = 'LOADED';
    s.setListeners(2);
    s.s20Sounds = true;
  };
  s.feedWebAudioNodes60s = function (sounds, context) {
    sounds.forEach(function (el, index) {
      s.bufferedSounds60s[index] = new BufferedSound(context, el, index, s.audioLog, s.dLog);
      s.bufferedSounds60s[index].init();
      s.bufferedSounds60s[index].setLoop(true);
    });
    document.getElementsByClassName('ctrl s60')[0].style.backgroundColor = 'green';
    window.alert('Loading 60 seconds sounds finished');
    document.getElementsByClassName('lbutton s60')[0].innerHTML = 'LOADED';
    s.setListeners(3);
    s.s60Sounds = true;
  };
  s.feedWebAudioNodes100s = function (sounds, context) {
    sounds.forEach(function (el, index) {
      s.bufferedSounds100s[index] = new BufferedSound(context, el, index, s.audioLog, s.dLog);
      s.bufferedSounds100s[index].init();
      s.bufferedSounds100s[index].setLoop(true);
    });
    document.getElementsByClassName('ctrl s100')[0].style.backgroundColor = 'green';
    window.alert('Loading 100 seconds sounds finished');
    document.getElementsByClassName('lbutton s100')[0].innerHTML = 'LOADED';
    s.setListeners(4);
    s.s100Sounds = true;
  };
  s.feedWebAudioNodes200s = function (sounds, context) {
    sounds.forEach(function (el, index) {
      s.bufferedSounds200s[index] = new BufferedSound(context, el, index, s.audioLog, s.dLog);
      s.bufferedSounds200s[index].init();
      s.bufferedSounds200s[index].setLoop(true);
    });
    document.getElementsByClassName('ctrl s200')[0].style.backgroundColor = 'green';
    window.alert('Loading 200 seconds sounds finished');
    document.getElementsByClassName('lbutton s200')[0].innerHTML = 'LOADED';
    s.setListeners(5);
    s.s200Sounds = true;
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
  s.setUserControls = function () {
    document.getElementById('muteButton').addEventListener('click', function () {
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

    document.getElementsByClassName('lbutton s10')[0].addEventListener('click', function () {
      this.innerHTML = 'loading...'
      s.loadAudioData(s.audioConfig, 1);
    });
    document.getElementsByClassName('lbutton s20')[0].addEventListener('click', function () {
      this.innerHTML = 'loading...'
      s.loadAudioData(s.audioConfig, 2);
    });
    document.getElementsByClassName('lbutton s60')[0].addEventListener('click', function () {
      this.innerHTML = 'loading...'
      s.loadAudioData(s.audioConfig, 3);
    });
    document.getElementsByClassName('lbutton s100')[0].addEventListener('click', function () {
      this.innerHTML = 'loading...'
      s.loadAudioData(s.audioConfig, 4);
    });
    document.getElementsByClassName('lbutton s200')[0].addEventListener('click', function () {
      this.innerHTML = 'loading...'
      s.loadAudioData(s.audioConfig, 5);
    });
    // document.getElementById('s10s1p').addEventListener('click', function () {
    //   if (s.s10Sounds) {
    //     var sound = s.bufferedSounds10s[0];
    //     if (!sound.playing) {
    //       sound.fadeIn(1);
    //       this.style.backgroundColor = 'red';
    //     } else {
    //       sound.fadeOut(1);
    //       this.style.backgroundColor = 'white';
    //     }
    //   } else {
    //     window.alert('Load buffer first');
    //   }
    // });
  };

  s.setListeners = function (n) {
    switch (n) {
      case 1:
      s.bufferedSounds10s.forEach(function (el, index) {
        var id = `s10s${index+1}p`;
        document.getElementById(id).addEventListener('click', function () {
          var sound = el;
          if (!sound.playing) {
            sound.fadeIn(1);
            this.style.backgroundColor = 'red';
          } else {
            sound.fadeOut(1);
            this.style.backgroundColor = 'white';
          }
        });
        id = `s10s${index+1}r`;
        document.getElementById(id).addEventListener('click', function () {
          var sound = el;
          if (!sound.reverb) {
            sound.addReverb(s.reverberator, 1);
            this.style.backgroundColor = 'red';
          } else {
            sound.removeReverb();
            this.style.backgroundColor = 'white';
          }
        });
        id = `s10s${index+1}f`;
        document.getElementById(id).addEventListener('click', function () {
          var sound = el;
          if (!sound.filter.LPfiltered) {
            sound.filter.lowPassFilter(500);
            this.style.backgroundColor = 'red';
          } else {
            sound.filter.removeLowPassFilter();
            this.style.backgroundColor = 'white';
          }
        });
        id = `s10s${index+1}b`;
        document.getElementById(id).addEventListener('click', function () {
          var sound = el;
          if (!sound.binauralizator.binauralized) {
            sound.binauralizator.makeBinaural();
            this.style.backgroundColor = 'red';
          } else {
            sound.binauralizator.removeBinaural();
            this.style.backgroundColor = 'white';
          }
        });
        id = `s10s${index+1}d`;
        document.getElementById(id).addEventListener('click', function () {
          var sound = el;
          if (!sound.distortion.distorted) {
            sound.distortion.addDistortion(50);
            this.style.backgroundColor = 'red';
          } else {
            sound.distortion.removeDistortion();
            this.style.backgroundColor = 'white';
          }
        });
      });
        break;
      case 2:
      s.bufferedSounds20s.forEach(function (el, index) {
        var id = `s20s${index+1}p`;
        console.log(id);
        document.getElementById(id).addEventListener('click', function () {
          var sound = el;
          if (!sound.playing) {
            sound.fadeIn(1);
            this.style.backgroundColor = 'red';
          } else {
            sound.fadeOut(1);
            this.style.backgroundColor = 'white';
          }
        });
        id = `s20s${index+1}r`;
        document.getElementById(id).addEventListener('click', function () {
          var sound = el;
          if (!sound.reverb) {
            sound.addReverb(s.reverberator, 1);
            this.style.backgroundColor = 'red';
          } else {
            sound.removeReverb();
            this.style.backgroundColor = 'white';
          }
        });
        id = `s20s${index+1}f`;
        document.getElementById(id).addEventListener('click', function () {
          var sound = el;
          if (!sound.filter.LPfiltered) {
            sound.filter.lowPassFilter(500);
            this.style.backgroundColor = 'red';
          } else {
            sound.filter.removeLowPassFilter();
            this.style.backgroundColor = 'white';
          }
        });
        id = `s20s${index+1}b`;
        document.getElementById(id).addEventListener('click', function () {
          var sound = el;
          if (!sound.binauralizator.binauralized) {
            sound.binauralizator.makeBinaural();
            this.style.backgroundColor = 'red';
          } else {
            sound.binauralizator.removeBinaural();
            this.style.backgroundColor = 'white';
          }
        });
        id = `s20s${index+1}d`;
        document.getElementById(id).addEventListener('click', function () {
          var sound = el;
          if (!sound.distortion.distorted) {
            sound.distortion.addDistortion(50);
            this.style.backgroundColor = 'red';
          } else {
            sound.distortion.removeDistortion();
            this.style.backgroundColor = 'white';
          }
        });
      });
        break;
      case 3:
      s.bufferedSounds60s.forEach(function (el, index) {
        var id = `s60s${index+1}p`;
        console.log(id);
        document.getElementById(id).addEventListener('click', function () {
          var sound = el;
          if (!sound.playing) {
            sound.fadeIn(1);
            this.style.backgroundColor = 'red';
          } else {
            sound.fadeOut(1);
            this.style.backgroundColor = 'white';
          }
        });
        id = `s60s${index+1}r`;
        document.getElementById(id).addEventListener('click', function () {
          var sound = el;
          if (!sound.reverb) {
            sound.addReverb(s.reverberator, 1);
            this.style.backgroundColor = 'red';
          } else {
            sound.removeReverb();
            this.style.backgroundColor = 'white';
          }
        });
        id = `s60s${index+1}f`;
        document.getElementById(id).addEventListener('click', function () {
          var sound = el;
          if (!sound.filter.LPfiltered) {
            sound.filter.lowPassFilter(500);
            this.style.backgroundColor = 'red';
          } else {
            sound.filter.removeLowPassFilter();
            this.style.backgroundColor = 'white';
          }
        });
        id = `s60s${index+1}b`;
        document.getElementById(id).addEventListener('click', function () {
          var sound = el;
          if (!sound.binauralizator.binauralized) {
            sound.binauralizator.makeBinaural();
            this.style.backgroundColor = 'red';
          } else {
            sound.binauralizator.removeBinaural();
            this.style.backgroundColor = 'white';
          }
        });
        id = `s60s${index+1}d`;
        document.getElementById(id).addEventListener('click', function () {
          var sound = el;
          if (!sound.distortion.distorted) {
            sound.distortion.addDistortion(50);
            this.style.backgroundColor = 'red';
          } else {
            sound.distortion.removeDistortion();
            this.style.backgroundColor = 'white';
          }
        });
      });
        break;
      case 4:
      s.bufferedSounds100s.forEach(function (el, index) {
        var id = `s100s${index+1}p`;
        document.getElementById(id).addEventListener('click', function () {
          var sound = el;
          if (!sound.playing) {
            sound.fadeIn(1);
            this.style.backgroundColor = 'red';
          } else {
            sound.fadeOut(1);
            this.style.backgroundColor = 'white';
          }
        });
        id = `s100s${index+1}r`;
        document.getElementById(id).addEventListener('click', function () {
          var sound = el;
          if (!sound.reverb) {
            sound.addReverb(s.reverberator, 1);
            this.style.backgroundColor = 'red';
          } else {
            sound.removeReverb();
            this.style.backgroundColor = 'white';
          }
        });
        id = `s100s${index+1}f`;
        document.getElementById(id).addEventListener('click', function () {
          var sound = el;
          if (!sound.filter.LPfiltered) {
            sound.filter.lowPassFilter(500);
            this.style.backgroundColor = 'red';
          } else {
            sound.filter.removeLowPassFilter();
            this.style.backgroundColor = 'white';
          }
        });
        id = `s100s${index+1}b`;
        document.getElementById(id).addEventListener('click', function () {
          var sound = el;
          if (!sound.binauralizator.binauralized) {
            sound.binauralizator.makeBinaural();
            this.style.backgroundColor = 'red';
          } else {
            sound.binauralizator.removeBinaural();
            this.style.backgroundColor = 'white';
          }
        });
        id = `s100s${index+1}d`;
        console.log(id);
        document.getElementById(id).addEventListener('click', function () {
          var sound = el;
          if (!sound.distortion.distorted) {
            sound.distortion.addDistortion(50);
            this.style.backgroundColor = 'red';
          } else {
            sound.distortion.removeDistortion();
            this.style.backgroundColor = 'white';
          }
        });
      });
        break;
      case 5:
      s.bufferedSounds200s.forEach(function (el, index) {
        var id = `s200s${index+1}p`;
        document.getElementById(id).addEventListener('click', function () {
          var sound = el;
          if (!sound.playing) {
            sound.fadeIn(1);
            this.style.backgroundColor = 'red';
          } else {
            sound.fadeOut(1);
            this.style.backgroundColor = 'white';
          }
        });
        id = `s200s${index+1}r`;
        document.getElementById(id).addEventListener('click', function () {
          var sound = el;
          if (!sound.reverb) {
            sound.addReverb(s.reverberator, 1);
            this.style.backgroundColor = 'red';
          } else {
            sound.removeReverb();
            this.style.backgroundColor = 'white';
          }
        });
        id = `s200s${index+1}f`;
        document.getElementById(id).addEventListener('click', function () {
          var sound = el;
          if (!sound.filter.LPfiltered) {
            sound.filter.lowPassFilter(500);
            this.style.backgroundColor = 'red';
          } else {
            sound.filter.removeLowPassFilter();
            this.style.backgroundColor = 'white';
          }
        });
        id = `s200s${index+1}b`;
        document.getElementById(id).addEventListener('click', function () {
          var sound = el;
          if (!sound.binauralizator.binauralized) {
            sound.binauralizator.makeBinaural();
            this.style.backgroundColor = 'red';
          } else {
            sound.binauralizator.removeBinaural();
            this.style.backgroundColor = 'white';
          }
        });
        id = `s200s${index+1}d`;
        document.getElementById(id).addEventListener('click', function () {
          var sound = el;
          if (!sound.distortion.distorted) {
            sound.distortion.addDistortion(50);
            this.style.backgroundColor = 'red';
          } else {
            sound.distortion.removeDistortion();
            this.style.backgroundColor = 'white';
          }
        });
      });
        break;
    }
  };
})(splsApp);


window.addEventListener('load', splsApp.onLoad, false);
