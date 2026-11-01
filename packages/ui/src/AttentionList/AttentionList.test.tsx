/**
 * What needs a person: problems first, the tone said in words, Details opening
 * under its row, many rows folding to a summary, and a frame that takes no
 * tone of its own.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test } from 'vitest';
import { AttentionList, type AttentionItem } from './index.js';

afterEach(cleanup);

const sheet = () =>
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'AttentionList.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const rule = (css: string, selector: string) =>
  new RegExp(`(?:^|\\n)${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\{([^}]*)\\}`).exec(css)?.[1] ?? '';

const ITEMS: AttentionItem[] = [
  { key: 'a', tone: 'warning', title: 'Three tools changed', meta: 'Review them', details: 'create_pull_request: description' },
  { key: 'b', tone: 'danger', title: 'GitHub is not running for SRE', action: <button type="button">Approve</button> },
  { key: 'c', tone: 'info', title: 'Linear needs a sign-in' },
];

test('problems come first, then warnings, then notes, each tone said in words', () => {
  render(<AttentionList items={ITEMS} />);
  const rows = screen.getAllByRole('listitem');
  expect(rows[0]?.textContent).toContain('Problem: GitHub is not running for SRE');
  expect(rows[1]?.textContent).toContain('Warning: Three tools changed');
  expect(rows[2]?.textContent).toContain('Note: Linear needs a sign-in');
  // Said, not shown: the glyph already shows it.
  expect(screen.getByText('Problem:', { exact: false }).classList.contains('crewlet-visually-hidden')).toBe(true);
  expect(screen.getByRole('heading', { name: 'Needs attention' })).toBeTruthy();
  expect(screen.getByText('1 problem, 1 warning, 1 note')).toBeTruthy();
});

test('the panel is a card like its neighbours: no frame, strip or ground takes the worst tone', () => {
  render(<AttentionList items={ITEMS} />);
  const panel = screen.getByRole('region', { name: 'Needs attention' });
  expect(panel.classList.contains('crewlet-card')).toBe(true);
  for (const tone of ['danger', 'warning', 'info']) {
    expect(panel.classList.contains(`is-${tone}`)).toBe(false);
  }
});

test('the header counts each tone with its glyph, in tone order, skipping a tone with none', () => {
  const items: AttentionItem[] = [
    { key: 'a', tone: 'warning', title: 'One' },
    { key: 'b', tone: 'warning', title: 'Two' },
    { key: 'c', tone: 'danger', title: 'Three' },
  ];
  const { container } = render(<AttentionList items={items} />);
  const counts = [...container.querySelectorAll('.crewlet-attention-list__count')];
  expect(counts.map((c) => [c.classList.contains('is-danger') ? 'danger' : 'warning', c.textContent])).toEqual([
    ['danger', '1'],
    ['warning', '2'],
  ]);
  expect(counts.every((c) => c.querySelector('svg') !== null)).toBe(true);
  expect(screen.getByText('1 problem, 2 warnings')).toBeTruthy();
});

test('Details opens under its row and says whether it is open', () => {
  render(<AttentionList items={ITEMS} />);
  const details = screen.getByRole('button', { name: 'Details' });
  expect(details.getAttribute('aria-expanded')).toBe('false');
  expect(screen.queryByText('create_pull_request: description')).toBeNull();
  fireEvent.click(details);
  expect(details.getAttribute('aria-expanded')).toBe('true');
  expect(screen.getByText('create_pull_request: description')).toBeTruthy();
});

test('Details names the body it opens by the row\'s position, whatever its key holds', () => {
  render(<AttentionList items={[{ key: 'tools changed', tone: 'warning', title: 'One', details: 'The body' }]} />);
  const details = screen.getByRole('button', { name: 'Details' });
  // Nothing to name while the body is closed.
  expect(details.getAttribute('aria-controls')).toBeNull();
  fireEvent.click(details);
  const controls = details.getAttribute('aria-controls') ?? '';
  expect(controls).not.toMatch(/\s/);
  expect(document.getElementById(controls)?.textContent).toBe('The body');
});

test('labels and the heading level are the caller\'s to set', () => {
  render(
    <AttentionList
      items={ITEMS}
      headingLevel={2}
      labels={{ title: 'À traiter', tones: { danger: 'Problème' }, summary: () => 'trois éléments' }}
    />,
  );
  expect(screen.getByRole('heading', { level: 2, name: 'À traiter' })).toBeTruthy();
  expect(screen.getAllByRole('listitem')[0]?.textContent).toContain('Problème: GitHub is not running for SRE');
  // A tone left out keeps its default word.
  expect(screen.getAllByRole('listitem')[1]?.textContent).toContain('Warning: Three tools changed');
  expect(screen.getByText('trois éléments')).toBeTruthy();
});

test('past the first few rows the rest fold behind Show more', () => {
  const many: AttentionItem[] = Array.from({ length: 6 }, (_, i) => ({ key: `k${i}`, tone: 'warning', title: `Row ${i}` }));
  render(<AttentionList items={many} collapseAfter={3} />);
  expect(screen.getAllByRole('listitem')).toHaveLength(3);
  fireEvent.click(screen.getByRole('button', { name: 'Show 3 more' }));
  expect(screen.getAllByRole('listitem')).toHaveLength(6);
  expect(screen.getByRole('button', { name: 'Show fewer' })).toBeTruthy();
});

test('one row past the limit is shown rather than folded behind a button', () => {
  const four: AttentionItem[] = Array.from({ length: 4 }, (_, i) => ({ key: `k${i}`, tone: 'warning', title: `Row ${i}` }));
  render(<AttentionList items={four} collapseAfter={3} />);
  expect(screen.getAllByRole('listitem')).toHaveLength(4);
  expect(screen.queryByRole('button', { name: /more/ })).toBeNull();
});

test('every row stands on the list\'s own columns, so each Details and each fix line up down the panel', () => {
  const css = sheet();
  expect(rule(css, '.crewlet-attention-list__rows')).toMatch(
    /grid-template-columns: \[glyph\] auto \[text\] minmax\(0, 1fr\) \[details\] auto \[action\] auto \[end\]/,
  );
  for (const part of ['item', 'row']) {
    expect(rule(css, `.crewlet-attention-list__${part}`)).toMatch(/grid-template-columns: subgrid/);
  }
  expect(rule(css, '.crewlet-attention-list__details')).toMatch(/grid-column: details/);
  expect(rule(css, '.crewlet-attention-list__action')).toMatch(/grid-column: action;[^]*justify-self: end/);
  // No row draws its own step: the height and the inset are tokens.
  expect(css).not.toMatch(/\b(16|28|52)px\b/);
});

test('the mark takes a column only where a row has one, read off every row, folded or not', () => {
  const plain: AttentionItem[] = [{ key: 'a', tone: 'warning', title: 'One' }];
  const { container, rerender } = render(<AttentionList items={plain} />);
  expect(container.querySelector('.crewlet-attention-list__rows--media')).toBeNull();
  const marked: AttentionItem[] = [
    ...Array.from({ length: 4 }, (_, i) => ({ key: `k${i}`, tone: 'warning' as const, title: `Row ${i}` })),
    { key: 'm', tone: 'info', title: 'Folded, with a mark', media: <svg /> },
  ];
  rerender(<AttentionList items={marked} collapseAfter={3} />);
  expect(container.querySelector('.crewlet-attention-list__media')).toBeNull();
  expect(container.querySelector('.crewlet-attention-list__rows--media')).not.toBeNull();
});

test('the glyph stands on the title\'s line and the body opens on the title\'s column', () => {
  const css = sheet();
  const glyph = rule(css, '.crewlet-attention-list__glyph');
  expect(glyph).toMatch(/align-self: start/);
  expect(glyph).toMatch(/block-size: var\(--crewlet-attention-list-line\)/);
  expect(rule(css, '.crewlet-attention-list__line')).toMatch(/line-height: var\(--font-line-height-normal\)/);
  expect(rule(css, '.crewlet-attention-list__body')).toMatch(/grid-column: text \/ end/);
});

test('Details and the fold are the kit\'s small ghost button, the step of the fix beside them', () => {
  const many: AttentionItem[] = Array.from({ length: 5 }, (_, i) => ({ key: `k${i}`, tone: 'warning', title: `Row ${i}`, details: 'more' }));
  render(<AttentionList items={many} collapseAfter={3} />);
  const controls = [...screen.getAllByRole('button', { name: 'Details' }), screen.getByRole('button', { name: 'Show 2 more' })];
  for (const control of controls) {
    expect(control.classList.contains('crewlet-btn--ghost')).toBe(true);
    expect(control.classList.contains('crewlet-btn--small')).toBe(true);
    expect(control.classList.contains('crewlet-btn--flush')).toBe(true);
  }
});

test('draws nothing when nothing needs attention', () => {
  const { container } = render(<AttentionList items={[]} />);
  expect(container.innerHTML).toBe('');
});

test('has no accessibility violations', async () => {
  const { container } = render(<AttentionList items={ITEMS} />);
  const result = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
  expect(result.violations).toEqual([]);
});
