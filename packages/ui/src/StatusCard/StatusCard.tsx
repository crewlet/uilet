import { useId, useState, type HTMLAttributes, type ReactNode } from 'react';
import { ChevronDownGlyph } from '@crewlethq/icons/glyphs';
import { Card, type CardRail, type CardSectionPadding } from '../Card/index.js';
import { Tag, type TagVariant } from '../Tag/index.js';
import { cx } from '../utils/cx.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';

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

/**
 * A card that folds to its head: what a result card (a table, a record a
 * read answered) offers so that it can stand in a conversation as one line
 * the reader opens. Never for a decision, which has to be read to be made.
 */
export interface StatusCardFoldProps {
  /**
   * The card folds to its head. The title becomes the button that opens and
   * closes it, with the chevron every disclosure in the package draws; folded,
   * the body, the strip and the foot are put away, and the foot's controls
   * (the downloads, the link elsewhere) stand at the end of the head, so a
   * folded card still offers them.
   */
  collapsible?: boolean | undefined;
  /**
   * What a folded card says after its title, in place of the subtitle: how
   * much it holds, "7 rows", "Mission, vision, 6 policies". Part of the
   * title's name while the card is folded.
   */
  summary?: ReactNode;
  /** Controlled open state of a collapsible card. */
  open?: boolean | undefined;
  /** The uncontrolled starting state of a collapsible card. Folded (`false`) by default. */
  defaultOpen?: boolean | undefined;
  onOpenChange?: ((open: boolean) => void) | undefined;
}

export interface StatusCardProps extends Omit<HTMLAttributes<HTMLElement>, 'title'>, StatusCardFoldProps {
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
  /**
   * A risk down the card's leading edge, Card's own rail: what the reader
   * has to weigh before acting, such as a proposal that removes something.
   * Never the state, which the Tag already says in words.
   */
  rail?: CardRail | undefined;
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
 * rail for the state and no tinted head: the Tag says the state in words, and
 * a rail beside it only repeated it in colour. A rail is drawn only for a
 * risk the Tag does not carry (`rail`).
 *
 * A SECTION NAMED BY ITS TITLE AND ITS STATE ("Create task, Needs your
 * approval"), so a reader moving by region hears both before reading the
 * body.
 *
 * THE FOOT FOLLOWS ONE RULE: a decision ends the row, utilities start it. On
 * a card narrower than 360px a decision's buttons share the row as blocks.
 *
 * A RESULT CAN FOLD TO ITS HEAD (`collapsible`): one line with the title, a
 * summary of what it holds and its utilities, opened by its title. A card
 * that asks for a decision never folds.
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
  collapsible = false,
  summary,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  className,
  children,
  ...rest
}: StatusCardProps) {
  const id = useId();
  const titleId = `${id}-title`;
  const statusId = `${id}-status`;
  const bodyId = `${id}-body`;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const open = !collapsible || (controlledOpen ?? uncontrolledOpen);
  const folded = !open;
  const toggle = () => {
    if (controlledOpen === undefined) setUncontrolledOpen(!open);
    onOpenChange?.(!open);
  };
  const hasBody = !(children === undefined || children === null || children === false);
  const hasActions = !(actions === undefined || actions === null || actions === false);
  const hasSummary = !(summary === undefined || summary === null || summary === false || summary === '');
  const tag = status ? (
    <Tag id={statusId} size="sm" variant={status.tone} leadingIcon={status.icon}>
      {status.label}
    </Tag>
  ) : null;
  // A COLLAPSIBLE CARD'S CONTROLS STAND IN ITS HEAD, after the state, folded
  // or open, so a folded result still offers its downloads and its way to the
  // page, and opening it never moves them: a reader who pressed the title to
  // open it found the foot's CSV button arriving under the pointer.
  const headActions =
    collapsible && hasActions ? (
      <>
        {tag}
        <span className="crewlet-status-card__head-actions">{actions}</span>
      </>
    ) : (
      (tag ?? undefined)
    );
  return (
    <Card
      {...rest}
      as="section"
      aria-labelledby={status ? `${titleId} ${statusId}` : titleId}
      className={cx(
        'crewlet-status-card',
        settled && 'crewlet-status-card--settled',
        collapsible && 'crewlet-status-card--collapsible',
        folded && 'crewlet-status-card--folded',
        className,
      )}
      data-settled={settled || undefined}
      data-state={collapsible ? (open ? 'open' : 'closed') : undefined}
    >
      <Card.Header
        divided={!folded}
        subtitle={folded ? undefined : subtitle}
        subtitlePlacement={subtitlePlacement}
        actions={headActions}
      >
        {collapsible ? (
          /*
           * THE HEADING WRAPS THE BUTTON, as on every disclosure here: a
           * reader moving by heading finds the card, and the same element is
           * the control that opens it. The summary is inside the button, so
           * a folded card's name says how much it holds; the comma is said
           * where the dot is drawn.
           */
          <Card.Title id={titleId} className="crewlet-status-card__fold-title">
            <button
              type="button"
              className="crewlet-status-card__toggle"
              aria-expanded={open}
              aria-controls={hasBody ? bodyId : undefined}
              onClick={toggle}
            >
              <ChevronDownGlyph size="sm" className="crewlet-status-card__chevron" />
              <span className="crewlet-status-card__toggle-title">{title}</span>
              {/*
                THE SPACE IS A TEXT NODE, as in every disclosure trigger: a
                name is its parts joined with nothing between them, and a
                whitespace-only node between flex items is not laid out.
              */}
              {folded && hasSummary ? (
                <>
                  <VisuallyHidden>,</VisuallyHidden> <span className="crewlet-status-card__summary">{summary}</span>
                </>
              ) : null}
            </button>
          </Card.Title>
        ) : (
          <Card.Title id={titleId} truncate>
            {title}
          </Card.Title>
        )}
      </Card.Header>
      {/*
        KEPT IN THE TREE WHILE FOLDED, hidden rather than unmounted, so what
        the reader did inside it (a long table shown in full) is there when
        the card opens again, and the button has a panel to point at.
      */}
      {hasBody ? (
        <Card.Body
          id={collapsible ? bodyId : undefined}
          hidden={folded}
          padding={bodyPadding}
          className="crewlet-status-card__body"
        >
          {children}
        </Card.Body>
      ) : null}
      {/*
        IN A FOOTER WITH NO INSET, because a card built from its slots pads
        anything beside them in a body of its own: the strip has to reach the
        card's edges, and it draws its own hairline.
      */}
      {folded || strip === undefined || strip === null || strip === false ? null : (
        <Card.Footer padding="none" className="crewlet-status-card__strip">
          {strip}
        </Card.Footer>
      )}
      {collapsible || !hasActions ? null : (
        <Card.Footer className={cx('crewlet-status-card__actions', `crewlet-status-card__actions--${actionsAlign}`)}>
          {actions}
        </Card.Footer>
      )}
    </Card>
  );
}
