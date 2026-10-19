import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { HandGlyph, MousePointer2Glyph, StickyNoteGlyph, TypeGlyph } from '@crewlethq/icons/glyphs';
import { CanvasToolbar, type CanvasTool } from '@crewlethq/ui';

/**
 * UI / CanvasToolbar.
 *
 * The floating palette of a canvas's tools, one in hand at a time. Hover or
 * focus a tool to see its key; Tab reaches the palette once and the arrow keys
 * walk it. The palette does not listen for the keys itself: the canvas that
 * owns the tools matches its presses with `toolForKey`, as CanvasBoard does.
 */
const meta: Meta<typeof CanvasToolbar> = {
  title: 'UI/CanvasToolbar',
  component: CanvasToolbar,
};

export default meta;
type Story = StoryObj<typeof CanvasToolbar>;

type Tool = 'move' | 'hand' | 'text' | 'sticky';

const TOOLS: CanvasTool<Tool>[] = [
  { id: 'move', label: 'Move', icon: <MousePointer2Glyph />, shortcut: 'V' },
  { id: 'hand', label: 'Hand', icon: <HandGlyph />, shortcut: 'H' },
  { id: 'text', label: 'Text', icon: <TypeGlyph />, shortcut: 'T' },
  { id: 'sticky', label: 'Sticky note', icon: <StickyNoteGlyph />, shortcut: 'S' },
];

function Palette({ tools }: { tools: CanvasTool<Tool>[] }) {
  const [tool, setTool] = useState<Tool>('move');
  return <CanvasToolbar label="Tools" tools={tools} value={tool} onChange={setTool} />;
}

/** Every tool a design canvas offers while it is being edited. */
export const Editing: Story = { render: () => <Palette tools={TOOLS} /> };

/** A canvas a reader only views: Move and Hand. */
export const Viewing: Story = { render: () => <Palette tools={TOOLS.slice(0, 2)} /> };
