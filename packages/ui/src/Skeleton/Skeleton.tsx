import type { CSSProperties } from 'react';

export type SkeletonVariant =
  | 'box'
  | 'text'
  | 'card'
  | 'grid'
  | 'list'
  | 'table'
  | 'info-grid'
  | 'pricing-card';

export type SkeletonGlow = 'blue' | 'green' | 'purple' | 'orange' | 'red';

export interface SkeletonProps {
  variant?: SkeletonVariant;
  /** Row count for `text`, `grid`, `list`, `table` and `info-grid`. */
  rows?: number;
  /** Column count for `table`, and for `grid` and `info-grid` (1 to 4). */
  columns?: number;
  /** Card count for `pricing-card`. */
  count?: number;
  /** Applied to the root element of every variant. */
  className?: string;
  /** Applied to the root element of every variant. */
  style?: CSSProperties;
  /* box-only props */
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  marginTop?: number;
  marginBottom?: number;
  glowColor?: SkeletonGlow;
  animationDuration?: number;
}

const range = (n: number) => Array.from({ length: Math.max(0, n) }, (_, i) => i);

// The grid layouts define column templates for 1 to 4 columns, so a value
// outside that range is clamped rather than collapsing the grid to an
// unstyled single column.
const clampColumns = (n: number) => Math.min(4, Math.max(1, Math.round(n)));

const cx = (...classes: Array<string | false | undefined>) => classes.filter(Boolean).join(' ');

const line = (...modifiers: string[]) =>
  cx('crewlet-skeleton__line', ...modifiers.map((modifier) => `crewlet-skeleton__line--${modifier}`));

/**
 * Loading placeholder. Every variant renders one root element carrying
 * `crewlet-skeleton`, a `crewlet-skeleton--<variant>` modifier, and the
 * caller's `className` and `style`. The placeholder is decorative, so it
 * is hidden from assistive technology; announce the loading state on the
 * region that is loading (for example with `aria-busy`).
 */
export const Skeleton = ({
  variant = 'card',
  rows = 1,
  columns = 1,
  count = 4,
  className = '',
  style,
  width = '100%',
  height = 400,
  borderRadius = 12,
  marginTop = 32,
  marginBottom = 0,
  glowColor = 'blue',
  animationDuration = 2,
}: SkeletonProps) => {
  const rootClass = (...modifiers: Array<string | false | undefined>) =>
    cx('crewlet-skeleton', `crewlet-skeleton--${variant}`, ...modifiers, className);

  switch (variant) {
    case 'box':
      return (
        <div className={rootClass()} style={{ marginTop, marginBottom, ...style }} aria-hidden>
          <div
            className="crewlet-skeleton__glow-box"
            style={{
              height: typeof height === 'number' ? `${height}px` : height,
              width: typeof width === 'number' ? `${width}px` : width,
              borderRadius: `${borderRadius}px`,
            }}
          >
            <div
              className={`crewlet-skeleton__glow-wave crewlet-skeleton__glow-wave--${glowColor}`}
              style={{ animationDuration: `${animationDuration}s` }}
            />
          </div>
        </div>
      );

    case 'text':
      return (
        <div className={rootClass()} style={style} aria-hidden>
          {range(rows).map((i) => (
            <div key={i} className={line(i === 0 ? 'title' : 'text', ...(i === rows - 1 ? ['short'] : []))} />
          ))}
        </div>
      );

    case 'card':
      return (
        <div className={rootClass()} style={style} aria-hidden>
          <div className={line('title')} />
          <div className={line('text')} />
          <div className={line('text', 'short')} />
        </div>
      );

    case 'grid': {
      const cols = clampColumns(columns);
      return (
        <div className={rootClass(`crewlet-skeleton--cols-${cols}`)} style={style} aria-hidden>
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
        <div className={rootClass()} style={style} aria-hidden>
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
        <div className={rootClass()} style={style} aria-hidden>
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
        <div className={rootClass(`crewlet-skeleton--cols-${cols}`)} style={style} aria-hidden>
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
        <div className={rootClass()} style={style} aria-hidden>
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

    default:
      return (
        <div className={cx('crewlet-skeleton', className)} style={style} aria-hidden>
          <div className="crewlet-skeleton__line" />
        </div>
      );
  }
};
