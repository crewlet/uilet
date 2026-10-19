import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { DocTabsEditor, type DocTabsEditorItem } from '@crewlethq/ui';

const meta: Meta<typeof DocTabsEditor> = {
  title: 'UI/DocTabsEditor',
  component: DocTabsEditor,
};

export default meta;
type Story = StoryObj<typeof DocTabsEditor>;

/**
 * A handbook's tabs as its editor arranges them, at the width of the column it
 * stands in: the open tab filled, each row's handle and menu shown under the
 * pointer, a title renamed in place from the menu (or a double press), moved by
 * handle, arrow keys or the menu, removed, and a new tab named under the open
 * one before it is added. The last tab cannot be removed, and a title wraps
 * rather than being cut.
 */
export const Handbook: Story = {
  render: function Render() {
    const [items, setItems] = useState<DocTabsEditorItem[]>([
      { key: 'tabs/start.md', title: 'Start here' },
      { key: 'tabs/paging.md', title: 'Paging' },
      { key: 'tabs/handover.md', title: 'Handover' },
      { key: 'tabs/escalation.md', title: 'Escalation paths for incidents that cross two teams' },
    ]);
    const [selected, setSelected] = useState('tabs/start.md');
    return (
      <div style={{ maxWidth: 260 }}>
        <DocTabsEditor
          label="Tabs of On-call handbook"
          items={items}
          selected={selected}
          onSelect={setSelected}
          onRename={(key, title) => setItems(items.map((t) => (t.key === key ? { ...t, title } : t)))}
          onReorder={(keys) => setItems(keys.map((k) => items.find((t) => t.key === k)!))}
          onRemove={(key) => setItems(items.filter((t) => t.key !== key))}
          onAdd={(title) => {
            const key = `tabs/${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`;
            const at = items.findIndex((t) => t.key === selected) + 1;
            setItems([...items.slice(0, at), { key, title }, ...items.slice(at)]);
            setSelected(key);
          }}
          titleProblem={(title) => (title.trim() === '' ? 'Give the tab a title.' : null)}
        />
      </div>
    );
  },
};
