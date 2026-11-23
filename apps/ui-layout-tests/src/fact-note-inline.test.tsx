/**
 * A FACT'S NOTE FOLLOWS ITS VALUE, measured: beside a short value it shares the
 * value's line with its dot in the gap; where the two do not fit it takes a
 * line of its own, whole, the dot clipped, and the value keeps its two lines.
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

function parts(at: HTMLElement) {
  const phrase = at.querySelector<HTMLElement>('.crewlet-fact-line__phrase')!;
  return {
    phrase: phrase.getBoundingClientRect(),
    value: phrase.querySelector('.crewlet-fact-line__value')!.getBoundingClientRect(),
    note: phrase.querySelector<HTMLElement>('.crewlet-fact-line__note')!,
  };
}

/** Every line of the note inside the phrase's clip, so none of it is cut. */
function whole(note: HTMLElement, phrase: DOMRect) {
  for (const box of [...note.getClientRects()]) {
    expect(box.left).toBeGreaterThanOrEqual(phrase.left - 0.5);
    expect(box.right).toBeLessThanOrEqual(phrase.right + 0.5);
    expect(box.bottom).toBeLessThanOrEqual(phrase.bottom + 0.5);
  }
}

test('beside a short value the note shares its line, smaller, with room for the dot between', async () => {
  const at = await mount(160, <FactLine facts={[{ label: 'Last check', value: '41s ago', note: 'next in 9m' }]} />);
  const { phrase, value, note } = parts(at);
  const box = note.getBoundingClientRect();
  expect(sameLine(box, value)).toBe(true);
  expect(box.left - value.right).toBeGreaterThanOrEqual(8);
  const dot = getComputedStyle(note, '::before');
  expect(dot.content).toContain('·');
  expect(parseFloat(getComputedStyle(note).fontSize)).toBeLessThan(
    parseFloat(getComputedStyle(at.querySelector('.crewlet-fact-line__value')!).fontSize),
  );
  whole(note, phrase);
});

test('beside a value that wraps, the note takes a line of its own, whole, and the value keeps two lines', async () => {
  const at = await mount(
    130,
    <FactLine facts={[{ label: 'Phase', value: 'Execute → Review → Execute again → Review', note: '2 iterations' }]} />,
  );
  const { phrase, value, note } = parts(at);
  const box = note.getBoundingClientRect();
  expect(box.top).toBeGreaterThanOrEqual(value.bottom - 0.5);
  // At the phrase's edge, so the dot hanging before it is past the clip.
  expect(Math.abs(box.left - phrase.left)).toBeLessThan(0.5);
  const lineHeight = parseFloat(getComputedStyle(at.querySelector('.crewlet-fact-line__value .crewlet-text')!).lineHeight);
  expect(Math.round(value.height / lineHeight)).toBe(2);
  whole(note, phrase);
});

test('a long note under a short value wraps inside the track and is never cut', async () => {
  const at = await mount(
    160,
    <FactLine facts={[{ label: 'Tool calls', value: '15', note: '3 not listed: the executor’s record did not keep them' }]} />,
  );
  const { phrase, note } = parts(at);
  // Wrapped onto more than one line of its own size, all of it inside the phrase.
  expect(note.getBoundingClientRect().height).toBeGreaterThan(1.5 * parseFloat(getComputedStyle(note).lineHeight));
  whole(note, phrase);
});
