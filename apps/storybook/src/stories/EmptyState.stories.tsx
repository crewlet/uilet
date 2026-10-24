import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, EmptyState } from '@crewlethq/ui';
import { CircleAlertGlyph, InboxGlyph, PlugGlyph } from '@crewlethq/icons/glyphs';

const meta: Meta<typeof EmptyState> = {
  title: 'UI/EmptyState',
  component: EmptyState,
  args: {
    title: 'No events yet',
    description: 'This company has not run a turn. Start a seat to see its work here.',
    size: 'default',
  },
  argTypes: {
    size: { control: 'inline-radio', options: ['default', 'compact'] },
    title: { control: 'text' },
    description: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof EmptyState>;

export const Basic: Story = {};

/**
 * THE THREE HONEST EMPTIES, which is the whole reason `description` is
 * required.
 *
 * "No events" on a company that has never run, "no events" on a node whose
 * event store could not be read, and "no events" on an integration nobody has
 * connected are the same sentence and three completely different situations:
 * the first is fine, the second is a fault somebody has to look at, and the
 * third is a thing they can go and do. Drawn as one grey "No data", the fault
 * is the one that gets missed.
 */
export const TheThreeEmpties: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ border: '1px solid var(--color-border-default)', borderRadius: 12 }}>
        <EmptyState
          icon={<InboxGlyph size={32} />}
          title="No events yet"
          description="This company has not run a turn. Start a seat to see its work here."
        />
      </div>
      <div style={{ border: '1px solid var(--color-border-default)', borderRadius: 12 }}>
        <EmptyState
          icon={<CircleAlertGlyph size={32} />}
          title="Nothing could be read"
          description="The event store on this node did not answer. The work may have happened."
          action={<Button size="small">Try again</Button>}
        />
      </div>
      <div style={{ border: '1px solid var(--color-border-default)', borderRadius: 12 }}>
        <EmptyState
          icon={<PlugGlyph size={32} />}
          title="Slack is not connected"
          description="Connect a workspace to let a seat answer a mention in a channel."
          action={<Button size="small">Connect Slack</Button>}
        />
      </div>
    </div>
  ),
};

/** Inside a panel rather than a screen. */
export const Compact: Story = {
  args: {
    size: 'compact',
    title: 'No open incidents',
    description: 'Nothing is waiting on a person right now.',
  },
};

/** Where the surrounding section already carries the heading. */
export const NoHeading: Story = {
  args: { headingLevel: 'none' },
};

/**
 * INLINE: a part of a page that is empty while the rest of it is not. One
 * left-aligned row on a dashed hairline, the sentence beside its one action,
 * and no glyph. In a narrow column the action wraps under the words.
 */
export const Inline: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--spacing-5)', maxWidth: 720 }}>
      <EmptyState
        size="inline"
        headingLevel="none"
        title="No vision yet"
        description="Where the company is heading helps agents choose between two good options."
        action={<Button size="small" variant="secondary">Add a vision</Button>}
      />
      <div style={{ maxWidth: 320 }}>
        <EmptyState
          size="inline"
          headingLevel="none"
          title="No policies yet"
          description="The rules every agent follows, such as how to handle money or when to ask first."
          action={<Button size="small" variant="secondary">Add a policy</Button>}
        />
      </div>
    </div>
  ),
};
