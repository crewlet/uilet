import { useId, type ReactNode } from 'react';
import type { ArtifactKind } from '../ArtifactKindGlyph/index.js';
import { ArtifactKindGround } from '../ArtifactKindIllustration/index.js';
import { ArtifactKindMark } from '../ArtifactKindMark/index.js';
import { cx } from '../utils/cx.js';

export interface ArtifactTemplateCardProps {
  kind: ArtifactKind;
  /** The starting point's name: "Weekly review", "Blank". */
  title: string;
  /** One line on what it holds. */
  detail?: string | undefined;
  /**
   * The starting point drawn live (a doc's opening, a deck's cover, a
   * sheet's first rows), decorative. Without one the kind's ground stands in.
   */
  preview?: ReactNode;
  /** Chosen in a group of starting points: drawn ringed and said as pressed. */
  selected?: boolean | undefined;
  /** Choosing it. */
  onSelect: () => void;
  /** A short word over the preview's corner: "Blank", "Popular". */
  tag?: string | undefined;
  /** `card` (default) for a browser of starting points, `row` for a narrow rail. */
  layout?: 'card' | 'row' | undefined;
  className?: string | undefined;
}

/**
 * One starting point for a new artifact: a template, or blank. The card is
 * one button named by its title and described by its detail, its preview the
 * starting point itself drawn small by the same renderer the artifact uses,
 * so what a person picks is what they get.
 *
 * A CHOICE, NOT A LINK: picking one fills the editor beside it (or the next
 * step) rather than leaving the page, so a person can look through several
 * before committing to one.
 */
export function ArtifactTemplateCard({
  kind,
  title,
  detail,
  preview,
  selected,
  onSelect,
  tag,
  layout = 'card',
  className,
}: ArtifactTemplateCardProps) {
  const titleId = useId();
  const detailId = useId();
  return (
    <button
      type="button"
      className={cx('crewlet-template-card', `crewlet-template-card--${layout}`, `crewlet-kind--${kind}`, className)}
      aria-pressed={selected === undefined ? undefined : selected}
      // NAMED BY ITS TITLE ALONE, the detail read after it as its description.
      aria-labelledby={titleId}
      aria-describedby={detail ? detailId : undefined}
      onClick={onSelect}
    >
      <span className="crewlet-template-card__preview" aria-hidden="true">
        {preview ?? <ArtifactKindGround kind={kind} />}
        {tag ? <span className="crewlet-template-card__tag">{tag}</span> : null}
      </span>
      <span className="crewlet-template-card__body">
        {layout === 'row' ? null : <ArtifactKindMark kind={kind} size="sm" />}
        <span className="crewlet-template-card__words">
          <span id={titleId} className="crewlet-template-card__title">
            {title}
          </span>
          {detail ? (
            <span id={detailId} className="crewlet-template-card__detail">
              {detail}
            </span>
          ) : null}
        </span>
      </span>
    </button>
  );
}
