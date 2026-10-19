import type { ReactNode } from 'react';
import { ChevronLeftGlyph, ChevronRightGlyph } from '@crewlethq/icons/glyphs';
import { IconButton } from '../IconButton/index.js';
import { cx } from '../utils/cx.js';

export interface SlideNavLabels {
  /** The group's name. */
  nav: string;
  previous: string;
  next: string;
  /** Why Previous is off on the first slide. */
  start: string;
  /** Why Next is off on the last slide. */
  end: string;
  position: (position: number, total: number) => string;
}

export const SLIDE_NAV_LABELS: SlideNavLabels = {
  nav: 'Slide controls',
  previous: 'Previous slide',
  next: 'Next slide',
  start: 'This is the first slide',
  end: 'End of the deck',
  position: (position, total) => `${position} of ${total}`,
};

/**
 * Where the controls sit: `page` on the interface's own ground, `projection`
 * floating over a slide shown full screen, on a scrim in its own light ink
 * whatever the theme, since the letterbox under it is black in every theme.
 */
export type SlideNavTone = 'page' | 'projection';

export interface SlideNavProps {
  /** One-based. */
  position: number;
  total: number;
  onPrevious: () => void;
  onNext: () => void;
  tone?: SlideNavTone | undefined;
  /**
   * Controls after Next, set apart by a rule: Full screen. IconButtons take
   * the tone; give them `size="sm"`, the step Previous and Next are drawn at.
   */
  children?: ReactNode;
  className?: string | undefined;
  labels?: Partial<SlideNavLabels> | undefined;
}

/**
 * Previous, where the show is, and Next: the one set of controls every way of
 * presenting a deck moves by, in the page, full screen and at the lectern.
 *
 * A TOOLBAR'S STEP: Previous and Next are the small control step, as tall as
 * the buttons a toolbar or a panel sets beside them (the presenter's Pause).
 *
 * STOPS AT THE ENDS, SAYING WHY. Previous on the first slide and Next on the
 * last are off, with the reason on the control, rather than pressable and
 * doing nothing. The position is tabular in a fixed width, so the controls
 * either side of it do not move as the count changes. It is not a live region:
 * the host announces each slide as it arrives, by its number and its title,
 * and a second announcement of the number alone would repeat it.
 */
export function SlideNav({
  position,
  total,
  onPrevious,
  onNext,
  tone = 'page',
  children,
  className,
  labels,
}: SlideNavProps) {
  const text = { ...SLIDE_NAV_LABELS, ...labels };
  return (
    <div className={cx('crewlet-slide-nav', `crewlet-slide-nav--${tone}`, className)} role="group" aria-label={text.nav}>
      <IconButton
        label={text.previous}
        icon={<ChevronLeftGlyph />}
        variant="ghost"
        size="sm"
        onClick={onPrevious}
        disabledReason={position <= 1 ? text.start : undefined}
      />
      <span className="crewlet-slide-nav__position">{text.position(position, total)}</span>
      <IconButton
        label={text.next}
        icon={<ChevronRightGlyph />}
        variant="ghost"
        size="sm"
        onClick={onNext}
        disabledReason={position >= total ? text.end : undefined}
      />
      {children ? <span className="crewlet-slide-nav__more">{children}</span> : null}
    </div>
  );
}
