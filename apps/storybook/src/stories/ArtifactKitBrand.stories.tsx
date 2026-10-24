import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useState } from 'react';
// The token stylesheets, the brand mapping and the kit's logo class as text,
// composed below exactly as the kit build composes kit.css: the brand-driven
// declarations moved aside to their theme names, then the mapping, then the
// logo class.
import tokensCss from '@crewlethq/tokens/css?raw';
import themesCss from '@crewlethq/tokens/css/themes?raw';
import allThemesCss from '@crewlethq/tokens/css/themes/all?raw';
import baseCss from '@crewlethq/tokens/css/base?raw';
import brandCss from '@crewlethq/tokens/css/brand?raw';
import logoCss from '../../../../packages/artifact-kit/src/brand.css?raw';
import { brandSlots, moveThemeValues } from '../../../../packages/artifact-kit/scripts/brand.mjs';

const KIT_CSS = `${moveThemeValues(`${tokensCss}\n${themesCss}\n${allThemesCss}`, brandSlots(brandCss))}\n${brandCss}\n${logoCss}\n${baseCss}`;

/** A logo drawn for the story: a word on a plate, as an SVG data URL. */
const logo = (plate: string, ink: string, width: number) =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${width} 100'><rect width='${width}' height='100' rx='14' fill='${plate}'/><text x='${width / 2}' y='64' font-size='44' font-family='Georgia, serif' text-anchor='middle' fill='${ink}'>Acme</text></svg>`,
  )}")`;
const mark = (fill: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='46' fill='${fill}'/></svg>`)}")`;

/** What an engine-generated brand stylesheet defines: `--brand-*` custom properties on `:root`, and nothing else. */
const BRANDS = {
  none: '',
  acme: `:root {
    --brand-primary: #0a7f5a;
    --brand-primary-on-dark: #3fd69a;
    --brand-secondary: #f2a33a;
    --brand-text: #1d2b24;
    --brand-light-ground: #f7f4ec;
    --brand-dark-ground: #0b1410;
    --brand-font-heading: Georgia, 'Times New Roman', serif;
    --brand-logo-primary: ${logo('#0a7f5a', '#ffffff', 320)};
    --brand-logo-primary-ratio: 3.2;
    --brand-logo-on-dark: ${logo('#e8fff4', '#0a7f5a', 320)};
    --brand-logo-on-dark-ratio: 3.2;
    --brand-logo-mark: ${mark('#0a7f5a')};
    --brand-logo-mark-ratio: 1;
  }`,
  sunrise: `:root {
    --brand-primary: #f5c400;
    --brand-logo-primary: ${logo('#f5c400', '#1d1a10', 300)};
    --brand-logo-primary-ratio: 3;
  }`,
} as const;

type BrandName = keyof typeof BRANDS;

const PAGE_CSS = `
  body { padding: var(--spacing-5); background: var(--color-surface-frame); color: var(--color-text-primary); font-family: var(--font-family-sans); font-size: var(--font-size-compact); }
  h1 { font-family: var(--font-family-display); font-size: var(--font-size-display); margin-block: var(--spacing-3); }
  p { color: var(--color-text-secondary); max-width: 56ch; }
  a { color: var(--color-text-link-quiet); }
  .row { display: flex; flex-wrap: wrap; gap: var(--spacing-3); align-items: center; margin-block-start: var(--spacing-4); }
  .primary { padding: var(--spacing-2) var(--spacing-4); border-radius: var(--radius-md); background: var(--color-brand-accent); color: var(--color-text-on-accent); }
  .primary:hover { background: var(--color-brand-accent-hover); }
  .chip { padding: var(--spacing-1) var(--spacing-3); border-radius: var(--radius-full); background: var(--color-brand-accent-soft); color: var(--color-brand-accent-ink); border: 1px solid var(--color-border-selected); }
  .card { padding: var(--spacing-4); border-radius: var(--radius-lg); background: var(--color-surface-subtle); border: 1px solid var(--color-border-default); }
  .band { padding: var(--spacing-4); border-radius: var(--radius-lg); background: var(--brand-dark-ground, var(--color-surface-scrim)); }
`;

const PAGE_BODY = `
  <span class="crewlet-logo" role="img" aria-label="Acme"></span>
  <h1>Quarterly vendor review</h1>
  <p>Every colour here is a kit token, and every <a href="#">link</a> the quiet link. The page names no brand colour of its own.</p>
  <div class="row">
    <button class="primary" type="button">Publish the ranking</button>
    <span class="chip">Selected</span>
    <span class="crewlet-logo" data-variant="mark" data-size="sm" role="img" aria-label="Acme"></span>
  </div>
  <div class="row"><div class="band"><span class="crewlet-logo" data-variant="on-dark" role="img" aria-label="Acme"></span></div></div>
`;

/** The document root's appearance, followed as the toolbar changes it. */
function useAppearance() {
  const read = () => ({
    theme: document.documentElement.getAttribute('data-theme'),
    palette: document.documentElement.getAttribute('data-palette'),
  });
  const [appearance, setAppearance] = useState(read);
  useEffect(() => {
    const observer = new MutationObserver(() => setAppearance(read()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-palette'] });
    return () => observer.disconnect();
  }, []);
  return appearance;
}

/**
 * An artifact page under the kit's stylesheet and one brand, in a frame of its
 * own so the layer's `:root` rules reach only it. The frame takes the
 * toolbar's mode and theme, as `theme.js` hands them to an artifact page.
 */
function BrandedPage({ brand }: { brand: BrandName }) {
  const { theme, palette } = useAppearance();
  const attributes = `${theme ? ` data-theme="${theme}"` : ''}${palette ? ` data-palette="${palette}"` : ''}`;
  const page = `<!doctype html><html lang="en"${attributes}><head><meta charset="utf-8"><style>${KIT_CSS}\n${BRANDS[brand]}\n${PAGE_CSS}</style></head><body>${PAGE_BODY}</body></html>`;
  return <iframe title={`An artifact page in the ${brand} brand`} srcDoc={page} style={{ width: '100%', height: 380, border: 0, borderRadius: 12 }} />;
}

const meta: Meta<typeof BrandedPage> = {
  title: 'Artifact kit/Brand slots',
  component: BrandedPage,
  args: { brand: 'acme' },
  argTypes: { brand: { control: 'radio', options: Object.keys(BRANDS) } },
  parameters: {
    docs: {
      description: {
        component:
          'The brand layer of `@crewlethq/artifact-kit`: a company\'s brand, given as `--brand-*` custom properties, restyles every kit token a page already paints with. One `--brand-primary` mixes the hover, press, ink, soft fill, selected edge and the label on it in both modes; the grounds, body text and faces follow their own slots; `crewlet-logo` draws the logo from the brand\'s own files. With no slot set the page is the theme\'s, exactly.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof BrandedPage>;

/** A brand with every slot: its accent, grounds, text, heading face and three logos. Switch the mode to see the on-dark colour and logo. */
export const FullBrand: Story = { args: { brand: 'acme' } };

/** One slot alone. A light accent takes a dark label, and the rest of the page keeps the theme. */
export const PrimaryOnly: Story = { args: { brand: 'sunrise' } };

/** No slot set: the theme's own accent and faces, and no logo drawn at all. */
export const NoBrand: Story = { args: { brand: 'none' } };
