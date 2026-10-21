import { useId } from 'react';
import { ArtifactKindGlyph, type ArtifactKind } from '../ArtifactKindGlyph/index.js';
import { HIT_AREA_CLASS } from '../HitArea/hitArea.js';
import { cx } from '../utils/cx.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';

/** One kind a reader can start from the row. */
export interface ArtifactMakeRowItem {
  kind: ArtifactKind;
  /** The kind's name, as what one makes: "Docs". */
  label: string;
  /** What the kind is for, in a few words under its name: "Live company figures". */
  detail?: string | undefined;
  /** Where starting one goes. Left out with `disabledReason`, the item starts nothing. */
  href?: string | undefined;
  /** Why this reader cannot start one. The item stays focusable and says so. */
  disabledReason?: string | undefined;
}

export interface ArtifactMakeRowProps {
  /** The kinds, in the order they are offered. */
  items: readonly ArtifactMakeRowItem[];
  /** What the row is called for assistive technology, when no heading names it. */
  'aria-label'?: string | undefined;
  /** The id of the heading that names the row. */
  'aria-labelledby'?: string | undefined;
  className?: string | undefined;
}

/**
 * The kinds a reader can start, as one quiet tray above their work: each
 * kind's glyph on its own tint, its name and what it is for, the whole item
 * one link. A toolbar for making things rather than a hero: one line high on
 * a wide page, the details dropped before a name is cut, and three across on
 * a phone.
 *
 * THE TRAY IS A WORKBENCH, Crewlet's dotted field under the kinds the way the
 * org chart's canvas sits under its seats, and an item lifts off it as a card
 * under the pointer. The glyph is the one coloured thing in each item, so six
 * hues read as six kinds and never as six coloured boxes.
 *
 * AN ITEM THAT CANNOT START is still a stop, so a reader moving through the
 * row by keyboard hears why (`disabledReason`) rather than finding a kind
 * missing.
 */
export function ArtifactMakeRow({
  items,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  className,
}: ArtifactMakeRowProps) {
  return (
    <div className={cx('crewlet-make-row', className)}>
      <ul className="crewlet-make-row__list" aria-label={ariaLabel} aria-labelledby={ariaLabelledBy}>
        {items.map((item) => (
          <li key={item.kind} className="crewlet-make-row__cell">
            <MakeItem item={item} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function MakeItem({ item }: { item: ArtifactMakeRowItem }) {
  const { kind, label, detail, href, disabledReason } = item;
  const detailId = useId();
  const reasonId = useId();
  const off = disabledReason !== undefined || href === undefined;
  const body = (
    <>
      <span className={cx('crewlet-make-row__mark', `crewlet-kind--${kind}`)} aria-hidden="true">
        <ArtifactKindGlyph kind={kind} size="sm" />
      </span>
      <span className="crewlet-make-row__words">
        <span className="crewlet-make-row__name">{label}</span>
        {detail ? (
          <span id={detailId} className="crewlet-make-row__detail">
            {detail}
          </span>
        ) : null}
      </span>
    </>
  );
  // THE NAME IS THE KIND and the detail its description, so a reader moving
  // through the row hears "Docs, link" and then what a doc is for, rather
  // than the two run together as one name.
  const describedBy = detail ? detailId : undefined;
  if (off) {
    return (
      <>
        <span
          role="link"
          tabIndex={0}
          aria-label={label}
          aria-disabled="true"
          aria-describedby={disabledReason ? reasonId : describedBy}
          title={disabledReason}
          className={cx('crewlet-make-row__item', 'crewlet-make-row__item--disabled', HIT_AREA_CLASS)}
        >
          {body}
        </span>
        {disabledReason ? <VisuallyHidden id={reasonId}>{disabledReason}</VisuallyHidden> : null}
      </>
    );
  }
  return (
    <a href={href} aria-label={label} aria-describedby={describedBy} className={cx('crewlet-make-row__item', HIT_AREA_CLASS)}>
      {body}
    </a>
  );
}
