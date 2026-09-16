import type { CSSProperties, ReactNode } from 'react';
import { cx } from '../utils/cx.js';
import { dataColor } from './dataColor.js';

export interface BarDatum {
  /**
   * What this row is, as a stable identity. REQUIRED: a ranked list is
   * re-ranked by every push, and a row keyed by its position hands the
   * focused row's node to whichever series has taken that place, so a
   * keyboard reader who was on "planner" finds themselves on "reviewer"
   * without having moved.
   */
  id: string;
  label: ReactNode;
  /** Sorting is the caller's; the width is this. */
  value: number;
  /** What the number reads as: "412k", "1.2 s", "38%". Defaults to the value. */
  display?: ReactNode;
  /** A second line under the label. */
  sub?: ReactNode;
  color?: string;
  /** Where the row leads. A link, wherever the destination is an address. */
  href?: string;
  /** What pressing the row does, where it is not a destination. */
  onSelect?: () => void;
}

export interface BarListProps {
  data: BarDatum[];
  /** The value the longest bar stands for. Defaults to the largest present. */
  max?: number;
  /** How many rows to draw. The rest are counted by `moreLabel`. */
  limit?: number;
  /** What the tail says. It is a count, so the caller can phrase it. */
  moreLabel?: (remaining: number) => ReactNode;
  emptyLabel?: ReactNode;
  className?: string;
}

/**
 * A ranked horizontal bar list: the comparison this product asks for most.
 *
 * BARS ARE A FRACTION OF THE LARGEST VALUE, not of the total, because the
 * question is "how does this compare with the biggest one". A total-relative
 * bar makes every row of a long tail an invisible sliver of the same width.
 *
 * A ZERO DRAWS NOTHING. The list used to floor every bar at 1.5 percent so
 * that a zero still had a sliver, which is a picture of a quantity that is
 * not there: a seat that spent nothing and a seat that spent a little read
 * the same. The number beside the label is what says zero.
 *
 * The bar is decoration. Every row carries its label and its value as text,
 * so the bar adds a shape to a number that is already readable, and a reader
 * who cannot see it has lost nothing.
 */
export function BarList({
  data,
  max,
  limit,
  moreLabel = (remaining) => `and ${remaining} more`,
  emptyLabel = 'Nothing recorded in this window',
  className,
}: BarListProps) {
  /*
   * `limit` is a COUNT, and zero is a count. Read as truthy, `limit={0}` said
   * "no limit" and drew every row, which is the opposite of what a caller
   * computing a limit from a viewport or a preference asked for.
   */
  const capped = limit != null;
  const shown = capped ? data.slice(0, limit) : data;
  const top = max ?? Math.max(1, ...data.map((datum) => datum.value));
  const remaining = capped ? Math.max(0, data.length - limit) : 0;

  if (!shown.length) return <p className="crewlet-bar-list__empty">{emptyLabel}</p>;

  return (
    // A list, and said to be one: the markers are off, and WebKit drops the
    // list role with them. See Legend for the same note, including why the
    // redundant-role rule is silenced rather than obeyed.
    // eslint-disable-next-line jsx-a11y/no-redundant-roles
    <ul role="list" className={cx('crewlet-bar-list', className)}>
      {shown.map((datum, index) => {
        const width = top > 0 && datum.value > 0 ? Math.max(1, (datum.value / top) * 100) : 0;
        const body = (
          <>
            <span className="crewlet-bar-list__head">
              <span className="crewlet-bar-list__label">{datum.label}</span>
              <span className="crewlet-bar-list__value">{datum.display ?? datum.value.toLocaleString()}</span>
            </span>
            {/*
              * The track is hidden from the accessibility tree: it is the
              * value beside it, drawn. A screen reader that also read the bar
              * would say the same number twice, in a shape it cannot see.
              */}
            <span className="crewlet-bar-list__track" aria-hidden>
              {width > 0 && (
                <span
                  className="crewlet-bar-list__bar"
                  style={{
                    width: `${width}%`,
                    '--crewlet-bar-list-bar-color': datum.color ?? dataColor(index),
                  } as CSSProperties}
                />
              )}
            </span>
            {datum.sub && <span className="crewlet-bar-list__sub">{datum.sub}</span>}
          </>
        );
        return (
          <li key={datum.id} className="crewlet-bar-list__item">
            {datum.href ? (
              <a className="crewlet-bar-list__row crewlet-bar-list__row--pressable" href={datum.href}>
                {body}
              </a>
            ) : datum.onSelect ? (
              <button
                type="button"
                className="crewlet-bar-list__row crewlet-bar-list__row--pressable"
                onClick={datum.onSelect}
              >
                {body}
              </button>
            ) : (
              <span className="crewlet-bar-list__row">{body}</span>
            )}
          </li>
        );
      })}
      {remaining > 0 && (
        <li className="crewlet-bar-list__more">{moreLabel(remaining)}</li>
      )}
    </ul>
  );
}
