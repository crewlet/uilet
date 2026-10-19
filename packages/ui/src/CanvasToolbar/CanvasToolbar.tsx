/**
 * The floating palette of a canvas's tools: Move, Hand, and whatever a surface
 * places (a text, a sticky), one of them in hand at a time.
 *
 * WHAT IT IS. A toolbar (one tab stop, walked with the arrows; see Toolbar)
 * of toggle buttons, exactly one pressed. Each tool names its key, and the tip
 * that opens on hover or focus says it, so a reader learns `V` and `H` from the
 * palette rather than from a help page.
 *
 * WHAT IT IS NOT. It does not listen for the keys itself: which keys reach a
 * canvas is the canvas's question (a page full of fields must not lose its `V`
 * to a palette), so the surface that holds the tools matches its own presses
 * against [toolForKey] and sets the tool it finds.
 *
 * Drawn as a glass bar like the canvas's zoom bar, so the two read as one
 * family of chrome over the field.
 */

import type { ReactNode } from 'react';
import { IconButton } from '../IconButton/index.js';
import { ShortcutTip } from '../Canvas/index.js';
import { Toolbar } from '../Toolbar/index.js';
import { cx } from '../utils/cx.js';

/** One tool in the palette. */
export interface CanvasTool<Id extends string = string> {
  id: Id;
  /** What the tool does, in words: its accessible name and the tip's first words. */
  label: string;
  /** The glyph. A component from @crewlethq/icons/glyphs. */
  icon: ReactNode;
  /**
   * The key that picks the tool, as Kbd names it: one letter, pressed alone.
   * A letter rather than a chord, because a tool is picked dozens of times a
   * minute and design tools have taught every reader their letters.
   */
  shortcut: string;
}

export interface CanvasToolbarProps<Id extends string = string> {
  /** The palette's accessible name, such as "Tools". */
  label: string;
  tools: readonly CanvasTool<Id>[];
  /** The tool in hand. */
  value: Id;
  onChange: (id: Id) => void;
  className?: string | undefined;
}

/**
 * The tool a key press picks, or undefined. A bare letter only: a press with
 * Control, Command or Alt is somebody else's chord, and Shift is a different
 * key in every design tool.
 */
export function toolForKey<Id extends string>(
  tools: readonly CanvasTool<Id>[],
  event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'>,
): Id | undefined {
  if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return undefined;
  const pressed = event.key.toLowerCase();
  return tools.find((tool) => tool.shortcut.toLowerCase() === pressed)?.id;
}

export function CanvasToolbar<Id extends string>({
  label,
  tools,
  value,
  onChange,
  className,
}: CanvasToolbarProps<Id>) {
  return (
    <Toolbar label={label} className={cx('crewlet-canvas-toolbar', className)}>
      {tools.map((tool) => (
        <ShortcutTip key={tool.id} label={tool.label} keys={[tool.shortcut]}>
          <IconButton
            size="sm"
            label={tool.label}
            title=""
            icon={tool.icon}
            pressed={tool.id === value}
            onClick={() => onChange(tool.id)}
          />
        </ShortcutTip>
      ))}
    </Toolbar>
  );
}
