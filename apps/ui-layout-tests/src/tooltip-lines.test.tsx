/**
 * A tooltip of a few lines keeps each line whole where the one-line bubble
 * would break it, and stays inside a phone's viewport.
 */
import { afterEach, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { Tooltip } from '@crewlethq/ui';

const LINES = [
  '5-hour: 83% used, resets 17:00 UTC',
  'Weekly: 41% used, resets Sun, Nov 1, 12:00 UTC',
  'Weekly Opus: reached, sitting out until Sun, Nov 1, 12:00 UTC',
];

let root: Root | null = null;
let host: HTMLElement | null = null;

afterEach(async () => {
  await userEvent.unhover(document.body);
  flushSync(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

/** The tip of a button `left` px in, opened by a resting pointer and placed. */
async function open(left: number): Promise<HTMLElement> {
  host = document.createElement('div');
  host.style.padding = `160px 0 0 ${left}px`;
  document.body.append(host);
  root = createRoot(host);
  flushSync(() =>
    root!.render(
      <Tooltip lines content={<>{LINES.map((l) => <span key={l}>{l}</span>)}</>}>
        <button type="button">Usage limits</button>
      </Tooltip>,
    ),
  );
  await document.fonts.ready;
  await userEvent.hover(host.querySelector('button')!);
  for (let i = 0; i < 80; i++) {
    const tip = document.querySelector<HTMLElement>('[role="tooltip"]');
    if (tip && getComputedStyle(tip).visibility !== 'hidden') return tip;
    await new Promise((r) => setTimeout(r, 25));
  }
  throw new Error('the tip never opened');
}

const box = (el: Element) => el.getBoundingClientRect();

test('each line stays whole, in a panel wider than the one-line bubble', async () => {
  await page.viewport(1280, 800);
  const tip = await open(400);
  const lines = [...tip.children] as HTMLElement[];
  expect(lines).toHaveLength(3);
  const lineHeight = Number.parseFloat(getComputedStyle(lines[0]!).lineHeight);
  for (const line of lines) expect(box(line).height, line.textContent!).toBeLessThan(lineHeight * 1.5);
  expect(box(lines[1]!).top).toBeGreaterThan(box(lines[0]!).bottom - 1);
  expect(box(tip).width).toBeGreaterThan(260);
});

test('on a phone the panel stays inside the viewport, wrapping a line it cannot keep whole', async () => {
  await page.viewport(390, 844);
  const tip = await open(16);
  expect(box(tip).left).toBeGreaterThanOrEqual(0);
  expect(box(tip).right).toBeLessThanOrEqual(390);
});
