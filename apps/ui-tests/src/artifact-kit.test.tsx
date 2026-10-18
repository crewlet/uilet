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
  parseSort,
  peerHues,
  rosterFromPeers,
} from '../../../packages/artifact-kit/src/bind.js';
import { defineElements, mountSheet } from '../../../packages/artifact-kit/src/elements.js';
import {
  RUNTIME_READY_EVENT,
  whenRuntime,
  type Json,
  type KitPeer,
  type KitRuntime,
  type KitSchema,
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
  schema?: KitSchema | null;
  docs?: { id: string; data: Record<string, Json> }[];
  outcome?: (patch: Record<string, Json>) => KitWriteOutcome;
  role?: 'viewer' | 'editor';
}

/** A runtime with the shape of `window.crewlet`, holding its documents in memory. */
function fakeRuntime(options: FakeOptions = {}) {
  const capabilities = new Set(options.capabilities ?? ['data', 'presence', 'identity']);
  let docs = options.docs ?? [
    { id: 'acme', data: { vendor: 'Acme Corp', score: 7.2, owner: 'seat:maya' } },
    { id: 'globex', data: { vendor: 'Globex', score: 6.8, owner: 'seat:gone' } },
  ];
  const views = new Set<(view: { docs: typeof docs }) => void>();
  const peerListeners = new Set<(peers: KitPeer[]) => void>();
  const publish = () => views.forEach((listener) => listener({ docs }));
  const updates: { id: string; patch: Record<string, Json> }[] = [];
  const batches: { id: string; patch: Record<string, Json> }[][] = [];
  const presenceSets: unknown[] = [];
  const outcome = options.outcome ?? (() => ({ outcome: 'applied' as const }));
  const apply = (id: string, patch: Record<string, Json>) => {
    docs = docs.map((doc) => (doc.id === id ? { ...doc, data: { ...doc.data, ...patch } } : doc));
  };
  const runtime: KitRuntime = {
    capabilities: { has: (name) => capabilities.has(name) },
    identity: {
      me: async () => ({ id: 'seat:reader', kind: 'human', displayName: 'Reader', role: options.role ?? 'editor' }),
      people: async () => [{ id: 'seat:maya', kind: 'human', displayName: 'Maya Ortiz' }],
      lookup: async (ids) => Object.fromEntries(ids.map((id) => [id, id === 'seat:gone' ? { id, kind: 'agent', displayName: 'Former PM' } : null])),
    },
    data: {
      collection: () => ({
        schema: async () => options.schema ?? null,
        subscribe: (_query, callback) => {
          views.add(callback);
          callback({ docs });
          return () => views.delete(callback);
        },
        create: async () => ({ outcome: 'refused', code: 'invalid_value', detail: 'Vendor is required.' }),
        update: async (id, patch) => {
          updates.push({ id, patch });
          const answer = outcome(patch);
          if (answer.outcome === 'applied') {
            apply(id, patch);
            publish();
          }
          return answer;
        },
      }),
      batch: () => {
        const ops: { id: string; patch: Record<string, Json> }[] = [];
        const batch = {
          update: (_collection: string, id: string, patch: Record<string, Json>) => {
            ops.push({ id, patch });
            return batch;
          },
          commit: async () => {
            batches.push(ops);
            for (const op of ops) apply(op.id, op.patch);
            publish();
            return { outcome: 'applied' as const };
          },
        };
        return batch;
      },
      undo: async () => ({ outcome: 'refused', code: 'superseded', detail: 'Sam Lee changed Score after you.' }),
      redo: async () => null,
    },
    presence: {
      subscribe: (callback) => {
        peerListeners.add(callback);
        return () => peerListeners.delete(callback);
      },
      set: (state) => presenceSets.push(state),
    },
  };
  return {
    runtime,
    updates,
    batches,
    presenceSets,
    views,
    peers: (peers: KitPeer[]) => act(() => peerListeners.forEach((listener) => listener(peers))),
  };
}

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
  test('draws the columns a page declares, bound to the collection, with the person cells looked up', async () => {
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
    await waitFor(() => expect(spoken(cell(1, 2))).toBe('Former PM'));
    expect(spoken(cell(0, 2))).toBe('Maya Ortiz');
  });

  test('an edit is written through the runtime and drawn as Saving until it settles; a refusal is said on the cell', async () => {
    let answer: (value: KitWriteOutcome) => void = () => {};
    const fake = fakeRuntime();
    const store = fake.runtime.data.collection('vendors');
    fake.runtime.data.collection = () => ({
      ...store,
      update: (id, patch) => {
        fake.updates.push({ id, patch });
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
    expect(fake.updates).toEqual([{ id: 'acme', patch: { score: 9 } }]);
    await waitFor(() => expect(cell(0, 0).className).toContain('crewlet-sheet-grid__cell--pending'));
    await act(async () => answer({ outcome: 'refused', code: 'forbidden', detail: 'seat lacks editor' }));
    expect(cell(0, 0).className).not.toContain('crewlet-sheet-grid__cell--pending');
    expect(cell(0, 0).className).toContain('crewlet-sheet-grid__cell--refused');
    // Enter moved the reader down a row; the reason is said where they go back to.
    act(() => cell(0, 0).focus());
    await waitFor(() => expect(cell(0, 0).textContent).toContain('You can view this sheet but not edit it.'));
  });

  test('with no columns of its own it draws the collection schema, primary column frozen, hidden ones left out', async () => {
    const fake = fakeRuntime({
      schema: {
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

  test('a page that declared no data capability is told so, and nothing is read', async () => {
    const fake = fakeRuntime({ capabilities: [] });
    window.crewlet = fake.runtime;
    defineElements();
    document.body.innerHTML = `<crewlet-sheet collection="vendors"><crewlet-column field="vendor" label="Vendor"></crewlet-column></crewlet-sheet>`;
    await waitFor(() => expect(screen.getByText('This page did not declare the data capability, so the sheet cannot load.')).toBeDefined());
    expect(fake.views.size).toBe(0);
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
    fake.peers([
      { session: 'jane-1', viewer: { id: 'seat:jane', kind: 'human', displayName: 'Jane Founder' }, status: 'active', state: { focus: { collection: 'vendors', doc: 'globex', field: 'score' } } },
      { session: 'other', viewer: { id: 'seat:sam', kind: 'human', displayName: 'Sam Lee' }, status: 'active', state: { focus: { collection: 'notes', doc: 'x', field: 'y' } } },
    ]);
    expect(cell(1, 1).className).toContain('crewlet-presence-ring');
    expect(cell(1, 1).querySelector('.crewlet-cursor-flag')?.textContent).toBe('Jane Founder');
    expect(screen.getByRole('img', { name: /You and 2 others are here/ })).toBeDefined();
    act(() => cell(0, 1).focus());
    expect(fake.presenceSets.at(-1)).toEqual({ focus: { collection: 'vendors', doc: 'acme', field: 'score' } });
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
        { id: 'acme', patch: { vendor: 'Initech' } },
        { id: 'globex', patch: { vendor: 'Umbrella' } },
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
    await waitFor(() => expect(screen.getByText('Sam Lee changed Score after you. Undo skipped.')).toBeDefined());
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
    expect(columnsFromSchema({ columns: [{ key: 'ticket', type: 'workitem', label: 'Ticket' }, { key: 'tags', type: 'multiselect', max_items: 3, options: [{ id: 'a', label: 'A', category: 'nonsense' }] }] })).toEqual([
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

  test('peers: the runtime hue when it names one, the reader and anybody away left out, editing first-class', () => {
    const peers: KitPeer[] = [
      { session: 'a', viewer: { id: 'seat:reader', kind: 'human', displayName: 'Reader' }, status: 'active', state: {} },
      { session: 'b', viewer: { id: 'seat:pm', kind: 'agent', displayName: 'PM' }, status: 'working', color: 'rose', state: { editing: { collection: 'vendors', doc: 'acme', field: 'score' } } },
      { session: 'c', viewer: { id: 'seat:sam', kind: 'human', displayName: 'Sam' }, status: 'away', state: { focus: { collection: 'vendors', doc: 'acme', field: 'vendor' } } },
      { session: 'd', viewer: { id: 'seat:jane', kind: 'human', displayName: 'Jane' }, status: 'idle', state: { focus: { collection: 'vendors', doc: 'globex', field: 'vendor' } } },
    ];
    const hues = peerHues(peers, new Map());
    expect(hues.get('b')).toBe('rose');
    expect(cellPresence(peers, 'vendors', 'seat:reader', hues)).toEqual([
      { rowId: 'acme', field: 'score', id: 'b', name: 'PM', kind: 'agent', hue: 'rose', editing: true, idle: false },
      { rowId: 'globex', field: 'vendor', id: 'd', name: 'Jane', kind: 'human', hue: hues.get('d'), editing: false, idle: true },
    ]);
    expect(rosterFromPeers(peers, 'seat:reader', hues).map((member) => [member.name, member.activity])).toEqual([
      ['PM', 'editing'],
      ['Jane', 'idle'],
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
