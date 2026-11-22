/**
 * AN INBOX ROW'S QUICK ACTIONS STAND BESIDE ITS TIME, AND THE LIST IS ONE TAB
 * STOP, as a browser lays it out and moves focus through it.
 *
 * The tray floated over the end of the first line, so hovering or focusing a
 * conversation laid its Delete over "12s ago". And every row was two Tab
 * stops, the row and then its Delete: a hundred presses past fifty
 * conversations. Measured on the drawn page: the tray never covers the time
 * or the status, the name never moves when the tray comes, and Tab enters
 * the list once, reaches the row's own action, and leaves. And it covers
 * none of a row's words at any width, the message under the name included.
 */
import { afterEach, describe, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import type { ReactNode } from 'react';
import { InboxGroup, InboxList, InboxRow, MessageAction, MessageActions, Tag, type InboxListDensity } from '@crewlethq/ui';
import { CheckGlyph, TrashGlyph } from '@crewlethq/icons/glyphs';

let root: Root | null = null;
let host: HTMLDivElement | null = null;

afterEach(() => {
  flushSync(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

async function mount(node: ReactNode, width = 350): Promise<HTMLElement> {
  await page.viewport(1280, 800);
  host = document.createElement('div');
  host.style.cssText = `width: ${width}px;`;
  document.body.append(host);
  root = createRoot(host);
  flushSync(() => root!.render(node));
  await document.fonts.ready;
  return host;
}

/** Whether two boxes share any area, past a rounding half pixel. */
const overlap = (a: DOMRect, b: DOMRect) =>
  Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.5;

/** Settled: every transition the tray's arrival starts has run. */
const settle = () => new Promise((done) => setTimeout(done, 400));

function History({ density, tools }: { density: InboxListDensity; tools: 1 | 2 }) {
  const row = (key: string, title: string, when: string, answering = false) => (
    <InboxRow
      key={key}
      title={title}
      meta={<time>{when}</time>}
      status={answering ? <Tag size="xs" variant="info">Answering</Tag> : undefined}
      selected={answering}
      href={`#/ask/${key}`}
      actions={
        <MessageActions label={`Actions for ${title}`}>
          {tools === 2 ? <MessageAction label="Mark as read" icon={<CheckGlyph />} /> : null}
          <MessageAction label="Delete" icon={<TrashGlyph />} />
        </MessageActions>
      }
    >
      {null}
    </InboxRow>
  );
  return (
    <>
      <button type="button">Before</button>
      <InboxList label="Your conversations" density={density}>
        <InboxGroup label="Today">
          {row('one', 'Summarise every open item in every unit of the company', '16s ago', true)}
          {row('two', 'Summarise every item in the company', '12s ago')}
          {row('three', 'Follow-ups on the release', '2m ago')}
        </InboxGroup>
      </InboxList>
      <button type="button">After</button>
    </>
  );
}

describe.each([
  ['chat', 1],
  ['default', 2],
] as const)('a %s list with %i action(s) a row', (density, tools) => {
  test('the tray stands beside the time and the status, and the name does not move', async () => {
    const shown = await mount(<History density={density} tools={tools} />);
    // Every row by focus; the open row, with its status, under the pointer too.
    for (const [index, row] of [...shown.querySelectorAll<HTMLElement>('.crewlet-inbox-row')].entries()) {
      const control = row.querySelector<HTMLElement>('.crewlet-inbox-row__control')!;
      const title = row.querySelector('.crewlet-inbox-row__title')!;
      const end = row.querySelector('.crewlet-inbox-row__head-end--drawn')!;
      // The name's first line: a long name wraps onto a line under the time's.
      const line = () => title.getClientRects()[0]!;
      const rest = { title: line(), end: end.getBoundingClientRect() };
      // At rest the tray is neither seen nor reached.
      const tray = row.querySelector<HTMLElement>('.crewlet-inbox-row__actions')!;
      expect(getComputedStyle(tray).visibility).toBe('hidden');

      for (const how of index === 0 ? (['focus', 'hover'] as const) : (['focus'] as const)) {
        if (how === 'focus') control.focus();
        else await userEvent.hover(row);
        await settle();
        expect(getComputedStyle(tray).visibility, how).toBe('visible');
        const box = tray.querySelector('.crewlet-message-actions')!.getBoundingClientRect();
        const now = { title: line(), end: end.getBoundingClientRect() };
        // Never over the time or a status, and with a gap before the tray.
        expect(overlap(box, now.end), `${how}: the tray covers the time`).toBe(false);
        expect(box.left - now.end.right, how).toBeGreaterThanOrEqual(4);
        for (const part of end.querySelectorAll('.crewlet-inbox-row__meta, .crewlet-inbox-row__status')) {
          expect(overlap(box, part.getBoundingClientRect()), `${how}: the tray covers ${part.className}`).toBe(false);
        }
        // The name keeps its place and its width, and stays clear of the time.
        expect(now.title.left).toBeCloseTo(rest.title.left, 1);
        expect(now.title.width).toBeCloseTo(rest.title.width, 1);
        expect(now.title.top).toBeCloseTo(rest.title.top, 1);
        expect(now.end.left - now.title.right, `${how}: the name runs under the time`).toBeGreaterThanOrEqual(0);
        expect(overlap(box, now.title), `${how}: the tray covers the name`).toBe(false);
        if (how === 'focus') control.blur();
        else await userEvent.unhover(row);
      }
      await settle();
      // Back at rest the time returns to the end of the line.
      expect(end.getBoundingClientRect().right).toBeCloseTo(rest.end.right, 1);
    }
  });

  test('Tab enters the list once, reaches the row’s own actions, and leaves', async () => {
    const shown = await mount(<History density={density} tools={tools} />);
    const controls = [...shown.querySelectorAll<HTMLElement>('.crewlet-inbox-row__control')];
    shown.querySelector<HTMLElement>('button')!.focus();
    await userEvent.tab();
    // The open row holds the stop.
    expect(document.activeElement).toBe(controls[0]);
    await userEvent.tab();
    expect(document.activeElement?.closest('.crewlet-inbox-row__actions')?.parentElement).toBe(controls[0]!.closest('li'));
    await userEvent.tab();
    expect(document.activeElement?.textContent).toBe('After');
    // The arrows move between rows, and Tab follows the row they land on.
    controls[0]!.focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(controls[1]);
    await userEvent.tab();
    expect(document.activeElement?.closest('li')).toBe(controls[1]!.closest('li'));
    await userEvent.tab();
    expect(document.activeElement?.textContent).toBe('After');
  });
});

/** Every drawn line box of the row's words: the name, the time, the message and the lines under it. */
function wordBoxes(row: HTMLElement): { text: string; box: DOMRect }[] {
  const boxes: { text: string; box: DOMRect }[] = [];
  const walker = document.createTreeWalker(row.querySelector('.crewlet-inbox-row__body')!, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const parent = node.parentElement!;
    const text = node.textContent ?? '';
    if (!text.trim() || parent.closest('.crewlet-visually-hidden')) continue;
    if (getComputedStyle(parent).visibility === 'hidden') continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    for (const box of range.getClientRects()) if (box.width > 1 && box.height > 1) boxes.push({ text, box });
  }
  return boxes;
}

const MESSAGE =
  'Nothing was down during the restart, the deploy or the rollback. The only refusals came from one browser holding an old session cookie, which has since been cleared.';

const LONG_NAME = 'Senior Product Manager of the mobile apps and the web dashboard';

/** A row with a face and a context line, and one without a face, with a status, where and a task under it. */
function Activity({ density, tools, title }: { density: InboxListDensity; tools: 1 | 2; title: string }) {
  const tray = (
    <MessageActions label={`Actions for ${title}`}>
      {tools === 2 ? <MessageAction label="Mark as read" icon={<CheckGlyph />} /> : null}
      <MessageAction label="Open the thread in its room" icon={<TrashGlyph />} />
    </MessageActions>
  );
  return (
    <InboxList label="Activity" density={density}>
      <InboxGroup label="Today">
        <InboxRow
          title={title}
          meta={<time>13:08</time>}
          leading={<span style={{ display: 'block', width: 32, height: 32, borderRadius: 8, background: 'gray' }} />}
          context="Reply in a thread in #engineering"
          lines="all"
          unread
          actions={tray}
        >
          {MESSAGE}
        </InboxRow>
        <InboxRow
          title={title}
          meta={<time>13:05</time>}
          status={<Tag size="xs" variant="info">Answering</Tag>}
          where="#engineering"
          lines={2}
          aside={<a href="#/work/NIM-12">NIM-12 Clear dead session cookies</a>}
          actions={tray}
        >
          {MESSAGE}
        </InboxRow>
      </InboxGroup>
    </InboxList>
  );
}

/** The tray's box, and the row it stands in, while the row holds focus. */
async function shown(row: HTMLElement) {
  row.querySelector<HTMLElement>('.crewlet-inbox-row__control')!.focus();
  await settle();
  return row.querySelector('.crewlet-message-actions')!.getBoundingClientRect();
}

describe.each([
  ['chat', 1, 'Product Manager'],
  ['chat', 2, 'Product Manager'],
  ['chat', 2, LONG_NAME],
  ['default', 2, 'Product Manager'],
  ['default', 2, LONG_NAME],
] as const)('a %s row with %i action(s), named "%s"', (density, tools, title) => {
  test.each([320, 390, 720, 1200])('the tray covers none of its words at %ipx, and the row keeps its height', async (width) => {
    const list = await mount(<Activity density={density} tools={tools} title={title} />, width);
    for (const row of list.querySelectorAll<HTMLElement>('.crewlet-inbox-row')) {
      const rest = row.getBoundingClientRect();
      const tray = await shown(row);
      const words = wordBoxes(row);
      // The message reaches the row's end, so a tray over its first line would cover it.
      expect(words.some((word) => word.text === MESSAGE && word.box.right > tray.left)).toBe(true);
      for (const word of words) expect(overlap(tray, word.box), `the tray covers "${word.text}"`).toBe(false);
      // Inside the row on every side, so no scroller clips it, and nothing moves when it comes.
      const box = row.getBoundingClientRect();
      expect(tray.top).toBeGreaterThanOrEqual(box.top);
      expect(tray.bottom).toBeLessThanOrEqual(box.bottom);
      expect(tray.left).toBeGreaterThanOrEqual(box.left);
      expect(tray.right).toBeLessThanOrEqual(box.right);
      expect(box.height).toBeCloseTo(rest.height, 1);
      // Clear of the control's inset focus ring, drawn along its top edge.
      expect(tray.top - box.top).toBeGreaterThanOrEqual(2);
      // The head shows only the lines its clamp keeps: no sliver of the next one.
      const head = row.querySelector<HTMLElement>('.crewlet-inbox-row__head')!;
      const lines = density === 'chat' ? 1 : 2;
      expect(head.getBoundingClientRect().height).toBeLessThanOrEqual(lines * parseFloat(getComputedStyle(head).lineHeight) + 0.5);
      row.querySelector<HTMLElement>('.crewlet-inbox-row__control')!.blur();
    }
  });
});

test('right to left, the tray stands at the row\'s start corner and covers none of its words', async () => {
  const list = await mount(
    <div dir="rtl">
      <Activity density="chat" tools={2} title="Product Manager" />
    </div>,
    390,
  );
  for (const row of list.querySelectorAll<HTMLElement>('.crewlet-inbox-row')) {
    const tray = await shown(row);
    expect(tray.left - row.getBoundingClientRect().left).toBeLessThan(24);
    for (const word of wordBoxes(row)) expect(overlap(tray, word.box), `the tray covers "${word.text}"`).toBe(false);
    row.querySelector<HTMLElement>('.crewlet-inbox-row__control')!.blur();
  }
});
