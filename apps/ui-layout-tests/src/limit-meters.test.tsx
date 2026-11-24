/**
 * A limit stack keeps one line per window where there is room, moves the note
 * under its bar where there is not, never overflows its cell, and keeps no
 * empty note column when no window has a note.
 */
import { afterEach, expect, test } from 'vitest';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import type { ReactNode } from 'react';
import { LimitMeters, type LimitWindow } from '@crewlethq/ui';

let root: Root | null = null;
let host: HTMLElement | null = null;

afterEach(() => {
  flushSync(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

async function mount(width: number, node: ReactNode): Promise<HTMLElement> {
  host = document.createElement('div');
  host.style.width = `${width}px`;
  document.body.append(host);
  root = createRoot(host);
  flushSync(() => root!.render(node));
  await document.fonts.ready;
  return host;
}

const WINDOWS: LimitWindow[] = [
  { id: 'session', label: '5-hour', state: 'ok', used: 0.05, note: 'resets 5am', name: '5-hour limit, 5% used, resets 05:00 UTC' },
  { id: 'weekly', label: 'Weekly', state: 'refusing', figure: 'Reached', note: 'until Mon 9am', name: 'Weekly limit, reached' },
  { id: 'opus', label: 'Weekly Opus', state: 'near', used: 0.83, name: 'Weekly Opus limit, 83% used' },
];

const box = (el: Element) => el.getBoundingClientRect();
const parts = (at: HTMLElement, part: string) => [...at.querySelectorAll(`.crewlet-limit-meters__${part}`)];

test('wide, each window is one line: label, bar, figure and note side by side', async () => {
  const at = await mount(320, <LimitMeters label="Limits" windows={WINDOWS} />);
  const [label, track, figure, note] = [parts(at, 'label')[0]!, parts(at, 'track')[0]!, parts(at, 'figure')[0]!, parts(at, 'note')[0]!];
  const middle = (el: Element) => box(el).top + box(el).height / 2;
  for (const el of [track, figure, note]) expect(Math.abs(middle(el) - middle(label))).toBeLessThan(4);
  expect(box(track).width).toBeGreaterThanOrEqual(40);
  // Bars line up across windows, whatever each label's length.
  const lefts = parts(at, 'track').map((t) => Math.round(box(t).left));
  expect(new Set(lefts).size).toBe(1);
});

test('narrow, the note moves under its bar and nothing overflows the cell', async () => {
  const at = await mount(200, <LimitMeters label="Limits" windows={WINDOWS} />);
  const stack = at.querySelector('.crewlet-limit-meters')!;
  const track = parts(at, 'track')[0]!;
  const note = parts(at, 'note')[0]!;
  expect(box(note).top).toBeGreaterThan(box(track).bottom);
  expect(box(track).width).toBeGreaterThanOrEqual(40);
  for (const el of stack.querySelectorAll('*')) expect(box(el).right, el.className).toBeLessThanOrEqual(box(stack).right + 0.5);
});

test('a window without a note never pulls the next label onto its row', async () => {
  const at = await mount(320, <LimitMeters label="Limits" windows={[{ ...WINDOWS[0]!, note: undefined }, WINDOWS[1]!]} />);
  const [first, second] = parts(at, 'label');
  expect(box(second!).top).toBeGreaterThan(box(first!).bottom - 1);
  expect(Math.round(box(second!).left)).toBe(Math.round(box(first!).left));
});

// Above the 16rem container query, where the note would be a fourth column.
test('wide, a stack with no note puts every figure at its edge', async () => {
  const bare = WINDOWS.map((w) => ({ ...w, note: undefined }));
  const at = await mount(320, <LimitMeters label="Limits" windows={bare} />);
  const stack = at.querySelector('.crewlet-limit-meters')!;
  for (const figure of parts(at, 'figure')) expect(Math.abs(box(stack).right - box(figure).right)).toBeLessThan(0.5);
});

test('wide, the notes of the windows that have one line up in their own column', async () => {
  const at = await mount(320, <LimitMeters label="Limits" windows={WINDOWS} />);
  const notes = parts(at, 'note');
  expect(notes).toHaveLength(2);
  expect(Math.round(box(notes[1]!).left)).toBe(Math.round(box(notes[0]!).left));
  const rights = parts(at, 'figure').map((f) => Math.round(box(f).right));
  expect(new Set(rights).size).toBe(1);
  expect(Math.round(box(notes[0]!).left)).toBeGreaterThan(rights[0]!);
});

test('in a flex cell, as a table lays out its cells, the stack fills the cell rather than its 12rem stand-in', async () => {
  const at = await mount(
    320,
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <LimitMeters label="Limits" windows={[{ ...WINDOWS[0]!, note: undefined }]} />
    </div>,
  );
  expect(Math.round(box(at.querySelector('.crewlet-limit-meters')!).width)).toBe(320);
});
