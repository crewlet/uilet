import type { Meta, StoryObj } from '@storybook/react-vite';
import { ContrastBadge, ContrastHelp } from '@crewlethq/ui';

const meta: Meta<typeof ContrastHelp> = {
  title: 'UI/ContrastHelp',
  component: ContrastHelp,
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof ContrastHelp>;

/**
 * BESIDE A CONTRAST HEADING, never inside it, so the heading's name stays the
 * heading's. A press (or Enter or Space) opens a short panel naming each
 * level as the badges below draw it; Escape or a press outside closes it.
 */
export const BesideAHeading: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 12, maxWidth: 420 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <h3 style={{ margin: 0, fontSize: 'var(--font-size-sm)' }}>Contrast</h3>
        <ContrastHelp />
      </div>
      <ContrastBadge label="Text on light ground" foreground="#121625" background="#f6f7fb" />
      <ContrastBadge label="Primary on light ground" foreground="#00baba" background="#f6f7fb" advisory />
    </div>
  ),
};

/** OPEN, to see the panel without pressing. */
export const Open: Story = {
  render: () => (
    <div style={{ minHeight: 260 }}>
      <ContrastHelp />
    </div>
  ),
  play: async ({ canvasElement }) => {
    canvasElement.querySelector<HTMLButtonElement>('button')?.click();
  },
};
