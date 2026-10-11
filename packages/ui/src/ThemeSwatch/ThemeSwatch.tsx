import type { CSSProperties, HTMLAttributes } from 'react';
import { cx } from '../utils/cx.js';

/**
 * The colours a theme's thumbnail is drawn with, in one mode: the shape of a
 * `themeRegistry` entry's `swatch.dark` and `swatch.light` in
 * `@crewlethq/tokens`, which the build reads off the sheet that paints the
 * theme.
 */
export interface ThemeSwatchColours {
  frame: string;
  sheet: string;
  card: string;
  raised: string;
  hairline: string;
  text: string;
  muted: string;
  accent: string;
  onAccent: string;
  info: string;
  warning: string;
  danger: string;
  success: string;
}

/** A theme's two palettes, as its registry entry carries them. */
export interface ThemeSwatchPair {
  dark: ThemeSwatchColours;
  light: ThemeSwatchColours;
}

/**
 * How much of the theme is drawn.
 *
 * `chip` is a mark beside a name in a list: each palette's frame with its
 * accent on it. `card` is a picker's thumbnail: a rail, a sheet and a card
 * with the primary action and the four states. `pane` is the same sketch
 * large enough to read as a screen, for a preview beside a picker.
 */
export type ThemeSwatchSize = 'chip' | 'card' | 'pane';

export interface ThemeSwatchProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** The theme's colours: a `themeRegistry` entry's `swatch`. */
  swatch: ThemeSwatchPair;
  size?: ThemeSwatchSize | undefined;
  /**
   * One palette alone. Without it both are drawn, dark beside light, which is
   * what a theme IS: a pair the mode chooses between.
   */
  mode?: 'dark' | 'light' | undefined;
  /**
   * Names the drawing as an image. Without one it is decoration and hidden
   * from assistive technology, which is right wherever the theme's name is
   * printed beside it.
   */
  label?: string | undefined;
}

/*
 * THE NAMES THE STYLESHEET PAINTS WITH, one per colour, set on each half.
 * Spelt out rather than built from the keys, so the package's check that
 * every name a stylesheet reads is declared somewhere can find them.
 */
const PROPERTY: Record<keyof ThemeSwatchColours, string> = {
  frame: '--crewlet-swatch-frame',
  sheet: '--crewlet-swatch-sheet',
  card: '--crewlet-swatch-card',
  raised: '--crewlet-swatch-raised',
  hairline: '--crewlet-swatch-hairline',
  text: '--crewlet-swatch-text',
  muted: '--crewlet-swatch-muted',
  accent: '--crewlet-swatch-accent',
  onAccent: '--crewlet-swatch-on-accent',
  info: '--crewlet-swatch-info',
  warning: '--crewlet-swatch-warning',
  danger: '--crewlet-swatch-danger',
  success: '--crewlet-swatch-success',
};

const STATES = ['info', 'warning', 'danger', 'success'] as const;

function paint(colours: ThemeSwatchColours): CSSProperties {
  const style: Record<string, string> = {};
  for (const key of Object.keys(PROPERTY) as (keyof ThemeSwatchColours)[]) style[PROPERTY[key]] = colours[key];
  return style as CSSProperties;
}

/** One palette, drawn at the size asked for. */
function Half({ colours, size }: { colours: ThemeSwatchColours; size: ThemeSwatchSize }) {
  if (size === 'chip') {
    return (
      <span className="crewlet-theme-swatch__half" style={paint(colours)}>
        <span className="crewlet-theme-swatch__dot" />
      </span>
    );
  }
  const pane = size === 'pane';
  return (
    <span className="crewlet-theme-swatch__half" style={paint(colours)}>
      <span className="crewlet-theme-swatch__rail">
        <span className="crewlet-theme-swatch__rail-row is-current" />
        <span className="crewlet-theme-swatch__rail-row" />
        <span className="crewlet-theme-swatch__rail-row" />
        {pane ? (
          <>
            <span className="crewlet-theme-swatch__rail-row" />
            <span className="crewlet-theme-swatch__rail-row" />
          </>
        ) : null}
      </span>
      <span className="crewlet-theme-swatch__sheet">
        {pane ? <span className="crewlet-theme-swatch__title" /> : null}
        <span className="crewlet-theme-swatch__card">
          {pane ? (
            STATES.map((state) => (
              <span key={state} className="crewlet-theme-swatch__item">
                <span className={`crewlet-theme-swatch__state crewlet-theme-swatch__state--${state}`} />
                <span className="crewlet-theme-swatch__line" />
                <span className="crewlet-theme-swatch__muted" />
              </span>
            ))
          ) : (
            <>
              <span className="crewlet-theme-swatch__line" />
              <span className="crewlet-theme-swatch__row">
                <span className="crewlet-theme-swatch__action" />
                {STATES.map((state) => (
                  <span key={state} className={`crewlet-theme-swatch__state crewlet-theme-swatch__state--${state}`} />
                ))}
              </span>
            </>
          )}
        </span>
        {pane ? (
          <span className="crewlet-theme-swatch__actions">
            <span className="crewlet-theme-swatch__action">
              <span className="crewlet-theme-swatch__label" />
            </span>
            <span className="crewlet-theme-swatch__secondary" />
          </span>
        ) : null}
      </span>
    </span>
  );
}

/**
 * A theme, drawn from its colours: the thumbnail every theme picker shows.
 *
 * DRAWN FROM THE REGISTRY, NOT FROM THE PAGE. A thumbnail has to show a theme
 * that is NOT on screen, so it cannot read the page's custom properties: it
 * paints each half with its own, set from the colours the build read off the
 * theme's sheet. The outline round it is the page's own hairline, because
 * that is where the thumbnail sits.
 *
 * BOTH MODES BY DEFAULT, dark beside light, because a theme is a pair and the
 * reader's mode is a separate choice: a thumbnail of one half would show a
 * light reader a dark theme they would never see, or hide the half they
 * would. `mode` draws one, for a preview that follows the reader's mode.
 *
 * DECORATION UNLESS NAMED. Wherever the theme's name is printed beside it the
 * drawing says nothing a reader needs; given a `label`, it is an image with
 * that name.
 */
export function ThemeSwatch({ swatch, size = 'card', mode, label, className, ...rest }: ThemeSwatchProps) {
  const halves = mode ? [swatch[mode]] : [swatch.dark, swatch.light];
  return (
    <span
      {...rest}
      className={cx('crewlet-theme-swatch', `crewlet-theme-swatch--${size}`, className)}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    >
      {halves.map((colours, index) => (
        <Half key={index} colours={colours} size={size} />
      ))}
    </span>
  );
}
