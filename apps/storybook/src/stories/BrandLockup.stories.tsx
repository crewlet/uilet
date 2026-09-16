import type { Meta, StoryObj } from '@storybook/react-vite';
import { CrewletIcon } from '@crewlethq/icons';
import { BrandLockup } from '@crewlethq/ui';

const meta: Meta<typeof BrandLockup> = {
  title: 'UI/BrandLockup',
  component: BrandLockup,
  args: { name: 'Crewlet', mark: <CrewletIcon />, href: '#/' },
  parameters: {
    docs: {
      description: {
        component:
          'The head of the rail. The link is named by the product, and the context line under it says which company or console the reader is inside.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof BrandLockup>;

export const WithACompany: Story = { args: { context: 'Acme Holdings' } };
export const WithoutAContext: Story = {};
export const Superadmin: Story = { args: { context: 'Superadmin' } };
export const ALongCompanyName: Story = {
  args: { context: 'Brightwater Manufacturing and Logistics Group' },
  render: (args) => (
    <div style={{ width: 'var(--size-shell-rail)', background: 'var(--color-surface-topbar)' }}>
      <BrandLockup {...args} />
    </div>
  ),
};

/**
 * In the box it is actually drawn in: the rail's head, which is the top bar's
 * own height at every density, on the rail's own ground.
 *
 * The lockup has to come in under that height with its context line on, or the
 * head grows past the bar beside it and puts a kink across the window. The
 * dashed rule marks where the bar's bottom border runs in the column to the
 * right; the rail draws no line of its own there.
 */
export const InTheRailsHead: Story = {
  args: { context: 'Acme Holdings' },
  render: (args) => (
    <div
      style={{
        width: 'var(--size-shell-rail)',
        background: 'var(--color-surface-topbar)',
        borderRight: '1px solid var(--color-border-default)',
        borderBottom: '1px dashed var(--color-border-default)',
        minHeight: 'var(--size-shell-topbar)',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <BrandLockup {...args} />
    </div>
  ),
};
