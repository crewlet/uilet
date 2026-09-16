import type { ElementType, HTMLAttributes } from 'react';
import { cx } from '../utils/cx.js';

/**
 * The register a piece of text is set in, named for WHAT IT IS rather than
 * for how big it is. A scale change is then one edit in the stylesheet rather
 * than a search for every place that spelled a number.
 */
export type TextVariant =
  /** Body copy, 14px. The default, and the only one that needs no thought. */
  | 'body'
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
  | 'stat';

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
  /** One line, cut with an ellipsis. */
  truncate?: boolean | undefined;
  /** Two or three lines, then an ellipsis. */
  clamp?: 2 | 3 | undefined;
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
  className,
  children,
  ...rest
}: TextProps) {
  return (
    <Tag
      {...rest}
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
