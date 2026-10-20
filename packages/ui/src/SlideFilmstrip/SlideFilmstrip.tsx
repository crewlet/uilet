import { useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { CopyGlyph, EllipsisGlyph, EyeOffGlyph, GripVerticalGlyph, TrashGlyph } from '@crewlethq/icons/glyphs';
import { Kbd, isApplePlatform } from '../Kbd/index.js';
import { Menu, type MenuEntry } from '../Menu/index.js';
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
  /** A slide's actions menu: "Actions for slide 4, The plan". */
  actions: (position: number, title: string) => string;
  duplicate: string;
  delete: string;
}

const LABELS: SlideFilmstripLabels = {
  list: 'Slides',
  slide: (position, title) => `Slide ${position}, ${title}`,
  hidden: 'Hidden when presenting',
  untitled: 'Untitled',
  actions: (position, title) => `Actions for slide ${position}, ${title}`,
  duplicate: 'Duplicate slide',
  delete: 'Delete slide',
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
  /**
   * Copy a slide in place, after itself: Command+D (Control+D elsewhere) on
   * its thumbnail, or its actions menu. Left out, nothing duplicates.
   */
  onDuplicate?: ((id: string) => void) | undefined;
  /**
   * Remove a slide: Delete or Backspace on its thumbnail, or its actions
   * menu. Left out, nothing deletes. The caller moves the selection.
   */
  onDelete?: ((id: string) => void) | undefined;
  /** Further entries of a slide's actions menu, after Duplicate and Delete. */
  actions?: ((id: string) => readonly MenuEntry[]) | undefined;
  /**
   * What follows the last slide inside the strip, such as a New slide
   * control, so it scrolls with the slides it adds to.
   */
  footer?: ReactNode;
  className?: string | undefined;
  labels?: Partial<SlideFilmstripLabels> | undefined;
}

/**
 * The delete key as the reader's keyboard names it: the key marked Delete on
 * an Apple keyboard is Backspace to the browser, and both delete here.
 */
const DELETE_KEY = (): string => (isApplePlatform() ? 'Backspace' : 'Delete');

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
 *
 * A SLIDE'S ACTIONS ARE KEYS ON ITS THUMBNAIL AND A MENU BESIDE IT, as a
 * presentation editor's filmstrip has them: Command+D (Control+D) duplicates,
 * Delete or Backspace deletes, and the menu names both with their keys, so the
 * pointer and the keyboard reach the same acts and the menu teaches the keys.
 * The menu's trigger is out of the tab order, since the thumbnail's keys reach
 * every act it holds and the Menu key (or Shift+F10) opens it from there.
 */
export function SlideFilmstrip({
  slides,
  selected,
  onSelect,
  renderSlide,
  onReorder,
  orientation = 'vertical',
  onDuplicate,
  onDelete,
  actions,
  footer,
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
  // The slide whose actions menu is open: its trigger, or the Menu key (or
  // Shift+F10) on its thumbnail, which returns focus to the thumbnail on close.
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const menuOf = (id: string): MenuEntry[] => [
    ...(onDuplicate
      ? [{ key: 'duplicate', label: text.duplicate, icon: <CopyGlyph size="sm" />, onSelect: () => onDuplicate(id),
          hint: <Kbd subtle keys={['Mod', 'D']} /> }]
      : []),
    ...(onDelete
      ? [{ key: 'delete', label: text.delete, icon: <TrashGlyph size="sm" />, onSelect: () => onDelete(id),
          danger: true, hint: <Kbd subtle keys={[DELETE_KEY()]} /> }]
      : []),
    ...(actions?.(id) ?? []),
  ];
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const mod = event.metaKey || event.ctrlKey;
    if (onDuplicate && mod && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'd') {
      event.preventDefault();
      onDuplicate(selected);
      return;
    }
    if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
      if (menuOf(selected).length === 0) return;
      event.preventDefault();
      setMenuFor(selected);
      return;
    }
    if (onDelete && !mod && !event.altKey && (event.key === 'Delete' || event.key === 'Backspace')) {
      event.preventDefault();
      onDelete(selected);
      return;
    }
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
          const menu = menuOf(id);
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
              {onReorder || menu.length > 0 ? (
                <span className="crewlet-slide-filmstrip__controls">
                  {onReorder ? (
                    <button type="button" className="crewlet-slide-filmstrip__handle" {...reorder.handleProps(id)}>
                      <GripVerticalGlyph size="sm" />
                    </button>
                  ) : null}
                  {menu.length > 0 ? (
                    <Menu
                      label={text.actions(i + 1, titleOf(id))}
                      icon={<EllipsisGlyph size="sm" />}
                      triggerTabIndex={-1}
                      items={menu}
                      open={menuFor === id}
                      onOpenChange={(open) => setMenuFor(open ? id : null)}
                    />
                  ) : null}
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
      {footer ? <div className="crewlet-slide-filmstrip__footer">{footer}</div> : null}
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
