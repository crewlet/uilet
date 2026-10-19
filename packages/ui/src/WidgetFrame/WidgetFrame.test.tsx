/**
 * One figure on a dashboard: titled, citing its dataset and when it was true,
 * and drawing nothing of the figure where its reader may not read the data.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test, vi } from 'vitest';
import { WidgetFrame } from './index.js';

afterEach(cleanup);

const NOW = Date.parse('2026-10-18T12:00:00Z');

test('is a region named by its title that cites its dataset and when it was true', () => {
  render(
    <WidgetFrame
      title="Open tasks"
      source={{ label: 'My open work', status: 'ready', asOf: NOW - 2 * 60_000 }}
      now={NOW}
    >
      <p>12</p>
    </WidgetFrame>,
  );
  const region = screen.getByRole('region', { name: 'Open tasks' });
  expect(region.textContent).toContain('12');
  const cite = region.querySelector('footer')!;
  expect(cite.textContent).toContain('Source:');
  expect(cite.textContent).toContain('My open work');
  expect(cite.textContent).toContain('as of');
  expect(cite.querySelector('time')?.getAttribute('dateTime')).toBe('2026-10-18T11:58:00.000Z');
});

test('says live for a live source, with no time', () => {
  render(
    <WidgetFrame title="Signups" source={{ label: 'Signups', status: 'live' }} now={NOW}>
      <p>4</p>
    </WidgetFrame>,
  );
  const cite = screen.getByRole('region', { name: 'Signups' }).querySelector('footer')!;
  expect(cite.textContent).toContain('live');
  expect(cite.querySelector('time')).toBeNull();
});

test('a citation with onCite is a button that opens the source', () => {
  const onCite = vi.fn();
  render(
    <WidgetFrame
      title="Spend"
      source={{ label: 'Spend by seat', status: 'ready', asOf: NOW }}
      onCite={onCite}
      now={NOW}
    >
      <p>$4</p>
    </WidgetFrame>,
  );
  const button = screen.getByRole('button', { name: 'Source: Spend by seat as of just now' });
  fireEvent.click(button);
  expect(onCite).toHaveBeenCalledOnce();
});

test('a refused figure draws the reason and never the figure, however the host passed it', () => {
  render(
    <WidgetFrame
      title="Open tasks"
      source={{
        label: 'My open work',
        status: 'refused',
        asOf: NOW,
        detail: 'Reading the tracker needs the tracker permission.',
      }}
      now={NOW}
    >
      <p>secret rows</p>
    </WidgetFrame>,
  );
  const region = screen.getByRole('region', { name: 'Open tasks' });
  expect(region.textContent).toContain('Reading the tracker needs the tracker permission.');
  expect(region.textContent).not.toContain('secret rows');
  // A refusal says nothing about when the data was true: there is none here.
  expect(region.querySelector('time')).toBeNull();
});

test('a failure without a detail says so in the default words', () => {
  render(
    <WidgetFrame title="Agents" source={{ label: 'Agent status', status: 'failed' }}>
      <p>rows</p>
    </WidgetFrame>,
  );
  expect(screen.getByRole('region', { name: 'Agents' }).textContent).toContain('This figure could not be loaded.');
});

test('loading is busy and draws a placeholder, and stale is marked in words', () => {
  const { rerender } = render(
    <WidgetFrame title="Spend" source={{ label: 'Spend', status: 'loading' }}>
      <p>$4</p>
    </WidgetFrame>,
  );
  const region = screen.getByRole('region', { name: 'Spend' });
  expect(region.getAttribute('aria-busy')).toBe('true');
  expect(region.textContent).not.toContain('$4');
  rerender(
    <WidgetFrame title="Spend" source={{ label: 'Spend', status: 'stale', asOf: NOW - 3_600_000 }} now={NOW}>
      <p>$4</p>
    </WidgetFrame>,
  );
  expect(region.getAttribute('aria-busy')).toBeNull();
  expect(region.querySelector('footer')!.textContent).toContain('stale');
  expect(region.textContent).toContain('$4');
});

test('carries no axe violation', async () => {
  const { container } = render(
    <main>
      <h1>Delivery</h1>
      <h2>Board</h2>
      <WidgetFrame
        title="Open tasks"
        source={{ label: 'My open work', status: 'ready', asOf: NOW }}
        onCite={() => undefined}
        now={NOW}
      >
        <p>12</p>
      </WidgetFrame>
      <WidgetFrame title="Spend" source={{ label: 'Spend', status: 'refused' }}>
        <p>$4</p>
      </WidgetFrame>
    </main>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations.map((violation) => violation.id)).toEqual([]);
});

const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'WidgetFrame.css'), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  '',
);
const rule = (selector: string) =>
  new RegExp(`(?:^|\\})\\s*${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? '';

test('stands on the card recipe: its ground, and one inset on every part', () => {
  const root = rule('.crewlet-widget-frame');
  expect(root).toMatch(/background:\s*var\(--color-surface-subtle\)/);
  expect(root).toMatch(/padding-block:\s*var\(--spacing-4\)/);
  expect(root).not.toMatch(/padding:/);
  expect(rule('.crewlet-widget-frame__head,\n.crewlet-widget-frame__body,\n.crewlet-widget-frame__cite')).toMatch(
    /padding-inline:\s*var\(--spacing-4\)/,
  );
});

test('a flush frame lets its figure reach the sides, and a table take the inset', () => {
  const { container } = render(
    <WidgetFrame title="Latest deploys" flush source={{ label: 'Deploys', status: 'live' }}>
      <table />
    </WidgetFrame>,
  );
  expect(container.querySelector('section')!.classList.contains('crewlet-widget-frame--flush')).toBe(true);
  expect(rule('.crewlet-widget-frame--flush .crewlet-widget-frame__body')).toMatch(/padding-inline:\s*0/);
  expect(rule('.crewlet-widget-frame--flush .crewlet-data-table--compact')).toMatch(
    /--crewlet-data-table-cell-pad-x:\s*var\(--spacing-4\)/,
  );
  cleanup();
  const { container: plain } = render(
    <WidgetFrame title="Open" source={{ label: 'Open', status: 'live' }}>
      <p>2</p>
    </WidgetFrame>,
  );
  expect(plain.querySelector('section')!.classList.contains('crewlet-widget-frame--flush')).toBe(false);
});

test('a flush stat tile as the figure brings no inset of its own', () => {
  expect(rule('.crewlet-widget-frame__body .crewlet-statcard--flush')).toMatch(/padding:\s*0/);
});

test('the title takes a second line before it gives up a word', () => {
  const title = rule('.crewlet-widget-frame__title');
  expect(title).toMatch(/-webkit-line-clamp:\s*2/);
  expect(title).not.toMatch(/white-space:\s*nowrap/);
});

test('the citation is one line, the time kept whole beside a title that ends', () => {
  expect(rule('.crewlet-widget-frame__cite-text,\n.crewlet-widget-frame__cite-button')).toMatch(/flex-wrap:\s*nowrap/);
  expect(rule('.crewlet-widget-frame__source')).toMatch(/text-overflow:\s*ellipsis/);
  expect(rule('.crewlet-widget-frame__when')).toMatch(/flex:\s*none/);
});

test('a narrow frame stacks its citation, with no separator to begin a line', () => {
  expect(rule('.crewlet-widget-frame')).toMatch(/container:\s*crewlet-widget-frame\s*\/\s*inline-size/);
  const narrow = /@container crewlet-widget-frame \(width < 18rem\)\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
  expect(narrow).toMatch(/flex-direction:\s*column/);
  expect(narrow).toMatch(/\.crewlet-widget-frame__when::before\s*\{\s*content:\s*none/);
});
