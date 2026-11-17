/**
 * SettingsTable: a table of settings on DataGrid's anatomy, announced as a
 * table whose rows are headed by the setting's name, with its controls and
 * the reset to the default at the row's end.
 */

import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { SettingsTable } from './index.js';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/** Give the table the Clipboard API, and report what it was handed. */
function withClipboard(): { written: string[] } {
  const state: { written: string[] } = { written: [] };
  vi.stubGlobal('navigator', {
    ...globalThis.navigator,
    clipboard: {
      writeText: (text: string) => {
        state.written.push(text);
        return Promise.resolve();
      },
    },
  });
  return state;
}

function limits(header?: boolean) {
  return render(
    <SettingsTable aria-label="Guardrails on every turn" header={header}>
      <SettingsTable.Row label="Review rounds per turn" settingKey="turn_engine.max_iterations" source="Default">
        3
      </SettingsTable.Row>
      <SettingsTable.Row
        label="Tool rounds per run"
        settingKey="turn_engine.max_tool_rounds"
        source="Set in the company document"
        changed
      >
        32
      </SettingsTable.Row>
    </SettingsTable>,
  );
}

test('is a table named by its caller, with four named columns', () => {
  limits();
  const table = screen.getByRole('table', { name: 'Guardrails on every turn' });
  expect(within(table).getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual([
    'Setting',
    'Value',
    'Source',
    'Actions',
  ]);
});

test("draws DataGrid's head, rows and cells", () => {
  const { container } = limits();
  const table = container.querySelector('[role="table"]')!;
  expect(table.classList.contains('crewlet-data-grid')).toBe(true);
  expect(table.querySelector(':scope > .crewlet-data-grid__head')!.querySelectorAll('.crewlet-data-grid__th')).toHaveLength(4);
  const rows = table.querySelectorAll('.crewlet-data-grid__body > .crewlet-data-grid__row');
  expect(rows).toHaveLength(2);
  for (const row of rows) expect(row.querySelectorAll(':scope > .crewlet-data-grid__cell')).toHaveLength(4);
});

test('heads each row with the setting, and gives its value and source as cells', () => {
  limits();
  const row = screen.getByRole('row', { name: /Tool rounds per run/ });
  expect(within(row).getByRole('rowheader').textContent).toBe('Tool rounds per run');
  expect(within(row).getAllByRole('cell').map((cell) => cell.textContent)).toEqual([
    '32',
    'Set in the company document',
    '',
  ]);
});

test('speaks the setting by its name, and keeps the key behind a control that copies it', async () => {
  // The key was a monospace line under every name, so a settings page read
  // as its configuration file. It is a control now: named with the key, its
  // tooltip the key, and nothing of the document's spelling drawn as words.
  const clipboard = withClipboard();
  const { container } = limits();
  expect(container.querySelector('code')).toBeNull();
  expect(container.textContent).not.toContain('turn_engine.max_iterations');
  const row = screen.getByRole('row', { name: /Review rounds per turn/ });
  const copy = within(row).getByRole('button', { name: "Copy the setting's key, turn_engine.max_iterations" });
  await act(async () => {
    fireEvent.click(copy);
  });
  expect(clipboard.written).toEqual(['turn_engine.max_iterations']);
  // The copy says it landed, in words a screen reader hears.
  expect(within(row).getByRole('status').textContent).toBe('turn_engine.max_iterations copied to the clipboard');
});

test('draws no copy control for a setting with no key', () => {
  render(
    <SettingsTable aria-label="Retention">
      <SettingsTable.Row label="Events kept">30 days</SettingsTable.Row>
    </SettingsTable>,
  );
  expect(screen.queryByRole('button')).toBeNull();
});

test('marks only the row whose value differs from its default', () => {
  const { container } = limits();
  const rows = [...container.querySelectorAll('.crewlet-settings-table__body > [role="row"]')];
  expect(rows.map((row) => row.hasAttribute('data-changed'))).toEqual([false, true]);
  expect(rows.map((row) => row.querySelector('.crewlet-status-dot') !== null)).toEqual([false, true]);
  // The mark is decoration: the source's words say what it means.
  expect(rows[1]!.querySelector('.crewlet-status-dot')!.getAttribute('aria-hidden')).toBe('true');
});

test('draws the column heads unless told not to, and never hides them from assistive technology', () => {
  const drawn = limits();
  expect(drawn.container.querySelector('.crewlet-settings-table__head--hidden')).toBeNull();
  cleanup();
  const hidden = limits(false);
  expect(hidden.container.querySelector('.crewlet-settings-table__head--hidden')).not.toBeNull();
  expect(screen.getAllByRole('columnheader')).toHaveLength(4);
});

test('takes the column names it is given', () => {
  render(
    <SettingsTable aria-label="Retention" columns={{ setting: 'Rule', source: 'Origin' }}>
      <SettingsTable.Row label="Events kept">30 days</SettingsTable.Row>
    </SettingsTable>,
  );
  expect(screen.getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual([
    'Rule',
    'Value',
    'Origin',
    'Actions',
  ]);
});

/** A row whose value differs from its default, with a pencil at its end. */
function resettable(onReset: () => void, changed = true) {
  return render(
    <SettingsTable aria-label="Sessions">
      <SettingsTable.Row
        label="Signed out when unused for"
        source="Changed from 12 hours"
        changed={changed}
        defaultLabel="12 hours"
        onReset={onReset}
        actions={<button type="button">Change</button>}
      >
        2 hours
      </SettingsTable.Row>
    </SettingsTable>,
  );
}

test("puts the row's controls in its last cell, at its end", () => {
  resettable(() => undefined);
  const row = screen.getByRole('row', { name: /Signed out when unused for/ });
  const cells = within(row).getAllByRole('cell');
  const last = cells[cells.length - 1]!;
  expect(within(last).getAllByRole('button').map((b) => b.getAttribute('aria-label') ?? b.textContent)).toEqual([
    'Reset to default',
    'Change',
  ]);
});

test('offers the reset only while the value differs from its default', () => {
  resettable(() => undefined, false);
  expect(screen.queryByRole('button', { name: 'Reset to default' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Change' })).toBeTruthy();
});

test('asks inline before it resets, and resets only on the answer', () => {
  const onReset = vi.fn();
  resettable(onReset);
  fireEvent.click(screen.getByRole('button', { name: 'Reset to default' }));
  expect(onReset).not.toHaveBeenCalled();
  const row = screen.getByRole('row', { name: /Signed out when unused for/ });
  expect(row.textContent).toContain('Reset to 12 hours?');
  // The question takes the controls' place, and its answer has the focus.
  expect(within(row).queryByRole('button', { name: 'Change' })).toBeNull();
  const confirm = within(row).getByRole('button', { name: 'Reset' });
  expect(document.activeElement).toBe(confirm);
  fireEvent.click(confirm);
  expect(onReset).toHaveBeenCalledTimes(1);
  expect(row.textContent).not.toContain('Reset to 12 hours?');
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Reset to default' }));
});

test('Cancel and Escape put the question away without resetting', () => {
  const onReset = vi.fn();
  resettable(onReset);
  fireEvent.click(screen.getByRole('button', { name: 'Reset to default' }));
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.queryByRole('button', { name: 'Reset' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Reset to default' }));
  fireEvent.keyDown(screen.getByRole('button', { name: 'Reset' }), { key: 'Escape' });
  expect(screen.queryByRole('button', { name: 'Reset' })).toBeNull();
  expect(onReset).not.toHaveBeenCalled();
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Reset to default' }));
});

test('hands the focus to the next control once the reset it was on goes', () => {
  const view = resettable(() => undefined);
  screen.getByRole('button', { name: 'Reset to default' }).focus();
  view.rerender(
    <SettingsTable aria-label="Sessions">
      <SettingsTable.Row
        label="Signed out when unused for"
        source="Default"
        defaultLabel="12 hours"
        onReset={() => undefined}
        actions={<button type="button">Change</button>}
      >
        12 hours
      </SettingsTable.Row>
    </SettingsTable>,
  );
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Change' }));
});

test('draws the reset held with its reason for a reader who may not change it', () => {
  const onReset = vi.fn();
  render(
    <SettingsTable aria-label="Sessions">
      <SettingsTable.Row label="Signed out when unused for" changed onReset={onReset} resetHeld="Only an admin changes this.">
        2 hours
      </SettingsTable.Row>
    </SettingsTable>,
  );
  const reset = screen.getByRole('button', { name: 'Reset to default' });
  expect(reset.getAttribute('aria-disabled')).toBe('true');
  fireEvent.click(reset);
  expect(screen.queryByRole('button', { name: 'Reset' })).toBeNull();
  expect(onReset).not.toHaveBeenCalled();
});
