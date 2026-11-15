/**
 * A brand sample's small words are drawn at the product's small steps in a
 * 285px preview, every line inside the frame; a thumbnail is still whole, and
 * a wide sample is in proportion.
 */
import { afterEach, expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { BrandSample, type BrandSampleKind } from '@crewlethq/ui';

let root: Root | null = null;
let host: HTMLElement | null = null;

afterEach(() => {
  flushSync(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

async function mount(width: number, kind: BrandSampleKind): Promise<HTMLElement> {
  host = document.createElement('div');
  host.style.width = `${width}px`;
  document.body.append(host);
  root = createRoot(host);
  flushSync(() => root!.render(<BrandSample kind={kind} mode="light" name="Nimbus" colors={{}} />));
  await document.fonts.ready;
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  return host;
}

const size = (el: Element) => parseFloat(getComputedStyle(el).fontSize);

/** Every drawn run of words lies inside the frame: nothing is clipped off its foot or its side. */
function inside(at: HTMLElement): string[] {
  const frame = at.querySelector('.crewlet-brand-sample')!.getBoundingClientRect();
  const out: string[] = [];
  for (const el of at.querySelectorAll<HTMLElement>('.crewlet-brand-sample [class*="crewlet-brand-sample__"]')) {
    const box = el.getBoundingClientRect();
    if (box.width === 0) continue;
    if (box.bottom > frame.bottom + 0.5 || box.right > frame.right + 0.5) out.push(el.className);
  }
  return out;
}

test('in a 285px preview the doc sentence and its quiet line are drawn at the small steps, inside the frame', async () => {
  await page.viewport(1280, 800);
  const at = await mount(285, 'doc');
  expect(size(at.querySelector('.crewlet-brand-sample__body')!)).toBeGreaterThanOrEqual(12);
  expect(size(at.querySelector('.crewlet-brand-sample__byline')!)).toBeGreaterThanOrEqual(11);
  expect(size(at.querySelector('.crewlet-brand-sample__wordmark')!)).toBeGreaterThanOrEqual(12);
  expect(inside(at)).toEqual([]);
});

test("in a 285px preview the slide's footer is drawn at the small step, inside the frame", async () => {
  await page.viewport(1280, 800);
  const at = await mount(285, 'slide');
  expect(size(at.querySelector('.crewlet-brand-sample__footer')!)).toBeGreaterThanOrEqual(11);
  expect(inside(at)).toEqual([]);
});

for (const width of [160, 220, 250]) {
  test(`at a ${width}px thumbnail every line of the doc is still inside the frame`, async () => {
    await page.viewport(1280, 800);
    const at = await mount(width, 'doc');
    expect(inside(at)).toEqual([]);
  });
}

test('wide, the sample is in proportion: its sentence is its share of the width', async () => {
  await page.viewport(1280, 800);
  const at = await mount(640, 'doc');
  expect(size(at.querySelector('.crewlet-brand-sample__body')!)).toBeCloseTo(640 * 0.028, 0);
  expect(inside(at)).toEqual([]);
});

/** A computed colour as linear-light channels: `rgb()`, `color(srgb …)` or `color(srgb-linear …)`. */
function linear(css: string): [number, number, number] {
  const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const rgb = /^rgba?\(([\d.]+),?\s*([\d.]+),?\s*([\d.]+)/.exec(css);
  if (rgb) return [toLinear(+rgb[1]! / 255), toLinear(+rgb[2]! / 255), toLinear(+rgb[3]! / 255)];
  const space = /^color\((srgb-linear|srgb)\s+([-\d.e]+)\s+([-\d.e]+)\s+([-\d.e]+)/.exec(css);
  if (!space) throw new Error(`unread colour ${css}`);
  const ch = [+space[2]!, +space[3]!, +space[4]!].map((c) => Math.min(1, Math.max(0, c)));
  return (space[1] === 'srgb' ? ch.map(toLinear) : ch) as [number, number, number];
}

function contrast(a: string, b: string): number {
  const lum = ([r, g, bl]: [number, number, number]) => 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  const [x, y] = [lum(linear(a)), lum(linear(b))];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

for (const [mode, primary] of [
  ['light', undefined],
  ['light', '#ffe100'],
  ['light', '#22c55e'],
  ['dark', undefined],
  ['dark', '#1e1b4b'],
  ['dark', '#7c3aed'],
] as const) {
  test(`the sample link clears 4.5:1 on its ground, ${mode}, accent ${primary ?? 'the product’s'}`, async () => {
    await page.viewport(1280, 800);
    host = document.createElement('div');
    host.style.width = '600px';
    document.body.append(host);
    root = createRoot(host);
    flushSync(() =>
      root!.render(
        <BrandSample
          kind="doc"
          mode={mode}
          name="Nimbus"
          colors={primary ? { primary, primary_on_dark: primary } : {}}
        />,
      ),
    );
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const link = getComputedStyle(host.querySelector('.crewlet-brand-sample__link')!).color;
    const ground = getComputedStyle(host.querySelector('.crewlet-brand-sample')!).backgroundColor;
    expect(contrast(link, ground), `${link} on ${ground}`).toBeGreaterThanOrEqual(4.5);
  });
}
