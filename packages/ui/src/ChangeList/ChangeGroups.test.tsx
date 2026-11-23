/**
 * Changes by subject: each subject said once over its rows, values cut with
 * their words on hover, and subjects and rows folding behind "Show N more".
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test } from 'vitest';
import { ChangeGroups, ChangeList, type ChangeGroup, type ChangeListRow } from './index.js';

afterEach(cleanup);

const jobs: ChangeListRow[] = [
  { kind: 'changed', label: 'Coding', from: 'platform-sonnet-8', to: 'platform-opus-long-context-14' },
  { kind: 'changed', label: 'Reviewing and delegations', from: 'platform-sonnet-8', to: 'platform-opus-long-context-14' },
  { kind: 'changed', label: 'Routines and evaluations', from: 'platform-sonnet-8', to: 'platform-opus-long-context-14' },
];

const seat = (name: string): ChangeGroup => ({
  key: name,
  subject: name,
  rows: [{ kind: 'changed', label: 'Unit', from: 'Product', to: 'Platform' }],
});

test('a subject is said once and names the rows under it', () => {
  render(<ChangeList subject="Site Reliability Engineer" rows={jobs} truncate />);
  expect(screen.getAllByText('Site Reliability Engineer')).toHaveLength(1);
  const list = document.querySelector('dl')!;
  const names = list.getAttribute('aria-labelledby')!.split(' ').map((id) => document.getElementById(id)?.textContent);
  expect(names).toEqual(['Site Reliability Engineer']);
  expect(list.textContent).toContain('Changed from platform-sonnet-8');
});

test('a cut value carries its whole words as a title, a value that fits none', () => {
  render(<ChangeList rows={jobs.slice(0, 1)} truncate />);
  const to = document.querySelector<HTMLElement>('.crewlet-change-list__to')!;
  fireEvent.mouseEnter(to);
  expect(to.hasAttribute('title')).toBe(false);
  Object.defineProperty(to, 'scrollWidth', { value: 300 });
  Object.defineProperty(to, 'clientWidth', { value: 100 });
  fireEvent.mouseEnter(to);
  expect(to.getAttribute('title')).toBe('platform-opus-long-context-14');
});

test('rows past collapseAfter fold behind Show N more, and never just one', () => {
  const { rerender } = render(<ChangeList rows={[...jobs, ...jobs]} collapseAfter={2} />);
  expect(document.querySelectorAll('.crewlet-change-list__row')).toHaveLength(2);
  const more = screen.getByRole('button', { name: 'Show 4 more' });
  expect(more.getAttribute('aria-expanded')).toBe('false');
  fireEvent.click(more);
  expect(document.querySelectorAll('.crewlet-change-list__row')).toHaveLength(6);
  expect(screen.getByRole('button', { name: 'Show fewer' }).getAttribute('aria-expanded')).toBe('true');
  rerender(<ChangeList rows={jobs} collapseAfter={2} />);
  expect(screen.queryByRole('button')).toBeNull();
});

test('subjects past collapseAfter fold, named beside the control', () => {
  const groups = ['QA Engineer', 'Site Reliability Engineer', 'Product Manager', 'Senior Product Designer', 'Data Analyst'].map(seat);
  render(<ChangeGroups groups={groups} heading="What changes" />);
  expect(screen.getByRole('group', { name: 'What changes' })).toBeTruthy();
  expect(document.querySelectorAll('.crewlet-change-list__subject')).toHaveLength(3);
  expect(screen.getByText('Senior Product Designer, Data Analyst')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Show 2 more' }));
  expect(document.querySelectorAll('.crewlet-change-list__subject')).toHaveLength(5);
});

test('has no axe violations', async () => {
  render(<ChangeGroups groups={[{ key: 'sre', subject: 'Site Reliability Engineer', rows: jobs }, seat('QA'), seat('PM'), seat('BE'), seat('DA')]} />);
  const result = await axe.run(document.body, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations.map((violation) => violation.id)).toEqual([]);
});
