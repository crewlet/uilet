import { useId, type ReactNode } from 'react';
import type { ArtifactKind } from '../ArtifactKindGlyph/index.js';
import { ArtifactKindMark } from '../ArtifactKindMark/index.js';
import { Kbd } from '../Kbd/index.js';
import { cx } from '../utils/cx.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';

/**
 * A kind of artifact, pictured: a simple geometric drawing of what the kind
 * is (a page of prose, a slide, a phone screen, a board of bars, a window of
 * code, a grid of cells) in the kind's own hue.
 *
 * ONE HUE PER KIND, FROM THE TOKENS. Every mark is drawn in
 * `--color-artifact-kind-<kind>` at one of four fixed weights (the body, its
 * lines, a soft block and the one solid accent), so a theme repaints every
 * drawing by repainting the node hue the kind aliases, and nothing here holds
 * a colour of its own.
 *
 * DECORATION. The drawing is hidden from assistive technology: the kind's
 * name beside it is what is read.
 */
export function ArtifactKindIllustration({ kind, className }: { kind: ArtifactKind; className?: string | undefined }) {
  return (
    <svg
      viewBox="0 0 160 120"
      aria-hidden="true"
      focusable="false"
      className={cx('crewlet-kind-illustration', `crewlet-kind--${kind}`, className)}
    >
      {DRAWINGS[kind]}
    </svg>
  );
}

/*
 * THE DRAWINGS, on a 160 by 120 field with the object centred in it. Class
 * names are the weights: `b` the object's body (a translucent fill and its
 * hairline edge), `l` a line of content, `s` a soft block, `m` the one solid
 * mark, `c` a mark cut out of a solid one in the ground's colour.
 */
const DRAWINGS: Readonly<Record<ArtifactKind, ReactNode>> = {
  doc: (
    <>
      <rect className="b" x="52" y="12" width="56" height="96" rx="7" />
      <rect className="m" x="62" y="24" width="24" height="6" rx="3" />
      <rect className="l" x="62" y="38" width="36" height="4" rx="2" />
      <rect className="l" x="62" y="46" width="30" height="4" rx="2" />
      <rect className="l" x="62" y="54" width="34" height="4" rx="2" />
      <circle className="m" cx="65" cy="70" r="3.5" />
      <path className="c" d="M63.2 70.1l1.3 1.3 2.4-2.6" />
      <rect className="l" x="72" y="68" width="24" height="4" rx="2" />
      <circle className="s" cx="65" cy="80" r="3.5" />
      <rect className="l" x="72" y="78" width="20" height="4" rx="2" />
      <rect className="l" x="62" y="92" width="28" height="4" rx="2" />
    </>
  ),
  slides: (
    <>
      <rect className="b" x="22" y="24" width="116" height="72" rx="8" />
      <rect className="m" x="34" y="38" width="50" height="9" rx="4.5" />
      <rect className="l" x="34" y="55" width="42" height="5" rx="2.5" />
      <rect className="l" x="34" y="65" width="34" height="5" rx="2.5" />
      <rect className="s" x="92" y="50" width="34" height="32" rx="6" />
    </>
  ),
  design: (
    <>
      <rect className="b" x="58" y="8" width="44" height="104" rx="10" />
      <rect className="l" x="72" y="15" width="16" height="3.5" rx="1.75" />
      <circle className="s" cx="69" cy="33" r="4.5" />
      <rect className="l" x="77" y="31" width="17" height="4" rx="2" />
      <circle className="s" cx="69" cy="46" r="4.5" />
      <rect className="l" x="77" y="44" width="13" height="4" rx="2" />
      <rect className="l" x="65" y="57" width="30" height="22" rx="4" />
      <rect className="s" x="62" y="94" width="36" height="14" rx="6" />
      <circle className="m" cx="71" cy="101" r="2.2" />
      <circle className="c c--fill" cx="80" cy="101" r="2.2" />
      <circle className="c c--fill" cx="89" cy="101" r="2.2" />
    </>
  ),
  dashboard: (
    <>
      <rect className="b" x="22" y="24" width="116" height="72" rx="8" />
      <rect className="l" x="34" y="34" width="26" height="4" rx="2" />
      <rect className="s" x="40" y="66" width="13" height="18" rx="3.5" />
      <rect className="s" x="60" y="56" width="13" height="28" rx="3.5" />
      <rect className="m" x="80" y="42" width="13" height="42" rx="3.5" />
      <rect className="s" x="100" y="60" width="13" height="24" rx="3.5" />
    </>
  ),
  html: (
    <>
      <rect className="b" x="22" y="22" width="116" height="76" rx="8" />
      <circle className="l" cx="33" cy="32" r="2.5" />
      <circle className="l" cx="41" cy="32" r="2.5" />
      <circle className="l" cx="49" cy="32" r="2.5" />
      <path className="r" d="M22.75 41h114.5" />
      <path className="k" d="M60 58l-11 9 11 9" />
      <path className="k" d="M100 58l11 9-11 9" />
      <path className="k k--soft" d="M86 54l-12 26" />
    </>
  ),
  sheet: (
    <>
      <rect className="b" x="22" y="22" width="116" height="76" rx="8" />
      <path className="r" d="M22.75 40h114.5M22.75 54h114.5M22.75 68h114.5M22.75 82h114.5M60 22.75v74.5M100 22.75v74.5" />
      <rect className="s" x="30" y="29" width="22" height="4.5" rx="2.25" />
      <rect className="s" x="68" y="29" width="22" height="4.5" rx="2.25" />
      <rect className="s" x="108" y="29" width="22" height="4.5" rx="2.25" />
      <rect className="l" x="30" y="45" width="18" height="4" rx="2" />
      <rect className="l" x="68" y="45" width="24" height="4" rx="2" />
      <rect className="l" x="108" y="45" width="16" height="4" rx="2" />
      <rect className="l" x="30" y="59" width="22" height="4" rx="2" />
      <rect className="m" x="64" y="57" width="32" height="8" rx="2.5" />
      <rect className="l" x="108" y="59" width="20" height="4" rx="2" />
      <rect className="l" x="30" y="73" width="16" height="4" rx="2" />
      <rect className="l" x="68" y="73" width="20" height="4" rx="2" />
      <rect className="l" x="108" y="73" width="22" height="4" rx="2" />
      <rect className="l" x="30" y="87" width="20" height="4" rx="2" />
      <rect className="l" x="68" y="87" width="14" height="4" rx="2" />
    </>
  ),
};

/**
 * A kind's drawing on its tinted ground: the stand-in a preview shows while
 * nothing live is drawn (off screen, still loading, over the live budget,
 * failed or empty), and the face of a Make something new tile.
 */
export function ArtifactKindGround({
  kind,
  className,
  children,
}: {
  kind: ArtifactKind;
  className?: string | undefined;
  /** Drawn over the ground in place of the kind's drawing. */
  children?: ReactNode;
}) {
  return (
    <span aria-hidden="true" className={cx('crewlet-kind-ground', `crewlet-kind--${kind}`, className)}>
      {children ?? <ArtifactKindIllustration kind={kind} />}
    </span>
  );
}

/**
 * How a Make tile pictures its kind.
 *
 * - `illustration`: the kind's drawing on its tinted ground, framed (the
 *   default, and the tile 0.34 shipped).
 * - `stage`: the kind's maker character presenting the kind's object on a
 *   dotted canvas of the kind's fill, the org chart's own ground: shorter than
 *   the illustration, with a line under the name saying who makes it.
 * - `figure`: the maker character standing on its own, unframed, on the
 *   page's ground, for a row that reads as the crew offering to help.
 * - `chip`: one line, the kind's mark beside its name and an optional
 *   shortcut, for a composer's or a toolbar's row of kinds.
 * - `preview`: a frame holding `children` (a starting point drawn live), the
 *   kind's mark standing over its foot as a gallery card's badge does.
 */
export type ArtifactKindTileAppearance = 'illustration' | 'stage' | 'figure' | 'chip' | 'preview';

export interface ArtifactKindTileProps {
  kind: ArtifactKind;
  /** The kind's name, under the tile: "Docs". */
  label: string;
  /** Where starting one goes. Left out with `disabledReason`, the tile starts nothing. */
  href?: string | undefined;
  /**
   * Starting one opens something on this page (a panel, a composer, a menu)
   * rather than going anywhere: the tile is a button. Wins over `href`.
   */
  onSelect?: (() => void) | undefined;
  /**
   * The kind this row has chosen, for a row of tiles that acts as a choice (a
   * composer's kinds): drawn chosen and said as pressed. Only read with
   * `onSelect`.
   */
  selected?: boolean | undefined;
  /** A short tag after the name ("New", "Beta"), for a kind that is genuinely new. */
  badge?: string | undefined;
  /** One line under the name, read after it: what starting one does ("You write it", "An agent builds it"). */
  hint?: string | undefined;
  /** A key that starts one on this page, drawn at the chip's end (`chip` only). */
  shortcut?: string | undefined;
  /** Why this reader cannot start one. The tile stays focusable and says so. */
  disabledReason?: string | undefined;
  /** Defaults to `illustration`. */
  appearance?: ArtifactKindTileAppearance | undefined;
  /** What a `preview` tile frames: a starting point, drawn live. Ignored by every other appearance. */
  children?: ReactNode;
  className?: string | undefined;
}

/** The face each appearance draws above (or, for a chip, before) the name. */
function TileFace({ kind, appearance, children }: { kind: ArtifactKind; appearance: ArtifactKindTileAppearance; children?: ReactNode }) {
  switch (appearance) {
    case 'chip':
      return <ArtifactKindMark kind={kind} size="sm" className="crewlet-kind-tile__mark" />;
    case 'figure':
      return (
        <span className="crewlet-kind-tile__figure" aria-hidden="true">
          <ArtifactKindMark kind={kind} size="xl" surface="bare" className="crewlet-kind-tile__character" />
        </span>
      );
    case 'stage':
      return (
        <span className="crewlet-kind-tile__frame">
          <span aria-hidden="true" className={cx('crewlet-kind-tile__stage', `crewlet-kind--${kind}`)}>
            <span className="crewlet-kind-tile__object">
              <ArtifactKindIllustration kind={kind} />
            </span>
            <ArtifactKindMark kind={kind} size="lg" className="crewlet-kind-tile__maker" />
          </span>
        </span>
      );
    case 'preview':
      return (
        <span className="crewlet-kind-tile__frame crewlet-kind-tile__frame--preview">
          <span aria-hidden="true" className="crewlet-kind-tile__preview">
            {children ?? <ArtifactKindGround kind={kind} />}
          </span>
          <ArtifactKindMark kind={kind} size="md" className="crewlet-kind-tile__badge-mark" />
        </span>
      );
    case 'illustration':
      return (
        <span className="crewlet-kind-tile__frame">
          <ArtifactKindGround kind={kind} className="crewlet-kind-tile__ground" />
        </span>
      );
  }
}

/**
 * One kind on a "Make something new" row: a picture of the kind
 * ([ArtifactKindTileAppearance]) and its name. The whole tile is one link, or
 * one button with `onSelect`, named by the kind's name and described by its
 * hint.
 *
 * A TILE THAT CANNOT START is still a stop on the row, so a reader moving
 * through it by keyboard hears why (`disabledReason`) rather than finding a
 * kind missing.
 */
export function ArtifactKindTile({
  kind,
  label,
  href,
  onSelect,
  selected,
  badge,
  hint,
  shortcut,
  disabledReason,
  appearance = 'illustration',
  children,
  className,
}: ArtifactKindTileProps) {
  const reasonId = useId();
  const hintId = useId();
  const off = disabledReason !== undefined || (href === undefined && onSelect === undefined);
  const chip = appearance === 'chip';
  const body = (
    <>
      <TileFace kind={kind} appearance={appearance}>
        {children}
      </TileFace>
      <span className="crewlet-kind-tile__label">
        <span className="crewlet-kind-tile__words">
          <span className="crewlet-kind-tile__name">
            {label}
            {badge ? <span className="crewlet-kind-tile__badge">{badge}</span> : null}
          </span>
          {hint && !chip ? (
            <span id={hintId} className="crewlet-kind-tile__hint">
              {hint}
            </span>
          ) : null}
        </span>
        {chip && shortcut ? <Kbd className="crewlet-kind-tile__shortcut">{shortcut}</Kbd> : null}
      </span>
    </>
  );
  // THE NAME IS THE KIND, then its tag: "Docs, New". The two are spans side
  // by side, which an accessible name would run together as "DocsNew". The
  // hint is a description, read after the name.
  const name = badge ? `${label}, ${badge}` : label;
  const classes = cx('crewlet-kind-tile', `crewlet-kind-tile--${appearance}`, `crewlet-kind--${kind}`, className);
  const described = hint && !chip ? hintId : undefined;
  if (off) {
    return (
      <>
        <span
          role="link"
          tabIndex={0}
          aria-label={name}
          aria-disabled="true"
          aria-describedby={disabledReason ? reasonId : described}
          title={disabledReason}
          className={cx(classes, 'crewlet-kind-tile--disabled')}
        >
          {body}
        </span>
        {disabledReason ? <VisuallyHidden id={reasonId}>{disabledReason}</VisuallyHidden> : null}
      </>
    );
  }
  if (onSelect) {
    return (
      <button
        type="button"
        aria-label={name}
        aria-describedby={described}
        aria-pressed={selected === undefined ? undefined : selected}
        className={cx(classes, 'crewlet-kind-tile--action')}
        onClick={onSelect}
      >
        {body}
      </button>
    );
  }
  return (
    <a href={href} aria-label={name} aria-describedby={described} className={cx(classes, 'crewlet-kind-tile--action')}>
      {body}
    </a>
  );
}
