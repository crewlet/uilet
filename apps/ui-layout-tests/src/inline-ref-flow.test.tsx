/**
 * A REFERENCE AT THE EDGE OF A CUT LINE KEEPS ITS WORDS IN THE LINE.
 *
 * A row cut to one line with an ellipsis drew a reference that crossed its edge
 * as one atomic box clipped whole: the row read "…work item ▢", its mark and
 * none of the words it names. Flowing (`flow`), the reference is the row's own
 * words, so the ellipsis cuts them after the mark.
 *
 * A block clamped to lines wraps, and there the box is right: it moves to the
 * next line whole, so its mark is never left alone at a line's end, at any
 * width. A flowing reference there could leave its mark behind, which is why
 * `flow` is for a row cut to one line.
 */
import { afterEach, expect, test } from 'vitest';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import type { ReactNode } from 'react';
import { InlineRef } from '@crewlethq/ui';

let root: Root | null = null;
let host: HTMLDivElement | null = null;

afterEach(() => {
  flushSync(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

function mount(node: ReactNode): HTMLElement {
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  flushSync(() => root!.render(node));
  return host.firstElementChild as HTMLElement;
}

const key = (flow: boolean) => (
  <InlineRef mark={<svg viewBox="0 0 10 10" />} kind="Task" href="#/worklet/ENG-287" code flow={flow}>
    ENG-287
  </InlineRef>
);

const SENTENCE = 'Site Reliability Engineer was handed its next ready work item';

/** The rect of the first character of the reference's words. */
function firstCharacter(at: Element): DOMRect {
  const text = at.querySelector('.crewlet-inline-ref__text')!.firstChild!;
  const range = document.createRange();
  range.setStart(text, 0);
  range.setEnd(text, 1);
  return range.getBoundingClientRect();
}

for (const flow of [true, false]) {
  test(`in a row cut to one line, a reference ${flow ? 'that flows is the row\'s own words' : 'is one box'}`, () => {
    const row = mount(
      <div style={{ width: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {SENTENCE} {key(flow)}
      </div>,
    );
    // THE ROW'S EDGE THROUGH THE REFERENCE'S WORDS, whatever the face measures.
    row.style.width = `${firstCharacter(row).left - row.getBoundingClientRect().left + 12}px`;
    const ref = row.querySelector<HTMLElement>('.crewlet-inline-ref')!;
    expect(firstCharacter(row).left).toBeLessThan(row.getBoundingClientRect().right);
    // FLOWING, no atomic box: the row's own ellipsis cuts the words. As a box,
    // the box crossing the edge is clipped whole.
    expect(getComputedStyle(ref).display).toBe(flow ? 'inline' : 'inline-block');
  });
}

test('in a block clamped to two lines, the box never leaves its mark alone at a line end, at any width', () => {
  const block = mount(
    <div style={{ display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden' }}>
      {SENTENCE} {key(false)} today
    </div>,
  );
  const mark = block.querySelector('.crewlet-inline-ref__mark')!;
  for (let width = 120; width <= 420; width += 2) {
    block.style.width = `${width}px`;
    const [m, w] = [mark.getBoundingClientRect(), firstCharacter(block)];
    expect(Math.abs(m.bottom - w.bottom), `at ${width}px`).toBeLessThan(m.height);
  }
});
