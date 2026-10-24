/**
 * DirectoryList: a navigation landmark of headed lists, the chosen line the
 * current page, and a foot that is the list's last word.
 */

import { cleanup, render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, expect, test } from 'vitest';
import { DirectoryList, type DirectoryGroup } from './index.js';

afterEach(cleanup);

const groups: DirectoryGroup[] = [
  {
    key: 'chat',
    label: 'Chat',
    items: [
      { key: 'crewlet-chat', href: '#/chat', label: 'Crewlet Chat', status: <span>Soon</span> },
      { key: 'slack', href: '#/slack', label: 'Slack', status: <span>Connected</span>, selected: true },
    ],
  },
  {
    key: 'work',
    label: 'Work tracking',
    items: [{ key: 'jira', href: '#/jira', label: 'Jira', hint: 'Atlassian' }],
  },
];

test('is a navigation landmark of lists, each named by its heading', () => {
  render(<DirectoryList label="Integrations" groups={groups} />);
  const nav = screen.getByRole('navigation', { name: 'Integrations' });
  const chat = within(nav).getByRole('region', { name: 'Chat' });
  expect(within(chat).getAllByRole('listitem')).toHaveLength(2);
  expect(within(nav).getByRole('heading', { name: 'Work tracking' })).toBeTruthy();
});

test('marks the chosen line as the current page, and only that one', () => {
  render(<DirectoryList label="Integrations" groups={groups} />);
  const current = screen.getAllByRole('link').filter((a) => a.getAttribute('aria-current') === 'page');
  expect(current.map((a) => a.textContent)).toEqual(['SlackConnected']);
});

test('draws a hint and a state only where an item has them', () => {
  const { container } = render(<DirectoryList label="Integrations" groups={groups} />);
  expect(container.querySelectorAll('.crewlet-directory__status')).toHaveLength(2);
  expect(screen.getByRole('link', { name: /Jira/ }).querySelector('.crewlet-directory__hint')!.textContent).toBe('Atlassian');
});

test('ends with its foot when given one, and draws none otherwise', () => {
  const { container, rerender } = render(<DirectoryList label="Integrations" groups={groups} />);
  expect(container.querySelector('.crewlet-directory__foot')).toBeNull();
  rerender(<DirectoryList label="Integrations" groups={groups} foot={<span>Apps reach this engine at</span>} />);
  const nav = container.querySelector('nav')!;
  expect(nav.lastElementChild!.className).toBe('crewlet-directory__foot');
});

/** One rule's body from the sheet, comments taken out. */
function rule(selector: string): string {
  const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'DirectoryList.css'), 'utf8').replace(
    /\/\*[\s\S]*?\*\//g,
    '',
  );
  return new RegExp(`${selector.replace(/[.]/g, '\\.')} \\{([^}]*)\\}`).exec(css)?.[1] ?? '';
}

// THE RAIL'S ROW STEP: a line is exactly the rail's height, in its compact
// type, so a state pill or a hint can never make one line taller than the rest.
test("a line stands at the rail's row step, its hint inline after the label", () => {
  const item = rule('.crewlet-directory__item');
  expect(item).toMatch(/height:\s*var\(--size-nav-row\);/);
  expect(item).not.toMatch(/min-height/);
  expect(item).toMatch(/font-size:\s*var\(--font-size-compact\);/);
  // ONE LINE: the hint follows the label rather than standing under it, and
  // gives way first when the column is narrow.
  const text = rule('.crewlet-directory__text');
  expect(text).not.toMatch(/flex-direction:\s*column/);
  expect(rule('.crewlet-directory__label')).toMatch(/flex:\s*0 0 auto;/);
  expect(rule('.crewlet-directory__hint')).toMatch(/flex:\s*0 1 auto;/);
  expect(rule('.crewlet-directory__status')).toMatch(/max-height:\s*calc\(var\(--size-nav-row\)/);
  // GROUPS ONE SMALL STEP APART, so a heading reads as the head of its lines.
  expect(rule('.crewlet-directory__groups')).toMatch(/gap:\s*var\(--spacing-3\);/);
});

test('has no accessibility violations', async () => {
  const { container } = render(<DirectoryList label="Integrations" groups={groups} foot="Apps reach this engine at" />);
  const result = await axe.run(container);
  expect(result.violations).toEqual([]);
});
