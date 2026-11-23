/**
 * The coding harnesses' marks at 24px on a light and a dark document: one
 * drawing shown for Grok, Hermes and Kimi, Qwen reversed on dark, OpenAI in the
 * text's ink, every square filled. The store, ads and analytics marks fill
 * their square, App Store Connect showing Apple's file for the ground. AWS's
 * plate fills its square in the text's ink at a tenth, its glyph centred.
 */
import { afterEach, describe, expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { VendorMark, type Vendor } from '@crewlethq/icons';
// Their stylesheets paint every drawing in an icon zone with the text's ink.
import '@crewlethq/ui/OrgLabel';
import '@crewlethq/ui/AddPill';

let root: Root | null = null;
let host: HTMLDivElement | null = null;

afterEach(() => {
  flushSync(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
  document.documentElement.removeAttribute('data-theme');
});

const UNMARKED: Vendor[] = ['aws'];

const GROWTH: Vendor[] = [
  'app-store-connect',
  'apple',
  'apple-ads',
  'google',
  'google-admob',
  'google-ads',
  'google-adsense',
  'google-analytics',
  'google-play',
  'google-search-console',
  'meta-ads',
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
  test.each(['app-store-connect', 'grok', 'hermes', 'kimi'] as const)("%s shows the vendor's drawing for the ground, filling the mark", async (vendor) => {
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

  test.each(['openai', 'apple', 'apple-ads'] as const)("%s takes the text's ink on either ground", async (vendor) => {
    const mark = await mount(theme, vendor);
    expect(getComputedStyle(mark.querySelector('path')!).fill).toBe(theme === 'light' ? 'rgb(20, 20, 20)' : 'rgb(240, 240, 240)');
  });

  test("Kimi's tile stands apart from the ground: black on light, white on dark", async () => {
    const mark = await mount(theme, 'kimi');
    const tile = [...mark.querySelectorAll('rect')].find((rect) => shown(rect.closest('svg')!))!;
    expect(getComputedStyle(tile).fill).toBe(theme === 'light' ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)');
  });

  test.each([...HARNESSES, ...GROWTH])('%s is a 24px square its drawing spans', async (vendor) => {
    const mark = await mount(theme, vendor);
    const frame = mark.getBoundingClientRect();
    expect([frame.width, frame.height]).toEqual([24, 24]);
    // The paths of the drawing that is shown: a mark with two hides one of them.
    const painted = [...mark.querySelectorAll('path, rect, circle, image')].filter((shape) => !shape.closest('clipPath') && shown(shape.closest('svg')!));
    const boxes = painted.map((path) => path.getBoundingClientRect()).filter((box) => box.width > 0);
    expect(boxes.length).toBeGreaterThan(0);
    const left = Math.min(...boxes.map((box) => box.left));
    const right = Math.max(...boxes.map((box) => box.right));
    const top = Math.min(...boxes.map((box) => box.top));
    const bottom = Math.max(...boxes.map((box) => box.bottom));
    expect(Math.max(right - left, bottom - top)).toBeGreaterThanOrEqual(24 * 0.8);
  });

  test.each(UNMARKED)("%s's plate fills its 24px square and its glyph strokes in the text's ink, centred", async (vendor) => {
    const mark = await mount(theme, vendor);
    const frame = mark.getBoundingClientRect();
    expect([frame.width, frame.height]).toEqual([24, 24]);
    const ink = theme === 'dark' ? 'rgb(240, 240, 240)' : 'rgb(20, 20, 20)';
    const plate = mark.querySelector('.crewlet-vendor-mark__plate')!;
    const box = plate.getBoundingClientRect();
    expect([box.left - frame.left, box.top - frame.top, box.width, box.height]).toEqual([0, 0, 24, 24]);
    expect(getComputedStyle(plate).fill).toBe(ink);
    expect(getComputedStyle(plate).fillOpacity).toBe('0.1');
    const glyph = mark.querySelector('.crewlet-vendor-mark__glyph')!;
    expect(getComputedStyle(glyph).stroke).toBe(ink);
    expect(getComputedStyle(glyph).fill).toBe('none');
    expect(parseFloat(getComputedStyle(glyph).strokeWidth)).toBe(2.5);
    const boxes = [...glyph.querySelectorAll('path, circle, rect, line')].map((shape) => shape.getBoundingClientRect()).filter((b) => b.width > 0);
    expect(boxes.length).toBeGreaterThan(0);
    const [left, right] = [Math.min(...boxes.map((b) => b.left)), Math.max(...boxes.map((b) => b.right))];
    const [top, bottom] = [Math.min(...boxes.map((b) => b.top)), Math.max(...boxes.map((b) => b.bottom))];
    // Lucide draws within 2 to 22 of its grid; at two thirds the glyph spans at most 16 of 24, and never touches the plate's edge.
    expect(Math.max(right - left, bottom - top)).toBeGreaterThanOrEqual(16 * 0.7);
    expect([left - frame.left, top - frame.top, frame.right - right, frame.bottom - bottom].every((gap) => gap >= 4)).toBe(true);
    expect(Math.abs((left + right) / 2 - (frame.left + 12))).toBeLessThanOrEqual(1.5);
    expect(Math.abs((top + bottom) / 2 - (frame.top + 12))).toBeLessThanOrEqual(1.5);
  });
});

describe('a plate in an icon zone that paints its drawings', () => {
  test.each(['crewlet-org-label__icon', 'crewlet-add-pill__section'])("%s leaves the plate's glyph a stroke", async (zone) => {
    await page.viewport(800, 600);
    host = document.createElement('div');
    host.className = zone;
    host.style.color = 'rgb(20, 20, 20)';
    document.body.append(host);
    root = createRoot(host);
    flushSync(() => root!.render(<VendorMark vendor="aws" size={20} />));
    const glyph = host.querySelector('.crewlet-vendor-mark__glyph')!;
    const shapes = [...glyph.querySelectorAll('path')];
    expect(shapes.length).toBeGreaterThan(0);
    for (const shape of shapes) expect(getComputedStyle(shape).fill).toBe('none');
  });
});
