/**
 * An amount never breaks across lines and its digits line up in a column; a
 * money field's currency never sits over the typed amount, however narrow the
 * field; a rating's stars stand on one line, a half star cut at its middle.
 */
import { afterEach, describe, expect, test } from 'vitest';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import type { ReactNode } from 'react';
import { Money, MoneyField, Rating } from '@crewlethq/ui';

let root: Root | null = null;
let host: HTMLElement | null = null;

afterEach(() => {
  flushSync(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
  document.documentElement.removeAttribute('data-theme');
});

async function mount(width: number, node: ReactNode, theme: 'light' | 'dark' = 'light'): Promise<HTMLElement> {
  document.documentElement.setAttribute('data-theme', theme);
  host = document.createElement('div');
  host.style.width = `${width}px`;
  document.body.append(host);
  root = createRoot(host);
  flushSync(() => root!.render(node));
  await document.fonts.ready;
  return host;
}

const box = (el: Element) => el.getBoundingClientRect();

describe.each(['light', 'dark'] as const)('on a %s document', (theme) => {
  test('an amount stays on one line in a box narrower than it', async () => {
    // Named in words, the amount carries an ordinary space a line could break at.
    const at = await mount(40, <Money micros={1_250_000_000n} currency="EUR" locale="en-US" currencyDisplay="name" />, theme);
    const money = at.querySelector('.crewlet-money')!;
    const line = parseFloat(getComputedStyle(money).lineHeight);
    expect(box(money).height).toBeLessThanOrEqual(line + 1);
    expect(money.getClientRects()).toHaveLength(1);
  });

  test('amounts with the same count of digits are the same width, so a column lines up', async () => {
    const at = await mount(
      400,
      <div>
        <div><Money micros={111_110_000n} currency="EUR" locale="en-US" /></div>
        <div><Money micros={888_880_000n} currency="EUR" locale="en-US" /></div>
      </div>,
      theme,
    );
    const [ones, eights] = [...at.querySelectorAll('.crewlet-money')].map((money) => box(money).width);
    expect(Math.abs(ones! - eights!)).toBeLessThan(0.5);
  });

  test.each([160, 240])("a money field %ipx wide keeps its currency clear of the amount and inside the field", async (width) => {
    const at = await mount(width, <MoneyField aria-label="Daily" value="123456789012.00" onValueChange={() => {}} currency="KWD" />, theme);
    const field = at.querySelector('.crewlet-money-field')!;
    const input = at.querySelector('input')!;
    const currency = at.querySelector('.crewlet-money-field__currency')!;
    expect(box(input).right).toBeLessThanOrEqual(box(currency).left + 0.5);
    expect(box(currency).right).toBeLessThanOrEqual(box(field).right + 0.5);
    expect(field.scrollWidth).toBeLessThanOrEqual(field.clientWidth + 1);
    // The currency stands on the field's middle line.
    const middle = (rect: DOMRect) => rect.top + rect.height / 2;
    expect(Math.abs(middle(box(currency)) - middle(box(input)))).toBeLessThanOrEqual(1.5);
  });

  test('a rating stands on one line, and a half star shows half its width', async () => {
    const at = await mount(400, <Rating value={3.5} showValue />, theme);
    const stars = [...at.querySelectorAll('.crewlet-rating__star')];
    expect(stars).toHaveLength(5);
    const tops = new Set(stars.map((star) => Math.round(box(star).top)));
    expect(tops.size).toBe(1);
    const half = at.querySelector('.crewlet-rating__on--half')!;
    expect(getComputedStyle(half).clipPath).toBe('inset(0px 50% 0px 0px)');
    // The filled star sits exactly over the outline it fills.
    const under = half.parentElement!.querySelector('.crewlet-rating__off')!;
    expect([box(half).left, box(half).top]).toEqual([box(under).left, box(under).top]);
  });
});
