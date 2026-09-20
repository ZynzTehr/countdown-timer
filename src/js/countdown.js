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
  const isPast = totalMs < 0;
  const isComplete = Math.abs(totalMs) < 1000;

  const start = isPast ? target : now;
  const end = isPast ? now : target;

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

  // If target reached or past 0
  const isZero = (years === 0 && months === 0 && days === 0 && hours === 0 && minutes === 0 && seconds === 0);

  return {
    years: Math.max(0, isNaN(years) ? 0 : years),
    months: Math.max(0, isNaN(months) ? 0 : months),
    days: Math.max(0, isNaN(days) ? 0 : days),
    hours: Math.max(0, isNaN(hours) ? 0 : hours),
    minutes: Math.max(0, isNaN(minutes) ? 0 : minutes),
    seconds: Math.max(0, isNaN(seconds) ? 0 : seconds),
    isPast: !!isPast,
    isComplete: isComplete || (isZero && !isPast),
    totalMs: isNaN(totalMs) ? 0 : Math.abs(totalMs)
  };
}
