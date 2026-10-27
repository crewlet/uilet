/**
 * The filter pill's contract: a filter in force reads as the sentence it is,
 * in three registers, and the control that takes it off names that sentence.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { FILTER_PILL_WORDS_CLASS, FilterPill, filterPillSentence } from './index.js';

const iconButtonSheet = () =>
  readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../IconButton/IconButton.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

/** A selector's weight as [classes and pseudo-classes and attributes, types], enough to compare these two sheets. */
function weight(selector: string): number {
  const classes = (selector.match(/\.[\w-]+/g) ?? []).length;
  const attributes = (selector.match(/\[/g) ?? []).length;
  const pseudo = (selector.match(/(?<!:):(?!not|is|where)[\w-]+/g) ?? []).length;
  return (classes + attributes + pseudo) * 100;
}

/** Every selector in a sheet whose rule sets one of these properties. */
function selectorsSetting(css: string, properties: string[]): string[] {
  const found: string[] = [];
  for (const [, list, body] of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    if (!properties.some((property) => new RegExp(`(^|;|\\s)${property}\\s*:`).test(body!))) continue;
    for (const one of list!.split(',')) found.push(one.trim());
  }
  return found;
}

afterEach(cleanup);

const sheet = () =>
  readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'FilterPill.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

describe('the words', () => {
  test('read as a sentence with spaces between the parts, never run together', () => {
    const { container } = render(<FilterPill field="Status" operator="is" value="In progress" />);
    const words = container.querySelector(`.${FILTER_PILL_WORDS_CLASS}`)!;
    expect(words.textContent).toBe('Status is In progress');
    expect(container.querySelector('.crewlet-filter-pill__field')!.textContent).toBe('Status');
    expect(container.querySelector('.crewlet-filter-pill__operator')!.textContent).toBe('is');
    expect(container.querySelector('.crewlet-filter-pill__value')!.textContent).toBe('In progress');
  });

  test('join the field and the value with a colon where there is no operator', () => {
    const { container } = render(<FilterPill field="Role" value="Admin" />);
    expect(container.textContent).toBe('Role: Admin');
    expect(container.querySelector('.crewlet-filter-pill__operator')).toBeNull();
  });

  test('are the field alone for a switch with no value', () => {
    const { container } = render(<FilterPill field="Blocked" />);
    expect(container.textContent).toBe('Blocked');
    expect(container.querySelector('.crewlet-filter-pill__value')).toBeNull();
  });

  test('become the control the caller draws, which takes the words class', () => {
    const open = vi.fn();
    render(
      <FilterPill
        field="Seat"
        value="Ada"
        renderWords={(words, className) => (
          <button type="button" className={className} onClick={open}>
            {words}
          </button>
        )}
      />,
    );
    const control = screen.getByRole('button', { name: 'Seat: Ada' });
    expect(control.classList.contains(FILTER_PILL_WORDS_CLASS)).toBe(true);
    fireEvent.click(control);
    expect(open).toHaveBeenCalledTimes(1);
  });
});

describe('the remove control', () => {
  test('is a button named by the whole filter, and takes the filter off', () => {
    const remove = vi.fn();
    render(<FilterPill field="Status" operator="is" value="In progress" onRemove={remove} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove the Status is In progress filter' }));
    expect(remove).toHaveBeenCalledTimes(1);
  });

  test('takes a name from the caller, and a neutral one where the parts are not words', () => {
    const { rerender } = render(<FilterPill field="Status" value="Done" onRemove={() => {}} removeLabel="Clear status" />);
    expect(screen.getByRole('button', { name: 'Clear status' })).toBeTruthy();
    rerender(<FilterPill field={<em>Status</em>} value="Done" onRemove={() => {}} />);
    expect(screen.getByRole('button', { name: 'Remove this filter' })).toBeTruthy();
  });

  test('is absent where nothing removes the filter', () => {
    render(<FilterPill field="Status" value="Done" />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});

test('the words a pill says can be the application own', () => {
  render(
    <FilterPill
      field="Rol"
      value="Admin"
      onRemove={() => {}}
      labels={{ fieldEnd: ' =', remove: (sentence) => `Quitar ${sentence}` }}
    />,
  );
  expect(document.querySelector(`.${FILTER_PILL_WORDS_CLASS}`)!.textContent).toBe('Rol = Admin');
  expect(screen.getByRole('button', { name: 'Quitar Rol Admin' })).toBeTruthy();
});

// THE REMOVE CONTROL OUTRANKS ICONBUTTON. At equal weight IconButton's own
// size rule, loaded later in a bundle, kept the control 26px tall in a 26px
// pill with a 1px edge: it overran the pill and lost its ring's bottom edge.
test('the remove rule outranks every IconButton rule it overrides', () => {
  for (const property of ['height', 'border-radius', 'outline-offset']) {
    const pill = selectorsSetting(sheet(), [property]).filter((sel) => sel.includes('crewlet-filter-pill__remove'));
    expect(pill.length, property).toBeGreaterThan(0);
    // THE RULES WHOSE SUBJECT IS THE BUTTON, not a glyph inside it.
    const button = selectorsSetting(iconButtonSheet(), [property]).filter((sel) =>
      /(^|\s)[^\s]*\.crewlet-icon-btn[\w-]*(:[\w-]+(\([^)]*\))?)*$/.test(sel),
    );
    expect(button.length, property).toBeGreaterThan(0);
    const heaviest = Math.max(...button.map(weight));
    for (const sel of pill) expect(weight(sel), `${sel} sets ${property}`).toBeGreaterThan(heaviest);
  }
  // And its edge is logical, so a right-to-left page draws it before the cross.
  expect(sheet()).toMatch(/border-inline-start: 1px solid/);
  expect(sheet()).not.toMatch(/border-left/);
});

test('a sentence is built only from words', () => {
  expect(filterPillSentence('Due', 'is', 'This week')).toBe('Due is This week');
  expect(filterPillSentence('Blocked')).toBe('Blocked');
  expect(filterPillSentence('Points', 'over', 3)).toBe('Points over 3');
  expect(filterPillSentence(<b>Due</b>, 'is', 'Today')).toBeUndefined();
});

test('the registers: the value is the emphasised part, every ring is drawn inside the pill', () => {
  const css = sheet();
  expect(css).toMatch(/\.crewlet-filter-pill__value \{[^}]*font-weight: var\(--font-weight-semibold\)/);
  expect(css).toMatch(/\.crewlet-filter-pill__operator \{[^}]*color: var\(--color-text-secondary\)/);
  for (const ring of css.match(/:focus-visible \{[^}]*\}/g) ?? []) {
    expect(ring).toMatch(/outline-offset: var\(--size-focus-ring-inset-offset\)/);
  }
});

test('a row of pills carries no violation', async () => {
  const { container } = render(
    <div role="group" aria-label="Filters">
      <FilterPill field="Status" operator="is" value="In progress" onRemove={() => {}} />
      <FilterPill field="Text" operator="contains" value="login" onRemove={() => {}} />
      <FilterPill field="Blocked" onRemove={() => {}} />
      <FilterPill
        field="Seat"
        value="Ada"
        renderWords={(words, className) => (
          <button type="button" className={className}>
            {words}
          </button>
        )}
        onRemove={() => {}}
      />
    </div>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations.map((violation) => violation.id)).toEqual([]);
});
