import type { Meta, StoryObj } from '@storybook/react-vite';
import type { CSSProperties, ReactNode } from 'react';
import { Icon, type IconName, ICON_NAMES } from '@crewlethq/icons';
import { FILLABLE, GLYPH_NAMES, GLYPH_STROKE, type GlyphName } from '@crewlethq/icons/glyphs';
import { glyphByName } from '@crewlethq/icons/glyphs/registry';
import { themeScope } from '../themeScope';

/*
 * The whole glyph set, at every size it is drawn at, in both themes.
 *
 * It exists to be judged rather than browsed. A Lucide glyph is one drawing at
 * every size, stroked at a weight that scales with it, so what there is to
 * judge is whether that weight still reads at 12 px and does not shout at 24,
 * and whether the one filled state reads as the same mark; and a glyph never
 * appears alone, so it is shown beside the signature illustrations it shares a
 * row with in the product.
 *
 * The registry entry is what a story wants and what a screen almost never
 * does: rendering every glyph from its name is exactly the case
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

/**
 * One block rendered twice, each panel in its own palette, so the pair can be
 * compared. The palette is scoped to the panel by `themeScope`: the theme layer
 * paints on the root alone, so a data-theme on a panel would paint nothing.
 */
const BothThemes = ({ children }: { children: ReactNode }) => (
  <div style={{ display: 'grid', gap: 'var(--spacing-5)', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
    {(['light', 'dark'] as const).map((theme) => (
      <div key={theme} style={{ ...panel, ...themeScope(theme) }}>
        <p style={heading}>{theme === 'light' ? 'Light' : 'Dark'}</p>
        {children}
      </div>
    ))}
  </div>
);

const Cell = ({ name, size }: { name: GlyphName; size: number }) => {
  const Drawing = glyphByName(name);
  return <Drawing size={size} />;
};

const Gallery = () => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 'var(--spacing-4)' }}>
    {GLYPH_NAMES.map((name) => (
      <div key={name} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--spacing-3)', minHeight: 28 }}>
          {SIZES.map((size) => (
            <Cell key={size} name={name} size={size} />
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
          `Lucide, vendored unchanged from lucide-static and drawn as the approved design draws it: a stroke on the 24 unit grid at ${GLYPH_STROKE}, with round caps and joins. Every glyph is an SVG component: no font, no ligature and no request to a third-party host.`,
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
 * The weight, moved by `--crewlet-glyph-stroke` on the panel, at every step:
 * the design's 1.75 between a lighter and a heavier setting, so the choice of
 * 1.75 can be checked rather than trusted. The stroke scales with the glyph,
 * so a setting that reads at 24 px is the one to doubt at 12.
 */
const STROKES = [1.5, GLYPH_STROKE, 2] as const;
const STROKE_SAMPLE: GlyphName[] = ['x', 'chevron-down', 'search', 'inbox', 'circle-check', 'triangle-alert', 'users', 'settings'];

export const Stroke: StoryObj = {
  render: () => (
    <div style={{ padding: 'var(--spacing-5)', display: 'grid', gap: 'var(--spacing-6)' }}>
      {STROKES.map((stroke) => (
        <section key={stroke} style={{ display: 'grid', gap: 'var(--spacing-3)' }}>
          <h2 style={{ ...heading, margin: 0 }}>
            --crewlet-glyph-stroke: {stroke}
            {stroke === GLYPH_STROKE ? ' (the default)' : ''}
          </h2>
          <BothThemes>
            <div style={{ display: 'grid', gap: 'var(--spacing-3)', ['--crewlet-glyph-stroke' as string]: String(stroke) }}>
              {SIZES.map((size) => (
                <div key={size} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-4)' }}>
                  <p style={{ ...caption, width: 40 }}>{size}px</p>
                  {STROKE_SAMPLE.map((name) => (
                    <Cell key={name} name={name} size={size} />
                  ))}
                </div>
              ))}
            </div>
          </BothThemes>
        </section>
      ))}
    </div>
  ),
};

/**
 * Each FILLABLE glyph, outline beside filled, at every step.
 *
 * A Lucide glyph is a stroke, so its filled state is the same drawing with its
 * inside painted, and it reads as one mark in two states only where the
 * drawing is one closed silhouette. The pair is worth looking at together
 * because at 12 px a filled shape a shade too heavy stops looking like the
 * outline it replaces.
 */
export const Filled: StoryObj = {
  render: () => (
    <div style={{ padding: 'var(--spacing-5)' }}>
      <BothThemes>
        <div style={{ display: 'grid', gap: 'var(--spacing-4)' }}>
          {FILLABLE.map((name) => {
            const Drawing = glyphByName(name);
            return (
              <div key={name} style={{ display: 'grid', gap: 'var(--spacing-2)' }}>
                <p style={caption}>{name}, and filled</p>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--spacing-4)' }}>
                  {SIZES.map((size) => (
                    <span key={size} style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 'var(--spacing-1)' }}>
                      <Drawing size={size} />
                      <Drawing size={size} filled />
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </BothThemes>
    </div>
  ),
};

/**
 * A handful of glyphs beside the signature illustrations, at the sizes a row
 * actually mixes them at. The illustrations are a 1.6 stroke on a 32 unit
 * grid and the glyphs a 1.75 stroke on a 24 unit one, which is a heavier line
 * at the same rendered size, so the weights only agree if they are looked at
 * together.
 */
const COMPANIONS: GlyphName[] = ['user', 'bot', 'network', 'message-square', 'book-open', 'square-terminal', 'clock', 'zap'];

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
