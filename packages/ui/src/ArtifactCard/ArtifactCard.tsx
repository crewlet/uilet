import { useId, type ReactNode } from 'react';
import { PinGlyph } from '@crewlethq/icons/glyphs';
import { ArtifactAccessGlyph, type ArtifactAccess } from '../ArtifactAccess/index.js';
import { ArtifactKindGlyph, type ArtifactKind } from '../ArtifactKindGlyph/index.js';
import { ArtifactKindGround } from '../ArtifactKindIllustration/index.js';
import { AvatarStack, type AvatarStackMember } from '../Avatar/index.js';
import { Card } from '../Card/index.js';
import { Checkbox } from '../Checkbox/index.js';
import { PrincipalAvatar, type Principal } from '../Principal/index.js';
import { RelativeTime, type TimeValue } from '../RelativeTime/index.js';
import { Skeleton } from '../Skeleton/index.js';
import { cx } from '../utils/cx.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';

/**
 * What a card's preview draws when there is no cover: the kind's drawing on
 * its tinted ground (`ArtifactKindGround`). Exported for a host whose cover
 * has nothing to draw YET (its content still loading) or at all (a sheet with
 * no columns): a cover that rendered nothing left an empty box where every
 * other card has a picture, since the card cannot know that a cover it was
 * given drew nothing.
 */
export function ArtifactPreviewGlyph({ kind }: { kind: ArtifactKind }) {
  return <ArtifactKindGround kind={kind} />;
}

export type ArtifactCardSize = 'card' | 'compact';

export interface ArtifactCardLabels {
  kinds: Record<ArtifactKind, string>;
  pinned: string;
  version: (version: number) => string;
  changes: (count: number) => string;
  present: (count: number) => string;
  /** The change's time, opening the line: "Edited" before "4m ago". */
  updated: string;
  /** Who can open it, said to assistive technology beside its glyph. */
  access: Record<ArtifactAccess, string>;
  /** Who made it, after the time: "by Maya". */
  by: (name: string) => string;
  /** The selection box's name: "Select Vendor scorecard". */
  select: (title: string) => string;
}

const LABELS: ArtifactCardLabels = {
  kinds: { html: 'HTML', doc: 'Doc', slides: 'Slides', design: 'Design', dashboard: 'Dashboard', sheet: 'Sheet', brand: 'Brand' },
  pinned: 'Pinned',
  version: (version) => `v${version}`,
  changes: (count) => (count === 1 ? '1 change since you looked' : `${count} changes since you looked`),
  present: (count) => (count === 1 ? '1 here now' : `${count} here now`),
  updated: 'Edited',
  by: (name) => `by ${name}`,
  access: { private: 'Private', shared: 'Shared', company: 'Shared with the company' },
  select: (title) => `Select ${title}`,
};

/** How a pick was made, for a host that keeps the selection across a gallery. */
export interface ArtifactCardSelectionChange {
  /**
   * The reader held Shift: they are asking for every card between the one
   * they picked last and this one. The card cannot see its neighbours, so the
   * host that holds the selection draws the range.
   */
  range: boolean;
}

export interface ArtifactCardProps {
  title: string;
  kind: ArtifactKind;
  /** Where the card goes: the artifact's viewer. The whole card is one real link. */
  href: string;
  /**
   * A thumbnail drawn natively: a sheet's first rows, an author's cover image.
   * Never a screenshot. The kind's glyph stands in when there is none.
   */
  preview?: ReactNode;
  /** Who owns it. Leave it out where the reader is the owner and saying so would only repeat it. */
  owner?: Principal | undefined;
  updatedAt: TimeValue;
  /**
   * Who made the latest change, when it is worth saying ("Maya"): read as
   * "Updated 4m ago by Maya". Left unsaid where it is the owner, whose name
   * the line already carries.
   */
  updatedBy?: string | undefined;
  /** Who has it open now. */
  presence?: readonly AvatarStackMember[] | undefined;
  /** Changes since this reader last opened it. Nothing is drawn for none or for never opened. */
  changes?: number | undefined;
  pinned?: boolean | undefined;
  version?: number | undefined;
  /** The project or task it belongs to, as its key ("OPS", "ENG-412"). */
  project?: string | undefined;
  /** Who can open it, drawn as a glyph opening the card's line. Left out, nothing is said about it. */
  access?: ArtifactAccess | undefined;
  /**
   * The card's own controls (a More menu), drawn OUTSIDE its link in the
   * preview's top corner and shown on hover and while focus is inside the
   * card, so they are reachable by keyboard and never nested in the link.
   * The `card` size only.
   */
  actions?: ReactNode;
  /**
   * The card can be picked for a bulk action: a box on the preview's foot,
   * opposite the kind's badge, shown on hover, while focus is inside the card,
   * on a screen with no hover, and always once the card is picked or the
   * gallery is choosing (`selecting`). The `card` size only.
   */
  selectable?: boolean | undefined;
  /** It is picked: its box is ticked, and the card takes the selected edge and fill. */
  selected?: boolean | undefined;
  /**
   * The gallery is choosing (its Select toggle is on, or something is picked):
   * every box shows, and the card's body PICKS rather than opens, a label for
   * its box rather than a link, so a press anywhere on the card ticks it and a
   * reader is never sent away mid-selection. The More menu stays a menu.
   */
  selecting?: boolean | undefined;
  /** The box was ticked or cleared, with whether the reader asked for a range. */
  onSelectedChange?: ((selected: boolean, change: ArtifactCardSelectionChange) => void) | undefined;
  /** It is in the trash: the preview is drawn faded. */
  trashed?: boolean | undefined;
  /** `compact` is a row for a narrow rail or a phone, with no preview. */
  size?: ArtifactCardSize | undefined;
  className?: string | undefined;
  /** Overrides the shared clock, for a story or a suite. */
  now?: number | undefined;
  labels?: Partial<ArtifactCardLabels> | undefined;
}

/**
 * One artifact, as a card in a gallery or a row in a task's rail.
 *
 * THE CARD (`size="card"`) is a gallery's: a large preview of the artifact's
 * own content on top, the kind's glyph on a badge over the preview's foot,
 * then the title on one line and one quiet line under it, who can open it
 * and when it was last edited ("Edited 20h ago"), with the owner named when
 * the reader is not the owner.
 *
 * THE WHOLE CARD IS ONE LINK, named by the title alone and described by the
 * rest, so a reader moving through a gallery by link hears "Vendor scorecard"
 * and then, if they wait, what it is and who changed it. The card's own
 * controls (`actions`, a More menu) are drawn beside the link rather than
 * inside it, over the preview's corner, so they are real controls a keyboard
 * reaches in turn after the link.
 *
 * THE COMPACT ROW (`size="compact"`) is a task rail's: the kind's glyph, the
 * title and the facts, with no preview and no actions.
 */
export function ArtifactCard({
  title,
  kind,
  href,
  preview,
  owner,
  updatedAt,
  updatedBy,
  presence,
  changes,
  pinned = false,
  version,
  project,
  access,
  actions,
  selectable = false,
  selected = false,
  selecting = false,
  onSelectedChange,
  trashed = false,
  size = 'card',
  className,
  now,
  labels,
}: ArtifactCardProps) {
  const text = {
    ...LABELS,
    ...labels,
    kinds: { ...LABELS.kinds, ...labels?.kinds },
    access: { ...LABELS.access, ...labels?.access },
  };
  const titleId = useId();
  const factsId = useId();
  const boxId = useId();
  const present = presence && presence.length > 0 ? presence : null;
  // THE OWNER IS ALREADY ON THE LINE, so a change they made reads "Edited 4m
  // ago" beside their name rather than the name twice.
  const changedBy = updatedBy && updatedBy !== owner?.name ? updatedBy : undefined;
  const edited = (
    <span>
      {`${text.updated} `}
      <RelativeTime value={updatedAt} now={now} />
      {changedBy ? ` ${text.by(changedBy)}` : null}
    </span>
  );
  const extra =
    present || (changes !== undefined && changes > 0) ? (
      <span className="crewlet-artifact-card__line">
        {present ? (
          <span className="crewlet-artifact-card__presence">
            <AvatarStack members={present} max={3} size="xs" decorative />
            <span>{text.present(present.length)}</span>
          </span>
        ) : null}
        {changes !== undefined && changes > 0 ? <span className="crewlet-artifact-card__changes">{text.changes(changes)}</span> : null}
      </span>
    ) : null;

  if (size === 'compact') {
    return (
      <Card
        href={href}
        variant="subtle"
        padding="none"
        className={cx('crewlet-artifact-card', 'crewlet-artifact-card--compact', className)}
        aria-labelledby={titleId}
        aria-describedby={factsId}
      >
        <span className="crewlet-artifact-card__glyph crewlet-artifact-card__glyph--compact" aria-hidden>
          <ArtifactKindGlyph kind={kind} size="lg" />
        </span>
        <span className="crewlet-artifact-card__body">
          <span className="crewlet-artifact-card__title-row">
            <span id={titleId} className="crewlet-artifact-card__title" title={title}>
              {title}
            </span>
            {pinned ? (
              <span className="crewlet-artifact-card__pin" title={text.pinned} aria-hidden>
                <PinGlyph size="xs" />
              </span>
            ) : null}
          </span>
          <span id={factsId} className="crewlet-artifact-card__facts">
            <span className="crewlet-artifact-card__line">
              <span>{text.kinds[kind]}</span>
              {project ? <span>{project}</span> : null}
              {version !== undefined ? <span>{text.version(version)}</span> : null}
              {pinned ? <VisuallyHidden>{text.pinned}</VisuallyHidden> : null}
            </span>
            <span className="crewlet-artifact-card__line">
              {owner ? (
                <span className="crewlet-artifact-card__owner">
                  <PrincipalAvatar principal={owner} size="xs" />
                  <span>{owner.name}</span>
                </span>
              ) : null}
              {edited}
            </span>
            {extra}
          </span>
        </span>
      </Card>
    );
  }

  const picking = selectable && selecting;
  const bodyContent = (
    <>
      <span className="crewlet-artifact-card__preview" aria-hidden>
        {preview ?? <ArtifactPreviewGlyph kind={kind} />}
      </span>
      <span className="crewlet-artifact-card__body">
        <span className={cx('crewlet-artifact-card__badge', `crewlet-kind--${kind}`)} aria-hidden>
          <ArtifactKindGlyph kind={kind} size="sm" />
        </span>
        <span className="crewlet-artifact-card__title-row">
          <span id={titleId} className="crewlet-artifact-card__title" title={title}>
            {title}
          </span>
          {pinned ? (
            <span className="crewlet-artifact-card__pin" title={text.pinned} aria-hidden>
              <PinGlyph size="sm" />
            </span>
          ) : null}
        </span>
        <span id={factsId} className="crewlet-artifact-card__facts">
          {/* THE KIND AND THE PIN ARE SAID, not drawn: the badge and the pin
              glyph are pictures of them. */}
          <VisuallyHidden>
            {text.kinds[kind]}
            {pinned ? `, ${text.pinned}` : ''}
          </VisuallyHidden>
          <span className="crewlet-artifact-card__line crewlet-artifact-card__meta">
            {access ? (
              <span className="crewlet-artifact-card__access" title={text.access[access]}>
                <ArtifactAccessGlyph access={access} />
                <VisuallyHidden>{text.access[access]}</VisuallyHidden>
              </span>
            ) : null}
            {owner ? (
              <span className="crewlet-artifact-card__owner">
                <PrincipalAvatar principal={owner} size="xs" />
                <span className="crewlet-artifact-card__owner-name">{owner.name}</span>
              </span>
            ) : null}
            {edited}
          </span>
          {extra}
        </span>
      </span>
    </>
  );

  return (
    <div
      className={cx(
        'crewlet-artifact-card',
        'crewlet-artifact-card--card',
        trashed && 'crewlet-artifact-card--trashed',
        selectable && selected && 'is-selected',
        picking && 'crewlet-artifact-card--selecting',
        className,
      )}
    >
      {picking ? (
        // WHILE CHOOSING, THE BODY IS THE BOX'S LABEL: one press anywhere
        // ticks it. It is not a stop of its own; the box is, named for the
        // card, so a keyboard meets one control per card.
        <label htmlFor={boxId} className="crewlet-artifact-card__link">
          {bodyContent}
        </label>
      ) : (
        <a href={href} className="crewlet-artifact-card__link" aria-labelledby={titleId} aria-describedby={factsId}>
          {bodyContent}
        </a>
      )}
      {selectable ? (
        // THE BOX STANDS ON THE PREVIEW'S FOOT, not over its top: a cover's
        // own title starts at its top corner, and a box there hid its first
        // words. The anchor has the preview's shape, so the box sits on the
        // seam opposite the kind's badge whatever the card's width.
        <span className="crewlet-artifact-card__select-anchor">
          <span className="crewlet-artifact-card__select">
            <Checkbox
              id={boxId}
              hideLabel
              label={text.select(title)}
              checked={selected}
              aria-describedby={factsId}
              // THE BOX'S OWN CLICK CARRIES THE MODIFIERS, a press on the
              // card's body included: a label hands its press to its box as a
              // click with the same keys held.
              onChange={(event) =>
                onSelectedChange?.(event.target.checked, { range: (event.nativeEvent as Partial<MouseEvent>).shiftKey === true })
              }
            />
          </span>
        </span>
      ) : null}
      {actions ? <span className="crewlet-artifact-card__actions">{actions}</span> : null}
    </div>
  );
}

/**
 * A gallery card while its listing loads: the card's own shape (the preview
 * at its ratio, the badge over its foot, a title line and a meta line), so a
 * gallery that arrives replaces each placeholder in place rather than
 * reflowing the page. Decorative: the host says once what is loading
 * (`Skeleton`'s `label`, or its own status line).
 */
export function ArtifactCardSkeleton({ className }: { className?: string | undefined }) {
  return (
    <div className={cx('crewlet-artifact-card', 'crewlet-artifact-card--card', 'crewlet-artifact-card--skeleton', className)} aria-hidden>
      <span className="crewlet-artifact-card__preview">
        <Skeleton variant="box" width="100%" height="100%" borderRadius={0} />
      </span>
      <span className="crewlet-artifact-card__body">
        <span className="crewlet-artifact-card__badge" />
        <Skeleton variant="box" width="62%" height={18} borderRadius="var(--radius-sm)" />
        <Skeleton variant="box" width="38%" height={12} borderRadius="var(--radius-sm)" marginTop={6} />
      </span>
    </div>
  );
}
