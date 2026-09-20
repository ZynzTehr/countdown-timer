/**
 * Day Cycle Engine — Real-Time Clock → Scene Phase Interpolation
 * 
 * Maps the user's system clock to a continuous day cycle with smooth
 * transitions between dawn, day, dusk, and night phases.
 * Outputs sky gradient colors, ambient light, mist/star opacity, and sun/moon position.
 */

// Phase boundaries (hours, 24h format)
const PHASES = {
  NIGHT_END: 5,      // Night ends, dawn begins
  DAWN_END: 8,       // Dawn ends, day begins
  DAY_END: 17,       // Day ends, dusk begins
  DUSK_END: 20,      // Dusk ends, night begins
};

// Muted, painterly palettes — no bright or sharp tones
const SKY_PALETTES = {
  night: {
    top: [12, 6, 28],        // Deep indigo-plum
    mid: [22, 10, 42],       // Dark violet
    bottom: [35, 18, 55],    // Muted plum horizon
    ambient: [20, 12, 40],   // Cool violet ambient
    water: [15, 8, 32],      // Deep river reflection
  },
  dawn: {
    top: [45, 30, 65],       // Soft lavender
    mid: [120, 75, 90],      // Dusty rose
    bottom: [165, 110, 95],  // Muted peach-coral
    ambient: [140, 90, 85],  // Warm blush
    water: [100, 65, 80],    // Rose reflection
  },
  day: {
    top: [65, 50, 85],       // Muted purple-blue
    mid: [95, 75, 100],      // Soft mauve
    bottom: [140, 110, 105], // Warm haze
    ambient: [130, 110, 100],// Warm diffuse
    water: [75, 60, 90],     // Soft purple-blue
  },
  dusk: {
    top: [50, 25, 60],       // Deep plum
    mid: [130, 65, 75],      // Dusty mauve-coral
    bottom: [170, 105, 70],  // Warm amber
    ambient: [150, 85, 65],  // Amber glow
    water: [90, 50, 60],     // Warm reflection
  }
};

/**
 * Linearly interpolate between two RGB arrays
 */
function lerpColor(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

/**
 * Interpolate an entire palette object between two palettes
 */
function lerpPalette(palA, palB, t) {
  const result = {};
  for (const key of Object.keys(palA)) {
    result[key] = lerpColor(palA[key], palB[key], t);
  }
  return result;
}

/**
 * Convert RGB array to CSS string
 */
export function rgbStr(color, alpha = 1) {
  return alpha < 1
    ? `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`
    : `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
}

// Day Cycle Configuration — Default to Option B (Compressed Loop)
let cycleMode = 'loop'; // 'loop' (Option B), 'realtime' (Option A), or 'fixed'
let cycleDurationMs = 10 * 60 * 1000; // 10 minutes per full 24-hour cycle
let fixedHour = null;

export function setCycleConfig(mode = 'loop', durationMinutes = 10) {
  cycleMode = mode;
  fixedHour = null;
  cycleDurationMs = Math.max(1, durationMinutes) * 60 * 1000;
}

export function setCycleFixedHour(hour) {
  if (hour !== null && hour !== undefined) {
    cycleMode = 'fixed';
    fixedHour = hour;
  } else {
    cycleMode = 'loop';
    fixedHour = null;
  }
}

export function getFixedHour() {
  return fixedHour;
}

export function getCycleConfig() {
  return {
    mode: cycleMode,
    durationMinutes: cycleDurationMs / (60 * 1000),
    fixedHour
  };
}

/**
 * Compute smoothed time-of-day as a fractional hour (0–24)
 * In loop mode: maps continuously over cycleDurationMs
 */
function getFractionalHour(date) {
  if (cycleMode === 'fixed' && fixedHour !== null) {
    return fixedHour;
  }
  if (cycleMode === 'loop') {
    const loopProgress = (Date.now() % cycleDurationMs) / cycleDurationMs;
    return loopProgress * 24;
  }
  return date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
}

/**
 * Compute eased transition factor using smoothstep
 */
function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Main export: Get full day cycle state for a given Date
 * @param {Date} date - The current date/time
 * @returns {Object} Complete scene state
 */
export function getDayCycleState(date = new Date()) {
  const hour = getFractionalHour(date);

  let palette;
  let phaseName;
  let starOpacity = 0;
  let mistOpacity = 0;
  let sunProgress = 0;  // 0 = horizon left, 0.5 = zenith, 1 = horizon right
  let moonProgress = 0;
  let showSun = false;
  let showMoon = false;

  if (hour < PHASES.NIGHT_END) {
    // Deep Night (0:00 – 5:00)
    phaseName = 'night';
    palette = SKY_PALETTES.night;
    starOpacity = 0.8;
    mistOpacity = 0.4;
    showMoon = true;
    moonProgress = hour / PHASES.NIGHT_END * 0.5 + 0.25; // Arc across night sky
  } else if (hour < PHASES.DAWN_END) {
    // Dawn transition (5:00 – 8:00)
    phaseName = 'dawn';
    const t = smoothstep(PHASES.NIGHT_END, PHASES.DAWN_END, hour);
    palette = lerpPalette(SKY_PALETTES.night, SKY_PALETTES.dawn, t);
    starOpacity = (1 - t) * 0.8;
    mistOpacity = 0.3 + t * 0.25; // Mist rises at dawn
    showSun = t > 0.3;
    sunProgress = t * 0.2; // Sun just rising
  } else if (hour < PHASES.DAY_END) {
    // Day (8:00 – 17:00)
    phaseName = 'day';
    const earlyT = smoothstep(PHASES.DAWN_END, PHASES.DAWN_END + 1.5, hour);
    palette = lerpPalette(SKY_PALETTES.dawn, SKY_PALETTES.day, earlyT);
    starOpacity = 0;
    mistOpacity = 0.08;
    showSun = true;
    // Sun arcs from 0.2 to 0.8 across the day
    sunProgress = 0.2 + ((hour - PHASES.DAWN_END) / (PHASES.DAY_END - PHASES.DAWN_END)) * 0.6;
  } else if (hour < PHASES.DUSK_END) {
    // Dusk transition (17:00 – 20:00)
    phaseName = 'dusk';
    const t = smoothstep(PHASES.DAY_END, PHASES.DUSK_END, hour);
    palette = lerpPalette(SKY_PALETTES.day, SKY_PALETTES.dusk, t);
    starOpacity = t * 0.3;
    mistOpacity = 0.1 + t * 0.3;
    showSun = t < 0.7;
    sunProgress = 0.8 + t * 0.2; // Sun setting
  } else {
    // Night (20:00 – 24:00)
    phaseName = 'night';
    const t = smoothstep(PHASES.DUSK_END, PHASES.DUSK_END + 1.5, hour);
    palette = lerpPalette(SKY_PALETTES.dusk, SKY_PALETTES.night, t);
    starOpacity = 0.3 + t * 0.5;
    mistOpacity = 0.3 + t * 0.1;
    showMoon = t > 0.3;
    moonProgress = (hour - PHASES.DUSK_END) / (24 - PHASES.DUSK_END) * 0.25;
  }

  return {
    phaseName,
    palette,
    starOpacity,
    mistOpacity,
    sun: { visible: showSun, progress: sunProgress },
    moon: { visible: showMoon, progress: moonProgress },
    hour,
  };
}
