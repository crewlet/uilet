import { BrandScope, type BrandColors } from '../BrandScope/index.js';
import { cx } from '../utils/cx.js';
import { normalizeHex } from '../utils/hexColour.js';

/** What the sample draws: the opening of a doc, or a title slide. */
export type BrandSampleKind = 'doc' | 'slide';

/** The mode the sample is drawn in, whatever mode the page around it is in. */
export type BrandSampleMode = 'light' | 'dark';

/**
 * A brand's colours by role, as the engine stores them: BrandScope's own. Each
 * is `#rrggbb`; one that is absent, or is not one, takes the product's value
 * for the sample's mode.
 */
export type BrandSampleColors = BrandColors;

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

/**
 * A company's brand, drawn: the opening of a doc or a title slide in its
 * colours, its type and its logo. The preview beside Company › Brand, a brand
 * kit's own view and its gallery cover.
 *
 * A PICTURE, NAMED. It is an image to assistive technology, named by what it
 * shows ("A doc in the Acme brand, light mode"); the words inside are sample
 * copy, and its link is drawn, never followed.
 *
 * DRAWN THROUGH THE BRAND MAPPING ITSELF. The sample is a BrandScope pinned to
 * its `mode`: its ground, text, accent and faces are the public tokens as the
 * mapping the artifact kit draws every page with sets them, so the preview
 * shows what an artifact will look like rather than a second reading of the
 * rules. The sample is its mode whatever mode the page is in (a role the
 * brand lacks, and every token that is not a brand role, takes the default
 * theme's value for the mode), so two samples in two modes sit side by side.
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
  const modeLogo = (mode === 'dark' ? logoOnDark || logo : logo) || null;
  // Whether the brand has a second colour at all, for the bar's second
  // segment; the colour it is drawn in is the mapping's.
  const secondary = normalizeHex(colors.secondary) !== null;

  return (
    <BrandScope
      colors={colors}
      headingFamily={headingFamily}
      bodyFamily={bodyFamily}
      mode={mode}
      role="img"
      aria-label={text.label(name, kind, mode)}
      className={cx('crewlet-brand-sample', `crewlet-brand-sample--${kind}`, `crewlet-brand-sample--${mode}`, className)}
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
            {secondary ? <span className="crewlet-brand-sample__bar-secondary" /> : null}
          </span>
          <span className="crewlet-brand-sample__heading crewlet-brand-sample__heading--slide">{text.slideHeading}</span>
          <span className="crewlet-brand-sample__footer">{`${name} · ${text.slideFooter}`}</span>
        </div>
      )}
    </BrandScope>
  );
}
