import type { Meta, StoryObj } from '@storybook/react-vite';
import { FactList } from '@crewlethq/ui';

/**
 * Facts a form shows and does not edit, one 32px row each in one bordered box.
 * A locked row carries a lock and says why on hover and on focus.
 */
const meta: Meta<typeof FactList> = {
  title: 'UI/FactList',
  component: FactList,
};

export default meta;
type Story = StoryObj<typeof FactList>;

export const Default: Story = {
  render: () => (
    <div style={{ maxWidth: 480 }}>
      <FactList
        label="Set in the configuration document"
        items={[
          { key: 'handle', label: 'Handle', value: 'engineer', reason: 'An existing seat keeps its handle.' },
          { key: 'sandbox', label: 'Sandbox', value: 'On, this host', reason: 'Set in the configuration document.' },
          { key: 'placement', label: 'Placement', value: 'Any node', reason: 'A fleet setting, edited in the configuration document.' },
          { key: 'reports', label: 'Reports to', value: 'Product Manager' },
        ]}
      />
    </div>
  ),
};
