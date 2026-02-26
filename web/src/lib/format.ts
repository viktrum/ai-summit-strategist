/** Shared formatting utilities. */

/** Format 24h time string to 12h AM/PM. */
export function formatTime(timeStr: string | null): string {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':');
  const h = parseInt(hours);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
}

/** Parse semicolon-separated speaker string into array. */
export function parseSpeakers(speakerStr: string): string[] {
  if (!speakerStr || !speakerStr.trim()) return [];
  return speakerStr.split(';').map((s) => s.trim()).filter(Boolean);
}

/** Format date string to "Monday, February 16" style. */
export function formatDateLong(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

/** Format date string to "Mon, Feb 16" style. */
export function formatDateShort(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/** Get short weekday from date string (e.g. "Mon"). */
export function dayShort(date: string): string {
  return new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' });
}

/** Get day number from date string (e.g. "16"). */
export function dayNum(date: string): string {
  return new Date(date + 'T00:00:00').getDate().toString();
}
