/**
 * A CHAT LIST'S DAY IS A RULE BETWEEN ITS ROWS, NOT A ROW. The label was set on
 * the rows' own terms (their inset, a band nearly a row tall, the secondary
 * ink, between the rows' own hairlines), so "Today" read as a conversation
 * with no time. Measured on the drawn page: the label draws a hairline after
 * its words, in the time's quiet ink a step under a row's name, and the row
 * before a day gives its own hairline up to that rule.
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
});

async function mount(): Promise<HTMLElement> {
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

// Mutation: drop the label's ::after and it draws no rule; set it back in the
// secondary ink and it reads as a row's words.
test('a day draws a rule after its words, in the time’s ink a step under a row’s name', async () => {
  const list = await mount();
  const time = getComputedStyle(list.querySelector('.crewlet-inbox-row__meta')!);
  const name = getComputedStyle(list.querySelector('.crewlet-inbox-row__title')!);
  for (const label of list.querySelectorAll<HTMLElement>('.crewlet-inbox-list__label')) {
    const words = label.querySelector<HTMLElement>('.crewlet-inbox-list__day')!;
    const rule = getComputedStyle(label, '::after');
    expect(rule.content, `${words.textContent} draws no rule`).not.toBe('none');
    expect(parseFloat(rule.height)).toBe(1);
    // It runs from after the words to the rows' end inset.
    const box = label.getBoundingClientRect();
    const end = box.right - parseFloat(getComputedStyle(label).paddingRight);
    expect(words.getBoundingClientRect().right + parseFloat(rule.marginInlineStart) + parseFloat(rule.width)).toBeCloseTo(end, 0);
    const ink = getComputedStyle(words);
    expect(ink.color).toBe(time.color);
    expect(parseFloat(ink.fontSize)).toBeLessThan(parseFloat(name.fontSize));
    // Read with the rows it introduces: more air above its words than under them.
    const drawn = words.getBoundingClientRect();
    expect(drawn.top - box.top).toBeGreaterThan(box.bottom - drawn.bottom);
  }
});

// Mutation: keep the hairline under the last row of a day and two lines run
// a few pixels apart over the next day's words.
test('the row before a day gives its hairline up to the day’s rule, and the list’s last row keeps its own', async () => {
  const list = await mount();
  const [today, earlier] = [...list.querySelectorAll<HTMLElement>('.crewlet-inbox-list__group')];
  const hairline = (row: Element) => parseFloat(getComputedStyle(row).borderBottomWidth);
  const rows = (group: HTMLElement) => [...group.querySelectorAll<HTMLElement>('.crewlet-inbox-row')];
  expect(hairline(rows(today!)[0]!)).toBe(1);
  expect(hairline(rows(today!).at(-1)!), 'two lines between the days').toBe(0);
  expect(hairline(rows(earlier!).at(-1)!)).toBe(1);
});

// Mutation: match the last row by :last-child and, while it leaves, the row
// above it keeps its hairline over the next day's rule.
test('while the last row of a day leaves, the row above it gives its hairline up and the leaving row keeps its own', async () => {
  const list = await mount();
  const today = list.querySelector<HTMLElement>('.crewlet-inbox-list__group')!;
  const [first, last] = [...today.querySelectorAll<HTMLElement>('.crewlet-inbox-row')];
  last!.classList.add('crewlet-inbox-row--leaving');
  expect(parseFloat(getComputedStyle(first!).borderBottomWidth)).toBe(0);
  expect(parseFloat(getComputedStyle(last!).borderBottomWidth)).toBe(1);
});

// Mutation: drop the forced-colours border and the rule, a background, is
// repainted to the page's own Canvas.
test('in forced colours a day’s rule is a border in the system’s text colour', async () => {
  const list = await mount();
  const media = (features: { name: string; value: string }[]) => cdp().send('Emulation.setEmulatedMedia', { features });
  await media([{ name: 'forced-colors', value: 'active' }]);
  try {
    expect(matchMedia('(forced-colors: active)').matches).toBe(true);
    for (const label of list.querySelectorAll('.crewlet-inbox-list__label')) {
      const rule = getComputedStyle(label, '::after');
      expect(rule.borderTopStyle).toBe('solid');
      expect(parseFloat(rule.borderTopWidth)).toBe(1);
    }
  } finally {
    await media([]);
  }
});
