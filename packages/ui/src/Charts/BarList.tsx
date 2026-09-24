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

/**
 * Where a row's bar stands against its words.
 *
 * `stacked`, the default, is the UNDERLINE register: the label and its value
 * on one line, and a thin bar across the whole row under them, for a list
 * read as a list of names with a measure under each.
 *
 * `beside` is the design's own ranked figure, the Home screen's "Tokens by
 * team" and Spend's "By model": the label (and its `sub`) in a column of its
 * own, then a bar up to 12px thick, then the value at the bar's END, so a
 * reader's eye runs from the name along the bar to the number. It draws no
 * track: the bars share one baseline and the longest reaches the end of the
 * scale, which is all a track would say.
 */
export type BarListLayout = 'stacked' | 'beside';

export interface BarListProps {
  data: BarDatum[];
  /** Where the bar stands against the words: see the type. Defaults to `stacked`. */
  layout?: BarListLayout;
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
  layout = 'stacked',
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
    <ul role="list" className={cx('crewlet-bar-list', `crewlet-bar-list--${layout}`, className)}>
      {shown.map((datum, index) => {
        const width = top > 0 && datum.value > 0 ? Math.max(1, (datum.value / top) * 100) : 0;
        const bar =
          width > 0 ? (
            <span
              className="crewlet-bar-list__bar"
              aria-hidden
              style={{
                width: `${width}%`,
                '--crewlet-bar-list-bar-color': datum.color ?? dataColor(index),
              } as CSSProperties}
            />
          ) : null;
        const value = <span className="crewlet-bar-list__value">{datum.display ?? datum.value.toLocaleString()}</span>;
        /*
         * BESIDE: the words in a column of their own, then the bar and the
         * value at its end. The bar's width is a share of the SCALE, which is
         * the plot less the room kept for a value (`--crewlet-bar-list-value-room`),
         * so the longest bar's value still has somewhere to stand and every
         * bar is measured against the same length. Read in that order too: the
         * name, what it is, and then its number; the bar, as ever, is hidden.
         *
         * THE SPACES BETWEEN THE PARTS ARE REAL, in both layouts. A row that
         * leads somewhere is a link named by its content, and spans joined
         * with nothing between them named it "planner180"; every part sits in
         * a flex row, which draws no text node of whitespace alone, so the
         * spaces cost the layout nothing.
         */
        const body =
          layout === 'beside' ? (
            <>
              <span className="crewlet-bar-list__names">
                <span className="crewlet-bar-list__label">{datum.label}</span>
                {datum.sub && (
                  <>
                    {' '}
                    <span className="crewlet-bar-list__sub">{datum.sub}</span>
                  </>
                )}
              </span>{' '}
              <span className="crewlet-bar-list__plot">
                <span className="crewlet-bar-list__scale">
                  {bar}
                  {value}
                </span>
              </span>
            </>
          ) : (
            <>
              <span className="crewlet-bar-list__head">
                <span className="crewlet-bar-list__label">{datum.label}</span> {value}
              </span>
              {/*
               * The track is hidden from the accessibility tree: it is the
               * value beside it, drawn. A screen reader that also read the bar
               * would say the same number twice, in a shape it cannot see.
               */}
              <span className="crewlet-bar-list__track" aria-hidden>
                {bar}
              </span>
              {datum.sub && (
                <>
                  {' '}
                  <span className="crewlet-bar-list__sub">{datum.sub}</span>
                </>
              )}
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
