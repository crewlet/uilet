import type { Meta, StoryObj } from '@storybook/react-vite';
import { LayoutDashboardGlyph } from '@crewlethq/icons/glyphs';
import { MessageBubble, Tag, VisuallyHidden } from '@crewlethq/ui';

/**
 * One message, as a bubble on its writer's side: the reader's own at the end
 * on the raised ground with a small tail corner, anybody else's at the start
 * inside a hairline. An article named for who said it. What it carried (the
 * page a question was sent with) stands under it, read-only.
 */
const meta: Meta<typeof MessageBubble> = {
  title: 'UI/MessageBubble',
  component: MessageBubble,
  decorators: [(Story) => <div style={{ maxWidth: 388, display: 'flex', flexDirection: 'column', gap: 12 }}>{Story()}</div>],
};

export default meta;
type Story = StoryObj<typeof MessageBubble>;

export const Self: Story = { args: { from: 'self', children: 'Which agents spent the most tokens this week?' } };

export const Other: Story = { args: { from: 'other', label: 'Sam Rivera said', children: 'Can you check the on-call runbook?' } };

/** Long unbroken text wraps anywhere rather than widening the thread. */
export const LongUnbrokenText: Story = {
  args: { from: 'self', children: 'https://nimbus.example.com/work/tasks?blocked=true&unit=core&sort=-spend_tokens&assignee=agent-swe' },
};

/** The page the question was sent with, under the bubble: a read-only Tag, "Sent with" said only. */
export const WithAttachment: Story = {
  args: {
    from: 'self',
    children: 'File a task for Agent SWE to fix the flaky sign-in test, high priority, due Friday',
    attachment: (
      <Tag size="xs" appearance="outline" leadingIcon={<LayoutDashboardGlyph size="xs" />}>
        <VisuallyHidden>Sent with </VisuallyHidden>Work › Tasks
      </Tag>
    ),
  },
};
