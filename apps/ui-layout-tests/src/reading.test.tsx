/**
 * HOW A SENTENCE AND A TITLE BREAK, measured: a reference never parts from
 * the punctuation around it, a reading pane's title fills its first line, a
 * new item in a reading pane opens at its head, and no block in a reading
 * pane carries the blocks beside it past the column.
 */
import { afterEach, expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import type { ReactNode } from 'react';
import {
  InlineCode,
  InlineRef,
  ReadingPane,
  ReadingPaneLead,
  ReadingPaneQuote,
  ReadingPaneReasoning,
  ReadingPaneSection,
  ReadingPaneTitle,
  Text,
  peelPunctuation,
} from '@crewlethq/ui';

let root: Root | null = null;
let host: HTMLElement | null = null;

afterEach(() => {
  flushSync(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

async function mount(node: ReactNode): Promise<HTMLElement> {
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  flushSync(() => root!.render(node));
  await document.fonts.ready;
  return host;
}

interface Glyph {
  c: string;
  left: number;
  right: number;
  bottom: number;
}

/** Every glyph a reader sees in `el`, in order: what only a screen reader hears is left out. */
function glyphs(el: Element): Glyph[] {
  const out: Glyph[] = [];
  const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let node = walk.nextNode(); node; node = walk.nextNode()) {
    if (node.parentElement?.closest('.crewlet-inline-ref__said')) continue;
    const text = node.textContent ?? '';
    for (let i = 0; i < text.length; i++) {
      const range = document.createRange();
      range.setStart(node, i);
      range.setEnd(node, i + 1);
      const rect = range.getClientRects()[0];
      if (rect) out.push({ c: text[i]!, left: rect.left, right: rect.right, bottom: rect.bottom });
    }
  }
  return out;
}

const sameLine = (a: Glyph, b: Glyph) => Math.abs(a.bottom - b.bottom) < 6;

/** The sentence a caller builds: the words, with what opens and closes around the token handed to it. */
function Sentence({ width, token }: { width: number; token: (open: string, close: string) => ReactNode }) {
  const { before, open, close, after } = peelPunctuation('Approve merging backend#51 (', ') into main?');
  return (
    <Text as="p" style={{ width, margin: 0 }}>
      {before}
      {token(open, close)}
      {after}
    </Text>
  );
}

const TOKENS: {
  name: string;
  first: string;
  last: string;
  /** The box that must fit a line for the token and its "(" to share one. */
  unit: string;
  token: (open: string, close: string) => ReactNode;
}[] = [
  {
    name: 'a reference',
    first: 'E',
    last: '2',
    unit: '.crewlet-inline-ref-bound',
    token: (open, close) => (
      <InlineRef href="#/worklet/ENG-42" mark={<svg viewBox="0 0 16 16" />} kind="Task" code open={open} close={close}>
        ENG-42
      </InlineRef>
    ),
  },
  {
    name: 'a whole code chip',
    first: 'm',
    last: 'y',
    unit: '.crewlet-inline-code-bound',
    token: (open, close) => (
      <InlineCode whole open={open} close={close}>
        make deploy
      </InlineCode>
    ),
  },
  {
    name: 'an address',
    first: 'h',
    last: '7',
    unit: '.crewlet-inline-ref__head',
    token: (open, close) => (
      <InlineRef href="https://status.example.com/incidents/2026-11-07" mark={<svg viewBox="0 0 16 16" />} wrap open={open} close={close}>
        https://status.example.com/incidents/2026-11-07
      </InlineRef>
    ),
  },
];

for (const { name, first, last, unit, token } of TOKENS) {
  test(`${name} never parts from the punctuation around it, at any width a line holds them`, async () => {
    await page.viewport(1280, 800);
    // Narrower than its unit, a token breaks inside, which is what keeps it in its box.
    const wide = await mount(<Sentence width={1000} token={token} />);
    const fits = wide.querySelector(unit)?.getBoundingClientRect().width ?? 0;
    expect(fits, `${unit} is drawn`).toBeGreaterThan(0);
    flushSync(() => root?.unmount());
    host?.remove();
    const stranded: number[] = [];
    for (let width = Math.max(160, Math.ceil(fits)); width <= 600; width += 4) {
      const at = await mount(<Sentence width={width} token={token} />);
      const all = glyphs(at);
      const open = all.findIndex((g) => g.c === '(');
      const close = all.findIndex((g) => g.c === ')');
      expect(open, `"(" is drawn at ${width}px`).toBeGreaterThanOrEqual(0);
      const head = all.slice(open + 1).find((g) => g.c === first)!;
      const tail = [...all.slice(0, close)].reverse().find((g) => g.c === last)!;
      if (!sameLine(all[open]!, head) || !sameLine(tail, all[close]!)) stranded.push(width);
      flushSync(() => root?.unmount());
      host?.remove();
    }
    expect(stranded, 'widths where "(" or ")" sat on a line its token left').toEqual([]);
  });
}

const QUESTION = 'Should the restart loop fix ship to every host tonight, or wait until the volume reset is confirmed on staging?';

test("a reading pane's title fills its first line to within one word, at any width", async () => {
  await page.viewport(1280, 800);
  const loose: string[] = [];
  for (let width = 300; width <= 640; width += 10) {
    const at = await mount(
      <div style={{ width }}>
        <ReadingPane>
          <ReadingPaneTitle>{QUESTION}</ReadingPaneTitle>
        </ReadingPane>
      </div>,
    );
    const title = at.querySelector('.crewlet-reading-pane__title')!;
    // The words: runs of glyphs between spaces, a run cut where a line breaks.
    const words: Glyph[][] = [];
    let word: Glyph[] | null = null;
    for (const g of glyphs(title)) {
      if (g.c === ' ') word = null;
      else if (word && sameLine(word[0]!, g)) word.push(g);
      else words.push((word = [g]));
    }
    const lines: Glyph[][][] = [];
    for (const w of words) {
      const row = lines.find((r) => sameLine(r[0]![0]!, w[0]!));
      if (row) row.push(w);
      else lines.push([w]);
    }
    const span = (w: Glyph[] | undefined) => (w ? w.at(-1)!.right - w[0]!.left : 0);
    if (lines.length > 1) {
      const gap = title.getBoundingClientRect().right - lines[0]!.at(-1)!.at(-1)!.right;
      const [next, after] = lines[1]!;
      const space = 6;
      // At most one word that would have fitted moved down: the one a last line keeps.
      if (gap >= span(next) + space + span(after) + space) loose.push(`${width}px (gap ${Math.round(gap)})`);
    }
    flushSync(() => root?.unmount());
    host?.remove();
  }
  expect(loose, 'widths where the first line left room for the next two words').toEqual([]);
});

test('a new item in a reading pane opens at its head, wherever the last one was scrolled to', async () => {
  await page.viewport(1280, 800);
  const Item = ({ item }: { item: number }) => (
    <div data-scroller style={{ height: 320, overflowY: 'auto' }}>
      <ReadingPane contentKey={item}>
        <ReadingPaneTitle>{`Is host ${item} stable after the restart?`}</ReadingPaneTitle>
        {Array.from({ length: 30 }, (_, line) => (
          <Text as="p" key={line}>
            The worker restarted cleanly and has held for a day; the volume is mounted where it should be.
          </Text>
        ))}
      </ReadingPane>
    </div>
  );
  const at = await mount(<Item item={1} />);
  const scroller = at.querySelector<HTMLElement>('[data-scroller]')!;
  scroller.scrollTop = 600;
  expect(scroller.scrollTop).toBeGreaterThan(0);
  flushSync(() => root!.render(<Item item={2} />));
  expect(scroller.scrollTop).toBe(0);
  const title = at.querySelector('.crewlet-reading-pane__title')!.getBoundingClientRect();
  const view = scroller.getBoundingClientRect();
  expect(title.top).toBeGreaterThanOrEqual(view.top);
  expect(title.bottom).toBeLessThanOrEqual(view.bottom);
});

/** One line no break opportunity splits, as a rendered Markdown fence draws it. */
const UNBROKEN = `rsync --archive --delete ${'/srv/releases/2026-11-08/build-artifacts/'.repeat(10)}`;

/** Every slot a reading pane holds rendered Markdown in, each with an unbreakable block among its paragraphs. */
const SLOTS: { name: string; slot: (body: ReactNode) => ReactNode }[] = [
  { name: 'the lead', slot: (body) => <ReadingPaneLead>{body}</ReadingPaneLead> },
  { name: 'a quote', slot: (body) => <ReadingPaneQuote>{body}</ReadingPaneQuote> },
  { name: 'the reasoning', slot: (body) => <ReadingPaneReasoning title="Why">{body}</ReadingPaneReasoning> },
  { name: 'a section', slot: (body) => <ReadingPaneSection label="What happened next">{body}</ReadingPaneSection> },
];

for (const { name, slot } of SLOTS) {
  test(`a line that does not wrap in ${name} never carries the blocks beside it past the column`, async () => {
    for (const viewport of [1440, 2560]) {
      await page.viewport(viewport, 900);
      const at = await mount(
        <div style={{ width: viewport }}>
          <ReadingPane>
            <ReadingPaneTitle>May the site reliability engineer run a command on the production server?</ReadingPaneTitle>
            {slot(
              <>
                <p data-block>The command runs once, as the operating user, and nothing else runs with it.</p>
                <pre data-unbroken style={{ margin: 0 }}>
                  <code>{UNBROKEN}</code>
                </pre>
                <p data-block>The reason the agent gave follows, in its own words.</p>
              </>,
            )}
          </ReadingPane>
        </div>,
      );
      const column = at.querySelector('.crewlet-reading-pane__column')!;
      const style = getComputedStyle(column);
      const inner = column.getBoundingClientRect().right - parseFloat(style.paddingRight);
      expect(column.getBoundingClientRect().width, `the column holds its measure at ${viewport}px`).toBeLessThanOrEqual(640);
      for (const block of at.querySelectorAll('[data-block], [data-unbroken]')) {
        expect(block.getBoundingClientRect().right, `a block's right edge at ${viewport}px`).toBeLessThanOrEqual(inner + 0.5);
      }
      flushSync(() => root?.unmount());
      host?.remove();
    }
  });
}
