import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Select, type SelectValue } from '@crewlethq/ui';

const fruits = [
  { value: 'apple', label: 'Apple', description: 'Red, crunchy' },
  { value: 'banana', label: 'Banana', description: 'Yellow, soft' },
  { value: 'cherry', label: 'Cherry', description: 'Small, sweet' },
  { value: 'durian', label: 'Durian', description: 'Spiky, controversial', disabled: true },
];

function Demo(props: Partial<React.ComponentProps<typeof Select>>) {
  const [value, setValue] = useState<SelectValue | undefined>('apple');
  return (
    <div style={{ width: 320 }}>
      <Select
        options={fruits}
        value={value}
        onChange={(v) => setValue(v as SelectValue)}
        {...props}
      />
    </div>
  );
}

const meta: Meta<typeof Select> = {
  title: 'UI/Select',
  component: Select,
};

export default meta;
type Story = StoryObj<typeof Select>;

export const Basic: Story = { render: () => <Demo /> };
export const Small: Story = { render: () => <Demo size="sm" /> };
export const Searchable: Story = { render: () => <Demo searchable /> };
export const Disabled: Story = { render: () => <Demo disabled /> };
