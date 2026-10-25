import type { HTMLAttributes, ReactNode } from 'react';
import { LockGlyph } from '@crewlethq/icons/glyphs';
import { StatusCard } from '../StatusCard/index.js';
import { cx } from '../utils/cx.js';

export interface RefusalCardLabels {
  /** The Tag in the head. */
  notPermitted: string;
  /** The house phrase, always said last. */
  nothingChanged: string;
}

export const REFUSAL_CARD_LABELS: RefusalCardLabels = {
  notPermitted: 'Not permitted',
  nothingChanged: 'Nothing changed.',
};

export interface RefusalCardProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /** The action that was asked for, in sentence case: "File a task". */
  title: string;
  /** An optional first sentence: "You do not have permission to file tasks." */
  heading?: ReactNode;
  /**
   * Why, in the product's own words: the access the action needs and what the
   * person holds ("Filing tasks needs Tracker access, and your role includes
   * Knowledge only."). Assembled from the engine's answer, never a model's.
   */
  children: ReactNode;
  /** Utilities at the foot: "Copy a request to an admin", "About access". Nothing is sent on the person's behalf. */
  actions?: ReactNode;
  labels?: Partial<RefusalCardLabels> | undefined;
}

/**
 * A request the person's own access does not allow, said as the product says
 * it: the action asked for as the title, "Not permitted" as a neutral Tag
 * with the lock (nothing went wrong, so not the danger tone), the access it
 * needs and what the person holds, and always "Nothing changed.".
 *
 * IT OFFERS NO WORKAROUND. The foot holds only what the person can do with
 * their own hands (copy a request to send an admin, read about access), and
 * starts on the card's text edge, because none of it is a decision.
 */
export function RefusalCard({ title, heading, children, actions, labels: overrides, className, ...rest }: RefusalCardProps) {
  const labels = overrides ? { ...REFUSAL_CARD_LABELS, ...overrides } : REFUSAL_CARD_LABELS;
  return (
    <StatusCard
      {...rest}
      title={title}
      status={{ label: labels.notPermitted, tone: 'neutral', icon: <LockGlyph size="xs" /> }}
      actions={actions}
      actionsAlign="start"
      className={cx('crewlet-refusal-card', className)}
    >
      {heading === undefined || heading === null ? null : <p className="crewlet-refusal-card__heading">{heading}</p>}
      <p>{children}</p>
      <p className="crewlet-refusal-card__nothing">{labels.nothingChanged}</p>
    </StatusCard>
  );
}
