import type { Meta, StoryObj } from '@storybook/react-vite';
import { Copyable, DirectoryList, StatusDot, Tag, type DirectoryGroup } from '@crewlethq/ui';
import { ProductMark, VendorMark } from '@crewlethq/icons';

/** Company › Integrations: Crewlet's own service first in each group, then the apps that serve the same need. */
const GROUPS: DirectoryGroup[] = [
  {
    key: 'chat',
    label: 'Chat',
    items: [
      { key: 'crewlet-chat', href: '#chat', mark: <ProductMark product="chat" size="md" soon />, label: 'Crewlet Chat', status: <Tag size="sm" variant="brand" appearance="outline">Soon</Tag> },
      { key: 'slack', href: '#slack', mark: <VendorMark vendor="slack" size="md" />, label: 'Slack', status: <StatusDot tone="success">Connected</StatusDot>, selected: true },
      { key: 'mattermost', href: '#mattermost', mark: <VendorMark vendor="mattermost" size="md" />, label: 'Mattermost' },
    ],
  },
  {
    key: 'work',
    label: 'Work tracking',
    items: [
      { key: 'works', href: '#works', mark: <ProductMark product="works" size="md" />, label: 'Crewlet Works', status: <Tag size="sm" variant="success">On</Tag> },
      { key: 'jira', href: '#jira', mark: <VendorMark vendor="atlassian" size="md" />, label: 'Jira', hint: 'Atlassian' },
    ],
  },
  {
    key: 'docs',
    label: 'Docs and knowledge',
    items: [
      { key: 'knowledge', href: '#knowledge', mark: <ProductMark product="knowledge" size="md" />, label: 'Crewlet Knowledge', status: <Tag size="sm" variant="neutral" appearance="outline">Off</Tag> },
      { key: 'confluence', href: '#confluence', mark: <VendorMark vendor="atlassian" size="md" />, label: 'Confluence', hint: 'Atlassian', status: <StatusDot tone="warning">Needs attention</StatusDot> },
    ],
  },
  {
    key: 'code',
    label: 'Code',
    items: [
      { key: 'github', href: '#github', mark: <VendorMark vendor="github" size="md" />, label: 'GitHub' },
      { key: 'gitlab', href: '#gitlab', mark: <VendorMark vendor="gitlab" size="md" />, label: 'GitLab' },
    ],
  },
];

const ADDRESS = 'https://fairsplit.example.com';

const meta: Meta<typeof DirectoryList> = {
  title: 'UI/DirectoryList',
  component: DirectoryList,
  args: {
    label: 'Integrations',
    groups: GROUPS,
    foot: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 12 }}>Apps reach this engine at</span>
        <Copyable value={ADDRESS} display={ADDRESS} monospace truncate title={ADDRESS} ariaLabel={`Copy the engine's address, ${ADDRESS}`} />
      </div>
    ),
  },
  /* In a column of a fixed height, as a screen in the shell's fill gives it: the foot holds the bottom. */
  render: (args) => (
    <div style={{ height: 520, width: 272 }}>
      <DirectoryList {...args} />
    </div>
  ),
};

export default meta;
type Story = StoryObj<typeof DirectoryList>;

/** The chosen line on the selected ground, a state only where a line has one, and the address at the foot. */
export const Basic: Story = {};

/** A short column: the groups scroll on their own and the foot stays at the bottom. */
export const Scrolling: Story = {
  render: (args) => (
    <div style={{ height: 300, width: 272 }}>
      <DirectoryList {...args} />
    </div>
  ),
};
