import { useId, type HTMLAttributes, type ReactNode } from 'react';
import { Card, type CardSectionPadding } from '../Card/index.js';
import { Tag, type TagVariant } from '../Tag/index.js';
import { cx } from '../utils/cx.js';

/** A card's state, drawn as a `Tag` at the end of its head. */
export interface StatusCardStatus {
  /** The state in words: "Needs your approval", "Applied", "Not permitted". */
  label: string;
  tone: TagVariant;
  /** The Tag's leading mark, at `xs`: a glyph, or a `Spinner` while the card's work runs. */
  icon?: ReactNode;
}

/**
 * How the foot's controls stand. A foot that holds a DECISION (a primary
 * action) is end-aligned, where a reader finishes reading the card; a foot of
 * utilities only (downloads, a copy, a link elsewhere) starts on the card's
 * text edge, with a ghost button's padding pulled out so its glyph sits on
 * that edge.
 */
export type StatusCardActionsAlign = 'end' | 'start';

export interface StatusCardProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /** What the card is, in sentence case: the action proposed, the result shown. */
  title: string;
  /** A second line beside the title, under it on a card narrower than 480px. */
  subtitle?: ReactNode;
  /** Puts the subtitle under the title at every width. */
  subtitlePlacement?: 'beside' | 'below' | undefined;
  /** The card's state, at the end of its head. Part of the card's name. */
  status?: StatusCardStatus | undefined;
  /**
   * The card's work is over (applied, declined, expired): its body steps back
   * to the secondary ink so the foot strip reads first, and what it recorded
   * stays legible.
   */
  settled?: boolean | undefined;
  /** The body's inset. `md` by default; `none` lets a table run to the card's edges. */
  bodyPadding?: CardSectionPadding | undefined;
  /** What happened, as a `ReceiptStrip` at the card's foot, above any actions. */
  strip?: ReactNode;
  /** The foot's controls. */
  actions?: ReactNode;
  /** `end` (the default) for a foot holding a decision; `start` for utilities only. */
  actionsAlign?: StatusCardActionsAlign | undefined;
  children?: ReactNode;
}

/**
 * A record with a state, as the product's own card: the default `Card`, one
 * hairline, a sentence-case title over the head's rule, the state as a `Tag`
 * at the end of the head, and what happened as a strip at the foot. No tone
 * rail and no tinted head: the Tag says the state in words, and a rail beside
 * it only repeated it in colour.
 *
 * A SECTION NAMED BY ITS TITLE AND ITS STATE ("Create task, Needs your
 * approval"), so a reader moving by region hears both before reading the
 * body.
 *
 * THE FOOT FOLLOWS ONE RULE: a decision ends the row, utilities start it. On
 * a card narrower than 360px a decision's buttons share the row as blocks.
 */
export function StatusCard({
  title,
  subtitle,
  subtitlePlacement,
  status,
  settled = false,
  bodyPadding = 'md',
  strip,
  actions,
  actionsAlign = 'end',
  className,
  children,
  ...rest
}: StatusCardProps) {
  const id = useId();
  const titleId = `${id}-title`;
  const statusId = `${id}-status`;
  return (
    <Card
      {...rest}
      as="section"
      aria-labelledby={status ? `${titleId} ${statusId}` : titleId}
      className={cx('crewlet-status-card', settled && 'crewlet-status-card--settled', className)}
      data-settled={settled || undefined}
    >
      <Card.Header
        subtitle={subtitle}
        subtitlePlacement={subtitlePlacement}
        actions={
          status ? (
            <Tag id={statusId} size="sm" variant={status.tone} leadingIcon={status.icon}>
              {status.label}
            </Tag>
          ) : undefined
        }
      >
        <Card.Title id={titleId} truncate>
          {title}
        </Card.Title>
      </Card.Header>
      {children === undefined || children === null || children === false ? null : (
        <Card.Body padding={bodyPadding} className="crewlet-status-card__body">
          {children}
        </Card.Body>
      )}
      {strip}
      {actions === undefined || actions === null || actions === false ? null : (
        <Card.Footer className={cx('crewlet-status-card__actions', `crewlet-status-card__actions--${actionsAlign}`)}>
          {actions}
        </Card.Footer>
      )}
    </Card>
  );
}
