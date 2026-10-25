/**
 * The peek: one object, beside whatever list the reader found it in.
 *
 * A list opens it by naming what it points at, and it shows that object's
 * facts in a rail beside the list rather than sending the reader away to read
 * one title. The rail has a bar (step to the previous or next row, open the
 * object's own page, close) and a scrolling body.
 *
 * # Where it stands
 *
 * A column of the shell's sheet beside the scroller (`AppShell` `peek`) while
 * the window holds the list at its floor beside it, and a drawer over the
 * page below that, behind a veil a press on which closes it. Which one is the
 * host's arithmetic (`AppShell` `peekShape`), never a media query: the width
 * that leaves the list its floor depends on everything else in the frame and
 * on the density. The drawer is not modal: the list under it stays live, as
 * it is beside the column.
 *
 * # Width
 *
 * The width is the host's (`width`), dragged on the grip between `minWidth`
 * and `maxWidth` and kept per viewer with `useStoredWidth`. As a column it is
 * capped at what leaves the list `reserve` wide, so a width dragged on a wide
 * window never takes a narrower one's list away. The grip is a separator with
 * a value, so the keyboard sizes it as well as the pointer.
 *
 * # What the host keeps
 *
 * The address (which object, opening pushes and stepping replaces), the
 * keys that step and close from anywhere on the page, and the body for each
 * kind of object. `PeekHost` wires the generic half of that; the rail itself
 * draws and closes.
 */

import { useEffect, useRef, type ReactNode } from 'react';
import { ArrowUpRightGlyph, ChevronDownGlyph, ChevronUpGlyph, XGlyph } from '@crewlethq/icons/glyphs';
import { ResizeHandle } from '../AppShell/ResizeHandle.js';
import { useAppShellPeek, type AppShellPeekShape } from '../AppShell/regions.js';
import { ButtonLink } from '../Button/index.js';
import { IconButton } from '../IconButton/index.js';
import { cx } from '../utils/cx.js';

/** The rail's resting width, in px, beside a list. */
export const PEEK_RAIL_WIDTH = 420;
/** The narrowest a reader may drag it, in px. */
export const PEEK_RAIL_MIN_WIDTH = 330;
/** The widest, in px. */
export const PEEK_RAIL_MAX_WIDTH = 640;

export interface PeekRailLabels {
  previous: string;
  next: string;
  close: string;
  open: string;
  resize: string;
  /** The tooltip on Previous, where it says more than the name: "Previous ([)". */
  previousHint?: string | undefined;
  /** The tooltip on Next: "Next (])". */
  nextHint?: string | undefined;
  /** The tooltip on Close: "Close (esc)". */
  closeHint?: string | undefined;
}

export const PEEK_RAIL_LABELS: PeekRailLabels = {
  previous: 'Previous',
  next: 'Next',
  close: 'Close',
  open: 'Open',
  resize: 'Resize the detail panel',
};

export interface PeekRailProps {
  /** Names the rail: "Task detail". */
  label: string;
  /** Where it stands; in the shell's peek slot the shell's `peekShape` is the default. */
  shape?: AppShellPeekShape | undefined;
  /** The width, in px. */
  width?: number | undefined;
  minWidth?: number | undefined;
  maxWidth?: number | undefined;
  /** The resting width a reset (Enter on the grip, a double press) returns to. */
  defaultWidth?: number | undefined;
  /** The list's floor beside a column, in px: the rail is capped at what leaves the list this wide. */
  reserve?: number | undefined;
  /** Every change of width while a drag or a key moves it. Given one, the column draws its grip. */
  onWidthChange?: ((width: number) => void) | undefined;
  /** Where a resize ends: the moment to keep the reader's width. */
  onWidthCommit?: ((width: number) => void) | undefined;
  /** Closes the rail: its Close, the veil behind a drawer, Escape from inside it. */
  onClose: () => void;
  /** Steps to the previous or next row of the list it was opened from; without it there is no stepper. */
  onStep?: ((delta: -1 | 1) => void) | undefined;
  /** The object's own page, for the bar's Open link. Without it there is no Open. */
  openHref?: string | undefined;
  labels?: Partial<PeekRailLabels> | undefined;
  className?: string | undefined;
  children: ReactNode;
}

export function PeekRail({
  label,
  shape: asked,
  width = PEEK_RAIL_WIDTH,
  minWidth = PEEK_RAIL_MIN_WIDTH,
  maxWidth = PEEK_RAIL_MAX_WIDTH,
  defaultWidth = PEEK_RAIL_WIDTH,
  reserve,
  onWidthChange,
  onWidthCommit,
  onClose,
  onStep,
  openHref,
  labels,
  className,
  children,
}: PeekRailProps) {
  const words = { ...PEEK_RAIL_LABELS, ...labels };
  const slot = useAppShellPeek();
  const shape = asked ?? slot?.shape ?? 'column';
  const rail = useRef<HTMLElement>(null);

  // ESCAPE CLOSES IT FROM INSIDE, a field included, unless something inside
  // answered the press first. A host that also closes it on Escape from the
  // page binds that in its own keymap, which skips a press answered here.
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const element = rail.current;
    if (!element) return undefined;
    const doc = element.ownerDocument;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented || event.isComposing) return;
      if (!(event.target instanceof Node) || !element.contains(event.target)) return;
      event.preventDefault();
      close.current();
    };
    doc.addEventListener('keydown', onKeyDown);
    return () => doc.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <>
      {shape === 'drawer' ? (
        // A press on the page behind the drawer closes it, as a press on
        // nothing does beside a column. The veil is a pointer convenience:
        // the keyboard closes the rail with Close or Escape.
        <div className="crewlet-peek-rail__veil" role="presentation" onClick={onClose} />
      ) : null}
      <aside
        ref={rail}
        className={cx('crewlet-peek-rail', className)}
        data-shape={shape}
        aria-label={label}
        style={{
          ['--crewlet-peek-rail-width' as string]: `${width}px`,
          ...(reserve === undefined ? null : { ['--crewlet-peek-rail-reserve' as string]: `${reserve}px` }),
        }}
      >
        {shape === 'column' && onWidthChange ? (
          <ResizeHandle
            label={words.resize}
            value={width}
            min={minWidth}
            max={maxWidth}
            defaultValue={defaultWidth}
            onValueChange={onWidthChange}
            onValueCommit={onWidthCommit}
            edge="left"
          />
        ) : null}
        <div className="crewlet-peek-rail__bar">
          {onStep ? (
            <>
              <IconButton
                size="sm"
                variant="ghost"
                icon={<ChevronUpGlyph size="sm" />}
                label={words.previous}
                title={words.previousHint}
                onClick={() => onStep(-1)}
              />
              <IconButton
                size="sm"
                variant="ghost"
                icon={<ChevronDownGlyph size="sm" />}
                label={words.next}
                title={words.nextHint}
                onClick={() => onStep(1)}
              />
            </>
          ) : null}
          <span className="crewlet-peek-rail__spacer" />
          {openHref ? (
            <ButtonLink
              size="small"
              variant="secondary"
              href={openHref}
              trailingIcon={<ArrowUpRightGlyph size="sm" />}
            >
              {words.open}
            </ButtonLink>
          ) : null}
          <IconButton
            size="sm"
            variant="ghost"
            icon={<XGlyph size="sm" />}
            label={words.close}
            title={words.closeHint}
            onClick={onClose}
          />
        </div>
        <div className="crewlet-peek-rail__body">{children}</div>
      </aside>
    </>
  );
}
