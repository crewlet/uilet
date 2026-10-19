/**
 * A document's tabs arranged by an editor: renamed at their fields, opened,
 * moved, removed and added, every change reported to the host that owns
 * them, and the last tab never removed.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { useState } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { DocTabsEditor, type DocTabsEditorItem } from './index.js';

afterEach(cleanup);

const TABS: DocTabsEditorItem[] = [
  { key: 'tabs/plan.md', title: 'Plan' },
  { key: 'tabs/risks.md', title: 'Risks' },
];

function Host({ onAdd = vi.fn() }: { onAdd?: (title: string) => void }) {
  const [items, setItems] = useState(TABS);
  const [selected, setSelected] = useState('tabs/plan.md');
  return (
    <main>
      <DocTabsEditor
        label="Tabs of the plan"
        items={items}
        selected={selected}
        onSelect={setSelected}
        onRename={(key, title) => setItems(items.map((t) => (t.key === key ? { ...t, title } : t)))}
        onReorder={(keys) => setItems(keys.map((k) => items.find((t) => t.key === k)!))}
        onRemove={(key) => setItems(items.filter((t) => t.key !== key))}
        onAdd={onAdd}
        titleProblem={(title) => (title.trim() === '' ? 'Give the tab a title.' : null)}
      />
    </main>
  );
}

const titles = () => screen.getAllByRole('textbox', { name: /Title of tab/ }).map((i) => (i as HTMLInputElement).value);

test('renames at the field, and says a title the host refuses beside it', () => {
  render(<Host />);
  const first = screen.getByRole('textbox', { name: 'Title of tab 1' });
  fireEvent.change(first, { target: { value: 'The plan' } });
  expect(titles()).toEqual(['The plan', 'Risks']);
  fireEvent.change(first, { target: { value: ' ' } });
  expect(first.getAttribute('aria-invalid')).toBe('true');
  expect(screen.getByText('Give the tab a title.')).toBeDefined();
});

test('opens a tab, moves it and removes it, and never removes the last', () => {
  render(<Host />);
  const open = screen.getByRole('button', { name: 'Edit the text of Risks' });
  fireEvent.click(open);
  expect(open.getAttribute('aria-pressed')).toBe('true');
  fireEvent.click(screen.getByRole('button', { name: 'Move Risks up' }));
  expect(titles()).toEqual(['Risks', 'Plan']);
  fireEvent.click(screen.getByRole('button', { name: 'Remove Plan' }));
  expect(titles()).toEqual(['Risks']);
  const last = screen.getByRole('button', { name: 'Remove Risks' });
  fireEvent.click(last);
  expect(titles()).toEqual(['Risks']);
  expect(last.getAttribute('aria-disabled')).toBe('true');
});

test('adds a tab by its title, from the button or Enter, and waits for a title', () => {
  const onAdd = vi.fn();
  render(<Host onAdd={onAdd} />);
  const field = screen.getByRole('textbox', { name: 'New tab title' });
  fireEvent.click(screen.getByRole('button', { name: /Add tab/ }));
  expect(onAdd).not.toHaveBeenCalled();
  fireEvent.change(field, { target: { value: ' Budget ' } });
  fireEvent.keyDown(field, { key: 'Enter' });
  expect(onAdd).toHaveBeenCalledWith('Budget');
  expect((field as HTMLInputElement).value).toBe('');
});

test('carries no axe violation', async () => {
  const { container } = render(<Host />);
  const result = await axe.run(container, { rules: { region: { enabled: false } } });
  expect(result.violations).toEqual([]);
});
