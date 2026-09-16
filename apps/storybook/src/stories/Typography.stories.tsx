import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * Foundations / Type and Density.
 *
 * Every step is rendered from its own token, so this page is a reading of the
 * scale rather than a picture of one: change a token and this changes with it.
 */
const meta: Meta = {
  title: 'Foundations/Type and density',
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj;

const SIZES = ['2xs', 'xs', 'compact', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl'];
const WEIGHTS = ['regular', 'medium', 'semibold', 'bold', 'extrabold'];
const TRACKING = ['tight', 'snug', 'normal', 'wide', 'wider'];
const CONTROLS = ['sm', 'md', 'lg'];
const ROWS = ['sm', 'md', 'lg'];

const page: React.CSSProperties = { padding: 'var(--spacing-6)', display: 'grid', gap: 'var(--spacing-6)' };
const quiet: React.CSSProperties = { color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family-mono)' };

export const TypeScale: Story = {
  render: () => (
    <div style={page}>
      <section>
        <h2>Size</h2>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          Emitted in rem, so a reader who has set a larger default text size gets one.
        </p>
        {SIZES.map((step) => (
          <div key={step} style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--spacing-4)' }}>
            <code style={{ ...quiet, minWidth: '10ch' }}>{step}</code>
            <span style={{ fontSize: `var(--font-size-${step})` }}>A company of agents, reporting.</span>
          </div>
        ))}
      </section>

      <section>
        <h2>Weight</h2>
        {WEIGHTS.map((step) => (
          <div key={step} style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--spacing-4)' }}>
            <code style={{ ...quiet, minWidth: '10ch' }}>{step}</code>
            <span style={{ fontWeight: `var(--font-weight-${step})` }}>A company of agents, reporting.</span>
          </div>
        ))}
      </section>

      <section>
        <h2>Letter spacing</h2>
        {TRACKING.map((step) => (
          <div key={step} style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--spacing-4)' }}>
            <code style={{ ...quiet, minWidth: '10ch' }}>{step}</code>
            <span style={{ letterSpacing: `var(--font-letter-spacing-${step})` }}>EVENT LOG</span>
          </div>
        ))}
      </section>
    </div>
  ),
};

/**
 * Density is a root attribute that scales every spacing and size token at
 * once. The toolbar switches it; this page shows what moves.
 *
 * The small control and row steps carry a 24px floor, because 28 times 0.82 is
 * 22.96 and a pointer target under 24px fails outright. Switch the toolbar to
 * Compact and watch the small steps stop shrinking while the rest carry on.
 */
export const Density: Story = {
  render: () => (
    <div style={page}>
      <section>
        <h2>Control heights</h2>
        {CONTROLS.map((step) => (
          <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-4)' }}>
            <code style={{ ...quiet, minWidth: '10ch' }}>control-{step}</code>
            <div
              style={{
                height: `var(--size-control-${step})`,
                minWidth: 160,
                background: 'var(--color-surface-elevated)',
                border: '1px solid var(--color-border-control)',
                borderRadius: 'var(--radius-md)',
              }}
            />
          </div>
        ))}
      </section>

      <section>
        <h2>Row heights</h2>
        {ROWS.map((step) => (
          <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-4)' }}>
            <code style={{ ...quiet, minWidth: '10ch' }}>row-{step}</code>
            <div
              style={{
                height: `var(--size-row-${step})`,
                minWidth: 320,
                background: 'var(--color-surface-subtle)',
                borderRadius: 'var(--radius-sm)',
              }}
            />
          </div>
        ))}
      </section>

      <section>
        <h2>Spacing</h2>
        {Array.from({ length: 12 }, (_, i) => i).map((step) => (
          <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-4)' }}>
            <code style={{ ...quiet, minWidth: '10ch' }}>spacing-{step}</code>
            <div
              style={{
                width: `var(--spacing-${step})`,
                height: 12,
                background: 'var(--color-brand-accent)',
                borderRadius: 'var(--radius-xs)',
              }}
            />
          </div>
        ))}
      </section>
    </div>
  ),
};
