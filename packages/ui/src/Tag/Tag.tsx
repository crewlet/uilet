import type { HTMLAttributes, MouseEvent, ReactNode } from 'react';
import { CloseGlyph } from '@crewlethq/icons/glyphs';
import { StatusDot } from '../StatusDot/index.js';
import { cx } from '../utils/cx.js';
import type { PhaseTone, Tone } from '../utils/tone.js';

/**
 * Which vocabulary a tag speaks: a state, or a phase. Both, because the same
 * pill draws "failed" on the Model screen and "execute" on the turn beside it,
 * and a second component for the second vocabulary would be one recipe spelled
 * twice.
 */
export type TagVariant = Tone | PhaseTone;

/**
 * How much room the pill takes. The engine draws ONE badge and spends its
 * variation on tone, so these are three heights of that badge rather than
 * three different marks: `sm` is the engine's own geometry and the default,
 * `xs` a denser mark for a packed row, `md` a small control's height for a
 * toolbar.
 */
export type TagSize = 'xs' | 'sm' | 'md';

/**
 * The sizes a tag that ACTS may take.
 *
 * `xs` is an 18px pill, and a pointer target under 24px fails WCAG 2.2, so the
 * interactive form starts at `sm`. It is refused by the type rather than
 * documented, because a filter toggle that is 6px too short is a defect
 * nothing else in the build would ever report.
 */
export type InteractiveTagSize = Exclude<TagSize, 'xs'>;

export type TagAppearance = 'soft' | 'outline';

interface TagLook {
  /** The state or the phase this tag names. Neutral by default. */
  variant?: TagVariant | undefined;
  /** A tinted fill, or a boundary over the surface beneath. */
  appearance?: TagAppearance | undefined;
  /** Drawn before the label. A glyph component, not a name. */
  leadingIcon?: ReactNode;
  /**
   * Draws the variant's mark before the label. For a list where several tags
   * of different states sit in one column and the mark is what a reader scans.
   */
  dot?: boolean | undefined;
  /** A number after the label, in the tag's own ink. */
  count?: number | string | undefined;
  /** A machine value: an id, a CIDR range, a revision. */
  monospace?: boolean | undefined;
  /**
   * Fade the tag in on mount.
   *
   * OFF BY DEFAULT, which is the change from 0.2.0. Tags mount in their
   * hundreds on a data push, and a list that animates every arrival is a list
   * nobody can read while it is arriving. Guarded by reduced motion either way.
   */
  animateIn?: boolean | undefined;
}

/** A tag that only labels: it takes no press and nothing removes it. */
export interface StaticTagProps extends TagLook, Omit<HTMLAttributes<HTMLSpanElement>, 'onClick'> {
  size?: TagSize | undefined;
  onClick?: undefined;
  onRemove?: undefined;
  pressed?: undefined;
}

/**
 * A tag that acts: a filter that toggles, a chip somebody can take off, or
 * both.
 *
 * WITH BOTH, IT IS TWO CONTROLS. The press and the remove are siblings inside
 * the pill rather than one nested in the other: a `<button>` inside a
 * `<button>` is invalid markup, and what a browser and a screen reader make of
 * it is one control the inner half is unreachable from.
 */
export interface InteractiveTagProps extends TagLook, Omit<HTMLAttributes<HTMLElement>, 'onClick'> {
  size?: InteractiveTagSize | undefined;
  /** Makes the tag a real button, announced with its pressed state. */
  onClick?: ((event: MouseEvent<HTMLButtonElement>) => void) | undefined;
  /** For a tag that toggles a filter, whether that filter is on. */
  pressed?: boolean | undefined;
  /** Renders a remove control that fires this. */
  onRemove?: (() => void) | undefined;
  /** Names the remove control. */
  removeAriaLabel?: string | undefined;
}

export type TagProps = StaticTagProps | InteractiveTagProps;

/**
 * One shape inside. The exported type is a union only so a call site cannot
 * ask for an interactive `xs`; the implementation draws every form.
 */
type TagAll = TagLook &
  Omit<HTMLAttributes<HTMLElement>, 'onClick'> & {
    size?: TagSize | undefined;
    onClick?: ((event: MouseEvent<HTMLButtonElement>) => void) | undefined;
    pressed?: boolean | undefined;
    onRemove?: (() => void) | undefined;
    removeAriaLabel?: string | undefined;
  };

/**
 * A small pill that names a state, a phase or a value.
 *
 * COLOUR IS NEVER THE ONLY CARRIER. Every tag renders its label, in every
 * variant, so a reader who cannot separate the warning hue from the danger one
 * still reads two different words. `dot` adds the shape half for a column
 * where the mark is what gets scanned; the word stays either way.
 *
 * THE FILL AND THE INK ARE DIFFERENT STEPS. A tag is the tone's `soft` tint
 * under the tone's `ink`, never the solid fill with a label on it: the fill
 * step is measured as a MARK, at 3:1, and putting text on it would put that
 * text under the 4.5:1 it has to clear. 0.2.0 spelled five dark-theme literals
 * here instead, which measured between 1.14:1 and 1.58:1 on a light page.
 *
 * ITS LINE BOX IS FIXED. The height comes from the size step rather than from
 * the content, so a cell that holds a tag on one row and nothing on the next
 * is the same height on both and a table does not ripple as states arrive.
 *
 * A TAG THAT ACTS IS FOUR PIXELS TALLER THAN ONE THAT LABELS, and that is the
 * one place this pill departs from the engine's badge. The engine draws its
 * actionable badge at the inert one's 20px, which is a pointer target under
 * the 24px WCAG 2.2 accepts; everything else about the two, the tint, the ink,
 * the radius, the type and the padding, is identical, so a row still reads as
 * one set.
 */
export function Tag(props: TagProps) {
  const {
    variant = 'neutral',
    appearance = 'soft',
    size = 'sm',
    leadingIcon,
    dot = false,
    count,
    monospace = false,
    animateIn = false,
    onClick,
    pressed,
    onRemove,
    removeAriaLabel = 'Remove tag',
    className,
    children,
    ...rest
  } = props as TagAll;

  const presses = onClick !== undefined;
  const acts = presses || onRemove !== undefined;
  /*
   * Both handlers means two controls, so the pill is a plain element holding
   * them. It cannot be a button with the remove inside it: nested interactive
   * content is invalid markup, and axe reports it as one control whose inner
   * half no keyboard reaches.
   */
  const split = presses && onRemove !== undefined;
  /*
   * The type refuses this, so reaching it means a JavaScript caller or a cast.
   * Loud rather than silently drawn at 18px: an 18px toggle looks finished and
   * is a target a third of readers cannot reliably hit.
   */
  if (acts && size === 'xs') {
    console.warn('[crewlet] Tag size="xs" cannot act: an interactive tag starts at "sm", so its target clears 24px. Drawn at "sm".');
  }
  const drawnSize = acts && size === 'xs' ? 'sm' : size;

  const classes = cx(
    'crewlet-tag',
    `crewlet-tag--${variant}`,
    `crewlet-tag--${appearance}`,
    `crewlet-tag--${drawnSize}`,
    monospace && 'crewlet-tag--monospace',
    animateIn && 'crewlet-tag--animate-in',
    // The 24px target floor, on every form that takes a press: the pill that
    // is itself a button, the pill holding a press and a remove, and the inert
    // pill whose only control is the remove at its trailing edge.
    acts && 'crewlet-tag--acts',
    presses && !split && 'crewlet-tag--actionable',
    split && 'crewlet-tag--split',
    // The press is its own element when the pill holds two controls, so the
    // boundary the press state draws is put on the pill from here.
    split && pressed === true && 'is-pressed',
    className,
  );

  const inner = (
    <>
      {dot ? <StatusDot tone={variant} className="crewlet-tag__dot" /> : null}
      {leadingIcon ? (
        <span className="crewlet-tag__icon" aria-hidden>
          {leadingIcon}
        </span>
      ) : null}
      <span className="crewlet-tag__label">{children}</span>
      {/*
       * The count is drawn here rather than with the Count component. Count is
       * the neutral pill a heading or a tab carries, on the inset surface and
       * never tinted; inside a tinted pill that is a second surface on top of
       * the first. Here the number takes the tag's own ink and its own line.
       */}
      {count === undefined ? null : <span className="crewlet-tag__count">{count}</span>}
    </>
  );

  const remove =
    onRemove === undefined ? null : (
      <button
        type="button"
        className="crewlet-tag__remove"
        onClick={(event) => {
          // A removable tag inside a row that navigates: taking the chip off
          // must not also follow the row.
          event.stopPropagation();
          onRemove();
        }}
        aria-label={removeAriaLabel}
      >
        <CloseGlyph size="xs" />
      </button>
    );

  /*
   * A BUTTON WHEN IT ACTS, a span when it does not. A count that filters the
   * list has to be reachable from the keyboard and announce its pressed state;
   * a span with a click handler is neither, and looks identical to the inert
   * tags beside it.
   */
  if (split) {
    return (
      <span {...rest} className={classes}>
        <button type="button" className="crewlet-tag__press" onClick={onClick} aria-pressed={pressed === true}>
          {inner}
        </button>
        {remove}
      </span>
    );
  }

  if (presses) {
    return (
      <button {...rest} type="button" className={classes} onClick={onClick} aria-pressed={pressed === true}>
        {inner}
      </button>
    );
  }

  return (
    <span {...rest} className={classes}>
      {inner}
      {remove}
    </span>
  );
}
