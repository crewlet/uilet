import type { HTMLAttributes, ReactNode } from 'react';
import { CheckCircleGlyph, ErrorGlyph, InfoGlyph, WarningGlyph } from '@crewlethq/icons/glyphs';
import { cx } from '../utils/cx.js';
import type { Tone } from '../utils/tone.js';

/**
 * The tones a callout speaks in.
 *
 * `brand` is deliberately not one of them. The accent means "where the reader
 * is", and a banner is never that: an accented strip across a screen claims
 * the reader's own position for a sentence about the system.
 */
export type CalloutVariant = Exclude<Tone, 'brand'>;

/**
 * A card in the content flow, or a strip across the surface it heads.
 *
 * `banner` is full bleed with no radius and only a bottom border, for the
 * place a shell puts one: above a screen's content, against the edges, where a
 * rounded card would leave a gutter of page colour down both sides.
 */
export type CalloutLayout = 'card' | 'banner';

export interface CalloutProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  variant?: CalloutVariant | undefined;
  /** A bold lead-in before the message. */
  title?: ReactNode;
  /** A glyph replacing the variant's own. A component, not a name. */
  icon?: ReactNode;
  layout?: CalloutLayout | undefined;
  /** A control at the trailing edge: "Reconnect", "Open the log", "Dismiss". */
  action?: ReactNode;
  /**
   * Announce this when it appears. OFF by default, which is the change from
   * 0.2.0: every static banner on a screen was a live region, so a screen
   * reader arriving at a page read out each of them in turn, and one that had
   * been on the page for an hour was announced as news. Set it on a callout
   * that appears IN RESPONSE to something, and use `role="alert"` for the one
   * that must interrupt.
   */
  live?: 'polite' | 'assertive' | undefined;
}

/**
 * The glyph each tone renders when the caller passes none.
 *
 * IT IS NOT DECORATION. Under deuteranopia the warning and danger hues move
 * towards one another, and the whole rule that colour is never the only
 * carrier rests on something else in the box saying which of them this is. A
 * callout has no label of its own the way a Tag does, so the glyph is it, and
 * there is no way to turn it off.
 */
const GLYPHS: Record<CalloutVariant, ReactNode> = {
  neutral: <InfoGlyph size="md" />,
  info: <InfoGlyph size="md" />,
  success: <CheckCircleGlyph size="md" />,
  warning: <WarningGlyph size="md" />,
  danger: <ErrorGlyph size="md" />,
};

/**
 * A status in the content flow: an unreachable backend, a permission gate, a
 * destructive action about to happen.
 *
 * It stays until the condition clears, which is what separates it from a
 * toast. Anything a reader would want to find again must not be a toast; and
 * anything that is the OUTCOME of a press they just made should not be a
 * callout they have to go looking for.
 */
export const Callout = ({
  variant = 'info',
  title,
  icon,
  layout = 'card',
  action,
  live,
  className,
  children,
  ...rest
}: CalloutProps) => (
  <div
    {...rest}
    aria-live={live}
    className={cx('crewlet-callout', `crewlet-callout--${variant}`, `crewlet-callout--${layout}`, className)}
  >
    <span className="crewlet-callout__icon" aria-hidden>
      {icon ?? GLYPHS[variant]}
    </span>
    <div className="crewlet-callout__content">
      {title ? <span className="crewlet-callout__title">{title}</span> : null}
      {children}
    </div>
    {action ? <div className="crewlet-callout__action">{action}</div> : null}
  </div>
);
