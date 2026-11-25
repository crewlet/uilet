/**
 * A scope row draws the name first and the ID at the row's end, level with
 * the name's first line, at a desk's width and a phone's; a long name wraps
 * beside the ID rather than running under it. A group's heading starts on
 * the rows' own inset, over its rows.
 */
import { afterEach, expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { ScopeList, type ScopeListOption } from '@crewlethq/ui';

let root: Root | null = null;
let host: HTMLElement | null = null;

afterEach(() => {
  flushSync(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

const OPTIONS: ScopeListOption[] = [
  { value: '6450012345', label: 'Tally', detail: 'com.example.tally', id: '6450012345' },
  {
    value: '6450098765',
    label: 'Tally Widgets for the Lock Screen and the Home Screen',
    detail: 'com.example.widgets.lockscreen.homescreen',
    id: '6450098765',
  },
];

async function mount(width: number, options = OPTIONS) {
  host = document.createElement('div');
  host.style.width = `${width}px`;
  document.body.append(host);
  root = createRoot(host);
  flushSync(() =>
    root!.render(<ScopeList label="Growth Marketer's apps" options={options} value={['6450012345']} onChange={() => {}} />),
  );
  await document.fonts.ready;
  for (let i = 0; i < 4; i++) await new Promise((resolve) => requestAnimationFrame(resolve));
  return host;
}

const box = (el: Element) => el.getBoundingClientRect();

for (const [name, viewport, width] of [
  ['a desk', 1440, 544],
  ['a phone', 390, 320],
] as const) {
  test(`at ${name}'s width, each row keeps its ID at the end, level with the name, and nothing leaves the row`, async () => {
    await page.viewport(viewport, 900);
    const at = await mount(width);
    for (const row of at.querySelectorAll<HTMLElement>('.crewlet-scope-list__row')) {
      const r = box(row);
      const id = box(row.querySelector('.crewlet-scope-list__id')!);
      const label = row.querySelector('.crewlet-checkbox__label')!;
      const words = box(label);
      expect(r.right - id.right).toBeLessThan(16);
      expect(words.right).toBeLessThanOrEqual(id.left);
      // THE ID'S LINE IS THE NAME'S FIRST LINE.
      const line = parseFloat(getComputedStyle(label).lineHeight);
      expect(Math.abs(id.top + id.height / 2 - (words.top + line / 2))).toBeLessThan(4);
      expect(row.scrollWidth).toBeLessThanOrEqual(row.clientWidth);
    }
  });
}

test('a chosen row is filled and an unchosen one is not', async () => {
  await page.viewport(1440, 900);
  const at = await mount(544);
  const [chosen, other] = [...at.querySelectorAll<HTMLElement>('.crewlet-scope-list__row')];
  expect(getComputedStyle(chosen!).backgroundColor).not.toBe(getComputedStyle(other!).backgroundColor);
});

const GROUPED: ScopeListOption[] = [
  { value: '900', label: 'Sandbox', id: '900234567' },
  { ...OPTIONS[0]!, group: 'Tally Labs' },
  { ...OPTIONS[1]!, group: 'Tally Retail, the account for the stores and the widgets' },
];

for (const [name, viewport, width] of [
  ['a desk', 1440, 544],
  ['a phone', 390, 320],
] as const) {
  test(`at ${name}'s width, a group's heading starts where its rows' boxes do, over them, and nothing leaves the list`, async () => {
    await page.viewport(viewport, 900);
    const at = await mount(width, GROUPED);
    const groups = [...at.querySelectorAll<HTMLElement>('.crewlet-scope-list__group')];
    expect(groups).toHaveLength(2);
    for (const group of groups) {
      const heading = group.querySelector<HTMLElement>('.crewlet-scope-list__group-name')!;
      const words = document.createRange();
      words.selectNodeContents(heading);
      const control = box(group.querySelector('.crewlet-checkbox__control')!);
      expect(Math.abs(words.getBoundingClientRect().left - control.left)).toBeLessThan(1.5);
      expect(box(heading).bottom).toBeLessThanOrEqual(box(group.querySelector('.crewlet-scope-list__row')!).top + 0.5);
      expect(box(heading).right).toBeLessThanOrEqual(box(group).right + 0.5);
    }
    const list = at.querySelector<HTMLElement>('.crewlet-scope-list')!;
    expect(list.scrollWidth).toBeLessThanOrEqual(list.clientWidth);
  });
}
