/**
 * A status legend: the key to a chart's status colours, and its filter. Each
 * item is a toggle with a full name, and a status nothing holds stays drawn.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { useState } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { Canvas } from '../Canvas/index.js';
import { StatusLegend, type StatusLegendItem } from './index.js';

afterEach(cleanup);

const SHEET = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'StatusLegend.css'), 'utf8');
const ITEMS: StatusLegendItem[] = [
  { key: 'working', label: 'Working', tone: 'info', count: 4 },
  { key: 'needs', label: 'Needs you', tone: 'warning', count: 1 },
  { key: 'stopped', label: 'Paused or stopped', tone: 'danger', count: 1 },
  { key: 'idle', label: 'Idle', tone: 'neutral', count: 0 },
];
const agents = (count: number) => (count === 1 ? '1 agent' : `${count} agents`);

function Filter({ onChange = () => {} }: { onChange?: (key: string | null) => void }) {
  const [value, setValue] = useState<string | null>(null);
  return (
    <StatusLegend
      label="Filter by status"
      items={ITEMS}
      value={value}
      countLabel={agents}
      onValueChange={(next) => {
        setValue(next);
        onChange(next);
      }}
    />
  );
}

test('each status is a toggle named in full, in a named group', () => {
  render(<Filter />);
  const group = screen.getByRole('group', { name: 'Filter by status' });
  const buttons = within(group).getAllByRole('button');
  for (const [i, name] of [
    'Working, 4 agents',
    'Needs you, 1 agent',
    'Paused or stopped, 1 agent',
    'Idle, 0 agents',
  ].entries()) {
    expect(screen.getByRole('button', { name })).toBe(buttons[i]);
  }
  // Named by what it shows rather than by a label beside it, so the visible words are part of the name.
  for (const button of buttons) expect(button.hasAttribute('aria-label')).toBe(false);
  for (const button of within(group).getAllByRole('button')) expect(button.getAttribute('aria-pressed')).toBe('false');
  // Its dot, its word and its count, in the tone a status dot takes everywhere.
  const working = screen.getByRole('button', { name: 'Working, 4 agents' });
  expect(working.querySelector('.crewlet-status-dot--info')).not.toBeNull();
  expect(working.querySelector('[aria-hidden="true"]')!.textContent?.trim()).toBe('Working4');
});

test('a press filters by that status, another moves the filter, and the pressed one again clears it', () => {
  const changed = vi.fn();
  render(<Filter onChange={changed} />);
  fireEvent.click(screen.getByRole('button', { name: 'Needs you, 1 agent' }));
  expect(changed).toHaveBeenLastCalledWith('needs');
  expect(screen.getByRole('button', { name: 'Needs you, 1 agent' }).getAttribute('aria-pressed')).toBe('true');
  fireEvent.click(screen.getByRole('button', { name: 'Working, 4 agents' }));
  expect(changed).toHaveBeenLastCalledWith('working');
  expect(screen.getByRole('button', { name: 'Needs you, 1 agent' }).getAttribute('aria-pressed')).toBe('false');
  fireEvent.click(screen.getByRole('button', { name: 'Working, 4 agents' }));
  expect(changed).toHaveBeenLastCalledWith(null);
  expect(screen.getAllByRole('button').every((button) => button.getAttribute('aria-pressed') === 'false')).toBe(true);
});

test('pressed is the selected surface with a light line, never a filled chip', () => {
  const pressed = /button\.crewlet-status-legend__item\[aria-pressed='true'\] \{([^}]*)\}/.exec(SHEET)?.[1] ?? '';
  expect(pressed).toMatch(/background: var\(--color-surface-selected\);/);
  expect(pressed).toMatch(/color: var\(--color-brand-accent-ink\);/);
  expect(pressed).not.toMatch(/var\(--color-brand-accent\)/);
});

test('a status nothing holds stays drawn, in the quieter ink', () => {
  render(<Filter />);
  const idle = screen.getByRole('button', { name: 'Idle, 0 agents' });
  expect(idle.hasAttribute('data-empty')).toBe(true);
  expect(idle.querySelector('[aria-hidden="true"]')!.textContent?.trim()).toBe('Idle0');
  expect(SHEET).toMatch(
    /\.crewlet-status-legend__item\[data-empty\]:not\(\[aria-pressed='true'\]\) \{\s*color: var\(--color-text-tertiary\);/,
  );
});

test('without a filter it is a list, each status read in full', () => {
  render(<StatusLegend label="Statuses" items={ITEMS} />);
  const list = screen.getByRole('list', { name: 'Statuses' });
  expect(within(list).queryAllByRole('button')).toHaveLength(0);
  expect(
    within(list)
      .getAllByRole('listitem')
      .map((item) => item.querySelector('.crewlet-visually-hidden')?.textContent),
  ).toEqual(['Working, 4', 'Needs you, 1', 'Paused or stopped, 1', 'Idle, 0']);
});

test("in a canvas's end slot it stands on the bar across from the controls", () => {
  const { container } = render(
    <Canvas
      label="Org chart"
      content={{ x: 0, y: 0, width: 400, height: 300 }}
      controlsPlacement="top-right"
      overlayEnd={<Filter />}
    >
      <div />
    </Canvas>,
  );
  const legend = screen.getByRole('group', { name: 'Filter by status' });
  expect(legend.closest('.crewlet-canvas__bar')?.parentElement?.className).toContain('crewlet-canvas__controls--end');
  expect(legend.closest('.crewlet-canvas__controls--end')?.getAttribute('data-placement')).toBe('top-right');
  expect(container.querySelectorAll('.crewlet-canvas__controls--end')).toHaveLength(1);
});

test('it has no violation, filter or key', async () => {
  const { container } = render(
    <div>
      <Filter />
      <StatusLegend label="Statuses" items={ITEMS} />
    </div>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Working, 4 agents' }));
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
  });
  expect(result.violations.map((one) => one.id)).toEqual([]);
});

/* A count passing 9 moved every key after it, and a key beside it wrapped in a narrow canvas. */
test('a count keeps the room of two digits, in step', () => {
  expect(SHEET).toMatch(/\.crewlet-status-legend__count \{\s*min-width: 2ch;\s*font-variant-numeric: tabular-nums;/);
});
