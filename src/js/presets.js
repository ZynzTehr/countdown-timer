/**
 * Preset Countdown Events Data & Helpers
 */

export function getPresetEvents() {
  const now = new Date();
  const currentYear = now.getFullYear();

  // Next New Year (Jan 1 of next year)
  const nextNewYear = new Date(currentYear + 1, 0, 1, 0, 0, 0);

  // Next Summer Solstice (approx June 21)
  let summerSolstice = new Date(currentYear, 5, 21, 12, 0, 0);
  if (summerSolstice < now) {
    summerSolstice = new Date(currentYear + 1, 5, 21, 12, 0, 0);
  }

  // Next Solar Eclipse / Major Event Preset (e.g. Total Eclipse Aug 2026 or 1 Year Celebration)
  const cosmicEvent = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 385 + 1000 * 60 * 60 * 4); // ~1 year 20 days

  // 100 Days Countdown
  const hundredDays = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 100);

  // Quick Timers
  const fifteenMinutes = new Date(now.getTime() + 15 * 60 * 1000);
  const thirtyMinutes = new Date(now.getTime() + 30 * 60 * 1000);

  return [
    { id: '15min', name: '15 Minutes', date: fifteenMinutes },
    { id: '30min', name: '30 Minutes', date: thirtyMinutes },
    { id: 'new-year', name: `New Year ${currentYear + 1}`, date: nextNewYear },
    { id: 'solstice', name: 'Summer Solstice', date: summerSolstice },
    { id: 'cosmic', name: 'Cosmic Convergence', date: cosmicEvent },
    { id: '100days', name: '100 Days Challenge', date: hundredDays }
  ];
}

/**
 * Helper: Format Date object for HTML <input type="datetime-local">
 */
export function formatDateForInput(date) {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
