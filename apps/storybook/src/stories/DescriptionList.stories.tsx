import type { Meta, StoryObj } from '@storybook/react-vite';
import { Copyable, DescriptionList, RelativeTime, Tag } from '@crewlethq/ui';

const meta: Meta<typeof DescriptionList> = {
  title: 'UI/DescriptionList',
  component: DescriptionList,
  argTypes: { dense: { control: 'boolean' } },
};

export default meta;
type Story = StoryObj<typeof DescriptionList>;

/** Metadata about one record, announced as pairs rather than as a grid. */
export const ARecord: Story = {
  render: (args) => (
    <div style={{ maxWidth: 480 }}>
      <DescriptionList {...args}>
        <DescriptionList.Item term="Seat">Chief Technology Officer</DescriptionList.Item>
        <DescriptionList.Item term="Phase">
          <Tag>execute</Tag>
        </DescriptionList.Item>
        <DescriptionList.Item term="Turn">
          <Copyable value="0f8c2a11-4d1e-49f5-9b3a-2f1c7d0e5a44" ariaLabel="Copy the turn id" />
        </DescriptionList.Item>
        <DescriptionList.Item term="Started">
          <RelativeTime value={new Date(Date.now() - 1000 * 60 * 42).toISOString()} />
        </DescriptionList.Item>
      </DescriptionList>
    </div>
  ),
};

/** Tuples, for pairs built from a record rather than written out. */
export const FromTuples: Story = {
  args: {
    items: [
      ['Node', 'node-a'],
      ['Revision', '17'],
      ['Applied', 'yes'],
    ],
  },
  render: (args) => (
    <div style={{ maxWidth: 480 }}>
      <DescriptionList {...args} />
    </div>
  ),
};
