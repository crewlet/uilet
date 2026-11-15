/**
 * SettingsTable: a read-only table of settings, announced as a table whose
 * rows are headed by the setting's name.
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

test('is a table named by its caller, with three named columns', () => {
  limits();
  const table = screen.getByRole('table', { name: 'Guardrails on every turn' });
  expect(within(table).getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual([
    'Setting',
    'Value',
    'Source',
  ]);
});

test('heads each row with the setting, and gives its value and source as cells', () => {
  limits();
  const row = screen.getByRole('row', { name: /Tool rounds per run/ });
  expect(within(row).getByRole('rowheader').textContent).toBe('Tool rounds per run');
  expect(within(row).getAllByRole('cell').map((cell) => cell.textContent)).toEqual([
    '32',
    'Set in the company document',
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

test('hides the column names from the eye unless asked to draw them, and never from assistive technology', () => {
  const hidden = limits();
  expect(hidden.container.querySelector('.crewlet-settings-table__head--hidden')).not.toBeNull();
  cleanup();
  const drawn = limits(true);
  expect(drawn.container.querySelector('.crewlet-settings-table__head--hidden')).toBeNull();
  expect(screen.getAllByRole('columnheader')).toHaveLength(3);
});

test('takes the column names it is given', () => {
  render(
    <SettingsTable aria-label="Retention" columns={{ setting: 'Rule', source: 'Origin' }}>
      <SettingsTable.Row label="Events kept">30 days</SettingsTable.Row>
    </SettingsTable>,
  );
  expect(screen.getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual(['Rule', 'Value', 'Origin']);
});
