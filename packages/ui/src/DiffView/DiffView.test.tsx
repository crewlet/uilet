/**
 * A line diff: what tells a line's kind, what it underlines, the shapes it
 * takes, the window it mounts, and the tints it draws them in.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { contrast, flatten, paletteStates, parseHex, type Rgb } from '@crewlethq/tokens/test/palette';
import {
  DiffSummary,
  DiffView,
  MAX_COMPARE_LINES,
  MAX_EDITS,
  WINDOW_BLOCK_ROWS,
  WINDOW_FROM_ROWS,
  changedRuns,
  type DiffSection,
  type DiffSpan,
} from './index.js';
import type * as WordDiff from './wordDiff.js';

// The underline's reading, watched: a pass-through, so a long diff's cases can count the pairs read.
vi.mock('./wordDiff.js', async (importOriginal) => {
  const real = await importOriginal<typeof WordDiff>();
  return { ...real, changedRuns: vi.fn(real.changedRuns) };
});

afterEach(cleanup);

const SHEET = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'DiffView.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

/** The stylesheet's rules, one per selector of each, the container query's included. */
function sheetRules(): { selector: string; body: string }[] {
  return [...SHEET.matchAll(/([^{}]+)\{([^{}]*)\}/g)].flatMap(([, prelude = '', body = '']) =>
    prelude.split(',').map((selector) => ({ selector: selector.trim(), body })),
  );
}

/** A numbered line of a text: removed lines carry the older number, added the newer. */
const removed = (before: number, text: string) =>
  ({ kind: 'remove', text, before, after: null }) as const;
const added = (after: number, text: string) =>
  ({ kind: 'add', text, before: null, after }) as const;
const same = (before: number, after: number, text: string) =>
  ({ kind: 'same', text, before, after }) as const;

/** The rendered lines as `[kind, text]`. */
const lines = (root: ParentNode) =>
  [...root.querySelectorAll<HTMLElement>('.crewlet-diff-view__line')].map((line) => [
    line.dataset.kind,
    line.querySelector('.crewlet-diff-view__text')?.textContent,
  ]);

/** Every underlined run, by the kind of the line it is in. */
const runs = (root: ParentNode) =>
  [...root.querySelectorAll<HTMLElement>('.crewlet-diff-view__run')].map((run) => [
    run.closest<HTMLElement>('.crewlet-diff-view__line')?.dataset.kind,
    run.textContent,
  ]);

const EDIT = {
  before: '# Settlement\n\nNets every balance first.\n\nEqual balances are paid in any order.\n',
  after:
    '# Settlement\n\nNets every balance first.\n\nEqual balances are ordered by join order.\n\nTies are rare.\n',
};

describe('a diff of a text', () => {
  test("marks each line's kind with a glyph and the word read in its place", () => {
    const { container } = render(<DiffView {...EDIT} />);
    const kinds = [...container.querySelectorAll<HTMLElement>('.crewlet-diff-view__line')].map((line) => [
      line.dataset.kind,
      line.querySelector('.crewlet-diff-view__mark')?.textContent,
    ]);
    // The glyph is hidden from assistive technology and the word read in its
    // place, so an unchanged line's mark is a space and nothing is said.
    expect(kinds).toEqual([
      ['same', ' '],
      ['same', ' '],
      ['same', ' '],
      ['remove', '−Removed'],
      ['add', '+Added'],
      ['add', '+Added'],
      ['add', '+Added'],
    ]);
    for (const glyph of container.querySelectorAll('.crewlet-diff-view__mark > [aria-hidden]')) {
      expect(glyph.getAttribute('aria-hidden')).toBe('true');
    }
  });

  // THE INVARIANT THE UNDERLINE IS FOR: the reader finds the edit in an
  // edited line without reading it twice, and nothing else is underlined:
  // not the unchanged lines, not a line only added.
  test('underlines only the changed run of a line edited', () => {
    const { container } = render(<DiffView {...EDIT} />);
    expect(runs(container)).toEqual([
      ['remove', 'paid in any'],
      ['add', 'ordered by join'],
    ]);
    // The run is inside the line, which still reads whole.
    expect(lines(container)).toContainEqual(['remove', 'Equal balances are paid in any order.']);
  });

  test('numbers each line in the older text and the newer', () => {
    const { container } = render(<DiffView {...EDIT} context={0} />);
    const numbers = [...container.querySelectorAll<HTMLElement>('.crewlet-diff-view__line')].map((line) =>
      [...line.querySelectorAll('.crewlet-diff-view__number')].map((n) => n.textContent).join('|'),
    );
    expect(numbers).toEqual(['5|', '|5', '|6', '|7']);
    const root = container.querySelector<HTMLElement>('.crewlet-diff-view')!;
    expect(root.classList.contains('crewlet-diff-view--numbered')).toBe(true);
    // The number tracks are the widest number's digits wide, on every row.
    expect(root.style.getPropertyValue('--crewlet-diff-digits')).toBe('1');
  });

  // A GAP SAYS WHAT IT STANDS FOR: closed silently, a document edited at both
  // ends reads as one rewritten in the middle.
  test('opens a hunk on how many unchanged lines it skipped', () => {
    const hunks: DiffSection[] = [
      { skipped: 12, lines: [same(13, 13, 'kept'), removed(14, 'gone')] },
      { skipped: 1, lines: [added(16, 'new')] },
    ];
    const { container } = render(<DiffView sections={hunks} />);
    expect(
      [...container.querySelectorAll('.crewlet-diff-view__skip')].map((row) => row.textContent),
    ).toEqual(['12 unchanged lines', '1 unchanged line']);
  });

  test('counts what was added and removed, said in words, against what it names', () => {
    render(<DiffView {...EDIT} against="rev 4" />);
    const group = screen.getByRole('group', { name: 'Line changes' });
    const head = group.querySelector('.crewlet-diff-summary')!;
    expect(head.textContent).toBe('+3 −13 lines added, 1 removed against rev 4');
    // The drawn counts are hidden; the sentence is what is read.
    expect(head.querySelector("[aria-hidden='true']")?.textContent).toBe('+3 −1');
    expect(within(group).getByText('3 lines added, 1 removed')).toBeTruthy();
  });

  test("keeps an empty line's height", () => {
    const { container } = render(<DiffView before={'a\n\nb\n'} after={'a\nb\n'} />);
    expect(lines(container)).toEqual([
      ['same', 'a'],
      ['remove', ' '],
      ['same', 'b'],
    ]);
  });

  // TWO IDENTICAL DOCUMENTS ARE A FACT: the host says what was compared, and
  // a pane of unmarked lines would read as one that failed to load.
  test("draws the host's sentence when nothing changed, and its own without one", () => {
    const { container, rerender } = render(
      <DiffView before={'same\n'} after={'same\n'} empty={<p>The body did not change</p>} />,
    );
    expect(container.textContent).toBe('The body did not change');
    expect(container.querySelector('.crewlet-diff-view')).toBeNull();
    rerender(<DiffView before={'same\n'} after={'same\n'} />);
    expect(container.textContent).toBe('Nothing changed.');
  });
});

// AN UNDERLINE SAYS TWO LINES ARE ONE LINE EDITED, so it is drawn only where
// the change's shape lets position say which two: a text's lines carry
// nothing else to be paired by.
describe('which lines of a text are one line edited', () => {
  test('in a change that removes as many lines as it adds, each and the line in its place', () => {
    const hunks: DiffSection[] = [
      {
        skipped: 0,
        lines: [
          removed(1, '- name: api'),
          removed(2, '- name: web'),
          removed(3, '- name: db'),
          added(1, '- name: gateway'),
          added(2, '- name: site'),
          added(3, '- name: store'),
        ],
      },
    ];
    const { container } = render(<DiffView sections={hunks} />);
    expect(runs(container)).toEqual([
      ['remove', 'api'],
      ['remove', 'web'],
      ['remove', 'db'],
      ['add', 'gateway'],
      ['add', 'site'],
      ['add', 'store'],
    ]);
  });

  test.each([
    ['one line against several added after it', EDIT, 'paid in any', 'ordered by join'],
    [
      'several against one: lines deleted after the edited one',
      { before: EDIT.after, after: EDIT.before },
      'ordered by join',
      'paid in any',
    ],
  ])('in %s, the first line of each side', (_, texts, older, newer) => {
    const { container } = render(<DiffView {...texts} />);
    expect(runs(container)).toEqual([
      ['remove', older],
      ['add', newer],
    ]);
  });

  // TWO LINES OR MORE ON BOTH SIDES AND THE COUNTS UNEQUAL: the line one side
  // has beyond the other sits where position cannot see it, and every pair
  // below it is two neighbours, which share a key here.
  test('in nothing of an uneven change of two lines or more a side', () => {
    const hunks: DiffSection[] = [
      {
        skipped: 0,
        lines: [
          removed(1, '- name: api'),
          removed(2, '- name: web'),
          added(1, '- name: queue'),
          added(2, '- name: api-v2'),
          added(3, '- name: web-v2'),
        ],
      },
    ];
    for (const layout of ['unified', 'split'] as const) {
      const { container, unmount } = render(<DiffView sections={hunks} layout={layout} />);
      // By position "api" would read as edited into "queue", and "web" into "api-v2".
      expect(runs(container), layout).toEqual([]);
      unmount();
    }
  });

  // A CHANGE'S LENGTH DECIDES NOTHING: a long run of lines each edited in
  // place is paired line by line exactly as a short one is.
  test('in a change of thousands of lines a side, as in a short one', () => {
    const restore = installObserver();
    try {
      const n = 2_001;
      const hunks: DiffSection[] = [
        {
          skipped: 0,
          lines: [
            ...Array.from({ length: n }, (_, i) => removed(i + 1, `- name: item${i} old`)),
            ...Array.from({ length: n }, (_, i) => added(i + 1, `- name: item${i} new`)),
          ],
        },
      ];
      const { container } = render(<DiffView sections={hunks} />);
      // The first block is the first removed lines, each underlined where it
      // differs from the line in its place.
      expect(runs(container)).toEqual(
        Array.from({ length: WINDOW_BLOCK_ROWS }, () => ['remove', 'old']),
      );
    } finally {
      restore();
    }
  });
});

// A long text is compared, never drawn as replaced whole: a page edited on one
// line past 2,000 lines draws that edit.
describe('a long text', () => {
  /** 2,001 lines: one past where the old table diff stopped comparing. */
  const older = Array.from({ length: 2_001 }, (_, i) => `- name: item${i}`);

  test.each([
    [
      'edited in place',
      older.map((line, i) => (i === 1_000 ? `${line}-v2` : line)),
      [
        ['remove', '- name: item1000'],
        ['add', '- name: item1000-v2'],
      ],
      [['add', '-v2']],
    ],
    ['inserted at the top', ['- name: queue', ...older], [['add', '- name: queue']], []],
    [
      'moved to the end',
      [...older.slice(1), older[0]!],
      [
        ['remove', '- name: item0'],
        ['add', '- name: item0'],
      ],
      [],
    ],
  ])('draws one line %s as that line changed, among its context', (_, newer, changed, under) => {
    const { container } = render(
      <DiffView before={older.join('\n')} after={newer.join('\n')} against="rev 1" />,
    );
    const drawn = lines(container);
    expect(drawn.filter(([kind]) => kind !== 'same')).toEqual(changed);
    // ONLY THE CONTEXT BESIDE IT: three lines either side, in at most two places.
    expect(drawn.length).toBeLessThanOrEqual(changed.length + 12);
    expect(runs(container)).toEqual(under);
    const count = (kind: string) => changed.filter(([k]) => k === kind).length;
    expect(container.querySelector(".crewlet-diff-summary [aria-hidden='true']")?.textContent).toBe(
      `+${count("add")} −${count("remove")}`,
    );
  });

  // A COMPARISON NOT MADE IS SAID, and no row is drawn: past the lines the
  // line diff reads, or the lines it marks, two texts are a sentence that says
  // which, never a diff that says something false.
  test.each([
    [
      'with more lines removed and added than the diff marks',
      Array.from({ length: MAX_EDITS / 2 + 1 }, (_, i) => `old ${i}`),
      Array.from({ length: MAX_EDITS / 2 + 1 }, (_, i) => `new ${i}`),
      'more than 4,000 lines were removed or added',
    ],
    [
      'whose change spans more lines than the diff reads',
      Array.from({ length: MAX_COMPARE_LINES + 1 }, (_, i) => `line ${i}`),
      [
        'first, edited',
        ...Array.from({ length: MAX_COMPARE_LINES - 1 }, (_, i) => `line ${i + 1}`),
        'last, edited',
      ],
      'what changed spans 20,001 lines, more than the 20,000 a comparison reads',
    ],
  ])('draws a sentence and no row for two texts %s', (_, before, after, why) => {
    const { container } = render(
      <DiffView
        before={before.join('\n')}
        after={after.join('\n')}
        against="rev 1"
        empty={<p>The body did not change</p>}
      />,
    );
    expect(container.textContent).toBe(`The two versions were not compared line by line: ${why}.`);
    expect(container.querySelector('.crewlet-diff-view')).toBeNull();
    expect(container.querySelector('.crewlet-diff-view__line')).toBeNull();
  });
});

describe('a split diff', () => {
  test('sets each removed line beside the line that replaced it', () => {
    const { container } = render(<DiffView {...EDIT} layout="split" context={1} />);
    const root = container.querySelector<HTMLElement>('.crewlet-diff-view')!;
    expect(root.classList.contains('crewlet-diff-view--split')).toBe(true);
    const pairs = [...container.querySelectorAll<HTMLElement>('.crewlet-diff-view__pair')].map((pair) =>
      [...pair.children].map((side) =>
        side.classList.contains('crewlet-diff-view__line')
          ? `${(side as HTMLElement).dataset.kind} ${side.querySelector(".crewlet-diff-view__number")?.textContent}`
          : 'none',
      ),
    );
    expect(pairs).toEqual([
      ['same 4', 'same 4'],
      ['remove 5', 'add 5'],
      ['none', 'add 6'],
      ['none', 'add 7'],
    ]);
    // An unchanged line is read once: its newer copy is hidden from a reader
    // who hears the diff.
    const [context] = container.querySelectorAll('.crewlet-diff-view__pair');
    expect(context?.lastElementChild?.getAttribute('aria-hidden')).toBe('true');
    expect(context?.firstElementChild?.hasAttribute('aria-hidden')).toBe(false);
    // And the pair is still underlined where it changed.
    expect(runs(container)).toEqual([
      ['remove', 'paid in any'],
      ['add', 'ordered by join'],
    ]);
  });

  // TWO COLUMNS OF CODE UNDER 640PX ARE A WORD OR TWO EACH, so a diff that
  // narrow draws unified whatever it was asked for.
  test('is unified on a diff as narrow as a phone', () => {
    const width = vi.spyOn(Element.prototype, 'clientWidth', 'get').mockReturnValue(390);
    try {
      const { container } = render(<DiffView {...EDIT} layout="split" />);
      expect(container.querySelector('.crewlet-diff-view__pair')).toBeNull();
      expect(container.querySelector('.crewlet-diff-view--split')).toBeNull();
      expect(lines(container)).toContainEqual(['add', 'Ties are rare.']);
    } finally {
      width.mockRestore();
    }
  });
});

describe('a diff of settings', () => {
  const hunks: DiffSection[] = [
    {
      skipped: 0,
      lines: [{ kind: 'remove', text: '"a"', before: null, after: null, path: 'x.y' }],
    },
    {
      skipped: 0,
      lines: [
        {
          kind: 'remove',
          text: '"https://a.example.com"',
          before: null,
          after: null,
          path: 'x.url',
        },
        { kind: 'add', text: '"https://a.example.org"', before: null, after: null, path: 'x.url' },
      ],
    },
  ];

  test("draws each line's path where a text draws its numbers", () => {
    const { container } = render(<DiffView sections={hunks} />);
    const root = container.querySelector<HTMLElement>('.crewlet-diff-view')!;
    expect(root.classList.contains('crewlet-diff-view--keyed')).toBe(true);
    expect(root.classList.contains('crewlet-diff-view--numbered')).toBe(false);
    expect(container.querySelector('.crewlet-diff-view__number')).toBeNull();
    expect(
      [...container.querySelectorAll('.crewlet-diff-view__path')].map((path) => path.textContent),
    ).toEqual(['x.y', 'x.url', 'x.url']);
    expect(root.style.getPropertyValue('--crewlet-diff-path')).toBe(String('x.url'.length));
    expect(runs(container)).toEqual([
      ['remove', 'com'],
      ['add', 'org'],
    ]);
  });

  // A CHANGE CAN HOLD ONE SETTING REMOVED AND ANOTHER EDITED: paired by
  // position, the removed setting would be underlined against the edited one.
  test('underlines a removed value only against the value of its own path', () => {
    const { container } = render(
      <DiffView
        sections={[
          {
            skipped: 0,
            lines: [
              { kind: 'remove', text: 'port 80', before: null, after: null, path: 'a' },
              { kind: 'remove', text: 'port 81', before: null, after: null, path: 'b' },
              { kind: 'add', text: 'port 82', before: null, after: null, path: 'b' },
            ],
          },
        ]}
      />,
    );
    expect(runs(container)).toEqual([
      ['remove', '81'],
      ['add', '82'],
    ]);
  });

  test("is never split: a setting's two values are one path read down", () => {
    const { container } = render(<DiffView sections={hunks} layout="split" />);
    expect(container.querySelector('.crewlet-diff-view__pair')).toBeNull();
  });

  /** One setting's value of several lines, on one side, keyed by `path`. */
  const valueOf = (kind: 'add' | 'remove', path: string, text: string) =>
    text.split('\n').map((line) => ({ kind, text: line, before: null, after: null, path }));

  // Every line of a value of several lines carries its mark; its path is
  // written once and the value keeps its own track on every line.
  test('marks every line of a value of several lines, and writes its path once', () => {
    const { container } = render(
      <DiffView
        sections={[
          {
            skipped: 0,
            lines: [
              ...valueOf('remove', 'roles[1]', '{\n  "handle": "ops"\n}'),
              ...valueOf('add', 'roles[1]', '{\n  "handle": "eng"\n}'),
            ],
          },
        ]}
      />,
    );
    const drawn = [...container.querySelectorAll<HTMLElement>('.crewlet-diff-view__line')];
    expect(drawn.map((line) => line.querySelector('.crewlet-diff-view__mark')?.textContent)).toEqual([
      '−Removed',
      '−Removed',
      '−Removed',
      '+Added',
      '+Added',
      '+Added',
    ]);
    expect(
      drawn.map((line) => line.querySelector('.crewlet-diff-view__path')?.textContent ?? null),
    ).toEqual(['roles[1]', null, null, 'roles[1]', null, null]);
    const value = sheetRules().find(
      (rule) => rule.selector === '.crewlet-diff-view--keyed .crewlet-diff-view__text',
    );
    expect(value?.body).toMatch(/grid-column:\s*3/);
  });

  // Within one path the lines pair as a text's do: a list that gained an item
  // at its head underlines nothing rather than neighbours against each other.
  test("pairs the lines of a value of several lines by the rule a text's are", () => {
    const edited = render(
      <DiffView
        sections={[
          {
            skipped: 0,
            lines: [
              ...valueOf('remove', 'roles[1]', '{\n  "handle": "ops"\n}'),
              ...valueOf('add', 'roles[1]', '{\n  "handle": "eng"\n}'),
            ],
          },
        ]}
      />,
    );
    expect(runs(edited.container)).toEqual([
      ['remove', 'ops'],
      ['add', 'eng'],
    ]);
    edited.unmount();

    const grown = render(
      <DiffView
        sections={[
          {
            skipped: 0,
            lines: [
              ...valueOf(
                'remove',
                'roles[1].responsibilities',
                '[\n  "Review the budget",\n  "Review the plan"\n]',
              ),
              ...valueOf(
                'add',
                'roles[1].responsibilities',
                '[\n  "Approve hires",\n  "Review the budget",\n  "Review the plan"\n]',
              ),
            ],
          },
        ]}
      />,
    );
    expect(runs(grown.container)).toEqual([]);
  });
});

// A host's notes are drawn under their line once in either layout, and a line
// is picked by its own number (its newer, else its older).
describe('a diff a host writes on', () => {
  const HUNKS: DiffSection[] = [
    {
      skipped: 0,
      lines: [same(1, 1, 'keep'), removed(2, 'old'), added(2, 'new'), same(3, 3, 'end')],
    },
  ];

  test("draws a host's notes under the line they are on, and only there", () => {
    for (const layout of ['unified', 'split'] as const) {
      const { container, unmount } = render(
        <DiffView
          sections={HUNKS}
          layout={layout}
          notes={(line) => (line.after === 2 ? <p>finding on 2</p> : null)}
        />,
      );
      const notes = container.querySelectorAll('.crewlet-diff-view__notes');
      expect(notes, layout).toHaveLength(1);
      expect(notes[0]!.textContent).toBe('finding on 2');
      unmount();
    }
  });

  test('picks a line by its own number, and marks what the host picked', () => {
    const pick = vi.fn();
    render(<DiffView sections={HUNKS} onPick={pick} picked={(line) => line.after === 3} />);
    act(() => screen.getByRole('button', { name: 'Line 2: pick it' }).click());
    expect(pick).toHaveBeenCalledWith(HUNKS[0]!.lines[2], false);
    act(() => screen.getByRole('button', { name: 'Removed line 2: pick it' }).click());
    expect(pick).toHaveBeenLastCalledWith(HUNKS[0]!.lines[1], false);
    // ONE BUTTON A LINE, on its own number: four lines, four buttons.
    expect(screen.getAllByRole('button')).toHaveLength(4);
    const marked = document.querySelectorAll<HTMLElement>('.crewlet-diff-view__line--picked');
    expect([...marked].map((l) => l.querySelector('.crewlet-diff-view__text')?.textContent)).toEqual([
      'end',
    ]);
  });

  test('draws no button where the host picks nothing', () => {
    render(<DiffView sections={HUNKS} />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });
});

describe("a diff with a host's spans", () => {
  test('draws exactly the plain line where the host has no spans for it', () => {
    const sections: DiffSection[] = [
      { skipped: 4, lines: [same(5, 5, 'keep'), removed(6, 'paid in any order'), added(6, 'paid in join order')] },
    ];
    const plain = render(<DiffView sections={sections} />);
    const html = plain.container.innerHTML;
    expect(runs(plain.container).length).toBeGreaterThan(0);
    plain.unmount();
    const spanless = render(<DiffView sections={sections} tokens={() => null} />);
    expect(spanless.container.innerHTML).toBe(html);
  });

  /** A Go line's spans as a grammar would cut them: the keyword, then plain. */
  const GO: DiffSection[] = [
    {
      skipped: 0,
      lines: [
        same(1, 1, 'defer close(ch)'),
        removed(2, 'func Get(id int) {'),
        added(2, 'func Find(id int) {'),
      ],
    },
  ];
  const goSpans = (text: string): DiffSpan[] => {
    const word = text.indexOf(' ');
    return [
      { end: word, className: 'code-syn-keyword' },
      { end: word + 1, className: null },
      { end: text.indexOf('('), className: 'code-syn-function' },
      { end: text.length, className: null },
    ];
  };
  /** Each side's text by number, the way a host reads its blobs. */
  const SIDES = {
    before: ['defer close(ch)', 'func Get(id int) {'],
    after: ['defer close(ch)', 'func Find(id int) {'],
  };
  const classed = (root: ParentNode) =>
    [...root.querySelectorAll<HTMLElement>('.crewlet-diff-view__text [class]')].map((el) => [
      el.closest<HTMLElement>('.crewlet-diff-view__line')?.dataset.kind,
      el.className,
      el.textContent,
    ]);

  // Mutation: asking a removed line on the `after` side fails this case.
  test.each(['unified', 'split'] as const)(
    "a %s code diff draws its host's spans around the changed run, and the run stays the code's own text",
    (layout) => {
      const asked: string[] = [];
      const tokens = vi.fn((side: 'before' | 'after', n: number) => {
        asked.push(`${side} ${n}`);
        return goSpans(SIDES[side][n - 1]!);
      });
      const plain = render(<DiffView sections={GO} layout={layout} />);
      const texts = lines(plain.container);
      plain.unmount();
      const { container } = render(
        <DiffView sections={GO} layout={layout} tokens={tokens} />,
      );
      expect(lines(container)).toEqual(texts);
      // THE RUN IS ONE ELEMENT HOLDING ITS TEXT, never a span of syntax.
      expect(runs(container)).toEqual([
        ['remove', 'Get'],
        ['add', 'Find'],
      ]);
      for (const run of container.querySelectorAll('.crewlet-diff-view__run')) {
        expect(run.childElementCount).toBe(0);
      }
      expect(classed(container)).toEqual(
        layout === 'unified'
          ? [
              ['same', 'code-syn-keyword', 'defer'],
              ['same', 'code-syn-function', 'close'],
              ['remove', 'code-syn-keyword', 'func'],
              ['remove', 'crewlet-diff-view__run', 'Get'],
              ['add', 'code-syn-keyword', 'func'],
              ['add', 'crewlet-diff-view__run', 'Find'],
            ]
          : [
              ['same', 'code-syn-keyword', 'defer'],
              ['same', 'code-syn-function', 'close'],
              ['same', 'code-syn-keyword', 'defer'],
              ['same', 'code-syn-function', 'close'],
              ['remove', 'code-syn-keyword', 'func'],
              ['remove', 'crewlet-diff-view__run', 'Get'],
              ['add', 'code-syn-keyword', 'func'],
              ['add', 'crewlet-diff-view__run', 'Find'],
            ],
      );
      // A REMOVED LINE IS THE OLDER BLOB'S, an added the newer's; an unchanged
      // one the newer's, but on a split's left the older's.
      expect(asked.sort()).toEqual(
        layout === 'unified'
          ? ['after 1', 'after 2', 'before 2']
          : ['after 1', 'after 2', 'before 1', 'before 2'],
      );
    },
  );

});

/**
 * An IntersectionObserver the case drives: jsdom has none, and the window's
 * whole behaviour is what the observer reports.
 */
class Observer {
  static made: Observer[] = [];
  readonly watched = new Set<Element>();
  constructor(
    readonly report: IntersectionObserverCallback,
    readonly options: IntersectionObserverInit | undefined,
  ) {
    Observer.made.push(this);
  }
  observe(el: Element) {
    this.watched.add(el);
  }
  unobserve(el: Element) {
    this.watched.delete(el);
  }
  disconnect() {
    this.watched.clear();
  }
  takeRecords() {
    return [];
  }
  /** Says which blocks are near the view now, with the height each had. */
  say(blocks: { block: number; near: boolean; height?: number }[]) {
    const entries = blocks.map(({ block, near, height = 0 }) => ({
      target: [...this.watched].find((el) => (el as HTMLElement).dataset.block === String(block)),
      isIntersecting: near,
      boundingClientRect: { height },
    }));
    act(() => this.report(entries as never, this as never));
  }
}

/** Puts `value` in place of the global observer, and hands back what puts the old one back. */
function replaceObserver(value: unknown): () => void {
  const had = Object.getOwnPropertyDescriptor(globalThis, 'IntersectionObserver');
  if (value === undefined)
    delete (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver;
  else
    Object.defineProperty(globalThis, 'IntersectionObserver', {
      configurable: true,
      writable: true,
      value,
    });
  return () => {
    if (had) Object.defineProperty(globalThis, 'IntersectionObserver', had);
    else delete (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver;
  };
}

function installObserver(): () => void {
  Observer.made = [];
  return replaceObserver(Observer);
}

/** One hunk of `n` added lines. */
const longDiff = (n: number): DiffSection[] => [
  { skipped: 0, lines: Array.from({ length: n }, (_, i) => added(i + 1, `line ${i + 1}`)) },
];

/** `n` lines each edited in place: a hunk each, its old line removed and its new one added. */
const editedLines = (n: number): DiffSection[] =>
  Array.from({ length: n }, (_, i) => ({
    skipped: 0,
    lines: [removed(i + 1, `line ${i + 1} was`), added(i + 1, `line ${i + 1} is`)],
  }));

describe('a long diff', () => {
  test("mounts only the blocks near the view, and keeps the others' height", () => {
    const restore = installObserver();
    try {
      const rows = 30 * WINDOW_BLOCK_ROWS;
      const { container } = render(
        <div style={{ overflowY: 'auto' }} data-testid="scroller">
          <DiffView sections={longDiff(rows)} />
        </div>,
      );
      const blocks = () => [...container.querySelectorAll<HTMLElement>('.crewlet-diff-view__block')];
      // BEFORE THE OBSERVER HAS SPOKEN, the first block alone.
      expect(container.querySelectorAll('.crewlet-diff-view__line')).toHaveLength(WINDOW_BLOCK_ROWS);
      expect(blocks()).toHaveLength(30);
      const [observer, ...more] = Observer.made;
      expect(more).toEqual([]);
      // ITS ROOT IS THE DIFF'S OWN SCROLLER, with one view's margin either
      // side: a margin on the viewport never reaches past the scroller's clip.
      expect(observer!.options?.root).toBe(screen.getByTestId('scroller'));
      expect(observer!.options?.rootMargin).toBe('100% 0px');
      expect(observer!.watched.size).toBe(30);

      // The reader scrolls: the first block leaves, measured as it goes, and
      // two blocks further down come within a view.
      observer!.say([
        { block: 0, near: false, height: 2400 },
        { block: 7, near: true },
        { block: 8, near: true },
      ]);
      expect(container.querySelectorAll('.crewlet-diff-view__line')).toHaveLength(2 * WINDOW_BLOCK_ROWS);
      expect(lines(container)[0]).toEqual(['add', `line ${7 * WINDOW_BLOCK_ROWS + 1}`]);
      const first = blocks()[0]!;
      expect(first.childElementCount).toBe(0);
      expect(first.getAttribute('aria-hidden')).toBe('true');
      // THE HEIGHT IT HAD, so nothing above the reader's place moves; and a
      // block never drawn takes the measured block's height per row.
      expect(first.style.height).toBe('2400px');
      expect(blocks()[20]!.style.height).toBe('2400px');

      // A BLOCK TAKEN IN AND LET GO BEFORE IT WAS DRAWN is still its empty
      // box, so what it measured as it left is that box's height: an
      // estimate, never kept as the block's own.
      observer!.say([
        { block: 12, near: true },
        { block: 12, near: false, height: 999 },
      ]);
      expect(blocks()[12]!.childElementCount).toBe(0);
      expect(blocks()[12]!.style.height).toBe('2400px');
    } finally {
      restore();
    }
  });

  // A HIDDEN PANEL LAYS NOTHING OUT: its zeros are no row's height, and taken
  // as one they would bring every block within the window when it is shown.
  test('takes no measurement from a box with no height', () => {
    const restore = installObserver();
    try {
      const { container } = render(<DiffView sections={longDiff(30 * WINDOW_BLOCK_ROWS)} />);
      Observer.made[0]!.say([{ block: 0, near: false, height: 0 }]);
      const [first, second] = container.querySelectorAll<HTMLElement>('.crewlet-diff-view__block');
      expect(first!.childElementCount).toBe(0);
      expect(first!.style.height).not.toBe('0px');
      expect(first!.style.height).toBe(second!.style.height);
    } finally {
      restore();
    }
  });

  // THE WINDOW BOUNDS THE READING, not only the mounting: a pair's words are
  // read once one of its lines is drawn, so a diff of any length reads, before
  // its first paint, the pairs it draws and no others.
  test('reads only the pairs of the blocks it holds, and each of them once', () => {
    const restore = installObserver();
    try {
      const read = vi.mocked(changedRuns);
      read.mockClear();
      // Unified, an edited line is two rows: 30 blocks of 50 pairs each.
      const { container } = render(<DiffView sections={editedLines(15 * WINDOW_BLOCK_ROWS)} />);
      const pairsABlock = WINDOW_BLOCK_ROWS / 2;
      expect(container.querySelectorAll('.crewlet-diff-view__block')).toHaveLength(30);
      expect(read).toHaveBeenCalledTimes(pairsABlock);
      expect(runs(container).slice(0, 2)).toEqual([
        ['remove', 'was'],
        ['add', 'is'],
      ]);

      const observer = Observer.made[0]!;
      observer.say([
        { block: 0, near: false, height: 2400 },
        { block: 7, near: true },
        { block: 8, near: true },
      ]);
      expect(read).toHaveBeenCalledTimes(3 * pairsABlock);
      // A BLOCK TAKEN IN AGAIN reads nothing twice, and underlines as it did.
      observer.say([{ block: 0, near: true }]);
      expect(read).toHaveBeenCalledTimes(3 * pairsABlock);
      expect(runs(container)).toHaveLength(2 * 3 * pairsABlock);
    } finally {
      restore();
    }
  });

  // Mutation: computing spans for every line in DiffView's render fails this case.
  test('asks for the spans of the rows it draws, and once a mounted line', () => {
    const restore = installObserver();
    try {
      const calls = new Map<number, number>();
      const tokens = vi.fn((_: 'before' | 'after', n: number) => {
        calls.set(n, (calls.get(n) ?? 0) + 1);
        return [{ end: 4, className: 'code-syn-keyword' }];
      });
      const { container } = render(
        <DiffView sections={longDiff(30 * WINDOW_BLOCK_ROWS)} tokens={tokens} />,
      );
      expect(container.querySelectorAll('.code-syn-keyword')).toHaveLength(WINDOW_BLOCK_ROWS);
      expect([...calls.keys()].sort((a, b) => a - b)).toEqual(
        Array.from({ length: WINDOW_BLOCK_ROWS }, (_, i) => i + 1),
      );
      const observer = Observer.made[0]!;
      observer.say([
        { block: 0, near: true, height: 2400 },
        { block: 7, near: true },
      ]);
      // THE WINDOW REDRAWS THE BLOCK IT KEPT, which asks its lines nothing again.
      expect(calls.size).toBe(2 * WINDOW_BLOCK_ROWS);
      expect(calls.has(7 * WINDOW_BLOCK_ROWS + 1)).toBe(true);
      expect([...calls.values()].every((n) => n === 1)).toBe(true);
      expect(container.querySelectorAll('.code-syn-keyword')).toHaveLength(2 * WINDOW_BLOCK_ROWS);
    } finally {
      restore();
    }
  });

  test("reads a split row's pair once for both of its sides", () => {
    const restore = installObserver();
    try {
      const read = vi.mocked(changedRuns);
      read.mockClear();
      // Split, an edited line is one row: the first block is 100 pairs.
      const { container } = render(
        <DiffView sections={editedLines(15 * WINDOW_BLOCK_ROWS)} layout="split" />,
      );
      expect(container.querySelectorAll('.crewlet-diff-view__pair')).toHaveLength(WINDOW_BLOCK_ROWS);
      expect(runs(container)).toHaveLength(2 * WINDOW_BLOCK_ROWS);
      expect(read).toHaveBeenCalledTimes(WINDOW_BLOCK_ROWS);
    } finally {
      restore();
    }
  });

  test('is mounted whole up to the windowing threshold', () => {
    const restore = installObserver();
    try {
      const { container } = render(<DiffView sections={longDiff(WINDOW_FROM_ROWS)} />);
      expect(container.querySelectorAll('.crewlet-diff-view__line')).toHaveLength(WINDOW_FROM_ROWS);
      // Below it no observer is asked for at all.
      expect(Observer.made).toEqual([]);
    } finally {
      restore();
    }
  });

  // A revealed line outside the mounted blocks: its block's box first, then
  // the line once the block holds it, once per reveal.
  test('reveals a line past the blocks it holds, its block first and then the line, once', () => {
    const restore = installObserver();
    const scrolled: Element[] = [];
    const had = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView');
    Element.prototype.scrollIntoView = function (this: Element) {
      scrolled.push(this);
    };
    try {
      const at = 9 * WINDOW_BLOCK_ROWS;
      // ONE PREDICATE, as a host keeps it across its renders.
      const reveal = (line: { after: number | null }) => line.after === at;
      const hunks = longDiff(30 * WINDOW_BLOCK_ROWS);
      const { container, rerender } = render(<DiffView sections={hunks} reveal={reveal} />);
      // Line 900 is row 899, in block 8, of which nothing is drawn yet.
      const box = container.querySelector<HTMLElement>('[data-block="8"]')!;
      expect(box.childElementCount).toBe(0);
      expect(scrolled).toEqual([box]);

      Observer.made[0]!.say([
        { block: 0, near: false, height: 2100 },
        { block: 8, near: true },
      ]);
      const line = scrolled.at(-1) as HTMLElement;
      expect(scrolled).toHaveLength(2);
      expect(line.classList.contains('crewlet-diff-view__line')).toBe(true);
      expect(line.querySelector('.crewlet-diff-view__text')?.textContent).toBe(`line ${at}`);

      // THE READER MOVES ON: the window letting the block go and taking it
      // in again, or the host drawing again, moves nobody back.
      Observer.made[0]!.say([{ block: 8, near: false, height: 2100 }]);
      Observer.made[0]!.say([{ block: 8, near: true }]);
      rerender(<DiffView sections={hunks} reveal={reveal} />);
      expect(scrolled).toHaveLength(2);
    } finally {
      if (had) Object.defineProperty(Element.prototype, 'scrollIntoView', had);
      restore();
    }
  });

  test('reveals a line of a diff it holds whole at once, on the line', () => {
    const restore = replaceObserver(undefined);
    const scrolled: Element[] = [];
    const had = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView');
    Element.prototype.scrollIntoView = function (this: Element) {
      scrolled.push(this);
    };
    try {
      const at = 9 * WINDOW_BLOCK_ROWS;
      render(<DiffView sections={longDiff(30 * WINDOW_BLOCK_ROWS)} reveal={(l) => l.after === at} />);
      expect(scrolled).toHaveLength(1);
      expect(scrolled[0]!.querySelector('.crewlet-diff-view__text')?.textContent).toBe(`line ${at}`);
    } finally {
      if (had) Object.defineProperty(Element.prototype, 'scrollIntoView', had);
      restore();
    }
  });

  // NO OBSERVER, NO WINDOW: slower, and never wrong.
  test('is mounted whole where the browser has no observer', () => {
    const restore = replaceObserver(undefined);
    try {
      const rows = WINDOW_FROM_ROWS + WINDOW_BLOCK_ROWS;
      const { container } = render(<DiffView sections={longDiff(rows)} />);
      expect(container.querySelectorAll('.crewlet-diff-view__line')).toHaveLength(rows);
    } finally {
      restore();
    }
  });
});

describe('the tints', () => {
  test("a changed line's tint, band, glyph, numbers and run read the diff family", () => {
    const body = (selector: string) =>
      sheetRules()
        .filter((rule) => rule.selector === selector)
        .map((rule) => rule.body)
        .join('');
    const pairs: [string, RegExp][] = [
      ['.crewlet-diff-view__line--add', /background: var\(--color-diff-added-row\);[\s\S]*var\(--color-diff-added-gutter\)/],
      ['.crewlet-diff-view__line--remove', /background: var\(--color-diff-removed-row\);[\s\S]*var\(--color-diff-removed-gutter\)/],
      ['.crewlet-diff-view__line--add .crewlet-diff-view__mark', /color: var\(--color-diff-added-sign\);/],
      ['.crewlet-diff-view__line--add .crewlet-diff-view__number', /color: var\(--color-diff-added-sign\);/],
      ['.crewlet-diff-view__line--remove .crewlet-diff-view__mark', /color: var\(--color-diff-removed-sign\);/],
      ['.crewlet-diff-view__line--remove .crewlet-diff-view__number', /color: var\(--color-diff-removed-sign\);/],
      ['.crewlet-diff-view__line--add .crewlet-diff-view__run', /background: var\(--color-diff-added-word\);/],
      ['.crewlet-diff-view__line--remove .crewlet-diff-view__run', /background: var\(--color-diff-removed-word\);/],
      ['.crewlet-diff-view__skip', /background: var\(--color-diff-hunk-row\);/],
      ['.crewlet-diff-summary__added', /color: var\(--color-diff-added-sign\);/],
      ['.crewlet-diff-summary__removed', /color: var\(--color-diff-removed-sign\);/],
    ];
    for (const [selector, declaration] of pairs) expect(body(selector), selector).toMatch(declaration);
  });

  test('every line of every diff is tinted by its kind, whatever the host', () => {
    const { container } = render(<DiffView {...EDIT} />);
    const kinds = [...container.querySelectorAll<HTMLElement>('.crewlet-diff-view__line')].map((line) => [
      line.dataset.kind,
      line.classList.contains('crewlet-diff-view__line--add'),
      line.classList.contains('crewlet-diff-view__line--remove'),
    ]);
    expect(kinds).toContainEqual(['add', true, false]);
    expect(kinds).toContainEqual(['remove', false, true]);
    expect(kinds).toContainEqual(['same', false, false]);
  });

  // WCAG 1.4.3 for what is read on a tint: the line's text, its glyph and
  // numbers, an edited run's text, and the gap's words, in light and dark.
  test('the text on each tint clears 4.5:1 in light and dark', () => {
    const tokensCss = resolve(dirname(fileURLToPath(import.meta.url)), '../../../tokens/dist/css');
    const states = paletteStates({
      tokens: readFileSync(resolve(tokensCss, 'tokens.css'), 'utf8'),
      themes: readFileSync(resolve(tokensCss, 'themes.css'), 'utf8'),
    });
    // Spelled without the leading dashes: the package's variable check reads a quoted `--name` as a declaration.
    const token = (name: string) => `--${name}`;
    const failures: string[] = [];
    let measured = 0;
    for (const [state, values] of Object.entries(states)) {
      if (state === 'base') continue;
      const raw = (name: string): string => {
        const value = values.get(name);
        if (value === undefined) throw new Error(`${state} does not emit ${name}`);
        const alias = /^var\((--[\w-]+)\)$/.exec(value.trim());
        return alias ? raw(alias[1]!) : value;
      };
      const ground = parseHex(raw(token('color-surface-subtle')));
      if (ground === null) throw new Error(`${state}: the card rung is not opaque`);
      const over = (name: string, under: Rgb) => parseHex(raw(name)) ?? flatten(raw(name), under);
      const ink = (name: string) => over(name, ground);
      const check = (what: string, text: string, on: Rgb) => {
        const ratio = contrast(ink(text), on);
        measured += 1;
        if (ratio < 4.5) failures.push(`${state}: ${what}: ${ratio.toFixed(2)}:1`);
      };
      for (const kind of ['added', 'removed']) {
        const row = over(token(`color-diff-${kind}-row`), ground);
        const band = over(token(`color-diff-${kind}-gutter`), row);
        const word = over(token(`color-diff-${kind}-word`), row);
        check(`text on the ${kind} line`, token('color-text-primary'), row);
        check(`sign on the ${kind} line`, token(`color-diff-${kind}-sign`), row);
        check(`number on the ${kind} band`, token(`color-diff-${kind}-sign`), band);
        check(`run on the ${kind} word tint`, token('color-text-primary'), word);
      }
      check('gap on the hunk row', token('color-text-tertiary'), over(token('color-diff-hunk-row'), ground));
    }
    expect(measured).toBeGreaterThanOrEqual(18);
    expect(failures).toEqual([]);
  });
});

describe('its words', () => {
  test('can be said in another language', () => {
    render(
      <DiffView
        sections={[{ skipped: 8, lines: [removed(9, 'alt'), added(9, 'neu')] }]}
        labels={{ added: 'Neu', removed: 'Weg', skipped: (n) => `${n} gleich`, region: 'Zeilen' }}
      />,
    );
    expect(screen.getByText('Neu')).toBeTruthy();
    expect(screen.getByText('Weg')).toBeTruthy();
    expect(screen.getByText('8 gleich')).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Zeilen' })).toBeTruthy();
  });

  test('say a comparison not made in place of every row, in the host’s words when given', () => {
    const long = Array.from({ length: MAX_COMPARE_LINES + 1 }, (_, i) => `line ${i}`).join('\n');
    const { container, rerender } = render(<DiffView before="" after={long} />);
    expect(container.textContent).toBe(
      `The two versions were not compared line by line: what changed spans ${(MAX_COMPARE_LINES + 1).toLocaleString()} lines, more than the ${MAX_COMPARE_LINES.toLocaleString()} a comparison reads.`,
    );
    expect(container.querySelector('.crewlet-diff-view__line')).toBeNull();
    rerender(<DiffView before="" after={long} labels={{ notCompared: (why) => `Nicht verglichen: ${why.kind}` }} />);
    expect(container.textContent).toBe('Nicht verglichen: too-large');
  });

  test('the summary reads a sentence in place of the drawn counts', () => {
    const { container } = render(<DiffSummary added={3} removed={1} against="version 4" />);
    expect(screen.getByText('3 lines added, 1 removed')).toBeTruthy();
    expect(container.textContent).toContain('against version 4');
    expect(container.querySelector('.crewlet-diff-summary__added')!.closest('[aria-hidden="true"]')).not.toBeNull();
  });
});

test('a diff, split or keyed or written on, carries no violation', async () => {
  const { container } = render(
    <main>
      <DiffView {...EDIT} against="rev 4" />
      <DiffView {...EDIT} layout="split" onPick={() => {}} picked={(line) => line.after === 5} notes={(line) => (line.after === 5 ? <p>A note</p> : null)} />
      <DiffView sections={[{ skipped: 0, lines: [{ kind: 'remove', text: '10', before: null, after: null, path: 'limit' }, { kind: 'add', text: '20', before: null, after: null, path: 'limit' }] }]} />
    </main>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations.map((v) => v.id)).toEqual([]);
});
