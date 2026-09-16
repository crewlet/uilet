/**
 * The data surfaces, run through axe.
 *
 * WHY HERE. `apps/ui-tests/src/axe.test.tsx` runs the same rule set over the
 * primitives the foundation draws; these components landed afterwards, and a
 * table is where the rules nobody thought of live: a header that names no
 * column, a state on an element that cannot carry it, a control inside a
 * control. The suite is the same shape as that one on purpose, so the two can
 * be folded together whenever somebody wants one file.
 *
 * THE RULE SET IS THE WCAG 2.2 A AND AA TAGS, and nothing is disabled but
 * contrast, which jsdom cannot compute: it resolves no custom property and
 * lays nothing out, so the palette suite in @crewlethq/tokens measures it from
 * the stylesheets instead.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test } from 'vitest';
import { ActivityStrip, BarList, Card, DiffList, Legend, StackedBar, Table } from '../index.js';
import { DataTable } from './index.js';

afterEach(cleanup);

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function violations(element: Element): Promise<string[]> {
  const result = await axe.run(element, {
    runOnly: { type: 'tag', values: WCAG },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  return result.violations.map(
    (violation) => `${violation.id}: ${violation.help} (${violation.nodes.map((node) => node.html).join(', ')})`,
  );
}

interface Run {
  id: string;
  seat: string;
  tokens: number | null;
}

const runs: Run[] = [
  { id: 'r1', seat: 'planner', tokens: 12_400 },
  { id: 'r2', seat: 'builder', tokens: null },
];

test('a sorted, selected, toned and linked table carries no violation', async () => {
  const { container } = render(
    <main>
      <h1>Runs</h1>
      <DataTable<Run>
        variant="compact"
        data={runs}
        getRowKey={(row) => row.id}
        defaultSort={{ key: 'tokens', direction: 'desc' }}
        getRowHref={(row) => `#/runs/${row.id}`}
        isSelected={(row) => row.id === 'r1'}
        rowTone={(row) => (row.tokens === null ? 'danger' : null)}
        visibleColumns={{ seat: true, tokens: true }}
        onVisibleColumnsChange={() => {}}
        endMessage="That is every run in this window."
        columns={{
          seat: { label: 'Seat', sortValue: (row) => row.seat },
          tokens: {
            label: 'Tokens',
            align: 'right',
            sortValue: (row) => row.tokens,
            render: (row) => (row.tokens === null ? '–' : row.tokens.toLocaleString()),
          },
        }}
      />
    </main>,
  );
  expect(await violations(container)).toEqual([]);
});

test('a table whose controls the card header holds carries no violation', async () => {
  /*
   * The pager and the cog are drawn into the card's header by a portal, which
   * moves where they LAND without moving what owns them. What that could
   * break is entirely structural, and it is what axe reads: a group inside a
   * heading's row, a control whose name arrived by the same route, and the
   * card's own region still named by its title rather than by a control that
   * has landed beside it.
   */
  const { container } = render(
    <main>
      <h1>Fleet</h1>
      <Card as="section" padding="none">
        <Card.Header icon={<span>#</span>} count={runs.length}>
          <Card.Title>Runs</Card.Title>
        </Card.Header>
        <DataTable<Run>
          variant="compact"
          data={runs}
          getRowKey={(row) => row.id}
          defaultItemsPerPage={1}
          columns={{ seat: { label: 'Seat' }, tokens: { label: 'Tokens', align: 'right' } }}
        />
      </Card>
    </main>,
  );
  expect(screen.getByRole('region', { name: 'Runs' })).toBeTruthy();
  expect(await violations(container)).toEqual([]);
});

test('an expandable table with row actions carries no violation, opened', async () => {
  const { container } = render(
    <main>
      <h1>Seats</h1>
      <DataTable<Run>
        data={runs}
        getRowKey={(row) => row.id}
        columns={{ seat: { label: 'Seat' } }}
        renderExpandedRow={(row) => <p>{row.seat} detail</p>}
        rowActions={() => [
          { label: 'Open', onClick: () => {} },
          { label: 'Delete', danger: true, divider: 'before', onClick: () => {} },
        ]}
      />
    </main>,
  );
  // Asserted with the surfaces OPEN: a menu that never opened is a menu axe
  // would have nothing to say about.
  fireEvent.click(screen.getAllByRole('button', { name: 'Expand row' })[0]!);
  fireEvent.click(screen.getAllByRole('button', { name: 'Row actions' })[0]!);
  expect(await violations(container)).toEqual([]);
});

test('the settings frame carries no violation', async () => {
  const { container } = render(
    <main>
      <h1>Seats</h1>
      <DataTable<Run>
        variant="compact"
        data={runs}
        getRowKey={(row) => row.id}
        columns={{ seat: { label: 'Seat', hideable: false }, tokens: { label: 'Tokens' } }}
      />
    </main>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Table settings' }));
  /*
   * Asserted rather than assumed, because each of these is markup the frame
   * grew: the handle that is now a control, the page size the frame offers a
   * table that pages, and the tick that cannot move.
   */
  expect(screen.getByRole('button', { name: 'Reorder Seat' })).toBeTruthy();
  expect(screen.getByRole('button', { name: /^All/ })).toBeTruthy();
  expect(screen.getByRole('checkbox', { name: 'Seat' }).getAttribute('aria-disabled')).toBe('true');
  expect(await violations(container.ownerDocument.body)).toEqual([]);
});

test('the frame closes back onto the control that opened it', () => {
  render(
    <main>
      <h1>Seats</h1>
      <DataTable<Run>
        variant="compact"
        data={runs}
        getRowKey={(row) => row.id}
        columns={{ seat: { label: 'Seat' } }}
      />
    </main>,
  );
  /*
   * A dialog on the layer stack: focus is trapped inside it while it is open
   * and handed back to what opened it when it goes, or a reader is dropped at
   * the top of the document with the table they were configuring somewhere
   * below them.
   */
  const cog = screen.getByRole('button', { name: 'Table settings' });
  // Focused first, the way a pointer or a Tab reaches it: a click alone does
  // not move focus in jsdom, so the dialog would have nothing to hand back to.
  cog.focus();
  fireEvent.click(cog);
  const dialog = screen.getByRole('dialog');
  expect(dialog.contains(document.activeElement)).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(document.activeElement).toBe(cog);
});

test('the small table, the charts and the diff carry no violation', async () => {
  const { container } = render(
    <main>
      <h1>Spend</h1>
      <Table
        caption="What changed while the draft was open"
        headers={['What', 'Was', 'Is']}
        data={[['Model', 'sonnet', 'opus']]}
        actionButton={{ label: 'View all', onClick: () => {} }}
      />
      <BarList
        data={[
          { id: 'sonnet', label: 'sonnet', value: 412, href: '#/models/sonnet' },
          { id: 'embed', label: 'embeddings', value: 0 },
        ]}
      />
      <StackedBar segments={[{ id: 'execute', label: 'Execute', value: 3 }]} />
      <Legend items={[{ id: 'execute', label: 'Execute', value: '3' }]} />
      <ActivityStrip label="Events in the last hour" buckets={[{ t: 1, v: 0 }, { t: 2, v: 5 }]} />
      <DiffList
        rows={[
          { kind: 'added', path: 'roles.scribe', to: '{}' },
          { kind: 'changed', path: 'roles.planner.model', from: '"sonnet"', to: '"opus"' },
        ]}
      />
    </main>,
  );
  expect(await violations(container)).toEqual([]);
});

/*
 * THE THREE SURFACES THE DESIGN IS SPECIFIED IN, which are also the three the
 * suite above never rendered: the toolbar with its pagination cluster and
 * settings cog, the same toolbar with a band of filter state under it, and the
 * titled panel with a pinned right pane. Each one grew markup that carries a
 * role (a landmark for the pagination, a live region for the loading and empty
 * sentences), and a role is exactly the kind of addition that is right until
 * it is nested in something that refuses it.
 */
test('the toolbar, the filter band and a titled pinned table carry no violation', async () => {
  const { container } = render(
    <main>
      <h1>Activity</h1>
      <DataTable<Run>
        variant="compact"
        data={runs}
        getRowKey={(row) => row.id}
        defaultItemsPerPage={1}
        renderExpandedRow={(row) => <p>{row.seat} detail</p>}
        renderToolbar={<label>Outcome<input name="outcome" /></label>}
        renderFilterBar={<span>Outcome is success</span>}
        columns={{ seat: { label: 'Seat' }, tokens: { label: 'Tokens', align: 'right' } }}
      />
      <DataTable<Run>
        variant="compact"
        data={runs}
        getRowKey={(row) => row.id}
        title="Companies"
        description="One row per company you own."
        columns={{
          seat: { label: 'Seat' },
          open: { label: '', sortable: false, sticky: 'right', width: 80, render: () => <a href="#/invoices">Invoices</a> },
        }}
      />
    </main>,
  );
  // Asserted rather than assumed: a cluster that never rendered is one axe has
  // nothing to say about, and the case would pass for the wrong reason.
  expect(screen.getAllByRole('group', { name: 'Pagination' })).toHaveLength(2);
  // Two tables on one screen, and neither one has claimed a landmark: a
  // landmark list with two identical entries names nothing a reader can use.
  expect(screen.queryAllByRole('navigation')).toEqual([]);
  expect(container.querySelector('.crewlet-data-table__filter-bar')).toBeTruthy();
  expect(container.querySelector('.crewlet-data-table__td--sticky-right')).toBeTruthy();
  expect(await violations(container)).toEqual([]);
});

test('an empty table and a loading one carry no violation', async () => {
  const { container, rerender } = render(
    <main>
      <h1>Runs</h1>
      <DataTable<Run>
        variant="compact"
        data={[]}
        getRowKey={(row) => row.id}
        columns={{ seat: { label: 'Seat' } }}
        emptyMessage="No runs in this window. Try widening the date range."
      />
    </main>,
  );
  expect(screen.getByRole('status').textContent).toBe('No runs in this window. Try widening the date range.');
  expect(await violations(container)).toEqual([]);

  rerender(
    <main>
      <h1>Runs</h1>
      <DataTable<Run>
        variant="compact"
        data={[]}
        loading
        getRowKey={(row) => row.id}
        columns={{ seat: { label: 'Seat' } }}
      />
    </main>,
  );
  expect(container.querySelector('table')?.getAttribute('aria-busy')).toBe('true');
  expect(await violations(container)).toEqual([]);
});
