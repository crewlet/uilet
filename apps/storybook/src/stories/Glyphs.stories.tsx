import type { Meta, StoryObj } from '@storybook/react-vite';
import type { CSSProperties, ReactNode } from 'react';
import { Icon, type IconName, ICON_NAMES } from '@crewlethq/icons';
import { GLYPH_NAMES, type GlyphName, type GlyphOpticalSize } from '@crewlethq/icons/glyphs';
import { glyphByName } from '@crewlethq/icons/glyphs/registry';

/*
 * The whole glyph set, at every size it is drawn at, at both vendored optical
 * sizes, in both themes.
 *
 * It exists to be judged rather than browsed. The optical size axis is a
 * different drawing and not a scaled one, so the only way to settle which
 * drawing a step should take is to put the two beside each other at that step
 * and look; and a glyph never appears alone, so it is shown beside the
 * signature illustrations it shares a row with in the product.
 *
 * The registry entry is what a story wants and what a screen almost never
 * does: rendering all 105 from their names is exactly the case
 * @crewlethq/icons/glyphs/registry is for.
 */

const SIZES = [12, 14, 16, 20, 24] as const;

const panel: CSSProperties = {
  background: 'var(--color-surface-background)',
  color: 'var(--color-text-primary)',
  padding: 'var(--spacing-5)',
  borderRadius: 'var(--radius-lg)',
  border: '1px solid var(--color-border-default)',
};

const caption: CSSProperties = {
  color: 'var(--color-text-tertiary)',
  fontSize: 'var(--font-size-xs)',
  fontFamily: 'var(--font-family-mono)',
  margin: 0,
};

const heading: CSSProperties = {
  color: 'var(--color-text-secondary)',
  fontSize: 'var(--font-size-sm)',
  fontWeight: 'var(--font-weight-medium)',
  margin: '0 0 var(--spacing-3)',
};

/** One block rendered twice, once per theme, so the pair can be compared. */
const BothThemes = ({ children }: { children: ReactNode }) => (
  <div style={{ display: 'grid', gap: 'var(--spacing-5)', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
    {(['light', 'dark'] as const).map((theme) => (
      <div key={theme} data-theme={theme} style={panel}>
        <p style={heading}>{theme === 'light' ? 'Light' : 'Dark'}</p>
        {children}
      </div>
    ))}
  </div>
);

const Cell = ({ name, size, opsz }: { name: GlyphName; size: number; opsz?: GlyphOpticalSize }) => {
  const Drawing = glyphByName(name);
  return opsz === undefined ? <Drawing size={size} /> : <Drawing size={size} opsz={opsz} />;
};

const Gallery = ({ opsz }: { opsz?: GlyphOpticalSize }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 'var(--spacing-4)' }}>
    {GLYPH_NAMES.map((name) => (
      <div key={name} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--spacing-3)', minHeight: 28 }}>
          {SIZES.map((size) => (
            <Cell key={size} name={name} size={size} {...(opsz === undefined ? {} : { opsz })} />
          ))}
        </div>
        <p style={caption}>{name}</p>
      </div>
    ))}
  </div>
);

const meta: Meta = {
  title: 'Foundations/Glyphs',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Material Symbols Outlined, weight 400, grade 0, vendored at the 20 px and 24 px optical sizes from google/material-design-icons. Every glyph is an SVG component: no font, no ligature and no request to a third-party host.',
      },
    },
  },
};

export default meta;

/** Every glyph at 12, 14, 16, 20 and 24 px, in both themes. */
export const All: StoryObj = {
  render: () => (
    <div style={{ padding: 'var(--spacing-5)' }}>
      <BothThemes>
        <Gallery />
      </BothThemes>
    </div>
  ),
};

/**
 * The same five steps with each vendored drawing forced, so the choice the
 * wrapper makes can be checked rather than trusted. The rule is the 20 px
 * drawing at and below 20 px and the 24 px drawing above it, which is what the
 * story above renders.
 */
export const OpticalSizes: StoryObj = {
  render: () => (
    <div style={{ padding: 'var(--spacing-5)', display: 'grid', gap: 'var(--spacing-6)' }}>
      {([20, 24] as const).map((opsz) => (
        <section key={opsz} style={{ display: 'grid', gap: 'var(--spacing-3)' }}>
          <h2 style={{ ...heading, margin: 0 }}>The {opsz} px drawing at every step</h2>
          <BothThemes>
            <Gallery opsz={opsz} />
          </BothThemes>
        </section>
      ))}
    </div>
  ),
};

/*
 * The pairs vendored in both states, derived from the set rather than listed,
 * so a glyph that gains a filled variant appears here without an edit.
 */
const FILL_SUFFIX = '-fill';

const FILLED_PAIRS = GLYPH_NAMES.flatMap((fill) => {
  if (!fill.endsWith(FILL_SUFFIX)) return [];
  const outline = GLYPH_NAMES.find((name) => `${name}${FILL_SUFFIX}` === fill);
  return outline === undefined ? [] : [{ outline, fill }];
});

/**
 * Each glyph that has a filled state, outline beside fill, at every step.
 *
 * A Material Symbol is a filled path already, so the solid mark is a second
 * drawing rather than a `fill` attribute on the first: a surface that toggles
 * a state swaps the component. The pair is worth looking at together because
 * the two have to read as one mark in two states — same silhouette, same
 * optical weight — and at 12 px a fill that is a shade too heavy stops looking
 * like the outline it replaces.
 */
export const FilledPairs: StoryObj = {
  render: () => (
    <div style={{ padding: 'var(--spacing-5)' }}>
      <BothThemes>
        <div style={{ display: 'grid', gap: 'var(--spacing-4)' }}>
          {FILLED_PAIRS.map(({ outline, fill }) => (
            <div key={fill} style={{ display: 'grid', gap: 'var(--spacing-2)' }}>
              <p style={caption}>
                {outline} / {fill}
              </p>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--spacing-4)' }}>
                {SIZES.map((size) => (
                  <span key={size} style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 'var(--spacing-1)' }}>
                    <Cell name={outline} size={size} />
                    <Cell name={fill} size={size} />
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </BothThemes>
    </div>
  ),
};

/**
 * A handful of glyphs beside the signature illustrations, at the sizes a row
 * actually mixes them at. The illustrations are a 1.6 stroke on a 32 unit
 * grid and the glyphs a filled shape on a 960 unit one, so the weights only
 * agree if they are looked at together.
 */
const COMPANIONS: GlyphName[] = ['person', 'smart_toy', 'account_tree', 'chat', 'book_2', 'terminal', 'schedule', 'bolt'];

export const BesideTheSignatureIcons: StoryObj = {
  render: () => (
    <div style={{ padding: 'var(--spacing-5)' }}>
      <BothThemes>
        <div style={{ display: 'grid', gap: 'var(--spacing-5)' }}>
          {SIZES.map((size) => (
            <div key={size} style={{ display: 'grid', gap: 'var(--spacing-2)' }}>
              <p style={caption}>{size}px</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-4)', flexWrap: 'wrap' }}>
                {COMPANIONS.map((name) => (
                  <Cell key={name} name={name} size={size} />
                ))}
                <span style={{ width: 1, alignSelf: 'stretch', background: 'var(--color-border-default)' }} />
                {ICON_NAMES.filter((name: IconName) => name.startsWith('Agent')).map((name: IconName) => (
                  <Icon key={name} name={name} size={size} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </BothThemes>
    </div>
  ),
};
