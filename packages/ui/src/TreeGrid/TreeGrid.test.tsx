/**
 * The treegrid: rows and cells a keyboard walks.
 *
 * What these protect:
 * - the grid says each row's level, position and expansion, and an add row is
 *   a row like any other, counted among its siblings;
 * - Up and Down walk rows, Right opens a row or steps into its cells, Left
 *   steps back out, and a cell holding a control focuses the control, which is
 *   then the grid's one tab stop;
 * - the row keys reach the caller, the ContextMenu key opens the row's own
 *   menu, and a caller's own chord is asked first;
 * - the menus open over the grid rather than inside the box that scrolls, and
 *   a sideways scroll that carries a trigger away closes them;
 * - the scroller is the containing block of everything it holds.
 *
 * Ported from the generic half of the engine dashboard's
 * `routes/org/builder/OutlineView.test.tsx`, and from the second case of its
 * `builderStyles.test.ts`, which moves here with the markup it is about.
 */

import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRef, useMemo, type KeyboardEvent } from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { Button } from '../Button/index.js';
import { Menu } from '../Menu/index.js';
import type { TreeInput, TreeViewHandle } from '../Tree/index.js';
import { TreeGrid, type TreeGridColumn, type TreeGridContext } from './TreeGrid.js';
import { installSheets } from '../../../../apps/ui-tests/src/cascade.js';

afterEach(cleanup);

// ---------------------------------------------------------------------------
// A company shaped fixture
// ---------------------------------------------------------------------------

type Kind = 'company' | 'unit' | 'seat';
const COMPANY = 'company:Acme';
const ENTITIES: Record<string, { name: string; kind: Kind; parent: string | null }> = {
  [COMPANY]: { name: 'Acme', kind: 'company', parent: null },
  'seat:ceo': { name: 'CEO', kind: 'seat', parent: COMPANY },
  'unit:eng': { name: 'Engineering', kind: 'unit', parent: COMPANY },
  'seat:vp': { name: 'VP Engineering', kind: 'seat', parent: 'unit:eng' },
  'seat:dev': { name: 'Dev', kind: 'seat', parent: 'unit:eng' },
  'unit:platform': { name: 'Platform', kind: 'unit', parent: 'unit:eng' },
  'seat:sre': { name: 'SRE', kind: 'seat', parent: 'unit:platform' },
  'seat:designer': { name: 'Designer', kind: 'seat', parent: 'unit:platform' },
  'unit:sales': { name: 'Sales', kind: 'unit', parent: COMPANY },
  'seat:ae': { name: 'Account Executive', kind: 'seat', parent: 'unit:sales' },
};

const ADD = 'add:';
const addId = (parent: string) => `${ADD}${parent}`;
const addParent = (id: string) => (id.startsWith(ADD) ? id.slice(ADD.length) : null);
const nameOf = (id: string) => ENTITIES[id]!.name;

const COLUMNS: TreeGridColumn[] = [
  { key: 'name', header: 'Name', width: 'minmax(0, 3fr)' },
  { key: 'kind', header: 'Kind or type', width: 'minmax(0, 1.5fr)' },
  { key: 'handle', header: 'Handle', width: 'minmax(0, 1.5fr)' },
  { key: 'lead', header: 'Lead or reports to', width: 'minmax(0, 2fr)' },
  { key: 'problems', header: 'Problems', width: 'minmax(0, 1fr)' },
  { key: 'actions', header: 'Actions', headerHidden: true, width: 'var(--size-control-md)' },
];

/** The buttons an add row holds, in order: one cell each. */
const ADD_BUTTONS = ['Add agent seat', 'Add human seat', 'Add unit'];

function forest(withAddRows: boolean): TreeInput[] {
  const node = (id: string): TreeInput => {
    const children = Object.keys(ENTITIES)
      .filter((child) => ENTITIES[child]!.parent === id)
      .map(node);
    if (withAddRows && ENTITIES[id]!.kind !== 'seat') {
      // An empty label: type ahead finds rows by the name a person reads, and
      // an add row names nothing.
      children.push({ id: addId(id), label: '' });
    }
    return { id, label: ENTITIES[id]!.name, children };
  };
  return [node(COMPANY)];
}

function Harness({
  handle,
  addRows = true,
  readOnly = false,
  onRowKey,
  onRowKeyDown,
  onSelect,
  onAdd,
  selectedId = null,
}: {
  handle?: React.Ref<TreeViewHandle> | undefined;
  addRows?: boolean | undefined;
  readOnly?: boolean | undefined;
  onRowKey?: ((id: string, action: 'activate' | 'remove') => boolean) | undefined;
  onRowKeyDown?: ((id: string, event: KeyboardEvent<HTMLElement>) => boolean) | undefined;
  onSelect?: ((id: string) => void) | undefined;
  onAdd?: ((parent: string, which: string) => void) | undefined;
  selectedId?: string | null | undefined;
}) {
  const rows = useMemo(() => forest(addRows && !readOnly), [addRows, readOnly]);
  const renderCell = (id: string, column: number, grid: TreeGridContext) => {
    const parent = addParent(id);
    if (parent !== null) {
      const which = ADD_BUTTONS[column - 1]!;
      return (
        <Button size="small" variant="tertiary" tabIndex={grid.tabStop(id, column) ? 0 : -1} onClick={() => onAdd?.(parent, which)}>
          {which}
        </Button>
      );
    }
    const entity = ENTITIES[id]!;
    switch (column) {
      case 1:
        return <span className="name">{entity.name}</span>;
      case 2:
        return <span>{entity.kind === 'seat' ? 'Agent seat' : entity.kind === 'unit' ? 'Unit' : 'Company'}</span>;
      case 3:
        return entity.kind === 'seat' ? <span>@{entity.name.toLowerCase().replace(/ /g, '-')}</span> : null;
      case 4:
        return entity.kind === 'unit' && !readOnly ? (
          <Menu
            label={`Lead of ${entity.name}`}
            trigger="VP Engineering"
            items={[{ key: 'none', label: 'No lead', checked: false, onSelect: () => {} }, { key: 'vp', label: 'VP Engineering', checked: true, onSelect: () => {} }]}
            triggerTabIndex={grid.tabStop(id, column) ? 0 : -1}
            onOpenChange={(open) => open && grid.opened(id, column)}
          />
        ) : entity.kind === 'seat' ? (
          <span>No manager</span>
        ) : null;
      case 5:
        return null;
      default:
        return (
          <Menu
            label={`Actions for ${entity.name}`}
            items={[
              { key: 'edit', label: 'Edit', onSelect: () => {} },
              { key: 'move', label: 'Move to', onSelect: () => {} },
            ]}
            triggerTabIndex={grid.tabStop(id, column) ? 0 : -1}
            open={grid.menuOpen(id)}
            onOpenChange={(open) => {
              // Only a press reports an opening: the ContextMenu key sets the
              // menu itself, and focus goes back to the row.
              if (open) grid.opened(id, column);
              grid.setMenuOpen(id, open);
            }}
          />
        );
    }
  };
  return (
    <TreeGrid
      label="Organization outline"
      columns={COLUMNS}
      rows={rows}
      renderCell={renderCell}
      cellHasControl={(id, column) =>
        addParent(id) !== null ||
        column === 6 ||
        (column === 4 && ENTITIES[id]?.kind === 'unit' && !readOnly)
      }
      onRowKey={onRowKey ?? (() => true)}
      onRowKeyDown={onRowKeyDown}
      hasRowMenu={() => true}
      addRow={(id) => {
        const parent = addParent(id);
        return parent === null ? null : { label: `Add to ${nameOf(parent)}`, cells: ADD_BUTTONS.length };
      }}
      selectedId={selectedId}
      onSelect={onSelect}
      readOnly={readOnly}
      ref={handle}
    />
  );
}

function mount(props: Parameters<typeof Harness>[0] = {}) {
  const handle = createRef<TreeViewHandle>();
  return { handle, ...render(<Harness {...props} handle={handle} />) };
}

/**
 * The component's own stylesheet as `[selector, declarations]` pairs, comments
 * removed.
 *
 * Read from disk rather than applied to the document: a case that put the
 * rules in a style element would be a component source injecting one, which
 * the package's source scan refuses for the reason that a style element inside
 * an inline SVG applies to the whole document and a strict
 * Content-Security-Policy refuses it outright.
 */
function declarations(): [string, string][] {
  const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'TreeGrid.css'), 'utf8').replace(
    /\/\*[\s\S]*?\*\//g,
    '',
  );
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((match) => [match[1]!.trim(), match[2]!]);
}

const rowOf = (id: string) => screen.getAllByRole('row').find((row) => row.getAttribute('data-tree-id') === id)!;
const press = (key: string, init: Partial<KeyboardEventInit> = {}) =>
  fireEvent.keyDown(document.activeElement ?? document.body, { key, ...init });
/**
 * A pointer press on a button, as a browser makes one: the press moves focus
 * to the button unless the view stops it, which jsdom leaves to the caller.
 */
const pointerPress = (name: string) => {
  const button = screen.getByRole('button', { name, hidden: true });
  if (fireEvent.mouseDown(button)) button.focus();
  fireEvent.click(button);
};
const focusedRow = () =>
  (document.activeElement as HTMLElement | null)?.closest('[data-tree-id]')?.getAttribute('data-tree-id');
const focusedColumn = () =>
  (document.activeElement as HTMLElement | null)?.closest("[role='gridcell']")?.getAttribute('aria-colindex') ??
  null;

describe('the grid', () => {
  test('rows say their level, position and expansion, with an add row closing each parent', () => {
    mount();
    expect(screen.getByRole('treegrid', { name: 'Organization outline' })).toBeDefined();
    expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      'Name',
      'Kind or type',
      'Handle',
      'Lead or reports to',
      'Problems',
      'Actions',
    ]);
    const body = screen.getAllByRole('row').filter((row) => row.hasAttribute('data-tree-id'));
    expect(
      body.map((row) => [
        row.getAttribute('data-tree-id'),
        row.getAttribute('aria-level'),
        row.getAttribute('aria-posinset'),
        row.getAttribute('aria-setsize'),
        row.getAttribute('aria-expanded'),
      ]),
    ).toEqual([
      [COMPANY, '1', '1', '1', 'true'],
      ['seat:ceo', '2', '1', '4', null],
      ['unit:eng', '2', '2', '4', 'true'],
      ['seat:vp', '3', '1', '4', null],
      ['seat:dev', '3', '2', '4', null],
      ['unit:platform', '3', '3', '4', 'true'],
      ['seat:sre', '4', '1', '3', null],
      ['seat:designer', '4', '2', '3', null],
      [addId('unit:platform'), '4', '3', '3', null],
      [addId('unit:eng'), '3', '4', '4', null],
      ['unit:sales', '2', '3', '4', 'true'],
      ['seat:ae', '3', '1', '2', null],
      [addId('unit:sales'), '3', '2', '2', null],
      [addId(COMPANY), '2', '4', '4', null],
    ]);
    // The cells of a node's row, in their columns.
    const dev = rowOf('seat:dev');
    expect(
      within(dev)
        .getAllByRole('gridcell')
        .map((cell) => cell.getAttribute('aria-colindex')),
    ).toEqual(['1', '2', '3', '4', '5', '6']);
    expect(within(dev).getByText('@dev')).toBeDefined();
    // An add row is named, because its cells are all controls.
    expect(rowOf(addId('unit:platform')).getAttribute('aria-label')).toBe('Add to Platform');
    expect(within(rowOf(addId('unit:platform'))).getAllByRole('gridcell')).toHaveLength(3);
  });

  test('the actions column is read but not seen, and each row carries its own depth', () => {
    mount();
    expect(screen.getByRole('treegrid').getAttribute('aria-colcount')).toBe(String(COLUMNS.length));

    // A heading that would be noise in the sight of it is still the only thing
    // a screen reader has to tell one column from another, so it is hidden
    // rather than dropped. Drawn plainly it would put the word "Actions" over
    // a column of glyph-only buttons.
    const headers = screen.getAllByRole('columnheader');
    expect(headers.at(-1)!.querySelector('.crewlet-visually-hidden')?.textContent).toBe('Actions');
    expect(headers[0]!.querySelector('.crewlet-visually-hidden')).toBeNull();

    // THE INDENT IS THE ROW'S OWN LEVEL, handed to the stylesheet as a
    // variable: the depth never reaches CSS through a class, so a grid that
    // stopped setting it would draw every row flush left and say nothing about
    // the shape of the company.
    const depth = (id: string) => rowOf(id).style.getPropertyValue('--crewlet-tree-grid-depth');
    expect(depth(COMPANY)).toBe('0');
    expect(depth('unit:eng')).toBe('1');
    expect(depth('seat:sre')).toBe('3');
    expect(depth(addId('unit:platform'))).toBe('3');
  });

  test('a read-only grid says so, and a forest with no add rows counts none among its siblings', () => {
    mount({ readOnly: true });
    expect(screen.getByRole('treegrid').getAttribute('aria-readonly')).toBe('true');
    expect(screen.getAllByRole('row').some((row) => row.getAttribute('data-tree-id')?.startsWith(ADD))).toBe(
      false,
    );
    expect(rowOf('seat:ceo').getAttribute('aria-setsize')).toBe('3');
  });

  test('the chevron is drawn on every expandable row, hidden, and holds its place on the others', () => {
    const { container } = mount();
    const toggles = container.querySelectorAll('.crewlet-tree-grid__toggle');
    // One per row, expandable or not, so a name never shifts sideways.
    expect(toggles).toHaveLength(screen.getAllByRole('row').length - 1);
    for (const toggle of toggles) expect(toggle.getAttribute('aria-hidden')).toBe('true');
    const chevron = within(rowOf('unit:eng')).getByRole('button', { name: 'Collapse Engineering', hidden: true });
    expect(chevron.tabIndex).toBe(-1);
    expect(within(rowOf('seat:dev')).queryByRole('button', { name: /Collapse|Expand/, hidden: true })).toBeNull();
  });

  /*
   * ONE DRAWING, TURNED. Opening a row swapped one glyph for another, which is
   * a cut where the row's opening is the one movement this table has. The path
   * is read from the rendered SVG rather than the component's import, and the
   * turn from the cascade the stylesheet actually decides, because a rule that
   * reaches nothing reads exactly like a rule that works.
   */
  test('opening a row turns the chevron rather than swapping the drawing', () => {
    const uninstall = installSheets('TreeGrid/TreeGrid.css');
    const { container } = mount();
    const toggle = () => rowOf('unit:eng').querySelector('.crewlet-tree-grid__toggle')!;
    const path = () => toggle().querySelector('path')!.getAttribute('d');
    const open = path();
    expect(toggle().hasAttribute('data-open')).toBe(true);
    expect(getComputedStyle(toggle().querySelector('svg')!).transform).toBe('rotate(90deg)');

    fireEvent.click(within(rowOf('unit:eng')).getByRole('button', { name: 'Collapse Engineering', hidden: true }));
    expect(path()).toBe(open);
    expect(toggle().hasAttribute('data-open')).toBe(false);
    expect(getComputedStyle(toggle().querySelector('svg')!).transform).toBe('none');
    expect(container).toBeDefined();
    uninstall();
  });
});

describe('keys', () => {
  test('rows and cells: Down and Up keep the column, Right steps in, Left steps out and climbs', () => {
    const onSelect = vi.fn();
    mount({ onSelect });
    rowOf(COMPANY).focus();
    press('ArrowDown');
    expect(focusedRow()).toBe('seat:ceo');
    expect(onSelect).toHaveBeenLastCalledWith('seat:ceo');
    press('ArrowRight');
    expect([focusedRow(), focusedColumn()]).toEqual(['seat:ceo', '1']);
    press('ArrowRight');
    press('ArrowRight');
    expect(focusedColumn()).toBe('3');
    // One tab stop in the grid: the active cell.
    const grid = screen.getByRole('treegrid');
    expect([...grid.querySelectorAll<HTMLElement>("[tabindex='0']")]).toEqual([document.activeElement]);
    press('ArrowDown');
    expect([focusedRow(), focusedColumn()]).toEqual(['unit:eng', '3']);
    press('ArrowRight');
    // The lead column holds a control: the control takes focus.
    expect(document.activeElement?.tagName).toBe('BUTTON');
    expect(document.activeElement?.textContent).toBe('VP Engineering');
    // ArrowDown on that button moves the grid rather than opening the menu.
    press('ArrowDown');
    expect(screen.queryByRole('menu')).toBeNull();
    expect([focusedRow(), focusedColumn()]).toEqual(['seat:vp', '4']);
    press('Home');
    expect(focusedColumn()).toBe('1');
    press('ArrowLeft');
    expect([focusedRow(), focusedColumn()]).toEqual(['seat:vp', null]);
    press('ArrowLeft');
    expect(focusedRow()).toBe('unit:eng');
    press('ArrowLeft');
    expect(rowOf('unit:eng').getAttribute('aria-expanded')).toBe('false');
    press('ArrowRight');
    expect(rowOf('unit:eng').getAttribute('aria-expanded')).toBe('true');
    press('End');
    expect(focusedRow()).toBe(addId(COMPANY));
    // An add row names no node, so reaching it leaves the selection where it was.
    expect(onSelect).toHaveBeenLastCalledWith('unit:eng');
  });

  test('a cell steps into whatever a keyboard can focus, not only a button', () => {
    // A control is not always a button: a handle that is a link, a name that is
    // edited in place, a chooser made focusable with tabindex. A grid that
    // knew only about buttons would strand the stop on the cell with nothing
    // for Enter to do.
    const columns: TreeGridColumn[] = [
      { key: 'name', header: 'Name' },
      { key: 'handle', header: 'Handle' },
      { key: 'rename', header: 'Rename' },
    ];
    const rows: TreeInput[] = [{ id: 'unit:eng', label: 'Engineering', children: [{ id: 'seat:vp', label: 'VP' }] }];
    render(
      <TreeGrid
        label="Organization outline"
        columns={columns}
        rows={rows}
        cellHasControl={(_id, column) => column > 1}
        renderCell={(id, column, grid) =>
          column === 2 ? (
            <a href="https://example.com" tabIndex={grid.tabStop(id, column) ? 0 : -1}>
              @{id}
            </a>
          ) : column === 3 ? (
            <input aria-label={`Rename ${id}`} defaultValue={id} tabIndex={grid.tabStop(id, column) ? 0 : -1} />
          ) : (
            <>
              {/* A pointer-only mark of the caller's own, left tab reachable.
                  Focus inside a subtree hidden from assistive technology is
                  focus nowhere, so the cell keeps the stop. */}
              <span aria-hidden="true" {...grid.press(id)}>
                <button type="button">Pin {id}</button>
              </span>
              <span>{id}</span>
            </>
          )
        }
      />,
    );
    rowOf('unit:eng').focus();
    press('ArrowRight');
    expect(document.activeElement).toBe(rowOf('unit:eng').querySelector("[aria-colindex='1']"));
    press('ArrowRight');
    expect(document.activeElement?.tagName).toBe('A');
    press('ArrowRight');
    expect(document.activeElement?.tagName).toBe('INPUT');
    press('Home');
    expect(document.activeElement).toBe(rowOf('unit:eng').querySelector("[aria-colindex='1']"));
  });

  test('the row keys reach the caller, and a row that refuses one leaves the key alone', () => {
    const onRowKey = vi.fn((id: string) => id !== COMPANY);
    mount({ onRowKey });
    rowOf('seat:dev').focus();
    press('Enter');
    expect(onRowKey).toHaveBeenLastCalledWith('seat:dev', 'activate');
    press('Backspace');
    press('Delete');
    expect(onRowKey.mock.calls.slice(-2)).toEqual([
      ['seat:dev', 'remove'],
      ['seat:dev', 'remove'],
    ]);
    rowOf(COMPANY).focus();
    expect(fireEvent.keyDown(document.activeElement!, { key: 'Delete' })).toBe(true);

    // Never from inside a cell: there the keys belong to the cell's control.
    onRowKey.mockClear();
    rowOf('seat:dev').focus();
    press('ArrowRight');
    press('Enter');
    expect(onRowKey).not.toHaveBeenCalled();
  });

  test('a chord the caller claims is asked first, and only while the row itself holds focus', () => {
    const onRowKeyDown = vi.fn(
      (_id: string, event: KeyboardEvent<HTMLElement>) => event.altKey && event.key === 'ArrowUp',
    );
    mount({ onRowKeyDown });
    rowOf('seat:dev').focus();
    press('ArrowUp', { altKey: true });
    expect(onRowKeyDown).toHaveBeenCalledTimes(1);
    expect(onRowKeyDown.mock.calls[0]![0]).toBe('seat:dev');
    // Handled, so the grid did not also move focus.
    expect(focusedRow()).toBe('seat:dev');

    // Refused, so the key carries on: a plain ArrowUp still walks the rows.
    press('ArrowUp');
    expect(focusedRow()).toBe('seat:vp');

    // An add row is not the caller's to claim, and neither is a cell.
    onRowKeyDown.mockClear();
    rowOf(addId('unit:eng')).focus();
    press('ArrowUp', { altKey: true });
    expect(onRowKeyDown).not.toHaveBeenCalled();
    rowOf('seat:dev').focus();
    press('ArrowRight');
    onRowKeyDown.mockClear();
    press('ArrowUp', { altKey: true });
    expect(onRowKeyDown).not.toHaveBeenCalled();
  });

  test('the ContextMenu key opens the row menu, and choosing an item hands focus back to the row', () => {
    mount();
    rowOf('unit:sales').focus();
    press('ContextMenu');
    const menu = screen.getByRole('menu', { name: 'Actions for Sales' });
    fireEvent.click(within(menu).getByRole('menuitem', { name: 'Move to' }));
    expect(document.activeElement).toBe(rowOf('unit:sales'));
  });

  test('a press keeps the one tab stop where focus actually went', () => {
    const onSelect = vi.fn();
    mount({ onSelect });
    const tabStops = () => [...screen.getByRole('treegrid').querySelectorAll<HTMLElement>("[tabindex='0']")];
    // The chevron is pointer only and hidden from assistive technology, so it
    // takes no focus: the row does.
    pointerPress('Collapse Engineering');
    expect(document.activeElement).toBe(rowOf('unit:eng'));
    expect(rowOf('unit:eng').getAttribute('aria-expanded')).toBe('false');
    expect(onSelect).toHaveBeenLastCalledWith('unit:eng');
    expect(tabStops()).toEqual([document.activeElement]);

    // A menu's trigger keeps the focus the press gave it and hands it back on
    // Escape, so the tab stop is that cell.
    pointerPress('Actions for Sales');
    expect(screen.getByRole('menu', { name: 'Actions for Sales' })).toBeDefined();
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Actions for Sales');
    expect(tabStops()).toEqual([document.activeElement]);
  });

  test('an open menu keeps its own keys: the grid navigation never reaches into it', () => {
    mount();
    // A menu with a visible trigger takes its name from the trigger's text;
    // `label` names the menu the trigger opens.
    const lead = within(rowOf('unit:eng')).getByRole('button', { name: 'VP Engineering' });
    fireEvent.click(lead);
    const menu = screen.getByRole('menu', { name: 'Lead of Engineering' });
    const answers = within(menu).getAllByRole('menuitemradio');
    expect(document.activeElement).toBe(answers[0]);
    press('ArrowDown');
    expect(document.activeElement).toBe(answers[1]);
    press('End');
    expect(document.activeElement).toBe(answers[answers.length - 1]);
    // The grid moved nowhere, and the menu is still open.
    expect(screen.getByRole('menu', { name: 'Lead of Engineering' })).toBe(menu);
  });

  test('an add row is entered with Enter and its buttons are walked with the arrows', () => {
    const onAdd = vi.fn();
    mount({ onAdd });
    const add = rowOf(addId('unit:platform'));
    add.focus();
    press('Enter');
    expect(document.activeElement?.textContent).toBe('Add agent seat');
    press('ArrowRight');
    fireEvent.click(document.activeElement!);
    expect(onAdd).toHaveBeenLastCalledWith('unit:platform', 'Add human seat');
    // End stops at the add row's own cell count, not the grid's column count.
    press('End');
    expect(focusedColumn()).toBe('3');
    press('ArrowRight');
    expect(focusedColumn()).toBe('3');
  });
});

describe('the layer over the grid', () => {
  test('menus open outside the box that scrolls, and a scroll that carries a trigger away closes them', () => {
    const { container } = mount();
    const scroller = container.querySelector<HTMLElement>('.crewlet-tree-grid__scroller')!;
    // A box that scrolls sideways clips on both axes, so a menu drawn inside it
    // under a trigger in the last rows would be cut off.
    const actions = within(rowOf('unit:sales')).getByRole('button', { name: 'Actions for Sales' });
    fireEvent.click(actions);
    const menu = screen.getByRole('menu', { name: 'Actions for Sales' });
    expect(scroller.contains(menu)).toBe(false);
    expect(menu.closest('.crewlet-layer-host')).not.toBeNull();

    // Scrolled sideways until its trigger has left the frame, the menu closes
    // rather than float beside a row nobody can see.
    actions.getBoundingClientRect = () => DOMRect.fromRect({ x: 5000, y: 0, width: 24, height: 24 });
    fireEvent.scroll(scroller);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  test('the scroller is the containing block of everything it holds', () => {
    const { container } = mount();
    const scroller = container.querySelector<HTMLElement>('.crewlet-tree-grid__scroller')!;
    const hidden = screen.getByText('Actions');
    expect(scroller.contains(hidden)).toBe(true);

    // The nearest ancestor this component POSITIONS is the scroller itself, so
    // an absolutely positioned descendant of it (that screen-reader header, far
    // right in a phone width grid) is placed against the scroller and clipped
    // by it. Placed against anything further out it escapes, and gives the page
    // a sideways overflow as wide as the whole grid: hidden, but scrolled by a
    // focus or a find in page.
    const positioned = new Set(
      declarations()
        .filter(([, body]) => /(^|;)\s*position:\s*(relative|absolute|fixed|sticky)/.test(body))
        .flatMap(([selector]) => selector.split(',').map((part) => part.trim())),
    );
    expect(positioned.has('.crewlet-tree-grid__scroller')).toBe(true);
    let at: HTMLElement | null = hidden.parentElement;
    while (at && ![...at.classList].some((one) => positioned.has(`.${one}`))) at = at.parentElement;
    expect(at).toBe(scroller);
  });

  test('the stylesheet keeps the scroller positioned and scrolling in one rule', () => {
    // The case above reads the DOM against the stylesheet; this one reads the
    // declarations, because a scroller that stopped scrolling sideways at all
    // would pass that one.
    const rule = declarations().find(([selector]) =>
      selector.split(',').some((part) => part.trim() === '.crewlet-tree-grid__scroller'),
    );
    expect(rule?.[1]).toMatch(/position:\s*relative/);
    expect(rule?.[1]).toMatch(/overflow-x:\s*auto/);
  });
});

describe('focus', () => {
  test('a focus request opens a collapsed row and lands on it; expand and collapse all', () => {
    const { handle } = mount();
    act(() => handle.current!.collapseAll());
    expect(screen.queryByText('Dev')).toBeNull();
    act(() => handle.current!.focusNode('seat:dev'));
    expect(focusedRow()).toBe('seat:dev');
    act(() => handle.current!.expandAll());
    expect(rowOf('unit:platform').getAttribute('aria-expanded')).toBe('true');
  });

  test('a focus request lands now even on the active row, and never on a later render', () => {
    const handle = createRef<TreeViewHandle>();
    const view = (selectedId: string | null = null) => (
      <>
        <button type="button">Undo</button>
        <Harness handle={handle} selectedId={selectedId} />
      </>
    );
    const { rerender } = render(view());
    const toolbar = screen.getByRole('button', { name: 'Undo' });
    rowOf(COMPANY).focus();
    press('ArrowDown');
    expect(focusedRow()).toBe('seat:ceo');

    // An undo from a toolbar asks for the row that is already active.
    toolbar.focus();
    act(() => handle.current!.focusNode('seat:ceo'));
    expect(document.activeElement).toBe(rowOf('seat:ceo'));

    // Once taken, the request is spent: a later render leaves focus alone.
    toolbar.focus();
    rerender(view('seat:ceo'));
    expect(document.activeElement).toBe(toolbar);
  });
});
