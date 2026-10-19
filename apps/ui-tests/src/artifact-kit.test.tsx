/**
 * The artifact kit's sheet, as a page uses it: `<crewlet-sheet>` and
 * `mountSheet`, bound to a runtime that behaves like `window.crewlet`.
 *
 * It runs here rather than beside the kit because this is the private
 * workspace that holds the test tooling: the kit is published, and a runner
 * among its devDependencies would be installed by the release pack job. The
 * kit's own node suite holds the BUILT files to their budgets and contents.
 */
import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from 'vitest';
import {
  applyNumberFormat,
  cellPresence,
  columnFromAttributes,
  columnsFromSchema,
  memberHues,
  parseSort,
  rosterFromMembers,
} from '../../../packages/artifact-kit/src/bind.js';
import { defineElements, mountSheet } from '../../../packages/artifact-kit/src/elements.js';
import {
  RUNTIME_READY_EVENT,
  whenRuntime,
  type Json,
  type KitCollectionSchema,
  type KitDoc,
  type KitError,
  type KitMember,
  type KitRoster,
  type KitRuntime,
  type KitWriteOutcome,
} from '../../../packages/artifact-kit/src/runtime.js';
import type { SheetColumn } from '@crewlethq/ui/SheetModel';

/*
 * The kit's elements own their React roots, as they do on a page, so their
 * renders are scheduled by React itself rather than inside a testing act()
 * scope: the suite waits for what they draw, as a page's reader would.
 */
const actEnvironment = globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean | undefined };
let previousActEnvironment: boolean | undefined;
beforeAll(() => {
  previousActEnvironment = actEnvironment.IS_REACT_ACT_ENVIRONMENT;
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = false;
});
afterAll(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
});

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
  delete window.crewlet;
});

interface FakeOptions {
  capabilities?: string[];
  schema?: KitCollectionSchema | null;
  docs?: { id: string; data: Record<string, Json> }[];
  outcome?: (fields: Record<string, Json>) => KitWriteOutcome;
  role?: 'viewer' | 'editor';
  /** A code the subscription is refused with. */
  refuse?: string;
}

/** A runtime with the shape of `window.crewlet` (contract 1.0), holding its documents in memory. */
function fakeRuntime(options: FakeOptions = {}) {
  const capabilities = new Set(options.capabilities ?? ['db', 'presence', 'identity']);
  let docs = options.docs ?? [
    { id: 'acme', data: { vendor: 'Acme Corp', score: 7.2, owner: 'maya' } },
    { id: 'globex', data: { vendor: 'Globex', score: 6.8, owner: 'gone' } },
  ];
  const views = new Set<(docs: KitDoc[], change: { changed: string[]; removed: string[] }) => void>();
  const rosterListeners = new Set<(roster: KitRoster) => void>();
  const asDocs = (): KitDoc[] => docs.map((doc) => ({ ...doc, version: 1, pending: false }));
  const publish = (changed: string[]) => views.forEach((listener) => listener(asDocs(), { changed, removed: [] }));
  const merges: { id: string; fields: Record<string, Json> }[] = [];
  const sets: { id: string; fields: Record<string, Json> }[] = [];
  const batches: { id: string; fields: Record<string, Json> }[][] = [];
  const presenceSets: unknown[] = [];
  const outcome = options.outcome ?? (() => ({ verdict: 'applied' as const }));
  const apply = (id: string, fields: Record<string, Json>) => {
    docs = docs.map((doc) => (doc.id === id ? { ...doc, data: { ...doc.data, ...fields } } : doc));
  };
  const runtime: KitRuntime = {
    capabilities: { has: (name) => capabilities.has(name) },
    identity: {
      me: async () => ({ seat: 'reader', kind: 'human', displayName: 'Reader', role: options.role ?? 'editor' }),
      people: async () => [
        { seat: 'maya', kind: 'human', displayName: 'Maya Ortiz' },
        { seat: 'pm', kind: 'agent', displayName: 'Product Manager', avatar: { character: 'otter', hue: 'rose' } },
      ],
    },
    data: {
      collection: () => ({
        subscribe: (callback, onError) => {
          if (options.refuse) {
            const error = Object.assign(new Error('refused'), { code: options.refuse }) as KitError;
            queueMicrotask(() => onError?.(error));
            return () => {};
          }
          views.add(callback);
          callback(asDocs(), { changed: docs.map((doc) => doc.id), removed: [] });
          return () => views.delete(callback);
        },
        set: async (id, fields) => {
          sets.push({ id, fields });
          return { verdict: 'invalid', reason: 'Vendor is required.' };
        },
        merge: async (id, fields) => {
          merges.push({ id, fields });
          const answer = outcome(fields);
          if (answer.verdict === 'applied') {
            apply(id, fields);
            publish([id]);
          }
          return answer;
        },
      }),
      batch: () => {
        const ops: { id: string; fields: Record<string, Json> }[] = [];
        const batch = {
          merge: (_collection: string, id: string, fields: Record<string, Json>) => {
            ops.push({ id, fields });
            return batch;
          },
          commit: async () => {
            batches.push(ops);
            for (const op of ops) apply(op.id, op.fields);
            publish(ops.map((op) => op.id));
            return { verdict: 'applied' as const };
          },
        };
        return batch;
      },
      schema: async () => (options.schema ? [{ ...options.schema, name: 'vendors' }] : []),
      undo: async () => ({ verdict: 'conflict', reason: 'stale' }),
      redo: async () => null,
    },
    presence: {
      roster: () => ({ members: [], truncated: false }),
      subscribe: (callback) => {
        rosterListeners.add(callback);
        return () => rosterListeners.delete(callback);
      },
      set: (state) => presenceSets.push(state),
    },
  };
  return {
    runtime,
    merges,
    sets,
    batches,
    presenceSets,
    views,
    members: (members: KitMember[]) => act(() => rosterListeners.forEach((listener) => listener({ members, truncated: false }))),
  };
}

/** A member of the room as the runtime names them. */
const member = (session: string, seat: string, displayName: string, activity: KitMember['activity'], focus: KitMember['focus'], extra: Partial<KitMember> = {}): KitMember => ({
  session,
  seat,
  kind: 'human',
  displayName,
  activity,
  focus,
  at: '2026-10-18T10:00:00Z',
  ...extra,
});

const sheetGrid = () => screen.getByRole('grid');
const cell = (row: number, col: number) => {
  const target = within(sheetGrid())
    .getAllByRole('row')
    .find((element) => element.getAttribute('aria-rowindex') === String(row + 2));
  if (!target) throw new Error(`row ${row} is not drawn`);
  return within(target).getAllByRole('gridcell')[col]!;
};
const spoken = (element: Element) => {
  const copy = element.cloneNode(true) as Element;
  copy.querySelectorAll('[aria-hidden="true"]').forEach((hidden) => hidden.remove());
  return (copy.textContent ?? '').trim();
};

describe('<crewlet-sheet>', () => {
  test('draws the columns a page declares, bound to the collection, with the person cells named from the people offered', async () => {
    const fake = fakeRuntime();
    window.crewlet = fake.runtime;
    defineElements();
    document.body.innerHTML = `
      <crewlet-sheet collection="vendors" label="Vendor scorecard" sort="-score" frozen="1">
        <crewlet-column field="vendor" type="text" label="Vendor"></crewlet-column>
        <crewlet-column field="score" type="number" label="Score" format="0.0"></crewlet-column>
        <crewlet-column field="owner" type="person" label="Owner"></crewlet-column>
      </crewlet-sheet>`;
    await waitFor(() => expect(spoken(cell(0, 0))).toBe('Acme Corp'));
    expect(screen.getByRole('grid', { name: 'Vendor scorecard' })).toBeDefined();
    expect(spoken(cell(0, 1))).toBe('7.2');
    expect(within(sheetGrid()).getAllByRole('columnheader')[2]!.getAttribute('aria-sort')).toBe('descending');
    await waitFor(() => expect(spoken(cell(0, 2))).toBe('Maya Ortiz'));
    // A seat the chart no longer holds is drawn as the native sheet draws it.
    expect(spoken(cell(1, 2))).toBe('Unknown person');
  });

  test('an edit is written through the runtime and drawn as Saving until it settles; a refusal is said on the cell', async () => {
    let answer: (value: KitWriteOutcome) => void = () => {};
    const fake = fakeRuntime();
    const store = fake.runtime.data.collection('vendors');
    fake.runtime.data.collection = () => ({
      ...store,
      merge: (id, fields) => {
        fake.merges.push({ id, fields });
        return new Promise((resolve) => {
          answer = resolve;
        });
      },
    });
    window.crewlet = fake.runtime;
    defineElements();
    document.body.innerHTML = `<crewlet-sheet collection="vendors" label="Vendor scorecard"><crewlet-column field="score" type="number" label="Score"></crewlet-column></crewlet-sheet>`;
    await waitFor(() => expect(spoken(cell(0, 0))).toBe('7.2'));
    act(() => cell(0, 0).focus());
    fireEvent.keyDown(document.activeElement!, { key: '9' });
    const input = screen.getByRole('textbox', { name: 'Score, 1' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(fake.merges).toEqual([{ id: 'acme', fields: { score: 9 } }]);
    await waitFor(() => expect(cell(0, 0).className).toContain('crewlet-sheet-grid__cell--pending'));
    await act(async () => answer({ verdict: 'forbidden', reason: 'seat lacks editor' }));
    expect(cell(0, 0).className).not.toContain('crewlet-sheet-grid__cell--pending');
    expect(cell(0, 0).className).toContain('crewlet-sheet-grid__cell--refused');
    // Enter moved the reader down a row; the reason is said where they go back to.
    act(() => cell(0, 0).focus());
    await waitFor(() => expect(cell(0, 0).textContent).toContain('You can view this sheet but not edit it.'));
    // The strip holds the refusal rather than going back to "Saved", until the reader dismisses it.
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByRole('button', { name: 'Dismiss' })).toBeNull();
    expect(cell(0, 0).className).not.toContain('crewlet-sheet-grid__cell--refused');
  });

  test('with no columns of its own it draws the collection schema, primary column frozen, hidden ones left out', async () => {
    const fake = fakeRuntime({
      schema: {
        name: 'vendors',
        title: 'Launch review',
        columns: [
          { key: 'vendor', type: 'text', label: 'Vendor', primary: true },
          { key: 'secret', type: 'text', label: 'Secret', hidden: true },
          { key: 'score', type: 'number', label: 'Score' },
        ],
      },
    });
    window.crewlet = fake.runtime;
    defineElements();
    document.body.innerHTML = `<crewlet-sheet collection="vendors"></crewlet-sheet>`;
    await waitFor(() => expect(screen.getByRole('grid', { name: 'Launch review' })).toBeDefined());
    expect(within(sheetGrid()).getAllByRole('columnheader').map((header) => header.textContent)).toEqual(['Row', 'Vendor, Text', 'Score, Number']);
  });

  test('a page that declared no db capability is told so, and nothing is read', async () => {
    const fake = fakeRuntime({ capabilities: [] });
    window.crewlet = fake.runtime;
    defineElements();
    document.body.innerHTML = `<crewlet-sheet collection="vendors"><crewlet-column field="vendor" label="Vendor"></crewlet-column></crewlet-sheet>`;
    await waitFor(() => expect(screen.getByText('This page did not declare the db capability, so the sheet cannot load.')).toBeDefined());
    expect(fake.views.size).toBe(0);
  });

  test('a subscription the runtime refuses is said in place of the grid, never drawn as an empty sheet', async () => {
    const fake = fakeRuntime({ refuse: 'forbidden' });
    window.crewlet = fake.runtime;
    defineElements();
    document.body.innerHTML = `<crewlet-sheet collection="vendors"><crewlet-column field="vendor" label="Vendor"></crewlet-column></crewlet-sheet>`;
    await waitFor(() => expect(screen.getByText('You do not have access to the vendors collection.')).toBeDefined());
    expect(screen.queryByRole('grid')).toBeNull();
  });

  test('Add row writes a new document under an id it mints, and a refusal says why', async () => {
    const fake = fakeRuntime();
    window.crewlet = fake.runtime;
    defineElements();
    document.body.innerHTML = `<crewlet-sheet collection="vendors"><crewlet-column field="vendor" label="Vendor"></crewlet-column></crewlet-sheet>`;
    await waitFor(() => expect(cell(0, 0)).toBeDefined());
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /add row/i }));
    });
    expect(fake.sets).toEqual([{ id: expect.stringMatching(/^[0-9a-f]{24}$/), fields: {} }]);
    await waitFor(() => expect(screen.getByText('Could not add a row. Vendor is required.')).toBeDefined());
  });

  test('the sheet is as tall as its rows, so no empty slab sits under Add row', async () => {
    const fake = fakeRuntime({});
    window.crewlet = fake.runtime;
    defineElements();
    document.body.innerHTML = `<crewlet-sheet collection="vendors"><crewlet-column field="vendor" label="Vendor"></crewlet-column></crewlet-sheet>`;
    await waitFor(() => expect(sheetGrid().closest('.crewlet-sheet-grid')?.className).toContain('crewlet-sheet-grid--fit-content'));
  });

  test('a viewer gets a read-only sheet', async () => {
    const fake = fakeRuntime({ role: 'viewer' });
    window.crewlet = fake.runtime;
    defineElements();
    document.body.innerHTML = `<crewlet-sheet collection="vendors"><crewlet-column field="vendor" label="Vendor"></crewlet-column></crewlet-sheet>`;
    await waitFor(() => expect(sheetGrid().getAttribute('aria-readonly')).toBe('true'));
  });

  test('collaborators on the collection wear their ring and flag, and the reader own focus is published', async () => {
    const fake = fakeRuntime();
    window.crewlet = fake.runtime;
    defineElements();
    document.body.innerHTML = `<crewlet-sheet collection="vendors"><crewlet-column field="vendor" label="Vendor"></crewlet-column><crewlet-column field="score" type="number" label="Score"></crewlet-column></crewlet-sheet>`;
    await waitFor(() => expect(cell(0, 0)).toBeDefined());
    fake.members([
      member('jane-1', 'jane', 'Jane Founder', 'viewing', { collection: 'vendors', doc: 'globex', field: 'score' }),
      member('other', 'sam', 'Sam Lee', 'viewing', { collection: 'notes', doc: 'x', field: 'y' }),
    ]);
    expect(cell(1, 1).className).toContain('crewlet-presence-ring');
    expect(cell(1, 1).querySelector('.crewlet-cursor-flag')?.textContent).toBe('Jane Founder');
    expect(screen.getByRole('img', { name: /You and 2 others are here/ })).toBeDefined();
    act(() => cell(0, 1).focus());
    expect(fake.presenceSets.at(-1)).toEqual({ activity: 'viewing', focus: { collection: 'vendors', doc: 'acme', field: 'score' } });
  });

  test('a paste of several cells is one batch, all or nothing', async () => {
    const fake = fakeRuntime();
    window.crewlet = fake.runtime;
    defineElements();
    document.body.innerHTML = `<crewlet-sheet collection="vendors"><crewlet-column field="vendor" label="Vendor"></crewlet-column></crewlet-sheet>`;
    await waitFor(() => expect(cell(0, 0)).toBeDefined());
    act(() => cell(0, 0).focus());
    const event = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', { value: { getData: () => 'Initech\nUmbrella' } });
    await act(async () => {
      document.activeElement!.dispatchEvent(event);
    });
    expect(fake.batches).toEqual([
      [
        { id: 'acme', fields: { vendor: 'Initech' } },
        { id: 'globex', fields: { vendor: 'Umbrella' } },
      ],
    ]);
    await waitFor(() => expect(spoken(cell(1, 0))).toBe('Umbrella'));
  });

  test('an undo somebody overtook is skipped and said', async () => {
    const fake = fakeRuntime();
    window.crewlet = fake.runtime;
    defineElements();
    document.body.innerHTML = `<crewlet-sheet collection="vendors"><crewlet-column field="vendor" label="Vendor"></crewlet-column></crewlet-sheet>`;
    await waitFor(() => expect(cell(0, 0)).toBeDefined());
    act(() => cell(0, 0).focus());
    await act(async () => {
      fireEvent.keyDown(document.activeElement!, { key: 'z', ctrlKey: true });
    });
    await waitFor(() => expect(screen.getByText('Somebody changed this after you, so the undo was skipped.')).toBeDefined());
  });

  test('a column added to the markup is drawn, and removing the element releases its subscriptions', async () => {
    const fake = fakeRuntime();
    window.crewlet = fake.runtime;
    defineElements();
    document.body.innerHTML = `<crewlet-sheet collection="vendors"><crewlet-column field="vendor" label="Vendor"></crewlet-column></crewlet-sheet>`;
    await waitFor(() => expect(cell(0, 0)).toBeDefined());
    const sheet = document.querySelector('crewlet-sheet')!;
    const column = document.createElement('crewlet-column');
    column.setAttribute('field', 'score');
    column.setAttribute('type', 'number');
    column.setAttribute('label', 'Score');
    await act(async () => {
      sheet.append(column);
    });
    await waitFor(() => expect(within(sheetGrid()).getAllByRole('columnheader')).toHaveLength(3));
    await act(async () => {
      sheet.remove();
    });
    expect(fake.views.size).toBe(0);
  });
});

describe('mountSheet', () => {
  test('waits for the runtime when the kit loaded first, then draws', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const mounted = mountSheet(host, { collection: 'vendors', columns: [{ field: 'vendor', label: 'Vendor', type: 'text' }], label: 'Vendors' });
    expect(screen.queryByRole('grid')).toBeNull();
    const fake = fakeRuntime();
    await act(async () => {
      window.crewlet = fake.runtime;
      window.dispatchEvent(new Event(RUNTIME_READY_EVENT));
    });
    await waitFor(() => expect(screen.getByRole('grid', { name: 'Vendors' })).toBeDefined());
    await act(async () => mounted.unmount());
    expect(screen.queryByRole('grid')).toBeNull();
    expect(host.children).toHaveLength(0);
  });

  test('whenRuntime answers at once when the runtime is already installed', async () => {
    const fake = fakeRuntime();
    window.crewlet = fake.runtime;
    await expect(whenRuntime()).resolves.toBe(fake.runtime);
  });
});

describe('bindings', () => {
  test('a schema column of a type this build does not know is kept, as read-only text', () => {
    expect(columnsFromSchema({ name: 'vendors', columns: [{ key: 'ticket', type: 'workitem', label: 'Ticket' }, { key: 'tags', type: 'multiselect', max_items: 3, options: [{ id: 'a', label: 'A', category: 'nonsense' }] }] })).toEqual([
      { field: 'ticket', label: 'Ticket', type: 'text', readOnly: true },
      { field: 'tags', label: 'tags', type: 'multiselect', maxItems: 3, options: [{ id: 'a', label: 'A' }] },
    ]);
    expect(columnsFromSchema(null)).toEqual([]);
  });

  test('column attributes, the number formats and the sort attribute', () => {
    const attributes: Record<string, string> = { field: 'tier', type: 'select', label: 'Tier', options: 'Gold:amber,Silver', width: '160', required: '' };
    expect(columnFromAttributes((name) => attributes[name] ?? null)).toEqual({
      field: 'tier',
      label: 'Tier',
      type: 'select',
      required: true,
      width: 160,
      options: [
        { id: 'gold', label: 'Gold', color: 'amber' },
        { id: 'silver', label: 'Silver' },
      ],
    });
    expect(columnFromAttributes(() => null)).toBeNull();
    const formatted = (format: string) => {
      const column: SheetColumn = { field: 'n', label: 'N', type: 'number' };
      applyNumberFormat(column, format);
      return column;
    };
    expect(formatted('0.00')).toMatchObject({ precision: 2 });
    expect(formatted('0.0%')).toMatchObject({ precision: 1, numberStyle: 'percent' });
    expect(formatted('currency:eur')).toMatchObject({ numberStyle: 'currency', currency: 'EUR' });
    expect(parseSort('-score')).toEqual({ field: 'score', direction: 'descending' });
    expect(parseSort('vendor')).toEqual({ field: 'vendor', direction: 'ascending' });
    expect(parseSort('')).toBeNull();
  });

  test('members: an agent wears its own hue, the reader is left out, editing and idle come from the activity', () => {
    const members: KitMember[] = [
      member('a', 'reader', 'Reader', 'viewing', {}),
      member('b', 'pm', 'PM', 'editing', { collection: 'vendors', doc: 'acme', field: 'score' }, { kind: 'agent', avatar: { character: 'otter', hue: 'rose' } }),
      member('d', 'jane', 'Jane', 'idle', { collection: 'vendors', doc: 'globex', field: 'vendor' }),
      member('e', 'sam', 'Sam', 'viewing', { collection: 'notes', doc: 'x', field: 'y' }),
    ];
    const hues = memberHues(members, new Map());
    expect(hues.get('b')).toBe('rose');
    expect(cellPresence(members, 'vendors', 'reader', hues)).toEqual([
      { rowId: 'acme', field: 'score', id: 'b', name: 'PM', kind: 'agent', hue: 'rose', editing: true, idle: false },
      { rowId: 'globex', field: 'vendor', id: 'd', name: 'Jane', kind: 'human', hue: hues.get('d'), editing: false, idle: true },
    ]);
    expect(rosterFromMembers(members, 'reader', hues).map((entry) => [entry.name, entry.activity, entry.character])).toEqual([
      ['PM', 'editing', 'otter'],
      ['Jane', 'idle', undefined],
      ['Sam', 'viewing', undefined],
    ]);
  });
});

test('the elements are defined once, however often the kit is imported', () => {
  defineElements();
  const define = vi.spyOn(customElements, 'define');
  defineElements();
  defineElements();
  expect(define).not.toHaveBeenCalled();
  define.mockRestore();
});
