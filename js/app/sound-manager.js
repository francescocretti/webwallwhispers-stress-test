/** BUFFER LOADER WITH AJAX REQUEST
 *
 * @param {Object} audioContext
 *			WebAudio Context of current application
 *
 * @param {Array} urlList
 *			Array of URL strings for audio files to be loaded
 *
 * @param {Function} callback
 *			Callback function to be called at the end of loading
 *
 **/
function BufferLoader(audioContext, urlList, callback) {
		this.context = audioContext;
    this.urlList = urlList;
    this.onload = callback;
    this.bufferList = [];
    this.loadCount = 0;
}

BufferLoader.prototype.loadBuffer = function (url, index) {
  const loader = this;
	var request = new XMLHttpRequest();
  request.open('GET', url, true);
  request.responseType = 'arraybuffer';
  request.onload = function () {
    loader.context.decodeAudioData(request.response, function (buffer) {
			if (!buffer) {
				alert(`Error decoding file data ${url}`);
				return;
			}
			loader.bufferList[index] = buffer;
      if (++loader.loadCount === loader.urlList.length) {
				loader.onload(loader.bufferList, loader.context);
			}
		});
	};
	request.onerror = function () {
		alert('BufferLoader: XHR error');
	};
	request.send();
};

BufferLoader.prototype.load = function () {
  for (var i = 0; i < this.urlList.length; ++i) {
		this.loadBuffer(this.urlList[i], i);
	}
};

// *********************************************************
/** Buffered SOUND CONSTRUCTOR
 * @param {Object} AudioContext
 *			WebAudio Context of current application
 *
 * @param {ArrayBuffer} bufferSource
 *			Actual array buffer with decoded audio data
 *
 **/
function BufferedSound(audioContext, bufferSource, idx, HTMLlog, debugLog) {
	this.context = audioContext;
  this.buffer = bufferSource;
	this.index = idx;
	this.htmlLogger = HTMLlog;
	this.dLog = debugLog;
	this.sourceNode = '';
  this.masterGain = '';
  this.playing = false;
	this.fading = false;
	this.loop = false;
	this.reverb = false;
  this.reverberator = '';
	this.filter = new Filter(audioContext, this);
	this.distortion = new Distortion (audioContext, this);
	this.binauralizator = new Binauralizator (audioContext, this);
}

BufferedSound.prototype.init = function () {
	this.masterGain = this.context.createGain();
	this.masterGain.connect(this.context.destination);
	this.masterGain.gain.setTargetAtTime(1, this.context.currentTime, 0.5);
	console.log('Buffered SOUND INIT');
};

BufferedSound.prototype.play = function () {
	if (!this.playing) {
		this.sourceNode = this.context.createBufferSource();
		this.sourceNode.loop = this.loop;
		this.sourceNode.buffer = this.buffer;
		this.sourceNode.start(0);
		this.sourceNode.connect(this.masterGain);
		this.playing = true;
		this.dLog && console.log(`Buffered sound ID: ${this.index} - Play`);
		this.htmlLogger.innerHTML += '<br>Played Buffered sound ID: ' + this.index;
	} else {
		// this.dLog && console.log('Already playing. Check gain value');
	}
};

BufferedSound.prototype.stop = function () {
	if (this.playing) {
		this.sourceNode.stop(0);
		this.sourceNode.disconnect(this.masterGain); // disconnect from any source
		this.playing = false;
		this.dLog && console.log(`Buffered sound ID: ${this.index} - stopped`);
		this.htmlLogger.innerHTML += '<br>Stopped Buffered sound <ID: ' + this.index + '> ';
	}
};

BufferedSound.prototype.setLoop = function (loop) {
	const self = this;
	// Sets loop when starts playing
	self.loop = loop;
	// Useful when already playing
	self.sourceNode.loop = loop;
	self.dLog && console.log(`Buffered sound ID: ${this.index} - loop set to ${loop}`);
};

BufferedSound.prototype.fire = function () {
	const self = this;
	this.masterGain.gain.setValueAtTime(1, this.context.currentTime);
	var dur = self.buffer.duration;
	self.sourceNode = self.context.createBufferSource();
	self.sourceNode.buffer = self.buffer;
	self.sourceNode.start(0);
	self.sourceNode.connect(self.masterGain);
	self.playing = true;
	setTimeout(function () {
		self.sourceNode.stop(0);
		self.sourceNode.disconnect(); // disconnect from any source
		self.playing = false;
	}, dur * 1000);
	self.dLog && console.log(`Buffered sound ID: ${this.index} - fired!`);
};

/**
 * @param {Number} fadeTime
 *			Duration of fade in seconds
 **/
BufferedSound.prototype.fadeIn = function (fadeTime) {
	if (!fadeTime) {
		this.dLog && console.warn(`Missing argument fadeTime. Set to 1 second`);
		fadeTime = 1;
	}
	const self = this;
	if (!self.playing) {
		var curTime = self.context.currentTime;
		self.masterGain.gain.setValueAtTime(0, curTime);
		// set automation points fot fade in
		for (var i = 0; i <= fadeTime; i += 0.1) {
			var x = i / fadeTime;
			var value = Math.cos((1.0 - x) * 0.5 * Math.PI);
			self.masterGain.gain.linearRampToValueAtTime(value, curTime + i);
		}
		self.play();
		self.fading = true;
		self.htmlLogger.innerHTML += '<br>Buffered sound fading in <ID: ' + this.index + '>... ';
		setTimeout(function () {
			self.fading = false;
			this.dLog && console.log(`Fade in stream finished [ ID: ${self.index} ]`);
			self.htmlLogger.innerHTML += '<br>Fade in stream finished [ID: ' + self.index + '] ';
		}, fadeTime * 1000);
	} else {
		this.dLog && console.log(`Cannot fade in. Already playing [ ID: ${self.index} ]`);
	}
};

/**
 * @param {Number} fadeTime
 *			Duration of fade in seconds
 **/
 BufferedSound.prototype.fadeOut = function (fadeTime) {
 	if (!fadeTime) {
 		this.dLog && console.warn(`Missing argument fadeTime. Set to 1 second`);
 		fadeTime = 1;
 	}
 	const self = this;
 	if (self.playing) {
 		var currGain = self.masterGain.gain.value;
 		var curTime = self.context.currentTime;
 		self.masterGain.gain.setValueAtTime(currGain, curTime);
 		for (var i = 0; i <= fadeTime; i += 0.1) {
 			var x = i / fadeTime;
 			var value = Math.cos(x * 0.5 * Math.PI) * currGain;
 			self.masterGain.gain.linearRampToValueAtTime(value, curTime + i);
 		}
 		self.fading = true;
 		this.dLog && console.log(`Fading out buffered sound [ ID: ${self.index} ]`);
 		this.htmlLogger.innerHTML += '<br>Buffered sound fading out <ID: ' + this.index + '>... ';
 		setTimeout(function () {
 			self.stop();
 			self.fading = false;
 			this.dLog && console.log(`Fade out buffered sound finished [ ID: ${self.index} ]`);
 			self.htmlLogger.innerHTML += '<br>Fade out buffered sound finished [ID: ' + self.index + '] ';
 		}, fadeTime * 1000);
 	}
 };

/**
 * @returns {Boolean}
 *			If stream is currently fading
 **/
BufferedSound.prototype.isFading = function () {
	return this.fading;
};


BufferedSound.prototype.mute = function () {
		this.masterGain.gain.cancelScheduledValues(this.context.currentTime);
		this.masterGain.gain.setValueAtTime(0, this.context.currentTime);
		this.dLog && console.log(`Buffered sound ID: ${this.index} muted`);
};

BufferedSound.prototype.unmute = function () {
		this.masterGain.gain.setValueAtTime(1, this.context.currentTime);
		this.dLog && console.log(`Buffered sound ID: ${this.index} unmuted`);
};

/**
 *
 * @param {Number} mgain
 *			Gain value of master  signal
 **/
BufferedSound.prototype.setMasterGain = function (mgain) {
	if (mgain > 1) {
		this.dLog && console.warn('Gain values cannot be greater than 1');
		mgain = 1;
	} else if (mgain < 0) {
		this.dLog && console.warn('Gain values cannot be lower than 0');
		mgain = 0;
	}
	this.masterGain.gain.setTargetAtTime(mgain, this.context.currentTime, 0.5);
};

BufferedSound.prototype.getMasterGain = function () {
	return this.masterGain.gain.value;
};

/**
 *
 * @param {Number} val
 *			Final gain value
 *
 * @param {Number} secs
 *			Duration of fade in seconds
 **/
BufferedSound.prototype.fadeToGain = function (val, secs) {
		if (val > 1) {
			this.dLog && console.warn('Gain values cannot be greater than 1');
			val = 1;
		} else if (val < 0) {
			this.dLog && console.warn('Gain values cannot be lower than 0');
			val = 0;
		}
		if (!secs) {
			this.dLog && console.warn(`Missing argument fadeTime. Set to 1 second`);
			secs = 1;
		}
		this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, this.context.currentTime);
		this.masterGain.gain.linearRampToValueAtTime(val, this.context.currentTime + secs);
};


// *********************************************************
/** STREAM SOUND
 * @param {Object} AudioContext
 *			WebAudio Context of current application
 **/
function StreamSound(audioContext, idx, HTMLlog, debugLog) {
	this.context = audioContext;
	this.index = idx;
	this.htmlLogger = HTMLlog;
	this.dLog = debugLog;
	this.audioElement = new Audio();
	this.hls = new Hls();
	this.fading = false;
	this.hlsLoadInit = false;
	this.sourceNode = '';
	this.masterGain = '';
	this.reverberator = new Reverberator(audioContext, this);
	this.binauralizator = new Binauralizator(audioContext, this);
	this.filter = new Filter (audioContext, this);
	this.distortion = new Distortion (audioContext, this);
}

/**
 * @param {Boolean} autoStart
 *			If true Hls starts immediately to load fragments (if the associated
 *			audioElement is paused, it stops after 5 frags)
 *			If false < hls.startLoad(startPosition=-1) > is necessary later
 **/
StreamSound.prototype.init = function (autoStart) {
	'use strict';

	const self = this;
	var sourceURL = '../shared_media/audio/streams/'.concat('stream', self.index.toString(),
	 '/', 'master', self.index.toString(), '.m3u8');
	self.hls.loadSource(sourceURL);
	self.hls.attachMedia(self.audioElement);
	self.hls.config.autoStartLoad = autoStart;
	self.audioElement.crossOrigin = 'anonymous';
	self.audioElement.loop = true;
	self.sourceNode = self.context.createMediaElementSource(self.audioElement);
	self.masterGain = self.context.createGain();
	self.sourceNode.connect(self.masterGain);
	self.masterGain.connect(self.context.destination);
	self.audioElement.pause();
	// this.dLog && console.log(`Stream Sound ${self.index} loaded with Hls`);
	self.hls.on(Hls.Events.FRAG_PARSING_INIT_SEGMENT, function () {
		this.dLog && console.log(`Init segment parsed audio ${self.index}`);
		self.hlsLoadInit = true;
	});
};

/**
 * @returns {Boolean}
 *			If stream is currently playing
 **/
StreamSound.prototype.isPlaying = function () {
	return (!this.audioElement.paused && this.audioElement.currentTime > 0 &&
		!this.audioElement.ended);
};

/**
 * @returns {Boolean}
 *			If stream is currently fading
 **/
StreamSound.prototype.isFading = function () {
	return this.fading;
};

StreamSound.prototype.play = function () {
	this.audioElement.play();
};

/**
 * @param {Number} fadeTime
 *			Fade time in seconds
 *
 * @param {Boolean}  random
 *			If true audio will fade in at a random starting time
 **/
StreamSound.prototype.fadeIn = function (fadeTime, random) {
	if (!fadeTime) {
		this.dLog && console.warn(`Missing argument fadeTime. Set to 1 second`);
		fadeTime = 1;
	}
	const self = this;
	if (!self.isPlaying()) {
		var curTime = self.context.currentTime;
		self.masterGain.gain.setValueAtTime(0, curTime);
		// set automation points fot fade in
		for (var i = 0; i <= fadeTime; i += 0.1) {
			var x = i / fadeTime;
			var value = Math.cos((1.0 - x) * 0.5 * Math.PI);
			self.masterGain.gain.linearRampToValueAtTime(value, curTime + i);
		}
		if (random) {
			// TODO: add control if cannot set random current time (resource not loaded yet)
			var randomTime = Math.floor(Math.random() * (self.audioElement.duration + 1));
			this.dLog && console.log(`Random starting time: ${randomTime} sec for stream ${self.index}`);
			self.seekTime = performance.now();
			self.audioElement.currentTime = randomTime;
		}
		// start playing
		self.audioElement.play();
		self.fading = true;
		setTimeout(function () {
			self.fading = false;
			this.dLog && console.log(`Fade in stream finished [ ID: ${self.index} ]`);
			self.htmlLogger.innerHTML += '<br>Fade in stream finished [ID: ' + self.index + '] ';
		}, fadeTime * 1000);
		this.dLog && console.log(`Fading in stream [ ID: ${self.index} ]`);
		self.htmlLogger.innerHTML += '<br>Fading in stream [ID: ' + self.index + ']... ';
	} else {
		//// this.dLog && console.log(`Cannot fade in audio ${self.index} because is already playing`);
	}
};

/**
 * @param {Number} fadeTime
 *			Fade time in seconds
 **/
StreamSound.prototype.fadeOut = function (fadeTime) {
	if (!fadeTime) {
		this.dLog && console.warn(`Missing argument fadeTime. Set to 1 second`);
		fadeTime = 1;
	}
	const self = this;
	if (self.isPlaying()) {
		var currGain = self.masterGain.gain.value;
		var curTime = self.context.currentTime;
		self.masterGain.gain.setValueAtTime(currGain, curTime);
		for (var i = 0; i <= fadeTime; i += 0.1) {
			var x = i / fadeTime;
			var value = Math.cos(x * 0.5 * Math.PI) * currGain;
			self.masterGain.gain.linearRampToValueAtTime(value, curTime + i);
		}
		self.fading = true;
		setTimeout(function () {
			self.audioElement.pause();
			self.fading = false;
			this.dLog && console.log(`Fade out stream finished [ ID: ${self.index} ]`);
			self.htmlLogger.innerHTML += '<br>Fade out stream finished [ID: ' + self.index + '] ';
		}, fadeTime * 1000);
		this.dLog && console.log(`Fading out stream [ ID: ${self.index} ]`);
		self.htmlLogger.innerHTML += '<br>Fading out stream [ID: ' + self.index + ']... ';
	} else {
		//this.dLog && console.warn(`Cannot fade out audio ${self.index} because is not playing`);
	}
};

StreamSound.prototype.fadeToGain = function (val, secs) {
		if (val > 1) {
			this.dLog && console.warn('Gain values cannot be greater than 1');
			val = 1;
		} else if (val < 0) {
			this.dLog && console.warn('Gain values cannot be lower than 0');
			val = 0;
		}
		if (!secs) {
			this.dLog && console.warn(`Missing argument fadeTime. Set to 1 second`);
			secs = 1;
		}
		this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, this.context.currentTime);
		this.masterGain.gain.linearRampToValueAtTime(val, this.context.currentTime + secs);
};

/**
 *
 * @param {Number} mgain
 *			Gain value of master  signal
 **/
StreamSound.prototype.setMasterGain = function (mgain) {
	if (mgain > 1) {
		this.dLog && console.warn('Gain values cannot be greater than 1');
		mgain = 1;
	} else if (mgain < 0) {
		this.dLog && console.warn('Gain values cannot be lower than 0');
		mgain = 0;
	}
	this.masterGain.gain.setTargetAtTime(mgain, this.context.currentTime, 0.5);
};

StreamSound.prototype.getMasterGain = function () {
	return this.masterGain.gain.value;
};

StreamSound.prototype.mute = function () {
	this.audioElement.muted = true;
};

StreamSound.prototype.unmute = function () {
	this.audioElement.muted = false;
};

StreamSound.prototype.startFragmentsLoading = function () {
	if (!this.hlsLoadInit) {
		this.hls.startLoad(startPosition = -1);
		// this.dLog && console.log(`Started hls fragments loading audio ${this.index}`);
	} else {
		// this.dLog && console.log(`Hls already initialized for audio ${this.index}`);
	}
};


/**
 *
 * @param {Object} rvb
 *			Reverberator object to connect to
 *
 * @param {Number} wgain
 *			Gain value of wet signal
 *
 * @returns {Boolean}
 *			True if reverb added / Flase if already present
 **/
BufferedSound.prototype.addReverb = function (rvb, wgain) {
	const self = this;
	if (!self.reverb) {
		if (wgain > 1) {
			self.dLog && console.warn('Gain values cannot be greater than 1');
			wgain = 1;
		} else if (wgain < 0) {
			self.dLog && console.warn('Gain values cannot be lower than 0');
			wgain = 0;
		}
		self.reverberator = rvb;
		// create gain node for adjusting wet signal
		self.wetGain = self.context.createGain();
		self.wetGain.gain.setTargetAtTime(wgain, self.context.currentTime, 0.5);
		// Do connections
		self.masterGain.connect(self.wetGain);
		self.wetGain.connect(self.reverberator.convolver);
		self.reverb = true;
		self.dLog && console.log(`Reverb added [ID: ${self.index}]`);
		return true;
	} else {
		self.dLog && console.warn(`Reverb already present [ID: ${self.index}]`);
		return false;
	}
};

/**
 * @param {Object} sound
 *			Sound object to remove reverb from (can be ActionSound or StreamSound)
 * @returns {Boolean}
 *			True if reverb removed / False if not
 **/
BufferedSound.prototype.removeReverb = function () {
		if (this.reverb) {
			this.masterGain.disconnect(this.wetGain);
			this.wetGain.disconnect(this.reverberator.convolver);
			this.dLog && console.log(`Reverb removed [ID: ${this.index}]`);
			this.reverb = false;
			return true;
		} else {
			this.dLog && console.warn(`Use addReverb() before trying to remove it [ID: ${this.index}]`);
			return false;
		}
};

/**
 * @param {Number} wgain
 *			Gain value for wet signal
 **/
BufferedSound.prototype.setWetGain = function (wgain) {
	if (this.reverb) {
		this.wetGain.gain.setTargetAtTime(wgain, this.context.currentTime, 0.5);
	} else {
		this.dLog && console.warn(`Impossible to set wet gain: reverb not present [ID: ${this.index}]`);
	}
};

/**
 *
 * @param {Number} fadeTime
 *			Fade time in seconds
 **/
BufferedSound.prototype.fadeOutReverb = function (fadeTime) {
	const self = this;
	if (!fadeTime) {
		this.dLog && console.warn(`Missing argument fadeTime. Set to 1 second`);
		fadeTime = 1;
	}
	if (self.reverb) {
		self.wetGain.gain.setValueAtTime(self.wetGain.gain.value, self.context.currentTime);
		self.wetGain.gain.linearRampToValueAtTime(0.0001, self.context.currentTime + fadeTime);
		setTimeout(function () {
			self.removeReverb();
		}, fadeTime * 1000);
	} else {
		self.dLog && console.warn(`Use addReverb() before trying to remove it [ID: ${self.index}]`);
	}
};

/**
 * @param {Object} options
 *
 *
 * @returns {Array}
 *			Array of booleans corresponding to initialization result
 **/
BufferedSound.prototype.setEffectChain = function (options, rvb) {
	// Default values
	let defaults = {
		lpFilter: true,
		lpFreq: 10000,
		reverb: true,
		wetGain: 0.5,
		distortion: false,
		distAmount: 50,
		binaural: false
	};
	let actual = Object.assign({}, defaults, options);
	/*
	 * Effect chain is always connected as follows:
	 * Source (Master Gain) -> LP filter -> Dist -> Binaural
	 * irrespective of their instertion order
	 */
	 if (actual.binaural) {
		 this.binauralizator.makeBinaural();
	 } else {
		 this.binauralizator.removeBinaural();
	 }
	 if (actual.lpFilter) {
		 if (!this.filter.lowPassFilter(actual.lpFreq)) {
			 // If filter already present fade to target frequency
			 this.filter.fadeToLPFrequency(actual.lpFreq, 2);
		 }
	 } else {
		 this.filter.removeLowPassFilter();
	 }
	 if (actual.distortion) {
		 if (!this.distortion.addDistortion(actual.distAmount)) {
			 // If distortion already present, change amount value
			 this.distortion.setDistAmount(actual.distAmount);
		 }
	 } else {
		 this.distortion.removeDistortion();
	 }
	 // Reverb is independent
	 if (actual.reverb) {
		 if (!this.addReverb(rvb, actual.wetGain)) {
			 // If reverb already present change wet gain
			 this.setWetGain(actual.wetGain);
		 }
	 } else {
		 this.fadeOutReverb(1.5);
	 }
	 this.dLog && console.log(`Effect chain set [ID: ${this.index}]`);
 };


// *********************************************************
// *********************************************************
/** FILTER
 * @param {Object} AudioContext
 *			WebAudio Context of current application
 *
 * @param {Object} parentNode
 *			parent audio AudioNode
 **/
function Filter(audioContext, parentNode) {
	'use strict';
	this.context = audioContext;
	this.parent = parentNode;
	this.dryGain = '';
	this.LPfilter = '';
	this.LPfiltered = false;
	this.fading = false;
}

/**
 * @param {Number} freq
 *			Cut frequency in Hz
 *
 * @returns {Boolean}
 *			True if filter added / Flase if already present
 **/
Filter.prototype.lowPassFilter = function (freq) {
		if (freq < 40) {
			freq = 40;
			this.parent.dLog && console.warn('Cannot set filter freq under 40 Hz');
		} else if (freq > this.context.sampleRate/2) {
			freq = this.context.sampleRate/2;
			this.parent.dLog && console.warn('Cannot set filter freq over Nyquist limit');
		}
		if (!this.LPfiltered) {
			// create createBiquadFilter if not yet done
			if (this.LPfilter === '') {
				this.LPfilter = this.context.createBiquadFilter();
				this.LPfilter.type = 'lowpass';
			}
			// Set frequency
			this.LPfilter.frequency.setTargetAtTime(freq, this.context.currentTime, 0.5);
			this.dryGain = this.context.createGain();
			this.dryGain.gain.setTargetAtTime(1, this.context.currentTime, 0.5);
			var d = this.parent.distortion.distorted;
			var b = this.parent.binauralizator.binauralized;
			// Do right connections
			if (d) {
				// Insert between master gain and distortion
				this.parent.masterGain.disconnect(this.parent.distortion.distNode);
				this.dryGain.connect(this.parent.distortion.distNode);
			} else if (b) {
				// Insert between master gain and binaural
				this.parent.masterGain.disconnect(this.parent.binauralizator.binauralFIRNode.input);
				this.dryGain.connect(this.parent.binauralizator.binauralFIRNode.input);
			} else {
				// Insert between master and destination
				this.parent.masterGain.disconnect(this.context.destination);
				this.dryGain.connect(this.context.destination);
			}
			// Connect filter
			this.LPfilter.connect(this.dryGain);
			this.parent.masterGain.connect(this.LPfilter);
			this.LPfiltered = true;
			return true;
		} else {
			this.parent.dLog && console.warn(`Sound already filterd [ID: ${this.parent.index}]`);
			return false;
		}
};

/**
 * @param {Number} freq
 *			Cut frequency in Hz
 *
 * @param {Booleand} force
 *			If true, force set even if already fading
 *
 **/
Filter.prototype.setLPFrequency = function (freq, force) {
	if (freq < 40) {
		freq = 40;
		this.parent.dLog && console.warn('Cannot set filter freq under 40 Hz');
	} else if (freq > this.context.sampleRate/2) {
		freq = this.context.sampleRate/2;
		this.parent.dLog && console.warn('Cannot set filter freq over Nyquist limit');
	}
	if (this.LPfiltered) {
		if (!this.fading) {
			this.LPfilter.frequency.setTargetAtTime(freq, this.context.currentTime, 0.5);
		} else if (force) {
			this.fadeToLPFrequency(freq, 1);
		} else {
			this.parent.dLog && console.warn(`Impossible to set LPF freq. Filter freq is fading [ID: ${this.parent.index}]`);
		}
	} else {
		this.parent.dLog && console.warn(`Use lowPassFilter() before trying to set frequency [ID: ${this.parent.index}]`);
	}
};

/**
 * @param {Number} freq
 *			Cut frequency in Hz
 **/
Filter.prototype.fadeToLPFrequency = function (freq, fadeTime) {
	const self = this;
	if (freq < 40) {
		freq = 40;
		self.parent.dLog && console.warn(`Cannot fade filter freq under 40 Hz [ID: ${self.parent.index}]`);
	} else if (freq > self.context.sampleRate/2) {
		freq = self.context.sampleRate/2;
		self.parent.dLog && console.warn(`Cannot fade filter freq over Nyquist limit [ID: ${self.parent.index}]`);
	}
	if (!fadeTime) {
		self.parent.dLog && console.warn(`Missing argument fadeTime. Set to 1 second [ID: ${self.parent.index}]`);
		fadeTime = 1;
	}
	if (self.LPfiltered) {
		if (self.fading) {
			// If already fading reset fade
			self.LPfilter.frequency.cancelScheduledValues(self.context.currentTime);
			clearTimeout(self.flagReset);
		}
		self.LPfilter.frequency.setValueAtTime(self.LPfilter.frequency.value, self.context.currentTime);
		self.LPfilter.frequency.exponentialRampToValueAtTime(freq, self.context.currentTime + fadeTime);
		self.fading = true;
		self.flagReset = setTimeout(function () {
			self.fading = false;
			self.parent.dLog && console.log(`Freq fade finished`);
		}, fadeTime * 1000);
		// } else {
		// 	self.parent.dLog && console.warn(`fadeToLPFrequency() called while already fading [ID: ${self.parent.index}]`);
		// }
	} else {
		self.parent.dLog && console.warn(`Use lowPassFilter() before trying to fade frequency [ID: ${self.parent.index}]`);
	}
};

/**
 *
 * @param {Number} dgain
 *			Gain value of dry signal
 **/
Filter.prototype.setDryGain = function (dgain) {
		if (this.LPfiltered) {
			this.dryGain.gain.setTargetAtTime(dgain, this.context.currentTime, 0.5);
		} else {
			this.parent.dLog && console.warn(`Use lowPassFilter() before trying to adjust dry gain [ID: ${this.parent.index}]`);
		}
};

/**
 *
 * @returns {Number}
 *			Cut frequenct in Hz
 **/
Filter.prototype.getLPFrequency = function () {
		if (this.LPfiltered) {
			return this.LPfilter.frequency.value;
		} else {
			this.parent.dLog && console.warn(`Sound not filtered. Returning 0. [ID: ${this.parent.index}]`);
			return 0;
		}
};

/**
 *
 * @returns {Boolean}
 *			True if filter removed / False if not
 **/
Filter.prototype.removeLowPassFilter = function () {
		if (this.LPfiltered) {
			// Disconnect filter
			this.parent.masterGain.disconnect(this.LPfilter);
			this.LPfilter.disconnect();
			var d = this.parent.distortion.distorted;
			var b = this.parent.binauralizator.binauralized;
			// Redo connections
			if (d) {
				this.parent.masterGain.connect(this.parent.distortion.distNode);
			} else if (b) {
				this.parent.masterGain.connect(this.parent.binauralizator.binauralFIRNode.input);
			} else {
				this.parent.masterGain.connect(this.context.destination);
			}
			this.LPfiltered = false;
			return true;
		} else {
			this.parent.dLog && console.warn(`Cannot remove LPfilter. Sound not filtered [ID: ${this.parent.index}]`);
			return false;
		}
};


// *********************************************************
// *********************************************************
/** BINAURALIZATOR
 * @param {Object} AudioContext
 *			WebAudio Context of current application
 * @param {Object} parentNode
 *			parent audio AudioNode
 **/
 function Binauralizator(audioContext, parentNode) {
	 this.context = audioContext;
	 this.parent = parentNode;
	 this.binauralFIRNode = '';
	 this.binauralized = false;
 }

 Binauralizator.prototype.setHrtf = function () {
	 for (var i = 0; i < hrtfs.length; i++) {
		 var buffer = this.context.createBuffer(2, 512, this.context.sampleRate);
		 var bufferChannelLeft = buffer.getChannelData(0);
		 var bufferChannelRight = buffer.getChannelData(1);
		 for (var e = 0; e < hrtfs[i].fir_coeffs_left.length; e++) {
			 bufferChannelLeft[e] = hrtfs[i].fir_coeffs_left[e];
			 bufferChannelRight[e] = hrtfs[i].fir_coeffs_right[e];
		 }
		 hrtfs[i].buffer = buffer;
	 }
	 this.binauralFIRNode.HRTFDataset = hrtfs;
 };

 /**
  *
  * @returns {Boolean}
  *			True if binaural added / False if already present
  **/
Binauralizator.prototype.makeBinaural = function () {
	if (this.parent instanceof StreamSound || this.parent instanceof BufferedSound) {
		if (!this.binauralized) {
			// create convolver node
			this.binauralFIRNode = new BinauralFIR({
				audioContext: this.context
			});
			this.setHrtf();
			var f = this.parent.filter.LPfiltered;
			var d = this.parent.distortion.distorted;
			// Do connections
			if (d) {
				this.parent.distortion.distNode.disconnect(this.context.destination);
				this.parent.distortion.distNode.connect(this.binauralFIRNode.input);
			} else if (f) {
				this.parent.filter.dryGain.disconnect(this.context.destination);
				this.parent.filter.dryGain.connect(this.binauralFIRNode.input);
			} else {
				this.parent.masterGain.disconnect(this.context.destination);
				this.parent.masterGain.connect(this.binauralFIRNode.input);
			}
			this.binauralFIRNode.connect(this.context.destination);
			this.binauralFIRNode.setPosition(0, 0, 1);
			this.binauralized = true;
			return true;
		} else {
			this.parent.dLog && console.warn(`Binaural already active [ID: ${this.parent.index}]`);
			return false;
		}
	} else {
		this.parent.dLog && console.error('ERROR: wrong sound type in Binauralizator');
	}
};

/**
 *
 * @returns {Boolean}
 *			True if binaural removed / False if not present
 **/
Binauralizator.prototype.removeBinaural = function () {
	if (this.binauralized) {
		this.binauralFIRNode.disconnect(this.context.destination);
		var f = this.parent.filter.LPfiltered;
		var d = this.parent.distortion.distorted;
		if (d) {
			this.parent.distortion.distNode.disconnect(this.binauralFIRNode.input);
			this.parent.distortion.distNode.connect(this.context.destination);
		} else if (f) {
			this.parent.filter.dryGain.disconnect(this.binauralFIRNode.input);
			this.parent.filter.dryGain.connect(this.context.destination);
		} else {
			this.parent.masterGain.disconnect(this.binauralFIRNode.input);
			this.parent.masterGain.connect(this.context.destination);
		}
		this.binauralized = false;
		return true;
	} else {
		this.parent.dLog && console.warn(`Cannot remove binaural because is not present [ID: ${this.parent.index}]`);
		return false;
	}
};

Binauralizator.prototype.setPosition  = function (azimuth) {
	if (this.binauralized) {
		this.binauralFIRNode.setPosition(azimuth, 0, 1);
	} else {
		this.parent.dLog && console.warn(`Cannot set binaural position because is not binauralized [ID: ${this.parent.index}]`);
	}
};

Binauralizator.prototype.getPosition  = function () {
	if (this.binauralized) {
		return this.binauralFIRNode.getPosition().azimuth;
	} else {
		this.parent.dLog && console.warn(`Sound not binauralized. Returning 0. [ID: ${this.parent.index}]`);
		return 0;
	}
};

// *********************************************************
// *********************************************************
/** DISTORTION
 * @param {Object} AudioContext
 *			WebAudio Context of current application
 * @param {Object} parentNode
 *			parent audio AudioNode
 **/
 function Distortion(audioContext, parentNode) {
	 this.context = audioContext;
	 this.parent = parentNode;
	 this.distNode = '';
	 this.distorted = false;
 }

/**
 * @param {Number} amount
 *			Can basically be any positive number,
 *      but I've found that 0 - 100 is a pretty
 *      good range depending on how much distortion you need.
 *
 * REFERENCE: http://stackoverflow.com/a/22313408/1090298
 **/
 Distortion.prototype.makeDistortionCurve = function (amount) {
    var k = typeof amount === 'number' ? amount : 50,
        n_samples = 44100,
        curve = new Float32Array(n_samples),
        deg = Math.PI / 180,
        i = 0,
        x;
    for ( ; i < n_samples; ++i ) {
        x = i * 2 / n_samples - 1;
        curve[i] = ( 3 + k ) * x * 20 * deg /
            (Math.PI + k * Math.abs(x));
    }
    return curve;
}

/**
 *
 * @param {Number} amount
 *			Amount of distortion
 *
 * @returns {Boolean}
 *			True if dist added / False if already present
 **/
Distortion.prototype.addDistortion = function (amount) {
	if (amount > 500) {
		this.dLog && console.warn('Distortion amount cannot be more than 500');
		amount = 500;
	} else if (amount < 0) {
		this.dLog && console.warn('Distortion amount cannot be lower than 0');
		amount = 0;
	}
	if (!this.distorted) {
		this.distNode = this.context.createWaveShaper();
		this.distNode.curve = this.makeDistortionCurve(amount);
		// Do connections
		var f = this.parent.filter.LPfiltered;
		var b = this.parent.binauralizator.binauralized;
		if (f && b) {
			// Filtered and binauralized
			this.parent.filter.dryGain.disconnect(this.parent.binauralizator.binauralFIRNode.input);
			this.parent.filter.dryGain.connect(this.distNode);
			this.distNode.connect(this.parent.binauralizator.binauralFIRNode.input);
		} else if (!f && !b) {
			// Not filtered and not binauralized
			this.parent.masterGain.disconnect(this.context.destination);
			this.parent.masterGain.connect(this.distNode);
			this.distNode.connect(this.context.destination);
		} else if (f) {
			// Filtered and not binauralized
			this.parent.filter.dryGain.disconnect(this.context.destination);
			this.parent.filter.dryGain.connect(this.distNode);
			this.distNode.connect(this.context.destination);
		} else {
			// Not filtered and binauralized
			this.parent.masterGain.disconnect(this.parent.binauralizator.binauralFIRNode.input);
			this.parent.masterGain.connect(this.distNode);
			this.distNode.connect(this.parent.binauralizator.binauralFIRNode.input);
		}
		this.distorted = true;
		return true;
	} else {
		this.parent.dLog && console.warn(`Sound already distorted [ID: ${this.parent.index}]`);
		return false;
	}
};

/**
 *
 * @param {Number} amount
 *			Amount of distortion
 *
 **/
Distortion.prototype.setDistAmount = function (amount) {
	if (amount > 500) {
		this.dLog && console.warn('Distortion amount cannot be more than 500');
		amount = 500;
	} else if (amount < 0) {
		this.dLog && console.warn('Distortion amount cannot be lower than 0');
		amount = 0;
	}
	if (this.distorted) {
		this.distNode.curve = this.makeDistortionCurve(amount);
	} else {
		this.parent.dLog && console.warn(`Sound not distorted. Cannot set amount. [ID: ${this.parent.index}]`);
	}
};

/**
 *
 * @returns {Boolean}
 *			True if dist removed / False if not
 **/
Distortion.prototype.removeDistortion = function () {
	if (this.distorted) {
		var f = this.parent.filter.LPfiltered;
		var b = this.parent.binauralizator.binauralized;
		this.distNode.disconnect();
		if (f && b) {
			// Filtered and binauralized
			this.parent.filter.dryGain.disconnect(this.distNode);
			this.parent.filter.dryGain.connect(this.parent.binauralizator.binauralFIRNode.input);
		} else if (!f && !b) {
			// Not filtered and not binauralized
			this.parent.masterGain.disconnect(this.distNode);
			this.parent.masterGain.connect(this.context.destination);
		} else if (f) {
			// Filtered and not binauralized
			this.parent.filter.dryGain.disconnect(this.distNode);
			this.parent.filter.dryGain.connect(this.context.destination);
		} else {
			// Not filtered and binauralized
			this.parent.masterGain.disconnect(this.distNode);
			this.parent.masterGain.connect(this.parent.binauralizator.binauralFIRNode.input);
		}
		this.distorted = false;
		return true;
	} else {
		this.parent.dLog && console.warn(`Sound not distorted [ID: ${this.parent.index}]`);
		return false;
	}
};


// *********************************************************
// *********************************************************
/** REVERBERATOR
 * @param {Object} AudioContext
 *			WebAudio Context of current application
 **/
function Reverberator(audioContext) {
	'use strict';
	this.context = audioContext;
	this.seconds = 1; // TEMP hard coded
	this.decay = 2; // TEMP hard coded
	this.convolver = '';
	this.reverbImpulseURL = '../shared_media/audio/reverb-impulse/AbernyteGrainSilo.m4a';
	this.init();
}

Reverberator.prototype.init = function () {
	const self = this;
	// Reverb method 1
	self.convolver = self.context.createConvolver();
	self.convolver.buffer = self.buildImpulse();
	self.convolver.connect(self.context.destination);
	// Reverb method 2
	// self.convolver = self.context.createReverbFromUrl(self.reverbImpulseURL, function () {
	// 	self.convolver.connect(self.context.destination);
	// });
	console.log('reverb init');
};

Reverberator.prototype.disconnectReverb = function () {
	this.convolver.disconnect();
};

/**
 * @returns {Object} WebAudioAPI buffer
 *			A buffer with impulse for convolution reverb
 **/
Reverberator.prototype.buildImpulse = function () {
  var rate = this.context.sampleRate;
  var length = rate * this.seconds;
  var impulse = this.context.createBuffer(2, length, rate);
  var impulseL = impulse.getChannelData(0);
  var impulseR = impulse.getChannelData(1);
  for (var i = 0; i < length; i++) {
    impulseL[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, this.decay);
    impulseR[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, this.decay);
  }
  return impulse;
};
