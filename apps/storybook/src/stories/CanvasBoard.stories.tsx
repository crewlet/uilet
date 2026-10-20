import { useState, type CSSProperties, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  CanvasBoard,
  type CanvasBoardItem,
  type CanvasBoardNote,
  type CanvasBoardRect,
  type CanvasBoardSelection,
} from '@crewlethq/ui';

/**
 * UI / CanvasBoard.
 *
 * A design's canvas: artboards placed on a pannable, zoomable field, with
 * titles and stickies beside them. The engine dashboard renders a sandboxed
 * page inside each live board; here each board draws a plain stand-in.
 *
 * Try it: the palette at the foot of the field holds Move (V) and Hand (H, or
 * hold Space), and the pointer follows the tool. On a canvas narrower than
 * 36rem the palette moves to the top left corner, clear of the zoom bar. The
 * dot grid lies on the boards' own plane, so it pans and zooms with them. Hover a board or its name to
 * outline it, click to select it, double-click to hand its page the pointer,
 * and press Escape to give it back. Zoom out until boards turn into
 * placeholders (a board runs only while it is on screen and wide enough to
 * read, at most twelve at once); Shift 1 fits, Shift 0 is actual size.
 *
 * In the Editable story the palette adds Text (T) and Sticky (S): click the
 * field to place one. Drag a board's name to move it, a selected item's
 * corners to resize it, a note's paper to move it, double-click a note to
 * retype it, and press Delete to remove a selected note.
 *
 * In the Shaping story the palette adds Frame (F) too: click the field to
 * place a phone sized board there, and press Delete to remove a selected
 * board. It is how a design's create page lets a person lay out the boards
 * an agent then fills.
 */
const meta: Meta<typeof CanvasBoard> = {
  title: 'UI/CanvasBoard',
  component: CanvasBoard,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof CanvasBoard>;

const BOARDS: CanvasBoardItem[] = [
  { id: 'hero', x: 0, y: 0, w: 1440, h: 900, title: 'Hero' },
  { id: 'features', x: 1540, y: 0, w: 1440, h: 900, title: 'Features' },
  { id: 'pricing', x: 0, y: 1000, w: 1440, h: 900, title: 'Pricing' },
  { id: 'mobile', x: 1540, y: 1000, w: 390, h: 844, title: 'Mobile' },
];

const NOTES: CanvasBoardNote[] = [
  { id: 't1', kind: 'title', x: 0, y: -160, w: 1200, h: 100, text: 'Launch landing page' },
  { id: 's1', kind: 'sticky', x: 3080, y: 0, w: 320, h: 240, text: 'Copy from marketing by Friday', color: 'pink' },
  { id: 's2', kind: 'sticky', x: 3080, y: 300, w: 320, h: 200, text: 'Check the pricing table on a phone' },
];

const PAGE: CSSProperties = {
  display: 'grid',
  placeItems: 'center',
  background: 'var(--color-surface-elevated)',
  color: 'var(--color-text-secondary)',
  fontSize: 'var(--font-size-3xl)',
};

function Frame({ children }: { children: ReactNode }) {
  return <div style={{ height: '80vh', padding: 'var(--spacing-4)' }}>{children}</div>;
}

const stand = (b: CanvasBoardItem) => <div style={PAGE}>{b.title}</div>;

/** Four boards and three notes, fitted on the first layout. */
export const Default: Story = {
  render: () => (
    <Frame>
      <CanvasBoard label="Launch landing page" boards={BOARDS} notes={NOTES} renderBoard={stand} onOpen={() => {}} />
    </Frame>
  ),
};

/** A budget of two: only the two largest boards on screen run. */
export const TightBudget: Story = {
  render: () => (
    <Frame>
      <CanvasBoard label="Launch landing page" boards={BOARDS} notes={NOTES} renderBoard={stand} maxLive={2} />
    </Frame>
  ),
};

function EditableBoard() {
  const [boards, setBoards] = useState(BOARDS);
  const [notes, setNotes] = useState(NOTES);
  const create = (kind: CanvasBoardNote['kind'], at: { x: number; y: number }) => {
    const id = `${kind}-${notes.length + 1}`;
    const size = kind === 'title' ? { w: 720, h: 80 } : { w: 280, h: 200 };
    setNotes((all) => [...all, { id, kind, ...at, ...size, text: kind === 'title' ? 'Title' : 'Note' }]);
    return id;
  };
  const move = (id: string, rect: CanvasBoardRect) =>
    setBoards((all) => all.map((b) => (b.id === id ? { ...b, ...rect } : b)));
  return (
    <Frame>
      <CanvasBoard
        label="Launch landing page"
        boards={boards}
        notes={notes}
        renderBoard={stand}
        editable
        onBoardChange={move}
        onNoteChange={(note) => setNotes((all) => all.map((n) => (n.id === note.id ? note : n)))}
        onNoteRemove={(id) => setNotes((all) => all.filter((n) => n.id !== id))}
        onNoteCreate={create}
      />
    </Frame>
  );
}

/** Move and resize boards, place notes with Text and Sticky, and edit, move or delete them. */
export const Editable: Story = { render: () => <EditableBoard /> };

function ShapingBoard() {
  const [boards, setBoards] = useState<CanvasBoardItem[]>([
    { id: 'home', x: 0, y: 0, w: 1440, h: 1024, title: 'Home' },
  ]);
  const [made, setMade] = useState(1);
  const place = (at: { x: number; y: number }) => {
    const id = `board-${made + 1}`;
    setMade((n) => n + 1);
    setBoards((all) => [...all, { id, ...at, w: 390, h: 844, title: `Screen ${made + 1}` }]);
    return id;
  };
  return (
    <Frame>
      <CanvasBoard
        label="New design"
        boards={boards}
        renderBoard={stand}
        editable
        onBoardCreate={place}
        onBoardRemove={(id) => setBoards((all) => all.filter((b) => b.id !== id))}
        onBoardChange={(id, rect) => setBoards((all) => all.map((b) => (b.id === id ? { ...b, ...rect } : b)))}
      />
    </Frame>
  );
}

/** Lay out the boards of a design before it is drawn: place them with Frame, move, resize and delete them. */
export const Shaping: Story = { render: () => <ShapingBoard /> };

const LIST: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--spacing-1)',
  width: '10rem',
  margin: 0,
  padding: 0,
  listStyle: 'none',
};

function ListedBoards() {
  const [selected, setSelected] = useState<CanvasBoardSelection | null>(null);
  return (
    <div style={{ display: 'flex', gap: 'var(--spacing-3)', height: '80vh', padding: 'var(--spacing-4)' }}>
      <ol style={LIST} aria-label="Boards">
        {BOARDS.map((b) => (
          <li key={b.id}>
            <button
              type="button"
              aria-current={selected?.kind === 'board' && selected.id === b.id ? 'true' : undefined}
              style={{ fontWeight: selected?.id === b.id ? 'var(--font-weight-semibold)' : undefined }}
              onClick={() => setSelected({ kind: 'board', id: b.id })}
            >
              {b.title}
            </button>
          </li>
        ))}
      </ol>
      <div style={{ flex: 1, minWidth: 0 }}>
        <CanvasBoard
          label="Launch landing page"
          boards={BOARDS}
          notes={NOTES}
          renderBoard={stand}
          selected={selected}
          onSelectedChange={setSelected}
          onOpen={() => {}}
        />
      </div>
    </div>
  );
}

/**
 * The selection held by the caller: a list of boards beside the canvas marks
 * the board picked on it, and a board picked in the list is selected there.
 */
export const HeldSelection: Story = { render: () => <ListedBoards /> };

/**
 * A canvas as narrow as a phone's: the palette sits in the top left corner,
 * the boards are drawn as thumbnails, and a board too narrow to name goes
 * unnamed until it is zoomed into.
 */
export const Narrow: Story = {
  render: () => (
    <div style={{ width: '22rem', height: '36rem', padding: 'var(--spacing-4)' }}>
      <CanvasBoard label="Launch landing page" boards={BOARDS} notes={NOTES} renderBoard={stand} onOpen={() => {}} />
    </div>
  ),
};

/** Without the floating palette: the tool keys still work. */
export const KeysOnly: Story = {
  render: () => (
    <Frame>
      <CanvasBoard label="Launch landing page" boards={BOARDS} notes={NOTES} renderBoard={stand} toolbar={false} />
    </Frame>
  ),
};

/** Twenty boards laid out wide: the fit shows every one, far below a chart's floor. */
export const WideDesign: Story = {
  render: () => (
    <Frame>
      <CanvasBoard
        label="Every screen"
        boards={Array.from({ length: 20 }, (_, i) => ({
          id: `screen-${i + 1}`,
          x: (i % 10) * 1540,
          y: Math.floor(i / 10) * 1000,
          w: 1440,
          h: 900,
          title: `Screen ${i + 1}`,
        }))}
        renderBoard={stand}
      />
    </Frame>
  ),
};
