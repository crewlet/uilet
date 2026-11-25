/**
 * A LINKED VENDOR UI NAME IS ONE BOX, measured: the chip is the link, its
 * new-tab mark sits inside the frame as its last item, and nothing in it is
 * underlined at rest, under a pointer, pressed or focused. Both palettes.
 */
import { afterEach, describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { StepLink, VendorText, VendorUI } from '@crewlethq/ui';

let root: Root | null = null;
let host: HTMLDivElement | null = null;

afterEach(async () => {
  await userEvent.unhover(document.body);
  flushSync(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
  delete document.documentElement.dataset.theme;
});

async function mount(theme: 'light' | 'dark', width = 640): Promise<HTMLDivElement> {
  document.documentElement.dataset.theme = theme;
  host = document.createElement('div');
  host.style.width = `${width}px`;
  document.body.append(host);
  root = createRoot(host);
  flushSync(() =>
    root!.render(
      <>
        <p className="parts" style={{ color: 'var(--color-text-secondary)' }}>
          A <VendorText parts={[{ ui: ['Web application'] }]} /> client from{' '}
          <VendorText parts={[{ ui: ['Google Cloud', 'Credentials'], url: 'https://example.com/credentials' }]} />, in a
          project you control.
        </p>
        <p className="composed">
          Open{' '}
          <StepLink href="https://example.com/keys">
            <VendorUI path="Team Keys" />
          </StepLink>
          .
        </p>
      </>,
    ),
  );
  await document.fonts.ready;
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  return host;
}

const decoration = (el: Element) => getComputedStyle(el).textDecorationLine;

/** Every element inside the link, the link included, takes no underline. */
function undecorated(link: Element) {
  for (const el of [link, ...link.querySelectorAll('*')]) expect(decoration(el), el.className.toString()).toBe('none');
}

function chips(page: HTMLElement) {
  return [...page.querySelectorAll<HTMLAnchorElement>('.parts a, .composed a')];
}

describe('a linked vendor UI name', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(`is the link, with its new-tab mark inside the frame, in the ${theme} palette`, async () => {
      const page = await mount(theme);
      const links = chips(page);
      expect(links).toHaveLength(2);
      for (const link of links) {
        expect(link.classList.contains('crewlet-vendor-ui')).toBe(true);
        const box = link.getBoundingClientRect();
        const mark = link.querySelector('svg.crewlet-vendor-ui__external')!.getBoundingClientRect();
        expect(mark.left).toBeGreaterThan(box.left);
        expect(mark.right).toBeLessThanOrEqual(box.right);
        expect(mark.top).toBeGreaterThanOrEqual(box.top - 0.5);
        expect(mark.bottom).toBeLessThanOrEqual(box.bottom + 0.5);
        // The mark is the box's last item: only the padding and the frame after it.
        const style = getComputedStyle(link);
        const tail = parseFloat(style.paddingRight) + parseFloat(style.borderRightWidth);
        expect(box.right - mark.right).toBeLessThanOrEqual(tail + 0.5);
        undecorated(link);
      }
    });
  }

  test('keeps the mark on the last level line when the path wraps, inside the frame', async () => {
    const page = await mount('light', 150);
    const link = chips(page)[0]!;
    const lines = [...link.getClientRects()];
    expect(lines.length).toBeGreaterThan(1);
    const last = lines.at(-1)!;
    const mark = link.querySelector('svg.crewlet-vendor-ui__external')!.getBoundingClientRect();
    expect(mark.top).toBeGreaterThanOrEqual(last.top - 0.5);
    expect(mark.right).toBeLessThanOrEqual(last.right);
    // Never on a line of its own: the last level's last line holds it.
    const level = [...link.querySelectorAll('.crewlet-vendor-ui__level')].at(-1)!;
    const word = [...level.getClientRects()].at(-1)!;
    expect(word.top < mark.bottom && mark.top < word.bottom).toBe(true);
  });

  test('answers a pointer with a fill, never an underline', async () => {
    const page = await mount('light');
    const link = chips(page)[0]!;
    const rest = getComputedStyle(link).backgroundColor;
    await userEvent.hover(link);
    await Promise.all(link.getAnimations().map((animation) => animation.finished));
    const hovered = getComputedStyle(link).backgroundColor;
    expect(hovered).not.toBe(rest);
    undecorated(link);
  });

  test('draws the focus ring and no underline when reached by keyboard', async () => {
    const page = await mount('dark');
    const link = chips(page)[0]!;
    await userEvent.tab();
    expect(document.activeElement).toBe(link);
    expect(getComputedStyle(link).outlineStyle).toBe('solid');
    expect(parseFloat(getComputedStyle(link).outlineWidth)).toBeGreaterThanOrEqual(2);
    undecorated(link);
  });
});
