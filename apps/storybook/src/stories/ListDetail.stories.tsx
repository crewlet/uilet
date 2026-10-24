import type { Meta, StoryObj } from '@storybook/react-vite';
import { DirectoryList, ListDetail, ObjectHeader, StatusDot, Tag } from '@crewlethq/ui';
import { VendorMark } from '@crewlethq/icons';

const list = (
  <DirectoryList
    label="Integrations"
    groups={[
      {
        key: 'chat',
        label: 'Chat',
        items: [
          { key: 'slack', href: '#slack', mark: <VendorMark vendor="slack" size="md" />, label: 'Slack', status: <StatusDot tone="success">Connected</StatusDot>, selected: true },
          { key: 'mattermost', href: '#mattermost', mark: <VendorMark vendor="mattermost" size="md" />, label: 'Mattermost' },
        ],
      },
      {
        key: 'code',
        label: 'Code',
        items: [{ key: 'github', href: '#github', mark: <VendorMark vendor="github" size="md" />, label: 'GitHub' }],
      },
    ]}
  />
);

const meta: Meta<typeof ListDetail> = {
  title: 'UI/ListDetail',
  component: ListDetail,
  args: { list, showing: 'detail' },
  argTypes: { showing: { control: 'inline-radio', options: ['list', 'detail'] } },
  /* In a box of a fixed height, as the shell's fill gives a screen: the detail scrolls on its own. */
  render: (args) => (
    <div style={{ height: 480 }}>
      <ListDetail {...args}>
        <ObjectHeader
          kind="Integration"
          mark={<VendorMark vendor="slack" size={36} />}
          title="Slack"
          status={<Tag variant="success">Connected</Tag>}
          description="Each agent posts as its own bot."
        />
        {Array.from({ length: 24 }, (_, i) => (
          <p key={i} style={{ margin: 0 }}>
            Delivery {24 - i}: a mention in #general.
          </p>
        ))}
      </ListDetail>
    </div>
  ),
};

export default meta;
type Story = StoryObj<typeof ListDetail>;

/** A list beside the chosen item's detail. Below 640px only the pane `showing` names is drawn. */
export const Basic: Story = {};
