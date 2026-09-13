import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Input, Textarea, FormField, FormRow, Button, Kbd } from '@crewlethq/ui';

const meta: Meta<typeof Input> = {
  title: 'UI/Input',
  component: Input,
  args: {
    placeholder: 'Type here…',
    inputSize: 'md',
  },
  argTypes: {
    inputSize: { control: 'inline-radio', options: ['sm', 'md'] },
    error: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Basic: Story = {};
export const Small: Story = { args: { inputSize: 'sm' } };
export const Error: Story = { args: { error: true, defaultValue: 'invalid value' } };
export const Disabled: Story = { args: { disabled: true, defaultValue: 'read only' } };

/* A field that adds its value to a list on Enter says so with a keycap in
   its trailing slot. */
export const EnterAdds: Story = {
  args: { placeholder: 'e.g. code-review', trailing: <Kbd subtle>Enter</Kbd> },
};

export const TextareaEnterAdds: Story = {
  render: () => (
    <div style={{ maxWidth: 420 }}>
      <Textarea autoResize rows={1} placeholder="e.g. Communicate decisions in writing" trailing={<Kbd subtle>Enter</Kbd>} />
    </div>
  ),
};

export const InsideFormField: Story = {
  render: () => (
    <div style={{ maxWidth: 360 }}>
      <FormField
        label="Project name"
        required
        helper="Visible to project members only."
      >
        {({ id, describedBy }) => (
          <Input id={id} aria-describedby={describedBy} placeholder="e.g. Quarterly reports" />
        )}
      </FormField>
    </div>
  ),
};

export const FormFieldWithError: Story = {
  render: () => (
    <div style={{ maxWidth: 360 }}>
      <FormField
        label="Email"
        required
        error="Enter a valid email address."
      >
        {({ id, describedBy }) => (
          <Input id={id} type="email" aria-describedby={describedBy} error defaultValue="not-an-email" />
        )}
      </FormField>
    </div>
  ),
};

export const FormRowGrid: Story = {
  render: () => (
    <div style={{ maxWidth: 480 }}>
      <FormRow columns={2}>
        <FormField label="First name">
          {({ id }) => <Input id={id} />}
        </FormField>
        <FormField label="Last name">
          {({ id }) => <Input id={id} />}
        </FormField>
      </FormRow>
    </div>
  ),
};

export const TextareaAutoResize: Story = {
  render: () => {
    function Demo() {
      const [value, setValue] = useState('Type a few lines and watch the box grow.');
      return (
        <div style={{ maxWidth: 480 }}>
          <FormField label="Mission" helper="Auto-resizing textarea.">
            {({ id }) => (
              <Textarea
                id={id}
                autoResize
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            )}
          </FormField>
        </div>
      );
    }
    return <Demo />;
  },
};

export const LabelWithAction: Story = {
  render: () => (
    <div style={{ maxWidth: 480 }}>
      <FormField
        label="Policies"
        labelAction={
          <Button size="small" variant="tertiary" leadingIcon={<span className="material-symbols-outlined">add</span>}>
            Add policy
          </Button>
        }
      >
        {({ id }) => <Textarea id={id} placeholder="Type one policy and press Add." />}
      </FormField>
    </div>
  ),
};
