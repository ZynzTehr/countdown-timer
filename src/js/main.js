/**
 * Main Application Logic
 */

import confetti from 'canvas-confetti';
import { calculateTimeRemaining } from './countdown.js';
import { FlipClockManager } from './flipCard.js';
import { flipAudio } from './audio.js';
import { ParticleBackground } from './particles.js';
import { getPresetEvents, formatDateForInput } from './presets.js';

class CountdownApp {
  constructor() {
    this.targetDate = null;
    this.eventName = 'New Year 2027';
    this.showLeadingZeros = true;
    this.soundEnabled = true;
    this.timerId = null;
    this.hasCelebrated = false;

    this.initElements();
    this.initParticleBg();
    this.initClockManager();
    this.loadState();
    this.initPresets();
    this.bindEvents();
    this.startTimer();
  }

  initElements() {
    this.clockGridElem = document.getElementById('flip-clock-grid');
    this.targetEventNameElem = document.getElementById('target-event-name');
    this.targetStatusElem = document.getElementById('target-status');

    // Completion Banner elements
    this.completionBanner = document.getElementById('completion-banner');
    this.completionTitle = document.getElementById('completion-title');
    this.completionSubtitle = document.getElementById('completion-subtitle');
    this.btnCompletionReset = document.getElementById('btn-completion-reset');

    // Modal & Control elements
    this.settingsModal = document.getElementById('settings-modal');
    this.btnOpenSettings = document.getElementById('btn-open-settings');
    this.btnCloseSettings = document.getElementById('btn-close-settings');
    this.btnSaveSettings = document.getElementById('btn-save-settings');
    this.btnSoundToggle = document.getElementById('btn-sound-toggle');
    this.soundIcon = document.getElementById('sound-icon');

    // Inputs
    this.inputEventName = document.getElementById('input-event-name');
    this.inputTargetDate = document.getElementById('input-target-date');
    this.inputLeadingZeros = document.getElementById('input-leading-zeros');
    this.inputSoundToggle = document.getElementById('input-sound-toggle');
    this.presetContainer = document.getElementById('preset-pills-container');
  }

  initParticleBg() {
    const canvasElem = document.getElementById('particle-canvas');
    if (canvasElem) {
      this.particleBg = new ParticleBackground(canvasElem);
    }
  }

  initClockManager() {
    this.clockManager = new FlipClockManager(
      this.clockGridElem,
      () => flipAudio.playFlipTick()
    );
  }

  loadState() {
    const savedEvent = localStorage.getItem('countdown_event_name');
    const savedDate = localStorage.getItem('countdown_target_date');
    const savedZeros = localStorage.getItem('countdown_leading_zeros');
    const savedSound = localStorage.getItem('countdown_sound_enabled');

    if (savedEvent) this.eventName = savedEvent;
    if (savedZeros !== null) this.showLeadingZeros = savedZeros === 'true';
    if (savedSound !== null) {
      this.soundEnabled = savedSound === 'true';
      flipAudio.toggleSound(this.soundEnabled);
    }

    if (savedDate) {
      this.targetDate = new Date(savedDate);
    } else {
      const presets = getPresetEvents();
      this.targetDate = presets[0].date;
    }

    this.updateHeaderUI();
  }

  saveState() {
    localStorage.setItem('countdown_event_name', this.eventName);
    localStorage.setItem('countdown_target_date', this.targetDate.toISOString());
    localStorage.setItem('countdown_leading_zeros', this.showLeadingZeros);
    localStorage.setItem('countdown_sound_enabled', this.soundEnabled);
  }

  initPresets() {
    const presets = getPresetEvents();
    this.presetContainer.innerHTML = '';

    presets.forEach((preset) => {
      const pill = document.createElement('button');
      pill.type = 'button';
      pill.className = 'pill';
      pill.textContent = preset.name;
      pill.addEventListener('click', (e) => {
        e.preventDefault();
        this.inputEventName.value = preset.name;
        this.inputTargetDate.value = formatDateForInput(preset.date);

        this.presetContainer.querySelectorAll('.pill').forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
      });
      this.presetContainer.appendChild(pill);
    });
  }

  bindEvents() {
    const openSettings = () => {
      this.inputEventName.value = this.eventName;
      this.inputTargetDate.value = formatDateForInput(this.targetDate);
      this.inputLeadingZeros.checked = this.showLeadingZeros;
      this.inputSoundToggle.checked = this.soundEnabled;
      this.settingsModal.classList.add('active');
    };

    this.btnOpenSettings.addEventListener('click', openSettings);
    if (this.btnCompletionReset) {
      this.btnCompletionReset.addEventListener('click', openSettings);
    }

    this.btnCloseSettings.addEventListener('click', () => {
      this.settingsModal.classList.remove('active');
    });

    this.settingsModal.addEventListener('click', (e) => {
      if (e.target === this.settingsModal) {
        this.settingsModal.classList.remove('active');
      }
    });

    this.btnSaveSettings.addEventListener('click', (e) => {
      e.preventDefault();
      const newName = this.inputEventName.value.trim() || 'Countdown Event';
      const newDateVal = this.inputTargetDate.value;

      if (newDateVal) {
        this.eventName = newName;
        this.targetDate = new Date(newDateVal);
        this.showLeadingZeros = this.inputLeadingZeros.checked;
        this.soundEnabled = this.inputSoundToggle.checked;

        flipAudio.toggleSound(this.soundEnabled);
        this.saveState();
        this.updateHeaderUI();
        this.hasCelebrated = false;
        if (this.completionBanner) {
          this.completionBanner.style.display = 'none';
        }
        this.tick();
      }

      this.settingsModal.classList.remove('active');
    });

    this.btnSoundToggle.addEventListener('click', () => {
      this.soundEnabled = flipAudio.toggleSound();
      this.updateSoundIcon();
      localStorage.setItem('countdown_sound_enabled', this.soundEnabled);
    });
  }

  updateHeaderUI() {
    if (this.targetEventNameElem) {
      this.targetEventNameElem.textContent = this.eventName;
    }
    this.updateSoundIcon();
  }

  updateSoundIcon() {
    if (this.soundEnabled) {
      this.btnSoundToggle.setAttribute('title', 'Sound On');
      this.btnSoundToggle.style.opacity = '1';
    } else {
      this.btnSoundToggle.setAttribute('title', 'Sound Muted');
      this.btnSoundToggle.style.opacity = '0.5';
    }
  }

  startTimer() {
    if (this.timerId) clearInterval(this.timerId);
    this.tick();
    this.timerId = setInterval(() => this.tick(), 1000);
  }

  tick() {
    if (!this.targetDate) return;

    const timeData = calculateTimeRemaining(this.targetDate);

    this.clockManager.setOptions({
      showLeadingZeros: this.showLeadingZeros
    });

    this.clockManager.update(timeData);

    if (timeData.isComplete) {
      this.targetStatusElem.textContent = `EVENT COMPLETED:`;
      if (this.completionBanner) {
        this.completionTitle.textContent = `${this.eventName} IS HERE!`;
        this.completionSubtitle.textContent = `The countdown reached absolute zero. Celebration time!`;
        this.completionBanner.style.display = 'flex';
      }

      if (!this.hasCelebrated) {
        this.triggerConfetti();
        this.hasCelebrated = true;
      }
    } else if (timeData.isPast) {
      this.targetStatusElem.textContent = `TIME SINCE EVENT:`;
      if (this.completionBanner) {
        this.completionBanner.style.display = 'none';
      }
    } else {
      this.targetStatusElem.textContent = `COUNTING DOWN TO:`;
      if (this.completionBanner) {
        this.completionBanner.style.display = 'none';
      }
    }
  }

  triggerConfetti() {
    const duration = 5 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 35, spread: 360, ticks: 80, zIndex: 999 };

    const interval = setInterval(function () {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 60 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: 0.2, y: 0.5 } });
      confetti({ ...defaults, particleCount, origin: { x: 0.8, y: 0.5 } });
    }, 250);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new CountdownApp();
});
