import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Tag, TagsInput, FormField } from '@crewlethq/ui';

const meta: Meta<typeof Tag> = {
  title: 'UI/Tag',
  component: Tag,
  args: { children: 'production', variant: 'neutral', size: 'md' },
  argTypes: {
    variant: { control: 'inline-radio', options: ['neutral', 'info', 'success', 'warn', 'danger', 'brand'] },
    size: { control: 'inline-radio', options: ['sm', 'md'] },
    monospace: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Tag>;

export const Neutral: Story = {};
export const Info: Story = { args: { variant: 'info', children: 'info' } };
export const Success: Story = { args: { variant: 'success', children: 'active' } };
export const Warn: Story = { args: { variant: 'warn', children: 'beta' } };
export const Danger: Story = { args: { variant: 'danger', children: 'deprecated' } };
export const Brand: Story = { args: { variant: 'brand', children: 'new' } };
export const Monospace: Story = { args: { monospace: true, children: '10.96.0.0/12' } };
export const Removable: Story = {
  render: () => (
    <Tag variant="neutral" onRemove={() => alert('removed')}>frontend</Tag>
  ),
};

export const InTagsInput: Story = {
  render: () => {
    function Demo() {
      const [tags, setTags] = useState<string[]>(['production', 'eu-west-1']);
      return (
        <div style={{ maxWidth: 480 }}>
          <FormField label="Tags" helper="Add a tag, press Enter or comma. Backspace removes the last one.">
            {({ id }) => (
              <TagsInput id={id} value={tags} onChange={setTags} placeholder="Add a tag" />
            )}
          </FormField>
        </div>
      );
    }
    return <Demo />;
  },
};

export const InTagsInputMonospace: Story = {
  render: () => {
    function Demo() {
      const [tags, setTags] = useState<string[]>(['10.244.0.0/16']);
      return (
        <div style={{ maxWidth: 480 }}>
          <FormField label="Pod CIDRs">
            {({ id }) => (
              <TagsInput id={id} value={tags} onChange={setTags} monospace placeholder="Add a CIDR" />
            )}
          </FormField>
        </div>
      );
    }
    return <Demo />;
  },
};
