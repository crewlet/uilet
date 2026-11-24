import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, expect, test } from 'vitest';
import { Modal } from '../Modal/index.js';
import { Select } from '../Select/index.js';
import { TreeGrid } from '../TreeGrid/index.js';
import { LayerHost } from './index.js';

afterEach(cleanup);

const COLUMNS = [
  { key: 'name', header: 'Name' },
  { key: 'pick', header: 'Runs on' },
];

/** A grid whose second cell opens a dialog, or holds a picker. */
function Grid({ cell }: { cell: 'dialog' | 'select' }) {
  const [open, setOpen] = useState(false);
  return (
    <TreeGrid
      label="Who runs"
      columns={COLUMNS}
      rows={[{ id: 'advisor', label: 'Advisor' }]}
      cellHasControl={() => true}
      renderCell={(id, column) =>
        column === 1 ? (
          id
        ) : cell === 'dialog' ? (
          <>
            <button type="button" onClick={() => setOpen(true)}>
              Move
            </button>
            <Modal open={open} onClose={() => setOpen(false)} title="Move Advisor?">
              <p>Moves at its next turn.</p>
            </Modal>
          </>
        ) : (
          <Select ariaLabel="Model" value="a" options={[{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }]} onChange={() => {}} />
        )
      }
    />
  );
}

const gridHost = () => document.querySelector('.crewlet-tree-grid__layer')!;

test('a dialog opened in a tree grid cell sits over the screen, not inside the grid', () => {
  render(<Grid cell="dialog" />);
  fireEvent.click(screen.getByRole('button', { name: 'Move' }));
  const dialog = screen.getByRole('dialog', { name: 'Move Advisor?' });
  const overlay = dialog.closest('.crewlet-modal-overlay')!;
  expect(overlay.parentElement).toBe(document.body);
  expect(overlay.classList.contains('crewlet-modal-overlay--fixed')).toBe(true);
  expect(gridHost().contains(dialog)).toBe(false);
});

test('a host that takes all layers, a fullscreen surface, still holds its own dialog', () => {
  function Surface() {
    return (
      <LayerHost className="surface">
        <Modal open onClose={() => {}} title="Inside">
          <p>Held by the surface.</p>
        </Modal>
      </LayerHost>
    );
  }
  render(<Surface />);
  const overlay = screen.getByRole('dialog', { name: 'Inside' }).closest('.crewlet-modal-overlay')!;
  expect(overlay.parentElement!.classList.contains('surface')).toBe(true);
  expect(overlay.classList.contains('crewlet-modal-overlay--in-host')).toBe(true);
});

test('a dialog in a tree grid inside a fullscreen surface goes to the surface, past the grid', () => {
  render(
    <LayerHost className="surface">
      <Grid cell="dialog" />
    </LayerHost>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Move' }));
  const overlay = screen.getByRole('dialog').closest('.crewlet-modal-overlay')!;
  expect(overlay.parentElement!.classList.contains('surface')).toBe(true);
});

test('a picker opened in a tree grid cell still opens in the grid\'s own host', () => {
  render(<Grid cell="select" />);
  act(() => {
    fireEvent.click(screen.getByRole('combobox', { name: 'Model' }));
  });
  const list = screen.getByRole('listbox');
  expect(gridHost().contains(list)).toBe(true);
  expect(gridHost().getAttribute('data-takes')).toBe('anchored');
});
