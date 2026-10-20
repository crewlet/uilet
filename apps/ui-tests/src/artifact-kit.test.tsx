/**
 * The artifact kit's sheet, as a page uses it: `<crewlet-sheet>` and
 * `mountSheet`, bound to a runtime that behaves like `window.crewlet`.
 *
 * It runs here rather than beside the kit because this is the private
 * workspace that holds the test tooling: the kit is published, and a runner
 * among its devDependencies would be installed by the release pack job. The
 * kit's own node suite holds the BUILT files to their budgets and contents.
 */
import { act, cleanup, configure, fireEvent, getConfig, render, screen, waitFor, within } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from 'vitest';
import {
  applyNumberFormat,
  cellPresence,
  columnFromAttributes,
  columnsFromSchema,
  memberHues,
  parseSort,
  membersIn,
  rosterFromMembers,
} from '../../../packages/artifact-kit/src/bind.js';
import { defineElements, mountSheet } from '../../../packages/artifact-kit/src/elements.js';
import { KIT_SHEET_LABELS, KitSheet } from '../../../packages/artifact-kit/src/KitSheet.js';
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
/*
 * The first sheet a file draws pays for React's and the grid's first render,
 * which takes a few hundred milliseconds alone and past the library's one
 * second wait when the full suite runs every workspace at once. A wait only
 * runs long when something is not drawn, so a passing run is not slower.
 */
let previousWait = 0;
beforeAll(() => {
  previousActEnvironment = actEnvironment.IS_REACT_ACT_ENVIRONMENT;
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = false;
  previousWait = getConfig().asyncUtilTimeout;
  configure({ asyncUtilTimeout: 5000 });
});
afterAll(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
  configure({ asyncUtilTimeout: previousWait });
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
  /** A code every write rejects with: nothing about it was decided. */
  reject?: string;
  /** How a delete is answered; applied when absent. */
  deleted?: KitWriteOutcome;
  /**
   * Holds the host's handshake until `handshake()` is called. Until then the
   * runtime declares nothing, as the engine's does before the host's first
   * message arrives.
   */
  held?: boolean;
  /**
   * What a held runtime answers before its handshake: what the origin wrote
   * on the runtime's element as the page loaded. Nothing when absent.
   */
  early?: string[];
}

/** A rejection as the runtime raises it: an `Error` carrying the contract's code. */
const refusal = (code: string, message: string): KitError => Object.assign(new Error(message), { code });

/** A runtime with the shape of `window.crewlet` (contract 1.0), holding its documents in memory. */
function fakeRuntime(options: FakeOptions = {}) {
  const declared = new Set(options.capabilities ?? ['db', 'presence', 'identity']);
  let capabilities = options.held ? new Set<string>(options.early ?? []) : declared;
  let handshake = () => {};
  const ready = options.held
    ? new Promise<void>((resolve) => {
        handshake = () => {
          capabilities = declared;
          resolve();
        };
      })
    : Promise.resolve();
  let docs = options.docs ?? [
    { id: 'acme', data: { vendor: 'Acme Corp', score: 7.2, owner: 'maya' } },
    { id: 'globex', data: { vendor: 'Globex', score: 6.8, owner: 'gone' } },
  ];
  const views = new Set<(docs: KitDoc[], change: { changed: string[]; removed: string[] }) => void>();
  const rosterListeners = new Set<(roster: KitRoster) => void>();
  const asDocs = (): KitDoc[] => docs.map((doc) => ({ ...doc, version: 1, pending: false }));
  const publish = (changed: string[], removed: string[] = []) => views.forEach((listener) => listener(asDocs(), { changed, removed }));
  const merges: { id: string; fields: Record<string, Json> }[] = [];
  const sets: { id: string; fields: Record<string, Json> }[] = [];
  const deletes: string[] = [];
  const batches: { id: string; fields: Record<string, Json> }[][] = [];
  const presenceSets: unknown[] = [];
  const outcome = options.outcome ?? (() => ({ verdict: 'applied' as const }));
  const apply = (id: string, fields: Record<string, Json>) => {
    docs = docs.map((doc) => (doc.id === id ? { ...doc, data: { ...doc.data, ...fields } } : doc));
  };
  const opened: string[] = [];
  const runtime: KitRuntime = {
    ready,
    capabilities: { has: (name) => capabilities.has(name) },
    openLink: async (url) => {
      opened.push(url);
      return true;
    },
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
            const error = refusal(options.refuse, 'refused');
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
          if (options.reject) throw refusal(options.reject, 'The engine could not be reached. Try again.');
          const answer = outcome(fields);
          if (answer.verdict === 'applied') {
            apply(id, fields);
            publish([id]);
          }
          return answer;
        },
        delete: async (id) => {
          deletes.push(id);
          if (options.reject) throw refusal(options.reject, 'The engine could not be reached. Try again.');
          const answer = options.deleted ?? { verdict: 'applied' as const };
          if (answer.verdict === 'applied') {
            docs = docs.filter((doc) => doc.id !== id);
            publish([], [id]);
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
            if (options.reject) throw refusal(options.reject, 'The engine could not be reached. Try again.');
            // All or nothing: one verdict for the whole write, applied only when every op took.
            const answer = outcome(Object.assign({}, ...ops.map((op) => op.fields)));
            if (answer.verdict !== 'applied') return answer;
            for (const op of ops) apply(op.id, op.fields);
            publish(ops.map((op) => op.id));
            return answer;
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
    handshake: () => act(async () => handshake()),
    opened,
    merges,
    sets,
    deletes,
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
/** Opens the row actions of the row the reader is on, as Shift+F10 does, and picks Delete row. */
const askToDelete = (row: number) => {
  act(() => cell(row, 0).focus());
  fireEvent.keyDown(document.activeElement!, { key: 'F10', shiftKey: true });
  fireEvent.click(screen.getByRole('menuitem', { name: 'Delete row' }));
  return screen.getByRole('alertdialog', { name: 'Delete this row?' });
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
    await waitFor(() => expect(screen.getByText(KIT_SHEET_LABELS.noData)).toBeDefined());
    expect(fake.views.size).toBe(0);
  });

  test.each([
    ['forbidden', 'You do not have access to the \u201cvendors\u201d collection.'],
    ['not_found', 'This page has no collection named \u201cvendors\u201d.'],
    ['unavailable', 'The \u201cvendors\u201d collection could not be loaded. Reload the page to try again.'],
    ['capability_not_declared', 'The \u201cvendors\u201d collection could not be loaded. Reload the page to try again.'],
  ])('a subscription the runtime refuses with %s is said in place of the grid, never drawn as an empty sheet', async (code, said) => {
    const fake = fakeRuntime({ refuse: code });
    window.crewlet = fake.runtime;
    defineElements();
    document.body.innerHTML = `<crewlet-sheet collection="vendors"><crewlet-column field="vendor" label="Vendor"></crewlet-column></crewlet-sheet>`;
    await waitFor(() => expect(screen.getByText(said)).toBeDefined());
    expect(screen.queryByRole('grid')).toBeNull();
    expect(fake.views.size).toBe(0);
  });

  test('a write the runtime rejects, with nothing decided, is said on the cell and held until dismissed', async () => {
    const fake = fakeRuntime({ reject: 'unavailable' });
    window.crewlet = fake.runtime;
    defineElements();
    document.body.innerHTML = `<crewlet-sheet collection="vendors"><crewlet-column field="score" type="number" label="Score"></crewlet-column></crewlet-sheet>`;
    await waitFor(() => expect(spoken(cell(0, 0))).toBe('7.2'));
    act(() => cell(0, 0).focus());
    fireEvent.keyDown(document.activeElement!, { key: '9' });
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Score, 1' }), { key: 'Enter' });
    expect(fake.merges).toEqual([{ id: 'acme', fields: { score: 9 } }]);
    await waitFor(() => expect(cell(0, 0).className).toContain('crewlet-sheet-grid__cell--refused'));
    // Nothing was written, so the cell still reads the stored value.
    expect(spoken(cell(0, 0))).toContain('7.2');
    act(() => cell(0, 0).focus());
    await waitFor(() => expect(cell(0, 0).textContent).toContain('The engine could not be reached. Try again.'));
    expect(screen.getByText('1 change not saved')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    await waitFor(() => expect(screen.getByText('Saved')).toBeDefined());
  });

  test('a paste the engine refuses is refused whole: no cell of it is written, and each says why', async () => {
    const fake = fakeRuntime({ outcome: () => ({ verdict: 'invalid', reason: 'Vendor is too long.' }) });
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
    expect(fake.batches).toHaveLength(1);
    await waitFor(() => expect(cell(1, 0).className).toContain('crewlet-sheet-grid__cell--refused'));
    expect(cell(0, 0).className).toContain('crewlet-sheet-grid__cell--refused');
    expect(spoken(cell(0, 0))).toContain('Acme Corp');
    expect(spoken(cell(1, 0))).toContain('Globex');
    expect(screen.getByText('2 changes not saved')).toBeDefined();
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

  test('an Add row the runtime rejects says why and offers Retry, which writes a new row again', async () => {
    const fake = fakeRuntime();
    const store = fake.runtime.data.collection('vendors');
    fake.runtime.data.collection = () => ({
      ...store,
      set: async (id, fields) => {
        fake.sets.push({ id, fields });
        throw refusal('rate_limited', 'Too many writes. Wait 2 seconds.');
      },
    });
    window.crewlet = fake.runtime;
    defineElements();
    document.body.innerHTML = `<crewlet-sheet collection="vendors"><crewlet-column field="vendor" label="Vendor"></crewlet-column></crewlet-sheet>`;
    await waitFor(() => expect(cell(0, 0)).toBeDefined());
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /add row/i }));
    });
    await waitFor(() => expect(screen.getByText('Could not add a row. Too many writes. Wait 2 seconds.')).toBeDefined());
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    });
    expect(fake.sets).toHaveLength(2);
    expect(fake.sets[1]!.id).not.toBe(fake.sets[0]!.id);
  });

  test('Delete row asks first, then deletes the document through the runtime, and the row leaves', async () => {
    const fake = fakeRuntime();
    window.crewlet = fake.runtime;
    defineElements();
    document.body.innerHTML = `<crewlet-sheet collection="vendors"><crewlet-column field="vendor" label="Vendor"></crewlet-column></crewlet-sheet>`;
    await waitFor(() => expect(spoken(cell(0, 0))).toBe('Acme Corp'));
    const dialog = askToDelete(0);
    // Nothing is deleted until the reader answers.
    expect(fake.deletes).toEqual([]);
    expect(within(dialog).getByText('The row is removed for everyone who can open this page.')).toBeDefined();
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Delete row' }));
    });
    expect(fake.deletes).toEqual(['acme']);
    await waitFor(() => expect(spoken(cell(0, 0))).toBe('Globex'));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.getByText('Saved')).toBeDefined();
  });

  test('a cancelled Delete row deletes nothing', async () => {
    const fake = fakeRuntime();
    window.crewlet = fake.runtime;
    defineElements();
    document.body.innerHTML = `<crewlet-sheet collection="vendors"><crewlet-column field="vendor" label="Vendor"></crewlet-column></crewlet-sheet>`;
    await waitFor(() => expect(spoken(cell(0, 0))).toBe('Acme Corp'));
    fireEvent.click(within(askToDelete(0)).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(fake.deletes).toEqual([]);
    expect(spoken(cell(0, 0))).toBe('Acme Corp');
  });

  test.each([
    ['refused by the engine', { deleted: { verdict: 'forbidden' as const, reason: 'Only editors delete rows.' } }, 'You can view this sheet but not edit it.'],
    ['rejected with nothing decided', { reject: 'unavailable' }, 'The engine could not be reached. Try again.'],
  ])('a Delete row %s keeps the row, says why on it and holds the strip until dismissed', async (_, options, said) => {
    const fake = fakeRuntime(options);
    window.crewlet = fake.runtime;
    defineElements();
    document.body.innerHTML = `<crewlet-sheet collection="vendors"><crewlet-column field="vendor" label="Vendor"></crewlet-column></crewlet-sheet>`;
    await waitFor(() => expect(spoken(cell(0, 0))).toBe('Acme Corp'));
    const dialog = askToDelete(0);
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Delete row' }));
    });
    expect(fake.deletes).toEqual(['acme']);
    await waitFor(() => expect(cell(0, 0).className).toContain('crewlet-sheet-grid__cell--refused'));
    expect(spoken(cell(0, 0))).toContain('Acme Corp');
    act(() => cell(0, 0).focus());
    await waitFor(() => expect(cell(0, 0).textContent).toContain(said));
    expect(screen.getByText('1 change not saved')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    await waitFor(() => expect(screen.getByText('Saved')).toBeDefined());
    expect(cell(0, 0).className).not.toContain('crewlet-sheet-grid__cell--refused');
  });

  test('a viewer is offered no Delete row', async () => {
    const fake = fakeRuntime({ role: 'viewer' });
    window.crewlet = fake.runtime;
    defineElements();
    document.body.innerHTML = `<crewlet-sheet collection="vendors"><crewlet-column field="vendor" label="Vendor"></crewlet-column></crewlet-sheet>`;
    await waitFor(() => expect(sheetGrid().getAttribute('aria-readonly')).toBe('true'));
    act(() => cell(0, 0).focus());
    expect(screen.queryByRole('button', { name: /Row actions/ })).toBeNull();
  });

  test('the sheet is as tall as its rows, so no empty slab sits under Add row', async () => {
    const fake = fakeRuntime({});
    window.crewlet = fake.runtime;
    defineElements();
    document.body.innerHTML = `<crewlet-sheet collection="vendors"><crewlet-column field="vendor" label="Vendor"></crewlet-column></crewlet-sheet>`;
    await waitFor(() => expect(sheetGrid().closest('.crewlet-sheet-grid')?.className).toContain('crewlet-sheet-grid--fit-content'));
  });

  test('a sheet the reader cannot edit says nothing about saving', async () => {
    const fake = fakeRuntime({ role: 'viewer' });
    window.crewlet = fake.runtime;
    defineElements();
    document.body.innerHTML = `<crewlet-sheet collection="vendors"><crewlet-column field="vendor" label="Vendor"></crewlet-column></crewlet-sheet>`;
    await waitFor(() => expect(sheetGrid().getAttribute('aria-readonly')).toBe('true'));
    expect(screen.queryByText('Saved')).toBeNull();
  });

  test('a link in a url cell is opened through the host, since the frame cannot open a window', async () => {
    const fake = fakeRuntime({ docs: [{ id: 'acme', data: { vendor: 'Acme Corp', site: 'https://acme.example.com/' } }] });
    window.crewlet = fake.runtime;
    defineElements();
    document.body.innerHTML = `<crewlet-sheet collection="vendors"><crewlet-column field="vendor" label="Vendor"></crewlet-column><crewlet-column field="site" type="url" label="Website"></crewlet-column></crewlet-sheet>`;
    const link = await screen.findByRole('link', { name: 'https://acme.example.com/' });
    fireEvent.click(link);
    expect(fake.opened).toEqual(['https://acme.example.com/']);
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
    // The sheet's stack is who is in it: Sam, on another collection, is in the
    // page's room, which the dashboard's bar draws, and not in this sheet.
    expect(screen.getByRole('img', { name: /^1 other person is in this sheet\. Jane Founder/ })).toBeDefined();
    expect(screen.queryByRole('img', { name: /are here/ })).toBeNull();
    act(() => cell(0, 1).focus());
    expect(fake.presenceSets.at(-1)).toEqual({ activity: 'viewing', focus: { collection: 'vendors', doc: 'acme', field: 'score' } });
  });

  test('a sheet nobody else is in draws no stack, however full the room', async () => {
    const fake = fakeRuntime();
    window.crewlet = fake.runtime;
    defineElements();
    document.body.innerHTML = `<crewlet-sheet collection="vendors"><crewlet-column field="vendor" label="Vendor"></crewlet-column></crewlet-sheet>`;
    await waitFor(() => expect(cell(0, 0)).toBeDefined());
    fake.members([
      member('sam-1', 'sam', 'Sam Lee', 'editing', { collection: 'notes', doc: 'x', field: 'y' }),
      member('ada-1', 'ada', 'Ada', 'viewing', {}),
    ]);
    expect(document.querySelector('.crewlet-kit-sheet__presence')).toBeNull();
    expect(document.querySelector('.crewlet-presence-ring')).toBeNull();
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

  test('whenRuntime waits for the handshake of a runtime installed before it', async () => {
    const fake = fakeRuntime({ held: true });
    window.crewlet = fake.runtime;
    let found: KitRuntime | null = null;
    void whenRuntime().then((runtime) => {
      found = runtime;
    });
    await act(async () => {});
    expect(found).toBeNull();
    await fake.handshake();
    expect(found).toBe(fake.runtime);
  });

  test('a sheet over a runtime still shaking hands waits, rather than saying the page declared no db', async () => {
    const fake = fakeRuntime({ held: true });
    window.crewlet = fake.runtime;
    const host = document.createElement('div');
    document.body.append(host);
    const mounted = mountSheet(host, { collection: 'vendors', columns: [{ field: 'vendor', label: 'Vendor', type: 'text' }], label: 'Vendors' });
    await act(async () => {});
    expect(screen.queryByText(KIT_SHEET_LABELS.noData)).toBeNull();
    expect(screen.queryByRole('grid')).toBeNull();
    await fake.handshake();
    await waitFor(() => expect(screen.getByRole('grid', { name: 'Vendors' })).toBeDefined());
    expect(screen.queryByText(KIT_SHEET_LABELS.noData)).toBeNull();
    await act(async () => mounted.unmount());
  });

  test('a sheet drawn before the handshake reads the runtime again once it lands', async () => {
    const fake = fakeRuntime({ held: true });
    render(<KitSheet runtime={fake.runtime} collection="vendors" columns={[{ field: 'vendor', label: 'Vendor', type: 'text' }]} sort={null} label="Vendors" />);
    await act(async () => {});
    // Before the handshake the runtime declares nothing: that is not the page declaring no db.
    expect(screen.queryByText(KIT_SHEET_LABELS.noData)).toBeNull();
    expect(screen.queryByRole('grid')).toBeNull();
    await fake.handshake();
    await waitFor(() => expect(screen.getByRole('grid', { name: 'Vendors' })).toBeDefined());
    expect(screen.queryByText(KIT_SHEET_LABELS.noData)).toBeNull();
  });

  test('a sheet drawn before the handshake takes the handshake\'s word over what the page loaded with', async () => {
    // The origin said db as the page loaded, and the host's handshake says otherwise.
    const fake = fakeRuntime({ held: true, early: ['db'], capabilities: ['presence'] });
    render(<KitSheet runtime={fake.runtime} collection="vendors" columns={[{ field: 'vendor', label: 'Vendor', type: 'text' }]} sort={null} label="Vendors" />);
    await waitFor(() => expect(screen.getByRole('grid', { name: 'Vendors' })).toBeDefined());
    await fake.handshake();
    await waitFor(() => expect(screen.getByText(KIT_SHEET_LABELS.noData)).toBeDefined());
    expect(screen.queryByRole('grid')).toBeNull();
  });

  test('a sheet whose runtime finished its handshake before it was drawn says a page with no db at once', async () => {
    const fake = fakeRuntime({ capabilities: ['presence'] });
    render(<KitSheet runtime={fake.runtime} collection="vendors" columns={[{ field: 'vendor', label: 'Vendor', type: 'text' }]} sort={null} label="Vendors" />);
    await waitFor(() => expect(screen.getByText(KIT_SHEET_LABELS.noData)).toBeDefined());
  });

  test('a sheet handed its runtime waits for that runtime\'s handshake too', async () => {
    const fake = fakeRuntime({ held: true });
    const host = document.createElement('div');
    document.body.append(host);
    const mounted = mountSheet(host, { collection: 'vendors', columns: [{ field: 'vendor', label: 'Vendor', type: 'text' }], label: 'Vendors', runtime: fake.runtime });
    await act(async () => {});
    expect(screen.queryByText(KIT_SHEET_LABELS.noData)).toBeNull();
    await fake.handshake();
    await waitFor(() => expect(screen.getByRole('grid', { name: 'Vendors' })).toBeDefined());
    await act(async () => mounted.unmount());
  });
});

describe('bindings', () => {
  test('the members in a sheet are those whose focus is in its collection', () => {
    const members = [
      member('a', 'jane', 'Jane', 'viewing', { collection: 'vendors', doc: 'acme', field: 'score' }),
      member('b', 'sam', 'Sam', 'viewing', { collection: 'notes', doc: 'x', field: 'y' }),
      member('c', 'ada', 'Ada', 'viewing', { region: 'chart' }),
    ];
    expect(membersIn(members, 'vendors').map((m) => m.session)).toEqual(['a']);
    expect(membersIn(members, 'tasks')).toEqual([]);
  });


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
