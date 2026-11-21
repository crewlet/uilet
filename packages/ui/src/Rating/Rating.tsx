import type { HTMLAttributes } from 'react';
import { StarGlyph, type GlyphSizeStep } from '@crewlethq/icons/glyphs';
import { cx } from '../utils/cx.js';

/** Every sentence the rating says. */
export interface RatingLabels {
  /** Its name, read in place of the stars: "Rated 4.6 out of 5". */
  name: (value: number, max: number) => string;
}

export const RATING_LABELS: RatingLabels = {
  name: (value, max) => `Rated ${value.toLocaleString()} out of ${max}`,
};

export interface RatingProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** The stars given: a whole number for one review, or an average ("4.6"), from 0 to `max`. */
  value: number;
  /** How many stars the scale has. Five by default. */
  max?: number | undefined;
  /** The stars' step. `sm` by default, a line of text's. */
  size?: GlyphSizeStep | undefined;
  /** Draws the figure after the stars, for an average whose half stars cannot say 4.6 from 4.4. */
  showValue?: boolean | undefined;
  labels?: Partial<RatingLabels> | undefined;
}

/**
 * A star rating, read only: a review's stars, or an app's average.
 *
 * TO THE NEAREST HALF STAR, READ EXACTLY. An average fills the stars it rounds
 * to by halves, and its name says the figure itself ("Rated 4.6 out of 5"),
 * so the picture and the words never disagree about anything but the
 * rounding a picture needs. `showValue` draws the figure too.
 *
 * A QUANTITY, NOT A STATE: the stars take the text's ink and the control
 * edge, never the warning hue, which read as an alert (as the sheet's rating
 * cells do). A half star is a filled star cut at its middle, by a class
 * rather than a style attribute a strict Content-Security-Policy would refuse.
 */
export function Rating({ value, max = 5, size = 'sm', showValue = false, labels: overrides, className, ...rest }: RatingProps) {
  const labels = { ...RATING_LABELS, ...overrides };
  const scale = Math.max(1, Math.round(max));
  const given = Number.isFinite(value) ? Math.min(Math.max(value, 0), scale) : 0;
  const halves = Math.round(given * 2);
  return (
    <span {...rest} role="img" aria-label={labels.name(given, scale)} className={cx('crewlet-rating', className)}>
      {Array.from({ length: scale }, (_, index) => {
        const fill = Math.min(Math.max(halves - index * 2, 0), 2);
        return (
          <span key={index} className="crewlet-rating__star" aria-hidden="true">
            <StarGlyph size={size} className="crewlet-rating__off" />
            {fill === 0 ? null : (
              <StarGlyph size={size} filled className={cx('crewlet-rating__on', fill === 1 && 'crewlet-rating__on--half')} />
            )}
          </span>
        );
      })}
      {showValue ? (
        <span className="crewlet-rating__value" aria-hidden="true">
          {given.toLocaleString(undefined, { maximumFractionDigits: 1 })}
        </span>
      ) : null}
    </span>
  );
}
