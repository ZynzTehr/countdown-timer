/**
 * Scene Renderer — Living Landscape Wallpaper with Real Dynamic Day Cycle,
 * Mountain Horizon Occlusion, Directional Lighting & Atmospheric Shading
 *
 * Implements:
 * - Mountain horizon occlusion: Sun and Moon physically rise and set BEHIND mountain peaks
 * - Diurnal celestial orbit: Sun by day, Moon by night (no simultaneous Star Wars twin suns)
 * - Dynamic landscape lighting: Directional sunlight, mountain ridge shadows, summit alpenglow
 * - Soothing specular river shimmer: Natural organic light glints following river currents (no wireframe loops)
 * - Soft wispy atmospheric clouds: Multi-layered ethereal drifting mist and cirrus veils
 * - Clean visual composition: No fake procedural branches or grass sticks on edges
 * - Dynamic lunar phases: Exact mathematical shading for New, Crescent, Quarter, Gibbous, Full
 * - Weather & seasonal atmosphere: Gentle rain, soft drifting snow, seasonal light overlays
 */

import { getDayCycleState } from './dayCycle.js';
import { ambientAudio } from './audio.js';
import { getLunarPhase, drawDynamicMoon, drawDynamicMoonDisc, drawDynamicMoonHalo } from './lunarPhase.js';
import { getCurrentSeason, SEASON_CONFIGS } from './seasonEngine.js';
import { fetchUserLiveWeather } from './liveWeather.js';

export class SceneRenderer {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.animationId = null;

    // Viewport dimensions
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    // Live weather data
    this.liveWeather = null;
    this.initLiveWeather();

    // Mouse tracking with smooth lerp
    this.mouse = {
      x: this.width / 2,
      y: this.height / 2,
      targetX: this.width / 2,
      targetY: this.height / 2,
      active: false
    };

    // Parallax normalized offset (-1 to 1)
    this.parallax = { x: 0, y: 0 };

    // Master animation time accumulator
    this.time = 0;

    // High-res painterly artwork layers for the 4 day phases
    const base = import.meta.env.BASE_URL || '/';
    this.images = {
      dawn: this.loadImage(`${base}images/wallpaper-dawn.jpg`),
      day: this.loadImage(`${base}images/wallpaper-day.jpg`),
      dusk: this.loadImage(`${base}images/wallpaper-dusk.jpg`),
      night: this.loadImage(`${base}images/wallpaper-night.jpg`)
    };

    // Season & Lunar configuration
    this.seasonMode = 'auto'; // 'auto', 'spring', 'summer', 'autumn', 'winter'
    this.moonMode = 'auto'; // 'auto', 'full', 'crescent', 'quarter', 'new', 'cycle'

    // Weather state: 'dynamic', 'clear', 'rain', 'snow'
    this.weatherMode = 'dynamic';
    this.currentWeather = 'clear';
    this.weatherTimer = 0;

    // Particle & animation systems
    this.stars = [];
    this.initStars(95);

    this.mist = [];
    this.initMist(18);

    this.raindrops = [];
    this.initRain(130);

    this.snowflakes = [];
    this.initSnow(120);

    this.clouds = [];
    this.initClouds(8);

    this.riverStreaks = [];
    this.initRiverWater();

    this.init();
  }

  loadImage(src) {
    const img = new Image();
    img.loaded = false;
    img.onload = () => {
      img.loaded = true;
    };
    img.onerror = (e) => {
      console.warn('Failed to load wallpaper:', src, e);
    };
    img.src = src;
    if (img.complete && img.naturalWidth > 0) {
      img.loaded = true;
    }
    return img;
  }

  init() {
    this.resize();
    this.bindEvents();
    this.animate();
  }

  bindEvents() {
    window.addEventListener('resize', () => {
      this.resize();
    });

    window.addEventListener('mousemove', (e) => {
      this.mouse.targetX = e.clientX;
      this.mouse.targetY = e.clientY;
      this.mouse.active = true;
    });

    window.addEventListener('mouseleave', () => {
      this.mouse.targetX = this.width / 2;
      this.mouse.targetY = this.height / 2;
      this.mouse.active = false;
    });

    window.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        this.mouse.targetX = e.touches[0].clientX;
        this.mouse.targetY = e.touches[0].clientY;
        this.mouse.active = true;
      }
    }, { passive: true });
  }

  resize() {
    this.width = this.canvas.width = window.innerWidth;
    this.height = this.canvas.height = window.innerHeight;
    this.initRiverWater();
    this.initClouds(8);
  }

  initStars(count) {
    this.stars = [];
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random(),
        y: Math.random() * 0.38,
        radius: Math.random() * 1.5 + 0.4,
        twinkleSpeed: Math.random() * 0.02 + 0.008,
        twinkleOffset: Math.random() * Math.PI * 2,
        baseAlpha: Math.random() * 0.75 + 0.25
      });
    }
  }

  initMist(count) {
    this.mist = [];
    for (let i = 0; i < count; i++) {
      this.mist.push({
        x: Math.random() * this.width,
        y: this.height * (0.50 + Math.random() * 0.32),
        radiusX: Math.random() * 160 + 90,
        radiusY: Math.random() * 30 + 12,
        vx: (Math.random() - 0.5) * 0.16,
        vy: (Math.random() - 0.5) * 0.03,
        alpha: Math.random() * 0.18 + 0.05,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  initRain(count) {
    this.raindrops = [];
    for (let i = 0; i < count; i++) {
      this.raindrops.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        len: Math.random() * 20 + 12,
        speed: Math.random() * 14 + 18,
        alpha: Math.random() * 0.24 + 0.10,
        angle: 0.15
      });
    }
  }

  initSnow(count) {
    this.snowflakes = [];
    for (let i = 0; i < count; i++) {
      this.snowflakes.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        radius: Math.random() * 2.2 + 0.8,
        speed: Math.random() * 1.1 + 0.45,
        driftOffset: Math.random() * Math.PI * 2,
        alpha: Math.random() * 0.50 + 0.22
      });
    }
  }

  initClouds(count = 8) {
    this.clouds = [];
    for (let i = 0; i < count; i++) {
      this.clouds.push({
        x: Math.random() * this.width * 1.3 - this.width * 0.15,
        y: this.height * (0.03 + Math.random() * 0.18),
        radiusX: Math.random() * 140 + 90,
        radiusY: Math.random() * 28 + 14,
        speed: Math.random() * 0.12 + 0.04,
        alpha: Math.random() * 0.18 + 0.08,
        puffs: [
          { ox: -40, oy: 4, rx: 55, ry: 18 },
          { ox: 0, oy: -3, rx: 70, ry: 24 },
          { ox: 45, oy: 2, rx: 60, ry: 20 }
        ]
      });
    }
  }

  initRiverWater() {
    this.riverStreaks = [];
    const streakCount = 42;
    for (let i = 0; i < streakCount; i++) {
      this.riverStreaks.push({
        id: i,
        prog: Math.random(), // 0.0 (far background) to 1.0 (foreground)
        lane: (Math.random() - 0.5) * 0.78, // lateral spread across river width
        speed: 0.0004 + Math.random() * 0.00045, // gentle drift
        baseLength: 60 + Math.random() * 90, // length in pixels
        thickness: 1.1 + Math.random() * 0.8, // 1.1px to 1.9px thin
        pulseSpeed: 0.012 + Math.random() * 0.024,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  async initLiveWeather() {
    this.liveWeather = await fetchUserLiveWeather();
    if (this.weatherMode === 'live' && this.liveWeather) {
      this.currentWeather = this.liveWeather.condition;
    }
  }

  getActiveSeason() {
    const lat = this.liveWeather ? this.liveWeather.latitude : 40;
    return this.seasonMode === 'auto' ? getCurrentSeason(new Date(), lat) : this.seasonMode;
  }

  setSeasonMode(mode) {
    this.seasonMode = mode;
  }

  setMoonMode(mode) {
    this.moonMode = mode;
  }

  setWeatherMode(mode) {
    this.weatherMode = mode;
    this.updateWeather();
  }

  updateWeather() {
    if (this.weatherMode === 'live') {
      if (this.liveWeather) {
        this.currentWeather = this.liveWeather.condition;
      } else {
        this.currentWeather = 'clear';
      }
      return;
    }

    if (this.weatherMode !== 'dynamic') {
      this.currentWeather = this.weatherMode;
      return;
    }

    const season = this.getActiveSeason();
    const config = SEASON_CONFIGS[season] || SEASON_CONFIGS.autumn;

    this.weatherTimer += 0.016;
    const cycleTime = 220;
    const phase = (this.weatherTimer % cycleTime) / cycleTime;

    const rainThreshold = config.rainProbability;
    const snowThreshold = rainThreshold + config.snowProbability;

    if (phase < rainThreshold) {
      this.currentWeather = 'rain';
    } else if (phase < snowThreshold) {
      this.currentWeather = 'snow';
    } else {
      this.currentWeather = 'clear';
    }
  }

  getResolvedLunarState() {
    if (this.moonMode === 'full') {
      return { phase: 0.5, name: 'Full Moon', illuminated: 1.0, isWaxing: false };
    }
    if (this.moonMode === 'crescent') {
      return { phase: 0.14, name: 'Waxing Crescent', illuminated: 0.28, isWaxing: true };
    }
    if (this.moonMode === 'quarter') {
      return { phase: 0.25, name: 'First Quarter', illuminated: 0.50, isWaxing: true };
    }
    if (this.moonMode === 'gibbous') {
      return { phase: 0.38, name: 'Waxing Gibbous', illuminated: 0.76, isWaxing: true };
    }
    if (this.moonMode === 'waning_crescent') {
      return { phase: 0.86, name: 'Waning Crescent', illuminated: 0.28, isWaxing: false };
    }
    if (this.moonMode === 'new') {
      return { phase: 0.0, name: 'New Moon', illuminated: 0.0, isWaxing: true };
    }
    if (this.moonMode === 'cycle') {
      const phase = (this.time * 0.02) % 1.0;
      const illuminated = (1 - Math.cos(phase * 2 * Math.PI)) / 2;
      let name = 'Waxing Crescent';
      if (phase < 0.03 || phase > 0.97) name = 'New Moon';
      else if (phase < 0.22) name = 'Waxing Crescent';
      else if (phase < 0.28) name = 'First Quarter';
      else if (phase < 0.47) name = 'Waxing Gibbous';
      else if (phase < 0.53) name = 'Full Moon';
      else if (phase < 0.72) name = 'Waning Gibbous';
      else if (phase < 0.78) name = 'Last Quarter';
      else name = 'Waning Crescent';

      return { phase, name, illuminated, isWaxing: phase < 0.5 };
    }

    return getLunarPhase(new Date());
  }

  /**
   * Continuous 24-hour cycle blending with crisp, natural phase boundaries
   */
  getCycleBlends(hour) {
    let fromImg, toImg, t, starAlpha = 0, mistAlpha = 0.18, phaseName = 'day', nightAlpha = 0;

    if (hour >= 4.5 && hour < 6.5) {
      // Dawn: Night transitions to Dawn
      phaseName = 'dawn';
      fromImg = this.images.night;
      toImg = this.images.dawn;
      t = (hour - 4.5) / 2.0;
      starAlpha = (1 - t) * 0.85;
      mistAlpha = 0.32 + t * 0.12;
      nightAlpha = Math.max(0, (1 - t));
    } else if (hour >= 6.5 && hour < 8.0) {
      // Early Morning: Dawn transitions to Day
      phaseName = 'day';
      fromImg = this.images.dawn;
      toImg = this.images.day;
      t = (hour - 6.5) / 1.5;
      starAlpha = 0;
      mistAlpha = 0.20 * (1 - t) + 0.05;
      nightAlpha = 0;
    } else if (hour >= 8.0 && hour < 17.0) {
      // Full Day
      phaseName = 'day';
      fromImg = this.images.day;
      toImg = this.images.day;
      t = 1.0;
      starAlpha = 0;
      mistAlpha = 0.05;
      nightAlpha = 0;
    } else if (hour >= 17.0 && hour < 19.5) {
      // Dusk: Day transitions to Golden Dusk
      phaseName = 'dusk';
      fromImg = this.images.day;
      toImg = this.images.dusk;
      t = (hour - 17.0) / 2.5;
      starAlpha = t * 0.25;
      mistAlpha = 0.06 + t * 0.18;
      nightAlpha = Math.max(0, (t - 0.3) * 0.8);
    } else if (hour >= 19.5 && hour < 21.0) {
      // Nightfall: Dusk transitions to Deep Night
      phaseName = 'night';
      fromImg = this.images.dusk;
      toImg = this.images.night;
      t = (hour - 19.5) / 1.5;
      starAlpha = 0.25 + t * 0.65;
      mistAlpha = 0.24 + t * 0.08;
      nightAlpha = Math.min(1, 0.4 + t * 0.6);
    } else {
      // Deep Night (21.0 to 4.5)
      phaseName = 'night';
      fromImg = this.images.night;
      toImg = this.images.night;
      t = 1.0;
      starAlpha = 0.90;
      mistAlpha = 0.32;
      nightAlpha = 1.0;
    }

    t = Math.max(0, Math.min(1, t));
    const smoothT = t * t * (3 - 2 * t);

    return { fromImg, toImg, t: smoothT, starAlpha, mistAlpha, phaseName, nightAlpha };
  }

  /**
   * Evaluates the mountain ridge Y coordinate (0.0 to 1.0) for any normalized X across the viewport.
   * Accurately traces the topography of the central snow-capped summit (peak at x=0.46, y=0.185),
   * the eastern slope and shoulder (x=0.50 to 0.66), and framing pine ridgelines.
   */
  getMountainRidgeY(nx) {
    const x = Math.max(0, Math.min(1, nx));
    let ry;
    if (x <= 0.10) {
      ry = 0.06 + x * 0.60; // 0.06 to 0.12 (left edge tall framing pines)
    } else if (x <= 0.22) {
      ry = 0.12 + (x - 0.10) * 0.65; // 0.12 to 0.198 (left mid pines)
    } else if (x <= 0.34) {
      ry = 0.198 + (x - 0.22) * 0.42; // 0.198 to 0.248 (left mountain base)
    } else if (x <= 0.46) {
      ry = 0.248 - (x - 0.34) * 0.525; // 0.248 up to 0.185 (mountain summit peak at x=0.46)
    } else if (x <= 0.56) {
      ry = 0.185 + (x - 0.46) * 0.85; // 0.185 to 0.270 (mountain eastern slope)
    } else if (x <= 0.66) {
      ry = 0.270 + (x - 0.56) * 0.75; // 0.270 to 0.345 (lower mountain saddle/shoulder)
    } else if (x <= 0.78) {
      ry = 0.345 - (x - 0.66) * 1.05; // 0.345 to 0.219 (right midground pines rising)
    } else if (x <= 0.90) {
      ry = 0.219 - (x - 0.78) * 0.85; // 0.219 to 0.117 (right tall pines)
    } else {
      ry = 0.117 - (x - 0.90) * 0.55; // 0.117 to 0.062 (right edge tall pines)
    }

    // Subtle natural rocky crag micro-texture
    const crag = Math.sin(x * 75) * 0.0025 + Math.cos(x * 150) * 0.0018;
    return ry + crag;
  }

  animate() {
    this.time += 0.015;
    this.updateWeather();

    // Smooth mouse lerping for parallax
    const lerpFactor = 0.05;
    this.mouse.x += (this.mouse.targetX - this.mouse.x) * lerpFactor;
    this.mouse.y += (this.mouse.targetY - this.mouse.y) * lerpFactor;

    this.parallax.x = (this.mouse.x / this.width - 0.5) * 2;
    this.parallax.y = (this.mouse.y / this.height - 0.5) * 2;

    const cycle = getDayCycleState();
    const blends = this.getCycleBlends(cycle.hour);
    const lunarState = this.getResolvedLunarState();
    const season = this.getActiveSeason();

    // Synchronize body theme class so timer cards smoothly complement background colors
    if (document.body.dataset.phase !== blends.phaseName) {
      document.body.dataset.phase = blends.phaseName;
      document.body.className = `phase-${blends.phaseName}`;
    }

    ambientAudio.updateState(blends.phaseName, this.currentWeather);

    this.ctx.clearRect(0, 0, this.width, this.height);

    // 1. Base Painterly Oil-Artwork with Cross-fade & Parallax
    this.drawArtworkCover(blends);

    // 2. Twinkling Stars in Night Sky (Drawn in sky layer, behind mountains)
    if (blends.starAlpha > 0.02 && this.currentWeather === 'clear') {
      this.drawStars(blends.starAlpha);
    }

    // 3. Dynamic Celestial Sun Disc (Sky-clipped so it hides behind painted mountain)
    this.drawSunDisc(cycle, blends);

    // 4. Dynamic Astronomical Moon Disc (Sky-clipped so it hides behind painted mountain)
    this.drawMoonDisc(lunarState, blends.nightAlpha, cycle.hour);

    // 5. Atmospheric Celestial Illumination (Screen-blended light scattering over sky and ridges)
    this.drawSunAtmosphere(cycle, blends);
    this.drawMoonAtmosphere(lunarState, blends.nightAlpha, cycle.hour);

    // 7. Drifting High Clouds in Sky (Soft, ethereal cirrus veils)
    this.drawClouds(blends);

    // 8. Dynamic Landscape Lighting & Summit Alpenglow
    this.drawDynamicLandscapeLighting(cycle, blends, cycle.hour);

    // 9. Soothing Specular River Shimmer (Long blended streaks, zero ladder rungs!)
    this.drawRiverShimmer(blends, lunarState, cycle.hour);

    // 10. Soft Ethereal Valley Mist
    if (blends.mistAlpha > 0.02) {
      this.drawMist(blends.mistAlpha);
    }

    // 11. Seasonal Atmospheric Light Overlay
    this.drawSeasonOverlay(season);

    // 12. Weather Effects: Rain or Snow
    if (this.currentWeather === 'rain') {
      this.drawRain();
    } else if (this.currentWeather === 'snow') {
      this.drawSnow();
    }

    // 13. Interactive Ambient Cursor Glow
    this.drawCursorGlow();

    this.animationId = requestAnimationFrame(() => this.animate());
  }

  drawArtworkCover(blends) {
    const zoom = 1.05;
    const maxShiftX = (this.width * (zoom - 1)) / 2;
    const maxShiftY = (this.height * (zoom - 1)) / 2;

    const shiftX = -this.parallax.x * maxShiftX;
    const shiftY = -this.parallax.y * maxShiftY;

    if (blends.fromImg && blends.fromImg.loaded) {
      this.ctx.save();
      this.ctx.globalAlpha = 1.0;
      this.drawImageCover(blends.fromImg, shiftX, shiftY, zoom);
      this.ctx.restore();
    }

    if (blends.toImg && blends.toImg.loaded && blends.t > 0.001 && blends.toImg !== blends.fromImg) {
      this.ctx.save();
      this.ctx.globalAlpha = blends.t;
      this.drawImageCover(blends.toImg, shiftX, shiftY, zoom);
      this.ctx.restore();
    }
  }

  drawImageCover(img, offsetX, offsetY, zoom) {
    const cw = this.width;
    const ch = this.height;
    const iw = img.naturalWidth || 1920;
    const ih = img.naturalHeight || 1080;

    const scale = Math.max(cw / iw, ch / ih) * zoom;
    const nw = iw * scale;
    const nh = ih * scale;

    const dx = (cw - nw) / 2 + offsetX;
    const dy = (ch - nh) / 2 + offsetY;

    this.ctx.drawImage(img, dx, dy, nw, nh);
  }

  /**
   * Mountain foreground occlusion layer.
   * Clips to the mountain ridge contour and redraws the artwork layer.
   * Occludes any sun or moon pixels that dip behind the mountain peaks!
   */
  // drawMountainForeground removed — was creating a visible double mountain outline
  // by redrawing artwork clipped to a mathematical ridge that didn't perfectly match
  // the painted artwork. Sun/moon now clip themselves to the sky region instead.

  /**
   * Calculates diurnal celestial sun trajectory coordinates.
   * Rises at dawn from deep behind the LEFT pine ridge (0.18w),
   * arcs high over the summit at noon (0.38w), and sets deep behind the RIGHT mountain saddle (0.58w).
   */
  getSunCoordinates(hour) {
    const w = this.width;
    const h = this.height;

    // Diurnal progress: 0 at pre-dawn (4.8h), 0.5 at zenith noon (12.6h), 1.0 at sunset dusk (20.4h)
    const prog = Math.max(0, Math.min(1, (hour - 4.8) / 15.6));

    // Sun X: rises from behind LEFT pine ridge (0.18w), arcs across to zenith above summit (0.38w),
    // and sets behind RIGHT mountain saddle (0.58w) — LEFT to RIGHT trajectory!
    const sunX = w * (0.18 + prog * 0.40) - this.parallax.x * 6;

    // Sun Y: starts at 0.42h (completely hidden behind left pine ridge, which is ~0.17h),
    // arcs high up to 0.06h (zenith open sky above summit peak at noon),
    // and sinks down to 0.38h (completely submerged behind right mountain saddle, which is ~0.285h)
    const baseHorizonY = 0.42 - prog * 0.04;
    const arcElevation = 0.34;
    const sunY = h * (baseHorizonY - Math.sin(prog * Math.PI) * arcElevation) - this.parallax.y * 3;
    const sunRadius = Math.max(16, Math.min(24, w * 0.015));

    // Calculate fade alpha near the extremes so sunrise and sunset are buttery smooth
    let fadeAlpha = 1.0;
    if (hour < 5.4) {
      fadeAlpha = Math.max(0, (hour - 4.8) / 0.6);
    } else if (hour > 19.8) {
      fadeAlpha = Math.max(0, (20.4 - hour) / 0.6);
    }

    return { sunX, sunY, sunRadius, prog, fadeAlpha };
  }

  /**
   * Sun Disc Pass: Physical incandescent core sphere.
   * Drawn BEFORE drawMountainForeground so the mountain ridge physically occludes it!
   */
  drawSunDisc(cycle, blends) {
    const hour = cycle.hour;
    if (hour < 4.8 || hour > 20.4) return;

    const { sunX, sunY, sunRadius, fadeAlpha } = this.getSunCoordinates(hour);
    if (fadeAlpha <= 0.01) return;

    const isDawn = hour < 8.2;
    const isDusk = hour >= 16.5;

    let coreRGB = '255, 255, 252';
    let coronaRGB = '255, 242, 195';

    if (isDawn) {
      coreRGB = '255, 248, 235';
      coronaRGB = '255, 215, 160';
    } else if (isDusk) {
      coreRGB = '255, 240, 220';
      coronaRGB = '255, 195, 130';
    }

    this.ctx.save();
    this.clipToSkyRegion(); // Clip disc to sky so it hides behind painted mountain
    this.ctx.globalAlpha = fadeAlpha;

    // Luminous Celestial Sun Disc (Feathered incandescent sphere)
    const coreGrad = this.ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunRadius * 1.15);
    coreGrad.addColorStop(0, `rgba(${coreRGB}, 1.0)`);
    coreGrad.addColorStop(0.65, `rgba(${coreRGB}, 0.96)`);
    coreGrad.addColorStop(0.88, `rgba(${coronaRGB}, 0.82)`);
    coreGrad.addColorStop(1.0, `rgba(${coronaRGB}, 0)`); // Soft feathered limb

    this.ctx.fillStyle = coreGrad;
    this.ctx.beginPath();
    this.ctx.arc(sunX, sunY, sunRadius * 1.15, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  /**
   * Constructs a sky-only clip path (everything ABOVE the mountain ridge).
   * Used to prevent atmospheric glow from bleeding through foreground trees/landscape.
   */
  clipToSkyRegion() {
    const w = this.width;
    const h = this.height;
    const steps = 64;

    this.ctx.beginPath();
    // Start at top-left corner of canvas
    this.ctx.moveTo(0, 0);
    // Across the top of the canvas
    this.ctx.lineTo(w, 0);
    // Down to the mountain ridge on the right edge
    this.ctx.lineTo(w, this.getMountainRidgeY(1.0) * h - this.parallax.y * 3);

    // Trace the mountain ridge contour from right to left
    for (let i = steps; i >= 0; i--) {
      const nx = i / steps;
      const px = nx * w - this.parallax.x * 6;
      const py = this.getMountainRidgeY(nx) * h - this.parallax.y * 3;
      this.ctx.lineTo(px, py);
    }

    // Back up to top-left corner
    this.ctx.lineTo(0, 0);
    this.ctx.closePath();
    this.ctx.clip();
  }

  /**
   * Sun Atmosphere Pass: Wide atmospheric sky bloom, corona, and alpenglow.
   * Drawn AFTER drawMountainForeground with 'screen' blend mode.
   * CLIPPED to the sky region so glow does NOT bleed through foreground trees/landscape!
   */
  drawSunAtmosphere(cycle, blends) {
    const hour = cycle.hour;
    if (hour < 4.8 || hour > 20.4) return;

    const { sunX, sunY, sunRadius, fadeAlpha } = this.getSunCoordinates(hour);
    if (fadeAlpha <= 0.01) return;

    const w = this.width;
    const h = this.height;
    const isDawn = hour < 8.2;
    const isDusk = hour >= 16.5;

    let coronaRGB = '255, 242, 195';
    let bloomRGB = '255, 230, 170';
    let bloomAlpha = 0.36;

    if (isDawn) {
      const dawnT = Math.max(0, Math.min(1, (8.2 - hour) / 3.4));
      coronaRGB = '255, 215, 160';
      bloomRGB = '255, 195, 140';
      bloomAlpha = (0.28 + dawnT * 0.12) * fadeAlpha;
    } else if (isDusk) {
      const duskT = Math.max(0, Math.min(1, (hour - 16.5) / 3.9));
      coronaRGB = '255, 195, 130';
      bloomRGB = '255, 165, 105';
      bloomAlpha = (0.30 + duskT * 0.14) * fadeAlpha;
    } else {
      bloomAlpha *= fadeAlpha;
    }

    this.ctx.save();
    // Clip atmosphere to sky region only — prevents glow from bleeding through trees!
    this.clipToSkyRegion();
    this.ctx.globalCompositeOperation = 'screen';

    // 1. Wide Atmospheric Sky Bloom
    const maxBloomRadius = Math.max(w * 0.48, 650);
    const wideBloom = this.ctx.createRadialGradient(sunX, sunY, sunRadius * 0.5, sunX, sunY, maxBloomRadius);
    wideBloom.addColorStop(0, `rgba(${bloomRGB}, ${bloomAlpha})`);
    wideBloom.addColorStop(0.20, `rgba(${bloomRGB}, ${bloomAlpha * 0.50})`);
    wideBloom.addColorStop(0.48, `rgba(${bloomRGB}, ${bloomAlpha * 0.16})`);
    wideBloom.addColorStop(0.78, `rgba(${bloomRGB}, ${bloomAlpha * 0.03})`);
    wideBloom.addColorStop(1.0, `rgba(${bloomRGB}, 0)`);

    this.ctx.fillStyle = wideBloom;
    this.ctx.fillRect(0, 0, w, h);

    // 2. Solar Corona (Radiant warm golden halo)
    const coronaRadius = sunRadius * 3.8;
    const corona = this.ctx.createRadialGradient(sunX, sunY, sunRadius * 0.7, sunX, sunY, coronaRadius);
    corona.addColorStop(0, `rgba(${coronaRGB}, ${0.70 * fadeAlpha})`);
    corona.addColorStop(0.35, `rgba(${coronaRGB}, ${0.30 * fadeAlpha})`);
    corona.addColorStop(0.70, `rgba(${coronaRGB}, ${0.06 * fadeAlpha})`);
    corona.addColorStop(1.0, `rgba(${coronaRGB}, 0)`);

    this.ctx.fillStyle = corona;
    this.ctx.beginPath();
    this.ctx.arc(sunX, sunY, coronaRadius, 0, Math.PI * 2);
    this.ctx.fill();

    // 3. Sunrise / Sunset Soft Atmospheric Horizon Alpenglow
    if (isDawn || isDusk) {
      const horizonWash = this.ctx.createRadialGradient(
        sunX,
        sunY,
        sunRadius * 1.5,
        sunX,
        sunY + h * 0.08,
        w * 0.60
      );
      const glowRGB = isDawn ? '255, 200, 145' : '255, 170, 95';
      const washAlpha = (isDawn ? 0.18 : 0.20) * fadeAlpha;
      horizonWash.addColorStop(0, `rgba(${glowRGB}, ${washAlpha})`);
      horizonWash.addColorStop(0.40, `rgba(${glowRGB}, ${washAlpha * 0.35})`);
      horizonWash.addColorStop(0.80, `rgba(${glowRGB}, ${washAlpha * 0.05})`);
      horizonWash.addColorStop(1.0, `rgba(${glowRGB}, 0)`);

      this.ctx.fillStyle = horizonWash;
      this.ctx.fillRect(0, 0, w, h * 0.65);
    }

    this.ctx.restore();
  }

  /**
   * Calculates nighttime astronomical moon trajectory coordinates.
   * Emerges from behind the LEFT pine ridge (0.18w) at nightfall,
   * arcs high across the vast starry sky LEFT to RIGHT, and exits off the TOP-RIGHT corner (1.08w) by dawn.
   */
  getMoonCoordinates(hour) {
    const w = this.width;
    const h = this.height;

    // Progress: 0 at nightfall (19.5h) to 1.0 at dawn (6.2h) — 10.7 hour night trajectory
    let nightProg;
    if (hour >= 19.5) {
      nightProg = (hour - 19.5) / 10.7;
    } else {
      nightProg = (hour + 4.5) / 10.7;
    }
    nightProg = Math.max(0, Math.min(1, nightProg));

    // Moon X: emerges from behind LEFT pine ridge (0.18w),
    // arcs across starry sky LEFT to RIGHT, and exits off the TOP-RIGHT corner (1.08w)!
    const moonX = w * (0.18 + nightProg * 0.90) - this.parallax.x * 6;

    // Moon Y: starts at 0.42h (completely hidden behind left pine ridge),
    // arcs high across starry sky (zenith at ~0.01h), and exits off the TOP-RIGHT corner (-0.08h)!
    const linearY = 0.42 - nightProg * 0.50;
    const midArc = Math.sin(nightProg * Math.PI) * 0.16;
    const moonY = h * (linearY - midArc) - this.parallax.y * 3;
    const radius = Math.max(16, Math.min(24, w * 0.015));

    // Fade alpha near nightfall emergence and pre-dawn exit
    let fadeAlpha = 1.0;
    if (hour >= 19.5 && hour < 20.2) {
      fadeAlpha = Math.max(0, (hour - 19.5) / 0.7);
    } else if (hour >= 5.6 && hour <= 6.2) {
      fadeAlpha = Math.max(0, (6.2 - hour) / 0.6);
    }

    return { moonX, moonY, radius, nightProg, fadeAlpha };
  }

  /**
   * Moon Disc Pass: Physical spherical moon with accurate astronomical phase shading.
   * Sky-clipped so it naturally hides behind the painted mountain artwork.
   */
  drawMoonDisc(lunarState, nightAlpha, hour) {
    const isNightTime = hour >= 19.5 || hour <= 6.2 || nightAlpha > 0.02;
    if (!isNightTime) return;

    const { moonX, moonY, radius, fadeAlpha } = this.getMoonCoordinates(hour);
    let effectiveAlpha = (this.moonMode !== 'auto') ? 1.0 : Math.max(0.70, nightAlpha);
    effectiveAlpha *= fadeAlpha;

    if (effectiveAlpha <= 0.01) return;

    this.ctx.save();
    this.clipToSkyRegion(); // Clip disc to sky so it hides behind painted mountain
    drawDynamicMoonDisc(this.ctx, moonX, moonY, radius, lunarState, effectiveAlpha);
    this.ctx.restore();
  }

  /**
   * Moon Atmosphere Pass: Soft pearlescent silvery lunar halo.
   * Drawn AFTER drawMountainForeground with 'screen' blend mode.
   * CLIPPED to the sky region so moonlight does NOT bleed through foreground trees/landscape!
   */
  drawMoonAtmosphere(lunarState, nightAlpha, hour) {
    const isNightTime = hour >= 19.5 || hour <= 6.2 || nightAlpha > 0.02;
    if (!isNightTime) return;

    const { moonX, moonY, radius, fadeAlpha } = this.getMoonCoordinates(hour);
    let effectiveAlpha = (this.moonMode !== 'auto') ? 1.0 : Math.max(0.70, nightAlpha);
    effectiveAlpha *= fadeAlpha;

    if (effectiveAlpha <= 0.01) return;

    // Clip to sky region so halo doesn't bleed through trees!
    this.ctx.save();
    this.clipToSkyRegion();
    drawDynamicMoonHalo(this.ctx, moonX, moonY, radius, lunarState, effectiveAlpha);
    this.ctx.restore();
  }

  /**
   * Real dynamic landscape lighting and summit alpenglow.
   * Enhances mountain summit lighting cleanly without murky dark rectangles.
   */
  drawDynamicLandscapeLighting(cycle, blends, hour) {
    const w = this.width;
    const h = this.height;

    this.ctx.save();

    // 1. Subtle warm sunlight wash during midday (illuminates the landscape naturally)
    if (hour >= 6.5 && hour <= 18.0) {
      this.ctx.save();
      this.ctx.globalCompositeOperation = 'screen';
      const noonGrad = this.ctx.createLinearGradient(0, 0, 0, h * 0.7);
      noonGrad.addColorStop(0, 'rgba(255, 248, 225, 0.08)');
      noonGrad.addColorStop(0.6, 'rgba(255, 240, 210, 0.03)');
      noonGrad.addColorStop(1.0, 'rgba(255, 240, 210, 0)');
      this.ctx.fillStyle = noonGrad;
      this.ctx.fillRect(0, 0, w, h * 0.7);
      this.ctx.restore();
    }

    // 2. Mountain Summit Alpenglow Pass (Sunrise 5.5 - 7.8 & Sunset 17.0 - 19.5)
    let alpenglowAlpha = 0;
    let alpenglowColor = '255, 190, 140';

    if (hour >= 5.5 && hour <= 7.8) {
      // Sunrise Alpenglow (soft coral-rose)
      const t = 1 - Math.abs(hour - 6.6) / 1.2;
      alpenglowAlpha = Math.max(0, t) * 0.28;
      alpenglowColor = '255, 205, 165';
    } else if (hour >= 17.0 && hour <= 19.5) {
      // Sunset Alpenglow (fiery apricot-peach)
      const t = 1 - Math.abs(hour - 18.2) / 1.3;
      alpenglowAlpha = Math.max(0, t) * 0.32;
      alpenglowColor = '255, 175, 110';
    }

    if (alpenglowAlpha > 0.02) {
      this.ctx.save();
      this.ctx.globalCompositeOperation = 'screen';
      const summitX = w * 0.425 - this.parallax.x * 6;
      const summitY = h * 0.14 - this.parallax.y * 3;
      const rad = w * 0.22;

      const summitGlow = this.ctx.createRadialGradient(summitX, summitY, 5, summitX, summitY, rad);
      summitGlow.addColorStop(0, `rgba(${alpenglowColor}, ${alpenglowAlpha})`);
      summitGlow.addColorStop(0.5, `rgba(${alpenglowColor}, ${alpenglowAlpha * 0.35})`);
      summitGlow.addColorStop(1.0, `rgba(${alpenglowColor}, 0)`);

      this.ctx.fillStyle = summitGlow;
      this.ctx.beginPath();
      this.ctx.arc(summitX, summitY, rad, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }

    this.ctx.restore();
  }

  /**
   * Soothing specular river shimmer.
   * Long, horizontal liquid current streaks that blend softly into the water color.
   * Responds to daylight, sunset, and moonlight. Zero ladder rungs, zero harsh white dots!
   */
  drawRiverShimmer(blends, lunarState, hour) {
    const w = this.width;
    const h = this.height;
    const phase = blends.phaseName;

    // Pick water-blended reflection colors matching each phase's painted water tone
    let r = 140, g = 175, b = 210, baseAlpha = 0.30;
    if (phase === 'night') {
      r = 90; g = 100; b = 155; baseAlpha = 0.22; // Deep river blue-indigo
      if (lunarState && lunarState.illuminated > 0.1) {
        baseAlpha += lunarState.illuminated * 0.10;
      }
    } else if (phase === 'dawn') {
      r = 180; g = 145; b = 165; baseAlpha = 0.30; // Warm rose-lavender water
    } else if (phase === 'dusk') {
      r = 175; g = 130; b = 140; baseAlpha = 0.32; // Dusky peach-copper water
    } else {
      r = 140; g = 175; b = 210; baseAlpha = 0.30; // Bright sky-blue water reflection
    }

    this.ctx.save();

    for (const streak of this.riverStreaks) {
      streak.prog += streak.speed;
      if (streak.prog > 1) {
        streak.prog -= 1;
        streak.lane = (Math.random() - 0.5) * 0.78;
      }

      const p = streak.prog;
      // Perspective channel projection — starts at counter card flip level (~0.67h), flows down to rocks
      const cx = (0.51 + p * 0.04 + Math.sin(p * Math.PI) * -0.05) * w;
      const cy = (0.67 + p * 0.29) * h;
      const channelWidth = (0.07 + p * 0.38) * w;

      const sx = cx + streak.lane * channelWidth - this.parallax.x * (5 + p * 9) + Math.sin(this.time * 0.9 + streak.phase) * 4;
      const sy = cy - this.parallax.y * (3 + p * 5);

      // Perspective scaling: farther streaks are shorter and thinner, foreground streaks longer
      const len = streak.baseLength * (0.7 + p * 1.1);
      const thickness = streak.thickness * (0.8 + p * 0.7);

      const pulse = Math.sin(this.time * streak.pulseSpeed * 60 + streak.phase);
      let alpha = baseAlpha * (0.65 + 0.35 * pulse) * (1 - p * 0.25);

      if (alpha <= 0.005) continue;

      // Asymmetric river boundary: rocks are higher on the right, lower on the left.
      // The river bank/rock line slopes from ~0.92h on the far left to ~0.78h on the right.
      const nx = sx / w; // normalized x position of this streak
      const maxRiverY = h * (0.94 - nx * 0.18); // left: 0.94h, center(0.5): 0.85h, right(1.0): 0.76h
      if (sy > maxRiverY) {
        // Below the rock line — fade out smoothly
        const overrun = (sy - maxRiverY) / (h * 0.04); // 4% fade zone
        alpha *= Math.max(0, 1 - overrun);
        if (alpha <= 0.005) continue;
      }

      // Long horizontal gradient with smooth feathered tapers on both ends
      const grad = this.ctx.createLinearGradient(sx - len * 0.5, sy, sx + len * 0.5, sy);
      grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0)`);
      grad.addColorStop(0.2, `rgba(${r}, ${g}, ${b}, ${alpha * 0.6})`);
      grad.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${alpha})`);
      grad.addColorStop(0.8, `rgba(${r}, ${g}, ${b}, ${alpha * 0.6})`);
      grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

      this.ctx.beginPath();
      this.ctx.ellipse(sx, sy, len * 0.5, thickness, 0, 0, Math.PI * 2);
      this.ctx.fillStyle = grad;
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  /**
   * Soft, ethereal drifting high-altitude clouds (cirrus & stratus veils).
   * Layered naturally with multi-point Gaussian-style puffs.
   */
  drawClouds(blends) {
    this.ctx.save();

    let cloudBaseColor;
    if (blends.phaseName === 'night') {
      cloudBaseColor = 'rgba(160, 150, 195, 0.12)';
    } else if (blends.phaseName === 'dusk') {
      cloudBaseColor = 'rgba(254, 185, 150, 0.22)';
    } else if (blends.phaseName === 'dawn') {
      cloudBaseColor = 'rgba(255, 215, 205, 0.20)';
    } else {
      cloudBaseColor = 'rgba(255, 255, 255, 0.20)';
    }

    for (const c of this.clouds) {
      c.x += c.speed;
      if (c.x - c.radiusX * 1.5 > this.width) {
        c.x = -c.radiusX * 1.5;
        c.y = this.height * (0.02 + Math.random() * 0.18);
      }

      const cx = c.x - this.parallax.x * 7;
      const cy = c.y - this.parallax.y * 3;

      for (const puff of c.puffs) {
        const px = cx + puff.ox;
        const py = cy + puff.oy;

        const grad = this.ctx.createRadialGradient(px, py, 0, px, py, puff.rx);
        grad.addColorStop(0, cloudBaseColor);
        grad.addColorStop(0.55, cloudBaseColor.replace(/[\d\.]+\)$/, `${c.alpha * 0.45})`));
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        this.ctx.beginPath();
        this.ctx.ellipse(px, py, puff.rx, puff.ry, 0, 0, Math.PI * 2);
        this.ctx.fillStyle = grad;
        this.ctx.fill();
      }
    }

    this.ctx.restore();
  }

  drawSeasonOverlay(season) {
    const config = SEASON_CONFIGS[season];
    if (!config) return;

    this.ctx.save();
    this.ctx.fillStyle = config.tint;
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.ctx.restore();
  }

  drawRain() {
    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(215, 225, 250, 0.25)';
    this.ctx.lineWidth = 1.2;

    for (const drop of this.raindrops) {
      drop.y += drop.speed;
      drop.x += drop.speed * drop.angle;

      if (drop.y > this.height) {
        drop.y = -drop.len;
        drop.x = Math.random() * this.width;
      }

      this.ctx.beginPath();
      this.ctx.moveTo(drop.x, drop.y);
      this.ctx.lineTo(drop.x + drop.len * drop.angle, drop.y + drop.len);
      this.ctx.stroke();
    }
    this.ctx.restore();
  }

  drawSnow() {
    this.ctx.save();
    for (const flake of this.snowflakes) {
      flake.y += flake.speed;
      flake.x += Math.sin(this.time * 1.5 + flake.driftOffset) * (flake.speed * 0.7);

      if (flake.y > this.height) {
        flake.y = -flake.radius * 2;
        flake.x = Math.random() * this.width;
      }

      this.ctx.beginPath();
      this.ctx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(255, 250, 255, ${flake.alpha})`;
      this.ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';
      this.ctx.shadowBlur = 3;
      this.ctx.fill();
    }
    this.ctx.restore();
  }

  drawStars(starAlpha) {
    this.ctx.save();
    for (const s of this.stars) {
      const twinkle = Math.sin(this.time * 2.5 + s.twinkleOffset);
      const a = s.baseAlpha * starAlpha * (0.65 + 0.35 * twinkle);
      if (a <= 0.02) continue;

      const px = s.x * this.width - this.parallax.x * 5;
      const py = s.y * this.height - this.parallax.y * 3;

      // Skip stars that fall below or near the mountain ridge — generous margin
      // accounts for painted tree canopies that extend above the mathematical ridgeline
      const ridgeY = this.getMountainRidgeY(s.x) * this.height - this.parallax.y * 3;
      if (py >= ridgeY - this.height * 0.05) continue; // 5% viewport margin above ridge

      this.ctx.beginPath();
      this.ctx.arc(px, py, s.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(245, 235, 255, ${a})`;
      this.ctx.shadowColor = 'rgba(236, 72, 153, 0.5)';
      this.ctx.shadowBlur = 4;
      this.ctx.fill();
    }
    this.ctx.restore();
  }

  drawMist(mistAlpha) {
    this.ctx.save();
    for (const m of this.mist) {
      m.x += m.vx;
      m.y += m.vy;

      if (m.x < -m.radiusX) m.x = this.width + m.radiusX;
      if (m.x > this.width + m.radiusX) m.x = -m.radiusX;
      if (m.y < this.height * 0.48) m.y = this.height * 0.82;
      if (m.y > this.height * 0.85) m.y = this.height * 0.50;

      const pulse = Math.sin(this.time + m.phase) * 0.15;
      const a = Math.max(0, (m.alpha + pulse) * mistAlpha);

      if (a <= 0.01) continue;

      const mx = m.x - this.parallax.x * 10;
      const my = m.y - this.parallax.y * 6;

      const grad = this.ctx.createRadialGradient(mx, my, 0, mx, my, m.radiusX);
      grad.addColorStop(0, `rgba(240, 225, 250, ${a})`);
      grad.addColorStop(0.5, `rgba(215, 185, 230, ${a * 0.35})`);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      this.ctx.beginPath();
      this.ctx.ellipse(mx, my, m.radiusX, m.radiusY, 0, 0, Math.PI * 2);
      this.ctx.fillStyle = grad;
      this.ctx.fill();
    }
    this.ctx.restore();
  }

  drawCursorGlow() {
    if (!this.mouse.active) return;

    this.ctx.save();
    const radius = 220;
    const glow = this.ctx.createRadialGradient(
      this.mouse.x, this.mouse.y, 0,
      this.mouse.x, this.mouse.y, radius
    );
    glow.addColorStop(0, 'rgba(251, 191, 36, 0.10)');
    glow.addColorStop(0.35, 'rgba(236, 72, 153, 0.04)');
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');

    this.ctx.fillStyle = glow;
    this.ctx.beginPath();
    this.ctx.arc(this.mouse.x, this.mouse.y, radius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
