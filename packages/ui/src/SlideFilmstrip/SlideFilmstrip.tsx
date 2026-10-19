import { useLayoutEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { EyeOffGlyph, GripVerticalGlyph } from '@crewlethq/icons/glyphs';
import { useReorder } from '../Reorder/index.js';
import { SlideStage } from '../SlideStage/index.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';
import { cx } from '../utils/cx.js';

/** One slide as the filmstrip lists it. */
export interface FilmstripSlide {
  id: string;
  /** What a reader calls it: its first heading. */
  title: string;
  /** Skipped when presenting; drawn dimmed here. */
  hidden?: boolean | undefined;
}

export interface SlideFilmstripLabels {
  /** The list's name. */
  list: string;
  /** A thumbnail's name: "Slide 4, The plan". */
  slide: (position: number, title: string) => string;
  hidden: string;
  untitled: string;
}

const LABELS: SlideFilmstripLabels = {
  list: 'Slides',
  slide: (position, title) => `Slide ${position}, ${title}`,
  hidden: 'Hidden when presenting',
  untitled: 'Untitled',
};

/**
 * Which way the strip runs: a column beside the stage, or a row under it
 * where the stage takes the whole width (a phone).
 */
export type SlideFilmstripOrientation = 'vertical' | 'horizontal';

export interface SlideFilmstripProps {
  slides: readonly FilmstripSlide[];
  /** The slide on the stage. */
  selected: string;
  onSelect: (id: string) => void;
  /** Draws one slide for its thumbnail. */
  renderSlide: (id: string) => ReactNode;
  /**
   * A new order, by a drag or by the arrow keys on a slide's handle. Left
   * out, the filmstrip is read only and draws no handles.
   */
  onReorder?: ((ids: string[]) => void) | undefined;
  orientation?: SlideFilmstripOrientation | undefined;
  className?: string | undefined;
  labels?: Partial<SlideFilmstripLabels> | undefined;
}

/** The keys that step the selection, by the way the strip runs. */
const STEP_KEYS: Readonly<Record<SlideFilmstripOrientation, { back: string; forward: string }>> = {
  vertical: { back: 'ArrowUp', forward: 'ArrowDown' },
  horizontal: { back: 'ArrowLeft', forward: 'ArrowRight' },
};

/**
 * The column of slide thumbnails beside a deck's stage: the slide on the stage
 * marked, each one a press away, and, where the reader may edit, a handle that
 * moves it.
 *
 * ONE STOP IN THE TAB ORDER for the thumbnails: each is a button marked
 * `aria-current` when its slide is on the stage, and only that one is in the
 * tab order; Up and Down (Left and Right in a row) move to the next or
 * previous slide, Home and End to the ends, and the stage follows. A handle is its own control beside its
 * thumbnail, since moving a slide is a different act from looking at it; its
 * arrow keys move the slide, and the move is announced with where it landed.
 * (A listbox would hold the handles inside its options, which a listbox may
 * not.)
 *
 * THE SLIDE ON THE STAGE IS KEPT IN VIEW. The strip is its own scroller, and
 * whenever the selection moves, whether by a press here, by Present, by a link
 * that opened on slide 25 or by following somebody, the strip scrolls just
 * enough to show it, and nothing else on the page moves.
 *
 * THUMBNAILS ARE THE SLIDES THEMSELVES, drawn by the caller at the slide's own
 * size and scaled by `SlideStage`, so what the strip shows is what presents.
 */
export function SlideFilmstrip({
  slides,
  selected,
  onSelect,
  renderSlide,
  onReorder,
  orientation = 'vertical',
  className,
  labels,
}: SlideFilmstripProps) {
  const text = { ...LABELS, ...labels };
  const ids = slides.map((s) => s.id);
  const byId = new Map(slides.map((s) => [s.id, s]));
  const titleOf = (id: string) => byId.get(id)?.title || text.untitled;
  const reorder = useReorder({
    keys: ids,
    onReorder: (next) => onReorder?.(next),
    nameOf: (id) => text.slide(ids.indexOf(id) + 1, titleOf(id)),
    // A ROW IS A ONE-LINE GRID to the reorder: its items are side by side, so
    // a drop lands by the pointer's half across, and Left and Right move too.
    axis: orientation === 'vertical' ? 'vertical' : 'grid',
  });
  const order = onReorder ? reorder.order : ids;
  const options = useRef(new Map<string, HTMLElement>());
  const root = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const port = root.current;
    const item = options.current.get(selected)?.closest('li');
    if (!port || !item) return;
    scrollIntoPort(port, item, orientation);
  }, [selected, orientation]);

  const go = (id: string | undefined) => {
    if (!id) return;
    onSelect(id);
    options.current.get(id)?.focus();
  };
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const at = order.indexOf(selected);
    const step = STEP_KEYS[orientation];
    const to = {
      [step.forward]: order[at + 1],
      [step.back]: order[at - 1],
      Home: order[0],
      End: order[order.length - 1],
    }[event.key];
    if (to === undefined) return;
    event.preventDefault();
    go(to);
  };

  return (
    <div
      ref={root}
      className={cx('crewlet-slide-filmstrip', `crewlet-slide-filmstrip--${orientation}`, className)}
    >
      {onReorder ? <VisuallyHidden id={reorder.hintId}>{reorder.hint}</VisuallyHidden> : null}
      <ol
        className="crewlet-slide-filmstrip__list"
        aria-label={text.list}
        {...(onReorder ? reorder.containerProps : {})}
      >
        {order.map((id, i) => {
          const slide = byId.get(id);
          const isSelected = id === selected;
          return (
            <li
              key={id}
              className="crewlet-slide-filmstrip__item"
              data-selected={isSelected ? 'true' : undefined}
              data-hidden={slide?.hidden ? 'true' : undefined}
              {...(onReorder ? reorder.itemProps(id) : {})}
            >
              <span className="crewlet-slide-filmstrip__number" aria-hidden="true">
                {i + 1}
              </span>
              <button
                type="button"
                ref={(node) => {
                  if (node) options.current.set(id, node);
                  else options.current.delete(id);
                }}
                className="crewlet-slide-filmstrip__thumb"
                aria-current={isSelected ? 'true' : undefined}
                aria-label={text.slide(i + 1, titleOf(id)) + (slide?.hidden ? `, ${text.hidden}` : '')}
                tabIndex={isSelected ? 0 : -1}
                onClick={() => go(id)}
                onKeyDown={onKeyDown}
              >
                <SlideStage label={text.slide(i + 1, titleOf(id))}>{renderSlide(id)}</SlideStage>
                {slide?.hidden ? (
                  <span className="crewlet-slide-filmstrip__hidden">
                    <EyeOffGlyph size="sm" />
                  </span>
                ) : null}
              </button>
              {onReorder ? (
                <button type="button" className="crewlet-slide-filmstrip__handle" {...reorder.handleProps(id)}>
                  <GripVerticalGlyph size="sm" />
                </button>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/**
 * Scroll `port` by the least that shows `item` whole on the strip's axis,
 * with a little of the next one showing so the strip reads as continuing.
 * Only the strip scrolls: `scrollIntoView` would move every scroller above it,
 * the page included.
 */
function scrollIntoPort(port: HTMLElement, item: HTMLElement, orientation: SlideFilmstripOrientation): void {
  const p = port.getBoundingClientRect();
  const r = item.getBoundingClientRect();
  if (orientation === 'vertical') {
    if (port.scrollHeight <= port.clientHeight) return;
    const pad = r.height / 4;
    if (r.top < p.top) port.scrollTop += r.top - p.top - pad;
    else if (r.bottom > p.bottom) port.scrollTop += r.bottom - p.bottom + pad;
  } else {
    if (port.scrollWidth <= port.clientWidth) return;
    const pad = r.width / 4;
    if (r.left < p.left) port.scrollLeft += r.left - p.left - pad;
    else if (r.right > p.right) port.scrollLeft += r.right - p.right + pad;
  }
}
