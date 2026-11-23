/**
 * A grid row offers the pointer only where a click on it does something: a
 * row with a link or an action under it, never a row that only reads.
 */
import { afterEach, expect, test } from 'vitest';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import type { ReactNode } from 'react';
import { DataGrid, SettingsTable } from '@crewlethq/ui';

let root: Root | null = null;
let host: HTMLElement | null = null;

afterEach(() => {
  flushSync(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

async function mount(ui: ReactNode): Promise<HTMLElement> {
  host = document.createElement('div');
  host.style.width = '720px';
  document.body.append(host);
  root = createRoot(host);
  flushSync(() => root!.render(ui));
  await document.fonts.ready;
  for (let i = 0; i < 3; i++) await new Promise((resolve) => requestAnimationFrame(resolve));
  return host;
}

/** The cursor drawn over the middle of a row's second cell, where its words are. */
function cursorOver(row: Element): string {
  const cell = row.querySelectorAll('[role="cell"], [role="gridcell"], .crewlet-data-grid__cell')[1]!;
  const r = cell.getBoundingClientRect();
  return getComputedStyle(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)!).cursor;
}

const rows = [{ id: 'web-1' }, { id: 'web-2' }];
const columns = [
  { key: 'name', header: 'Server', cell: (r: { id: string }) => r.id },
  { key: 'kind', header: 'Connection', cell: () => 'Remote' },
];

test('a row that only reads keeps the arrow, under its words and its edges', async () => {
  const el = await mount(<DataGrid aria-label="Servers" rows={rows} rowKey={(r) => r.id} columns={columns} />);
  const row = el.querySelector('.crewlet-data-grid__body .crewlet-data-grid__row')!;
  expect(getComputedStyle(row).cursor).toBe('auto');
  expect(cursorOver(row)).not.toBe('pointer');
});

test('a row that links or acts takes the pointer across it', async () => {
  for (const props of [{ rowHref: (r: { id: string }) => `#${r.id}` }, { onRowActivate: () => {} }]) {
    const el = await mount(<DataGrid aria-label="Servers" rows={rows} rowKey={(r) => r.id} columns={columns} {...props} />);
    expect(cursorOver(el.querySelector('.crewlet-data-grid__body .crewlet-data-grid__row')!)).toBe('pointer');
    flushSync(() => root?.unmount());
    host?.remove();
  }
  root = null;
  host = null;
});

test('a settings table row, which only lays out a setting, keeps the arrow', async () => {
  const el = await mount(
    <SettingsTable aria-label="Limits">
      <SettingsTable.Row label="Daily spend" settingKey="limits.daily_spend">
        <span>$40</span>
      </SettingsTable.Row>
    </SettingsTable>,
  );
  expect(getComputedStyle(el.querySelector('.crewlet-data-grid__row')!).cursor).toBe('auto');
});
