import type { AnchorHTMLAttributes } from 'react';
import { ChevronRightGlyph, SwatchBookGlyph } from '@crewlethq/icons/glyphs';
import { cx } from '../utils/cx.js';

export interface BrandChipProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'children'> {
  /** Where the chip goes: the company's Brand page. */
  href: string;
  /** What it says, which is its name: "Acme brand", or "Set up your brand". */
  label: string;
  /**
   * The brand's mark (its square logo), as an address the host has already
   * validated: the engine's file route through the dashboard's checked blob
   * path. Left out, the brand glyph stands in, which is also the chip an
   * administrator sees before a brand exists.
   */
  mark?: string | undefined;
}

/**
 * The company's brand, as a small link: its mark, its name and a chevron.
 *
 * WHERE IT IS DRAWN: the Make row of the artifacts gallery, the company theme
 * in the slides picker and the note under the ask-an-agent panel, so the
 * brand every new artifact follows is named where the artifact is started,
 * one press from where it is set.
 *
 * ONE LINK, NAMED BY ITS WORDS. The mark is decorative (the label says whose
 * brand it is), and the chevron says it goes somewhere.
 */
export function BrandChip({ href, label, mark, className, ...rest }: BrandChipProps) {
  return (
    <a {...rest} href={href} className={cx('crewlet-brand-chip', className)}>
      <span className={cx('crewlet-brand-chip__mark', !mark && 'crewlet-brand-chip__mark--glyph')} aria-hidden="true">
        {mark ? <img src={mark} alt="" className="crewlet-brand-chip__image" draggable={false} /> : <SwatchBookGlyph size="sm" />}
      </span>
      <span className="crewlet-brand-chip__label">{label}</span>
      <span className="crewlet-brand-chip__chevron" aria-hidden="true">
        <ChevronRightGlyph size="xs" />
      </span>
    </a>
  );
}
