/**
 * A CHAT LIST'S DAY IS A THIN BAND ACROSS THE LIST. Measured on the drawn
 * page, in both palettes: the label runs the list's full width on the sunk-well
 * fill, draws no rule, centres its words on equal padding and stands well
 * under a row's height; the row before a day gives its own hairline up to it.
 */
import { afterEach, expect, test } from 'vitest';
import { cdp, page } from 'vitest/browser';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { InboxGroup, InboxList, InboxRow, MessageAction, MessageActions } from '@crewlethq/ui';
import { TrashGlyph } from '@crewlethq/icons/glyphs';

let root: Root | null = null;
let host: HTMLDivElement | null = null;

afterEach(() => {
  flushSync(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
  delete document.documentElement.dataset.theme;
});

async function mount(theme: 'light' | 'dark' = 'light'): Promise<HTMLElement> {
  document.documentElement.dataset.theme = theme;
  await page.viewport(1280, 800);
  host = document.createElement('div');
  host.style.cssText = 'width: 380px;';
  document.body.append(host);
  root = createRoot(host);
  const row = (title: string, when: string) => (
    <InboxRow
      key={title}
      title={title}
      meta={<time>{when}</time>}
      href="#"
      actions={
        <MessageActions label={`Actions for ${title}`}>
          <MessageAction label="More actions" icon={<TrashGlyph />} />
        </MessageActions>
      }
    />
  );
  flushSync(() =>
    root!.render(
      <InboxList label="Your conversations" density="chat">
        <InboxGroup label="Today">
          {row('Brief: Inbox', '9h ago')}
          {row('What value should I copy', '8h ago')}
        </InboxGroup>
        <InboxGroup label="Previous 7 days">
          {row('Web restyle confirmed live', '2d ago')}
          {row('Why agents are idle', '2d ago')}
        </InboxGroup>
      </InboxList>,
    ),
  );
  await document.fonts.ready;
  return host;
}

/** What the sunk-well token paints in the palette set now, read off a probe. */
function insetFill(): string {
  const probe = document.createElement('div');
  probe.style.background = 'var(--color-surface-inset)';
  document.body.append(probe);
  const fill = getComputedStyle(probe).backgroundColor;
  probe.remove();
  return fill;
}

// Mutation: put the ::after rule back, the 12px over 4px padding, or the band
// on the list's own ground, and this goes red.
for (const theme of ['light', 'dark'] as const) {
  test(`a day is a thin full-width band on the sunk-well fill, its words centred and no rule (${theme})`, async () => {
    const host = await mount(theme);
    const list = host.querySelector<HTMLElement>('.crewlet-inbox-list')!.getBoundingClientRect();
    const row = host.querySelector<HTMLElement>('.crewlet-inbox-row')!.getBoundingClientRect();
    const time = getComputedStyle(host.querySelector('.crewlet-inbox-row__meta')!);
    const name = getComputedStyle(host.querySelector('.crewlet-inbox-row__title')!);
    const fill = insetFill();
    expect(fill).not.toBe('rgba(0, 0, 0, 0)');
    for (const label of host.querySelectorAll<HTMLElement>('.crewlet-inbox-list__label')) {
      const words = label.querySelector<HTMLElement>('.crewlet-inbox-list__day')!;
      const day = words.textContent;
      expect(getComputedStyle(label, '::after').content, `${day} draws a rule`).toBe('none');
      expect(getComputedStyle(label).backgroundColor, `${day} is not on the band's fill`).toBe(fill);
      const band = label.getBoundingClientRect();
      expect(band.left).toBeCloseTo(list.left, 0);
      expect(band.width).toBeCloseTo(list.width, 0);
      expect(band.height, `${day} is not thin`).toBeLessThan(row.height / 2);
      const drawn = words.getBoundingClientRect();
      expect(drawn.top - band.top, `${day} is not centred`).toBeCloseTo(band.bottom - drawn.bottom, 0);
      const ink = getComputedStyle(words);
      expect(ink.color).toBe(time.color);
      expect(parseFloat(ink.fontSize)).toBeLessThan(parseFloat(name.fontSize));
    }
  });
}

// Mutation: keep the hairline under the last row of a day and two lines run
// over the band's top edge.
test('the row before a day gives its hairline up to the day’s band, and the list’s last row keeps its own', async () => {
  const list = await mount();
  const [today, earlier] = [...list.querySelectorAll<HTMLElement>('.crewlet-inbox-list__group')];
  const hairline = (row: Element) => parseFloat(getComputedStyle(row).borderBottomWidth);
  const rows = (group: HTMLElement) => [...group.querySelectorAll<HTMLElement>('.crewlet-inbox-row')];
  expect(hairline(rows(today!)[0]!)).toBe(1);
  expect(hairline(rows(today!).at(-1)!), 'two lines between the days').toBe(0);
  expect(hairline(rows(earlier!).at(-1)!)).toBe(1);
});

// Mutation: match the last row by :last-child and, while it leaves, the row
// above it keeps its hairline over the next day's band.
test('while the last row of a day leaves, the row above it gives its hairline up and the leaving row keeps its own', async () => {
  const list = await mount();
  const today = list.querySelector<HTMLElement>('.crewlet-inbox-list__group')!;
  const [first, last] = [...today.querySelectorAll<HTMLElement>('.crewlet-inbox-row')];
  last!.classList.add('crewlet-inbox-row--leaving');
  expect(parseFloat(getComputedStyle(first!).borderBottomWidth)).toBe(0);
  expect(parseFloat(getComputedStyle(last!).borderBottomWidth)).toBe(1);
});

// Mutation: drop the forced-colours border and the band, a background, is
// repainted to the page's own Canvas with nothing marking it.
test('in forced colours a day’s band is bordered in the system’s text colour', async () => {
  const list = await mount();
  const media = (features: { name: string; value: string }[]) => cdp().send('Emulation.setEmulatedMedia', { features });
  await media([{ name: 'forced-colors', value: 'active' }]);
  try {
    expect(matchMedia('(forced-colors: active)').matches).toBe(true);
    for (const label of list.querySelectorAll('.crewlet-inbox-list__label')) {
      const band = getComputedStyle(label);
      expect(band.borderTopStyle).toBe('solid');
      expect(parseFloat(band.borderTopWidth)).toBe(1);
      expect(band.borderBottomStyle).toBe('solid');
    }
  } finally {
    await media([]);
  }
});
