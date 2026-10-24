import type { Meta, StoryObj } from '@storybook/react-vite';
import { ButtonLink, Statement } from '@crewlethq/ui';

const meta: Meta<typeof Statement> = {
  title: 'UI/Statement',
  component: Statement,
  args: {
    label: 'Mission',
    children: 'Make splitting shared expenses so easy that nobody ever has to chase a friend for money again.',
    empty: {
      title: 'No mission yet',
      description: 'One sentence on what the company is for tells every agent why its work matters.',
      action: (
        <ButtonLink size="small" variant="secondary" href="#mission">
          Add a mission
        </ButtonLink>
      ),
    },
  },
  render: (args) => (
    <div style={{ maxWidth: 840 }}>
      <Statement {...args} />
    </div>
  ),
};

export default meta;
type Story = StoryObj<typeof Statement>;

/** A label over the words, a step over the body at the reading measure. */
export const Written: Story = {};

/** Unwritten: an inline empty state with its own way to write it, never grey text in the words' place. */
export const Unwritten: Story = { args: { children: undefined } };

/** A long statement keeps its author's line breaks and wraps at the measure. */
export const Long: Story = {
  args: {
    label: 'Vision',
    children:
      'Every shared household, trip and team settles up in one tap, in any currency, without a spreadsheet or an awkward message.\n\nWe get there by being the place money between friends is recorded, so nobody has to remember who paid for what, and by never taking a cut of what friends owe each other.',
  },
};
