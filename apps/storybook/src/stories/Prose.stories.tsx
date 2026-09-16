import type { Meta, StoryObj } from '@storybook/react-vite';
import { Prose } from '@crewlethq/ui';

const meta: Meta<typeof Prose> = {
  title: 'UI/Prose',
  component: Prose,
  args: {
    children:
      'I read the company document first, because the reporting cycle it declares decides which seat this belongs to.\n\nThe unit lead is the Chief Technology Officer, so the brief goes there.',
  },
  argTypes: {
    tone: { control: 'inline-radio', options: ['default', 'muted'] },
    streaming: { control: 'boolean' },
    dimmed: { control: 'boolean' },
    measure: { control: 'inline-radio', options: ['normal', 'narrow', 'none'] },
  },
};

export default meta;
type Story = StoryObj<typeof Prose>;

/** What a model said, set as language rather than as a record. */
export const Speech: Story = {};

/** What it considered, quieter than what it decided. */
export const Muted: Story = { args: { tone: 'muted' } };

/**
 * Text arriving right now. The caret blinks, the transition is on colour
 * alone, and a reduced-motion preference stops both: animating the height of a
 * growing block makes every append a reflow the reader can feel.
 */
export const Streaming: Story = {
  args: { streaming: true, children: 'Reading the company document' },
};

/** An attempt a provider gave up on: dimmed, because a reader has read it. */
export const Abandoned: Story = {
  args: { dimmed: true, children: 'The provider returned no structured answer, so this attempt was abandoned.' },
};
