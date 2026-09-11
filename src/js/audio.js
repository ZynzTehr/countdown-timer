/**
 * Web Audio API Mechanical Flip Synthesizer
 * Generates a crisp, rich tactile flip tick sound effect.
 * Unlocks automatically on first user gesture to comply with browser autoplay policies.
 */

class FlipAudioEngine {
  constructor() {
    this.audioCtx = null;
    this.enabled = true;
    this.isUnlocked = false;
    this.volume = 0.6;

    this.bindUnlockListeners();
  }

  init() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
  }

  bindUnlockListeners() {
    const unlock = () => {
      this.init();
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().then(() => {
          this.isUnlocked = true;
        });
      } else if (this.audioCtx && this.audioCtx.state === 'running') {
        this.isUnlocked = true;
      }
    };

    ['click', 'touchstart', 'keydown', 'pointerdown'].forEach((evt) => {
      window.addEventListener(evt, unlock, { capture: true });
    });
  }

  playFlipTick() {
    if (!this.enabled) return;

    try {
      this.init();
      if (!this.audioCtx) return;

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const now = this.audioCtx.currentTime;

      // Master Gain for volume control
      const masterGain = this.audioCtx.createGain();
      masterGain.gain.setValueAtTime(this.volume, now);
      masterGain.connect(this.audioCtx.destination);

      // Layer 1: Percussive Mechanical Tone (Pitch drop)
      const osc = this.audioCtx.createOscillator();
      const oscGain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(950, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.045);

      oscGain.gain.setValueAtTime(0.6, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

      osc.connect(oscGain);
      oscGain.connect(masterGain);

      osc.start(now);
      osc.stop(now + 0.045);

      // Layer 2: Crisp Mechanical Snap Noise
      const bufferSize = Math.floor(this.audioCtx.sampleRate * 0.03); // 30ms noise
      const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
      }

      const noise = this.audioCtx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2200, now);
      filter.Q.setValueAtTime(2.5, now);

      const noiseGain = this.audioCtx.createGain();
      noiseGain.gain.setValueAtTime(0.4, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(masterGain);

      noise.start(now);
      noise.stop(now + 0.03);

    } catch (e) {
      // Audio autoplay policy edge case fallback
    }
  }

  toggleSound(enable = null) {
    this.enabled = enable !== null ? enable : !this.enabled;
    return this.enabled;
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
  }
}

export const flipAudio = new FlipAudioEngine();
