import type { Meta, StoryObj } from '@storybook/react-vite';
import { useRef, useState } from 'react';
import {
  Announcer,
  ArtifactCard,
  ArtifactNameCell,
  Button,
  DataGrid,
  SelectionBar,
  type ArtifactKind,
  type DataGridColumn,
} from '@crewlethq/ui';
import { FolderInputGlyph, ListChecksGlyph, TrashGlyph } from '@crewlethq/icons/glyphs';

const meta: Meta<typeof SelectionBar> = {
  title: 'UI/SelectionBar',
  component: SelectionBar,
};

export default meta;
type Story = StoryObj<typeof SelectionBar>;

const NOW = Date.parse('2026-10-24T12:00:00Z');

interface Item {
  id: string;
  title: string;
  kind: ArtifactKind;
  mine: boolean;
}

const ITEMS: Item[] = [
  { id: 'a', title: 'Launch plan', kind: 'doc', mine: true },
  { id: 'b', title: 'Launch budget', kind: 'sheet', mine: true },
  { id: 'c', title: 'Pricing explorer', kind: 'html', mine: false },
  { id: 'd', title: 'Launch deck', kind: 'slides', mine: true },
  { id: 'e', title: 'Delivery board', kind: 'dashboard', mine: false },
  { id: 'f', title: 'Brand moodboard', kind: 'design', mine: true },
];

/** The bulk actions a gallery offers, each disabled with its reason when only some picks allow it. */
function Actions({ picked }: { picked: ReadonlySet<string> }) {
  const mine = ITEMS.filter((item) => picked.has(item.id) && item.mine).length;
  return (
    <>
      <Button size="small" variant="secondary" leadingIcon={<FolderInputGlyph size="sm" />}>
        Move to…
      </Button>
      <Button
        size="small"
        variant="ghost"
        leadingIcon={<TrashGlyph size="sm" />}
        disabledReason={mine < picked.size ? `You own ${mine} of ${picked.size}` : undefined}
      >
        Move to the trash
      </Button>
    </>
  );
}

/**
 * A GALLERY CHOOSING: the toolbar's Select toggle puts every card in choosing
 * mode (a press anywhere on a card ticks it), the bar appears with the count
 * and the bulk actions, and Shift with a box picks the range from the box
 * pressed before it. Clear empties the selection and hands focus back to the
 * Select toggle. The count is said politely as it changes.
 */
export const Gallery: Story = {
  render: function Render() {
    const [selecting, setSelecting] = useState(false);
    const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());
    const anchor = useRef<string | null>(null);
    const toggle = useRef<HTMLButtonElement>(null);
    const pick = (id: string, on: boolean, range: boolean) => {
      const next = new Set(picked);
      const to = ITEMS.findIndex((item) => item.id === id);
      const from = range && anchor.current ? ITEMS.findIndex((item) => item.id === anchor.current) : -1;
      const span = from >= 0 ? ITEMS.slice(Math.min(from, to), Math.max(from, to) + 1) : [ITEMS[to]!];
      for (const item of span) {
        if (on) next.add(item.id);
        else next.delete(item.id);
      }
      anchor.current = id;
      setPicked(next);
    };
    const choosing = selecting || picked.size > 0;
    return (
      <div style={{ display: 'grid', gap: 16, maxWidth: 1140 }}>
        <Announcer />
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            ref={toggle}
            size="small"
            variant="secondary"
            pressed={selecting}
            leadingIcon={<ListChecksGlyph size="sm" />}
            onClick={() => setSelecting((on) => !on)}
          >
            Select
          </Button>
        </div>
        <SelectionBar
          count={picked.size}
          onClear={() => {
            setPicked(new Set());
            setSelecting(false);
          }}
          returnFocusRef={toggle}
        >
          <Actions picked={picked} />
        </SelectionBar>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '24px 20px' }}>
          {ITEMS.map((item) => (
            <ArtifactCard
              key={item.id}
              title={item.title}
              kind={item.kind}
              href={`#/artifacts/${item.id}`}
              updatedAt={NOW - 3_600_000}
              now={NOW}
              access={item.mine ? 'private' : 'company'}
              selectable
              selecting={choosing}
              selected={picked.has(item.id)}
              onSelectedChange={(on, { range }) => pick(item.id, on, range)}
            />
          ))}
        </div>
      </div>
    );
  },
};

const COLUMNS: DataGridColumn<Item>[] = [
  { key: 'name', header: 'Name', floor: '14rem', phoneLead: true, cell: (item) => <ArtifactNameCell kind={item.kind} title={item.title} /> },
  { key: 'owner', header: 'Owner', shrink: true, cell: (item) => (item.mine ? 'You' : 'Maya Chen') },
];

/**
 * THE LIST SHAPE: the grid's selection column, a box on every row and one in
 * the head that is mixed while some rows are picked. Shift with a box picks
 * the range.
 */
export const List: Story = {
  render: function Render() {
    const [picked, setPicked] = useState<ReadonlySet<string>>(new Set(['b']));
    return (
      <div style={{ display: 'grid', gap: 16, maxWidth: 820 }}>
        <Announcer />
        <SelectionBar count={picked.size} onClear={() => setPicked(new Set())}>
          <Actions picked={picked} />
        </SelectionBar>
        <DataGrid
          rows={ITEMS}
          columns={COLUMNS}
          rowKey={(item: Item) => item.id}
          rowHref={(item: Item) => `#/artifacts/${item.id}`}
          selection={{ selected: picked, onChange: setPicked, rowLabel: (item: Item) => `Select ${item.title}` }}
          aria-label="Artifacts"
        />
      </div>
    );
  },
};

/** The bar alone, as it stands with three picks. Under the phone breakpoint it docks at the foot of the screen. */
export const Bar: Story = {
  render: () => (
    <div style={{ maxWidth: 820 }}>
      <SelectionBar count={3} onClear={() => {}}>
        <Button size="small" variant="secondary" leadingIcon={<FolderInputGlyph size="sm" />}>
          Move to…
        </Button>
      </SelectionBar>
    </div>
  ),
};
