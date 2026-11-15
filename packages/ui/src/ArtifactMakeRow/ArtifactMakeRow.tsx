import { useId, type CSSProperties } from 'react';
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
 * The kinds a reader can start, as one quiet tray of links with no empty cell.
 * A kind that cannot start stays a stop, so the keyboard hears why
 * (`disabledReason`) rather than finding it missing.
 */
export function ArtifactMakeRow({
  items,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  className,
}: ArtifactMakeRowProps) {
  return (
    <div className={cx('crewlet-make-row', className)}>
      {/* The count as a property for the wide line's columns, and as an
          attribute for the narrow tray's selectors, which cannot read one. */}
      <ul
        className="crewlet-make-row__list"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        data-count={items.length}
        style={{ '--crewlet-make-row-count': items.length } as CSSProperties}
      >
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
          <span id={detailId} className="crewlet-make-row__detail" aria-hidden="true">
            {detail}
          </span>
        ) : null}
      </span>
    </>
  );
  // The tile's own words name it (the kind); the detail is hidden from the
  // name and read through aria-describedby, which reads a hidden element.
  const describedBy = detail ? detailId : undefined;
  if (off) {
    return (
      <>
        <span
          role="link"
          tabIndex={0}
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
    <a href={href} aria-describedby={describedBy} className={cx('crewlet-make-row__item', HIT_AREA_CLASS)}>
      {body}
    </a>
  );
}
