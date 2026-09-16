import type { TimeHTMLAttributes } from 'react';
import { EmptyValue } from '../EmptyValue/index.js';
import { cx } from '../utils/cx.js';
import { useNow } from './clock.js';
import { formatElapsed, formatExact, formatRelative, toISO, type TimeValue } from './format.js';

export type RelativeTimeMode =
  /** "4m ago", "in 30m", "just now", "due". When something happened. */
  | 'relative'
  /** "4m 20s". How long something has been going. */
  | 'elapsed';

export interface RelativeTimeProps extends Omit<TimeHTMLAttributes<HTMLTimeElement>, 'dateTime'> {
  value: TimeValue;
  mode?: RelativeTimeMode | undefined;
  /**
   * Overrides the shared clock, for a story or a suite. Left alone, every
   * relative time in the document advances together on one ticker.
   */
  now?: number | undefined;
  /** What an unparseable or absent value means. */
  emptyLabel?: string | undefined;
}

/**
 * When something happened, kept current.
 *
 * A REAL `time` ELEMENT, carrying the exact instant in `dateTime` and in its
 * title. The words a reader sees are approximate on purpose, and the moment
 * they need the real one, hovering gives it to them and a machine reading the
 * page has had it all along.
 *
 * It subscribes to the shared clock, so the words advance on their own rather
 * than freezing at whatever they were when an unrelated push last happened to
 * re-render the row.
 */
export function RelativeTime({
  value,
  mode = 'relative',
  now,
  emptyLabel = 'Not reported',
  className,
  ...rest
}: RelativeTimeProps) {
  const ticking = useNow();
  const at = now ?? ticking;
  const iso = toISO(value);
  const text = mode === 'elapsed' ? formatElapsed(value, at) : formatRelative(value, at);

  // A stamp nothing could parse is an ABSENCE, and an absence says what it
  // means. Rendering the epoch, or a bare dash a screen reader reads as
  // "dash", both claim something nobody measured.
  if (iso === null || text === null) return <EmptyValue label={emptyLabel} />;

  return (
    <time {...rest} className={cx('crewlet-relative-time', className)} dateTime={iso} title={formatExact(value) ?? iso}>
      {text}
    </time>
  );
}
