/**
 * Countdown Engine - Calculates exact Years, Months, Days, Hours, Minutes, Seconds
 * between current time and target date.
 */

export function calculateTimeRemaining(targetDate, currentDate = new Date()) {
  let target = new Date(targetDate);
  const now = new Date(currentDate);

  if (!targetDate || isNaN(target.getTime())) {
    // Safe fallback: Next New Year
    target = new Date(now.getFullYear() + 1, 0, 1, 0, 0, 0);
  }

  const totalMs = target.getTime() - now.getTime();
  const isPast = totalMs <= 0;

  if (isPast) {
    // Persistent completed state: Clamps cleanly at absolute zero
    return {
      years: 0,
      months: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isPast: true,
      isComplete: true,
      totalMs: 0
    };
  }

  const start = now;
  const end = target;

  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();
  let hours = end.getHours() - start.getHours();
  let minutes = end.getMinutes() - start.getMinutes();
  let seconds = end.getSeconds() - start.getSeconds();

  if (seconds < 0) {
    seconds += 60;
    minutes--;
  }
  if (minutes < 0) {
    minutes += 60;
    hours--;
  }
  if (hours < 0) {
    hours += 24;
    days--;
  }
  if (days < 0) {
    const prevMonthDate = new Date(end.getFullYear(), end.getMonth(), 0);
    days += prevMonthDate.getDate();
    months--;
  }
  if (months < 0) {
    months += 12;
    years--;
  }

  const isZero = (years === 0 && months === 0 && days === 0 && hours === 0 && minutes === 0 && seconds === 0);

  return {
    years: Math.max(0, isNaN(years) ? 0 : years),
    months: Math.max(0, isNaN(months) ? 0 : months),
    days: Math.max(0, isNaN(days) ? 0 : days),
    hours: Math.max(0, isNaN(hours) ? 0 : hours),
    minutes: Math.max(0, isNaN(minutes) ? 0 : minutes),
    seconds: Math.max(0, isNaN(seconds) ? 0 : seconds),
    isPast: false,
    isComplete: isZero,
    totalMs: Math.max(0, totalMs)
  };
}

/**
 * Stopwatch Engine - Converts elapsed milliseconds into formatted units for flip cards.
 */
export function calculateStopwatchTime(elapsedMs) {
  const safeMs = Math.max(0, Math.floor(elapsedMs));
  const totalSeconds = Math.floor(safeMs / 1000);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const totalHours = Math.floor(totalMinutes / 60);
  const hours = totalHours % 24;
  const days = Math.floor(totalHours / 24);

  return {
    years: 0,
    months: 0,
    days: days,
    hours: hours,
    minutes: minutes,
    seconds: seconds,
    isPast: false,
    isComplete: false,
    totalMs: safeMs
  };
}
