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
import { getLunarPhase, drawDynamicMoonDisc, drawDynamicMoonHalo } from './lunarPhase.js';
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

    // Single flat-lit base artwork — all lighting and color grading is programmatic
    const base = import.meta.env.BASE_URL || '/';
    this.baseImage = this.loadImage(`${base}images/wallpaper-base.jpg`);

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
   * Continuous 24-hour color grading with crisp, natural phase boundaries.
   * Returns tint parameters (hue, saturation, brightness, overlay color) instead of
   * image pairs — all lighting is now programmatic on a single base image.
   * Uses smooth cubic Hermite interpolation across all phase boundaries.
   */
  getCycleBlends(hour) {
    let starAlpha = 0, mistAlpha = 0.18, phaseName = 'day', nightAlpha = 0;
    let tintR = 0, tintG = 0, tintB = 0, tintAlpha = 0;
    let brightness = 1.0;
    let warmth = 0;

    // Phase name determination:
    // Dawn: 5.0h - 7.5h
    // Day: 7.5h - 17.0h
    // Dusk: 17.0h - 20.8h (stays dusk through sunset & glowing twilight)
    // Night: 20.8h - 5.0h
    if (hour >= 5.0 && hour < 7.5) {
      phaseName = 'dawn';
    } else if (hour >= 7.5 && hour < 17.0) {
      phaseName = 'day';
    } else if (hour >= 17.0 && hour < 20.8) {
      phaseName = 'dusk';
    } else {
      phaseName = 'night';
    }

    if (hour >= 4.0 && hour < 7.0) {
      // Dawn: Night lifts gently to warm rose-coral
      const t = (hour - 4.0) / 3.0;
      const st = t * t * (3 - 2 * t);
      starAlpha = (1 - st) * 0.90;
      mistAlpha = 0.32 * (1 - st) + 0.15 * st;
      nightAlpha = Math.max(0, 1 - st);
      // Transition from deep indigo to warm dawn rose
      tintR = 40 + st * 160;        // 40 → 200 (rose)
      tintG = 20 + st * 60;         // 20 → 80
      tintB = 120 - st * 20;        // 120 → 100
      tintAlpha = 0.55 - st * 0.18; // 0.55 → 0.37
      brightness = 0.20 + st * 0.60;// 0.20 → 0.80
      warmth = st * 0.22;
    } else if (hour >= 7.0 && hour < 9.0) {
      // Early Morning: Dawn rose gently softens to neutral day
      const t = (hour - 7.0) / 2.0;
      const st = t * t * (3 - 2 * t);
      starAlpha = 0;
      mistAlpha = 0.15 * (1 - st) + 0.05 * st;
      nightAlpha = 0;
      tintR = 200 * (1 - st);       // 200 → 0
      tintG = 80 * (1 - st);        // 80 → 0
      tintB = 100 * (1 - st);       // 100 → 0
      tintAlpha = 0.37 * (1 - st);  // 0.37 → 0
      brightness = 0.80 + st * 0.20;// 0.80 → 1.0
      warmth = 0.22 * (1 - st);
    } else if (hour >= 9.0 && hour < 16.5) {
      // Full Day — neutral, full brightness
      starAlpha = 0;
      mistAlpha = 0.05;
      nightAlpha = 0;
      tintR = 0; tintG = 0; tintB = 0; tintAlpha = 0;
      brightness = 1.0;
      warmth = 0;
    } else if (hour >= 16.5 && hour < 19.8) {
      // Sunset / Dusk: Day shifts to warm amber-gold
      const t = (hour - 16.5) / 3.3;
      const st = t * t * (3 - 2 * t);
      starAlpha = st * 0.20;
      mistAlpha = 0.05 + st * 0.18;
      nightAlpha = Math.max(0, (st - 0.4) * 0.5);
      tintR = st * 220;             // 0 → 220 (rich amber)
      tintG = st * 120;             // 0 → 120
      tintB = st * 30;              // 0 → 30
      tintAlpha = st * 0.45;        // 0 → 0.45
      brightness = 1.0 - st * 0.32; // 1.0 → 0.68
      warmth = st * 0.32;
    } else if (hour >= 19.8 && hour < 22.5) {
      // Twilight / Nightfall: Wide, gentle transition from amber to deep night indigo
      const t = (hour - 19.8) / 2.7;
      const st = t * t * (3 - 2 * t);
      starAlpha = 0.20 + st * 0.70; // 0.20 → 0.90
      mistAlpha = 0.23 + st * 0.09; // 0.23 → 0.32
      nightAlpha = 0.30 + st * 0.70;// 0.30 → 1.0
      // Smooth continuous shift from amber to deep indigo
      tintR = 220 - st * 180;       // 220 → 40
      tintG = 120 - st * 100;       // 120 → 20
      tintB = 30 + st * 90;         // 30 → 120
      tintAlpha = 0.45 + st * 0.10; // 0.45 → 0.55
      brightness = 0.68 - st * 0.48;// 0.68 → 0.20
      warmth = 0.32 * (1 - st);
    } else {
      // Deep Night (22.5 to 4.0) — tranquil deep indigo, dark and calm
      starAlpha = 0.90;
      mistAlpha = 0.32;
      nightAlpha = 1.0;
      tintR = 40; tintG = 20; tintB = 120;
      tintAlpha = 0.55;
      brightness = 0.20;
      warmth = 0;
    }

    return {
      phaseName, starAlpha, mistAlpha, nightAlpha,
      tintR, tintG, tintB, tintAlpha,
      brightness, warmth
    };
  }

  /**
   * Derives the exact layout transform used to draw the base artwork in cover mode.
   * Ensures 100% pixel-perfect synchronization between canvas rendering and ridge detection.
   */
  getArtworkTransform() {
    const cw = this.width;
    const ch = this.height;
    const img = this.baseImage;
    const iw = (img && img.naturalWidth) ? img.naturalWidth : 1376;
    const ih = (img && img.naturalHeight) ? img.naturalHeight : 768;

    const zoom = 1.05;
    const maxShiftX = (cw * (zoom - 1)) / 2;
    const maxShiftY = (ch * (zoom - 1)) / 2;

    const shiftX = -this.parallax.x * maxShiftX;
    const shiftY = -this.parallax.y * maxShiftY;

    const scale = Math.max(cw / iw, ch / ih) * zoom;
    const nw = iw * scale;
    const nh = ih * scale;

    const dx = (cw - nw) / 2 + shiftX;
    const dy = (ch - nh) / 2 + shiftY;

    return { cw, ch, iw, ih, scale, nw, nh, dx, dy, shiftX, shiftY, zoom };
  }

  /**
   * Mountain ridge profile sampled with pixel accuracy directly from wallpaper-base.jpg (1376x768).
   * Returns exact image-space Y coordinate (0..767) for any image-space X coordinate (0..1375).
   */
  getImageRidgePixelY(ix) {
    const x = Math.max(0, Math.min(1375, ix));
    const pts = [
      [0, 10], [64, 10], [128, 23], [192, 11], [256, 10], [320, 25],
      [352, 75], [368, 181], [384, 188], [400, 186], [416, 173],
      [448, 115], [480, 150], [512, 184], [544, 175], [576, 164],
      [608, 150], [640, 143], [672, 159], [704, 161], [736, 185],
      [768, 203], [800, 208], [832, 207], [864, 218], [896, 235],
      [928, 247], [952, 257], [968, 258], [984, 245], [1000, 197],
      [1024, 136], [1040, 104], [1072, 210], [1120, 115], [1152, 51],
      [1200, 112], [1280, 147], [1344, 12], [1376, 12]
    ];
    for (let i = 0; i < pts.length - 1; i++) {
      if (x <= pts[i + 1][0]) {
        const t = (x - pts[i][0]) / (pts[i + 1][0] - pts[i][0]);
        return pts[i][1] + t * (pts[i + 1][1] - pts[i][1]);
      }
    }
    return pts[pts.length - 1][1];
  }

  /**
   * Returns the exact canvas Y coordinate of the painted mountain ridge for any canvas X.
   * Maps canvasX into image space, evaluates the ridge, and transforms back into canvas space.
   */
  getMountainRidgeCanvasY(canvasX) {
    const { scale, dx, dy } = this.getArtworkTransform();
    const imageX = (canvasX - dx) / scale;
    const imageY = this.getImageRidgePixelY(imageX);
    return dy + imageY * scale;
  }

  /**
   * Evaluates the mountain ridge Y coordinate as a normalized fraction of viewport height (0.0 to 1.0).
   * Delegates directly to getMountainRidgeCanvasY for true sub-pixel accuracy.
   */
  getMountainRidgeY(nx) {
    return this.getMountainRidgeCanvasY(nx * this.width) / this.height;
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

    // 3. Dynamic Celestial Sun Disc (Sky-clipped, seasonal elliptical path)
    this.drawSunDisc(cycle, blends, season);

    // 4. Dynamic Astronomical Moon Disc (Sky-clipped, seasonal elliptical path)
    this.drawMoonDisc(lunarState, blends.nightAlpha, cycle.hour, season);

    // 5. Atmospheric Celestial Illumination (Screen-blended light scattering over sky and ridges)
    this.drawSunAtmosphere(cycle, blends, season);
    this.drawMoonAtmosphere(lunarState, blends.nightAlpha, cycle.hour, season);

    // 7. Drifting High Clouds in Sky (Soft, ethereal cirrus veils)
    this.drawClouds(cycle.hour, blends);

    // 8. Dynamic Landscape Lighting & Summit Alpenglow
    this.drawDynamicLandscapeLighting(cycle, blends, cycle.hour, season, lunarState);

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
    if (!this.baseImage || !this.baseImage.loaded) return;

    const zoom = 1.05;
    const maxShiftX = (this.width * (zoom - 1)) / 2;
    const maxShiftY = (this.height * (zoom - 1)) / 2;

    const shiftX = -this.parallax.x * maxShiftX;
    const shiftY = -this.parallax.y * maxShiftY;

    const w = this.width;
    const h = this.height;

    // 1. Draw base image at full brightness
    this.ctx.save();
    this.ctx.globalAlpha = 1.0;
    this.drawImageCover(this.baseImage);
    this.ctx.restore();

    // 2. Color tint — overlay a colored fill to shift the scene's hue
    //    Uses 'overlay' blend mode for rich mid-tone color shifts
    if (blends.tintAlpha > 0.005) {
      this.ctx.save();
      this.ctx.globalCompositeOperation = 'overlay';
      this.ctx.globalAlpha = blends.tintAlpha;
      this.ctx.fillStyle = `rgb(${Math.round(blends.tintR)}, ${Math.round(blends.tintG)}, ${Math.round(blends.tintB)})`;
      this.ctx.fillRect(0, 0, w, h);
      this.ctx.restore();
    }

    // 3. Brightness control — darken with a black overlay
    if (blends.brightness < 0.98) {
      this.ctx.save();
      this.ctx.globalAlpha = 1.0 - blends.brightness;
      this.ctx.fillStyle = '#000';
      this.ctx.fillRect(0, 0, w, h);
      this.ctx.restore();
    }

    // 4. Warm/cool light wash via 'screen' composite
    if (blends.warmth > 0.005) {
      this.ctx.save();
      this.ctx.globalCompositeOperation = 'screen';
      this.ctx.globalAlpha = blends.warmth;
      this.ctx.fillStyle = 'rgb(255, 185, 100)'; // warm amber light
      this.ctx.fillRect(0, 0, w, h);
      this.ctx.restore();
    }
  }

  drawImageCover(img) {
    const { nw, nh, dx, dy } = this.getArtworkTransform();
    this.ctx.drawImage(img, dx, dy, nw, nh);
  }

  /**
   * Calculates diurnal celestial sun trajectory coordinates.
   * 
   * Spring/Summer: Enters from sky clearing right of left pines (imageX=390, y=-0.04h),
   *   follows a true 3-point parabolic arc high across the sky above mountain summit,
   *   and sinks smoothly down to and BEHIND the mountain saddle toward the right (imageX=950).
   * 
   * Autumn/Winter: REVERSED — rises from behind mountain saddle on the right,
   *   arcs across sky, and exits off the top-left sky clearing.
   */
  getSunCoordinates(hour, season = 'summer') {
    const w = this.width;
    const h = this.height;
    const isReversed = (season === 'autumn' || season === 'winter');
    const sunRadius = Math.max(16, Math.min(24, w * 0.015));

    // Diurnal progress: 0 at sunrise (5.0h), 0.5 at zenith noon (~12.5h), 1.0 at sunset (20.0h)
    const prog = Math.max(0, Math.min(1, (hour - 5.0) / 15.0));

    const { scale, dx } = this.getArtworkTransform();

    // Entry point: open sky clearing avoiding left tall pines (imageX=390)
    const entryCanvasX = dx + 390 * scale;
    const entryX = Math.max(w * 0.16, Math.min(w * 0.28, entryCanvasX));
    const entryY = -0.04 * h;

    // Setting point: mountain eastern saddle toward the right before right pines (imageX=950)
    const exitCanvasX = dx + 950 * scale;
    const exitX = Math.max(w * 0.68, Math.min(w * 0.80, exitCanvasX));
    const exitRidgeY = this.getMountainRidgeCanvasY(exitX);
    // Sinks fully below mountain ridge so the entire disc is occluded naturally by clipToSkyRegion
    const exitY = exitRidgeY + sunRadius * 1.8;

    // Midday peak: high in open sky clearing well above central summit (imageX=640)
    const peakCanvasX = dx + 640 * scale;
    const peakX = Math.max(w * 0.40, Math.min(w * 0.50, peakCanvasX));
    const peakY = Math.max(20, h * 0.03);

    const t = isReversed ? (1 - prog) : prog;

    // Exact 3-point parabolic trajectory: (entryX, entryY) -> (peakX, peakY) -> (exitX, exitY)
    const c_x = entryX;
    const a_x = 2 * (exitX - entryX) - 4 * (peakX - entryX);
    const b_x = (exitX - entryX) - a_x;
    const sunX = a_x * t * t + b_x * t + c_x;

    const c_y = entryY;
    const a_y = 2 * (exitY - entryY) - 4 * (peakY - entryY);
    const b_y = (exitY - entryY) - a_y;
    const sunY = a_y * t * t + b_y * t + c_y;

    // Fade alpha: full opacity in the sky! Only fades once completely submerged behind the ridge.
    let fadeAlpha = 1.0;
    if (!isReversed) {
      if (prog < 0.04) {
        fadeAlpha = prog / 0.04; // Fade in at morning entry
      } else if (prog > 0.98) {
        fadeAlpha = Math.max(0, (1.0 - prog) / 0.02); // Fade out only when fully submerged
      }
    } else {
      if (prog < 0.02) {
        fadeAlpha = prog / 0.02; // Rising from behind ridge
      } else if (prog > 0.96) {
        fadeAlpha = Math.max(0, (1.0 - prog) / 0.04); // Exiting top-left
      }
    }

    return { sunX, sunY, sunRadius, prog, fadeAlpha };
  }

  /**
   * Sun Disc Pass: Physical incandescent core sphere.
   * Sky-clipped so it naturally hides behind the painted mountain artwork.
   */
  drawSunDisc(cycle, blends, season = 'summer') {
    const hour = cycle.hour;
    if (hour < 5.0 || hour > 20.2) return;

    const { sunX, sunY, sunRadius, fadeAlpha } = this.getSunCoordinates(hour, season);
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
   * Uses exact canvas coordinates matching the painted artwork so celestial discs
   * physically and seamlessly slip BEHIND the mountain silhouette with zero gap.
   */
  clipToSkyRegion() {
    const w = this.width;
    const steps = 64;

    this.ctx.beginPath();
    // Start at top-left corner of canvas
    this.ctx.moveTo(0, 0);
    // Across the top of the canvas
    this.ctx.lineTo(w, 0);
    // Down to the mountain ridge on the right edge
    this.ctx.lineTo(w, this.getMountainRidgeCanvasY(w));

    // Trace the mountain ridge contour from right to left using exact canvas coordinates
    for (let i = steps; i >= 0; i--) {
      const px = (i / steps) * w;
      const py = this.getMountainRidgeCanvasY(px);
      this.ctx.lineTo(px, py);
    }

    // Back up to top-left corner
    this.ctx.lineTo(0, 0);
    this.ctx.closePath();
    this.ctx.clip();
  }

  /**
   * Sun Atmosphere Pass: Wide atmospheric sky bloom, corona, and alpenglow.
   * Naturally radiates across the sky with 'screen' blend mode.
   * NOT polygon-clipped so light scatters organically without artificial ghost ridges or tree cuts.
   */
  drawSunAtmosphere(cycle, blends, season = 'summer') {
    const hour = cycle.hour;
    if (hour < 5.0 || hour > 20.2) return;

    const { sunX, sunY, sunRadius, fadeAlpha } = this.getSunCoordinates(hour, season);
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
   * Matches sun trajectory geometry: enters top-left clearing, peaks high above summit,
   * and sinks smoothly down to and BEHIND the mountain saddle toward the right.
   */
  getMoonCoordinates(hour, season = 'summer') {
    const w = this.width;
    const h = this.height;
    const isReversed = (season === 'autumn' || season === 'winter');
    const radius = Math.max(16, Math.min(24, w * 0.015));

    // Night progress: 0 at nightfall (19.8h) to 1.0 at dawn (5.2h) — ~9.4 hour night
    let nightProg;
    if (hour >= 19.8) {
      nightProg = (hour - 19.8) / 9.4;
    } else if (hour <= 5.2) {
      nightProg = (hour + (24 - 19.8)) / 9.4;
    } else {
      nightProg = 1.0;
    }
    nightProg = Math.max(0, Math.min(1, nightProg));

    const { scale, dx } = this.getArtworkTransform();

    const entryCanvasX = dx + 390 * scale;
    const entryX = Math.max(w * 0.16, Math.min(w * 0.28, entryCanvasX));
    const entryY = -0.04 * h;

    const exitCanvasX = dx + 950 * scale;
    const exitX = Math.max(w * 0.68, Math.min(w * 0.80, exitCanvasX));
    const exitRidgeY = this.getMountainRidgeCanvasY(exitX);
    const exitY = exitRidgeY + radius * 1.8;

    const peakCanvasX = dx + 640 * scale;
    const peakX = Math.max(w * 0.40, Math.min(w * 0.50, peakCanvasX));
    const peakY = Math.max(20, h * 0.03);

    const t = isReversed ? (1 - nightProg) : nightProg;

    const c_x = entryX;
    const a_x = 2 * (exitX - entryX) - 4 * (peakX - entryX);
    const b_x = (exitX - entryX) - a_x;
    const moonX = a_x * t * t + b_x * t + c_x;

    const c_y = entryY;
    const a_y = 2 * (exitY - entryY) - 4 * (peakY - entryY);
    const b_y = (exitY - entryY) - a_y;
    const moonY = a_y * t * t + b_y * t + c_y;

    let fadeAlpha = 1.0;
    if (!isReversed) {
      if (nightProg < 0.04) {
        fadeAlpha = nightProg / 0.04;
      } else if (nightProg > 0.98) {
        fadeAlpha = Math.max(0, (1.0 - nightProg) / 0.02);
      }
    } else {
      if (nightProg < 0.02) {
        fadeAlpha = nightProg / 0.02;
      } else if (nightProg > 0.96) {
        fadeAlpha = Math.max(0, (1.0 - nightProg) / 0.04);
      }
    }

    return { moonX, moonY, radius, nightProg, fadeAlpha };
  }

  /**
   * Moon Disc Pass: Physical spherical moon with accurate astronomical phase shading.
   * Sky-clipped so it naturally hides behind the painted mountain artwork.
   */
  drawMoonDisc(lunarState, nightAlpha, hour, season = 'summer') {
    const isNightTime = hour >= 19.8 || hour <= 5.4 || nightAlpha > 0.02;
    if (!isNightTime) return;

    const { moonX, moonY, radius, fadeAlpha } = this.getMoonCoordinates(hour, season);
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
   * Radiates naturally without hard polygon clipping so trees remain cleanly silhouetted.
   */
  drawMoonAtmosphere(lunarState, nightAlpha, hour, season = 'summer') {
    const isNightTime = hour >= 19.8 || hour <= 5.4 || nightAlpha > 0.02;
    if (!isNightTime) return;

    const { moonX, moonY, radius, fadeAlpha } = this.getMoonCoordinates(hour, season);
    let effectiveAlpha = (this.moonMode !== 'auto') ? 1.0 : Math.max(0.70, nightAlpha);
    effectiveAlpha *= fadeAlpha;

    if (effectiveAlpha <= 0.01) return;

    this.ctx.save();
    drawDynamicMoonHalo(this.ctx, moonX, moonY, radius, lunarState, effectiveAlpha);
    this.ctx.restore();
  }

  /**
   * Real dynamic landscape lighting, directional sun/moon illumination, and summit alpenglow.
   * Driven by actual sun/moon celestial positions to create natural shadows and highlights.
   */
  drawDynamicLandscapeLighting(cycle, blends, hour, season = 'summer', lunarState = null) {
    const w = this.width;
    const h = this.height;

    this.ctx.save();

    // 1. Directional Sunlight Highlight & Cast Shadows (Sun hours: 5.0h - 20.2h)
    if (hour >= 5.0 && hour <= 20.2) {
      const { sunX, sunY, fadeAlpha } = this.getSunCoordinates(hour, season);

      if (fadeAlpha > 0.02) {
        // A. Dynamic Directional Sun Wash (screen blend from sun position)
        let sunHighlightRGB = '255, 245, 215'; // warm solar white
        let sunWashAlpha = 0.10 * fadeAlpha;

        if (hour < 7.5) {
          sunHighlightRGB = '255, 195, 145'; // dawn peach/gold
          sunWashAlpha = 0.14 * fadeAlpha;
        } else if (hour > 17.5) {
          sunHighlightRGB = '255, 180, 110'; // dusk fiery amber
          sunWashAlpha = 0.15 * fadeAlpha;
        }

        this.ctx.save();
        this.ctx.globalCompositeOperation = 'screen';
        const sunWashRadius = Math.max(w * 0.75, 700);
        const sunWash = this.ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, sunWashRadius);
        sunWash.addColorStop(0, `rgba(${sunHighlightRGB}, ${sunWashAlpha})`);
        sunWash.addColorStop(0.4, `rgba(${sunHighlightRGB}, ${sunWashAlpha * 0.45})`);
        sunWash.addColorStop(0.8, `rgba(${sunHighlightRGB}, ${sunWashAlpha * 0.10})`);
        sunWash.addColorStop(1.0, `rgba(${sunHighlightRGB}, 0)`);
        this.ctx.fillStyle = sunWash;
        this.ctx.fillRect(0, 0, w, h);
        this.ctx.restore();

        // B. Directional Cast Shadow (multiply blend opposite to sun position)
        const snx = sunX / w;
        if (snx < 0.45) {
          // Sun is on the left -> shadow falls toward the right landscape/mountains
          const shadowStr = fadeAlpha * (0.45 - snx) * 0.22;
          if (shadowStr > 0.01) {
            this.ctx.save();
            this.ctx.globalCompositeOperation = 'multiply';
            const shadowGrad = this.ctx.createLinearGradient(w * 0.25, 0, w, 0);
            shadowGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
            shadowGrad.addColorStop(0.6, `rgba(240, 242, 248, 1)`);
            shadowGrad.addColorStop(1.0, `rgba(${Math.round(255 - 45 * shadowStr)}, ${Math.round(255 - 50 * shadowStr)}, ${Math.round(255 - 35 * shadowStr)}, 1)`);
            this.ctx.fillStyle = shadowGrad;
            this.ctx.fillRect(0, 0, w, h);
            this.ctx.restore();
          }
        } else if (snx > 0.55) {
          // Sun is on the right -> shadow falls toward the left landscape/mountains
          const shadowStr = fadeAlpha * (snx - 0.55) * 0.22;
          if (shadowStr > 0.01) {
            this.ctx.save();
            this.ctx.globalCompositeOperation = 'multiply';
            const shadowGrad = this.ctx.createLinearGradient(w * 0.75, 0, 0, 0);
            shadowGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
            shadowGrad.addColorStop(0.6, `rgba(240, 242, 248, 1)`);
            shadowGrad.addColorStop(1.0, `rgba(${Math.round(255 - 45 * shadowStr)}, ${Math.round(255 - 50 * shadowStr)}, ${Math.round(255 - 35 * shadowStr)}, 1)`);
            this.ctx.fillStyle = shadowGrad;
            this.ctx.fillRect(0, 0, w, h);
            this.ctx.restore();
          }
        }
      }
    }

    // 2. Directional Moonlight Highlight (Night hours)
    const isNight = hour >= 19.5 || hour <= 6.2 || blends.nightAlpha > 0.05;
    if (isNight && lunarState && lunarState.illuminated > 0.05) {
      const { moonX, moonY, fadeAlpha } = this.getMoonCoordinates(hour, season);
      const moonEffectiveAlpha = fadeAlpha * blends.nightAlpha * lunarState.illuminated;

      if (moonEffectiveAlpha > 0.02) {
        this.ctx.save();
        this.ctx.globalCompositeOperation = 'screen';
        const moonWashRad = Math.max(w * 0.55, 500);
        const moonWash = this.ctx.createRadialGradient(moonX, moonY, 10, moonX, moonY, moonWashRad);
        const mAlpha = 0.09 * moonEffectiveAlpha;
        moonWash.addColorStop(0, `rgba(195, 220, 255, ${mAlpha})`);
        moonWash.addColorStop(0.4, `rgba(180, 205, 250, ${mAlpha * 0.40})`);
        moonWash.addColorStop(1.0, 'rgba(180, 205, 250, 0)');
        this.ctx.fillStyle = moonWash;
        this.ctx.fillRect(0, 0, w, h);
        this.ctx.restore();
      }
    }

    // 3. Mountain Summit Alpenglow Pass (Sunrise 5.5 - 7.8 & Sunset 17.0 - 19.5)
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
   * Evaluates continuous per-frame water reflection color based on 24-hour cycle.
   * Smoothly interpolates RGB channels and alpha with Hermite smoothstep across all phases.
   */
  getRiverColor(hour, lunarState) {
    const h = ((hour % 24) + 24) % 24;
    const lerp = (a, b, t) => a + (b - a) * t;
    const smoothstep = (t) => {
      const c = Math.max(0, Math.min(1, t));
      return c * c * (3 - 2 * c);
    };

    let base;
    if (h >= 22.5 || h < 4.0) {
      // Deep Night: serene river indigo
      base = { r: 90, g: 100, b: 155, a: 0.22 };
    } else if (h >= 4.0 && h < 6.5) {
      // Night to Dawn: indigo warms to lavender-rose
      const st = smoothstep((h - 4.0) / 2.5);
      base = {
        r: Math.round(lerp(90, 180, st)),
        g: Math.round(lerp(100, 145, st)),
        b: Math.round(lerp(155, 165, st)),
        a: lerp(0.22, 0.30, st)
      };
    } else if (h >= 6.5 && h < 8.5) {
      // Dawn to Day: rose softens to clear sky-blue water reflection
      const st = smoothstep((h - 6.5) / 2.0);
      base = {
        r: Math.round(lerp(180, 140, st)),
        g: Math.round(lerp(145, 175, st)),
        b: Math.round(lerp(165, 210, st)),
        a: 0.30
      };
    } else if (h >= 8.5 && h < 16.5) {
      // Day: bright sky-blue water reflection
      base = { r: 140, g: 175, b: 210, a: 0.30 };
    } else if (h >= 16.5 && h < 19.5) {
      // Day to Dusk: sky-blue warms to rich copper-peach reflection
      const st = smoothstep((h - 16.5) / 3.0);
      base = {
        r: Math.round(lerp(140, 175, st)),
        g: Math.round(lerp(175, 130, st)),
        b: Math.round(lerp(210, 140, st)),
        a: lerp(0.30, 0.32, st)
      };
    } else {
      // 19.5 to 22.5: Dusk copper-peach smoothly transitions to night indigo
      const st = smoothstep((h - 19.5) / 3.0);
      base = {
        r: Math.round(lerp(175, 90, st)),
        g: Math.round(lerp(130, 100, st)),
        b: Math.round(lerp(140, 155, st)),
        a: lerp(0.32, 0.22, st)
      };
    }

    if ((h >= 20.5 || h <= 5.5) && lunarState && lunarState.illuminated > 0.1) {
      base.a += lunarState.illuminated * 0.08;
    }
    return base;
  }

  /**
   * Soothing specular river shimmer.
   * Long, horizontal liquid current streaks that blend softly into the water color.
   * Responds to daylight, sunset, and moonlight. Zero ladder rungs, zero harsh white dots!
   */
  drawRiverShimmer(blends, lunarState, hour) {
    const w = this.width;
    const h = this.height;
    const { r, g, b, a: baseAlpha } = this.getRiverColor(hour, lunarState);

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
      const nx = sx / w;
      const maxRiverY = h * (0.94 - nx * 0.18);
      if (sy > maxRiverY) {
        // Below the rock line — fade out smoothly
        const overrun = (sy - maxRiverY) / (h * 0.04);
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
   * Evaluates continuous per-frame cloud color and opacity across 24 hours.
   * Smoothly interpolates RGB channels and alpha with Hermite smoothstep across all phase boundaries.
   */
  getCloudColor(hour) {
    const h = ((hour % 24) + 24) % 24;
    const lerp = (a, b, t) => a + (b - a) * t;
    const smoothstep = (t) => {
      const c = Math.max(0, Math.min(1, t));
      return c * c * (3 - 2 * c);
    };

    if (h >= 22.5 || h < 4.0) {
      // Deep Night: cool silvery indigo
      return { r: 160, g: 150, b: 195, a: 0.12 };
    } else if (h >= 4.0 && h < 6.5) {
      // Night to Dawn: silver shifts to morning rose blush
      const st = smoothstep((h - 4.0) / 2.5);
      return {
        r: Math.round(lerp(160, 255, st)),
        g: Math.round(lerp(150, 215, st)),
        b: Math.round(lerp(195, 205, st)),
        a: lerp(0.12, 0.20, st)
      };
    } else if (h >= 6.5 && h < 8.5) {
      // Dawn to Day: rose softens to clean white cirrus
      const st = smoothstep((h - 6.5) / 2.0);
      return {
        r: Math.round(lerp(255, 255, st)),
        g: Math.round(lerp(215, 255, st)),
        b: Math.round(lerp(205, 255, st)),
        a: 0.20
      };
    } else if (h >= 8.5 && h < 16.5) {
      // Day: bright soft white cirrus veils
      return { r: 255, g: 255, b: 255, a: 0.20 };
    } else if (h >= 16.5 && h < 19.5) {
      // Day to Dusk: white warms to fiery peach-amber
      const st = smoothstep((h - 16.5) / 3.0);
      return {
        r: Math.round(lerp(255, 254, st)),
        g: Math.round(lerp(255, 185, st)),
        b: Math.round(lerp(255, 150, st)),
        a: lerp(0.20, 0.22, st)
      };
    } else {
      // 19.5 to 22.5: Dusk peach-amber smoothly fades into tranquil night indigo
      const st = smoothstep((h - 19.5) / 3.0);
      return {
        r: Math.round(lerp(254, 160, st)),
        g: Math.round(lerp(185, 150, st)),
        b: Math.round(lerp(150, 195, st)),
        a: lerp(0.22, 0.12, st)
      };
    }
  }

  /**
   * Soft, ethereal drifting high-altitude clouds (cirrus & stratus veils).
   * Seamless continuous per-frame color grading across all phases.
   */
  drawClouds(hour, blends) {
    this.ctx.save();
    const { r, g, b, a: cloudAlpha } = this.getCloudColor(hour);

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
        grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${cloudAlpha})`);
        grad.addColorStop(0.55, `rgba(${r}, ${g}, ${b}, ${cloudAlpha * (c.alpha / 0.20) * 0.45})`);
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

      // Skip stars that fall below or near the mountain ridge
      const ridgeY = this.getMountainRidgeCanvasY(px);
      if (py >= ridgeY - 15) continue;

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
