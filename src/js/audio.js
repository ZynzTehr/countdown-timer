/**
 * Ambient Nature Audio Synthesizer (Web Audio API)
 * Generates soothing mountain breeze, forest bird calls, night crickets,
 * and gentle rain/snow weather ambiances without external sound files.
 */

class NatureAmbienceEngine {
  constructor() {
    this.audioCtx = null;
    this.enabled = true;
    this.isUnlocked = false;
    this.masterVolume = 0.55;
    this.weather = 'clear'; // 'clear', 'rain', 'snow'
    this.phase = 'day'; // 'dawn', 'day', 'dusk', 'night'

    // Audio nodes
    this.masterGain = null;
    this.windGain = null;
    this.rainGain = null;
    this.cricketGain = null;

    // Timers
    this.birdTimer = null;
    this.windModInterval = null;

    this.bindUnlockListeners();
  }

  init() {
    if (this.audioCtx) return;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    this.audioCtx = new AudioContextClass();

    // Master volume node
    this.masterGain = this.audioCtx.createGain();
    this.masterGain.gain.setValueAtTime(this.enabled ? this.masterVolume : 0, this.audioCtx.currentTime);
    this.masterGain.connect(this.audioCtx.destination);

    // 1. Wind & Breeze generator
    this.setupWind();

    // 2. Rain ambient generator
    this.setupRain();

    // 3. Night crickets — DISABLED
    // this.setupCrickets();

    // 4. Schedule periodic bird chirps
    this.scheduleNextBird();
  }

  bindUnlockListeners() {
    const unlock = () => {
      this.init();
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().then(() => {
          this.isUnlocked = true;
          this.updateGains();
        });
      } else if (this.audioCtx && this.audioCtx.state === 'running') {
        this.isUnlocked = true;
        this.updateGains();
      }
    };

    ['click', 'touchstart', 'keydown', 'pointerdown'].forEach((evt) => {
      window.addEventListener(evt, unlock, { capture: true });
    });
  }

  /**
   * Continuous soothing mountain wind using filtered pink/brown noise
   */
  setupWind() {
    const bufferSize = this.audioCtx.sampleRate * 4; // 4 second loop
    const noiseBuffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    // Generate brown noise for warm, deep rushing breeze
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5; // Gain compensation
    }

    const whiteNoise = this.audioCtx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    // Resonant low-pass filter to simulate wind through pine trees
    const windFilter = this.audioCtx.createBiquadFilter();
    windFilter.type = 'lowpass';
    windFilter.frequency.setValueAtTime(320, this.audioCtx.currentTime);
    windFilter.Q.setValueAtTime(2.2, this.audioCtx.currentTime);

    this.windGain = this.audioCtx.createGain();
    this.windGain.gain.setValueAtTime(0.35, this.audioCtx.currentTime);

    whiteNoise.connect(windFilter);
    windFilter.connect(this.windGain);
    this.windGain.connect(this.masterGain);

    whiteNoise.start();

    // Subtle wind swell modulation
    this.windModInterval = setInterval(() => {
      if (!this.audioCtx || this.audioCtx.state !== 'running') return;
      const now = this.audioCtx.currentTime;
      const targetFreq = 220 + Math.random() * 320;
      const targetGain = 0.22 + Math.random() * 0.28;
      windFilter.frequency.exponentialRampToValueAtTime(Math.max(100, targetFreq), now + 3.5);
      this.windGain.gain.linearRampToValueAtTime(targetGain, now + 3.5);
    }, 4000);
  }

  /**
   * Soothing rain sound using high-pass / band-pass noise
   */
  setupRain() {
    const bufferSize = this.audioCtx.sampleRate * 3;
    const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const rainSource = this.audioCtx.createBufferSource();
    rainSource.buffer = buffer;
    rainSource.loop = true;

    const rainFilter = this.audioCtx.createBiquadFilter();
    rainFilter.type = 'bandpass';
    rainFilter.frequency.setValueAtTime(1400, this.audioCtx.currentTime);
    rainFilter.Q.setValueAtTime(0.8, this.audioCtx.currentTime);

    this.rainGain = this.audioCtx.createGain();
    this.rainGain.gain.setValueAtTime(0, this.audioCtx.currentTime); // Off unless rainy

    rainSource.connect(rainFilter);
    rainFilter.connect(this.rainGain);
    this.rainGain.connect(this.masterGain);

    rainSource.start();
  }

  /**
   * Subtle night crickets using modulated sine waves
   */
  setupCrickets() {
    this.cricketGain = this.audioCtx.createGain();
    this.cricketGain.gain.setValueAtTime(0, this.audioCtx.currentTime);
    this.cricketGain.connect(this.masterGain);

    const osc1 = this.audioCtx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(4500, this.audioCtx.currentTime);

    // Tremolo LFO for cricket pulse
    const lfo = this.audioCtx.createOscillator();
    lfo.type = 'square';
    lfo.frequency.setValueAtTime(14, this.audioCtx.currentTime);

    const lfoGain = this.audioCtx.createGain();
    lfoGain.gain.setValueAtTime(0.12, this.audioCtx.currentTime);

    lfo.connect(lfoGain.gain);
    osc1.connect(lfoGain);
    lfoGain.connect(this.cricketGain);

    osc1.start();
    lfo.start();
  }

  /**
   * Synthesize gentle melodic forest bird chirps
   */
  playBirdChirp() {
    if (!this.audioCtx || this.audioCtx.state !== 'running' || !this.enabled) return;
    if (this.phase === 'night' || this.weather === 'rain') return; // Birds rest at night or in rain

    const now = this.audioCtx.currentTime;
    const baseFreq = 2600 + Math.random() * 1200;
    const chirpCount = Math.floor(Math.random() * 3) + 2;

    for (let i = 0; i < chirpCount; i++) {
      const chirpStart = now + i * (0.12 + Math.random() * 0.08);
      const chirpDur = 0.08 + Math.random() * 0.06;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      // Pitch glide up then down
      osc.frequency.setValueAtTime(baseFreq, chirpStart);
      osc.frequency.exponentialRampToValueAtTime(baseFreq + 700 + Math.random() * 600, chirpStart + chirpDur * 0.4);
      osc.frequency.exponentialRampToValueAtTime(baseFreq - 300, chirpStart + chirpDur);

      gain.gain.setValueAtTime(0.001, chirpStart);
      gain.gain.linearRampToValueAtTime(0.09, chirpStart + chirpDur * 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, chirpStart + chirpDur);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(chirpStart);
      osc.stop(chirpStart + chirpDur);
    }
  }

  scheduleNextBird() {
    // Schedule random chirp every 6 to 16 seconds
    const delay = (7 + Math.random() * 10) * 1000;
    this.birdTimer = setTimeout(() => {
      this.playBirdChirp();
      this.scheduleNextBird();
    }, delay);
  }

  /**
   * Update ambient balance based on day phase and weather
   */
  updateState(phase, weather) {
    this.phase = phase;
    this.weather = weather;
    this.updateGains();
  }

  updateGains() {
    if (!this.audioCtx || this.audioCtx.state !== 'running') return;
    const now = this.audioCtx.currentTime;

    // Rain gain
    if (this.rainGain) {
      const targetRain = this.weather === 'rain' ? 0.32 : 0;
      this.rainGain.gain.linearRampToValueAtTime(targetRain, now + 2);
    }

    // Cricket gain — DISABLED
    // if (this.cricketGain) {
    //   const targetCrickets = (this.phase === 'night' && this.weather !== 'rain') ? 0.07 : 0;
    //   this.cricketGain.gain.linearRampToValueAtTime(targetCrickets, now + 2);
    // }
  }

  /**
   * Toggle mute / unmute with smooth audio ramp
   */
  toggleSound(enable = null) {
    this.enabled = enable !== null ? enable : !this.enabled;

    this.init();
    if (this.audioCtx && this.masterGain) {
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      const now = this.audioCtx.currentTime;
      const target = this.enabled ? this.masterVolume : 0;
      this.masterGain.gain.linearRampToValueAtTime(target, now + 0.3);
    }

    return this.enabled;
  }

  setVolume(vol) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    if (this.audioCtx && this.masterGain && this.enabled) {
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.audioCtx.currentTime);
    }
  }

  playFlipTick() {
    // Intentionally silent: replaced with soothing wind & birds
  }
}

export const ambientAudio = new NatureAmbienceEngine();
export const flipAudio = ambientAudio;
