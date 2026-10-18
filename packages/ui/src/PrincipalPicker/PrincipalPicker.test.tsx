/**
 * The search over people, agents and teams: grouped by kind, one highlight
 * across the groups, and a pick that clears the field for the next name.
 */

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { useState } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import type { Principal } from '../Principal/index.js';
import { PrincipalPicker, type PrincipalOption } from './index.js';

afterEach(cleanup);

const OPTIONS: PrincipalOption[] = [
  { id: 'ops', kind: 'team', name: 'Operations', detail: '6 people, 4 agents' },
  { id: 'pm', kind: 'agent', name: 'Product Manager', detail: 'Product', character: 'gemlet', hue: 'rose' },
  { id: 'jane', kind: 'person', name: 'Jane Founder', detail: 'Platform' },
  { id: 'maya', kind: 'person', name: 'Maya Ortiz', disabled: true, disabledReason: 'Already has access' },
];

function Picker({ onPick, options = OPTIONS, loading }: { onPick: (principal: Principal) => void; options?: PrincipalOption[]; loading?: boolean }) {
  const [query, setQuery] = useState('');
  return <PrincipalPicker query={query} onQueryChange={setQuery} options={options} onPick={onPick} label="Add people, agents or teams" loading={loading} />;
}

const field = () => screen.getByRole('combobox', { name: 'Add people, agents or teams' });

test('groups the matches people, then agents, then teams, each a named group', () => {
  render(<Picker onPick={() => {}} />);
  fireEvent.focus(field());
  const list = screen.getByRole('listbox', { name: 'Add people, agents or teams' });
  const groups = within(list).getAllByRole('group');
  expect(groups.map((group) => group.getAttribute('aria-labelledby') && document.getElementById(group.getAttribute('aria-labelledby') ?? '')?.textContent)).toEqual([
    'People',
    'Agents',
    'Teams',
  ]);
  expect(within(screen.getByRole('group', { name: 'Teams' })).getByRole('option').textContent).toContain('6 people, 4 agents');
});

test('the highlight moves across the groups in order, and Enter picks and clears', () => {
  const onPick = vi.fn();
  render(<Picker onPick={onPick} />);
  fireEvent.change(field(), { target: { value: 'a' } });
  fireEvent.keyDown(field(), { key: 'ArrowDown' });
  fireEvent.keyDown(field(), { key: 'ArrowDown' });
  fireEvent.keyDown(field(), { key: 'Enter' });
  // Jane (people), then Maya is disabled and stepped over, so the second is the agent.
  expect(onPick).toHaveBeenCalledTimes(1);
  expect((onPick.mock.calls[0]?.[0] as Principal).id).toBe('pm');
  expect((field() as HTMLInputElement).value).toBe('');
});

test('a disabled match says why and cannot be picked', () => {
  const onPick = vi.fn();
  render(<Picker onPick={onPick} />);
  fireEvent.focus(field());
  const maya = screen.getByRole('option', { name: /Maya Ortiz/ });
  expect(maya.getAttribute('aria-disabled')).toBe('true');
  expect(maya.textContent).toContain('Already has access');
  fireEvent.mouseDown(maya);
  expect(onPick).not.toHaveBeenCalled();
});

test('says nobody matches, or that it is still searching, rather than drawing an empty list', () => {
  const { rerender } = render(<Picker onPick={() => {}} options={[]} />);
  fireEvent.change(field(), { target: { value: 'zz' } });
  expect(screen.getByText('Nobody matches. Try a name, a handle or a team.')).toBeDefined();
  rerender(<Picker onPick={() => {}} options={[]} loading />);
  expect(screen.getByText('Searching')).toBeDefined();
});

test('carries no axe violation with its list open', async () => {
  const { container } = render(
    <main>
      <h1>Share</h1>
      <Picker onPick={() => {}} />
    </main>,
  );
  fireEvent.focus(field());
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations.map((violation) => violation.id)).toEqual([]);
});
