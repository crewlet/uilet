import type { Meta, StoryObj } from '@storybook/react-vite';
import { Icon, ICON_NAMES, type IconName } from '@crewlethq/icons';

const Gallery = () => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
      gap: 'var(--spacing-3)',
    }}
  >
    {ICON_NAMES.map((name: IconName) => (
      <div
        key={name}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--spacing-2)',
          padding: 'var(--spacing-3)',
          border: '1px solid var(--color-border-default)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--color-text-primary)',
        }}
      >
        <Icon name={name} size="xl" />
        <code style={{ fontSize: 'var(--font-size-xs)' }}>{name}</code>
      </div>
    ))}
  </div>
);

const meta: Meta = {
  title: 'Brand/Signature Icons',
  parameters: { layout: 'padded' },
};

export default meta;

export const All: StoryObj = {
  render: () => <Gallery />,
};
