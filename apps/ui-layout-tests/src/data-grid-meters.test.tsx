/**
 * A limit stack in a grid column keeps inside its cell: the column holds the
 * stack's floor, so a figure never runs into the next column's value.
 */
import { afterEach, expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { Card, DataGrid, LimitMeters, type DataGridColumn, type LimitWindow } from '@crewlethq/ui';

let root: Root | null = null;
let host: HTMLElement | null = null;

afterEach(() => {
  flushSync(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

interface Model {
  key: string;
  id: string;
  status: string;
  signIn: string;
  uses: string;
  last: string;
}

const ROWS: Model[] = [
  { key: 'subc-2', id: 'Claude Opus 5.5', status: 'Ready', signIn: 'subscription', uses: 'Ask Crewlet', last: '2 min ago' },
  { key: 'subsc-1', id: 'Claude Opus 5.5', status: 'Ready', signIn: 'subscription', uses: '3 seats', last: '5 min ago' },
];

const WINDOWS: LimitWindow[] = [
  { id: 'session', label: '5-hour', state: 'ok', used: 0.18, name: '5-hour limit, 18% used' },
  { id: 'weekly', label: 'Weekly', state: 'ok', used: 0.55, name: 'Weekly limit, 55% used' },
];

const COLUMNS: DataGridColumn<Model>[] = [
  { key: 'model', header: 'Model', floor: '12rem', cell: (m) => `${m.key} ${m.id}` },
  { key: 'status', header: 'Status', shrink: true, cell: (m) => m.status },
  {
    key: 'limits',
    header: 'Usage limits',
    floor: '11rem',
    cell: (m) => <LimitMeters label={`Usage limits of ${m.key}`} windows={WINDOWS} />,
  },
  { key: 'signin', header: 'Sign-in', shrink: true, cell: (m) => m.signIn },
  { key: 'uses', header: 'Used by', shrink: true, cell: (m) => m.uses },
  { key: 'last', header: 'Last answer', align: 'right', shrink: true, cell: (m) => m.last },
];

async function mount(width: number): Promise<HTMLElement> {
  await page.viewport(1440, 900);
  host = document.createElement('div');
  host.style.width = `${width}px`;
  document.body.append(host);
  root = createRoot(host);
  flushSync(() =>
    root!.render(
      <Card padding="none">
        <DataGrid aria-label="Models" rows={ROWS} columns={COLUMNS} rowKey={(m) => m.key} />
      </Card>,
    ),
  );
  await document.fonts.ready;
  for (let i = 0; i < 4; i++) await new Promise((resolve) => requestAnimationFrame(resolve));
  return host;
}

const box = (el: Element) => el.getBoundingClientRect();

test.each([974, 720])('at %ipx, every limit stack ends inside its cell and the next value starts after it', async (width) => {
  const at = await mount(width);
  for (const row of at.querySelectorAll('.crewlet-data-grid__body .crewlet-data-grid__row')) {
    const cells = [...row.querySelectorAll(':scope > .crewlet-data-grid__cell')];
    const limits = cells[2]!;
    const stack = limits.querySelector('.crewlet-limit-meters')!;
    expect(box(stack).right).toBeLessThanOrEqual(box(limits).right + 0.5);
    for (const figure of stack.querySelectorAll('.crewlet-limit-meters__figure')) {
      expect(box(figure).right).toBeLessThanOrEqual(box(cells[3]!).left + 0.5);
    }
  }
});

// Wide enough that the column's fifth-of-the-grid cap holds 12rem and its insets.
test('in a content-sized column, the stack still takes its 12rem width', async () => {
  await page.viewport(1440, 900);
  host = document.createElement('div');
  host.style.width = '1300px';
  document.body.append(host);
  root = createRoot(host);
  const columns: DataGridColumn<Model>[] = [
    { key: 'model', header: 'Model', floor: '12rem', cell: (m) => `${m.key} ${m.id}` },
    { key: 'limits', header: 'Usage limits', shrink: true, cell: (m) => <LimitMeters label={`Usage limits of ${m.key}`} windows={WINDOWS} /> },
  ];
  flushSync(() => root!.render(<DataGrid aria-label="Models" rows={ROWS} columns={columns} rowKey={(m) => m.key} />));
  await document.fonts.ready;
  for (let i = 0; i < 4; i++) await new Promise((resolve) => requestAnimationFrame(resolve));
  const stack = host.querySelector('.crewlet-data-grid__body .crewlet-limit-meters')!;
  expect(box(stack).width).toBeGreaterThanOrEqual(192 - 0.5);
});
