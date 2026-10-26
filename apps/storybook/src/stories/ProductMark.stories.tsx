import type { Meta, StoryObj } from '@storybook/react-vite';
import type { CSSProperties, ReactNode } from 'react';
import { ProductMark, PRODUCTS, VendorMark, type Product } from '@crewlethq/icons';
import assistantTile from '@crewlethq/icons/svg/product/app-tile/assistant.svg';
import chatTile from '@crewlethq/icons/svg/product/app-tile/chat.svg';
import docletTile from '@crewlethq/icons/svg/product/app-tile/doclet.svg';
import workletTile from '@crewlethq/icons/svg/product/app-tile/worklet.svg';
import { themeScope } from '../themeScope';

/*
 * Crewlet's own product marks: one violet octagon tile, one white figure each.
 *
 * Every mark has two drawings. The 48 unit master serves 24 px and up, and the
 * 16 pixel grid drawing serves 16 to 20 px, where the master's edges would
 * fall between pixels. `drawing="auto"` (the default) reads the size, and
 * these stories show where the switch falls.
 */

const NAMES: Record<Product, string> = {
  worklet: 'Worklet',
  doclet: 'Doclet',
  chat: 'Crewlet Chat',
  assistant: 'AI Assistant',
};

const TILES: Record<Product, string> = {
  worklet: workletTile,
  doclet: docletTile,
  chat: chatTile,
  assistant: assistantTile,
};

const SIZES = [16, 20, 24, 32, 48, 64, 96] as const;

const panel: CSSProperties = {
  background: 'var(--color-surface-background)',
  color: 'var(--color-text-primary)',
  padding: 'var(--spacing-5)',
  borderRadius: 'var(--radius-lg)',
  border: '1px solid var(--color-border-default)',
  display: 'grid',
  gap: 'var(--spacing-5)',
  alignContent: 'start',
};

const heading: CSSProperties = {
  color: 'var(--color-text-secondary)',
  fontSize: 'var(--font-size-sm)',
  fontWeight: 'var(--font-weight-medium)',
  margin: 0,
};

const caption: CSSProperties = {
  color: 'var(--color-text-tertiary)',
  fontSize: 'var(--font-size-xs)',
  fontFamily: 'var(--font-family-mono)',
  margin: 0,
};

const label: CSSProperties = { fontSize: 'var(--font-size-compact)', margin: 0 };

const row: CSSProperties = { display: 'flex', alignItems: 'flex-end', gap: 'var(--spacing-4)', flexWrap: 'wrap' };

const stack: CSSProperties = { display: 'grid', gap: 'var(--spacing-2)', justifyItems: 'center' };

/**
 * One block rendered twice, each panel in its own palette. The palette is
 * scoped to the panel by `themeScope`: the theme layer paints on the root
 * alone, so a data-theme on a panel would paint nothing.
 */
const BothThemes = ({ children }: { children: ReactNode }) => (
  <div style={{ display: 'grid', gap: 'var(--spacing-5)', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))' }}>
    {(['light', 'dark'] as const).map((theme) => (
      <div key={theme} style={{ ...panel, ...themeScope(theme) }}>
        <p style={heading}>{theme === 'light' ? 'Light' : 'Dark'}</p>
        {children}
      </div>
    ))}
  </div>
);

const meta: Meta<typeof ProductMark> = {
  title: 'Icons/ProductMark',
  component: ProductMark,
  args: { product: 'worklet', size: 48, drawing: 'auto', soon: false },
  argTypes: {
    product: { control: 'inline-radio', options: [...PRODUCTS] },
    drawing: { control: 'inline-radio', options: ['auto', 'small', 'master'] },
    soon: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof ProductMark>;

/** One mark, at any size. Pick `small` or `master` to force a drawing. */
export const Basic: Story = {};

/**
 * Every product from 16 to 96 px, beside the brand mark it is drawn from. Below
 * 24 px the 16 pixel grid drawing is mounted: a full bleed tile with no facet,
 * and a figure on whole pixels.
 */
export const Sizes: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => (
    <div style={{ padding: 'var(--spacing-5)' }}>
      <BothThemes>
        {PRODUCTS.map((product) => (
          <div key={product} style={{ display: 'grid', gap: 'var(--spacing-2)' }}>
            <p style={label}>{NAMES[product]}</p>
            <div style={row}>
              {SIZES.map((size) => (
                <div key={size} style={stack}>
                  <ProductMark product={product} size={size} />
                  <p style={caption}>{size}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
        <div style={{ display: 'grid', gap: 'var(--spacing-2)' }}>
          <p style={label}>The brand mark</p>
          <div style={row}>
            {SIZES.map((size) => (
              <VendorMark key={size} vendor="crewlet" size={size} />
            ))}
          </div>
        </div>
      </BothThemes>
    </div>
  ),
};

/**
 * The two drawings side by side at the sizes they meet: the 16 pixel grid
 * drawing (top) and the master (bottom). The grid drawing is crisp at 16 and
 * 32 px; the master is crisp from 24 px.
 */
export const Drawings: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => (
    <div style={{ padding: 'var(--spacing-5)' }}>
      <BothThemes>
        {(['small', 'master'] as const).map((drawing) => (
          <div key={drawing} style={{ display: 'grid', gap: 'var(--spacing-2)' }}>
            <p style={caption}>drawing=&quot;{drawing}&quot;</p>
            {PRODUCTS.map((product) => (
              <div key={product} style={row}>
                {[16, 20, 24, 32].map((size) => (
                  <ProductMark key={size} product={product} size={size} drawing={drawing} />
                ))}
              </div>
            ))}
          </div>
        ))}
      </BothThemes>
    </div>
  ),
};

/**
 * Coming soon: hollow, never grey. The body drops to a faint tint, the facet
 * goes, and the mark's own hidden keyline and its figure are drawn in the
 * violet, at both drawings.
 */
export const Soon: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => (
    <div style={{ padding: 'var(--spacing-5)' }}>
      <BothThemes>
        {PRODUCTS.map((product) => (
          <div key={product} style={{ display: 'grid', gap: 'var(--spacing-2)' }}>
            <p style={label}>{NAMES[product]}</p>
            <div style={row}>
              {[16, 20, 24, 48, 96].map((size) => (
                <ProductMark key={size} product={product} size={size} soon />
              ))}
              <ProductMark product={product} size={48} />
            </div>
          </div>
        ))}
      </BothThemes>
    </div>
  ),
};

/** In a navigation list at 16 and 20 px, as a sidebar draws them, on both grounds. */
export const InNavigation: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => (
    <div style={{ padding: 'var(--spacing-5)' }}>
      <BothThemes>
        {([16, 20] as const).map((size) => (
          <ul key={size} style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 'var(--spacing-2)' }}>
            {PRODUCTS.map((product) => (
              <li key={product} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
                <ProductMark product={product} size={size} soon={product === 'chat'} />
                <span style={label}>
                  {NAMES[product]}
                  {product === 'chat' ? ' (coming soon)' : ''}
                </span>
              </li>
            ))}
          </ul>
        ))}
      </BothThemes>
    </div>
  ),
};

const mask: Record<'square' | 'rounded' | 'circle', string> = {
  square: '0',
  rounded: '22%',
  circle: '50%',
};

/**
 * The 180 px app tiles, `@crewlethq/icons/svg/product/app-tile/<product>.svg`,
 * for an apple-touch-icon or a catalogue: a full bleed violet ground under the
 * octagon. Shown square, under a rounded mask and under a circle mask, at 180,
 * 60 and 32 px. Every figure sits inside the maskable safe zone.
 */
export const AppTiles: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => (
    <div style={{ padding: 'var(--spacing-5)' }}>
      <BothThemes>
        {(Object.keys(mask) as (keyof typeof mask)[]).map((shape) => (
          <div key={shape} style={{ display: 'grid', gap: 'var(--spacing-2)' }}>
            <p style={caption}>{shape}</p>
            <div style={row}>
              {PRODUCTS.map((product) => (
                <img
                  key={product}
                  src={TILES[product]}
                  alt={`${NAMES[product]} app tile`}
                  width={shape === 'square' ? 180 : 60}
                  height={shape === 'square' ? 180 : 60}
                  style={{ borderRadius: mask[shape], display: 'block' }}
                />
              ))}
            </div>
            <div style={row}>
              {PRODUCTS.map((product) => (
                <img
                  key={`${product}-32`}
                  src={TILES[product]}
                  alt=""
                  width={32}
                  height={32}
                  style={{ borderRadius: mask[shape], display: 'block' }}
                />
              ))}
            </div>
          </div>
        ))}
      </BothThemes>
    </div>
  ),
};
