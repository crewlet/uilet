import type { Meta, StoryObj } from '@storybook/react-vite';
import { useMemo, useState } from 'react';
import { PrincipalPicker, Text, type PrincipalOption } from '@crewlethq/ui';

const meta: Meta<typeof PrincipalPicker> = {
  title: 'UI/PrincipalPicker',
  component: PrincipalPicker,
};

export default meta;
type Story = StoryObj<typeof PrincipalPicker>;

const EVERYONE: PrincipalOption[] = [
  { id: 'jane', kind: 'person', name: 'Jane Founder', detail: 'Platform' },
  { id: 'lee', kind: 'person', name: 'Lee Park', detail: 'Operations' },
  { id: 'maya', kind: 'person', name: 'Maya Ortiz', disabled: true, disabledReason: 'Already has access' },
  { id: 'pm', kind: 'agent', name: 'Product Manager', detail: 'Product', character: 'gemlet', hue: 'rose' },
  { id: 'cto', kind: 'agent', name: 'CTO', detail: 'Engineering', character: 'hexlet', hue: 'amber' },
  { id: 'ops', kind: 'team', name: 'Operations', detail: '6 people, 4 agents' },
  { id: 'eng', kind: 'team', name: 'Engineering', detail: '3 people, 9 agents' },
];

/**
 * Matches are grouped people, then agents, then teams, each drawn as itself.
 * The caller searches; here a substring stands in for the engine.
 */
export const Search: Story = {
  render: function Render() {
    const [query, setQuery] = useState('');
    const [picked, setPicked] = useState<string[]>([]);
    const options = useMemo(
      () => EVERYONE.filter((option) => option.name.toLowerCase().includes(query.trim().toLowerCase())),
      [query],
    );
    return (
      // A gap between the field and the line under it, which otherwise sat
      // 2px under the field's edge as though it were the field's own hint.
      <div style={{ display: 'grid', alignContent: 'start', gap: 'var(--spacing-2)', maxWidth: 420, minHeight: 360 }}>
        <PrincipalPicker
          query={query}
          onQueryChange={setQuery}
          options={options}
          onPick={(principal) => setPicked((list) => [...list, principal.name])}
          label="Add people, agents or teams"
          placeholder="Add people, agents or teams"
        />
        <Text as="p" variant="caption">
          Picked: {picked.length > 0 ? picked.join(', ') : 'nobody yet'}
        </Text>
      </div>
    );
  },
};

/** While a search is in flight the list says so, rather than saying nobody matches. */
export const Searching: Story = {
  render: function Render() {
    const [query, setQuery] = useState('op');
    return (
      <div style={{ maxWidth: 420, minHeight: 200 }}>
        <PrincipalPicker query={query} onQueryChange={setQuery} options={[]} onPick={() => {}} label="Add people, agents or teams" loading />
      </div>
    );
  },
};
