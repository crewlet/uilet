import type { Meta, StoryObj } from '@storybook/react-vite';
import { DescriptionList, RelativeTime } from '@crewlethq/ui';

const meta: Meta<typeof RelativeTime> = {
  title: 'UI/RelativeTime',
  component: RelativeTime,
  argTypes: { mode: { control: 'inline-radio', options: ['relative', 'elapsed'] } },
};

export default meta;
type Story = StoryObj<typeof RelativeTime>;

const ago = (ms: number) => new Date(Date.now() - ms).toISOString();
const ahead = (ms: number) => new Date(Date.now() + ms).toISOString();

/**
 * Every one of these advances on the SAME ticker, once a second and only
 * while the tab is visible, so no two of them can disagree.
 */
export const TheGrammar: Story = {
  render: () => (
    <div style={{ maxWidth: 420 }}>
      <DescriptionList
        items={[
          ['Just happened', <RelativeTime key="a" value={ago(2_000)} />],
          ['Seconds', <RelativeTime key="b" value={ago(42_000)} />],
          ['Minutes', <RelativeTime key="c" value={ago(4 * 60_000)} />],
          ['Hours', <RelativeTime key="d" value={ago(3 * 3_600_000)} />],
          ['Days', <RelativeTime key="e" value={ago(6 * 86_400_000)} />],
          ['Older than a month', <RelativeTime key="f" value={ago(90 * 86_400_000)} />],
          ['Due later', <RelativeTime key="g" value={ahead(30 * 60_000)} />],
          ['Due now', <RelativeTime key="h" value={ago(1_000)} mode="relative" />],
          ['Running for', <RelativeTime key="i" value={ago(260_000)} mode="elapsed" />],
          ['Never run', <RelativeTime key="j" value={null} emptyLabel="Never run" />],
        ]}
      />
    </div>
  ),
};

/**
 * Beside something still happening, "4m ago" claims it is over. Elapsed says
 * how long it has been going.
 */
export const Elapsed: Story = {
  args: { value: ago(260_000), mode: 'elapsed' },
};
