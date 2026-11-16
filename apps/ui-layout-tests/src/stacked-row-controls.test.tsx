/**
 * On a phone a row's card carries its expander and its own actions on its
 * first line side by side, never one over the other.
 */
import { afterEach, expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { Button, DataGrid, type DataGridColumn } from '@crewlethq/ui';

let root: Root | null = null;
let host: HTMLElement | null = null;

afterEach(() => {
  flushSync(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

interface Node {
  id: string;
  position: string;
}

const ROWS: Node[] = [{ id: 'node-1', position: '13 logs, caught up' }];
const COLUMNS: DataGridColumn<Node>[] = [
  { key: 'node', header: 'Node', cell: (n) => n.id },
  { key: 'position', header: 'Position', cell: (n) => n.position },
  { key: 'gate', header: '', action: true, shrink: true, cell: () => <Button size="small" variant="ghost">Evict…</Button> },
];

async function mount(expandable: boolean): Promise<HTMLElement> {
  await page.viewport(390, 844);
  host = document.createElement('div');
  host.style.width = '358px';
  document.body.append(host);
  root = createRoot(host);
  flushSync(() =>
    root!.render(
      <DataGrid
        aria-label="Nodes"
        rows={ROWS}
        columns={COLUMNS}
        rowKey={(n) => n.id}
        expansion={
          expandable
            ? { isExpanded: () => false, onToggle: () => {}, label: () => 'Show positions', render: () => null }
            : undefined
        }
      />,
    ),
  );
  await document.fonts.ready;
  for (let i = 0; i < 4; i++) await new Promise((resolve) => requestAnimationFrame(resolve));
  return host;
}

const box = (el: Element) => el.getBoundingClientRect();
const evict = (at: HTMLElement) => [...at.querySelectorAll('button')].find((b) => b.textContent === 'Evict…')!;

test('a stacked row with an expander and an action draws both on its first line, apart', async () => {
  const at = await mount(true);
  expect(at.querySelector('.crewlet-data-grid')!.hasAttribute('data-stacked')).toBe(true);
  const expander = box(at.querySelector('.crewlet-data-grid__expander button')!);
  const action = box(evict(at));
  expect(expander.right <= action.left || action.right <= expander.left).toBe(true);
  expect(Math.abs(expander.top + expander.height / 2 - (action.top + action.height / 2))).toBeLessThan(4);
});

test('a stacked row with only an action keeps it at the end of its first line', async () => {
  const at = await mount(false);
  const row = box(at.querySelector('.crewlet-data-grid__body .crewlet-data-grid__row')!);
  const action = box(evict(at));
  expect(row.right - action.right).toBeLessThan(24);
});
