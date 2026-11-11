import { StatusDot } from '../StatusDot/index.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';
import { cx } from '../utils/cx.js';
import type { Tone } from '../utils/tone.js';

/** One status the legend names, with how many hold it. */
export interface StatusLegendItem {
  /** Stable across counts: what `value` names when this item is pressed. */
  key: string;
  /** The status's word: "Working", "Needs you". */
  label: string;
  /** The status's dot, in the tones `StatusDot` and `StatusLine` draw, so it reads the same everywhere. */
  tone: Tone;
  count: number;
}

export interface StatusLegendProps {
  /** The group's accessible name: "Filter by status". */
  label: string;
  items: readonly StatusLegendItem[];
  /** The pressed item's key, or `null` for none. */
  value?: string | null | undefined;
  /**
   * Makes each item a toggle that filters: a press asks for its key, and a
   * press on the pressed one asks for `null`. Without it the legend is a key.
   */
  onValueChange?: ((key: string | null) => void) | undefined;
  /** A count as it is read in an item's name: "4 agents". The figure by default. */
  countLabel?: ((count: number) => string) | undefined;
  className?: string | undefined;
}

/**
 * Each status with its dot, its word and a quiet count, as one line that wraps:
 * the key to a chart's colours, and with `onValueChange` its filter as well.
 */
export function StatusLegend({
  label,
  items,
  value = null,
  onValueChange,
  countLabel = String,
  className,
}: StatusLegendProps) {
  const content = (item: StatusLegendItem) => (
    <>
      <StatusDot tone={item.tone}>{item.label}</StatusDot>
      <span className="crewlet-status-legend__count">{item.count.toLocaleString()}</span>
    </>
  );
  const named = (item: StatusLegendItem) => `${item.label}, ${countLabel(item.count)}`;

  if (!onValueChange) {
    return (
      <ul className={cx('crewlet-status-legend', className)} aria-label={label}>
        {items.map((item) => (
          <li key={item.key} className="crewlet-status-legend__item" data-empty={item.count === 0 ? '' : undefined}>
            <span className="crewlet-status-legend__face" aria-hidden="true">
              {content(item)}
            </span>
            <VisuallyHidden>{named(item)}</VisuallyHidden>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <div role="group" aria-label={label} className={cx('crewlet-status-legend', className)}>
      {items.map((item) => {
        const pressed = value === item.key;
        return (
          <button
            key={item.key}
            type="button"
            className="crewlet-status-legend__item"
            aria-pressed={pressed}
            data-empty={item.count === 0 ? '' : undefined}
            onClick={() => onValueChange(pressed ? null : item.key)}
          >
            {/* Named by its content, as the list's items are: an aria-label that did not contain the
                visible "Working 4" failed WCAG 2.5.3 (label in name) for a speech user saying it. */}
            <span className="crewlet-status-legend__face" aria-hidden="true">
              {content(item)}
            </span>
            <VisuallyHidden>{named(item)}</VisuallyHidden>
          </button>
        );
      })}
    </div>
  );
}
