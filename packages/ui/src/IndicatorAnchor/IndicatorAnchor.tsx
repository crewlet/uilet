import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../utils/cx.js';

export interface IndicatorAnchorProps extends HTMLAttributes<HTMLSpanElement> {
  /**
   * The mark worn at the top end corner: a `StatusDot`. Decoration, as the
   * dot always is: the control it sits on says why in its own name.
   */
  indicator?: ReactNode;
  /** The glyph or avatar the indicator is anchored to. */
  children: ReactNode;
}

/**
 * A mark with a small indicator at its top end corner: the notification
 * badge's convention, for "this needs you" on an icon or an avatar.
 *
 * ANCHORED TO THE MARK, NOT TO THE WORDS. A dot after a label sat on the
 * text's baseline, touching its last letter and higher or lower than the
 * glyph beside it, by whatever margin a caller guessed. Here the corner is
 * the component's: the dot's centre stands on the mark's top end corner at
 * every size and density.
 *
 * A RING IN THE GROUND'S COLOUR parts the dot from the mark it overlaps. The
 * ground is the control's own fill where the control says so
 * (`--crewlet-indicator-ring`, set by Button and IconButton for each state),
 * else the page's background.
 *
 * The indicator is hidden from assistive technology: the control's name, or
 * the words beside the mark, carry what it means.
 */
export function IndicatorAnchor({ indicator, children, className, ...rest }: IndicatorAnchorProps) {
  const shown = indicator !== undefined && indicator !== null && indicator !== false;
  return (
    <span {...rest} className={cx('crewlet-indicator-anchor', className)}>
      {children}
      {shown ? (
        <span className="crewlet-indicator-anchor__indicator" aria-hidden="true">
          {indicator}
        </span>
      ) : null}
    </span>
  );
}
