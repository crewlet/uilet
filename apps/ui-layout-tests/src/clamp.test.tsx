/**
 * A LONG BLOCK FOLDS, A SHORT ONE DOES NOT, measured: a block more than a
 * quarter longer than its fold stops at the fold with Show more under it and
 * opens whole; one that fits is drawn whole with no control; a focus inside
 * the folded part opens it.
 */
import { afterEach, expect, test } from 'vitest';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import type { ReactNode } from 'react';
import { Clamp } from '@crewlethq/ui';

let root: Root | null = null;
let host: HTMLElement | null = null;

afterEach(() => {
  flushSync(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

async function mount(node: ReactNode): Promise<HTMLElement> {
  host = document.createElement('div');
  host.style.width = '480px';
  document.body.append(host);
  root = createRoot(host);
  flushSync(() => root!.render(node));
  await document.fonts.ready;
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  return host;
}

const lines = (n: number) =>
  Array.from({ length: n }, (_, i) => (
    <p key={i} style={{ margin: 0, height: 20 }}>
      Line {i + 1} of the report.
    </p>
  ));

test('a block well past its fold stops at the fold, with Show more, and opens whole', async () => {
  const at = await mount(<Clamp height="100px">{lines(20)}</Clamp>);
  const body = at.querySelector<HTMLElement>('.crewlet-clamp__body')!;
  expect(at.querySelector('.crewlet-clamp')!.getAttribute('data-state')).toBe('folded');
  expect(body.getBoundingClientRect().height).toBe(100);
  const more = at.querySelector<HTMLButtonElement>('.crewlet-clamp__toggle')!;
  expect(more.textContent).toBe('Show more');
  expect(more.getAttribute('aria-expanded')).toBe('false');
  expect(more.getAttribute('aria-controls')).toBe(body.id);
  // The folded part is still in the document, for a screen reader and find in page.
  expect(body.textContent).toContain('Line 20 of the report.');
  flushSync(() => more.click());
  expect(body.getBoundingClientRect().height).toBe(400);
  expect(more.textContent).toBe('Show less');
  expect(more.getAttribute('aria-expanded')).toBe('true');
});

test('a block that fits its fold with a quarter to spare is drawn whole, with no control', async () => {
  const at = await mount(<Clamp height="100px">{lines(6)}</Clamp>);
  expect(at.querySelector('.crewlet-clamp')!.getAttribute('data-state')).toBe('whole');
  expect(at.querySelector<HTMLElement>('.crewlet-clamp__body')!.getBoundingClientRect().height).toBe(120);
  expect(at.querySelector('.crewlet-clamp__toggle')).toBeNull();
});

test('a focus inside the folded part opens the block', async () => {
  const at = await mount(
    <Clamp height="100px">
      {lines(20)}
      <a href="#end">The last link</a>
    </Clamp>,
  );
  const link = at.querySelector<HTMLAnchorElement>('a')!;
  flushSync(() => link.focus());
  expect(at.querySelector('.crewlet-clamp')!.getAttribute('data-state')).toBe('open');
});
