import type { Meta, StoryObj } from '@storybook/react-vite';
import { BrandChip } from '@crewlethq/ui';
import mark from '@crewlethq/icons/favicon/crewlet.svg';

const meta: Meta<typeof BrandChip> = {
  title: 'UI/BrandChip',
  component: BrandChip,
};

export default meta;
type Story = StoryObj<typeof BrandChip>;

/**
 * THE COMPANY'S BRAND, ONE PRESS AWAY: on the artifacts gallery's Make row,
 * the brand's mark and name link to Company › Brand. Before a brand exists an
 * administrator sees the brand glyph and "Set up your brand"; everyone else
 * sees nothing.
 */
export const Chips: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
      <BrandChip href="#/company/brand" label="Crewlet brand" mark={mark} />
      <BrandChip href="#/company/brand" label="Set up your brand" />
    </div>
  ),
};

/** A long company name, cut on one line inside a narrow row. */
export const Narrow: Story = {
  render: () => (
    <div style={{ width: 200 }}>
      <BrandChip href="#/company/brand" label="Halcyon Freight and Logistics brand" mark={mark} />
    </div>
  ),
};
