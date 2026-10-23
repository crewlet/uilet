/**
 * SettingsTable: a read-only table of settings, announced as a table whose
 * rows are headed by the setting's name.
 */

import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { SettingsTable } from './index.js';

afterEach(cleanup);

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
  expect(within(row).getByRole('rowheader').textContent).toBe('Tool rounds per runturn_engine.max_tool_rounds');
  expect(within(row).getAllByRole('cell').map((cell) => cell.textContent)).toEqual([
    '32',
    'Set in the company document',
  ]);
});

test('draws the key in the monospace element, under the name', () => {
  const { container } = limits();
  const keys = [...container.querySelectorAll('code.crewlet-settings-table__key')].map((key) => key.textContent);
  expect(keys).toEqual(['turn_engine.max_iterations', 'turn_engine.max_tool_rounds']);
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
