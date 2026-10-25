import type { Meta, StoryObj } from '@storybook/react-vite';
import { ProductMark, PRODUCTS, VendorMark, type Product } from '@crewlethq/icons';

const NAMES: Record<Product, string> = {
  worklet: 'Worklet',
  doclet: 'Doclet',
  chat: 'Crewlet Chat',
  assistant: 'Crewlet Assistant',
};
const SIZES = [16, 20, 24, 48] as const;

const meta: Meta<typeof ProductMark> = {
  title: 'Icons/ProductMark',
  component: ProductMark,
  args: { product: 'worklet', size: 48 },
  argTypes: { product: { control: 'inline-radio', options: [...PRODUCTS] }, soon: { control: 'boolean' } },
};

export default meta;
type Story = StoryObj<typeof ProductMark>;

/** One mark, at any size. */
export const Basic: Story = {};

/** Every product at 16, 20, 24 and 48px, beside the brand mark it is drawn from. Switch the theme to see it on dark. */
export const Sheet: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 24 }}>
      {PRODUCTS.map((product) => (
        <div key={product} style={{ display: 'flex', alignItems: 'end', gap: 16 }}>
          {SIZES.map((size) => (
            <ProductMark key={size} product={product} size={size} soon={product === 'chat'} />
          ))}
          <span style={{ fontSize: 13, marginLeft: 8 }}>
            {NAMES[product]}
            {product === 'chat' ? ' (coming soon)' : ''}
          </span>
        </div>
      ))}
      <div style={{ display: 'flex', alignItems: 'end', gap: 16 }}>
        {SIZES.map((size) => (
          <VendorMark key={size} vendor="crewlet" size={size} />
        ))}
        <span style={{ fontSize: 13, marginLeft: 8 }}>The brand mark</span>
      </div>
    </div>
  ),
};

/** Chat, shipped and coming soon: hollow, never grey. */
export const Soon: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 16 }}>
      <ProductMark product="chat" size={48} />
      <ProductMark product="chat" size={48} soon />
    </div>
  ),
};

/** The Assistant's Orbit mark at 16, 20, 24, 32 and 48px, plain and coming soon. */
export const Assistant: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 24 }}>
      {[false, true].map((soon) => (
        <div key={String(soon)} style={{ display: 'flex', alignItems: 'end', gap: 16 }}>
          {[16, 20, 24, 32, 48].map((size) => (
            <ProductMark key={size} product="assistant" size={size} soon={soon} />
          ))}
          <span style={{ fontSize: 13, marginLeft: 8 }}>{soon ? 'Crewlet Assistant (coming soon)' : 'Crewlet Assistant'}</span>
        </div>
      ))}
    </div>
  ),
};
