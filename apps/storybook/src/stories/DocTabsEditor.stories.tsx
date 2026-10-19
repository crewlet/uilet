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
 * A handbook's tabs as its editor arranges them: titles edited in place, the
 * open tab marked, moved by handle, arrow keys or buttons, removed, and a new
 * tab added after the open one. The last tab cannot be removed.
 */
export const Handbook: Story = {
  render: function Render() {
    const [items, setItems] = useState<DocTabsEditorItem[]>([
      { key: 'tabs/start.md', title: 'Start here' },
      { key: 'tabs/paging.md', title: 'Paging' },
      { key: 'tabs/handover.md', title: 'Handover' },
    ]);
    const [selected, setSelected] = useState('tabs/start.md');
    return (
      <div style={{ maxWidth: 420 }}>
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
