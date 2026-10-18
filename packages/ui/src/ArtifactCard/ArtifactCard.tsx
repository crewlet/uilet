import { useId, type ReactNode } from 'react';
import { FileCodeGlyph, FileTextGlyph, PinGlyph, TableGlyph, type GlyphSize } from '@crewlethq/icons/glyphs';
import { AvatarStack, type AvatarStackMember } from '../Avatar/index.js';
import { Card } from '../Card/index.js';
import { PrincipalAvatar, type Principal } from '../Principal/index.js';
import { RelativeTime, type TimeValue } from '../RelativeTime/index.js';
import { cx } from '../utils/cx.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';

/** What an artifact is, as the engine names it (`artifacts.Kind`), which decides how it is drawn. */
export type ArtifactKind = 'html' | 'markdown' | 'sheet';

export const ARTIFACT_KINDS = ['html', 'markdown', 'sheet'] as const satisfies readonly ArtifactKind[];

const KIND_GLYPHS: Readonly<Record<ArtifactKind, typeof FileCodeGlyph>> = {
  html: FileCodeGlyph,
  markdown: FileTextGlyph,
  sheet: TableGlyph,
};

/** The glyph a kind is drawn with, wherever a kind is drawn, at a glyph size step or in px. */
export function ArtifactKindGlyph({ kind, size = 'md' }: { kind: ArtifactKind; size?: GlyphSize | undefined }) {
  const Drawn = KIND_GLYPHS[kind];
  return <Drawn size={size} />;
}

export type ArtifactCardSize = 'card' | 'compact';

export interface ArtifactCardLabels {
  kinds: Record<ArtifactKind, string>;
  pinned: string;
  version: (version: number) => string;
  changes: (count: number) => string;
  present: (count: number) => string;
  updated: string;
}

const LABELS: ArtifactCardLabels = {
  kinds: { html: 'Page', markdown: 'Document', sheet: 'Sheet' },
  pinned: 'Pinned',
  version: (version) => `v${version}`,
  changes: (count) => (count === 1 ? '1 change since you looked' : `${count} changes since you looked`),
  present: (count) => (count === 1 ? '1 here now' : `${count} here now`),
  updated: 'Updated',
};

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
  owner?: Principal | undefined;
  updatedAt: TimeValue;
  /** Who made the latest change, when it is worth saying ("Maya"). */
  updatedBy?: string | undefined;
  /** Who has it open now. */
  presence?: readonly AvatarStackMember[] | undefined;
  /** Changes since this reader last opened it. Nothing is drawn for none or for never opened. */
  changes?: number | undefined;
  pinned?: boolean | undefined;
  version?: number | undefined;
  /** The project or task it belongs to, as its key ("OPS", "ENG-412"). */
  project?: string | undefined;
  /** `compact` is a row for a narrow rail or a phone, with no preview. */
  size?: ArtifactCardSize | undefined;
  className?: string | undefined;
  /** Overrides the shared clock, for a story or a suite. */
  now?: number | undefined;
  labels?: Partial<ArtifactCardLabels> | undefined;
}

/**
 * One artifact, as a card in a gallery, a row in a task's rail or an embed.
 *
 * THE WHOLE CARD IS ONE LINK, named by the title alone and described by the
 * rest, so a reader moving through a gallery by link hears "Vendor scorecard"
 * and then, if they wait, what it is and who changed it. Nothing inside is a
 * second control: a pin or a menu inside a link is a control nobody can reach
 * without opening the artifact. Those live on the gallery row's own menu.
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
  size = 'card',
  className,
  now,
  labels,
}: ArtifactCardProps) {
  const text = { ...LABELS, ...labels, kinds: { ...LABELS.kinds, ...labels?.kinds } };
  const titleId = useId();
  const factsId = useId();
  const present = presence && presence.length > 0 ? presence : null;

  return (
    <Card
      href={href}
      variant="subtle"
      padding="none"
      className={cx('crewlet-artifact-card', `crewlet-artifact-card--${size}`, className)}
      aria-labelledby={titleId}
      aria-describedby={factsId}
    >
      {size === 'card' ? (
        <span className="crewlet-artifact-card__preview" aria-hidden>
          {preview ?? (
            <span className="crewlet-artifact-card__glyph">
              <ArtifactKindGlyph kind={kind} size={32} />
            </span>
          )}
        </span>
      ) : (
        <span className="crewlet-artifact-card__glyph crewlet-artifact-card__glyph--compact" aria-hidden>
          <ArtifactKindGlyph kind={kind} size="lg" />
        </span>
      )}
      <span className="crewlet-artifact-card__body">
        <span className="crewlet-artifact-card__title-row">
          <span id={titleId} className="crewlet-artifact-card__title">
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
            <span>
              {updatedBy ? `${updatedBy} ` : `${text.updated} `}
              <RelativeTime value={updatedAt} now={now} />
            </span>
          </span>
          {present || (changes !== undefined && changes > 0) ? (
            <span className="crewlet-artifact-card__line">
              {present ? (
                <span className="crewlet-artifact-card__presence">
                  <AvatarStack members={present} max={3} size="xs" decorative />
                  <span>{text.present(present.length)}</span>
                </span>
              ) : null}
              {changes !== undefined && changes > 0 ? <span className="crewlet-artifact-card__changes">{text.changes(changes)}</span> : null}
            </span>
          ) : null}
        </span>
      </span>
    </Card>
  );
}
