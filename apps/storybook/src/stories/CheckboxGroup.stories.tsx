import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Checkbox, CheckboxGroup } from '@crewlethq/ui';

const meta: Meta<typeof CheckboxGroup> = {
  title: 'UI/CheckboxGroup',
  component: CheckboxGroup,
};

export default meta;
type Story = StoryObj<typeof CheckboxGroup>;

const APPS = [
  { key: 'worklet', label: 'Worklet', description: 'Work items, inboxes and My work.' },
  { key: 'doclet', label: 'Doclet', description: 'The knowledge base and diaries.' },
  { key: 'spend', label: 'Spend', description: 'Budgets and what each agent spent.' },
];

/**
 * Several boxes that answer one question. The legend names the group once, in
 * the field label's register, and each box keeps its own name and sentence.
 * Admin includes every app, so ticking it ticks and locks them, and a box the
 * writer cannot give is drawn disabled with why.
 */
export const AccessPicker: Story = {
  render: function Render() {
    const [value, setValue] = useState<string[]>(['worklet']);
    const admin = value.includes('admin');
    const toggle = (key: string, on: boolean) =>
      setValue((prior) => (on ? [...prior, key] : prior.filter((item) => item !== key)));
    return (
      <div style={{ maxWidth: 420 }}>
        <CheckboxGroup legend="Access" helper="What this person can open, besides the overview.">
          <Checkbox
            label="Admin"
            description="Every app, and changing people and settings."
            checked={admin}
            onCheckedChange={(on) => toggle('admin', on)}
          />
          {APPS.map((app) => (
            <Checkbox
              key={app.key}
              label={app.label}
              description={admin ? 'Included with Admin.' : app.description}
              checked={admin || value.includes(app.key)}
              disabled={admin}
              onCheckedChange={(on) => toggle(app.key, on)}
            />
          ))}
          <Checkbox
            label="Billing"
            description="You don't have Billing, so you can't give it."
            checked={false}
            disabled
          />
        </CheckboxGroup>
      </div>
    );
  },
};

/** A group with nothing to offer says so, rather than drawing an empty fieldset. */
export const NothingToOffer: Story = {
  args: { legend: 'Access', emptyMessage: 'Nothing to offer.' },
};
