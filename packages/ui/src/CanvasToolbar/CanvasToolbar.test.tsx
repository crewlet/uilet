/**
 * A canvas's tool palette: one tool in hand, each naming its key, and the
 * keys matched by the surface that owns them.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { tabTo } from '../../../../apps/ui-tests/src/keyboard.js';
import { useState } from 'react';
import { afterEach, expect, test } from 'vitest';
import { HandGlyph, MousePointer2Glyph } from '@crewlethq/icons/glyphs';
import { CanvasToolbar, toolForKey, type CanvasTool } from './CanvasToolbar.js';

afterEach(cleanup);

const TOOLS: CanvasTool<'move' | 'hand'>[] = [
  { id: 'move', label: 'Move', icon: <MousePointer2Glyph />, shortcut: 'V' },
  { id: 'hand', label: 'Hand', icon: <HandGlyph />, shortcut: 'H' },
];

function Palette() {
  const [tool, setTool] = useState<'move' | 'hand'>('move');
  return <CanvasToolbar label="Tools" tools={TOOLS} value={tool} onChange={setTool} />;
}

test('one tool is in hand, and a press puts down the last one', () => {
  render(<Palette />);
  const pressed = () =>
    screen.getAllByRole('button').filter((b) => b.getAttribute('aria-pressed') === 'true').map((b) => b.getAttribute('aria-label'));
  expect(screen.getByRole('toolbar', { name: 'Tools' })).toBeTruthy();
  expect(pressed()).toEqual(['Move']);
  fireEvent.click(screen.getByRole('button', { name: 'Hand' }));
  expect(pressed()).toEqual(['Hand']);
});

test('each tool\'s tip names its key, and describes the tool rather than renaming it', () => {
  render(<Palette />);
  const hand = screen.getByRole('button', { name: 'Hand' });
  tabTo(hand);
  const tip = document.getElementById(hand.getAttribute('aria-describedby')!.split(' ').pop()!);
  expect(tip?.textContent).toMatch(/^Hand.*H/);
  expect(hand.getAttribute('title')).toBe('');
});

test('a bare letter picks its tool, in either case; a chord or a shifted letter does not', () => {
  const press = (key: string, mods: Partial<Record<'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey', boolean>> = {}) =>
    toolForKey(TOOLS, { key, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, ...mods });
  expect(press('v')).toBe('move');
  expect(press('H')).toBe('hand');
  expect(press('x')).toBeUndefined();
  expect(press('h', { metaKey: true })).toBeUndefined();
  expect(press('h', { ctrlKey: true })).toBeUndefined();
  expect(press('h', { altKey: true })).toBeUndefined();
  expect(press('H', { shiftKey: true })).toBeUndefined();
});

test('the tools are the small control step, the zoom bar\'s, so the two bars stand one height', () => {
  render(<Palette />);
  for (const name of ['Move', 'Hand']) {
    expect(screen.getByRole('button', { name }).classList.contains('crewlet-icon-btn--sm')).toBe(true);
  }
});
