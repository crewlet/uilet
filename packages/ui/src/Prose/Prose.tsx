import type { ElementType, HTMLAttributes } from 'react';
import { cx } from '../utils/cx.js';

export type ProseTone = 'default' | 'muted';

export interface ProseProps extends HTMLAttributes<HTMLElement> {
  /** The element to draw. A `p` by default. */
  as?: ElementType | undefined;
  tone?: ProseTone | undefined;
  /**
   * The text is still arriving. It draws a caret after the last character, and
   * the caret holds still under a reduced-motion preference.
   */
  streaming?: boolean | undefined;
  /**
   * An attempt that was given up on. Dimmed rather than removed: a reader has
   * already read it, and making it vanish reads as a glitch.
   */
  dimmed?: boolean | undefined;
  /** Bounds the line length. On by default; a measure is the point. */
  measure?: 'normal' | 'narrow' | 'none' | undefined;
}

/**
 * Natural language a person or a model wrote.
 *
 * WHY IT IS NOT A CODE BLOCK. Reasoning and speech used to be set in the same
 * monospace block that carries tool JSON: 11px, tight leading, unbounded
 * measure. That is a wall of text nobody reads. Here they get the
 * proportional face, real leading and a bounded measure, and monospace stays
 * where it means something.
 *
 * `white-space: pre-wrap` keeps the writer's own paragraph breaks, which are
 * load bearing in a long answer, without turning a long line into a
 * horizontal scroll.
 */
export function Prose({
  as: Tag = 'p',
  tone = 'default',
  streaming = false,
  dimmed = false,
  measure = 'normal',
  className,
  children,
  ...rest
}: ProseProps) {
  return (
    <Tag
      {...rest}
      className={cx(
        'crewlet-prose',
        tone === 'muted' && 'crewlet-prose--muted',
        streaming && 'crewlet-prose--streaming',
        dimmed && 'crewlet-prose--dimmed',
        measure !== 'none' && `crewlet-prose--measure-${measure}`,
        className,
      )}
    >
      {children}
    </Tag>
  );
}
