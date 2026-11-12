import { useId } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { cx } from '../utils/cx.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';
import { dataColor } from './dataColor.js';
import type { StackedSegment } from './StackedBar.js';

export interface StackedRingProps {
  /** The parts of the whole, as a StackedBar takes them: a part's colour is its place in the list. */
  segments: StackedSegment[];
  /** What stands in the middle: the whole as a figure, such as "52". */
  children?: ReactNode;
  /** How wide and tall the ring is, as a CSS length. */
  size?: string;
  /**
   * How the parts are read out, for anybody who cannot see the ring. The
   * default names each part and its share.
   */
  summary?: (parts: { label: string; value: number; percent: number }[]) => string;
  /** How a value reads out in the default sentence. Defaults to the reader's own number format. */
  format?: (value: number) => string;
  /** What is read out when no part holds anything. */
  emptyLabel?: string;
  className?: string;
}

/** The ring's own geometry, in its viewBox: a 64 unit square, a 6 unit line. */
const BOX = 64;
const LINE = 6;
const RADIUS = (BOX - LINE) / 2;
const ROUND = 2 * Math.PI * RADIUS;
/** The room between two parts, taken out of the parts as a StackedBar's is. */
const GAP = 2;

/**
 * One whole, split into its parts, round a figure: the lead tile of a summary
 * band, where the figure is the whole and the ring says how it divides.
 *
 * ALWAYS BESIDE ITS KEYS. Like a StackedBar the ring carries no labels, so the
 * parts are named beside it (a Legend, or lines of words with their counts),
 * keyed from the same list. Where the parts need reading one by one, a
 * StackedBar does that; the ring is a picture beside words that already say
 * everything it does.
 *
 * A ZERO PART IS NOT DRAWN, and a whole of nothing is the empty track round
 * its figure, never a ring that reads as full.
 *
 * THE VALUES ARE IN THE MARKUP: the summary sentence is the ring's name.
 */
export function StackedRing({
  segments,
  children,
  size = '4rem',
  summary,
  format = (value) => value.toLocaleString(),
  emptyLabel = 'Nothing recorded',
  className,
}: StackedRingProps) {
  const named = useId();
  const total = segments.reduce((sum, segment) => sum + Math.max(0, segment.value), 0);
  const drawn = segments
    .map((segment, index) => ({ ...segment, color: segment.color ?? dataColor(index) }))
    .filter((segment) => segment.value > 0);
  const parts = drawn.map((segment) => ({
    label: segment.label,
    value: segment.value,
    percent: total > 0 ? Math.round((segment.value / total) * 100) : 0,
  }));
  const sentence =
    drawn.length === 0
      ? emptyLabel
      : summary
        ? summary(parts)
        : parts.map((part) => `${part.label}: ${format(part.value)} (${part.percent}%)`).join(', ');
  const gap = drawn.length > 1 ? GAP : 0;
  let from = 0;
  const arcs = drawn.map((segment) => {
    const length = (segment.value / total) * ROUND;
    const arc = { id: segment.id, color: segment.color, from, length: Math.max(0.01, length - gap) };
    from += length;
    return arc;
  });
  const circles = (className: string) =>
    arcs.map((arc) => (
      <circle
        key={arc.id}
        className={className}
        cx={BOX / 2}
        cy={BOX / 2}
        r={RADIUS}
        strokeDasharray={`${arc.length.toFixed(2)} ${(ROUND - arc.length).toFixed(2)}`}
        strokeDashoffset={(-arc.from).toFixed(2)}
        style={{ '--crewlet-stacked-ring-segment-color': arc.color } as CSSProperties}
      />
    ));
  return (
    <div
      className={cx('crewlet-stacked-ring', className)}
      style={{ '--crewlet-stacked-ring-size': size } as CSSProperties}
    >
      <svg
        className="crewlet-stacked-ring__plot"
        viewBox={`0 0 ${BOX} ${BOX}`}
        role="img"
        aria-labelledby={named}
        focusable="false"
      >
        <circle className="crewlet-stacked-ring__track" cx={BOX / 2} cy={BOX / 2} r={RADIUS} />
        {/* The halo is the arcs again, blurred and at half strength, so each arc glows in its own colour. */}
        <g className="crewlet-stacked-ring__halo">{circles('crewlet-stacked-ring__arc')}</g>
        <g>{circles('crewlet-stacked-ring__arc')}</g>
      </svg>
      {children !== undefined && children !== null ? (
        <span className="crewlet-stacked-ring__figure">{children}</span>
      ) : null}
      <VisuallyHidden id={named}>{sentence}</VisuallyHidden>
    </div>
  );
}
