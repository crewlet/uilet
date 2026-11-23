import type { Meta, StoryObj } from '@storybook/react-vite';
import type { CSSProperties } from 'react';
import { VENDORS, VendorMark, type Vendor } from '@crewlethq/icons';
import { themeScope } from '../themeScope';

/*
 * The marks of the third-party tools, which are the one place this design
 * system draws somebody else's colours.
 *
 * Both themes side by side, because most of these are a fixed hue that has to
 * hold on either ground, Mattermost's, Scaleway's and Sentry's take the text
 * colour on the dark ground, as each vendor publishes them for one, and
 * GitHub's, Notion's, OpenCode's, Expo's, DigitalOcean's and OpenAI's are the
 * current text colour and invert with the theme. SSH's key is Crewlet's own drawing,
 * in the brand mark's violet on every theme.
 * Marks that follow the document's theme (Grok, Hermes, Kimi, Qwen, App Store
 * Connect) are in the pinned stories below.
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

/** The coding harnesses a model runs, each beside the harness's own name. */
const HARNESSES = [
  ['claude', 'Claude Code'],
  ['openai', 'Codex'],
  ['cursor', 'Cursor'],
  ['gemini-cli', 'Gemini CLI'],
  ['copilot', 'GitHub Copilot'],
  ['grok', 'Grok'],
  ['hermes', 'Hermes Agent'],
  ['kimi', 'Kimi Code'],
  ['meta', 'Muse Code'],
  ['opencode', 'OpenCode'],
  ['pi', 'Pi'],
  ['qwen', 'Qwen Code'],
] as const satisfies readonly (readonly [Vendor, string])[];

/** Every mark at the dashboard's 24px on the document's theme: the harnesses by name, muted, then every vendor. */
const everyMark = () => (
  <div style={{ ...panel, margin: 'var(--spacing-5)' }}>
    <p style={caption}>coding harnesses, 24px</p>
    <div style={row}>
      {HARNESSES.map(([vendor, name]) => (
        <span key={vendor} style={label}>
          <VendorMark vendor={vendor} size={24} />
          {name}
        </span>
      ))}
    </div>
    <p style={caption}>muted</p>
    <div style={row}>
      {HARNESSES.map(([vendor, name]) => (
        <span key={vendor} style={label}>
          <VendorMark vendor={vendor} size={24} muted />
          {name}
        </span>
      ))}
    </div>
    <p style={caption}>every vendor, 24px</p>
    <div style={row}>
      {VENDORS.map((vendor) => (
        <span key={vendor} style={label}>
          <VendorMark vendor={vendor} size={24} />
          {vendor}
        </span>
      ))}
    </div>
  </div>
);

/** EVERY MARK ON A LIGHT DOCUMENT, at 24px. */
export const EveryMarkLight: StoryObj = { render: everyMark, globals: { theme: 'light' } };

/** The same marks on a dark document: Grok, Hermes and Kimi draw their dark files, and Qwen reverses. */
export const EveryMarkDark: StoryObj = { render: everyMark, globals: { theme: 'dark' } };

/**
 * SSH, BESIDE THE MARKS IT SITS AMONG. The SSH Connection integration is
 * built into Crewlet, and SSH is a protocol, so no vendor publishes a mark for
 * it: its own is a key whose bow holds a shell prompt, in the brand mark's
 * violet. Shown in the 48px tile beside Crewlet's own services and the
 * infrastructure marks a catalogue lists with it, at 16 to 32px beside its
 * name, and muted. The story follows the toolbar's theme and palette, so every
 * named theme can be checked in light and dark; the ui-tests suite measures
 * the violet against every one of their grounds.
 */
export const Ssh: StoryObj = {
  render: () => (
    <div style={{ ...panel, margin: 'var(--spacing-5)' }}>
      <p style={caption}>20px in a 48px box, beside its neighbours</p>
      <div style={row}>
        {(['ssh', 'crewlet', 'github', 'cloudflare', 'aws', 'digitalocean'] as const).map((vendor) => (
          <span key={vendor} style={{ display: 'grid', justifyItems: 'center', gap: 'var(--spacing-1)' }}>
            <span style={tile}>
              <VendorMark vendor={vendor} size={20} />
            </span>
            <span style={caption}>{vendor}</span>
          </span>
        ))}
      </div>
      <p style={caption}>16, 20, 24, 32, beside its name</p>
      <div style={row}>
        {[16, 20, 24, 32].map((size) => (
          <span key={size} style={label}>
            <VendorMark vendor="ssh" size={size} />
            SSH
          </span>
        ))}
      </div>
      <p style={caption}>muted</p>
      <div style={row}>
        <span style={label}>
          <VendorMark vendor="ssh" size={20} muted />
          SSH
        </span>
      </div>
    </div>
  ),
};

/** The store, ads and analytics products, then their companies, each beside its own name. */
const GROWTH = [
  ['google-analytics', 'Google Analytics'],
  ['google-search-console', 'Search Console'],
  ['google-ads', 'Google Ads'],
  ['google-adsense', 'AdSense'],
  ['google-admob', 'AdMob'],
  ['google-play', 'Google Play'],
  ['app-store-connect', 'App Store Connect'],
  ['apple-ads', 'Apple Ads'],
  ['meta-ads', 'Meta Ads Manager'],
  ['apple', 'Apple'],
  ['google', 'Google'],
  ['meta', 'Meta'],
] as const satisfies readonly (readonly [Vendor, string])[];

/** Marks a catalogue lists beside them, AWS's plate among them. */
const NEIGHBOURS = [
  ['datadog', 'Datadog'],
  ['cloudflare', 'Cloudflare'],
  ['expo', 'Expo'],
  ['google-cloud', 'Google Cloud'],
  ['aws', 'AWS'],
  ['ssh', 'SSH'],
] as const satisfies readonly (readonly [Vendor, string])[];

const list: CSSProperties = { display: 'grid', gap: 'var(--spacing-3)', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))' };

/** The nine on the document's theme: list rows among real marks, the 48px tile, 12 to 48px, and muted. */
const storeAdsAndAnalytics = () => (
  <div style={{ ...panel, margin: 'var(--spacing-5)' }}>
    <p style={caption}>16px list rows among the marks a catalogue lists beside them</p>
    <div style={list}>
      {[...NEIGHBOURS, ...GROWTH].map(([vendor, name]) => (
        <span key={vendor} style={label}>
          <VendorMark vendor={vendor} size={16} />
          {name}
        </span>
      ))}
    </div>
    <p style={caption}>20px in a 48px box</p>
    <div style={row}>
      {GROWTH.map(([vendor]) => (
        <span key={vendor} style={{ display: 'grid', justifyItems: 'center', gap: 'var(--spacing-1)' }}>
          <span style={tile}>
            <VendorMark vendor={vendor} size={20} />
          </span>
          <span style={caption}>{vendor}</span>
        </span>
      ))}
    </div>
    <p style={caption}>12, 16, 24, 36 and 48</p>
    {[12, 16, 24, 36, 48].map((size) => (
      <div key={size} style={row}>
        {GROWTH.map(([vendor, name]) => (
          <span key={vendor} style={label}>
            <VendorMark vendor={vendor} size={size} />
            {name}
          </span>
        ))}
      </div>
    ))}
    <p style={caption}>muted</p>
    <div style={row}>
      {GROWTH.map(([vendor, name]) => (
        <span key={vendor} style={label}>
          <VendorMark vendor={vendor} size={20} muted />
          {name}
        </span>
      ))}
    </div>
  </div>
);

/**
 * THE STORE, ADS AND ANALYTICS MARKS ON A LIGHT DOCUMENT: each owner's own
 * logo. App Store Connect and Meta Ads Manager embed their owners' PNGs.
 */
export const StoreAdsAndAnalyticsLight: StoryObj = { render: storeAdsAndAnalytics, globals: { theme: 'light' } };

/** The same marks on a dark document, where App Store Connect draws Apple's dark icon and Apple's logo turns white. */
export const StoreAdsAndAnalyticsDark: StoryObj = { render: storeAdsAndAnalytics, globals: { theme: 'dark' } };
