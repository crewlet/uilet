/**
 * An artifact's versions: which one is on show, which it is compared with,
 * and the controls that never rewrite history.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test, vi } from 'vitest';
import { VersionTimeline, type VersionItem } from './index.js';

afterEach(cleanup);

const NOW = Date.parse('2026-10-17T12:00:00Z');
const PM = { id: 'pm', kind: 'agent' as const, name: 'Product Manager', character: 'gemlet' as const, hue: 'rose' as const };
const MAYA = { id: 'maya', kind: 'person' as const, name: 'Maya Ortiz' };

const VERSIONS: VersionItem[] = [
  { version: 12, summary: 'Added totals row', author: PM, at: NOW - 4 * 60_000, source: 'ENG-412 turn 3' },
  { version: 11, author: PM, at: NOW - 2 * 3_600_000 },
  { version: 10, label: 'Review draft', author: MAYA, at: NOW - 86_400_000 },
  { version: 9, kind: 'schema', summary: 'Added column "Owner"', author: MAYA, at: NOW - 2 * 86_400_000 },
  { version: 8, kind: 'restore', restoredFrom: 5, author: MAYA, at: NOW - 3 * 86_400_000 },
];

function timeline(props: Partial<Parameters<typeof VersionTimeline>[0]> = {}) {
  const onSelect = vi.fn();
  const onCompare = vi.fn();
  const onRestore = vi.fn();
  render(
    <VersionTimeline versions={VERSIONS} selected={12} onSelect={onSelect} onCompare={onCompare} onRestore={onRestore} now={NOW} {...props} />,
  );
  return { onSelect, onCompare, onRestore };
}

test('is a named list of versions, newest first, with the one on show marked current', () => {
  timeline();
  const nav = screen.getByRole('navigation', { name: 'Versions' });
  const items = within(nav).getAllByRole('listitem');
  expect(items).toHaveLength(5);
  expect(items[0]?.textContent).toContain('Version 12');
  const current = within(nav).getByRole('button', { current: true });
  expect(current.textContent).toContain('Version 12');
  expect(current.textContent).toContain('Latest');
});

test('selecting a row shows that version, and restores nothing', () => {
  const { onSelect, onRestore } = timeline();
  fireEvent.click(screen.getByText('Version 10').closest('button') as HTMLElement);
  expect(onSelect).toHaveBeenCalledWith(10);
  expect(onRestore).not.toHaveBeenCalled();
});

test('the newest version offers no restore, every older one does', () => {
  const { onRestore } = timeline();
  expect(screen.queryByRole('button', { name: 'Restore version 12' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Restore version 11' }));
  expect(onRestore).toHaveBeenCalledWith(11);
});

test('compare is a toggle: pressed on the version compared with, absent on the one on show', () => {
  const { onCompare } = timeline({ against: 11 });
  expect(screen.queryByRole('button', { name: 'Compare with version 12' })).toBeNull();
  const pressed = screen.getByRole('button', { name: 'Compare with version 11' });
  expect(pressed.getAttribute('aria-pressed')).toBe('true');
  fireEvent.click(pressed);
  expect(onCompare).toHaveBeenCalledWith(null);
  fireEvent.click(screen.getByRole('button', { name: 'Compare with version 10' }));
  expect(onCompare).toHaveBeenLastCalledWith(10);
});

test('says what made each version: a label, a schema change, a restore', () => {
  timeline();
  expect(screen.getByText('Review draft')).toBeDefined();
  expect(screen.getByText('Schema changed')).toBeDefined();
  expect(screen.getByText('Restored version 5')).toBeDefined();
  expect(screen.getByText('ENG-412 turn 3')).toBeDefined();
});

test('a version past retention is an absence that says so', () => {
  timeline({ oldestKept: 5 });
  expect(screen.getByText('Versions 1 to 4 are past the retention window and are no longer kept.')).toBeDefined();
});

test('draws no control it was not given a handler for', () => {
  render(<VersionTimeline versions={VERSIONS} selected={12} onSelect={() => {}} now={NOW} />);
  expect(screen.queryByRole('button', { name: /^(Compare with|Restore version|Label version)/ })).toBeNull();
});

test('what made a version is meta beside its author, and the version number stands alone', () => {
  // "Published" was drawn at the body step under "Version 11", nearly its
  // match, so the kind read as a second title.
  timeline();
  const row = screen.getByRole('button', { name: /^Version 11/ });
  expect(within(row).queryByText('Published')).toBeNull();
  const kind = screen.getAllByText('Published')[0]!;
  expect(kind.className).toBe('crewlet-version-timeline__kind');
  expect(kind.closest('.crewlet-version-timeline__meta')).not.toBeNull();
});

test('the label action reads Label, as the dialog it opens does', () => {
  const onLabel = vi.fn();
  timeline({ onLabel });
  fireEvent.click(screen.getByRole('button', { name: 'Label version 11' }));
  expect(onLabel).toHaveBeenCalledWith(11);
  expect(screen.getAllByText('Label').length).toBeGreaterThan(0);
});

test('the version on show is a fill only, with no bar beside the rail', () => {
  const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'VersionTimeline.css'), 'utf8');
  const current = /\.crewlet-version-timeline__select\[aria-current='true'\]\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
  expect(current).toMatch(/background:/);
  expect(current).not.toMatch(/box-shadow/);
});

test('carries no axe violation', async () => {
  const { container } = render(
    <main>
      <h1>History</h1>
      <VersionTimeline versions={VERSIONS} selected={12} against={10} onSelect={() => {}} onCompare={() => {}} onRestore={() => {}} onLabel={() => {}} oldestKept={5} now={NOW} />
    </main>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations.map((violation) => violation.id)).toEqual([]);
});
