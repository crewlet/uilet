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

/** What a radio is described by, its parts in order. */
const description = (radio: Element): string[] =>
  (radio.getAttribute('aria-describedby') ?? '')
    .split(' ')
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent ?? '');

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
  expect(description(e2b)).toContain('Add E2B_API_KEY under Settings, Secrets.');
});

test('a fact with a state draws its dot beside the words, never alone', () => {
  const { container } = render(<ChoiceCards label="Where it runs" options={OPTIONS} value={null} onChange={() => {}} />);
  const status = container.querySelector('.crewlet-status');
  expect(status?.textContent?.trim()).toBe('Docker 24.0.7 found');
  expect(status?.querySelector('.crewlet-status-dot')?.getAttribute('aria-hidden')).toBe('true');
});

test('a fact marked as the reason describes its disabled card, and every card spans the same rows', () => {
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
            { label: 'Needs', value: 'E2B key not set', tone: 'warning', reason: true },
            { label: 'Isolation', value: 'A separate machine' },
          ],
          disabled: true,
        },
      ]}
    />,
  );
  const e2b = screen.getByRole('radio', { name: /In E2B/ });
  expect(description(e2b).join(' ')).toContain('E2B key not set');
  // The name, the description and the most facts any card has (two): four rows for every card.
  const group = container.querySelector('.crewlet-choice-cards') as HTMLElement;
  expect(group.style.getPropertyValue('--crewlet-choice-cards-rows')).toBe('4');
});

test('every card spans the same rows of the group and lays its lines on them, so cards side by side stand level', () => {
  const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'ChoiceCards.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const card = /\.crewlet-choice-cards__card \{([^}]*)\}/.exec(css)?.[1] ?? '';
  expect(card).toMatch(/grid-row:\s*span var\(--crewlet-choice-cards-rows\);/);
  expect(card).toMatch(/grid-template-rows:\s*subgrid;/);
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
  const radio = screen.getByRole('radio', { name: 'In a container Company default' });
  expect(description(radio)).toEqual([
    'A fresh container for each coding run.',
    'Needs Docker 24.0.7 found',
    'IsolationOwn filesystem',
  ]);
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
