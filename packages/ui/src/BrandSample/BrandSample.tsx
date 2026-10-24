import type { CSSProperties } from 'react';
import { themes } from '@crewlethq/tokens';
import { cx } from '../utils/cx.js';
import { fontStack } from '../utils/fontFamily.js';
import { normalizeHex } from '../utils/hexColour.js';

/** What the sample draws: the opening of a doc, or a title slide. */
export type BrandSampleKind = 'doc' | 'slide';

/** The mode the sample is drawn in, whatever mode the page around it is in. */
export type BrandSampleMode = 'light' | 'dark';

/**
 * A brand's colours by role, as the engine stores them. Each is `#rrggbb`;
 * one that is absent, or is not one, takes the product's own value for the
 * sample's mode.
 */
export interface BrandSampleColors {
  primary?: string | undefined;
  primary_on_dark?: string | undefined;
  secondary?: string | undefined;
  text?: string | undefined;
  light_ground?: string | undefined;
  dark_ground?: string | undefined;
}

export interface BrandSampleLabels {
  /** The doc's heading. */
  heading: string;
  /** The doc's sentence, which the link follows. */
  body: string;
  /** The link at the end of the doc's sentence, drawn in the accent. */
  link: string;
  /** The quiet line under the doc's sentence. */
  byline: string;
  /** The slide's heading. */
  slideHeading: string;
  /** The slide's footer, after the company's name. */
  slideFooter: string;
  /** What the drawing is, said as its name. */
  label: (name: string, kind: BrandSampleKind, mode: BrandSampleMode) => string;
}

const LABELS: BrandSampleLabels = {
  heading: 'Quarterly review',
  body: 'Every team finished the quarter on plan.',
  link: 'See the breakdown',
  byline: 'Prepared by an agent',
  slideHeading: 'The year ahead',
  slideFooter: 'Company review',
  label: (name, kind, mode) => `A ${kind === 'doc' ? 'doc' : 'slide'} in the ${name} brand, ${mode} mode`,
};

export interface BrandSampleProps {
  kind: BrandSampleKind;
  /** The mode it is drawn in. It follows this, not the page, so a preview can show both. */
  mode: BrandSampleMode;
  /** The company's name: the slide's footer, and the doc's wordmark where there is no logo. */
  name: string;
  colors: BrandSampleColors;
  /**
   * The logo for a light ground, as an address the host has already
   * validated (the engine's file route, through the dashboard's checked blob
   * path).
   */
  logo?: string | null | undefined;
  /** The logo for a dark ground. In dark mode it stands in for `logo`, which it falls back to. */
  logoOnDark?: string | null | undefined;
  /** The square mark the slide carries. Without one, the mode's logo stands in. */
  mark?: string | null | undefined;
  /** The family list for headings. Not a list of family names, it is the package's display face. */
  headingFamily?: string | undefined;
  /** The family list for everything else. Not a list of family names, it is the package's sans. */
  bodyFamily?: string | undefined;
  className?: string | undefined;
  labels?: Partial<BrandSampleLabels> | undefined;
}

/** What every role resolves to in one mode, before the brand's own values are laid over it. */
interface Palette {
  ground: string;
  text: string;
  muted: string;
  accent: string;
}

/*
 * THE PRODUCT'S OWN VALUES FOR EACH MODE, read from the tokens package rather
 * than from the page: the sample's mode is its own, so a light sample on a
 * dark page is drawn in the light palette.
 */
const PRODUCT: Readonly<Record<BrandSampleMode, Palette>> = {
  light: {
    ground: themes.light.color.surface.background,
    text: themes.light.color.text.primary,
    muted: themes.light.color.text.tertiary,
    accent: themes.light.color.brand.accent,
  },
  dark: {
    ground: themes.dark.color.surface.background,
    text: themes.dark.color.text.primary,
    muted: themes.dark.color.text.tertiary,
    accent: themes.dark.color.brand.accent,
  },
};

/**
 * The sample's colours in its mode: each brand role that reads as `#rrggbb`,
 * the product's value where it does not.
 *
 * TEXT ON A DARK GROUND IS THE PRODUCT'S, as the artifact kit draws it: a
 * brand's text colour is chosen for its light ground, and on a dark one the
 * theme's own text is what reads.
 */
function resolvePalette(mode: BrandSampleMode, colors: BrandSampleColors): Palette & { secondary: string | null } {
  const product = PRODUCT[mode];
  const primary = normalizeHex(colors.primary);
  if (mode === 'dark') {
    return {
      ground: normalizeHex(colors.dark_ground) ?? product.ground,
      text: product.text,
      muted: product.muted,
      accent: normalizeHex(colors.primary_on_dark) ?? primary ?? product.accent,
      secondary: normalizeHex(colors.secondary),
    };
  }
  return {
    ground: normalizeHex(colors.light_ground) ?? product.ground,
    text: normalizeHex(colors.text) ?? product.text,
    muted: product.muted,
    accent: primary ?? product.accent,
    secondary: normalizeHex(colors.secondary),
  };
}

/**
 * A company's brand, drawn: the opening of a doc or a title slide in its
 * colours, its type and its logo. The preview beside Company › Brand, a brand
 * kit's own view and its gallery cover.
 *
 * A PICTURE, NAMED. It is an image to assistive technology, named by what it
 * shows ("A doc in the Acme brand, light mode"); the words inside are sample
 * copy, and its link is drawn, never followed.
 *
 * IT PAINTS ONLY ITSELF. Every colour and face is a custom property on the
 * sample's own root, never on the page's, so two samples in two modes sit
 * side by side, and the mode is the `mode` prop rather than the page's theme.
 * A colour reaches a style only once it has passed `#rrggbb`, and a family
 * list only once it reads as family names; anything else is the product's.
 *
 * ONE SHAPE AT ANY SIZE. The sample keeps a 16:9 frame and sets every length
 * against its own width (a container query unit), so the same drawing reads
 * as a gallery cover and as a preview beside a form.
 */
export function BrandSample({
  kind,
  mode,
  name,
  colors,
  logo,
  logoOnDark,
  mark,
  headingFamily,
  bodyFamily,
  className,
  labels,
}: BrandSampleProps) {
  const text = { ...LABELS, ...labels };
  const palette = resolvePalette(mode, colors);
  const modeLogo = (mode === 'dark' ? logoOnDark || logo : logo) || null;
  const style = {
    '--crewlet-brand-sample-ground': palette.ground,
    '--crewlet-brand-sample-text': palette.text,
    '--crewlet-brand-sample-muted': palette.muted,
    '--crewlet-brand-sample-accent': palette.accent,
    '--crewlet-brand-sample-secondary': palette.secondary ?? palette.accent,
    '--crewlet-brand-sample-heading-family': fontStack(headingFamily, 'var(--font-family-display)'),
    '--crewlet-brand-sample-body-family': fontStack(bodyFamily, 'var(--font-family-sans)'),
  } as CSSProperties;

  return (
    <div
      role="img"
      aria-label={text.label(name, kind, mode)}
      className={cx('crewlet-brand-sample', `crewlet-brand-sample--${kind}`, `crewlet-brand-sample--${mode}`, className)}
      style={style}
    >
      {kind === 'doc' ? (
        <div className="crewlet-brand-sample__page">
          <span className="crewlet-brand-sample__brand">
            {modeLogo ? (
              <img src={modeLogo} alt="" className="crewlet-brand-sample__logo" draggable={false} />
            ) : (
              <span className="crewlet-brand-sample__wordmark">{name}</span>
            )}
          </span>
          <span className="crewlet-brand-sample__heading">{text.heading}</span>
          <span className="crewlet-brand-sample__rule" />
          <span className="crewlet-brand-sample__body">
            {text.body} <span className="crewlet-brand-sample__link">{text.link}</span>
          </span>
          <span className="crewlet-brand-sample__byline">{text.byline}</span>
        </div>
      ) : (
        <div className="crewlet-brand-sample__slide">
          <span className="crewlet-brand-sample__brand">
            {mark || modeLogo ? (
              <img
                src={(mark || modeLogo) ?? undefined}
                alt=""
                className={cx('crewlet-brand-sample__logo', mark ? 'crewlet-brand-sample__logo--mark' : null)}
                draggable={false}
              />
            ) : (
              <span className="crewlet-brand-sample__wordmark">{name}</span>
            )}
          </span>
          <span className="crewlet-brand-sample__bar">
            <span className="crewlet-brand-sample__bar-primary" />
            {palette.secondary ? <span className="crewlet-brand-sample__bar-secondary" /> : null}
          </span>
          <span className="crewlet-brand-sample__heading crewlet-brand-sample__heading--slide">{text.slideHeading}</span>
          <span className="crewlet-brand-sample__footer">{`${name} · ${text.slideFooter}`}</span>
        </div>
      )}
    </div>
  );
}
