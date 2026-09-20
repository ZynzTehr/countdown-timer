/**
 * Main Application Logic
 */

import confetti from 'canvas-confetti';
import { calculateTimeRemaining } from './countdown.js';
import { FlipClockManager } from './flipCard.js';
import { ambientAudio } from './audio.js';
import { SceneRenderer } from './sceneRenderer.js';
import { getPresetEvents, formatDateForInput } from './presets.js';
import { setCycleConfig, setCycleFixedHour } from './dayCycle.js';

class CountdownApp {
  constructor() {
    this.targetDate = null;
    this.eventName = 'New Year 2027';
    this.showLeadingZeros = true;
    this.soundEnabled = true;
    this.currentCycleSpeed = '10';
    this.weatherMode = 'dynamic';
    this.moonMode = 'auto';
    this.seasonMode = 'auto';
    this.timerId = null;
    this.hasCelebrated = false;
    this.hoverTimeout = null;

    this.initElements();
    this.initScene();
    this.initClockManager();
    this.loadState();
    this.initPresets();
    this.bindEvents();
    this.initHoverControls();
    this.startTimer();
  }

  initElements() {
    this.clockGridElem = document.getElementById('flip-clock-grid');
    this.targetEventNameElem = document.getElementById('target-event-name');
    this.targetStatusElem = document.getElementById('target-status');
    this.floatingControls = document.getElementById('floating-controls');

    // Completion Banner elements
    this.completionBanner = document.getElementById('completion-banner');
    this.completionTitle = document.getElementById('completion-title');
    this.completionSubtitle = document.getElementById('completion-subtitle');
    this.btnCompletionReset = document.getElementById('btn-completion-reset');

    // Modal & Control elements
    this.settingsModal = document.getElementById('settings-modal');
    this.btnOpenSettings = document.getElementById('btn-open-settings');
    this.btnCloseSettings = document.getElementById('btn-close-settings');
    this.btnCancelSettings = document.getElementById('btn-cancel-settings');
    this.btnSaveSettings = document.getElementById('btn-save-settings');
    this.btnSoundToggle = document.getElementById('btn-sound-toggle');
    this.soundIcon = document.getElementById('sound-icon');

    // Inputs
    this.inputEventName = document.getElementById('input-event-name');
    this.inputTargetDate = document.getElementById('input-target-date');
    this.inputLeadingZeros = document.getElementById('input-leading-zeros');
    this.inputSoundToggle = document.getElementById('input-sound-toggle');
    this.inputSoundVolume = document.getElementById('input-sound-volume');
    this.volumeValBadge = document.getElementById('volume-val-badge');
    this.inputCycleSpeed = document.getElementById('input-cycle-speed');
    this.inputWeatherCondition = document.getElementById('input-weather-condition');
    this.inputMoonPhase = document.getElementById('input-moon-phase');
    this.inputSeason = document.getElementById('input-season');
    this.presetContainer = document.getElementById('preset-pills-container');
  }

  initScene() {
    const canvasElem = document.getElementById('scene-canvas');
    if (canvasElem) {
      this.sceneRenderer = new SceneRenderer(canvasElem);
    }
  }

  initHoverControls() {
    if (!this.floatingControls) return;

    const showControls = () => {
      this.floatingControls.classList.add('revealed');
      if (this.hoverTimeout) clearTimeout(this.hoverTimeout);
      this.hoverTimeout = setTimeout(() => {
        // Only hide if settings modal is not open
        if (!this.settingsModal.classList.contains('active')) {
          this.floatingControls.classList.remove('revealed');
        }
      }, 3500);
    };

    window.addEventListener('mousemove', (e) => {
      if (e.clientY < 110) {
        showControls();
      }
    });

    this.floatingControls.addEventListener('mouseenter', () => {
      this.floatingControls.classList.add('revealed');
      if (this.hoverTimeout) clearTimeout(this.hoverTimeout);
    });

    this.floatingControls.addEventListener('mouseleave', () => {
      if (!this.settingsModal.classList.contains('active')) {
        this.hoverTimeout = setTimeout(() => {
          this.floatingControls.classList.remove('revealed');
        }, 1500);
      }
    });

    // Touch support: tap near top to toggle
    window.addEventListener('touchstart', (e) => {
      if (e.touches[0].clientY < 120) {
        showControls();
      }
    }, { passive: true });
  }

  initClockManager() {
    // Mechanical flip ticks disabled in favor of soothing nature audio
    this.clockManager = new FlipClockManager(
      this.clockGridElem,
      null
    );
  }

  loadState() {
    const savedEvent = localStorage.getItem('countdown_event_name');
    const savedDate = localStorage.getItem('countdown_target_date');
    const savedZeros = localStorage.getItem('countdown_leading_zeros');
    const savedSound = localStorage.getItem('countdown_sound_enabled');
    const savedCycle = localStorage.getItem('countdown_cycle_speed') || '10';
    const savedWeather = localStorage.getItem('countdown_weather_mode') || 'dynamic';
    const savedMoon = localStorage.getItem('countdown_moon_mode') || 'auto';
    const savedSeason = localStorage.getItem('countdown_season_mode') || 'auto';

    if (savedEvent) this.eventName = savedEvent;
    if (savedZeros !== null) this.showLeadingZeros = savedZeros === 'true';
    if (savedSound !== null) {
      this.soundEnabled = savedSound === 'true';
      ambientAudio.toggleSound(this.soundEnabled);
    }

    const savedVol = localStorage.getItem('countdown_sound_volume');
    if (savedVol !== null) {
      const volFloat = parseFloat(savedVol);
      ambientAudio.setVolume(volFloat);
      if (this.inputSoundVolume) {
        this.inputSoundVolume.value = Math.round(volFloat * 100);
      }
      if (this.volumeValBadge) {
        this.volumeValBadge.textContent = `${Math.round(volFloat * 100)}%`;
      }
    }

    this.applyCycleSpeed(savedCycle);
    this.applyWeather(savedWeather);
    this.applyMoon(savedMoon);
    this.applySeason(savedSeason);

    if (savedDate) {
      const parsed = new Date(savedDate);
      this.targetDate = !isNaN(parsed.getTime()) ? parsed : getPresetEvents()[0].date;
    } else {
      const presets = getPresetEvents();
      this.targetDate = presets[0].date;
    }

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('hour')) {
      const h = parseFloat(urlParams.get('hour'));
      setCycleFixedHour(h);
    } else if (urlParams.has('phase')) {
      const p = urlParams.get('phase');
      const phaseMap = { dawn: 6.2, day: 12.0, dusk: 18.5, night: 22.0 };
      if (phaseMap[p] !== undefined) {
        setCycleFixedHour(phaseMap[p]);
      }
    }

    this.updateHeaderUI();
  }

  applyCycleSpeed(speed) {
    this.currentCycleSpeed = speed;
    if (speed === 'realtime') {
      setCycleConfig('realtime');
    } else {
      const mins = parseFloat(speed) || 10;
      setCycleConfig('loop', mins);
    }
  }

  applyWeather(mode) {
    this.weatherMode = mode;
    if (this.sceneRenderer) {
      this.sceneRenderer.setWeatherMode(mode);
    }
  }

  applyMoon(mode) {
    this.moonMode = mode;
    if (this.sceneRenderer) {
      this.sceneRenderer.setMoonMode(mode);
    }
  }

  applySeason(mode) {
    this.seasonMode = mode;
    if (this.sceneRenderer) {
      this.sceneRenderer.setSeasonMode(mode);
    }
  }

  saveState() {
    localStorage.setItem('countdown_event_name', this.eventName);
    const validDate = (this.targetDate instanceof Date && !isNaN(this.targetDate.getTime()))
      ? this.targetDate.toISOString()
      : getPresetEvents()[0].date.toISOString();
    localStorage.setItem('countdown_target_date', validDate);
    localStorage.setItem('countdown_leading_zeros', this.showLeadingZeros);
    localStorage.setItem('countdown_sound_enabled', this.soundEnabled);
    localStorage.setItem('countdown_cycle_speed', this.currentCycleSpeed);
    localStorage.setItem('countdown_weather_mode', this.weatherMode);
    localStorage.setItem('countdown_moon_mode', this.moonMode);
    localStorage.setItem('countdown_season_mode', this.seasonMode);
  }

  initPresets() {
    const presets = getPresetEvents();
    this.presetContainer.innerHTML = '';

    const presetIcons = {
      '15min': '⏳',
      '30min': '☕',
      'new-year': '🎆',
      'solstice': '☀️',
      'cosmic': '🌌',
      '100days': '🏔️'
    };

    presets.forEach((preset) => {
      const pill = document.createElement('button');
      pill.type = 'button';
      pill.className = 'pill';
      const icon = presetIcons[preset.id] || '✨';
      pill.innerHTML = `<span>${icon}</span><span>${preset.name}</span>`;
      pill.addEventListener('click', (e) => {
        e.preventDefault();
        let targetPresetDate = preset.date;

        // Recompute relative quick timers at moment of click
        if (preset.id === '15min') {
          targetPresetDate = new Date(Date.now() + 15 * 60 * 1000);
        } else if (preset.id === '30min') {
          targetPresetDate = new Date(Date.now() + 30 * 60 * 1000);
        }

        this.inputEventName.value = preset.name;
        this.inputTargetDate.value = formatDateForInput(targetPresetDate);

        this.presetContainer.querySelectorAll('.pill').forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
      });
      this.presetContainer.appendChild(pill);
    });
  }

  initStudioUI() {
    // Studio Tabs
    const tabs = document.querySelectorAll('.studio-tab');
    const panels = document.querySelectorAll('.studio-tab-panel');

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const targetId = tab.getAttribute('data-tab');
        tabs.forEach((t) => t.classList.remove('active'));
        panels.forEach((p) => p.classList.remove('active'));

        tab.classList.add('active');
        const panel = document.getElementById(targetId);
        if (panel) panel.classList.add('active');
      });
    });

    // Choice Cards Grid selection with IMMEDIATE live background preview
    document.querySelectorAll('.choice-cards-grid').forEach((grid) => {
      const syncSelectId = grid.getAttribute('data-sync');
      const selectElem = document.getElementById(syncSelectId);
      const cards = grid.querySelectorAll('.choice-card');

      cards.forEach((card) => {
        card.addEventListener('click', () => {
          const val = card.getAttribute('data-val');
          cards.forEach((c) => c.classList.remove('active'));
          card.classList.add('active');
          if (selectElem) {
            selectElem.value = val;
            selectElem.dispatchEvent(new Event('change'));
          }

          // Instant Live Background Preview behind frosted glass
          if (syncSelectId === 'input-moon-phase') {
            this.applyMoon(val);
          } else if (syncSelectId === 'input-weather-condition') {
            this.applyWeather(val);
          } else if (syncSelectId === 'input-cycle-speed') {
            this.applyCycleSpeed(val);
          } else if (syncSelectId === 'input-season') {
            this.applySeason(val);
          }
        });
      });
    });

    // Volume Slider Live Preview & Audio Control
    if (this.inputSoundVolume) {
      this.inputSoundVolume.addEventListener('input', (e) => {
        const vol = parseInt(e.target.value, 10) / 100;
        ambientAudio.setVolume(vol);
        if (this.volumeValBadge) {
          this.volumeValBadge.textContent = `${Math.round(vol * 100)}%`;
        }
        localStorage.setItem('countdown_sound_volume', vol);
      });
    }

    // Preferences Sound Toggle Live preview
    if (this.inputSoundToggle) {
      this.inputSoundToggle.addEventListener('change', (e) => {
        this.soundEnabled = e.target.checked;
        ambientAudio.toggleSound(this.soundEnabled);
        if (this.soundIcon) {
          this.soundIcon.textContent = this.soundEnabled ? '🔊' : '🔇';
        }
      });
    }

    // Cancel Button
    if (this.btnCancelSettings) {
      this.btnCancelSettings.addEventListener('click', () => {
        this.settingsModal.classList.remove('active');
      });
    }

    // Global keyboard hotkeys & dev helpers
    window.setHour = (h) => setCycleFixedHour(h);
    window.setPhase = (name) => {
      if (name === 'dawn') setCycleFixedHour(6.2);
      else if (name === 'day') setCycleFixedHour(12.5);
      else if (name === 'dusk') setCycleFixedHour(18.2);
      else if (name === 'night') setCycleFixedHour(23.5);
      else setCycleFixedHour(null);
    };

    // Keyboard controls
    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if (e.key === 'Escape' && this.settingsModal && this.settingsModal.classList.contains('active')) {
        this.settingsModal.classList.remove('active');
      } else if (e.key === '1') {
        setCycleFixedHour(6.2); // Dawn
      } else if (e.key === '2') {
        setCycleFixedHour(12.5); // Day
      } else if (e.key === '3') {
        setCycleFixedHour(18.2); // Dusk
      } else if (e.key === '4') {
        setCycleFixedHour(23.5); // Night
      } else if (e.key === '0') {
        setCycleFixedHour(null); // Auto continuous loop
      }
    });
  }

  syncChoiceCardsWithSelects() {
    document.querySelectorAll('.choice-cards-grid').forEach((grid) => {
      const syncSelectId = grid.getAttribute('data-sync');
      const selectElem = document.getElementById(syncSelectId);
      if (!selectElem) return;

      const currentVal = selectElem.value;
      const cards = grid.querySelectorAll('.choice-card');
      cards.forEach((c) => {
        if (c.getAttribute('data-val') === currentVal) {
          c.classList.add('active');
        } else {
          c.classList.remove('active');
        }
      });
    });
  }

  bindEvents() {
    this.initStudioUI();

    const openSettings = () => {
      this.inputEventName.value = this.eventName;
      this.inputTargetDate.value = formatDateForInput(this.targetDate);
      this.inputLeadingZeros.checked = this.showLeadingZeros;
      this.inputSoundToggle.checked = this.soundEnabled;
      if (this.inputSoundVolume) {
        this.inputSoundVolume.value = Math.round(ambientAudio.masterVolume * 100);
      }
      if (this.volumeValBadge) {
        this.volumeValBadge.textContent = `${Math.round(ambientAudio.masterVolume * 100)}%`;
      }
      if (this.inputCycleSpeed) {
        this.inputCycleSpeed.value = this.currentCycleSpeed;
      }
      if (this.inputWeatherCondition) {
        this.inputWeatherCondition.value = this.weatherMode;
      }
      if (this.inputMoonPhase) {
        this.inputMoonPhase.value = this.moonMode;
      }
      if (this.inputSeason) {
        this.inputSeason.value = this.seasonMode;
      }
      this.syncChoiceCardsWithSelects();
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
        const parsed = new Date(newDateVal);
        this.eventName = newName;
        this.targetDate = !isNaN(parsed.getTime()) ? parsed : getPresetEvents()[0].date;
        this.showLeadingZeros = this.inputLeadingZeros.checked;
        this.soundEnabled = this.inputSoundToggle.checked;

        if (this.inputCycleSpeed) {
          this.applyCycleSpeed(this.inputCycleSpeed.value);
        }

        if (this.inputWeatherCondition) {
          this.applyWeather(this.inputWeatherCondition.value);
        }

        if (this.inputMoonPhase) {
          this.applyMoon(this.inputMoonPhase.value);
        }

        if (this.inputSeason) {
          this.applySeason(this.inputSeason.value);
        }

        ambientAudio.toggleSound(this.soundEnabled);
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
      this.soundEnabled = ambientAudio.toggleSound();
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
      this.btnSoundToggle.setAttribute('title', 'Soothing Nature Sound: On');
      this.btnSoundToggle.style.opacity = '1';
    } else {
      this.btnSoundToggle.setAttribute('title', 'Soothing Nature Sound: Muted');
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

// URL Query Parameter testing support (?hour=6.2, ?phase=dawn)
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.has('hour')) {
  const h = parseFloat(urlParams.get('hour'));
  setCycleFixedHour(h);
} else if (urlParams.has('phase')) {
  const p = urlParams.get('phase');
  const phaseMap = { dawn: 6.2, day: 12.0, dusk: 18.5, night: 22.0 };
  if (phaseMap[p] !== undefined) {
    setCycleFixedHour(phaseMap[p]);
  }
}

// Global hotkeys for testing: 1=Dawn, 2=Day, 3=Dusk, 4=Night, 0=Loop
window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
  if (e.key === '1') setCycleFixedHour(6.2);
  else if (e.key === '2') setCycleFixedHour(12.0);
  else if (e.key === '3') setCycleFixedHour(18.5);
  else if (e.key === '4') setCycleFixedHour(22.0);
  else if (e.key === '0') setCycleFixedHour(null);
});

window.setHour = (h) => setCycleFixedHour(h);
window.setPhase = (phase) => {
  const phaseMap = { dawn: 6.2, day: 12.0, dusk: 18.5, night: 22.0 };
  if (phaseMap[phase] !== undefined) setCycleFixedHour(phaseMap[phase]);
  else setCycleFixedHour(null);
};

document.addEventListener('DOMContentLoaded', () => {
  new CountdownApp();
});
