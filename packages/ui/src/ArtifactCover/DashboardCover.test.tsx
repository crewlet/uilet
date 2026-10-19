/**
 * A dashboard's gallery cover: the reader's own headline figures or none,
 * never a placeholder number, else the board's shape, else the kind's glyph.
 */

import { cleanup, render } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test } from 'vitest';
import { ArtifactCard } from '../ArtifactCard/index.js';
import { installSheets } from '../../../../apps/ui-tests/src/cascade.js';
import { DashboardCover } from './index.js';

afterEach(cleanup);

test('draws at most three stats, each value where the gallery holds it', () => {
  const { container } = render(
    <DashboardCover
      stats={[
        { label: 'Open tasks', value: '12' },
        { label: 'Spend today', value: '$4.20' },
        { label: 'Agents working', value: '3' },
        { label: 'Fourth', value: '9' },
      ]}
    />,
  );
  const stats = container.querySelectorAll('.crewlet-dashboard-cover__stat');
  expect(stats).toHaveLength(3);
  expect(container.textContent).toContain('Open tasks12');
  expect(container.textContent).not.toContain('Fourth');
});

test('the stats are rows, so each label has the card width rather than a third of it', () => {
  // Three tiles side by side cut every label to its first word: "Open w...".
  const uninstall = installSheets('ArtifactCover/DashboardCover.css');
  try {
    const { container } = render(
      <DashboardCover stats={[{ label: 'Open work items', source: 'Open work' }, { label: 'Tokens, last 7 days', source: 'Token spend' }]} />,
    );
    const frame = getComputedStyle(container.querySelector('.crewlet-dashboard-cover--stats')!);
    expect(frame.gridAutoFlow).not.toBe('column');
    const stat = getComputedStyle(container.querySelector('.crewlet-dashboard-cover__stat')!);
    expect(stat.flexDirection).toBe('row');
  } finally {
    uninstall();
  }
});

test('a stat with no value draws its source, never a number', () => {
  const { container } = render(<DashboardCover stats={[{ label: 'Open tasks', source: 'My open work' }]} />);
  expect(container.textContent).toBe('Open tasksMy open work');
  expect(container.querySelector('.crewlet-dashboard-cover__value')).toBeNull();
});

test('without stats it draws the board schematic on twelve columns, widths held to the grid', () => {
  const { container } = render(
    <DashboardCover
      layout={[
        { w: 4, kind: 'stat' },
        { w: 8, kind: 'chart' },
        { w: 40, kind: 'table' },
        { w: 0, kind: 'note' },
      ]}
    />,
  );
  const blocks = [...container.querySelectorAll<HTMLElement>('.crewlet-dashboard-cover__block')];
  expect(blocks.map((block) => block.style.gridColumn)).toEqual(['span 4', 'span 8', 'span 12', 'span 1']);
  expect(blocks[1]!.classList.contains('crewlet-dashboard-cover__block--chart')).toBe(true);
});

test('with neither it draws the kind glyph', () => {
  const { container } = render(<DashboardCover />);
  expect(container.querySelector('svg')).not.toBeNull();
  expect(container.firstElementChild?.classList.contains('crewlet-dashboard-cover--empty')).toBe(true);
});

test('as a card preview it is hidden from assistive technology and carries no axe violation', async () => {
  const { container } = render(
    <main>
      <h1>Gallery</h1>
      <ArtifactCard
        title="Delivery"
        href="/artifacts/a1"
        kind="dashboard"
        updatedAt={Date.parse('2026-10-18T11:00:00Z')}
        now={Date.parse('2026-10-18T12:00:00Z')}
        preview={<DashboardCover stats={[{ label: 'Open tasks', value: '12' }]} />}
      />
    </main>,
  );
  expect(container.querySelector('.crewlet-dashboard-cover')?.closest('[aria-hidden]')).not.toBeNull();
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations.map((violation) => violation.id)).toEqual([]);
});
