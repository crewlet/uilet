import type { Meta, StoryObj } from '@storybook/react-vite';
import type { CSSProperties } from 'react';
import { VENDORS, VendorMark } from '@crewlethq/icons';
import { themeScope } from '../themeScope';

/*
 * The marks of the third-party tools, which are the one place this design
 * system draws somebody else's colours.
 *
 * Both themes side by side, because most of these are a fixed hue that has to
 * hold on either ground, Mattermost's, Scaleway's, Sentry's and AWS's wordmark
 * take the text colour on a dark document, as each vendor publishes them, and
 * GitHub's, Notion's, OpenCode's, Expo's and DigitalOcean's are the current
 * text colour and invert with the theme.
 * The muted state is the answer to "available, not connected", and it drains
 * the mark's own colour rather than inventing a second palette for somebody
 * else's brand.
 */

const panel: CSSProperties = {
  background: 'var(--color-surface-background)',
  color: 'var(--color-text-primary)',
  padding: 'var(--spacing-5)',
  borderRadius: 'var(--radius-lg)',
  border: '1px solid var(--color-border-default)',
  display: 'grid',
  gap: 'var(--spacing-4)',
};

const row: CSSProperties = { display: 'flex', alignItems: 'center', gap: 'var(--spacing-4)', flexWrap: 'wrap' };

const caption: CSSProperties = {
  color: 'var(--color-text-tertiary)',
  fontSize: 'var(--font-size-xs)',
  fontFamily: 'var(--font-family-mono)',
  margin: 0,
};

const label: CSSProperties = { display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', fontSize: 'var(--font-size-sm)' };

const meta: Meta<typeof VendorMark> = {
  title: 'Brand/VendorMark',
  component: VendorMark,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'A mark names the application a feature connects to, and appears beside the name of that application. It is decoration until it is given a title. See TRADEMARKS.md for what nominative use allows.',
      },
    },
  },
};

export default meta;

export const All: StoryObj = {
  render: () => (
    <div style={{ padding: 'var(--spacing-5)', display: 'grid', gap: 'var(--spacing-5)', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))' }}>
      {(['light', 'dark'] as const).map((theme) => (
        <div key={theme} style={{ ...panel, ...themeScope(theme) }}>
          <p style={caption}>{theme}</p>
          <div style={row}>
            {VENDORS.map((vendor) => (
              <span key={vendor} style={label}>
                <VendorMark vendor={vendor} size={24} />
                {vendor}
              </span>
            ))}
          </div>
          <p style={caption}>muted</p>
          <div style={row}>
            {VENDORS.map((vendor) => (
              <span key={vendor} style={label}>
                <VendorMark vendor={vendor} size={24} muted />
                {vendor}
              </span>
            ))}
          </div>
          <p style={caption}>16, 20, 24, 32</p>
          <div style={row}>
            {[16, 20, 24, 32].map((size) => (
              <VendorMark key={size} vendor="slack" size={size} />
            ))}
          </div>
        </div>
      ))}
    </div>
  ),
};

const tile: CSSProperties = {
  display: 'grid',
  placeItems: 'center',
  width: 48,
  height: 48,
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border-default)',
  background: 'var(--color-surface-subtle)',
};

/**
 * ONE WEIGHT IN A CATALOGUE. Every mark at 20px in the 48px brand box an
 * integrations tile draws, side by side, so a mark drawing smaller than its
 * neighbours is seen at once. Every drawing fills its frame: GitLab's
 * press-kit file framed its logo in twice its own width and drew at half the
 * size of the others, and Crewlet's brand mark kept the wide file's artwork
 * margins and drew 17 by 9 pixels. Crewlet's mark is wider than it is tall,
 * so it fills the slot's width, as Discord's and Microsoft Teams' do.
 */
export const OneWeight: StoryObj = {
  render: () => (
    <div style={{ padding: 'var(--spacing-5)', display: 'grid', gap: 'var(--spacing-5)' }}>
      {(['light', 'dark'] as const).map((theme) => (
        <div key={theme} style={{ ...panel, ...themeScope(theme) }}>
          <p style={caption}>{theme}, 20px in a 48px box</p>
          <div style={row}>
            {VENDORS.map((vendor) => (
              <span key={vendor} style={{ display: 'grid', justifyItems: 'center', gap: 'var(--spacing-1)' }}>
                <span style={tile}>
                  <VendorMark vendor={vendor} size={20} />
                </span>
                <span style={caption}>{vendor}</span>
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  ),
};

/**
 * The coding CLIs a model runs, each mark beside the CLI's own name, in both
 * themes: Claude's Clay spark holds on either ground, and OpenCode's mark
 * takes the text colour.
 */
export const CodingCLIs: StoryObj = {
  render: () => (
    <div style={{ padding: 'var(--spacing-5)', display: 'grid', gap: 'var(--spacing-5)', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
      {(['light', 'dark'] as const).map((theme) => (
        <div key={theme} style={{ ...panel, ...themeScope(theme) }}>
          <p style={caption}>{theme}</p>
          <div style={row}>
            <span style={label}>
              <VendorMark vendor="claude" size={20} />
              Claude Code
            </span>
            <span style={label}>
              <VendorMark vendor="opencode" size={20} />
              OpenCode
            </span>
          </div>
        </div>
      ))}
    </div>
  ),
};

/** The sizes the engine dashboard draws a vendor mark at, smallest first. */
const DASHBOARD_SIZES = [14, 16, 20, 28, 36] as const;

/** The other cloud providers, to hold AWS's wide logo against in the tile well. */
const CLOUDS = ['aws', 'google-cloud', 'cloudflare', 'digitalocean', 'scaleway'] as const;

/*
 * AWS's wordmark reverses with the DOCUMENT's theme, as Mattermost's does, so
 * these stories pin the Mode global rather than scoping a panel.
 */
function AwsSheet() {
  return (
    <div style={{ padding: 'var(--spacing-5)', display: 'grid', gap: 'var(--spacing-5)' }}>
      <div style={panel}>
        <p style={caption}>beside its name, at every size the dashboard draws</p>
        <div style={row}>
          {DASHBOARD_SIZES.map((size) => (
            <span key={size} style={label}>
              <VendorMark vendor="aws" size={size} />
              AWS
              <span style={caption}>{size}px</span>
            </span>
          ))}
        </div>
        <p style={caption}>20px in a 48px box, beside the other clouds</p>
        <div style={row}>
          {CLOUDS.map((vendor) => (
            <span key={vendor} style={{ display: 'grid', justifyItems: 'center', gap: 'var(--spacing-1)' }}>
              <span style={tile}>
                <VendorMark vendor={vendor} size={20} />
              </span>
              <span style={caption}>{vendor}</span>
            </span>
          ))}
        </div>
        <p style={caption}>muted, 20 and 36</p>
        <div style={row}>
          <VendorMark vendor="aws" size={20} muted />
          <VendorMark vendor="aws" size={36} muted />
        </div>
      </div>
    </div>
  );
}

/** AWS's logo on a light document: the wordmark in squid ink, the smile in its orange. */
export const AwsLight: StoryObj = {
  name: 'AWS, light',
  globals: { theme: 'light' },
  render: () => <AwsSheet />,
};

/** AWS's logo on a dark document: the wordmark in the text colour, as AWS reverses it. */
export const AwsDark: StoryObj = {
  name: 'AWS, dark',
  globals: { theme: 'dark' },
  render: () => <AwsSheet />,
};
