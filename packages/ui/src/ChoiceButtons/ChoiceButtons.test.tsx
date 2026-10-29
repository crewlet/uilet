/**
 * One answer sent with one press: the recommended option first and marked, a
 * pending answer that holds every option still, and a reason that keeps focus.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test, vi } from 'vitest';
import { contrast, flatten, parseHex } from '@crewlethq/tokens/test/palette';
import { channels, installSheets, installThemed, px, themeColours } from '../../../../apps/ui-tests/src/cascade.js';
import { ColorChip } from '../ColorChip/index.js';
import { ChoiceButtons, type ChoiceButtonOption } from './index.js';

afterEach(cleanup);

/*
 * Spelled without the leading dashes and prefixed at use: the package's
 * variable check reads a quoted `--name` in a .tsx file as a declaration.
 */
const token = (name: string) => `--${name}`;

const OPTIONS: ChoiceButtonOption[] = [
  { value: 'greedy', label: 'Greedy only', detail: 'Simple and fast.' },
  { value: 'exact', label: 'Exact search', detail: 'Fewest transfers.' },
  { value: 'later', label: 'Decide later' },
];

test('is a named group of buttons, the recommended one first and marked in its name', () => {
  render(<ChoiceButtons label="Answers" options={OPTIONS} recommended="exact" onChoose={() => {}} />);
  const group = screen.getByRole('group', { name: 'Answers' });
  const buttons = Array.from(group.querySelectorAll('button'));
  expect(buttons.map((b) => b.textContent)).toEqual([
    'Exact search Fewest transfers. Recommended',
    'Greedy only Simple and fast.',
    'Decide later',
  ]);
  expect(buttons[0]!.className).toContain('crewlet-choice-buttons__option--recommended');
  expect(screen.getByRole('button', { name: 'Exact search Fewest transfers. Recommended' })).toBeTruthy();
});

test('keeps the given order where nothing is recommended', () => {
  render(<ChoiceButtons label="Answers" options={OPTIONS} recommended="none-of-these" onChoose={() => {}} />);
  const labels = screen.getAllByRole('button').map((b) => b.querySelector('.crewlet-choice-buttons__label')!.textContent);
  expect(labels).toEqual(['Greedy only', 'Exact search', 'Decide later']);
  expect(document.querySelector('.crewlet-choice-buttons__option--recommended')).toBeNull();
});

test('one press sends the option', () => {
  const onChoose = vi.fn();
  render(<ChoiceButtons label="Answers" options={OPTIONS} onChoose={onChoose} />);
  fireEvent.click(screen.getByRole('button', { name: /Decide later/ }));
  expect(onChoose).toHaveBeenCalledWith('later');
});

test('while one is on its way every option holds still, and the one sent says it is busy', () => {
  const onChoose = vi.fn();
  render(<ChoiceButtons label="Answers" options={OPTIONS} pending="greedy" onChoose={onChoose} />);
  const sent = screen.getByRole('button', { name: /Greedy only/ });
  const other = screen.getByRole('button', { name: /Exact search/ });
  expect(sent.getAttribute('aria-busy')).toBe('true');
  expect(other.getAttribute('aria-busy')).toBeNull();
  expect(other.getAttribute('aria-disabled')).toBe('true');
  // Soft, never native: the control keeps its focus.
  expect((other as HTMLButtonElement).disabled).toBe(false);
  fireEvent.click(other);
  expect(onChoose).not.toHaveBeenCalled();
});

test('a reason nothing can be chosen is read after each option, and nothing is sent', () => {
  const onChoose = vi.fn();
  render(
    <ChoiceButtons
      label="Answers"
      options={OPTIONS}
      onChoose={onChoose}
      disabledReason="Only the approver can answer."
    />,
  );
  const button = screen.getByRole('button', { name: /Exact search/ });
  const reason = document.getElementById(button.getAttribute('aria-describedby')!);
  expect(reason?.textContent).toBe('Only the approver can answer.');
  fireEvent.click(button);
  expect(onChoose).not.toHaveBeenCalled();
});

/** The brand setup's suggestions for a low pair. */
const SUGGESTIONS: ChoiceButtonOption[] = [
  { value: '#00a0a0', label: '#00a0a0', detail: '3:1, meets the minimum', media: <ColorChip value="#00a0a0" /> },
  { value: '#007f7f', label: '#007f7f', detail: '4.5:1, best for text links', media: <ColorChip value="#007f7f" /> },
  { value: 'dark', label: 'Use on dark grounds', detail: 'Keep #00baba, use it on dark grounds' },
];

test('small options are compact, in a row that wraps, with the picture before the words', () => {
  const uninstall = installSheets('ChoiceButtons/ChoiceButtons.css');
  try {
    const { container } = render(<ChoiceButtons label="Suggestions" size="sm" options={SUGGESTIONS} onChoose={() => {}} />);
    const group = container.querySelector('.crewlet-choice-buttons')!;
    expect(group.classList.contains('crewlet-choice-buttons--sm')).toBe(true);
    expect(getComputedStyle(group).display).toBe('flex');
    expect(getComputedStyle(group).flexWrap).toBe('wrap');
    const option = screen.getByRole('button', { name: /#00a0a0/ });
    expect(getComputedStyle(option).fontSize).toBe('12px');
    expect(px(option, 'min-height')).toBe(26);
    // The chip is decoration, first inside the button, and the name is the words.
    const media = option.querySelector('.crewlet-choice-buttons__media')!;
    expect(media.getAttribute('aria-hidden')).toBe('true');
    expect(option.firstElementChild).toBe(media);
    expect(option.textContent).toBe('#00a0a0 3:1, meets the minimum');
  } finally {
    uninstall();
  }
});

test('with chosen, every option says whether it is the one applied, and that one is drawn chosen', () => {
  const onChoose = vi.fn();
  const { rerender } = render(<ChoiceButtons label="Suggestions" size="sm" options={SUGGESTIONS} chosen={null} onChoose={onChoose} />);
  const buttons = screen.getAllByRole('button');
  expect(buttons.map((button) => button.getAttribute('aria-pressed'))).toEqual(['false', 'false', 'false']);
  fireEvent.click(buttons[1]!);
  expect(onChoose).toHaveBeenCalledWith('#007f7f');
  rerender(<ChoiceButtons label="Suggestions" size="sm" options={SUGGESTIONS} chosen="#007f7f" onChoose={onChoose} />);
  const pressed = screen.getByRole('button', { pressed: true });
  expect(pressed.textContent).toContain('#007f7f');
  expect(pressed.classList.contains('is-chosen')).toBe(true);
  expect(screen.getAllByRole('button', { pressed: false })).toHaveLength(2);
});

test('without chosen, options send and say nothing of a choice, as the Inbox draws them', () => {
  render(<ChoiceButtons label="Answers" options={SUGGESTIONS} onChoose={() => {}} />);
  for (const button of screen.getAllByRole('button')) expect(button.hasAttribute('aria-pressed')).toBe(false);
  expect(document.querySelector('.crewlet-choice-buttons--sm')).toBeNull();
});

test('small and chosen carry no axe violation', async () => {
  const { container } = render(
    <main>
      <ChoiceButtons label="Suggestions" size="sm" options={SUGGESTIONS} chosen="#007f7f" onChoose={() => {}} />
    </main>,
  );
  const result = await axe.run(container, { resultTypes: ['violations'], rules: { 'color-contrast': { enabled: false } } });
  expect(result.violations.map((violation) => violation.id)).toEqual([]);
});

test('carries no axe violation', async () => {
  const { container } = render(
    <main>
      <h1>Decision</h1>
      <ChoiceButtons label="Answers" options={OPTIONS} recommended="greedy" onChoose={() => {}} />
    </main>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations).toEqual([]);
});

test('on the accent fill a colour chip and a reference mark take the label own ink', () => {
  const sheet = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'ChoiceButtons.css'), 'utf8');
  const at = sheet.indexOf('.crewlet-choice-buttons__option--recommended {');
  const recommended = sheet.slice(at, sheet.indexOf('}', at));
  // A grey edge on the accent measured 1.09:1; the label's own ink is 4.69:1.
  expect(recommended).toContain('--crewlet-color-chip-ring: currentColor');
  expect(recommended).toContain('--crewlet-inline-ref-mark-ink: currentColor');
});

test('a recommended option that is chosen stays legible and keeps its mark, in every theme', () => {
  /*
   * AN ANSWER READ BACK marks the option chosen, and the recommended one keeps
   * its mark. Chosen, the recommended option is drawn on the soft selected
   * fill, and it kept the accent's ink, white on a pale tint, under 1.5:1 in
   * the light theme. Its label, its mark and its detail are measured against
   * that fill as it lands on every ground an answer is drawn on.
   */
  for (const theme of ['light', 'dark'] as const) {
    const uninstall = installThemed(theme, 'ChoiceButtons/ChoiceButtons.css');
    try {
      const palette = themeColours(theme);
      render(
        <ChoiceButtons label="Answers" options={OPTIONS} recommended="exact" chosen="exact" onChoose={() => {}} />,
      );
      const option = screen.getByRole('button', { pressed: true });
      expect(option.textContent).toContain('Recommended');
      const fill = getComputedStyle(option).backgroundColor;
      for (const ground of ['surface-background', 'surface-elevated', 'surface-frame']) {
        const backdrop = parseHex(palette.get(token(`color-${ground}`)) ?? '');
        expect(backdrop, `${theme} ${ground}`).not.toBeNull();
        const behind = flatten(fill, backdrop!);
        for (const [part, element] of [
          ['label', option],
          ['mark', option.querySelector('.crewlet-choice-buttons__note')!],
          ['detail', option.querySelector('.crewlet-choice-buttons__detail')!],
        ] as const) {
          const ratio = contrast(channels(getComputedStyle(element).color), behind);
          expect(ratio, `${theme} ${part} on ${ground}: ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
        }
      }
    } finally {
      cleanup();
      uninstall();
    }
  }
});
