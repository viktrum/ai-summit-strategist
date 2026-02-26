/**
 * Time-awareness utilities for the AI Summit Strategist.
 * All event times are in IST (UTC+5:30) since the summit is in India.
 *
 * DEV: Add ?simulateTime=2026-02-17T14:00 to any URL to simulate a specific time.
 */

/**
 * Normalize time strings from the database.
 * Handles formats like "09:30", "09:30:00", "09:30:00.000" → "09:30"
 */
function normalizeTime(time: string): string {
  return time.slice(0, 5); // "HH:MM"
}

/** Build an IST Date from a date string and HH:MM time string. */
function toIST(date: string, time: string): Date {
  const hhmm = normalizeTime(time);
  return new Date(`${date}T${hhmm}:00+05:30`);
}

/** Get current timestamp — supports simulated time via URL param for testing. */
function getNow(): number {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const sim = params.get('simulateTime');
    if (sim) {
      // sim format: "2026-02-17T14:00" — treat as IST
      const simTime = toIST(sim.slice(0, 10), sim.slice(11, 16)).getTime();
      if (!isNaN(simTime)) return simTime;
    }
  }
  return Date.now();
}

/** Check if an event has already ended (or started, if no end_time). */
export function isEventPast(date: string, startTime: string | null, endTime: string | null): boolean {
  const timeStr = endTime || startTime;
  if (!timeStr) return false;
  const eventEnd = toIST(date, timeStr);
  return getNow() > eventEnd.getTime();
}

/** Check if an entire summit day is over (past 11:59 PM IST). */
export function isDatePast(date: string): boolean {
  const endOfDay = new Date(`${date}T23:59:59+05:30`);
  return getNow() > endOfDay.getTime();
}

/**
 * Find the first upcoming time string for a given day's events.
 * Returns the start_time of the next event that hasn't ended, or null if all past.
 */
export function getNextUpcomingTime(
  events: { date: string; start_time: string; end_time: string | null }[]
): string | null {
  const now = getNow();
  for (const ev of events) {
    const endStr = ev.end_time || ev.start_time;
    if (!endStr) continue;
    const eventEnd = toIST(ev.date, endStr).getTime();
    if (eventEnd > now) return ev.start_time;
  }
  return null;
}

/** Get the current date in IST as "YYYY-MM-DD". Respects simulateTime. */
export function getCurrentDateIST(): string {
  const now = getNow();
  // Convert timestamp to IST by formatting in Asia/Kolkata timezone
  const d = new Date(now);
  const year = d.toLocaleString('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric' });
  const month = d.toLocaleString('en-CA', { timeZone: 'Asia/Kolkata', month: '2-digit' });
  const day = d.toLocaleString('en-CA', { timeZone: 'Asia/Kolkata', day: '2-digit' });
  return `${year}-${month}-${day}`;
}

/**
 * Get the first non-past date from a list of dates.
 * Falls back to the last date if all are past.
 */
export function getFirstActiveDate(dates: string[]): string {
  for (const d of dates) {
    if (!isDatePast(d)) return d;
  }
  return dates[dates.length - 1];
}
