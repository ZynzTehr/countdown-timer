# 3D Flip Countdown Timer

## Live Demo

[View the 3D Flip Countdown Timer Live Demo on GitHub Pages](https://zynztehr.github.io/countdown-timer/)

---

## Problem

Standard digital countdown timers are often static, rigid, or visually unappealing:

- Most web countdowns only show standard Days:Hours:Minutes:Seconds without handling larger spans like Years or Months.
- Static number displays lack visual weight and interactive feedback for milestone events.
- Unit labels are frequently hardcoded as plural ("1 Days", "1 Hours"), leading to clumsy UI text.
- Users cannot easily set custom target dates, choose presets, or persist countdown state across page refreshes.

---

## Value

3D Flip Countdown Timer elevates simple timekeeping into a visually captivating mechanical split-flip experience. Built with CSS 3D transforms, Web Audio API sound synthesis, dynamic canvas particles, and HSL gradient glassmorphism, it provides an engaging way to track personal milestones, holidays, launch events, and celebrations.

---

## Project Plan

The project was planned and executed using a modular frontend architecture:

1. **Core Time Calculation Engine**: Developed precise date-math functions (`src/js/countdown.js`) supporting 6 breakdown units (Years, Months, Days, Hours, Minutes, Seconds) accounting for month-length variations.
2. **3D Mechanical Flip Component**: Designed double-leaf split flip cards (`src/js/flipCard.js` and `src/scss/_flip-card.scss`) utilizing CSS `transform-style: preserve-3d` and keyframe animations.
3. **Dynamic Unit & Label Management**: Implemented smart singular/plural label swapping and auto-collapsing logic for zero lead units and single-digit transition states.
4. **Web Audio & Visual Feedback**: Integrated synthesized flip tick sounds via Web Audio API, an ambient interactive particle canvas background, and full-screen confetti bursts upon completion.
5. **Settings & Preset Toolbar**: Created an interactive modal overlay with date-time pickers, quick-select event presets, and `localStorage` state persistence.

---

## Features

### Completed Features

- **6-Unit Mechanical Flip Clock**: Real-time split-flip animation for Years, Months, Days, Hours, Minutes, and Seconds.
- **Dynamic Singular/Plural Labels**: Animated unit label transitions that automatically switch between singular and plural forms (e.g., "1 Day" vs "2 Days").
- **Auto-Collapsing Zero Units**: Intelligently hides leading zero units (e.g., hiding Years or Months when zero) to keep the display clean.
- **Synthesized Web Audio Sound Effects**: Realistic card flip ticks and completion fanfare synthesized dynamically without external MP3 dependencies.
- **Interactive Ambient Particle Background**: Canvas-rendered ambient floating particles with mouse hover interaction.
- **Confetti Celebration Banner**: Animated completion overlay with confetti animation when the countdown reaches zero.
- **Custom Event & Preset Manager**: Modal interface allowing users to set custom date-times or choose built-in event presets.
- **State Persistence**: Saves target event details and sound preferences in `localStorage`.
- **Modern Glassmorphism Design**: Styled with modern CSS variables, glassmorphic backdrop filters, and vibrant HSL gradient borders.

### Future Enhancements

- **Multiple Simultaneous Countdowns**: Support for tracking multiple saved events concurrently in a tabbed interface.
- **Custom Sound & Theme Selection**: User-selectable color themes and alternative audio packs.
- **Embeddable Widget Mode**: Clean iframe export option for embedding countdown timers into external web pages.

---

## Technologies Used

- **HTML5**: Semantic document layout and custom accessibility structure.
- **SCSS / CSS3**: Modular stylesheets, CSS 3D transforms (`rotateX`, `perspective`), CSS variables, and glassmorphism styling.
- **JavaScript (ES6+)**: Event-driven application architecture, ES modules, and date-time arithmetic algorithms.
- **Vite**: Modern frontend tooling, rapid HMR development server, and production bundler.
- **Web Audio API**: Real-time sound synthesis for realistic flip ticks and completion chime.
- **HTML5 Canvas API**: Custom particle renderer for dynamic ambient background graphics.
- **Canvas Confetti**: Lightweight JavaScript confetti library for celebration triggers.

---

## Running the Project Locally

1. Clone the repository:
   ```bash
   git clone https://github.com/ZynzTehr/countdown-timer.git
   ```
2. Navigate into the project directory:
   ```bash
   cd countdown-timer
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the local development server:
   ```bash
   npm run dev
   ```
5. Open the local URL provided by Vite (e.g., `http://localhost:5173`) in your web browser.
