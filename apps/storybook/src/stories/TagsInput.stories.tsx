import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Announcer, FormField, TagsInput, type TagsInputOption } from '@crewlethq/ui';

const meta: Meta<typeof TagsInput> = {
  title: 'UI/TagsInput',
  component: TagsInput,
};

export default meta;
type Story = StoryObj<typeof TagsInput>;

const SEATS: TagsInputOption[] = [
  { value: 'Software Engineer', group: 'Seats', description: 'software-engineer' },
  { value: 'Site Reliability', group: 'Seats', description: 'site-reliability' },
  { value: 'Designer', group: 'Seats', description: 'designer' },
  { value: 'Engineering', group: 'Units' },
  { value: 'Go to Market', group: 'Units' },
];

/** The free-text field: type a value, press Enter or comma, get a chip. */
export const FreeText: Story = {
  render: () => {
    function Demo() {
      const [value, setValue] = useState(['10.0.0.0/8']);
      return (
        <div style={{ width: 460 }}>
          <Announcer />
          <FormField label="Allowed ranges" helper="One CIDR range per chip.">
            {(field) => (
              <TagsInput
                id={field.id}
                label="Allowed ranges"
                monospace
                value={value}
                onChange={setValue}
              />
            )}
          </FormField>
        </div>
      );
    }
    return <Demo />;
  },
};

/**
 * The options mode: a search over what may be chosen, with the list left open
 * so several neighbours are taken without retyping.
 */
export const Options: Story = {
  render: () => {
    function Demo() {
      const [value, setValue] = useState(['Designer', 'Former Unit']);
      return (
        <div style={{ width: 460 }}>
          <Announcer />
          <FormField label="Manages" helper="Seats and units this seat is responsible for.">
            {(field) => (
              <TagsInput
                id={field.id}
                label="Manages"
                options={SEATS}
                allowCustom={false}
                placeholder="Search seats and units"
                value={value}
                onChange={setValue}
              />
            )}
          </FormField>
          <p style={{ marginTop: 12, fontSize: 13 }}>
            "Former Unit" is not offered any more, and is still held.
          </p>
        </div>
      );
    }
    return <Demo />;
  },
};

/**
 * An ordered chain, where the order is the meaning: a provider fallback chain
 * is tried first to last.
 */
export const Ordered: Story = {
  render: () => {
    function Demo() {
      const [value, setValue] = useState(['anthropic/opus', 'anthropic/sonnet', 'openai/gpt']);
      return (
        <div style={{ width: 520 }}>
          <Announcer />
          <FormField label="Fallback chain" helper="Tried first to last.">
            {(field) => (
              <TagsInput
                id={field.id}
                label="Fallback chain"
                ordered
                monospace
                placeholder="Add a model"
                value={value}
                onChange={setValue}
              />
            )}
          </FormField>
        </div>
      );
    }
    return <Demo />;
  },
};
