/**
 * Choices as cards: one radio group, every card its radio's label, a disabled
 * card saying why, and a fact's state in words beside its dot.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test, vi } from 'vitest';
import { channels, installThemed, themeColour } from '../../../../apps/ui-tests/src/cascade.js';
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

test('the narrowest a card stands is the prop that says so', () => {
  const { container } = render(
    <ChoiceCards label="Wide" options={OPTIONS} value={null} onChange={() => {}} minCardWidth="lg" />,
  );
  expect(container.querySelector('.crewlet-choice-cards')!.classList.contains('crewlet-choice-cards--lg')).toBe(true);
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

test('a tag that does not fit beside the name takes a line of its own, the name whole and level with its radio', () => {
  const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'ChoiceCards.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  expect(/\.crewlet-choice-cards__title \{([^}]*)\}/.exec(css)?.[1]).toMatch(/flex-wrap:\s*wrap;/);
  // Its lines stand at the row's top: a taller title beside it never moves the name off its radio's line.
  expect(/\.crewlet-choice-cards__title \{([^}]*)\}/.exec(css)?.[1]).toMatch(/align-content:\s*flex-start;/);
  expect(/\.crewlet-choice-cards__tag \{([^}]*)\}/.exec(css)?.[1]).toMatch(/white-space:\s*nowrap;/);
});
