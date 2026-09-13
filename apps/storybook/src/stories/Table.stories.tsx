import type { Meta, StoryObj } from '@storybook/react-vite';
import { Table } from '@crewlethq/ui';

const meta: Meta<typeof Table> = {
  title: 'UI/Table',
  component: Table,
};

export default meta;
type Story = StoryObj<typeof Table>;

export const Basic: Story = {
  args: {
    headers: ['Name', 'Email', 'Role'],
    data: [
      ['Jane Cooper', 'jane@example.com', 'Owner'],
      ['Alex Park',  'alex@example.com', 'Admin'],
      ['Sam Lin',    'sam@example.com',  'Member'],
    ],
  },
};

export const Empty: Story = {
  args: {
    headers: ['Name', 'Email'],
    data: [],
    emptyMessage: 'No people yet. Invite teammates to populate this list.',
  },
};

export const WithActionButton: Story = {
  args: {
    headers: ['Project', 'Status'],
    data: [
      ['Website refresh', 'Active'],
      ['Mobile app',      'Planning'],
    ],
    actionButton: { label: 'View all projects', onClick: () => alert('Routing to /projects') },
  },
};
