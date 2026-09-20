/**
 * Astronomical Lunar Phase Engine
 * Computes exact real-world moon phase (0.0 = New Moon, 0.5 = Full Moon, 1.0 = New Moon)
 * based on synodic lunar cycle (~29.53059 days) from known astronomical epoch.
 */

const SYNODIC_MONTH_MS = 29.53058867 * 24 * 60 * 60 * 1000;
// Reference New Moon: Jan 6, 2000, 18:14 UTC
const KNOWN_NEW_MOON = new Date('2000-01-06T18:14:00Z').getTime();

export function getLunarPhase(date = new Date()) {
  const diff = date.getTime() - KNOWN_NEW_MOON;
  const phase = ((diff % SYNODIC_MONTH_MS) + SYNODIC_MONTH_MS) % SYNODIC_MONTH_MS / SYNODIC_MONTH_MS;

  let name = 'Full Moon';
  if (phase < 0.03 || phase > 0.97) {
    name = 'New Moon';
  } else if (phase < 0.22) {
    name = 'Waxing Crescent';
  } else if (phase < 0.28) {
    name = 'First Quarter';
  } else if (phase < 0.47) {
    name = 'Waxing Gibbous';
  } else if (phase < 0.53) {
    name = 'Full Moon';
  } else if (phase < 0.72) {
    name = 'Waning Gibbous';
  } else if (phase < 0.78) {
    name = 'Last Quarter';
  } else {
    name = 'Waning Crescent';
  }

  // Fraction of moon surface illuminated (0.0 to 1.0)
  // At phase 0 (new): 0, at phase 0.5 (full): 1
  const illuminated = (1 - Math.cos(phase * 2 * Math.PI)) / 2;

  return {
    phase, // 0.0 to 1.0
    name,
    illuminated, // 0.0 to 1.0
    isWaxing: phase < 0.5
  };
}

/**
 * Draw the soft atmospheric lunar halo (Uses screen blend mode)
 */
export function drawDynamicMoonHalo(ctx, cx, cy, radius, lunarState, alpha = 1) {
  if (alpha <= 0.01) return;
  const { illuminated } = lunarState;

  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  const haloRadius = radius * (4.0 + illuminated * 3.0);
  const halo = ctx.createRadialGradient(cx, cy, radius * 0.5, cx, cy, haloRadius);
  const haloGlowAlpha = (0.08 + illuminated * 0.26) * alpha;

  halo.addColorStop(0, `rgba(235, 240, 255, ${haloGlowAlpha})`);
  halo.addColorStop(0.35, `rgba(185, 200, 250, ${haloGlowAlpha * 0.45})`);
  halo.addColorStop(0.70, `rgba(140, 160, 235, ${haloGlowAlpha * 0.15})`);
  halo.addColorStop(1.0, 'rgba(140, 160, 235, 0)'); // Fades to lavender RGB with 0 alpha, NEVER pure black

  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(cx, cy, haloRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Draw the physical spherical moon disc with accurate astronomical phase shading.
 * This is drawn before the mountain occlusion pass so mountains physically block it!
 */
export function drawDynamicMoonDisc(ctx, cx, cy, radius, lunarState, alpha = 1) {
  if (alpha <= 0.01) return;
  const { phase, illuminated } = lunarState;

  ctx.save();

  // 1. Base spherical moon disc (soft ethereal earthshine body)
  const earthshineAlpha = 0.12 * alpha;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(32, 24, 48, ${earthshineAlpha})`;
  ctx.fill();

  // 2. Illuminated portion drawn using smooth lunar terminator
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip(); // Constrain within circular moon sphere

  // Moon illuminated surface gradient (soft celestial silver with subtle warm pearl highlight)
  const moonGrad = ctx.createRadialGradient(
    cx - radius * 0.25,
    cy - radius * 0.25,
    radius * 0.1,
    cx,
    cy,
    radius * 1.05
  );
  moonGrad.addColorStop(0, `rgba(255, 254, 248, ${0.98 * alpha})`);
  moonGrad.addColorStop(0.55, `rgba(240, 238, 255, ${0.92 * alpha})`);
  moonGrad.addColorStop(0.85, `rgba(215, 218, 248, ${0.82 * alpha})`);
  moonGrad.addColorStop(1.0, `rgba(180, 185, 225, ${0.70 * alpha})`);

  ctx.fillStyle = moonGrad;

  // Render the lit crescent / gibbous / full shape with exact parametric curve
  const angle = phase * 2 * Math.PI;

  ctx.beginPath();
  if (phase <= 0.5) {
    // Waxing: right side is illuminated
    ctx.arc(cx, cy, radius, -Math.PI / 2, Math.PI / 2, false);
    const termWidth = radius * Math.cos(angle);
    const safeRadiusX = Math.max(0.1, Math.abs(termWidth));
    ctx.ellipse(cx, cy, safeRadiusX, radius, 0, Math.PI / 2, -Math.PI / 2, termWidth > 0);
  } else {
    // Waning: left side is illuminated
    ctx.arc(cx, cy, radius, Math.PI / 2, -Math.PI / 2, false);
    const termWidth = radius * Math.cos(angle);
    const safeRadiusX = Math.max(0.1, Math.abs(termWidth));
    ctx.ellipse(cx, cy, safeRadiusX, radius, 0, -Math.PI / 2, Math.PI / 2, termWidth < 0);
  }
  ctx.closePath();
  ctx.fill();

  // 3. Subtle, painterly lunar mare shading (gentle organic contrast, NO cartoon circles)
  const mareGrad = ctx.createRadialGradient(
    cx + radius * 0.1,
    cy + radius * 0.15,
    radius * 0.1,
    cx + radius * 0.1,
    cy + radius * 0.15,
    radius * 0.75
  );
  mareGrad.addColorStop(0, `rgba(160, 155, 195, ${0.12 * alpha * illuminated})`);
  mareGrad.addColorStop(0.6, `rgba(145, 140, 180, ${0.08 * alpha * illuminated})`);
  mareGrad.addColorStop(1, 'rgba(145, 140, 180, 0)');
  ctx.fillStyle = mareGrad;
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

  ctx.restore(); // Undo clip

  // 4. Soft celestial rim bloom (feathered edge so moon blends naturally into night atmosphere)
  const rimGlow = ctx.createRadialGradient(cx, cy, radius * 0.85, cx, cy, radius * 1.35);
  rimGlow.addColorStop(0, `rgba(245, 248, 255, ${0.16 * alpha * Math.max(0.2, illuminated)})`);
  rimGlow.addColorStop(0.5, `rgba(200, 215, 255, ${0.07 * alpha * Math.max(0.2, illuminated)})`);
  rimGlow.addColorStop(1, 'rgba(180, 200, 255, 0)');
  ctx.fillStyle = rimGlow;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 1.35, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Draw dynamic moon (combined halo + disc)
 */
export function drawDynamicMoon(ctx, cx, cy, radius, lunarState, alpha = 1) {
  drawDynamicMoonHalo(ctx, cx, cy, radius, lunarState, alpha);
  drawDynamicMoonDisc(ctx, cx, cy, radius, lunarState, alpha);
}

