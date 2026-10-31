import type { Meta, StoryObj } from '@storybook/react-vite';
import { MentionChip } from '@crewlethq/ui';

/**
 * A person, an agent or a room named in a message's words: the info tone's
 * light blue for anybody else, the warning tone for the reader and for the
 * whole room. With `onPress` it opens what it names; without, it is text.
 */
const meta: Meta<typeof MentionChip> = {
  title: 'UI/MentionChip',
  component: MentionChip,
  decorators: [(Story) => <div style={{ maxWidth: 360, fontSize: 'var(--font-size-sm)', lineHeight: 'var(--font-line-height-normal)' }}>{Story()}</div>],
};

export default meta;
type Story = StoryObj<typeof MentionChip>;

/** Every tone in a line of words, and one that wraps keeping its fill on both lines. */
export const InWords: Story = {
  render: () => (
    <p style={{ margin: 0 }}>
      <MentionChip onPress={() => {}}>@Senior Backend Engineer</MentionChip> can you pair with{' '}
      <MentionChip tone="self" onPress={() => {}}>
        @Miles
      </MentionChip>{' '}
      on the rotation in <MentionChip onPress={() => {}}>#engineering</MentionChip>?{' '}
      <MentionChip tone="everyone">@channel</MentionChip> standup moves to 9:45.
    </p>
  ),
};
