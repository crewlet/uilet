import type { HTMLAttributes, ReactNode } from 'react';
import { CircleAlertGlyph, CircleCheckGlyph, InfoGlyph, TriangleAlertGlyph } from '@crewlethq/icons/glyphs';
import { Button } from '../Button/index.js';
import { cx } from '../utils/cx.js';

/** What the strip reports: done, nothing happened, refused or failed, under way, or a caution. */
export type ReceiptStripTone = 'success' | 'neutral' | 'danger' | 'info' | 'warning';

export interface ReceiptStripProps extends Omit<HTMLAttributes<HTMLDivElement>, 'role'> {
  tone?: ReceiptStripTone | undefined;
  /**
   * The mark before the words, at 16px. Each tone has one by default (the
   * check, the info mark, the alert); a strip that says something more
   * specific passes its own, such as the clock of an expiry or the lock of a
   * sign-in check.
   */
  icon?: ReactNode;
  /** The outcome, in one or two sentences. */
  children: ReactNode;
  /** Controls at the strip's end, such as Try again. */
  actions?: ReactNode;
  /**
   * Whether the strip is its own live region (true, the default: an alert
   * for `danger`, a status otherwise). False leaves the announcement to a
   * live region the host already keeps around it, which is the reliable way
   * to announce words that arrive after the page did.
   */
  announce?: boolean | undefined;
}

const ICONS: Record<ReceiptStripTone, ReactNode> = {
  success: <CircleCheckGlyph size="md" />,
  neutral: <InfoGlyph size="md" />,
  info: <InfoGlyph size="md" />,
  warning: <TriangleAlertGlyph size="md" />,
  danger: <CircleAlertGlyph size="md" />,
};

/**
 * What happened, at the foot of a card: "Created ENG-156 · assigned to Agent
 * SWE", "You declined this. Nothing changed.".
 *
 * IT REPLACES THE CARD'S FOOT rather than sitting inside the card as a box of
 * its own: the card's hairline above it, the card's own edge around it, a
 * tint under the words. A card never holds a second bordered box.
 *
 * A STATUS, OR AN ALERT. A refusal or a failure (`danger`) is an alert, the
 * one tone a reader must not miss; every other tone is a polite status.
 * Colour is never alone: the mark and the words say the outcome.
 */
export function ReceiptStrip({
  tone = 'success',
  icon,
  children,
  actions,
  announce = true,
  className,
  ...rest
}: ReceiptStripProps) {
  return (
    <div
      {...rest}
      role={announce ? (tone === 'danger' ? 'alert' : 'status') : undefined}
      className={cx('crewlet-receipt-strip', `crewlet-receipt-strip--${tone}`, className)}
    >
      <span className="crewlet-receipt-strip__icon" aria-hidden="true">
        {icon ?? ICONS[tone]}
      </span>
      <div className="crewlet-receipt-strip__text">{children}</div>
      {actions === undefined || actions === null || actions === false ? null : (
        <div className="crewlet-receipt-strip__actions">{actions}</div>
      )}
    </div>
  );
}

export interface RefusalStripLabels {
  retry: string;
  dismiss: string;
}

export const REFUSAL_STRIP_LABELS: RefusalStripLabels = { retry: 'Try again', dismiss: 'Dismiss' };

/** Where the refusal is drawn: under the control that caused it, or as a card's foot. */
export type RefusalStripPlacement = 'inline' | 'foot';

export interface RefusalStripProps extends Omit<HTMLAttributes<HTMLElement>, 'role' | 'children'> {
  /** The refusal, in the engine's own sentence. Never a model's words. */
  children: ReactNode;
  /** A second, quieter line: what the person could do about it. */
  hint?: ReactNode;
  /** Offers Try again, for a refusal whose class may succeed on a retry. */
  onRetry?: (() => void) | undefined;
  /** Try again is under way. */
  retrying?: boolean | undefined;
  /** Offers Dismiss. */
  onDismiss?: (() => void) | undefined;
  /** `inline` (the default) under a control; `foot` as a card's foot strip. */
  placement?: RefusalStripPlacement | undefined;
  /**
   * Whether the strip is its own alert (true, the default). False leaves the
   * announcement to a live region the host keeps around it.
   */
  announce?: boolean | undefined;
  labels?: Partial<RefusalStripLabels> | undefined;
}

/**
 * A refusal, drawn where it happened: the write a control tried, or the
 * change a card was approved for, refused by the engine.
 *
 * ONE DRAWING FOR EVERY REFUSAL. Inline it is the sentence in the danger ink
 * with its actions beside it, under the control that caused it, wrapping
 * rather than widening the row; at a card's foot it is the danger
 * `ReceiptStrip`. The sentence is the caller's (the engine's), so the strip
 * never words a refusal itself.
 *
 * AN ALERT, because a write that did not happen is the one outcome a reader
 * must hear without looking for it.
 */
export function RefusalStrip({
  children,
  hint,
  onRetry,
  retrying = false,
  onDismiss,
  placement = 'inline',
  announce = true,
  labels: overrides,
  className,
  ...rest
}: RefusalStripProps) {
  const labels = overrides ? { ...REFUSAL_STRIP_LABELS, ...overrides } : REFUSAL_STRIP_LABELS;
  const actions =
    onRetry || onDismiss ? (
      <>
        {onRetry ? (
          <Button size="small" variant="ghost" loading={retrying} onClick={onRetry}>
            {labels.retry}
          </Button>
        ) : null}
        {onDismiss ? (
          <Button size="small" variant="ghost" onClick={onDismiss}>
            {labels.dismiss}
          </Button>
        ) : null}
      </>
    ) : undefined;
  const words = (
    <>
      <span className="crewlet-refusal-strip__sentence">{children}</span>
      {hint === undefined || hint === null ? null : <span className="crewlet-refusal-strip__hint">{hint}</span>}
    </>
  );
  if (placement === 'foot') {
    return (
      <ReceiptStrip {...rest} tone="danger" announce={announce} actions={actions} className={cx('crewlet-refusal-strip--foot', className)}>
        {words}
      </ReceiptStrip>
    );
  }
  return (
    <span {...rest} role={announce ? 'alert' : undefined} className={cx('crewlet-refusal-strip', className)}>
      {words}
      {actions}
    </span>
  );
}
