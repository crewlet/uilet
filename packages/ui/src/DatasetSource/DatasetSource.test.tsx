/**
 * One entry of a Sources rail: what a dataset reads, where its rows stand,
 * and, when selected, the host's rows preview drawn beside the toggle rather
 * than inside it.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test, vi } from 'vitest';
import { installSheets, px } from '../../../../apps/ui-tests/src/cascade.js';
import { DatasetSource, DatasetSourceList } from './index.js';

afterEach(cleanup);

const NOW = Date.parse('2026-10-18T12:00:00Z');

test('names the dataset, its source kind, its definition, its rows and its refresh', () => {
  render(
    <DatasetSource
      title="My open work"
      kind="engine"
      definition="tracker.items, scope mine"
      refresh="Every 2 min"
      status="ready"
      asOf={NOW - 2 * 60_000}
      rows={12}
      now={NOW}
    />,
  );
  const text = document.body.textContent ?? '';
  expect(text).toContain('My open work');
  expect(text).toContain('Engine');
  expect(text).toContain('tracker.items, scope mine');
  expect(text).toContain('12 rows');
  expect(text).toContain('Every 2 min');
  expect(document.querySelector('time')?.getAttribute('dateTime')).toBe('2026-10-18T11:58:00.000Z');
});

test('how it is kept current is a line of its own, never wrapped under the facts', () => {
  render(
    <DatasetSource
      title="My open work"
      kind="engine"
      definition="tracker.items"
      refresh="When the board opens or is refreshed"
      status="ready"
      asOf={NOW}
      rows={2}
      now={NOW}
    />,
  );
  const refresh = document.querySelector('.crewlet-dataset-source__refresh')!;
  expect(refresh.textContent).toContain('When the board opens or is refreshed');
  expect(refresh.closest('.crewlet-dataset-source__meta')).toBeNull();
  expect(document.querySelector('.crewlet-dataset-source__meta')!.textContent).toContain('2 rows');
});

test('one row is a row, and a large count is grouped', () => {
  const { rerender } = render(<DatasetSource title="A" kind="file" definition="data.csv" status="ready" rows={1} />);
  expect(document.body.textContent).toContain('1 row');
  expect(document.body.textContent).not.toContain('1 rows');
  rerender(<DatasetSource title="A" kind="file" definition="data.csv" status="ready" rows={4200} />);
  expect(document.body.textContent).toContain('4,200 rows');
});

test('with onSelect it is a toggle named in words, and the preview sits outside the button', () => {
  const onSelect = vi.fn();
  const { rerender } = render(
    <DatasetSource title="Spend" kind="store" definition="spend" status="live" rows={3} onSelect={onSelect}>
      <table>
        <tbody>
          <tr>
            <td>preview</td>
          </tr>
        </tbody>
      </table>
    </DatasetSource>,
  );
  const button = screen.getByRole('button', { name: /^Spend Datastore spend Live 3 rows/ });
  expect(button.getAttribute('aria-pressed')).toBe('false');
  expect(document.body.textContent).not.toContain('preview');
  fireEvent.click(button);
  expect(onSelect).toHaveBeenCalledOnce();
  rerender(
    <DatasetSource title="Spend" kind="store" definition="spend" status="live" rows={3} onSelect={onSelect} selected>
      <table>
        <tbody>
          <tr>
            <td>preview</td>
          </tr>
        </tbody>
      </table>
    </DatasetSource>,
  );
  expect(button.getAttribute('aria-pressed')).toBe('true');
  const preview = screen.getByRole('group', { name: 'Spend' });
  expect(preview.textContent).toBe('preview');
  expect(button.contains(preview)).toBe(false);
});

test('an open entry frames its summary and its preview as one card', () => {
  const uninstall = installSheets('DatasetSource/DatasetSource.css');
  const preview = <p>figures</p>;
  const { container, rerender } = render(
    <DatasetSource title="Spend" kind="store" definition="spend" status="live" onSelect={() => {}} selected>
      {preview}
    </DatasetSource>,
  );
  const entry = container.querySelector<HTMLElement>('.crewlet-dataset-source')!;
  const summary = entry.querySelector<HTMLElement>('.crewlet-dataset-source__summary')!;
  // The frame holds both, its one edge drawn by the entry. The head sits
  // inside it rather than over it, so its fill never paints that edge out, and
  // the two boundaries draw as one line rather than a doubled one.
  expect(entry.contains(screen.getByRole('group', { name: 'Spend' }))).toBe(true);
  expect(entry.classList.contains('crewlet-dataset-source--open')).toBe(true);
  expect(getComputedStyle(entry).borderTopStyle).toBe('solid');
  expect(px(entry, 'border-top-width')).toBe(1);
  expect(px(summary, 'margin-top')).toBe(0);
  expect(px(summary, 'margin-left')).toBe(0);
  expect(getComputedStyle(summary).borderBottomLeftRadius).toBe('0');
  // Selected with nothing to preview, or closed, it is not opened into a card,
  // and its frame keeps the width it has open, so nothing moves as it opens.
  rerender(<DatasetSource title="Spend" kind="store" definition="spend" status="live" onSelect={() => {}} selected />);
  expect(entry.classList.contains('crewlet-dataset-source--open')).toBe(false);
  expect(px(entry, 'border-top-width')).toBe(1);
  rerender(
    <DatasetSource title="Spend" kind="store" definition="spend" status="live" onSelect={() => {}}>
      {preview}
    </DatasetSource>,
  );
  expect(entry.classList.contains('crewlet-dataset-source--open')).toBe(false);
  expect(screen.queryByRole('group', { name: 'Spend' })).toBeNull();
  expect(px(entry, 'border-top-width')).toBe(1);
  uninstall();
});

test('a refusal says why and counts no rows, and a failure falls back to the default words', () => {
  const { rerender } = render(
    <DatasetSource
      title="Open work"
      kind="engine"
      definition="tracker.items"
      status="refused"
      detail="Reading the tracker needs the tracker permission."
      rows={5}
      asOf={NOW}
    />,
  );
  expect(document.body.textContent).toContain('Reading the tracker needs the tracker permission.');
  expect(document.body.textContent).not.toContain('5 rows');
  expect(document.querySelector('time')).toBeNull();
  rerender(<DatasetSource title="Open work" kind="engine" definition="tracker.items" status="failed" />);
  expect(document.body.textContent).toContain('This dataset could not be loaded.');
});

test('stale is marked in words, and loading is busy', () => {
  const { container, rerender } = render(
    <DatasetSource
      title="Spend"
      kind="engine"
      definition="spend.daily"
      status="stale"
      asOf={NOW - 3_600_000}
      now={NOW}
    />,
  );
  expect(container.textContent).toContain('stale');
  rerender(<DatasetSource title="Spend" kind="engine" definition="spend.daily" status="loading" rows={4} />);
  expect(container.firstElementChild?.getAttribute('aria-busy')).toBe('true');
  expect(container.textContent).toContain('Loading');
  expect(container.textContent).not.toContain('4 rows');
});

test('labels rename the source kinds', () => {
  render(
    <DatasetSource title="T" kind="calc" definition="sum" status="ready" labels={{ kinds: { calc: 'Derived' } }} />,
  );
  expect(document.body.textContent).toContain('Derived');
});

test('a list is a named list of items and carries no axe violation', async () => {
  const { container } = render(
    <main>
      <h1>Board</h1>
      <DatasetSourceList label="Sources">
        <DatasetSource
          title="A"
          kind="store"
          definition="tasks"
          status="live"
          rows={2}
          onSelect={() => undefined}
          selected
        >
          <p>rows</p>
        </DatasetSource>
        <DatasetSource title="B" kind="engine" definition="agents.status" status="refused" />
      </DatasetSourceList>
    </main>,
  );
  const list = screen.getByRole('list', { name: 'Sources' });
  expect(list.querySelectorAll(':scope > li')).toHaveLength(2);
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations.map((violation) => violation.id)).toEqual([]);
});
