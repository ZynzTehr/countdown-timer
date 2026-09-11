# How Interactive Background Particle Animations Work

A technical guide explaining how interactive particle background animations (such as those on Google Antigravity, Gemini, and modern web applications) are achieved in web development.

---

## 1. Overview & Architecture

Interactive particle backgrounds rely on rendering dynamic graphics on a dedicated layer behind the web content. 

The two primary technical approaches are:
1. **HTML5 2D Canvas API**: Ideal for light to medium particle counts (up to ~500 particles) with simple 2D shapes, custom radial glows, and distance-based constellation lines.
2. **WebGL / Three.js + GLSL Shaders**: Ideal for large particle clouds (thousands of points), 3D depth-of-field, camera perspective, and GPU-accelerated fluid motion.

---

## 2. Technical Components Breakdown

### A. The Fullscreen Overlay Layer
An HTML `<canvas>` element is positioned behind all user elements:

```html
<canvas id="particle-canvas"></canvas>
```

```css
#particle-canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: -1;
  pointer-events: none; /* Allows user clicks to pass through to buttons/links */
}
```

---

### B. Particle Object State
In JavaScript, an array of particle objects stores the individual state properties for each node:

```javascript
const particles = [];
const particleCount = 100;

for (let i = 0; i < particleCount; i++) {
  particles.push({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    vx: (Math.random() - 0.5) * 0.5, // Horizontal drift speed
    vy: (Math.random() - 0.5) * 0.5, // Vertical drift speed
    radius: Math.random() * 3 + 1,
    color: 'rgba(236, 72, 153, 0.5)',
    alpha: Math.random() * 0.5 + 0.3
  });
}
```

---

### C. The Animation Loop (`requestAnimationFrame`)
A continuous rendering loop runs on every screen refresh (60–120 FPS):

```javascript
function animate() {
  // 1. Clear previous frame
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 2. Update particle positions & draw
  particles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;

    // Screen edge boundary wrapping
    if (p.x < 0) p.x = canvas.width;
    if (p.x > canvas.width) p.x = 0;
    if (p.y < 0) p.y = canvas.height;
    if (p.y > canvas.height) p.y = 0;

    // Draw particle with radial glow
    const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
    gradient.addColorStop(0, p.color);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
  });

  requestAnimationFrame(animate);
}

animate();
```

---

### D. Interactive Mouse Physics & Repulsion

To make particles interact dynamically with the cursor:
1. Track mouse coordinates using a `mousemove` listener.
2. Calculate the Euclidean distance $d$ between mouse $(x_m, y_m)$ and particle $(x_p, y_p)$:
   $$d = \sqrt{(x_m - x_p)^2 + (y_m - y_p)^2}$$
3. Apply a force vector when $d < \text{influenceRadius}$:

```javascript
const mouse = { x: null, y: null, radius: 150 };

window.addEventListener('mousemove', (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

// Inside animation loop:
if (mouse.x !== null) {
  const dx = mouse.x - p.x;
  const dy = mouse.y - p.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < mouse.radius) {
    const angle = Math.atan2(dy, dx);
    const force = (mouse.radius - dist) / mouse.radius;
    
    // Repel particle away from cursor
    p.x -= Math.cos(angle) * force * 2;
    p.y -= Math.sin(angle) * force * 2;
  }
}
```

---

### E. Constellation / Proximity Line Rendering
To draw subtle connecting lines between nearby particles:

```javascript
for (let a = 0; a < particles.length; a++) {
  for (let b = a + 1; b < particles.length; b++) {
    const dx = particles[a].x - particles[b].x;
    const dy = particles[a].y - particles[b].y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 100) {
      const opacity = 1 - (dist / 100);
      ctx.strokeStyle = `rgba(236, 72, 153, ${opacity * 0.3})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(particles[a].x, particles[a].y);
      ctx.lineTo(particles[b].x, particles[b].y);
      ctx.stroke();
    }
  }
}
```

---

### F. WebGL & Three.js GPU Acceleration
For advanced 3D particle systems:
- **`THREE.Points` & `THREE.BufferGeometry`**: Particle attributes (positions, colors, scales) are stored in TypedArrays (`Float32Array`) and sent directly to GPU memory.
- **GLSL Shaders**:
  - `vertexShader`: Computes 3D transformations, perspective scaling, and perlin/simplex noise turbulence per vertex on GPU.
  - `fragmentShader`: Renders glowing circular textures and blending modes (`AdditiveBlending`) at 60+ FPS without CPU bottlenecks.

---

## 3. Summary Matrix

| Technique | Implementation | Performance Limit | Best Used For |
| :--- | :--- | :--- | :--- |
| **2D Canvas** | `CanvasRenderingContext2D` + JS loop | ~100–500 particles | Constellation grids, ambient orb floating, cursor repulsion |
| **WebGL / Three.js** | GLSL Shaders + BufferGeometry | 10,000+ particles | 3D space fields, fluid distortion, heavy particle bursts |
| **CSS Animations** | Pure DOM HTML elements | ~20–50 elements | Simple static floating background bubbles |
