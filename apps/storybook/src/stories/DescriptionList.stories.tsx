import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card, Copyable, DescriptionList, RelativeTime, Tag } from '@crewlethq/ui';

const meta: Meta<typeof DescriptionList> = {
  title: 'UI/DescriptionList',
  component: DescriptionList,
  argTypes: { dense: { control: 'boolean' }, fit: { control: 'boolean' } },
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

/**
 * FIT, for a panel of its own width: the terms take the longest term rather
 * than 120px, and the pairs stay side by side however narrow the window is,
 * because a 260px panel is 260px on a phone too. Its terms are a word each.
 */
export const Fit: Story = {
  args: {
    fit: true,
    dense: true,
    items: [
      ['Nodes', '1 live'],
      ['Config', 'Epoch 8'],
      ['Up', '2 days'],
      ['Alarms', 'Backup age'],
    ],
  },
  render: (args) => (
    <div style={{ width: 236, padding: 'var(--spacing-3)', border: '1px solid var(--color-border-default)' }}>
      <DescriptionList {...args} />
    </div>
  ),
};

/**
 * LISTS THAT HAVE TO LINE UP SHARE ONE TERM COLUMN. Stacked cards of settings
 * on one page, each its own list: left alone each sizes the column to its own
 * longest term, and the values start at a different place in every card. One
 * track set on the page as `--crewlet-description-list-term` (or passed to
 * each list as `termWidth`) puts every value on one line down the page.
 */
export const OneColumnDownAPage: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--spacing-4)', maxWidth: 640, ['--crewlet-description-list-term' as string]: '13rem' }}>
      <Card>
        <Card.Header>
          <Card.Title as="h3">Requests</Card.Title>
        </Card.Header>
        <Card.Body>
          <DescriptionList
            items={[
              ['Per minute', '600'],
              ['Burst', '60'],
            ]}
          />
        </Card.Body>
      </Card>
      <Card>
        <Card.Header>
          <Card.Title as="h3">Uploads</Card.Title>
        </Card.Header>
        <Card.Body>
          <DescriptionList
            items={[
              ['Largest file a seat may attach', '25 MB'],
              ['Files a turn may read', '40'],
            ]}
          />
        </Card.Body>
      </Card>
    </div>
  ),
};
