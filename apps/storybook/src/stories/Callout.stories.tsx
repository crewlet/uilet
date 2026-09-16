import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, Callout } from '@crewlethq/ui';

const meta: Meta<typeof Callout> = {
  title: 'UI/Callout',
  component: Callout,
  args: {
    variant: 'info',
    layout: 'card',
    children: 'The engine applied revision r-42 across every node.',
  },
  argTypes: {
    variant: { control: 'inline-radio', options: ['neutral', 'info', 'success', 'warning', 'danger'] },
    layout: { control: 'inline-radio', options: ['card', 'banner'] },
    live: { control: 'inline-radio', options: [undefined, 'polite', 'assertive'] },
    title: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof Callout>;

/**
 * THE TINT IS THE BOUNDARY. A 1px line in the same hue as the fill behind it
 * adds a second edge a reader reads as a card, and a callout is a sentence the
 * screen is saying rather than a card the screen contains. The pixel is still
 * spent as a transparent rule, so nothing moves when a consumer puts a line
 * back.
 */
export const Basic: Story = {};

/**
 * Every tone draws a glyph, and there is no way to turn it off. Under
 * deuteranopia the warning and the danger hues move towards one another, and
 * a callout has no label of its own the way a Tag does, so the glyph is what
 * says which of them this is.
 */
export const Tones: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 12 }}>
      <Callout variant="neutral">The last apply finished 4 minutes ago.</Callout>
      <Callout variant="info">The engine applied revision r-42 across every node.</Callout>
      <Callout variant="success" title="Saved">
        The engine is applying it.
      </Callout>
      <Callout variant="warning" title="Needs a person">
        Two seats are waiting on an approval.
      </Callout>
      <Callout variant="danger" title="Refused">
        The write did not match the revision on the node.
      </Callout>
    </div>
  ),
};

/** A control at the trailing edge, outside the sentence rather than inside it. */
export const WithAnAction: Story = {
  args: {
    variant: 'danger',
    title: 'Disconnected',
    children: 'The socket closed and the screen is showing what it last read.',
    action: <Button size="small">Reconnect</Button>,
  },
};

/**
 * The banner layout is what a shell puts above a screen: against both edges,
 * with no radius and only a bottom border.
 */
export const Banner: Story = {
  render: () => (
    <div
      style={{
        border: '1px solid var(--color-border-default)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        background: 'var(--color-surface-background)',
      }}
    >
      <Callout layout="banner" variant="warning">
        This node is 2 revisions behind the fleet.
      </Callout>
      <div style={{ padding: 16, color: 'var(--color-text-secondary)' }}>The screen beneath it.</div>
    </div>
  ),
};

/**
 * A callout says nothing on its own. `live` and `role="alert"` are opt-in,
 * because every static banner being a live region meant a screen reader read
 * each of them in turn on arriving at a page.
 */
export const Announced: Story = {
  args: { variant: 'success', live: 'polite', children: 'Saved. The engine is applying it.' },
};
