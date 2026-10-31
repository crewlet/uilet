/**
 * A mention in a message's words: a button that opens what it names, or text
 * where there is nothing to open, in the info tone or the reader's warning
 * tone, at the regular weight.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test, vi } from 'vitest';
import { channels, installThemed, themeColour } from '../../../../apps/ui-tests/src/cascade.js';
import { MentionChip } from './index.js';

afterEach(cleanup);

/** A custom property's name, built so the stylesheet checks never read a test's lookup as a declaration. */
const property = (name: string) => `--${name}`;

test('is a button that opens what it names', () => {
  const onClick = vi.fn();
  render(
    <p>
      Ask <MentionChip onPress={onClick}>@Product Manager</MentionChip> first.
    </p>,
  );
  const chip = screen.getByRole('button', { name: '@Product Manager' });
  expect(chip.getAttribute('type')).toBe('button');
  fireEvent.click(chip);
  expect(onClick).toHaveBeenCalledTimes(1);
});

test('is text where there is nothing to open', () => {
  render(
    <p>
      <MentionChip tone="everyone">@channel</MentionChip> standup moved.
    </p>,
  );
  expect(screen.queryByRole('button')).toBeNull();
  expect(screen.getByText('@channel').classList.contains('crewlet-mention-chip--everyone')).toBe(true);
});

// Someone else is the info tone's light blue; the reader is the warning tone.
// Mutation: draw both in one tone, and the reader cannot find their name.
test('takes the info tone for others and the warning tone for the reader, never bold', () => {
  const uninstall = installThemed('light', 'MentionChip/MentionChip.css');
  try {
    render(
      <p>
        <MentionChip onPress={() => {}}>@Designer</MentionChip>
        <MentionChip tone="self" onPress={() => {}}>
          @Miles
        </MentionChip>
      </p>,
    );
    const other = screen.getByRole('button', { name: '@Designer' });
    const you = screen.getByRole('button', { name: '@Miles' });
    expect(channels(getComputedStyle(other).color)).toEqual(channels(themeColour('light', property('color-feedback-info-ink'))));
    expect(channels(getComputedStyle(you).color)).toEqual(channels(themeColour('light', property('color-feedback-warning-ink'))));
    expect(getComputedStyle(other).fontWeight).toBe('400');
  } finally {
    uninstall();
  }
});

test('carries no axe violation', async () => {
  const { container } = render(
    <main>
      <p>
        <MentionChip onPress={() => {}}>@Designer</MentionChip> and <MentionChip tone="everyone">@channel</MentionChip>
      </p>
    </main>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations).toEqual([]);
});
