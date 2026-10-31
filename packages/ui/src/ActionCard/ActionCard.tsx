import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { ArtifactKind } from '../ArtifactKindGlyph/index.js';
import { cx } from '../utils/cx.js';

/**
 * The colour ground a card is drawn on, named by its hue. Each is an artifact
 * kind's measured colour (purple is design's, blue doc's, amber slides',
 * green sheet's, teal dashboard's, magenta the brand kit's, rose HTML's), so
 * every palette and both modes are already fitted for it.
 */
export type ActionCardTone = 'purple' | 'blue' | 'amber' | 'green' | 'teal' | 'magenta' | 'rose';

/** Which kind's colours each tone reads. */
export const ACTION_CARD_GROUND: Readonly<Record<ActionCardTone, ArtifactKind>> = {
  purple: 'design',
  blue: 'doc',
  amber: 'slides',
  green: 'sheet',
  teal: 'dashboard',
  magenta: 'brand',
  rose: 'html',
};

export interface ActionCardProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'title' | 'onSelect'> {
  /** What the card does, as its name: "Add people and agents". */
  title: string;
  tone: ActionCardTone;
  /** The drawing at the card's foot. Decorative: the title says what it does. */
  art: ReactNode;
  /** Pressing the card. */
  onSelect: () => void;
}

/**
 * A first step offered as a picture: a tall card on one of the kit's colour
 * grounds, its title at the top and a drawing at its foot. A new room opens
 * with a row of these (add people, add a description, start from a
 * template) until its first message.
 *
 * A QUIET HOVER. The ground deepens a step and a small shadow lifts the card
 * off the page; nothing moves, so a row of cards holds still under a pointer
 * passing over it.
 *
 * A BUTTON NAMED BY ITS TITLE. The drawing is hidden from assistive
 * technology, so a reader hears "Add people and agents, button" and nothing
 * about a picture.
 */
export function ActionCard({ title, tone, art, onSelect, onClick, className, type = 'button', ...rest }: ActionCardProps) {
  return (
    <button
      {...rest}
      type={type}
      className={cx('crewlet-action-card', `crewlet-kind--${ACTION_CARD_GROUND[tone]}`, className)}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) onSelect();
      }}
    >
      <span className="crewlet-action-card__title">{title}</span>
      <span className="crewlet-action-card__art" aria-hidden="true">
        {art}
      </span>
    </button>
  );
}

export interface ActionCardRowProps {
  /** Names the row for a screen reader: "First steps for this room". */
  label: string;
  /** The cards, in the order they are offered. */
  children: ReactNode;
  className?: string | undefined;
}

/**
 * Action cards side by side, in one row that scrolls sideways when it runs
 * out of width: a phone shows two cards and part of the third (the part says
 * there is more) rather than a tall stack, and each card snaps to the row's
 * start.
 */
export function ActionCardRow({ label, children, className }: ActionCardRowProps) {
  return (
    <div role="group" aria-label={label} className={cx('crewlet-action-cards', className)}>
      {children}
    </div>
  );
}
