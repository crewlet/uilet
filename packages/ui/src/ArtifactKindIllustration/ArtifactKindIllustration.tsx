import { useId, type ReactNode } from 'react';
import { CheckGlyph } from '@crewlethq/icons/glyphs';
import type { ArtifactKind } from '../ArtifactKindGlyph/index.js';
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
 * nothing live is drawn (never yet near, still loading, over the live budget,
 * failed or empty), and the face of a kind tile.
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

export interface ArtifactKindTileProps {
  kind: ArtifactKind;
  /** The name under the tile: "Docs", or a starting point's "Landing page". */
  label: string;
  /** Where starting one goes. Left out with `disabledReason`, the tile starts nothing. */
  href?: string | undefined;
  /**
   * What a press does, for a tile that starts something in place rather than
   * going somewhere (a create page's starting layouts): the tile is then a
   * button. `href` wins where both are given.
   */
  onSelect?: (() => void) | undefined;
  /**
   * For a tile that is a button: whether it is the one chosen (a starting
   * layout already picked). Drawn as every chosen option is, the selected
   * edge over the selected fill with a check beside the name, and announced
   * as a pressed button. Left out, the tile is an action with no state.
   */
  selected?: boolean | undefined;
  /**
   * Drawn on the kind's ground in place of its drawing: a picture of this
   * particular starting point, such as a design layout's schematic.
   */
  face?: ReactNode;
  /** One quiet line under the name saying what the tile starts: "3 boards". */
  detail?: ReactNode;
  /** A short tag after the name ("New", "Beta"), for a kind that is genuinely new. */
  badge?: string | undefined;
  /** Why this reader cannot start one. The tile stays focusable and says so. */
  disabledReason?: string | undefined;
  className?: string | undefined;
}

/**
 * One kind, or one starting point of a kind, as a tile: the kind's drawing on
 * its tinted ground (or the starting point's own `face`), framed, with its
 * name under it, such as a create page's starting layouts. The whole tile is
 * one link or button named by the name. The gallery's Make something new row
 * is the quieter `ArtifactMakeRow`, a toolbar of glyphs rather than pictures.
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
  face,
  detail,
  badge,
  disabledReason,
  className,
}: ArtifactKindTileProps) {
  const reasonId = useId();
  const detailId = useId();
  const off = disabledReason !== undefined || (href === undefined && onSelect === undefined);
  const body = (
    <>
      <span className="crewlet-kind-tile__frame">
        <ArtifactKindGround kind={kind} className="crewlet-kind-tile__ground">
          {face}
        </ArtifactKindGround>
      </span>
      <span className="crewlet-kind-tile__label">
        <span className="crewlet-kind-tile__name">{label}</span>
        {badge ? <span className="crewlet-kind-tile__badge">{badge}</span> : null}
        {/* The mark that says "this one" at 3:1, beside the tinted edge. */}
        {selected && href === undefined ? <CheckGlyph size="xs" className="crewlet-kind-tile__check" aria-hidden="true" /> : null}
      </span>
      {detail ? (
        <span id={detailId} className="crewlet-kind-tile__detail">
          {detail}
        </span>
      ) : null}
    </>
  );
  const describedBy = detail ? detailId : undefined;
  // THE NAME IS THE KIND, then its tag: "Docs, New". The two are spans side
  // by side, which an accessible name would run together as "DocsNew".
  const name = badge ? `${label}, ${badge}` : label;
  if (off) {
    return (
      <>
        <span
          role="link"
          tabIndex={0}
          aria-label={name}
          aria-disabled="true"
          aria-describedby={disabledReason ? reasonId : describedBy}
          title={disabledReason}
          className={cx('crewlet-kind-tile', 'crewlet-kind-tile--disabled', className)}
        >
          {body}
        </span>
        {disabledReason ? <VisuallyHidden id={reasonId}>{disabledReason}</VisuallyHidden> : null}
      </>
    );
  }
  if (href === undefined) {
    return (
      <button
        type="button"
        aria-label={name}
        aria-describedby={describedBy}
        aria-pressed={selected}
        className={cx('crewlet-kind-tile', 'crewlet-kind-tile--button', selected && 'is-selected', className)}
        onClick={onSelect}
      >
        {body}
      </button>
    );
  }
  return (
    <a href={href} aria-label={name} aria-describedby={describedBy} className={cx('crewlet-kind-tile', className)}>
      {body}
    </a>
  );
}
