import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, describe, expect, test } from 'vitest';
import type { MeterState } from '../Meter/index.js';
import { LimitMeters, limitWindowTone, type LimitWindow } from './index.js';

afterEach(cleanup);

const FIVE_HOUR: LimitWindow = {
  id: 'session',
  label: '5-hour',
  state: 'near',
  used: 0.83,
  note: 'resets 5am',
  name: '5-hour limit, 83% used, resets 05:00 UTC',
};
const WEEKLY: LimitWindow = {
  id: 'weekly',
  label: 'Weekly',
  state: 'ok',
  used: 0.41,
  note: 'resets Mon',
  name: 'Weekly limit, 41% used, resets Mon 09:00 UTC',
};
const OPUS_REACHED: LimitWindow = {
  id: 'opus',
  label: 'Weekly Opus',
  state: 'refusing',
  figure: 'Reached',
  note: 'until Mon 9am',
  name: 'Weekly Opus limit, reached, sitting out until Mon 09:00 UTC',
};

describe('limitWindowTone', () => {
  test('an ordinary reading stays quiet; near is the warning and refusing the danger', () => {
    expect((['ok', 'near', 'refusing'] as const).map(limitWindowTone)).toEqual(['neutral', 'warning', 'danger']);
  });

  test('refuses a state it does not know, including a key every object inherits', () => {
    for (const state of ['over', 'toString', '']) {
      expect(() => limitWindowTone(state as MeterState), state).toThrow(RangeError);
    }
  });
});

describe('LimitMeters', () => {
  test('each window with a known fraction is a meter named by its whole sentence', () => {
    render(<LimitMeters label="Limits of opus-main" windows={[FIVE_HOUR, WEEKLY]} />);
    const group = screen.getByRole('group', { name: 'Limits of opus-main' });
    const meters = within(group).getAllByRole('meter');
    expect(meters.map((m) => m.getAttribute('aria-label'))).toEqual([FIVE_HOUR.name, WEEKLY.name]);
    expect(meters[0]!.getAttribute('aria-valuenow')).toBe('83');
    expect(meters[0]!.getAttribute('aria-valuemin')).toBe('0');
    expect(meters[0]!.getAttribute('aria-valuemax')).toBe('100');
  });

  test('a window known only by its state is an image, never a meter with a made-up value', () => {
    const { container } = render(<LimitMeters label="Limits" windows={[OPUS_REACHED]} />);
    expect(screen.queryByRole('meter')).toBeNull();
    const img = screen.getByRole('img', { name: OPUS_REACHED.name });
    expect(img.getAttribute('aria-valuenow')).toBeNull();
    const fill = container.querySelector<HTMLElement>('.crewlet-limit-meters__fill')!;
    expect(fill.classList.contains('crewlet-limit-meters__fill--state')).toBe(true);
    expect(fill.dataset['tone']).toBe('danger');
  });

  test('the drawn words are hidden, so each window is heard once, by its bar', () => {
    const { container } = render(<LimitMeters label="Limits" windows={[FIVE_HOUR]} />);
    for (const part of ['label', 'figure', 'note']) {
      const el = container.querySelector(`.crewlet-limit-meters__${part}`)!;
      expect(el.getAttribute('aria-hidden'), part).toBe('true');
    }
    expect(container.textContent).toContain('5-hour');
    expect(container.textContent).toContain('83%');
    expect(container.textContent).toContain('resets 5am');
  });

  test('the figure defaults to the rounded percentage, and a caller figure wins', () => {
    const { container } = render(
      <LimitMeters label="Limits" windows={[{ ...WEEKLY, used: 0.416 }, { ...FIVE_HOUR, figure: '83 of 100' }]} />,
    );
    const figures = [...container.querySelectorAll('.crewlet-limit-meters__figure')].map((f) => f.textContent);
    expect(figures).toEqual(['42%', '83 of 100']);
  });

  test('a window past its limit fills the track and reports inside the scale', () => {
    const { container } = render(<LimitMeters label="Limits" windows={[{ ...FIVE_HOUR, used: 1.2, state: 'refusing' }]} />);
    expect(screen.getByRole('meter').getAttribute('aria-valuenow')).toBe('100');
    const fill = container.querySelector<HTMLElement>('.crewlet-limit-meters__fill')!;
    expect(fill.style.width).toBe('100%');
    expect(container.querySelector('.crewlet-limit-meters__figure')!.textContent).toBe('120%');
  });

  test('a reading above zero is never an empty track', () => {
    const { container } = render(<LimitMeters label="Limits" windows={[{ ...WEEKLY, used: 0.001 }]} />);
    const fill = container.querySelector<HTMLElement>('.crewlet-limit-meters__fill')!;
    expect(fill.classList.contains('crewlet-limit-meters__fill--some')).toBe(false);
    const { container: some } = render(<LimitMeters label="Limits" windows={[{ ...WEEKLY, used: 0.01 }]} />);
    expect(some.querySelector('.crewlet-limit-meters__fill--some')).not.toBeNull();
  });

  test('a window without a note draws no empty note cell', () => {
    const { container } = render(<LimitMeters label="Limits" windows={[{ ...WEEKLY, note: undefined }]} />);
    expect(container.querySelector('.crewlet-limit-meters__note')).toBeNull();
  });

  test('tones follow each window state', () => {
    const { container } = render(<LimitMeters label="Limits" windows={[WEEKLY, FIVE_HOUR, OPUS_REACHED]} />);
    const tones = [...container.querySelectorAll<HTMLElement>('.crewlet-limit-meters__fill')].map((f) => f.dataset['tone']);
    expect(tones).toEqual(['neutral', 'warning', 'danger']);
  });

  test('no window says the empty words, and no group or bar', () => {
    render(<LimitMeters label="Limits" windows={[]} />);
    expect(screen.getByText('None reported')).toBeTruthy();
    expect(screen.queryByRole('group')).toBeNull();
    expect(screen.queryByRole('meter')).toBeNull();
  });

  test('the empty words and the caption are the caller own', () => {
    render(<LimitMeters label="Limits" windows={[WEEKLY]} caption="as of 2h ago" />);
    expect(screen.getByText('as of 2h ago')).toBeTruthy();
    cleanup();
    render(<LimitMeters label="Limits" windows={[]} empty="Not reported by this harness" />);
    expect(screen.getByText('Not reported by this harness')).toBeTruthy();
  });

  test('refuses a duplicate id or a fraction that is not one, by name', () => {
    expect(() => render(<LimitMeters label="Limits" windows={[WEEKLY, WEEKLY]} />)).toThrow(/"weekly" is used twice/);
    for (const used of [-0.1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => render(<LimitMeters label="Limits" windows={[{ ...WEEKLY, used }]} />), `${used}`).toThrow(
        /window "weekly" used must be a finite fraction/,
      );
    }
  });

  test('passes axe with every kind of window', async () => {
    const { container } = render(
      <LimitMeters label="Limits of opus-main" windows={[FIVE_HOUR, WEEKLY, OPUS_REACHED]} caption="as of 2h ago" />,
    );
    const result = await axe.run(container, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } });
    expect(result.violations).toEqual([]);
  });
});

describe('LimitMeters.css', () => {
  const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'LimitMeters.css'), 'utf8');

  test('a label is pinned to the first column, so a row without a note cannot pull the next label up', () => {
    expect(css).toMatch(/\.crewlet-limit-meters__label \{[^}]*grid-column: 1;/);
  });

  test('the stack keeps a floor, since inline-size containment gives it no width of its own', () => {
    expect(css).toMatch(/\.crewlet-limit-meters \{[^}]*container-type: inline-size;[^}]*min-width: 12rem;/);
  });
});
