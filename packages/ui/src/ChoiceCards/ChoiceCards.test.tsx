/**
 * Choices as cards: one radio group, every card its radio's label, a disabled
 * card saying why, and a fact's state in words beside its dot.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { GLYPH_SIZES } from '@crewlethq/icons/glyphs';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { channels, installThemed, px, themeColour } from '../../../../apps/ui-tests/src/cascade.js';
import { ChoiceCards, type ChoiceCardOption } from './index.js';

afterEach(cleanup);

/** A token's custom property, built here so the stylesheet checks do not read it as one this file declares. */
const token = (name: string) => `--${name}`;

/**
 * What the radio of this name is described by, as assistive technology
 * computes it: Testing Library's role query computes it with
 * computeAccessibleDescription, and hands it to the matcher, which keeps it.
 * Its spaces are folded.
 */
function description(name: string): string {
  let computed = '';
  screen.getByRole('radio', {
    name,
    description: (text) => {
      computed = text;
      return true;
    },
  });
  return computed.replace(/\s+/g, ' ').trim();
}

const OPTIONS: ChoiceCardOption[] = [
  {
    value: 'container',
    label: 'In a container',
    tag: 'Company default',
    description: 'A fresh container for each coding run.',
    facts: [
      { label: 'Needs', value: 'Docker 24.0.7 found', tone: 'success' },
      { label: 'Isolation', value: 'Own filesystem' },
    ],
  },
  { value: 'direct', label: 'On the host', description: 'Runs as the engine’s user.' },
  {
    value: 'e2b',
    label: 'In E2B',
    facts: [{ label: 'Needs', value: 'E2B key not set', tone: 'warning' }],
    disabled: true,
    disabledReason: 'Add E2B_API_KEY under Settings, Secrets.',
  },
];

test('is one radio group named by its label, every card a radio named by its own words', () => {
  render(<ChoiceCards label="Where it runs" options={OPTIONS} value="container" onChange={() => {}} />);
  const group = screen.getByRole('radiogroup', { name: 'Where it runs' });
  expect(group.querySelectorAll('input[type="radio"]')).toHaveLength(3);
  expect(screen.getByRole('radio', { name: /In a container/ })).toHaveProperty('checked', true);
  expect(screen.getByText('Company default')).toBeTruthy();
});

test('choosing a card reports its value, and a disabled card neither chooses nor hides why', () => {
  const onChange = vi.fn();
  render(<ChoiceCards label="Where it runs" options={OPTIONS} value="container" onChange={onChange} />);
  fireEvent.click(screen.getByText('On the host'));
  expect(onChange).toHaveBeenCalledWith('direct');
  const e2b = screen.getByRole('radio', { name: /In E2B/ }) as HTMLInputElement;
  expect(e2b.disabled).toBe(true);
  expect(description('In E2B')).toMatch(/Add E2B_API_KEY under Settings, Secrets\.$/);
});

test('a fact with a state draws its dot beside the words, never alone', () => {
  const { container } = render(<ChoiceCards label="Where it runs" options={OPTIONS} value={null} onChange={() => {}} />);
  const status = container.querySelector('.crewlet-status');
  expect(status?.textContent?.trim()).toBe('Docker 24.0.7 found');
  expect(status?.querySelector('.crewlet-status-dot')?.getAttribute('aria-hidden')).toBe('true');
});

test('a disabled card gives its reason on one last line, read with its radio, and every card spans that line', () => {
  const { container } = render(
    <ChoiceCards
      label="Where coding runs happen"
      value="direct"
      onChange={() => {}}
      options={[
        { value: 'direct', label: 'On the host', description: 'Runs beside the engine.', facts: [{ label: 'Needs', value: 'Nothing more' }] },
        {
          value: 'e2b',
          label: 'In E2B',
          description: 'A cloud sandbox.',
          facts: [
            { label: 'Needs', value: 'E2B key not set', tone: 'warning' },
            { label: 'Isolation', value: 'A separate machine' },
          ],
          disabled: true,
          disabledReason: 'Add E2B_API_KEY to use it.',
        },
      ]}
    />,
  );
  expect(description('In E2B')).toMatch(/Add E2B_API_KEY to use it\.$/);
  // The name, the description, the most facts any card has (two) and the reason: five rows for every card.
  const group = container.querySelector('.crewlet-choice-cards') as HTMLElement;
  expect(group.style.getPropertyValue('--crewlet-choice-cards-rows')).toBe('5');
});

test('a reason given on a fact’s line keeps the disabled card to the same lines as the cards beside it', () => {
  const { container } = render(
    <ChoiceCards
      label="Where coding runs happen"
      value="direct"
      onChange={() => {}}
      options={[
        {
          value: 'direct',
          label: 'On the host',
          description: 'Runs beside the engine.',
          facts: [
            { label: 'Needs', value: 'Nothing more needed', tone: 'success' },
            { label: 'Isolation', value: 'Shares the host' },
          ],
        },
        {
          value: 'e2b',
          label: 'In E2B',
          description: 'A cloud sandbox.',
          facts: [
            { label: 'Needs', value: 'E2B key not set', tone: 'warning' },
            { label: 'Isolation', value: 'A separate machine' },
          ],
          disabled: true,
          disabledReason: 'E2B key not set. Add E2B_API_KEY.',
          disabledReasonAt: 0,
        },
      ]}
    />,
  );
  // Equal heights: every card spans the name, the description and two facts, and no reason row.
  const group = container.querySelector('.crewlet-choice-cards') as HTMLElement;
  expect(group.style.getPropertyValue('--crewlet-choice-cards-rows')).toBe('4');
  const [host, e2bCard] = [...container.querySelectorAll('.crewlet-choice-cards__card')];
  expect(e2bCard!.children.length).toBe(host!.children.length);
  expect(e2bCard!.querySelector('.crewlet-choice-cards__reason')).toBeNull();
  // The reason is the Needs line's value, and the radio's description ends with it, read once.
  const needs = e2bCard!.querySelector('.crewlet-choice-cards__fact.is-reason')!;
  expect(needs.textContent?.replace(/\s+/g, ' ')).toBe('Needs E2B key not set. Add E2B_API_KEY.');
  // The line is read whole, its name with it, in its place among the facts, and once.
  expect(description('In E2B')).toBe('A cloud sandbox. Needs E2B key not set. Add E2B_API_KEY. Isolation A separate machine');
});

test('the narrowest a card stands is the prop that says so, sm, md or lg', () => {
  const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'ChoiceCards.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  for (const [width, rem] of [['sm', '15rem'], ['md', '20rem'], ['lg', '24rem']] as const) {
    const { container } = render(
      <ChoiceCards label="Cards" options={OPTIONS} value={null} onChange={() => {}} minCardWidth={width} />,
    );
    expect(container.querySelector('.crewlet-choice-cards')!.classList.contains(`crewlet-choice-cards--${width}`), width).toBe(true);
    cleanup();
    // md is the group's own default; sm and lg each set the property again.
    const rule = width === 'md' ? /\.crewlet-choice-cards \{([^}]*)\}/.exec(css)?.[1] : new RegExp(`\\.crewlet-choice-cards--${width} \\{([^}]*)\\}`).exec(css)?.[1];
    expect(rule, width).toMatch(new RegExp(`--crewlet-choice-cards-min:\\s*${rem};`));
  }
});

/**
 * COMPACT TAKES LESS ROOM AND KEEPS EVERY LINE: three cards have to stand
 * side by side in a form's wide column, and a disabled card's reason is still
 * the one way it says why, so nothing is clamped or dropped to fit.
 */
test('compact takes less room around the same lines, and keeps every line whole', () => {
  const uninstall = installThemed('light', 'ChoiceCards/ChoiceCards.css');
  try {
    const glyph = <svg width="24" height="24" aria-hidden />;
    const withMedia = OPTIONS.map((o) => ({ ...o, media: glyph }));
    const measure = (density: 'comfortable' | 'compact') => {
      const { container } = render(
        <ChoiceCards label="Cards" options={withMedia} value="container" onChange={() => {}} density={density} />,
      );
      const card = container.querySelector('.crewlet-choice-cards__card')!;
      const out = {
        padding: px(card, 'padding-top'),
        margin: px(card, 'margin-block-end'),
        gap: px(container.querySelector('.crewlet-choice-cards')!, 'column-gap'),
        description: px(card.querySelector('.crewlet-choice-cards__description')!, 'font-size'),
        text: container.textContent,
        compact: container.querySelector('.crewlet-choice-cards')!.classList.contains('crewlet-choice-cards--compact'),
      };
      cleanup();
      return out;
    };
    const roomy = measure('comfortable');
    const tight = measure('compact');
    expect(roomy.compact).toBe(false);
    expect(tight.compact).toBe(true);
    expect(tight.padding).toBeGreaterThan(0);
    expect(tight.padding).toBeLessThan(roomy.padding);
    expect(tight.margin).toBeLessThan(roomy.margin);
    expect(tight.gap).toBeLessThan(roomy.gap);
    expect(tight.description).toBeLessThan(roomy.description);
    // EVERY LINE STAYS: the same words, the reason whole.
    expect(tight.text).toBe(roomy.text);
    expect(tight.text).toContain('Add E2B_API_KEY under Settings, Secrets.');
  } finally {
    uninstall();
  }
  // NOTHING IN COMPACT CLAMPS: no ellipsis or line clamp on any of its rules.
  const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'ChoiceCards.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const compact = [...css.matchAll(/\.crewlet-choice-cards--compact[^{]*\{([^}]*)\}/g)].map((m) => m[1]).join('');
  expect(compact).not.toMatch(/line-clamp|text-overflow|white-space:\s*nowrap|display:\s*none/);
  // The picture is capped at the small mark size, both ways, whatever size the caller drew it at.
  // (jsdom resolves no custom property, so the rule is read rather than computed.)
  expect(css).toMatch(/--crewlet-choice-cards-compact-media:\s*1\.25rem;/);
  const media = /\.crewlet-choice-cards--compact \.crewlet-choice-cards__media svg \{([^}]*)\}/.exec(css)?.[1] ?? '';
  expect(media).toMatch(/inline-size:\s*var\(--crewlet-choice-cards-compact-media\);/);
  expect(media).toMatch(/block-size:\s*var\(--crewlet-choice-cards-compact-media\);/);
});

/**
 * The title's first line, MEASURED from the cascade: where the name's centre
 * falls against the radio's, which is drawn centred on the title step.
 *
 * jsdom lays nothing out, so the line is computed the way a browser lays a
 * flex line from the properties the sheet gives it, each read off the
 * installed sheet: the name's box (its `min-block-size`, or the document's
 * own line it inherits from `@crewlethq/tokens/css/base`, 13px at 1.45), the
 * mark's box, whether the title wraps and where its lines pack
 * (`align-content`), and whether the title's box stretches to its subgrid row
 * (`align-self`), which is taller when a card beside it takes two lines. Every
 * `var()` is resolved from the nearest element declaring it, and its
 * arithmetic by jsdom's own `calc()` on a probe.
 */
const DOCUMENT_LINE = 13 * 1.45;

function declared(element: Element, name: string): string {
  for (let at: Element | null = element; at; at = at.parentElement) {
    const value = getComputedStyle(at).getPropertyValue(name).trim();
    if (value !== '') return value;
  }
  throw new Error(`${name} is declared on nothing above this element`);
}

/** A length the sheet writes, resolved: 0 where the property is unset. */
function length(element: Element, property: string): number {
  let value = getComputedStyle(element).getPropertyValue(property).trim();
  if (value === '' || value === 'auto' || value === 'none') return 0;
  for (let depth = 0; value.includes('var('); depth++) {
    if (depth > 8) throw new Error(`${property}: ${value} does not resolve`);
    value = value.replace(/var\((--[\w-]+)\)/g, (_, name: string) => declared(element, name));
  }
  const probe = document.createElement('div');
  probe.style.width = value;
  document.body.append(probe);
  const resolved = px(probe, 'width');
  probe.remove();
  return resolved;
}

/** The name's and the radio's vertical centres in a card, given the height of its title's subgrid row. */
function centres(card: Element, row: number | null): { name: number; radio: number } {
  const title = card.querySelector('.crewlet-choice-cards__title')!;
  const label = card.querySelector('.crewlet-choice-cards__label')!;
  const radio = card.querySelector('.crewlet-choice-cards__radio')!;
  const mark = card.querySelector('.crewlet-choice-cards__media svg');
  const name = Math.max(DOCUMENT_LINE, length(label, 'min-block-size'), length(label, 'min-height'));
  const drawn = mark ? length(mark, 'block-size') || Number(mark.getAttribute('height')) : 0;
  const line = Math.max(name, drawn);
  const own = Math.max(length(title, 'min-height'), line);
  const style = getComputedStyle(title);
  // A title that starts at its row's top is its own height; one that stretches is the row's.
  const box = /^(flex-)?start$/.test(style.alignSelf) || row === null ? own : Math.max(own, row);
  // A multi-line container packed at the start lays its line at its contents' height; any
  // other (a single line, or lines stretched) makes the one line the whole box.
  const packed = style.flexWrap === 'wrap' && /^(flex-)?start$/.test(style.alignContent);
  const height = packed ? line : box;
  return {
    name: length(card, 'padding-top') + height / 2,
    radio: length(radio, 'inset-block-start') + length(radio, 'height') / 2,
  };
}

describe.each(['comfortable', 'compact'] as const)('at %s density', (density) => {
  let uninstall = () => {};
  beforeEach(() => {
    uninstall = installThemed('light', 'ChoiceCards/ChoiceCards.css');
  });
  afterEach(() => uninstall());

  test.each([
    ['a text-only card', false, null],
    ['a card with a 24px mark', true, null],
    ['a card beside a neighbour whose title takes two lines', true, 2 * 26 + 4],
  ] as const)('%s centres its name on its radio', (_, marked, row) => {
    const { container } = render(
      <ChoiceCards
        label="Cards"
        density={density}
        value="a"
        onChange={() => {}}
        options={[
          {
            value: 'a',
            label: 'On the host',
            ...(marked ? { media: <svg width="24" height="24" aria-hidden /> } : {}),
          },
        ]}
      />,
    );
    const { name, radio } = centres(container.querySelector('.crewlet-choice-cards__card')!, row);
    expect(name).toBeCloseTo(radio, 1);
  });
});

/** The compact cap is the icons package's `lg` glyph step, not a size of its own. */
test("compact's largest picture is the icons package's lg glyph step", () => {
  const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'ChoiceCards.css'), 'utf8');
  const rem = /--crewlet-choice-cards-compact-media:\s*([\d.]+)rem;/.exec(css)?.[1];
  expect(Number(rem) * 16).toBe(GLYPH_SIZES.lg);
});

test('compact cards have no accessibility violations either', async () => {
  const { container } = render(
    <ChoiceCards label="Where it runs" options={OPTIONS} value="container" onChange={() => {}} minCardWidth="sm" density="compact" />,
  );
  const result = await axe.run(container);
  expect(result.violations).toEqual([]);
});

test('every card spans the same rows of the group and lays its lines on them, so cards side by side stand level', () => {
  const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'ChoiceCards.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  // A plain column of its lines everywhere, and the shared rows where subgrid is supported.
  expect(/\.crewlet-choice-cards__card \{([^}]*)\}/.exec(css)?.[1]).toMatch(/display:\s*flex;/);
  const supported = /@supports \(grid-template-rows: subgrid\) \{\s*\.crewlet-choice-cards__card \{([^}]*)\}/.exec(css)?.[1] ?? '';
  expect(supported).toMatch(/grid-row:\s*span var\(--crewlet-choice-cards-rows\);/);
  expect(supported).toMatch(/grid-template-rows:\s*subgrid;/);
  // Each fact is a line of its own: the facts give their children to the card's grid.
  expect(/\.crewlet-choice-cards__facts \{([^}]*)\}/.exec(css)?.[1]).toMatch(/display:\s*contents;/);
  // The rows a card spans count every card's lines: two facts and a reason line make five.
  const { container } = render(<ChoiceCards label="Where it runs" options={OPTIONS} value={null} onChange={() => {}} />);
  const group = container.querySelector('.crewlet-choice-cards') as HTMLElement;
  expect(group.style.getPropertyValue('--crewlet-choice-cards-rows')).toBe('5');
});

test('a radio is named by its choice and tag alone, and described by the rest of the card', () => {
  render(<ChoiceCards label="Where it runs" options={OPTIONS} value={null} onChange={() => {}} />);
  // Named by the whole card, it was read as every word on it on each arrow press.
  expect(description('In a container Company default')).toBe('A fresh container for each coding run. Needs Docker 24.0.7 found Isolation Own filesystem');
  expect(screen.getByRole('radio', { name: 'On the host' })).toBeTruthy();
});

test('a disabled card stands on the page ground with a quiet radio, never raised like an enabled one', () => {
  // The subtle surface it took was brighter than the raised one in light, so
  // the card that could not be chosen read as the most inviting.
  for (const theme of ['light', 'dark'] as const) {
    const uninstall = installThemed(theme, 'ChoiceCards/ChoiceCards.css');
    try {
      const { container } = render(<ChoiceCards label="Where it runs" options={OPTIONS} value={null} onChange={() => {}} />);
      const [enabled, , disabled] = [...container.querySelectorAll('.crewlet-choice-cards__card')];
      expect(channels(getComputedStyle(enabled!).backgroundColor), theme).toEqual(channels(themeColour(theme, token('color-surface-elevated'))));
      expect(getComputedStyle(disabled!).backgroundColor, theme).toMatch(/^(transparent|rgba\(0, 0, 0, 0\))$/);
      const radio = getComputedStyle(disabled!.querySelector('.crewlet-choice-cards__radio')!);
      expect(channels(radio.borderColor), theme).toEqual(channels(themeColour(theme, token('color-border-default'))));
      expect(channels(radio.backgroundColor), theme).toEqual(channels(themeColour(theme, token('color-surface-subtle'))));
    } finally {
      cleanup();
      uninstall();
    }
  }
});

test('the chosen card lays its tint over the raised surface inside an accent edge, so it never looks recessed', () => {
  for (const theme of ['light', 'dark'] as const) {
    const uninstall = installThemed(theme, 'ChoiceCards/ChoiceCards.css');
    try {
      const { container } = render(<ChoiceCards label="Where it runs" options={OPTIONS} value="container" onChange={() => {}} />);
      const chosen = getComputedStyle(container.querySelector('.crewlet-choice-cards__card.is-checked')!);
      // The raised surface under the tint, as under every card beside it.
      expect(channels(chosen.backgroundColor), theme).toEqual(channels(themeColour(theme, token('color-surface-elevated'))));
      expect(chosen.backgroundImage, theme).toMatch(/^linear-gradient\(/);
      expect(channels(chosen.borderColor), theme).toEqual(channels(themeColour(theme, token('color-brand-accent-ink'))));
    } finally {
      cleanup();
      uninstall();
    }
  }
});

test('has no accessibility violations', async () => {
  const { container } = render(<ChoiceCards label="Where it runs" options={OPTIONS} value="container" onChange={() => {}} />);
  const results = await axe.run(container);
  expect(results.violations).toEqual([]);
});

test('cards stand level when only some have a description: the others keep its row empty', () => {
  const { container } = render(<ChoiceCards label="Where it runs" options={OPTIONS} value={null} onChange={() => {}} />);
  const [inContainer, host, e2b] = [...container.querySelectorAll('.crewlet-choice-cards__card')];
  // The E2B card has no description, so it keeps an empty cell on the description's row, hidden from a reader.
  const empty = e2b!.querySelector('.crewlet-choice-cards__description')!;
  expect(empty.textContent).toBe('');
  expect(empty.getAttribute('aria-hidden')).toBe('true');
  expect(empty.id).toBe('');
  // Its first fact then sits on the row after the description, as the facts beside it do.
  expect(e2b!.children[2]!.classList.contains('crewlet-choice-cards__description')).toBe(true);
  expect(inContainer!.children[2]!.classList.contains('crewlet-choice-cards__description')).toBe(true);
  expect(host!.children[2]!.classList.contains('crewlet-choice-cards__description')).toBe(true);
});

test('a set with no description gives none a row, so no card carries an empty line', () => {
  const { container } = render(
    <ChoiceCards
      label="Plan"
      value={null}
      onChange={() => {}}
      options={[
        { value: 'a', label: 'A', facts: [{ label: 'Cost', value: 'Low' }] },
        { value: 'b', label: 'B', facts: [{ label: 'Cost', value: 'High' }] },
      ]}
    />,
  );
  expect(container.querySelector('.crewlet-choice-cards__description')).toBeNull();
  const group = container.querySelector('.crewlet-choice-cards') as HTMLElement;
  // The name and one fact.
  expect(group.style.getPropertyValue('--crewlet-choice-cards-rows')).toBe('2');
});

test('a value with a space or any character still names and describes its radio', () => {
  render(
    <ChoiceCards
      label="Model"
      value="claude opus"
      onChange={() => {}}
      options={[
        { value: 'claude opus', label: 'Opus', description: 'The strongest.' },
        { value: 'a"b<c', label: 'Odd', description: 'Any character.' },
      ]}
    />,
  );
  // An id built from the value split on its space, and the radio lost its name.
  expect(description('Opus')).toBe('The strongest.');
  expect(description('Odd')).toBe('Any character.');
});

test('the chosen card keeps its tag edged in the strong border, which the tint does not swallow', () => {
  for (const theme of ['light', 'dark'] as const) {
    const uninstall = installThemed(theme, 'ChoiceCards/ChoiceCards.css');
    try {
      const { container } = render(<ChoiceCards label="Where it runs" options={OPTIONS} value="container" onChange={() => {}} />);
      const tag = getComputedStyle(container.querySelector('.crewlet-choice-cards__card.is-checked .crewlet-choice-cards__tag')!);
      expect(channels(tag.borderTopColor), theme).toEqual(channels(themeColour(theme, token('color-border-strong'))));
    } finally {
      cleanup();
      uninstall();
    }
  }
});
