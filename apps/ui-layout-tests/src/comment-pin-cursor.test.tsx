/**
 * The placing cursor is one a browser draws: a valid `cursor` value, in the
 * draft pin's colours where it is read, its brand's accent included.
 */
import { afterEach, expect, test } from 'vitest';
import { commentPinCursor, commentPinCursorAt } from '@crewlethq/ui';

let host: HTMLElement | null = null;

afterEach(() => {
  host?.remove();
  host = null;
});

const drawing = (cursor: string) => decodeURIComponent(/^url\("data:image\/svg\+xml,([^"]+)"\)/.exec(cursor)?.[1] ?? '');

test('the browser takes the cursor as a custom image with a hotspot and a fallback', () => {
  host = document.createElement('div');
  document.body.append(host);
  for (const dir of ['ltr', 'rtl'] as const) {
    host.style.cursor = '';
    host.style.cursor = commentPinCursor({}, dir);
    const computed = getComputedStyle(host).cursor;
    expect(computed, dir).toMatch(/^url\("data:image\/svg\+xml,.+"\) \d+ \d+, crosshair$/);
  }
});

test("read at an element, it takes the draft pin's ground and the accent there, a brand's included", () => {
  host = document.createElement('div');
  host.setAttribute('style', '--color-surface-elevated: rgb(1, 2, 3); --color-brand-accent: rgb(10, 20, 30)');
  document.body.append(host);
  const svg = drawing(commentPinCursorAt(host));
  expect(svg).toContain('fill="rgb(1, 2, 3)"');
  expect(svg).toContain('stroke="rgb(10, 20, 30)"');
  host.setAttribute('style', 'direction: rtl');
  expect(commentPinCursorAt(host)).toMatch(/\) 21 21, crosshair$/);
});
