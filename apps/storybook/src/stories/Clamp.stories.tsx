import type { Meta, StoryObj } from '@storybook/react-vite';
import { Clamp, Prose, type ClampProps } from '@crewlethq/ui';

/**
 * A long block folded to a height, with Show more under it: a comment, a
 * report or a message that would otherwise make a reader scroll past all of
 * it to reach the next one. Only a block more than a quarter longer than its
 * fold is folded; a focus inside the folded part opens it.
 */
const meta: Meta<typeof Clamp> = {
  title: 'UI/Clamp',
  component: Clamp,
  args: { height: '12rem' },
};

export default meta;
type Story = StoryObj<typeof Clamp>;

const REPORT = [
  'Everything held within its objectives over the last window. Two notes worth reading below, neither needs action today.',
  'Certificates: every public endpoint renews more than 21 days out; the shortest is 34 days away.',
  'Disk: the stream volume is at 61% of its reservation and growing about 0.8% a day, so it reaches the 85% alarm in roughly a month.',
  'Backups: last night’s snapshot restored cleanly into the scratch cluster in 6m 12s, and the checksum of the archive matches the one the job recorded.',
  'Queues: no consumer lagged more than 30 seconds, and the dead-letter queue is empty.',
  'The worker pool’s p99 is creeping up. It tracks the larger batch size rolled out on Monday, so it should settle; it is flagged if it passes 2.5 s.',
];

function Report(args: ClampProps) {
  return (
    <div style={{ maxWidth: 560 }}>
      <Clamp {...args}>
        {REPORT.map((line) => (
          <Prose key={line}>{line}</Prose>
        ))}
      </Clamp>
    </div>
  );
}

/** A daily report, folded to its first lines. */
export const Folded: Story = {
  render: (args) => <Report {...args} />,
};

/** A short remark is drawn whole, with no control. */
export const Short: Story = {
  render: (args) => (
    <div style={{ maxWidth: 560 }}>
      <Clamp {...args}>
        <Prose>Thanks, the backup move looks right. Ship it.</Prose>
      </Clamp>
    </div>
  ),
};

/** Open from the start. */
export const Open: Story = {
  args: { defaultOpen: true },
  render: (args) => <Report {...args} />,
};
