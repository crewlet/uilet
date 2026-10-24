/**
 * DirectoryList: a navigation landmark of headed lists, the chosen line the
 * current page, and a foot that is the list's last word.
 */

import { cleanup, render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
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

test('has no accessibility violations', async () => {
  const { container } = render(<DirectoryList label="Integrations" groups={groups} foot="Apps reach this engine at" />);
  const result = await axe.run(container);
  expect(result.violations).toEqual([]);
});
