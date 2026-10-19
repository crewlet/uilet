import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { cx } from '../utils/cx.js';
import { useFitInView } from './fitInView.js';

/** A presentation's stage: 1920 by 1080 CSS pixels, 16:9. */
export const SLIDE_WIDTH = 1920;
export const SLIDE_HEIGHT = 1080;

/**
 * How a stage fills its box.
 *
 * - `width`: as wide as its container, as tall as 16:9 makes it. A filmstrip
 *   thumbnail, a grid card, the editor's slide.
 * - `contain`: as large as fits inside its container both ways, centred, the
 *   rest letterboxed. Present, full screen.
 * - `view`: Present in the page. As `contain`, in a box as tall as lets the
 *   stage's parent (the show: the stage and its controls) be seen whole, from
 *   its top to the foot of the view; in full screen, the whole box.
 */
export type SlideStageFit = 'width' | 'contain' | 'view';

export interface SlideStageProps {
  /** The slide, laid out at the stage's own size (1920 by 1080 by default). */
  children: ReactNode;
  /** The slide's accessible name: "Slide 4 of 12, The plan". */
  label: string;
  fit?: SlideStageFit | undefined;
  /**
   * A fixed scale instead of one measured from the box: print, where the page
   * is known and a measurement taken on screen would be the wrong one.
   */
  scale?: number | undefined;
  /** The stage's own size, for a format other than 16:9 at 1920. */
  width?: number | undefined;
  height?: number | undefined;
  /**
   * What a screen reader calls what the stage holds: "slide" by default,
   * "artboard" for a design's board shown at its own layout.
   */
  roleDescription?: string | undefined;
  className?: string | undefined;
}

/**
 * A slide drawn at its authored size and scaled to whatever box it is given.
 *
 * ONE LAYOUT AT EVERY SIZE. A slide is authored on a fixed 1920 by 1080 stage,
 * with pixel font sizes and pinned positions, so it is laid out at exactly that
 * size and then scaled as a whole: a thumbnail, the editor and a projector all
 * show the same line breaks. Reflowing it to the box would move every pinned
 * element relative to the text beside it.
 *
 * SEEN WHOLE IN THE PAGE (`fit="view"`): the stage's height is measured too,
 * as the room from its parent's top to the foot of the scrollport less what
 * else the parent holds, or the slide's height at the stage's width if that
 * is less, so the slide's foot and the controls under it are never below the
 * fold. A parent too low on the page to get half of that takes the whole view
 * and is scrolled to, clear of its `scroll-margin-top` and
 * `scroll-margin-bottom`. The parent's height follows its content.
 *
 * MEASURED, NOT GUESSED: the scale is the box's own size over the stage's,
 * read whenever the box resizes, so a filmstrip that narrows or a window that
 * goes full screen redraws at the new size. A `scale` given outright is used
 * as is, for print.
 *
 * A GROUP NAMED AS A SLIDE, so a screen reader announces "slide" with its
 * name and reads its text in source order, which is the slide's reading order.
 */
export function SlideStage({
  children,
  label,
  fit = 'width',
  scale,
  width = SLIDE_WIDTH,
  height = SLIDE_HEIGHT,
  roleDescription = 'slide',
  className,
}: SlideStageProps) {
  const box = useRef<HTMLDivElement | null>(null);
  const viewHeight = useFitInView(box, fit === 'view' && scale === undefined, height / width);
  const [measured, setMeasured] = useState<{ scale: number; left: number; top: number }>({
    scale: 0,
    left: 0,
    top: 0,
  });

  useLayoutEffect(() => {
    const el = box.current;
    if (!el || scale !== undefined) return undefined;
    const read = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (fit !== 'width') {
        const s = Math.min(w / width, h / height);
        setMeasured({ scale: s, left: (w - width * s) / 2, top: (h - height * s) / 2 });
      } else {
        setMeasured({ scale: w / width, left: 0, top: 0 });
      }
    };
    read();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(read);
    observer.observe(el);
    return () => observer.disconnect();
  }, [fit, scale, width, height, viewHeight]);

  const s = scale ?? measured.scale;
  const boxStyle: CSSProperties =
    fit === 'width' || scale !== undefined
      ? { aspectRatio: `${width} / ${height}`, ...(scale !== undefined ? { width: width * scale } : {}) }
      : fit === 'view'
        ? ({
            '--crewlet-slide-stage-ratio': `${width} / ${height}`,
            ...(viewHeight !== null ? { height: viewHeight } : {}),
          } as CSSProperties)
        : {};
  const frameStyle: CSSProperties = {
    width,
    height,
    transform: `translate(${scale === undefined ? measured.left : 0}px, ${scale === undefined ? measured.top : 0}px) scale(${s})`,
    // Hidden until measured, so a slide is never painted at full size for
    // one frame inside a thumbnail.
    visibility: s > 0 ? 'visible' : 'hidden',
  };
  return (
    <div
      ref={box}
      className={cx('crewlet-slide-stage', `crewlet-slide-stage--${fit}`, className)}
      style={boxStyle}
      role="group"
      aria-roledescription={roleDescription}
      aria-label={label}
    >
      <div className="crewlet-slide-stage__frame" style={frameStyle}>
        {children}
      </div>
    </div>
  );
}
