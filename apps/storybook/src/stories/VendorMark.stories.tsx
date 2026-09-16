import type { Meta, StoryObj } from '@storybook/react-vite';
import type { CSSProperties } from 'react';
import { VENDORS, VendorMark } from '@crewlethq/icons';

/*
 * The marks of the third-party tools, which are the one place this design
 * system draws somebody else's colours.
 *
 * Both themes side by side, because most of these are a fixed hue that has to
 * hold on either ground, while GitHub's and Notion's are the current text
 * colour and invert with the theme. The muted state is the answer to
 * "available, not connected", and it drains the mark's own colour rather than
 * inventing a second palette for somebody else's brand.
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
        <div key={theme} data-theme={theme} style={panel}>
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
