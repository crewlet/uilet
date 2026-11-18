/**
 * A limit stack keeps one line per window where there is room, moves the note
 * under its bar where there is not, and never overflows its cell.
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
