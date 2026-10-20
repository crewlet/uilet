import { PinGlyph } from '@crewlethq/icons/glyphs';
import { ArtifactKindGlyph, type ArtifactKind } from '../ArtifactKindGlyph/index.js';
import { cx } from '../utils/cx.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';

export interface ArtifactNameCellLabels {
  kinds: Record<ArtifactKind, string>;
  pinned: string;
}

const LABELS: ArtifactNameCellLabels = {
  kinds: { html: 'HTML', doc: 'Doc', slides: 'Slides', design: 'Design', dashboard: 'Dashboard', sheet: 'Sheet' },
  pinned: 'Pinned',
};

export interface ArtifactNameCellProps {
  kind: ArtifactKind;
  title: string;
  /**
   * What it is about, in a line under the title after the kind's word: the
   * artifact's own description. Left out, the kind's word stands alone.
   */
  detail?: string | undefined;
  pinned?: boolean | undefined;
  /** It is in the trash: its mark is drawn without its kind's tint. */
  trashed?: boolean | undefined;
  className?: string | undefined;
  labels?: Partial<ArtifactNameCellLabels> | undefined;
}

/**
 * An artifact's name in a list: its kind's glyph on the kind's tint, the
 * title, and under it the kind's word and what it is about.
 *
 * THE SAME MARK AS THE MAKE ROW'S, so a reader who started a doc from the
 * tray finds it in the list by the same tile in the same colour, and the
 * grid's badge and the list's mark name one kind one way. The mark is the one
 * coloured thing on the row; the words are the text steps.
 *
 * TWO LINES, ONE NAME. The title is the row's name and the line under it is
 * its description, each cut on one line with the whole of it on hover, so a
 * list of long titles keeps one row height. The kind's word is printed rather
 * than only drawn, which is what lets the list drop a Type column of its own.
 *
 * Not a link: the row it sits in is. The mark is decorative because the kind
 * is printed beside it.
 */
export function ArtifactNameCell({ kind, title, detail, pinned = false, trashed = false, className, labels }: ArtifactNameCellProps) {
  const text = { ...LABELS, ...labels, kinds: { ...LABELS.kinds, ...labels?.kinds } };
  const kindWord = text.kinds[kind];
  const about = detail?.trim();
  return (
    <span className={cx('crewlet-artifact-name', trashed && 'crewlet-artifact-name--trashed', className)}>
      <span className={cx('crewlet-artifact-name__mark', `crewlet-kind--${kind}`)} aria-hidden="true">
        <ArtifactKindGlyph kind={kind} size="sm" />
      </span>
      <span className="crewlet-artifact-name__words">
        <span className="crewlet-artifact-name__title-row">
          <span className="crewlet-artifact-name__title" title={title}>
            {title}
          </span>
          {pinned ? (
            <span className="crewlet-artifact-name__pin" title={text.pinned}>
              <PinGlyph size="xs" aria-hidden="true" />
              <VisuallyHidden>{text.pinned}</VisuallyHidden>
            </span>
          ) : null}
        </span>
        <span className="crewlet-artifact-name__detail" title={about ? `${kindWord}, ${about}` : kindWord}>
          <span className="crewlet-artifact-name__kind">{kindWord}</span>
          {about ? (
            <>
              <span className="crewlet-artifact-name__dot" aria-hidden="true">
                ·
              </span>
              <VisuallyHidden>, </VisuallyHidden>
              <span className="crewlet-artifact-name__about">{about}</span>
            </>
          ) : null}
        </span>
      </span>
    </span>
  );
}
