import type { CSSProperties } from 'react';
import { CircleAlertGlyph, CircleCheckGlyph, TriangleAlertGlyph } from '@crewlethq/icons/glyphs';
import { WCAG_CONTRAST, contrast, parseHex } from '@crewlethq/tokens';
import { Tag } from '../Tag/index.js';
import { cx } from '../utils/cx.js';
import { normalizeHex } from '../utils/hexColour.js';
import type { Tone } from '../utils/tone.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';

/**
 * What a pair is read as. `body` is text at the body's size, held to 4.5:1
 * for AA and 7:1 for AAA. `large` is large text and every graphical mark (a
 * logo, an accent on a ground), held to 3:1 for AA and 4.5:1 for AAA.
 */
export type ContrastScale = 'body' | 'large';

/**
 * Where a pair stands: AAA, AA, AA for large text only (body text that clears
 * 3:1 but not 4.5:1), or under every floor its scale has.
 */
export type ContrastLevel = 'aaa' | 'aa' | 'aa-large' | 'fail';

/**
 * What the badge draws: a level, or `low`, which an ADVISORY badge draws for
 * a pair under its scale's AA floor in place of `aa-large` or `fail`.
 */
export type ContrastBadgeLevel = ContrastLevel | 'low';

/**
 * The level a measured ratio reaches, on the floors `@crewlethq/tokens`
 * exports. The ratio is compared UNROUNDED: a pair that passes only once
 * rounded does not pass.
 */
export function contrastLevel(ratio: number, scale: ContrastScale = 'body'): ContrastLevel {
  if (scale === 'large') {
    if (ratio >= WCAG_CONTRAST.aaaLarge) return 'aaa';
    if (ratio >= WCAG_CONTRAST.aaLarge) return 'aa';
    return 'fail';
  }
  if (ratio >= WCAG_CONTRAST.aaa) return 'aaa';
  if (ratio >= WCAG_CONTRAST.aa) return 'aa';
  if (ratio >= WCAG_CONTRAST.aaLarge) return 'aa-large';
  return 'fail';
}

/**
 * The ratio between two `#rrggbb` colours, or null when either is not one.
 * The one measurement every brand part takes, from `@crewlethq/tokens`.
 */
export function contrastRatio(foreground: string, background: string): number | null {
  const a = parseHex(foreground);
  const b = parseHex(background);
  return a && b ? contrast(a, b) : null;
}

/**
 * A ratio as printed, cut DOWN to two places and never rounded up, so the
 * number shown never claims a floor the pair misses: 4.497 is "4.49", not
 * "4.5".
 */
export function formatContrastRatio(ratio: number): string {
  const cut = Math.floor(ratio * 100) / 100;
  return String(Number(cut.toFixed(2)));
}

export interface ContrastBadgeLabels {
  levels: Record<ContrastBadgeLevel, string>;
  /** Said for a pair that cannot be measured (a colour not set yet). */
  unmeasured: string;
  /** The ratio, said in words: "4.49 to 1". */
  ratio: (ratio: string) => string;
  /** The letters the sample draws the pair with. */
  sample: string;
}

const LABELS: ContrastBadgeLabels = {
  levels: { aaa: 'AAA', aa: 'AA', 'aa-large': 'AA large text', fail: 'Fails', low: 'Low' },
  unmeasured: 'Not measured',
  ratio: (ratio) => `${ratio} to 1`,
  sample: 'Aa',
};

const TONE: Record<ContrastBadgeLevel, Tone> = {
  aaa: 'success',
  aa: 'success',
  'aa-large': 'warning',
  fail: 'danger',
  low: 'warning',
};

/** The words a caller may replace: any of them, and any of the level words. */
export type ContrastBadgeLabelsInput = Partial<Omit<ContrastBadgeLabels, 'levels'>> & {
  levels?: Partial<Record<ContrastBadgeLevel, string>> | undefined;
};

export interface ContrastBadgeProps {
  /** The colour read: text, a logo, an accent. `#rrggbb`. */
  foreground: string;
  /** The colour it is read on. `#rrggbb`. */
  background: string;
  /** What the pair is: "Text on light ground". */
  label?: string | undefined;
  /** What it is read as: body text (the default), or large text and marks. */
  scale?: ContrastScale | undefined;
  /**
   * The pair is a warning and never a block: under its scale's AA floor it
   * reads "Low" in the warning tone, rather than "AA large text" or "Fails"
   * in the danger tone. For a pair a person is told about and allowed to
   * keep, such as a brand's primary on its light ground; a pair that blocks
   * (a brand's text on its light ground) leaves it off and keeps "Fails".
   */
  advisory?: boolean | undefined;
  className?: string | undefined;
  labels?: ContrastBadgeLabelsInput | undefined;
}

/**
 * Whether one colour reads on another: a sample of the pair, the measured
 * ratio, and the level it reaches.
 *
 * THE MEASUREMENT IS THE TOKENS PACKAGE'S. The ratio comes from
 * `@crewlethq/tokens`' `contrast()`, the same maths the palette suite holds
 * every theme to, and the floors from its `WCAG_CONTRAST`, so the badge an
 * administrator reads and the gate a theme passes never disagree.
 *
 * BLOCKING OR ADVISORY. By default a pair under every floor "Fails" in the
 * danger tone. An `advisory` pair is one a person may keep: under its AA
 * floor it reads "Low" in the warning tone with the warning glyph, so a
 * screen of pairs tells the one that blocks from the ones that only warn.
 *
 * THE LEVEL IS A WORD AND A GLYPH, never the tint alone, and the ratio is
 * said as "4.49 to 1" rather than read out as punctuation. The sample is
 * decoration: it shows the pair, and the words say how it measures.
 */
export function ContrastBadge({
  foreground,
  background,
  label,
  scale = 'body',
  advisory = false,
  className,
  labels,
}: ContrastBadgeProps) {
  const text = { ...LABELS, ...labels, levels: { ...LABELS.levels, ...labels?.levels } };
  const ink = normalizeHex(foreground);
  const ground = normalizeHex(background);
  const ratio = ink && ground ? contrastRatio(ink, ground) : null;
  const measured = ratio === null ? null : contrastLevel(ratio, scale);
  const level: ContrastBadgeLevel | null =
    advisory && (measured === 'fail' || measured === 'aa-large') ? 'low' : measured;
  const printed = ratio === null ? null : formatContrastRatio(ratio);
  const sample =
    ink && ground
      ? ({ '--crewlet-contrast-badge-ink': ink, '--crewlet-contrast-badge-ground': ground } as CSSProperties)
      : undefined;
  return (
    <span className={cx('crewlet-contrast-badge', level && `crewlet-contrast-badge--${level}`, className)}>
      <span className={cx('crewlet-contrast-badge__sample', ratio === null && 'is-empty')} style={sample} aria-hidden="true">
        {text.sample}
      </span>
      {label ? <span className="crewlet-contrast-badge__label">{label}</span> : null}
      {printed !== null && level !== null ? (
        <>
          <span className="crewlet-contrast-badge__ratio">
            <span aria-hidden="true">{`${printed}:1`}</span>
            <VisuallyHidden>{text.ratio(printed)}</VisuallyHidden>
          </span>
          <Tag
            size="xs"
            variant={TONE[level]}
            leadingIcon={
              level === 'fail' ? (
                <CircleAlertGlyph size="xs" />
              ) : level === 'aa-large' || level === 'low' ? (
                <TriangleAlertGlyph size="xs" />
              ) : (
                <CircleCheckGlyph size="xs" />
              )
            }
          >
            {text.levels[level]}
          </Tag>
        </>
      ) : (
        <span className="crewlet-contrast-badge__unmeasured">{text.unmeasured}</span>
      )}
    </span>
  );
}
