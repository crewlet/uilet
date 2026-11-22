/**
 * A two-line cell's lines are cut to their column on a desktop and wrap whole
 * in a phone's card rows, labelled or compact, as the grid's own cut values do.
 */
import { afterEach, expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { Button, DataGrid, TableTwoLineCell } from '@crewlethq/ui';

let root: Root | null = null;
let host: HTMLElement | null = null;

afterEach(() => {
  flushSync(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

const PURPOSE =
  'Plan, design, build, test and ship the control plane across the backend, the web console and the mobile apps';

async function mount(viewport: number, width: number, phoneRows?: 'compact', lead: 'key' | 'mark' = 'key') {
  await page.viewport(viewport, 900);
  host = document.createElement('div');
  host.style.width = `${width}px`;
  document.body.append(host);
  root = createRoot(host);
  flushSync(() =>
    root!.render(
      <DataGrid
        aria-label="Projects"
        phoneRows={phoneRows}
        rows={[{ key: 'ENG' }]}
        rowKey={(r) => r.key}
        columns={[
          ...(lead === 'key' ? [{ key: 'key', header: 'Key', shrink: true, phoneLead: true, cell: (r: { key: string }) => r.key }] : []),
          {
            key: 'name',
            header: 'Project',
            floor: '10rem',
            phoneLead: true,
            cell: () =>
              lead === 'mark' ? (
                <TableTwoLineCell value="Core" detail={PURPOSE} mark={<svg width="24" height="24" role="img" aria-label="Vendor" />} />
              ) : (
                <TableTwoLineCell value="Core" detail={PURPOSE} />
              ),
          },
          { key: 'todo', header: 'To do', align: 'right', shrink: true, cell: () => '5' },
          ...(lead === 'mark'
            ? [{ key: 'open', header: '', action: true, cell: () => <Button size="small" variant="ghost">Open</Button> }]
            : []),
        ]}
      />,
    ),
  );
  await document.fonts.ready;
  for (let i = 0; i < 4; i++) await new Promise((resolve) => requestAnimationFrame(resolve));
  const detail = host.querySelector<HTMLElement>('.crewlet-table-cell__lines > :nth-child(2)')!;
  const line = Number.parseFloat(getComputedStyle(detail).lineHeight);
  return { detail, line, stacked: host.querySelector('.crewlet-data-grid[data-stacked]') !== null };
}

test("a desktop column cuts the detail to one line", async () => {
  const { detail, line, stacked } = await mount(1440, 560);
  expect(stacked).toBe(false);
  expect(detail.scrollWidth).toBeGreaterThan(detail.clientWidth);
  expect(detail.getBoundingClientRect().height).toBeLessThan(line * 1.5);
});

test.each([
  ['labelled', undefined],
  ['compact', 'compact' as const],
])("a phone's %s card row shows the whole detail, wrapped", async (_, phoneRows) => {
  const { detail, line, stacked } = await mount(390, 342, phoneRows);
  expect(stacked).toBe(true);
  expect(detail.scrollWidth).toBeLessThanOrEqual(detail.clientWidth);
  expect(detail.getBoundingClientRect().height).toBeGreaterThan(line * 1.5);
});

// A wrapped detail grows the first line's cell; the row's action and the
// cell's mark stay beside its value rather than centring on the wrapped lines.
test("a phone's card row keeps its action and the cell's mark beside the value", async () => {
  await mount(390, 342, undefined, 'mark');
  const value = host!.querySelector('.crewlet-table-cell__lines > :first-child')!.getBoundingClientRect();
  const mark = host!.querySelector('.crewlet-table-cell__two-line > svg')!.getBoundingClientRect();
  const action = host!.querySelector('.crewlet-data-grid__cell--action button')!.getBoundingClientRect();
  expect(Math.abs(mark.top - value.top)).toBeLessThanOrEqual(2);
  const middle = (r: DOMRect) => (r.top + r.bottom) / 2;
  expect(Math.abs(middle(action) - middle(value))).toBeLessThanOrEqual(6);
});

test("a phone's card row with no two-line cell keeps its action centred on a tall first line", async () => {
  await page.viewport(390, 900);
  host = document.createElement('div');
  host.style.width = '342px';
  document.body.append(host);
  root = createRoot(host);
  flushSync(() =>
    root!.render(
      <DataGrid
        aria-label="People"
        rows={[{ id: 'ada' }]}
        rowKey={(r) => r.id}
        columns={[
          { key: 'who', header: 'Who', cell: () => <span className="face" style={{ display: 'inline-block', height: 40, width: 40 }} /> },
          { key: 'team', header: 'Team', cell: () => 'Core' },
          { key: 'open', header: '', action: true, cell: () => <Button size="small" variant="ghost">Open</Button> },
        ]}
      />,
    ),
  );
  for (let i = 0; i < 4; i++) await new Promise((resolve) => requestAnimationFrame(resolve));
  const face = host.querySelector('.face')!.closest('.crewlet-data-grid__cell')!.getBoundingClientRect();
  const action = host.querySelector('.crewlet-data-grid__cell--action button')!.getBoundingClientRect();
  expect(Math.abs((action.top + action.bottom) / 2 - (face.top + face.bottom) / 2)).toBeLessThanOrEqual(1);
});
