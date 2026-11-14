import {
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { ChevronDownGlyph, ChevronUpGlyph } from '@crewlethq/icons/glyphs';
import { Button } from '../Button/index.js';
import { cx } from '../utils/cx.js';

export interface ClampLabels {
  /** The press that opens a folded block. */
  more: string;
  /** The press that folds it again. */
  less: string;
}

export const CLAMP_LABELS: ClampLabels = {
  more: 'Show more',
  less: 'Show less',
};

/**
 * How much longer than its fold a block must be before it is folded: a
 * quarter. A block a few lines past the fold would cost a press to read a
 * few lines, and the fade alone would take most of what it hides.
 */
export const CLAMP_SLACK = 1.25;

export interface ClampProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /**
   * The folded height, a CSS length: `20rem` by default, about fifteen lines
   * of body text. A block that fits it, with a quarter to spare, is drawn
   * whole and gets no control at all.
   */
  height?: string | undefined;
  /** Controlled open state. */
  open?: boolean | undefined;
  /** Uncontrolled initial state; folded by default. */
  defaultOpen?: boolean | undefined;
  onOpenChange?: ((open: boolean) => void) | undefined;
  labels?: Partial<ClampLabels> | undefined;
  children?: ReactNode;
}

/**
 * A long block folded to a height, with Show more under it: a comment, a
 * report or a message that would otherwise make a reader scroll past the
 * whole of it to reach the next one.
 *
 * ONLY WHAT IS LONG IS FOLDED. The block is measured as it renders and as it
 * reflows, and folded only while it is more than a quarter longer than the
 * fold; anything shorter is drawn whole, with no control and no fade.
 *
 * THE FOLD FADES, IT DOES NOT CUT. The last lines above the fold fade out
 * through a mask, which needs no colour of the ground it stands on, so the
 * same block folds on a card, on the sheet or in a panel.
 *
 * NOTHING IS HIDDEN FROM WHAT READS IT. The folded part stays in the
 * document, so a screen reader and find in page reach all of it, and a focus
 * that lands inside it (a link tabbed onto) opens the block, so the keyboard
 * never stands on something out of sight. The control says whether the block
 * is open (`aria-expanded`) and names what it controls. Printed, every block
 * is whole.
 */
export function Clamp({
  height = '20rem',
  open: controlled,
  defaultOpen = false,
  onOpenChange,
  labels: overrides,
  className,
  style,
  onFocusCapture,
  children,
  ...rest
}: ClampProps) {
  const labels = overrides ? { ...CLAMP_LABELS, ...overrides } : CLAMP_LABELS;
  const [uncontrolled, setUncontrolled] = useState(defaultOpen);
  const open = controlled ?? uncontrolled;
  const setOpen = useCallback(
    (next: boolean) => {
      if (controlled === undefined) setUncontrolled(next);
      onOpenChange?.(next);
    },
    [controlled, onOpenChange],
  );
  const body = useRef<HTMLDivElement | null>(null);
  const content = useRef<HTMLDivElement | null>(null);
  const fold = useRef<HTMLSpanElement | null>(null);
  const id = useId();
  // Whether the block is long enough to fold, measured against the fold as
  // the page resolves it (a length in rem or em is the reader's): an empty
  // box as tall as the fold stands beside the body for that alone.
  const [long, setLong] = useState(false);
  useLayoutEffect(() => {
    const inner = content.current;
    const mark = fold.current;
    if (!inner || !mark) return;
    const measure = () => {
      const limit = mark.offsetHeight;
      setLong(limit > 0 && inner.offsetHeight > limit * CLAMP_SLACK);
    };
    measure();
    if (typeof ResizeObserver !== 'function') return;
    const observer = new ResizeObserver(measure);
    observer.observe(inner);
    observer.observe(mark);
    return () => observer.disconnect();
  }, [height]);
  const state = !long ? 'whole' : open ? 'open' : 'folded';
  return (
    <div
      {...rest}
      className={cx('crewlet-clamp', className)}
      data-state={state}
      style={{ '--crewlet-clamp-height': height, ...style } as CSSProperties}
      onFocusCapture={(event) => {
        onFocusCapture?.(event);
        // A focus inside the folded part opens it: the keyboard never stands
        // on something the fold hides.
        if (state === 'folded' && body.current?.contains(event.target as Node)) setOpen(true);
      }}
    >
      <span ref={fold} className="crewlet-clamp__fold" aria-hidden="true" />
      <div ref={body} id={id} className="crewlet-clamp__body">
        <div ref={content} className="crewlet-clamp__content">
          {children}
        </div>
      </div>
      {long ? (
        <Button
          className="crewlet-clamp__toggle"
          variant="ghost"
          size="small"
          flush
          aria-expanded={open}
          aria-controls={id}
          leadingIcon={open ? <ChevronUpGlyph size="sm" /> : <ChevronDownGlyph size="sm" />}
          onClick={() => setOpen(!open)}
        >
          {open ? labels.less : labels.more}
        </Button>
      ) : null}
    </div>
  );
}
