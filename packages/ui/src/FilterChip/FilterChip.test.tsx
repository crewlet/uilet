/**
 * The filter chip's contract: that it is a control rather than a tinted word,
 * that a form it sits in is not submitted by it, and that a row of choices
 * behaves like the platform's own radio group.
 *
 * The last is what the group exists for. A row of buttons each announcing its
 * own pressed state is a fine set of independent switches and a poor set of
 * choices: a reader is told nothing about how many there are, arrows do
 * nothing, and Tab steps through every one.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { useState } from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { FilterChip, FilterChipGroup } from './index.js';

afterEach(cleanup);

/** A radio row driven the way a screen drives it. */
function Kinds({ allowNone = false, initial = 'decision' as string | null }) {
  const [value, setValue] = useState<string | null>(initial);
  return (
    <>
      <FilterChipGroup label="Event kind" semantics="radio" value={value} onValueChange={setValue} allowNone={allowNone}>
        <FilterChip value="decision" count={12}>
          Decision
        </FilterChip>
        <FilterChip value="delivery" count={4}>
          Delivery
        </FilterChip>
        <FilterChip value="fault" count={0}>
          Fault
        </FilterChip>
      </FilterChipGroup>
      <output>{value ?? 'none'}</output>
    </>
  );
}

describe('FilterChip', () => {
  test('is a button that does not submit the form it sits in', () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <FilterChip pressed={false} onPressedChange={() => {}}>
          Errors
        </FilterChip>
      </form>,
    );
    const chip = screen.getByRole('button', { name: /Errors/ });
    expect(chip.getAttribute('type')).toBe('button');
    fireEvent.click(chip);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test('announces whether it is on, and reports what it would become', () => {
    const onPressedChange = vi.fn();
    const { rerender } = render(
      <FilterChip pressed={false} count={7} onPressedChange={onPressedChange}>
        Errors
      </FilterChip>,
    );
    const chip = screen.getByRole('button');
    expect(chip.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(chip);
    expect(onPressedChange).toHaveBeenCalledWith(true);

    rerender(
      <FilterChip pressed count={7} onPressedChange={onPressedChange}>
        Errors
      </FilterChip>,
    );
    expect(screen.getByRole('button').getAttribute('aria-pressed')).toBe('true');
  });
});

describe('FilterChipGroup', () => {
  test('a toggle row is a named group of independent switches', () => {
    render(
      <FilterChipGroup label="Severity">
        <FilterChip pressed onPressedChange={() => {}}>
          Errors
        </FilterChip>
        <FilterChip pressed={false} onPressedChange={() => {}}>
          Warnings
        </FilterChip>
      </FilterChipGroup>,
    );
    const group = screen.getByRole('group', { name: 'Severity' });
    expect(group).toBeTruthy();
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  test('a radio row is one choice, named, with exactly one checked', () => {
    render(<Kinds />);
    const group = screen.getByRole('radiogroup', { name: 'Event kind' });
    expect(group).toBeTruthy();
    const chips = screen.getAllByRole('radio');
    expect(chips.map((chip) => chip.getAttribute('aria-checked'))).toEqual(['true', 'false', 'false']);
  });

  test('the row is one tab stop, held by the chosen chip', () => {
    render(<Kinds initial="delivery" />);
    expect(screen.getAllByRole('radio').map((chip) => chip.tabIndex)).toEqual([-1, 0, -1]);
  });

  test('with nothing chosen the first chip holds the tab stop, so the keyboard can get in', () => {
    render(<Kinds initial={null} />);
    expect(screen.getAllByRole('radio').map((chip) => chip.tabIndex)).toEqual([0, -1, -1]);
  });

  test('the arrows move and choose, and wrap at both ends', () => {
    render(<Kinds />);
    const chips = screen.getAllByRole('radio');
    chips[0]?.focus();

    fireEvent.keyDown(chips[0]!, { key: 'ArrowRight' });
    expect(document.querySelector('output')?.textContent).toBe('delivery');
    expect(document.activeElement).toBe(screen.getAllByRole('radio')[1]);

    // Past the end and round to the start, which is what a radio group does.
    fireEvent.keyDown(screen.getAllByRole('radio')[1]!, { key: 'End' });
    expect(document.querySelector('output')?.textContent).toBe('fault');
    fireEvent.keyDown(screen.getAllByRole('radio')[2]!, { key: 'ArrowRight' });
    expect(document.querySelector('output')?.textContent).toBe('decision');
  });

  test('a key that is not a move is left to the browser', () => {
    render(<Kinds />);
    const chip = screen.getAllByRole('radio')[0]!;
    chip.focus();
    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    chip.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });

  test('a second press clears the choice only where the group allows it', () => {
    const { unmount } = render(<Kinds />);
    fireEvent.click(screen.getAllByRole('radio')[0]!);
    expect(document.querySelector('output')?.textContent).toBe('decision');
    unmount();

    render(<Kinds allowNone />);
    fireEvent.click(screen.getAllByRole('radio')[0]!);
    expect(document.querySelector('output')?.textContent).toBe('none');
    // And with nothing chosen the row is still reachable.
    expect(screen.getAllByRole('radio').map((chip) => chip.tabIndex)).toEqual([0, -1, -1]);
  });

  test('a disabled chip is not where the tab stop parks', () => {
    // A disabled button is skipped by Tab whatever its tabindex says, so a
    // stop parked on one is a group the keyboard cannot enter at all.
    render(
      <FilterChipGroup label="Event kind" semantics="radio" onValueChange={() => {}}>
        <FilterChip value="decision" disabled>
          Decision
        </FilterChip>
        <FilterChip value="delivery">Delivery</FilterChip>
      </FilterChipGroup>,
    );
    expect(screen.getAllByRole('radio').map((chip) => chip.tabIndex)).toEqual([-1, 0]);
  });

  test('the arrows step over a disabled chip rather than dead-ending on it', () => {
    render(
      <FilterChipGroup label="Event kind" semantics="radio" value="decision" onValueChange={() => {}}>
        <FilterChip value="decision">Decision</FilterChip>
        <FilterChip value="delivery" disabled>
          Delivery
        </FilterChip>
        <FilterChip value="fault">Fault</FilterChip>
      </FilterChipGroup>,
    );
    const chips = screen.getAllByRole('radio');
    chips[0]?.focus();
    fireEvent.keyDown(chips[0]!, { key: 'ArrowRight' });
    // Focusing the disabled chip moves nothing, so the reader would have been
    // stuck on Decision pressing the same key.
    expect(document.activeElement).toBe(chips[2]);
  });

  test('the count is a fact, so it never drops below a measured step', () => {
    // The engine draws it in the DECORATION step, which measures 2.25:1 at its
    // worst and is the one step this package refuses to put a word on: a
    // number saying how far a filter narrows a list is something a reader acts
    // on. It inherits the chip's own ink instead, in both states.
    const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'FilterChip.css'), 'utf8');
    const count = /\.crewlet-filter-chip__count\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(count).toMatch(/color:\s*inherit/);
    // Spelled without its leading dashes and prefixed at use: the package's
    // variable check reads a quoted `--name` in a .tsx file as a declaration.
    expect(css).not.toContain(`--${'color-text-muted'}`);
  });

  test('carries no axe violation in either mode', async () => {
    const { container } = render(
      <main>
        <h1>Activity</h1>
        <FilterChipGroup label="Severity">
          <FilterChip pressed onPressedChange={() => {}} count={3}>
            Errors
          </FilterChip>
          <FilterChip pressed={false} onPressedChange={() => {}}>
            Warnings
          </FilterChip>
        </FilterChipGroup>
        <Kinds />
      </main>,
    );
    const result = await axe.run(container, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
      rules: { 'color-contrast': { enabled: false } },
      resultTypes: ['violations'],
    });
    expect(result.violations.map((violation) => violation.id)).toEqual([]);
  });
});
