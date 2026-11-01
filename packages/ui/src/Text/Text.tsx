import type { ElementType, HTMLAttributes, MouseEvent } from 'react';
import { cx } from '../utils/cx.js';

/**
 * The register a piece of text is set in, named for WHAT IT IS rather than
 * for how big it is. A scale change is then one edit in the stylesheet rather
 * than a search for every place that spelled a number.
 */
export type TextVariant =
  /** Body copy, 14px. The default, and the only one that needs no thought. */
  | 'body'
  /**
   * Words somebody wrote to be read whole, at the body's size: a mission on
   * its card, a policy, a comment. The relaxed leading, the author's own line
   * breaks kept, balanced last lines, and a long word or address broken
   * rather than pushed past the column. Body copy reflows what it is given;
   * a passage keeps it as it was written.
   */
  | 'passage'
  /** A value inside a dense row or table cell, 13px. */
  | 'cell'
  /** Metadata under or beside a value, 12px, on the tertiary step. */
  | 'caption'
  /** The micro register: 11px, uppercase, tracked out, on the tertiary step. */
  | 'label'
  /** A panel or section title. */
  | 'heading'
  /** The sentence that introduces a screen. */
  | 'lead'
  /** A page title. */
  | 'display'
  /** A single measured number, the size a stat card sets it at. */
  | 'stat'
  /**
   * The register of the words around it: their size, weight and ink. For a
   * run inside a sentence or a chip that changes one thing about it, with
   * `mono` for a literal (a login, a header name) or `numeric` for a figure.
   */
  | 'inherit';

/**
 * Which ink. There is deliberately no decoration step here: the decoration
 * ink is measured into the 2.8 to 4.5:1 band on purpose, so it carries a
 * mark and never a word. Anything a reader has to make out is tertiary or
 * above, and the package's own stylesheet check refuses the alternative.
 */
export type TextTone = 'primary' | 'secondary' | 'tertiary';

/** Which measure a block of text is bounded to. */
export type TextMeasure = 'normal' | 'narrow';

export interface TextProps extends HTMLAttributes<HTMLElement> {
  /** The element to draw. A span by default, so Text nests inside a sentence. */
  as?: ElementType | undefined;
  variant?: TextVariant | undefined;
  /** Overrides the ink the variant sets. */
  tone?: TextTone | undefined;
  /** The mono face, with ligatures off: an id, a path, a config key. */
  mono?: boolean | undefined;
  /**
   * Tabular figures. A number that ticks up otherwise re-flows the text beside
   * it on every push, because the proportional digits have different widths.
   */
  numeric?: boolean | undefined;
  /**
   * One line, cut with an ellipsis: a name in a narrow column, a caption
   * under it. While the words are cut, the pointer's title carries them whole
   * (see `titleWhenCut`).
   */
  truncate?: boolean | undefined;
  /** Two or three lines, then an ellipsis, with the whole words on the title while they are cut. */
  clamp?: 2 | 3 | undefined;
  /**
   * Whether words cut by `truncate` or `clamp` carry their whole text as the
   * element's title while they are cut. On by default. Turn it off where
   * something else already shows the whole words, a `Tooltip` around the
   * text or a title on the element around it, so the reader is not shown
   * them twice. A `title` the caller passes always wins.
   */
  titleWhenCut?: boolean | undefined;
  /** Bounds the line length, for anything a reader reads rather than scans. */
  measure?: TextMeasure | undefined;
}

/**
 * Text set in one of the system's registers.
 *
 * WHY A COMPONENT RATHER THAN A CLASS. The registers were a set of utility
 * classes, and a utility class is a thing a screen has to remember to spell:
 * a caption-sized LINK styled with the caption class took the caption's muted
 * ink, which won over the anchor rule, so four real navigations rendered as
 * dim static micro-text a reader could only find by hovering. A typed prop
 * cannot be forgotten, and a link is a different component (see `Link`).
 *
 * `variant` sets the size, the weight, the tracking and the ink together,
 * because those four move as one. `tone` overrides only the ink, for the case
 * where the same register carries a quieter fact.
 *
 * CUT WORDS ARE STILL READABLE WHOLE. A line cut with an ellipsis hid the
 * end of a name from a sighted reader, who had no way to read it short of
 * widening the window, while a screen reader read it whole (the cut is
 * paint, not content). So a cut Text puts its whole words on its title. It
 * is MEASURED AT THE MOMENT THE POINTER ARRIVES, which is the only moment a
 * title is read: the words and the column are what they are then, so a title
 * never goes stale after a resize or a new value, and a table of a thousand
 * cut cells costs nothing until one is hovered. Words that fit carry no
 * title, since a tooltip that repeats what is on the screen is noise.
 */
export function Text({
  as: Tag = 'span',
  variant = 'body',
  tone,
  mono = false,
  numeric = false,
  truncate = false,
  clamp,
  measure,
  titleWhenCut = true,
  className,
  children,
  ...rest
}: TextProps) {
  const cuts = truncate || clamp !== undefined;
  // The caller's own title (even an empty one) is theirs, so the measured one
  // is only set where none was given.
  const measures = cuts && titleWhenCut && rest.title === undefined;
  const { onMouseEnter } = rest;
  return (
    <Tag
      {...rest}
      onMouseEnter={
        measures
          ? (event: MouseEvent<HTMLElement>) => {
              titleIfCut(event.currentTarget, truncate ? 'inline' : 'block');
              onMouseEnter?.(event);
            }
          : onMouseEnter
      }
      className={cx(
        'crewlet-text',
        `crewlet-text--${variant}`,
        tone && `crewlet-text--tone-${tone}`,
        mono && 'crewlet-text--mono',
        numeric && 'crewlet-text--numeric',
        truncate && 'crewlet-text--truncate',
        clamp !== undefined && `crewlet-text--clamp-${clamp}`,
        measure && `crewlet-text--measure-${measure}`,
        className,
      )}
    >
      {children}
    </Tag>
  );
}

/**
 * Puts the element's whole words on its title while they are cut, and takes
 * the title off while they fit. One line is cut across (`inline`), a clamp
 * down (`block`). The words are read from the element itself, so a run of
 * marked-up text (a mono id inside the line) reads as it is shown, with its
 * white space collapsed as the line collapses it.
 */
function titleIfCut(element: HTMLElement, axis: 'inline' | 'block'): void {
  const cut =
    axis === 'inline' ? element.scrollWidth > element.clientWidth : element.scrollHeight > element.clientHeight;
  const words = (element.textContent ?? '').replace(/\s+/g, ' ').trim();
  if (cut && words !== '') element.setAttribute('title', words);
  else element.removeAttribute('title');
}
