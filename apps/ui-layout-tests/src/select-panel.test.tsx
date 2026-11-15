/**
 * A SELECT'S LIST IS SET AT A WIDTH ITS OPTIONS CAN BE READ AT, measured.
 *
 * A field's list used to be exactly its field's width, so a field in a table
 * cell (115px) offered a sentence per option a word or two to a line, one
 * option taller than the window. A described list is now never narrower than
 * a readable floor or wider than a readable measure, never wider than the
 * window, and never taller than the room beside its field, so it never covers
 * the answer it was opened from. A list of names still matches its field.
 */
import { afterEach, expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { LayerHost, Select, type SelectOption, type SelectProps } from '@crewlethq/ui';

type SelectWidth = NonNullable<SelectProps['width']>;

let root: Root | null = null;
let host: HTMLElement | null = null;

afterEach(() => {
  flushSync(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

// Four access levels, each a name over the sentence saying what it grants,
// the last as long as the longest a product offers.
const LEVELS: SelectOption[] = [
  {
    value: 'read',
    label: 'Read',
    description:
      'Reads zones, zone settings, DNS, cache rules, transform rules, firewall and WAF rules, IP lists, SSL and analytics.',
  },
  { value: 'operate', label: 'Operate', description: 'Everything Read does, plus purging the cache and editing cache rules.' },
  {
    value: 'configure',
    label: 'Configure',
    description:
      'Everything Operate does, plus editing transform rules, compression rules and every zone setting, the SSL mode and security level included.',
  },
  {
    value: 'secure',
    label: 'Secure',
    description:
      "Everything Configure does, plus editing the zones' WAF rules and the account's IP lists. It can leave access behind that outlives the agent's token: an allow or skip rule, or an address added to an IP list.",
  },
];

const NAMES: SelectOption[] = [
  { value: 'read', label: 'Read' },
  { value: 'write', label: 'Write' },
  { value: 'admin', label: 'Admin' },
];

const rem = () => Number.parseFloat(getComputedStyle(document.documentElement).fontSize);

/** A field in a table cell `cell` pixels wide, `top` pixels down the page, opened. */
async function open({
  cell,
  options = LEVELS,
  width = 'full',
  top = 120,
}: {
  cell: number;
  options?: SelectOption[];
  width?: SelectWidth;
  top?: number;
}) {
  // The page the layer host covers, as an application's shell does, with the
  // field in a cell of it.
  host = document.createElement('div');
  host.style.cssText = 'position: fixed; inset: 0;';
  document.body.append(host);
  root = createRoot(host);
  flushSync(() =>
    root!.render(
      <LayerHost>
        <div style={{ position: 'absolute', left: 24, top, width: cell }}>
          <Select size="sm" width={width} ariaLabel="SRE's access" value="secure" options={options} />
        </div>
      </LayerHost>,
    ),
  );
  await document.fonts.ready;
  host.querySelector<HTMLElement>('[role="combobox"]')!.click();
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const panel = document.querySelector<HTMLElement>('.crewlet-select__menu')!;
  const field = host.querySelector<HTMLElement>('.crewlet-select')!;
  return { panel, field: field.getBoundingClientRect(), box: panel.getBoundingClientRect() };
}

/** How many lines a description runs to. */
function lines(desc: HTMLElement): number {
  const height = desc.getBoundingClientRect().height;
  return Math.round(height / Number.parseFloat(getComputedStyle(desc).lineHeight));
}

test('a described list opened from a narrow field is set at a readable width, not the field', async () => {
  await page.viewport(1440, 900);
  const { panel, field, box } = await open({ cell: 115 });
  expect(field.width).toBeLessThan(120);
  expect(box.width).toBeGreaterThanOrEqual(22 * rem() - 0.5);
  expect(box.width).toBeLessThanOrEqual(28 * rem() + 0.5);
  // No option is broken a word or two to a line: the longest sentence (209
  // characters) takes a handful of lines, where at the field's width it took
  // more than twenty.
  const descs = [...panel.querySelectorAll<HTMLElement>('.crewlet-select__option-desc')];
  expect(descs).toHaveLength(4);
  for (const desc of descs) expect(lines(desc)).toBeLessThanOrEqual(5);
  // Every level shows without a scroll, and the chosen one with them.
  const list = panel.querySelector<HTMLElement>('[role="listbox"]')!;
  expect(list.scrollHeight).toBeLessThanOrEqual(list.clientHeight + 1);
  expect(panel.querySelector('[aria-selected="true"]')!.textContent).toContain('Secure');
});

test('on a phone the described list is no wider than the window, and inside it', async () => {
  await page.viewport(390, 844);
  const { box } = await open({ cell: 115 });
  expect(box.left).toBeGreaterThanOrEqual(4);
  expect(box.right).toBeLessThanOrEqual(390 - 4);
  expect(box.width).toBeGreaterThanOrEqual(Math.min(22 * rem(), 390 - 8) - 0.5);
});

test("a picker's described list sizes to its options up to the measure, not across the window", async () => {
  await page.viewport(1440, 900);
  const { box } = await open({ cell: 115, width: 'auto' });
  expect(box.width).toBeGreaterThanOrEqual(22 * rem() - 0.5);
  expect(box.width).toBeLessThanOrEqual(28 * rem() + 0.5);
});

test('a list of names still matches its field, and a wide field still sets a described list', async () => {
  await page.viewport(1440, 900);
  const names = await open({ cell: 115, options: NAMES });
  expect(Math.abs(names.box.width - names.field.width)).toBeLessThan(0.5);
  flushSync(() => root?.unmount());
  host?.remove();
  const wide = await open({ cell: 600 });
  expect(Math.abs(wide.box.width - wide.field.width)).toBeLessThan(0.5);
});

test('a list taller than either side of its field fits on one side and never covers the field', async () => {
  await page.viewport(1440, 420);
  // The field halfway down a short window: neither side holds the whole list.
  const { panel, field, box } = await open({ cell: 115, top: 190 });
  const covers = box.top < field.bottom && box.bottom > field.top;
  expect(covers).toBe(false);
  expect(box.top).toBeGreaterThanOrEqual(4 - 0.5);
  expect(box.bottom).toBeLessThanOrEqual(420 - 4 + 0.5);
  // The list scrolls inside what is left rather than cover the answer.
  const list = panel.querySelector<HTMLElement>('[role="listbox"]')!;
  expect(list.scrollHeight).toBeGreaterThan(list.clientHeight);
});
