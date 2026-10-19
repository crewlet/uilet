import { useState, type CSSProperties, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  CanvasBoard,
  type CanvasBoardItem,
  type CanvasBoardNote,
  type CanvasBoardRect,
} from '@crewlethq/ui';

/**
 * UI / CanvasBoard.
 *
 * A design's canvas: artboards placed on a pannable, zoomable field, with
 * titles and stickies beside them. The engine dashboard renders a sandboxed
 * page inside each live board; here each board draws a plain stand-in.
 *
 * Try it: zoom out until boards turn into placeholders (a board runs only
 * while it is on screen and wide enough to read, at most twelve at once).
 * Click a board to hand it the pointer and press Escape to give it back. In
 * the Editable story, drag a board's title to move it, its corner to resize
 * it, or focus either and use the arrow keys (Shift for a larger step).
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
      />
    </Frame>
  );
}

/** Move and resize boards, and edit, move or delete notes. */
export const Editable: Story = { render: () => <EditableBoard /> };
