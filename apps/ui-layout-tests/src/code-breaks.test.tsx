/**
 * An identifier breaks where it means to, in a real browser: a path at a `/`,
 * a copy panel's token fills its lines, and a chip's ground hugs a full stop.
 */
import { afterEach, expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import type { ReactNode } from 'react';
import { Copyable, InlineCode } from '@crewlethq/ui';

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

interface Glyph {
  c: string;
  top: number;
  left: number;
  right: number;
}

function glyphs(el: Element): Glyph[] {
  const out: Glyph[] = [];
  const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let node = walk.nextNode(); node; node = walk.nextNode()) {
    const text = node.textContent ?? '';
    for (let i = 0; i < text.length; i++) {
      const range = document.createRange();
      range.setStart(node, i);
      range.setEnd(node, i + 1);
      const rect = range.getClientRects()[0];
      if (rect && rect.width > 0) out.push({ c: text[i]!, top: Math.round(rect.top), left: rect.left, right: rect.right });
    }
  }
  return out;
}

/** The character each line inside `el` ends on, every line but its last. */
function lineEnds(el: Element): string[] {
  const all = glyphs(el);
  const ends: string[] = [];
  for (let i = 1; i < all.length; i++) if (all[i]!.top > all[i - 1]!.top + 2) ends.push(all[i - 1]!.c);
  return ends;
}

const ADDRESS = 'https://reports.example.com/v1/reports/nightly/route-cache/summary';

test('an address in a chip ends every broken line at a slash or a hyphen, never inside a name, at any width', async () => {
  await page.viewport(1280, 800);
  const midName: string[] = [];
  for (let width = 220; width <= 520; width += 6) {
    const at = await mount(
      width,
      <p style={{ margin: 0 }}>
        Reports are sent to <InlineCode>{ADDRESS}</InlineCode> every night.
      </p>,
    );
    // A line ends at a separator, or after a hyphen a name carries (a break the
    // line breaker offers in any word), never inside a run of letters.
    const ends = lineEnds(at.querySelector('code')!);
    if (ends.some((c) => c !== '/' && c !== '-')) midName.push(`${width}px: ${ends.join(' ')}`);
    flushSync(() => root?.unmount());
    host?.remove();
  }
  expect(midName, 'widths where a line inside the address ended inside a name').toEqual([]);
});

test('a copy of the chip is the address, with nothing the breaks added', async () => {
  await page.viewport(1280, 800);
  const at = await mount(240, <InlineCode>{ADDRESS}</InlineCode>);
  expect(at.querySelector('code')!.textContent).toBe(ADDRESS);
});

const TOKEN = 'cwl_pat_01a1dc5f-3ec7-7cf4-a60d-30e3034af0a7_19_ba82d0731c547d4b978ac2ec4f0c687ba8960d8c85d65883c952e83b39d15bcb';

test('a token in a copy panel fills its first line rather than breaking after a hyphen', async () => {
  await page.viewport(1280, 800);
  const at = await mount(520, <Copyable value={TOKEN} variant="block" monospace ariaLabel="Copy token" />);
  const value = at.querySelector('.crewlet-copyable__value')!;
  const all = glyphs(value);
  const firstTop = all[0]!.top;
  const firstLine = all.filter((g) => g.top === firstTop);
  const box = value.getBoundingClientRect();
  const glyphWidth = firstLine[1]!.right - firstLine[0]!.right;
  expect(all.length).toBe(TOKEN.length);
  expect(box.right - firstLine[firstLine.length - 1]!.right, 'room left at the end of the first line').toBeLessThan(glyphWidth * 1.5);
});

test("a chip's ground hugs a full stop handed to it, and keeps its inset where none is", async () => {
  await page.viewport(1280, 800);
  const at = await mount(
    600,
    <p style={{ margin: 0 }}>
      Add one with <InlineCode close=".">crewlet secrets set</InlineCode> or <InlineCode>crewlet secrets list</InlineCode> here
    </p>,
  );
  const [closed, running] = [...at.querySelectorAll('code')];
  const all = glyphs(at.querySelector('p')!);
  const stop = all.find((g) => g.c === '.')!;
  const last = glyphs(closed!).at(-1)!;
  // The chip's 4px inset read as a space before the full stop; beside it the ground keeps a hair.
  expect(stop.left - last.right, 'the gap between the last letter and the full stop').toBeLessThanOrEqual(1.5);
  expect(parseFloat(getComputedStyle(running!).paddingRight)).toBeGreaterThanOrEqual(4);
});
