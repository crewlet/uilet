import './RelativeTime.css';

export { RelativeTime } from './RelativeTime.js';
export type { RelativeTimeProps, RelativeTimeMode } from './RelativeTime.js';
export { useNow, currentNow } from './clock.js';
export {
  formatElapsed,
  formatExact,
  formatRelative,
  formatUntil,
  toISO,
  toInstant,
} from './format.js';
export type { TimeValue } from './format.js';
