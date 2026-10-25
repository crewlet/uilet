/** People, seats or records an answer names: a list of rows, each with its name, fact and own link, bare or in a card. */
import { cleanup, render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test } from 'vitest';
import { ButtonLink } from '../Button/index.js';
import { EntityList, type EntityListItem } from './index.js';

afterEach(cleanup);

const ITEMS: EntityListItem[] = [
  {
    id: 'swe',
    name: 'Agent SWE',
    fact: 'Core · 2.96M tokens this week',
    avatar: <span>S</span>,
    action: (
      <ButtonLink href="#/agents/swe" variant="ghost" size="small">
        Profile
      </ButtonLink>
    ),
  },
  { id: 'cto', name: 'Agent CTO', fact: 'Executives' },
];

test('is a named list of rows, each with its name, fact and link', () => {
  render(<EntityList label="Agents" items={ITEMS} />);
  const list = screen.getByRole('list', { name: 'Agents' });
  const rows = within(list).getAllByRole('listitem');
  expect(rows.length).toBe(2);
  expect(rows[0]!.textContent).toContain('Agent SWE');
  expect(rows[0]!.textContent).toContain('Core · 2.96M tokens this week');
  expect(within(rows[0]!).getByRole('link', { name: 'Profile' }).getAttribute('href')).toBe('#/agents/swe');
  expect(rows[0]!.querySelector('.crewlet-entity-list__avatar')!.getAttribute('aria-hidden')).toBe('true');
});

test('with a title it is a card named by it', () => {
  render(<EntityList title="Agents in Core" items={ITEMS} />);
  expect(screen.getByRole('region', { name: 'Agents in Core' })).toBeTruthy();
  expect(screen.getByRole('list')).toBeTruthy();
});

test('carries no axe violation', async () => {
  const { container } = render(
    <main>
      <EntityList title="Agents in Core" items={ITEMS} />
    </main>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations).toEqual([]);
});
