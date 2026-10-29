/**
 * One answer sent with one press: the recommended option first and marked, a
 * pending answer that holds every option still, and a reason that keeps focus.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test, vi } from 'vitest';
import { contrast, flatten, OPAQUE_SURFACES, parseHex, type Rgb } from '@crewlethq/tokens/test/palette';
import {
  channels,
  installSheets,
  installThemed,
  px,
  themeColour,
  userAction,
  type UserAction,
} from '../../../../apps/ui-tests/src/cascade.js';
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

const THEMES = ['light', 'dark'] as const;
type Theme = (typeof THEMES)[number];

/**
 * Every state an option is drawn in under a reader's hand: at rest, under the
 * pointer, pressed with the pointer (which is under it too), and pressed from
 * the keyboard, which is not.
 */
const STATES: ReadonlyArray<readonly [name: string, actions: UserAction[]]> = [
  ['at rest', []],
  ['under the pointer', ['hover']],
  ['pressed with the pointer', ['hover', 'active']],
  ['pressed from the keyboard', ['active']],
];

/** A colour as it lands on the ground behind it. */
function paint(value: string, ground: Rgb): Rgb {
  const painted = flatten(value, ground);
  if (painted === null) throw new Error(`not a colour: ${value}`);
  return painted;
}

/** Every opaque rung an answer is drawn on, in one theme, by name. */
function grounds(theme: Theme): Array<readonly [string, Rgb]> {
  const sheet = parseHex(themeColour(theme, token('color-surface-background')));
  if (sheet === null) throw new Error(`${theme} has no opaque sheet`);
  return OPAQUE_SURFACES.map((name) => [name.replace(token('color-'), ''), paint(themeColour(theme, name), sheet)] as const);
}

/** What an option paints: its fill, its edge and its ink, as the cascade decides them. */
function drawn(option: Element) {
  const style = getComputedStyle(option);
  return { fill: style.backgroundColor, edge: style.borderTopColor, ink: style.color };
}

/** Holds `option` in a state for the length of `read`. */
function during<T>(option: Element, actions: UserAction[], read: () => T): T {
  const release = userAction(option, ...actions);
  try {
    return read();
  } finally {
    release();
  }
}

test('on the accent fill a colour chip and a reference mark take the label own ink', () => {
  // A grey edge on the accent measured 1.09:1; the label's own ink is 4.69:1.
  const uninstall = installThemed('light', 'ChoiceButtons/ChoiceButtons.css');
  try {
    render(<ChoiceButtons label="Answers" options={OPTIONS} recommended="exact" onChoose={() => {}} />);
    const option = screen.getByRole('button', { name: /Exact search/ });
    const style = getComputedStyle(option);
    expect(style.getPropertyValue('--crewlet-color-chip-ring').trim()).toBe('currentColor');
    expect(style.getPropertyValue('--crewlet-inline-ref-mark-ink').trim()).toBe('currentColor');
  } finally {
    uninstall();
  }
});

test('a recommended option that is chosen is drawn as every chosen option is, legible and marked, in every state', () => {
  /*
   * AN ANSWER READ BACK marks the option chosen, and the recommended one keeps
   * its mark. Chosen, it kept the accent's ink on the soft selected fill,
   * white on a pale tint at 1.07:1 in the light theme, and under the pointer
   * and the press the accent fill came back over the chosen one.
   *
   * So in every state it is held to what a plain chosen option paints, and its
   * label, its mark and its detail are measured against that fill on every
   * opaque rung. What wins is the cascade's answer, specificity and source
   * order included, which the harness's own suite holds to a browser's.
   *
   * WHAT jsdom CANNOT COVER. It matches `:hover` and `:active` only while a
   * mouse event is being dispatched, so both states are held through the
   * harness's stand-ins, which weigh what the pseudo-classes weigh. It paints
   * nothing: the translucent fill is composited onto each rung here, by hand,
   * and a host's own ground behind the group is not one of them. It lays
   * nothing out and runs no transition, so where the mark and the check stand
   * and the frames between two states are not measured, and `:focus-visible`
   * is not reached (focus-ring.test.ts holds its offset).
   */
  for (const theme of THEMES) {
    const uninstall = installThemed(theme, 'ChoiceButtons/ChoiceButtons.css');
    try {
      render(
        <>
          <ChoiceButtons label="Recommended" options={OPTIONS} recommended="exact" chosen="exact" onChoose={() => {}} />
          <ChoiceButtons label="Plain" options={OPTIONS} chosen="greedy" onChoose={() => {}} />
        </>,
      );
      const option = screen.getByRole('button', { pressed: true, name: 'Exact search Fewest transfers. Recommended' });
      const plain = screen.getByRole('button', { pressed: true, name: 'Greedy only Simple and fast.' });
      for (const [state, actions] of STATES) {
        const where = `${theme}, ${state}`;
        const painted = during(option, actions, () => ({
          option: drawn(option),
          label: getComputedStyle(option).color,
          mark: getComputedStyle(option.querySelector('.crewlet-choice-buttons__note')!).color,
          detail: getComputedStyle(option.querySelector('.crewlet-choice-buttons__detail')!).color,
        }));
        expect(painted.option, where).toEqual(during(plain, actions, () => drawn(plain)));
        for (const [ground, rgb] of grounds(theme)) {
          expect(paint(painted.option.fill, rgb), `${where} on ${ground}`).toEqual(
            paint(themeColour(theme, token('color-surface-selected')), rgb),
          );
          const behind = paint(painted.option.fill, rgb);
          for (const part of ['label', 'mark', 'detail'] as const) {
            const ratio = contrast(channels(painted[part]), behind);
            expect(ratio, `${where}, ${part} on ${ground}: ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
          }
        }
      }
    } finally {
      cleanup();
      uninstall();
    }
  }
});

test('the chosen edge clears 3:1 against its fill and its ground, in every state and theme', () => {
  /*
   * A toggle's pressed state is told from its neighbours by the edge as much
   * as by the fill, so WCAG 1.4.11 holds the edge to 3:1 against both colours
   * it meets: the fill inside it and the ground outside it. The selected edge
   * the package's other chosen options draw is a tint, and measured 1.65:1 on
   * the dark raised rung.
   */
  for (const theme of THEMES) {
    const uninstall = installThemed(theme, 'ChoiceButtons/ChoiceButtons.css');
    try {
      render(<ChoiceButtons label="Answers" options={OPTIONS} chosen="greedy" onChoose={() => {}} />);
      const option = screen.getByRole('button', { pressed: true });
      for (const [state, actions] of STATES) {
        const { fill, edge } = during(option, actions, () => drawn(option));
        for (const [ground, rgb] of grounds(theme)) {
          const line = paint(edge, rgb);
          const inside = contrast(line, paint(fill, rgb));
          const outside = contrast(line, rgb);
          const where = `${theme}, ${state}, on ${ground}: ${inside.toFixed(2)}:1 inside, ${outside.toFixed(2)}:1 outside`;
          expect(Math.min(inside, outside), where).toBeGreaterThanOrEqual(3);
        }
      }
    } finally {
      cleanup();
      uninstall();
    }
  }
});

test('the chosen option carries a check mark, so the choice is never colour alone, in both sizes', () => {
  /*
   * Decoration, since `aria-pressed` already says it: the name is unchanged.
   * It stands last, after the recommended mark, with a picture still first,
   * and in an ink that clears the 3:1 a mark has to on the selected fill.
   */
  for (const theme of THEMES) {
    const uninstall = installThemed(theme, 'ChoiceButtons/ChoiceButtons.css');
    try {
      render(
        <>
          <ChoiceButtons label="Answers" options={OPTIONS} recommended="exact" chosen="exact" onChoose={() => {}} />
          <ChoiceButtons label="Suggestions" size="sm" options={SUGGESTIONS} chosen="#007f7f" onChoose={() => {}} />
        </>,
      );
      const answer = screen.getByRole('button', { pressed: true, name: 'Exact search Fewest transfers. Recommended' });
      const suggestion = screen.getByRole('button', { pressed: true, name: '#007f7f 4.5:1, best for text links' });
      expect(document.querySelectorAll('.crewlet-choice-buttons__check')).toHaveLength(2);
      for (const option of [answer, suggestion]) {
        const check = option.querySelector('.crewlet-choice-buttons__check')!;
        expect(check.getAttribute('aria-hidden')).toBe('true');
        expect(check.querySelector('svg')).not.toBeNull();
        expect(option.lastElementChild).toBe(check);
        const ink = channels(getComputedStyle(check).color);
        for (const [ground, rgb] of grounds(theme)) {
          const ratio = contrast(ink, paint(getComputedStyle(option).backgroundColor, rgb));
          expect(ratio, `${theme} check on ${ground}: ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(3);
        }
      }
      expect(answer.querySelector('.crewlet-choice-buttons__check')!.previousElementSibling!.className).toBe(
        'crewlet-choice-buttons__note',
      );
      expect(suggestion.firstElementChild!.className).toBe('crewlet-choice-buttons__media');
    } finally {
      cleanup();
      uninstall();
    }
  }
  // Nothing chosen, nothing checked: the Inbox's live question carries none.
  render(<ChoiceButtons label="Answers" options={OPTIONS} recommended="exact" onChoose={() => {}} />);
  expect(document.querySelector('.crewlet-choice-buttons__check')).toBeNull();
});

test('an answer against the recommendation leaves the recommended option plain, its mark kept', () => {
  /*
   * Read back against the recommendation, the accent fill on the option NOT
   * chosen outshouted the soft fill of the one that was. As toggles the
   * recommended option is drawn as any option not chosen, in every state, and
   * keeps its mark; nothing chosen yet (`null`) is the same. Only a live
   * question, `chosen` left out, fills it with the accent.
   */
  for (const theme of THEMES) {
    const uninstall = installThemed(theme, 'ChoiceButtons/ChoiceButtons.css');
    try {
      for (const chosen of ['greedy', null]) {
        render(<ChoiceButtons label="Answers" options={OPTIONS} recommended="exact" chosen={chosen} onChoose={() => {}} />);
        const recommended = screen.getByRole('button', { pressed: false, name: 'Exact search Fewest transfers. Recommended' });
        const plain = screen.getByRole('button', { pressed: false, name: 'Decide later' });
        expect(recommended.classList.contains('crewlet-choice-buttons__option--recommended')).toBe(true);
        for (const [state, actions] of STATES) {
          const where = `${theme}, chosen ${chosen}, ${state}`;
          const painted = during(recommended, actions, () => ({
            option: drawn(recommended),
            detail: getComputedStyle(recommended.querySelector('.crewlet-choice-buttons__detail')!).color,
          }));
          expect(painted.option, where).toEqual(during(plain, actions, () => drawn(plain)));
          expect(channels(painted.detail), where).toEqual(channels(themeColour(theme, token('color-text-tertiary'))));
        }
        cleanup();
      }
      render(<ChoiceButtons label="Answers" options={OPTIONS} recommended="exact" onChoose={() => {}} />);
      const live = screen.getByRole('button', { name: /Exact search/ });
      expect(channels(getComputedStyle(live).backgroundColor), theme).toEqual(
        channels(themeColour(theme, token('color-brand-accent'))),
      );
    } finally {
      cleanup();
      uninstall();
    }
  }
});
