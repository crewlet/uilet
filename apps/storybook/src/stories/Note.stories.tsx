import type { Meta, StoryObj } from '@storybook/react-vite';
import { NODE_HUES, Note, type SurfaceTone } from '@crewlethq/ui';

const meta: Meta<typeof Note> = {
  title: 'UI/Note',
  component: Note,
  args: { tone: 'amber', align: 'start', size: 'md' },
  argTypes: {
    tone: { control: 'select', options: ['none', ...NODE_HUES] },
    align: { control: 'inline-radio', options: ['start', 'center'] },
    size: { control: 'inline-radio', options: ['md', 'lg'] },
  },
};

export default meta;
type Story = StoryObj<typeof Note>;

export const Basic: Story = {
  render: (args) => (
    <Note {...args} style={{ maxWidth: 360 }}>
      <p>
        <strong>This week:</strong> answer the two scope questions before standup, so storage can be handed on.
      </p>
    </Note>
  ),
};

/** Every paper: each hue's fill with that hue's ink. */
export const Tones: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
      {(['none', ...NODE_HUES] as SurfaceTone[]).map((t) => (
        <Note key={t} tone={t}>
          <p>A note on {t === 'none' ? 'plain' : t} paper.</p>
        </Note>
      ))}
    </div>
  ),
};

/** A line meant to be read across the room. */
export const Large: Story = {
  render: () => (
    <Note tone="purple" size="lg" align="center" style={{ maxWidth: 480 }}>
      <p>Ship the MVP by November 7.</p>
    </Note>
  ),
};
