/**
 * A document's tabs arranged by an editor: opened by their titles, renamed in
 * place, moved, removed and added from each row's menu and the list's Add,
 * every change reported to the host that owns them, a new tab named before it
 * is added, and the last tab never removed.
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

const titles = () => screen.getAllByRole('listitem').map((li) => li.querySelector('button.crewlet-doc-tabs-editor__open')?.textContent);
const act = (tab: string, action: string) => {
  fireEvent.click(screen.getByRole('button', { name: `Actions for ${tab}` }));
  fireEvent.click(screen.getByRole('menuitem', { name: action }));
};

test('renames in place from the menu, keeps the title on Enter, and says a title the host refuses', () => {
  render(<Host />);
  act('Plan', 'Rename');
  const field = screen.getByRole('textbox', { name: 'Title of tab 1' });
  expect(document.activeElement).toBe(field);
  fireEvent.change(field, { target: { value: 'The plan' } });
  fireEvent.keyDown(field, { key: 'Enter' });
  expect(screen.queryByRole('textbox', { name: 'Title of tab 1' })).toBeNull();
  expect(titles()).toEqual(['The plan', 'Risks']);
  act('The plan', 'Rename');
  const again = screen.getByRole('textbox', { name: 'Title of tab 1' });
  fireEvent.change(again, { target: { value: ' ' } });
  expect(again.getAttribute('aria-invalid')).toBe('true');
  expect(screen.getByText('Give the tab a title.')).toBeDefined();
});

test('puts back the title a rename started from on Escape', () => {
  render(<Host />);
  fireEvent.doubleClick(screen.getByRole('button', { name: 'Risks' }));
  const field = screen.getByRole('textbox', { name: 'Title of tab 2' });
  fireEvent.change(field, { target: { value: 'Threats' } });
  fireEvent.keyDown(field, { key: 'Escape' });
  expect(titles()).toEqual(['Plan', 'Risks']);
});

test('opens a tab, moves it and removes it, and never removes the last', () => {
  render(<Host />);
  const open = screen.getByRole('button', { name: 'Risks' });
  fireEvent.click(open);
  expect(open.getAttribute('aria-current')).toBe('true');
  expect(screen.getByRole('button', { name: 'Plan' }).getAttribute('aria-current')).toBeNull();
  act('Risks', 'Move up');
  expect(titles()).toEqual(['Risks', 'Plan']);
  act('Plan', 'Remove');
  expect(titles()).toEqual(['Risks']);
  fireEvent.click(screen.getByRole('button', { name: 'Actions for Risks' }));
  const last = screen.getByRole('menuitem', { name: 'Remove' });
  expect(last.getAttribute('aria-disabled')).toBe('true');
  fireEvent.click(last);
  expect(titles()).toEqual(['Risks']);
});

test('names a new tab before adding it, and adds nothing for an empty title or Escape', () => {
  const onAdd = vi.fn();
  render(<Host onAdd={onAdd} />);
  expect(screen.queryByRole('textbox', { name: 'New tab title' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Add tab' }));
  const field = screen.getByRole('textbox', { name: 'New tab title' });
  expect(document.activeElement).toBe(field);
  // Under the open tab, where the new tab will land.
  expect(field.closest('li')?.previousElementSibling?.textContent).toContain('Plan');
  fireEvent.keyDown(field, { key: 'Enter' });
  expect(onAdd).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Add tab' }));
  const typed = screen.getByRole('textbox', { name: 'New tab title' });
  fireEvent.change(typed, { target: { value: 'Draft' } });
  fireEvent.keyDown(typed, { key: 'Escape' });
  expect(onAdd).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Add tab' }));
  const named = screen.getByRole('textbox', { name: 'New tab title' });
  fireEvent.change(named, { target: { value: ' Budget ' } });
  fireEvent.keyDown(named, { key: 'Enter' });
  expect(onAdd).toHaveBeenCalledWith('Budget');
  expect(screen.queryByRole('textbox', { name: 'New tab title' })).toBeNull();
});

test('says why no tab can be added on Add itself', () => {
  render(
    <DocTabsEditor
      label="Tabs of the plan"
      items={TABS}
      selected="tabs/plan.md"
      onSelect={vi.fn()}
      onRename={vi.fn()}
      onReorder={vi.fn()}
      onRemove={vi.fn()}
      onAdd={vi.fn()}
      addBlocked="A doc holds at most 32 tabs."
    />,
  );
  const add = screen.getByRole('button', { name: 'Add tab' });
  expect(add.getAttribute('aria-disabled')).toBe('true');
  fireEvent.click(add);
  expect(screen.queryByRole('textbox', { name: 'New tab title' })).toBeNull();
});

test('carries no axe violation', async () => {
  const { container } = render(<Host />);
  const result = await axe.run(container, { rules: { region: { enabled: false } } });
  expect(result.violations).toEqual([]);
});
