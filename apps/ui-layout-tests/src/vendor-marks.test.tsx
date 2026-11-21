/**
 * The coding harnesses' marks at 24px on a light and a dark document: one
 * drawing shown for Grok, Hermes and Kimi, Qwen reversed on dark, OpenAI in the
 * text's ink, every square filled. The growth tiles' generic glyphs likewise
 * fill their square and stroke in the text's ink.
 */
import { afterEach, describe, expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { VendorMark, type Vendor } from '@crewlethq/icons';

let root: Root | null = null;
let host: HTMLDivElement | null = null;

afterEach(() => {
  flushSync(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
  document.documentElement.removeAttribute('data-theme');
});

const GROWTH: Vendor[] = [
  'google-analytics',
  'google-search-console',
  'google-ads',
  'apple-ads',
  'meta-ads',
  'google-adsense',
  'google-admob',
  'app-store-connect',
  'google-play',
];

const HARNESSES: Vendor[] = ['claude', 'copilot', 'cursor', 'gemini-cli', 'grok', 'hermes', 'kimi', 'meta', 'openai', 'opencode', 'pi', 'qwen'];

async function mount(theme: 'light' | 'dark', vendor: Vendor): Promise<SVGSVGElement> {
  await page.viewport(800, 600);
  document.documentElement.setAttribute('data-theme', theme);
  host = document.createElement('div');
  host.style.color = theme === 'dark' ? 'rgb(240, 240, 240)' : 'rgb(20, 20, 20)';
  document.body.append(host);
  root = createRoot(host);
  flushSync(() => root!.render(<VendorMark vendor={vendor} size={24} />));
  return host.querySelector('svg')!;
}

const shown = (element: Element) => getComputedStyle(element).display !== 'none';

describe.each(['light', 'dark'] as const)('on a %s document', (theme) => {
  test.each(['grok', 'hermes', 'kimi'] as const)("%s shows the vendor's drawing for the ground, filling the mark", async (vendor) => {
    const mark = await mount(theme, vendor);
    const light = mark.querySelector('.crewlet-vendor-mark__light')!;
    const dark = mark.querySelector('.crewlet-vendor-mark__dark')!;
    expect([shown(light), shown(dark)]).toEqual(theme === 'light' ? [true, false] : [false, true]);
    // The drawing's own viewport, which its content is fitted into, is the mark's square.
    const drawing = (theme === 'light' ? light : dark) as SVGSVGElement;
    expect([drawing.width.baseVal.value, drawing.height.baseVal.value]).toEqual([24, 24]);
  });

  test("Qwen keeps its blue on the light ground and takes the text's ink on the dark one", async () => {
    const mark = await mount(theme, 'qwen');
    expect(getComputedStyle(mark.querySelector('path')!).fill).toBe(theme === 'light' ? 'rgb(8, 45, 255)' : 'rgb(240, 240, 240)');
  });

  test("OpenAI's blossom takes the text's ink on either ground", async () => {
    const mark = await mount(theme, 'openai');
    expect(getComputedStyle(mark.querySelector('path')!).fill).toBe(theme === 'light' ? 'rgb(20, 20, 20)' : 'rgb(240, 240, 240)');
  });

  test("Kimi's tile stands apart from the ground: black on light, white on dark", async () => {
    const mark = await mount(theme, 'kimi');
    const tile = [...mark.querySelectorAll('rect')].find((rect) => shown(rect.closest('svg')!))!;
    expect(getComputedStyle(tile).fill).toBe(theme === 'light' ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)');
  });

  test.each(HARNESSES)('%s is a 24px square its drawing spans', async (vendor) => {
    const mark = await mount(theme, vendor);
    const frame = mark.getBoundingClientRect();
    expect([frame.width, frame.height]).toEqual([24, 24]);
    // The paths of the drawing that is shown: a mark with two hides one of them.
    const painted = [...mark.querySelectorAll('path, rect')].filter((shape) => !shape.closest('clipPath') && shown(shape.closest('svg')!));
    const boxes = painted.map((path) => path.getBoundingClientRect()).filter((box) => box.width > 0);
    expect(boxes.length).toBeGreaterThan(0);
    const left = Math.min(...boxes.map((box) => box.left));
    const right = Math.max(...boxes.map((box) => box.right));
    const top = Math.min(...boxes.map((box) => box.top));
    const bottom = Math.max(...boxes.map((box) => box.bottom));
    expect(Math.max(right - left, bottom - top)).toBeGreaterThanOrEqual(24 * 0.8);
  });

  test.each(GROWTH)("%s's generic glyph strokes in the text's ink and spans its 24px square", async (vendor) => {
    const mark = await mount(theme, vendor);
    const frame = mark.getBoundingClientRect();
    expect([frame.width, frame.height]).toEqual([24, 24]);
    expect(getComputedStyle(mark).stroke).toBe(theme === 'dark' ? 'rgb(240, 240, 240)' : 'rgb(20, 20, 20)');
    expect(getComputedStyle(mark).fill).toBe('none');
    const boxes = [...mark.querySelectorAll('path, circle, rect, line')].map((shape) => shape.getBoundingClientRect()).filter((box) => box.width > 0);
    expect(boxes.length).toBeGreaterThan(0);
    const width = Math.max(...boxes.map((box) => box.right)) - Math.min(...boxes.map((box) => box.left));
    const height = Math.max(...boxes.map((box) => box.bottom)) - Math.min(...boxes.map((box) => box.top));
    // Lucide draws within 3 to 21 of its 24 unit grid at most, so 18 of 24.
    expect(Math.max(width, height)).toBeGreaterThanOrEqual(24 * 0.7);
  });
});

