/**
 * A FACT'S NOTE FOLLOWS ITS VALUE, measured: beside a short value it shares the
 * value's line, and where the two wrap no line opens on the dot between them.
 */
import { afterEach, expect, test } from 'vitest';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import type { ReactNode } from 'react';
import { FactLine } from '@crewlethq/ui';

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
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  return host;
}

/** Whether two boxes share a line: their vertical extents overlap. */
const sameLine = (a: DOMRect, b: DOMRect) => a.top < b.bottom && b.top < a.bottom;

/** The box of a value's last drawn character. */
function lastCharacter(value: Element): DOMRect {
  const text = value.querySelector('.crewlet-text')!.firstChild as Text;
  const range = document.createRange();
  range.setStart(text, text.length - 1);
  range.setEnd(text, text.length);
  return range.getBoundingClientRect();
}

test('beside a short value the note shares its line, smaller than the value', async () => {
  const at = await mount(160, <FactLine facts={[{ label: 'Last check', value: '41s ago', note: 'next in 9m' }]} />);
  const value = at.querySelector('.crewlet-fact-line__value')!;
  const [dot, note] = [...value.querySelectorAll<HTMLElement>('.crewlet-fact-line__note')];
  expect(sameLine(dot!.getBoundingClientRect(), lastCharacter(value))).toBe(true);
  expect(sameLine(note!.getClientRects()[0]!, lastCharacter(value))).toBe(true);
  expect(parseFloat(getComputedStyle(note!).fontSize)).toBeLessThan(parseFloat(getComputedStyle(value).fontSize));
});

test('beside a value that wraps, the dot stays on the value\'s last line and nothing leaves the track', async () => {
  const at = await mount(
    130,
    <FactLine
      facts={[{ label: 'Phase', value: 'Execute → Review → Execute again', note: 'round 3 of 25, executor running' }]}
    />,
  );
  const value = at.querySelector('.crewlet-fact-line__value')!;
  const [dot, note] = [...value.querySelectorAll<HTMLElement>('.crewlet-fact-line__note')];
  expect(sameLine(dot!.getBoundingClientRect(), lastCharacter(value))).toBe(true);
  const track = at.getBoundingClientRect();
  for (const box of [...note!.getClientRects()]) expect(box.right).toBeLessThanOrEqual(track.right + 0.5);
});
