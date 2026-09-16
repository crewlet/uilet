/** Anything a caller has a time in. */
export type TimeValue = Date | number | string | null | undefined;

const SECOND = 1000;
const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
/** Past this, a relative time stops helping and the date itself starts. */
const RELATIVE_DAYS = 30;

/**
 * The instant a value names, or null when it names none.
 *
 * A NAIVE STAMP IS READ AS UTC. Servers emit both the aware form
 * (`2026-01-01T00:00:00Z`) and the naive one, often for the same instant, and
 * `new Date()` reads the naive one as LOCAL time: a reader in Berlin would see
 * every naive stamp an hour out, and the two encodings of one instant would
 * render as two different times on the same screen.
 */
export function toInstant(value: TimeValue): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) {
    const at = value.getTime();
    return Number.isNaN(at) ? null : at;
  }
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const text = /[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value}Z`;
  const at = Date.parse(text);
  return Number.isNaN(at) ? null : at;
}

/** The absolute date a relative time gives way to. */
function onDate(at: number): string {
  return new Date(at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
}

/**
 * "4m ago", "2h ago", "just now", "in 30m", "due".
 *
 * `now` is a REQUIRED argument rather than a call to a clock inside. Every
 * relative time on a screen has to agree with every other, and a function that
 * read the clock itself would answer differently for two rows rendered in the
 * same frame. `useNow` is the one ticker that supplies it.
 *
 * Null for a value that names no instant, so a caller decides what an absence
 * looks like. A dash chosen here would be the one absence in a product that
 * says nothing about what is missing.
 */
export function formatRelative(value: TimeValue, now: number): string | null {
  const at = toInstant(value);
  if (at === null) return null;
  const seconds = Math.round((now - at) / SECOND);
  if (seconds < 0) return formatUntil(value, now);
  // Under five seconds there is no honest number: a clock that ticks once a
  // second cannot tell 1 from 4, and "4s ago" on something that just happened
  // reads as a measurement nobody made.
  if (seconds < 5) return 'just now';
  if (seconds < MINUTE) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / MINUTE);
  if (minutes < MINUTE) return `${minutes}m ago`;
  const hours = Math.floor(seconds / HOUR);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(seconds / DAY);
  if (days < RELATIVE_DAYS) return `${days}d ago`;
  return onDate(at);
}

/** The same rules, forward: "in 4m", and "due" once it has arrived. */
export function formatUntil(value: TimeValue, now: number): string | null {
  const at = toInstant(value);
  if (at === null) return null;
  const seconds = Math.round((at - now) / SECOND);
  if (seconds <= 0) return 'due';
  if (seconds < MINUTE) return `in ${seconds}s`;
  const minutes = Math.floor(seconds / MINUTE);
  if (minutes < MINUTE) return `in ${minutes}m`;
  const hours = Math.floor(seconds / HOUR);
  if (hours < 24) return `in ${hours}h`;
  return `in ${Math.floor(seconds / DAY)}d`;
}

/**
 * How long, as a running duration: "12s", "4m 20s", "1h 5m".
 *
 * Different from the relative form on purpose. Beside something that is still
 * happening, "4m ago" claims it is over; this says how long it has been going.
 */
export function formatElapsed(value: TimeValue, now: number): string | null {
  const at = toInstant(value);
  if (at === null) return null;
  // Clamped at zero: a clock a second ahead of the server would otherwise
  // render a run that has not started yet as a negative duration.
  const seconds = Math.max(0, Math.round((now - at) / SECOND));
  if (seconds < MINUTE) return `${seconds}s`;
  const minutes = Math.floor(seconds / MINUTE);
  if (minutes < MINUTE) return `${minutes}m ${seconds % MINUTE}s`;
  const hours = Math.floor(seconds / HOUR);
  return `${hours}h ${Math.floor((seconds % HOUR) / MINUTE)}m`;
}

/** The full instant, for the title a reader hovers to see exactly when. */
export function formatExact(value: TimeValue): string | null {
  const at = toInstant(value);
  if (at === null) return null;
  return new Date(at).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

/** The machine-readable form a `time` element carries. */
export function toISO(value: TimeValue): string | null {
  const at = toInstant(value);
  return at === null ? null : new Date(at).toISOString();
}
