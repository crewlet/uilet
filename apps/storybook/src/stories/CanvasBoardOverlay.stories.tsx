import { useRef, useState, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { CanvasBoard, CommentPin, type CanvasBoardItem, type CanvasHandle } from '@crewlethq/ui';

const BOARDS: CanvasBoardItem[] = [
  { id: 'welcome', x: 0, y: 0, w: 390, h: 844, title: 'Welcome' },
  { id: 'plan', x: 470, y: 0, w: 390, h: 844, title: 'Choose a plan' },
];

/** Points in a board's own pixels, as a comment anchors them. */
const POINTS = [
  { id: '1', board: 'welcome', x: 195, y: 760 },
  { id: '2', board: 'plan', x: 200, y: 300 },
];

function Pinned() {
  const canvas = useRef<CanvasHandle>(null);
  const [, redraw] = useState(0);
  const box = (b: CanvasBoardItem) => (
    <div style={{ width: '100%', height: '100%', background: 'var(--color-surface-elevated)' }}>{b.title}</div>
  );
  const pins: ReactNode[] = POINTS.map((p) => {
    const b = BOARDS.find((x) => x.id === p.board)!;
    const r = canvas.current?.screenRect({ x: b.x + p.x, y: b.y + p.y, width: 0, height: 0 });
    return r ? <CommentPin key={p.id} mark={p.id} label={`Comment ${p.id}`} style={{ left: r.x, top: r.y }} /> : null;
  });
  return (
    <div style={{ height: 520 }}>
      <CanvasBoard
        label="Onboarding screens"
        boards={BOARDS}
        renderBoard={box}
        canvasRef={canvas}
        overlay={pins}
        onViewChange={() => redraw((n) => n + 1)}
      />
    </div>
  );
}

const meta: Meta = { title: 'UI/CanvasBoard/Overlay' };
export default meta;

/** Comment pins over two artboards: each stays on its point as the canvas pans and zooms. */
export const CommentPins: StoryObj = { render: () => <Pinned /> };
