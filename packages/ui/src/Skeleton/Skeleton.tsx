import { useEffect, useState, type CSSProperties } from 'react';
import { motion } from '@crewlethq/tokens';
import { VisuallyHidden } from '../VisuallyHidden/index.js';
import { tokenMs } from '../utils/tokenMs.js';
import { cx } from '../utils/cx.js';

export type SkeletonVariant =
  | 'box'
  | 'text'
  | 'card'
  | 'grid'
  | 'list'
  | 'table'
  | 'info-grid'
  | 'pricing-card'
  | 'chat';

export interface SkeletonProps {
  variant?: SkeletonVariant;
  /** Row count for `text`, `grid`, `list`, `table` and `info-grid`, and the message count for `chat`. */
  rows?: number;
  /**
   * How tall each line of the `text` variant is. A number of px, or a CSS
   * length. Unset, the stylesheet's own step, which is a line of body text.
   */
  rowHeight?: number | string;
  /** Column count for `table`, and for `grid` and `info-grid` (1 to 4). */
  columns?: number;
  /** Card count for `pricing-card`. */
  count?: number;
  /**
   * What is loading, said once for a reader who cannot see the placeholder.
   * Rendered in a polite status region beside it: "Loading seats".
   *
   * THE `aria-busy` BELONGS TO THE REGION THAT IS LOADING, not to this
   * element. A placeholder is the thing that is there INSTEAD of the content,
   * so marking it busy says the placeholder is loading; the panel or the list
   * whose content has not arrived is what a reader is waiting on, and that is
   * the element its caller puts `aria-busy` on.
   */
  label?: string;
  /**
   * Holds the placeholder and its label back for the first moments of a load
   * (the slow and base steps, 450ms), so an answer that arrives quickly never
   * flashes a placeholder on the way in.
   */
  held?: boolean;
  /** Applied to the root element of every variant. */
  className?: string;
  /** Applied to the root element of every variant. */
  style?: CSSProperties;
  /**
   * The placeholder's size, on every variant: a box is drawn at it, and any
   * other shape is cut to it, so a placeholder sized for the value it stands
   * for does not move the layout when the value lands. Unset, a box is the
   * column's width and 400px tall, and any other shape its own size.
   */
  width?: number | string;
  height?: number | string;
  /* box-only props */
  /** A number of px, or any CSS length, such as a radius token: `var(--radius-md)`. */
  borderRadius?: number | string;
  marginTop?: number;
  marginBottom?: number;
}

// A transcript's rhythm: first rows with a face and a name, continued rows
// under them, and lines of uneven length, so the placeholder reads as talk.
const CHAT_SHAPES: ReadonlyArray<{ first: boolean; lines: readonly string[] }> = [
  { first: true, lines: ['88%', '52%'] },
  { first: false, lines: ['64%'] },
  { first: true, lines: ['76%'] },
  { first: true, lines: ['92%', '84%', '40%'] },
  { first: false, lines: ['58%'] },
  { first: true, lines: ['70%'] },
];

// The slow and base steps together: long enough that a quick answer lands
// before anything is drawn, short enough that a slow one is still announced.
const HOLD_MS = tokenMs(motion.duration.slow) + tokenMs(motion.duration.base);

const range = (n: number) => Array.from({ length: Math.max(0, n) }, (_, i) => i);

// The grid layouts define column templates for 1 to 4 columns, so a value
// outside that range is clamped rather than collapsing the grid to an
// unstyled single column.
const clampColumns = (n: number) => Math.min(4, Math.max(1, Math.round(n)));

const line = (...modifiers: string[]) =>
  cx('crewlet-skeleton__line', ...modifiers.map((modifier) => `crewlet-skeleton__line--${modifier}`));

/**
 * The drawing itself, which is decoration and hidden from assistive
 * technology at every variant.
 */
const Placeholder = ({
  variant = 'card',
  rows = 1,
  rowHeight,
  columns = 1,
  count = 4,
  className = '',
  style,
  width,
  height,
  borderRadius = 12,
  marginTop = 0,
  marginBottom = 0,
}: SkeletonProps) => {
  const rootClass = (...modifiers: Array<string | false | undefined>) =>
    cx('crewlet-skeleton', `crewlet-skeleton--${variant}`, ...modifiers, className);
  const length = (value: number | string | undefined) => (typeof value === 'number' ? `${value}px` : value);
  // A size asked of a shape other than a box cuts the shape to it.
  const sized =
    width !== undefined || height !== undefined
      ? ({ boxSizing: 'border-box', width: length(width), height: length(height), overflow: 'hidden', ...style } as CSSProperties)
      : style;

  switch (variant) {
    case 'box':
      return (
        <div className={rootClass()} style={{ marginTop, marginBottom, ...style }} aria-hidden>
          <div
            className="crewlet-skeleton__glow-box"
            style={{
              height: length(height ?? 400),
              width: length(width ?? '100%'),
              borderRadius: typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius,
            }}
          >
            <div className="crewlet-skeleton__glow-wave" />
          </div>
        </div>
      );

    case 'text':
      return (
        <div className={rootClass()} style={sized} aria-hidden>
          {range(rows).map((i) => (
            <div
              key={i}
              className={line(i === 0 ? 'title' : 'text', ...(i === rows - 1 ? ['short'] : []))}
              style={rowHeight === undefined ? undefined : { height: rowHeight }}
            />
          ))}
        </div>
      );

    case 'card':
      return (
        <div className={rootClass()} style={sized} aria-hidden>
          <div className={line('title')} />
          <div className={line('text')} />
          <div className={line('text', 'short')} />
        </div>
      );

    case 'grid': {
      const cols = clampColumns(columns);
      return (
        <div className={rootClass(`crewlet-skeleton--cols-${cols}`)} style={sized} aria-hidden>
          {range(rows * cols).map((i) => (
            <div key={i} className="crewlet-skeleton__card">
              <div className={line('title')} />
              <div className={line('text')} />
              <div className={line('text', 'short')} />
            </div>
          ))}
        </div>
      );
    }

    case 'list':
      return (
        <div className={rootClass()} style={sized} aria-hidden>
          {range(rows).map((i) => (
            <div key={i} className="crewlet-skeleton__list-item">
              <div className="crewlet-skeleton__avatar" />
              <div className="crewlet-skeleton__list-content">
                <div className={line('title')} />
                <div className={line('text', 'short')} />
              </div>
            </div>
          ))}
        </div>
      );

    case 'table':
      return (
        <div className={rootClass()} style={sized} aria-hidden>
          <table className="crewlet-skeleton__table">
            <thead>
              <tr>
                {range(columns).map((i) => (
                  <th key={i} className="crewlet-skeleton__th">
                    <div className={line('title')} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {range(rows).map((rowIndex) => (
                <tr key={rowIndex} className="crewlet-skeleton__tr">
                  {range(columns).map((colIndex) => (
                    <td key={colIndex} className="crewlet-skeleton__td">
                      <div className={line('text')} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case 'info-grid': {
      const cols = clampColumns(columns);
      return (
        <div className={rootClass(`crewlet-skeleton--cols-${cols}`)} style={sized} aria-hidden>
          {range(rows * cols).map((i) => (
            <div key={i} className="crewlet-skeleton__info-item">
              <div className={line('label')} />
              <div className={line('value')} />
            </div>
          ))}
        </div>
      );
    }

    case 'pricing-card':
      return (
        <div className={rootClass()} style={sized} aria-hidden>
          {range(count).map((i) => (
            <div key={i} className="crewlet-skeleton__pricing-card">
              <div className="crewlet-skeleton__pricing-card-header">
                <div className="crewlet-skeleton__circle" />
                <div className={line('heading')} />
              </div>
              <div className="crewlet-skeleton__pricing-card-description">
                <div className={line('text')} />
                <div className={line('text', 'wide')} />
                <div className={line('text', 'three-quarter')} />
              </div>
              <div className="crewlet-skeleton__pricing-card-features">
                {range(5).map((f) => (
                  <div key={f} className="crewlet-skeleton__pricing-card-feature">
                    <div className="crewlet-skeleton__circle crewlet-skeleton__circle--small" />
                    <div className={line('feature')} />
                  </div>
                ))}
              </div>
              <div className="crewlet-skeleton__button" />
            </div>
          ))}
        </div>
      );

    case 'chat':
      return (
        <div className={rootClass()} style={sized} aria-hidden>
          {range(rows).map((i) => {
            const shape = CHAT_SHAPES[i % CHAT_SHAPES.length]!;
            return (
              <div key={i} className={cx('crewlet-skeleton__message', shape.first && 'crewlet-skeleton__message--first')}>
                {shape.first ? <div className="crewlet-skeleton__avatar" /> : null}
                <div className="crewlet-skeleton__message-words">
                  {shape.first ? <div className={line('name')} /> : null}
                  {shape.lines.map((width, n) => (
                    <div key={n} className={line('words')} style={{ width }} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      );

    default:
      return (
        <div className={cx('crewlet-skeleton', className)} style={sized} aria-hidden>
          <div className="crewlet-skeleton__line" />
        </div>
      );
  }
};

/**
 * Loading placeholder.
 *
 * `chat` is a transcript's: message rows on the conversation scale
 * (`--crewlet-chat-*`), standing at the foot of the space it is given, where
 * the newest messages will land.
 *
 * ONLY WHERE CONTENT OF KNOWN SHAPE IS COMING. A spinner in place of a screen
 * tells a reader nothing about what to expect; a placeholder that matches the
 * shape of what will arrive tells them how much of it there is and stops the
 * page moving when it does.
 *
 * The drawing is decoration and is hidden. `label` is what a reader who cannot
 * see it is told, said once in a polite region; the `aria-busy` that goes with
 * it belongs on the region whose content has not arrived, which is the
 * caller's own element rather than this one.
 */
export const Skeleton = ({ label, held = false, ...placeholder }: SkeletonProps) => {
  const [shown, setShown] = useState(!held);
  useEffect(() => {
    if (shown) return undefined;
    const timer = setTimeout(() => setShown(true), HOLD_MS);
    return () => clearTimeout(timer);
  }, [shown]);
  if (!shown) return null;
  return (
    <>
      <Placeholder {...placeholder} />
      {label === undefined ? null : (
        <VisuallyHidden>
          <span role="status">{label}</span>
        </VisuallyHidden>
      )}
    </>
  );
};
