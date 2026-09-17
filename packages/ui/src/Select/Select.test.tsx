/**
 * Choosing one of a bounded set, in both of the control's modes.
 *
 * The probe this file inverts is the highlight: the listbox moved a class and
 * nothing else, so a screen reader heard the list open and then silence as
 * the arrows walked it. The rest are the rules a native select gives away the
 * moment it is replaced, and the two the engine's own filter taught: a stored
 * answer this list no longer offers must not vanish into a different one, and
 * a placeholder must not sit above an answer that already exists.
 */

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { useState } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { Modal } from '../Modal/index.js';
import { Select, type SelectOption, type SelectProps, type SelectValue } from './Select.js';

afterEach(cleanup);

const SEATS: SelectOption[] = [
  { value: 'engineer', label: 'Software Engineer', group: 'Seats', description: 'software-engineer' },
  { value: 'sre', label: 'Site Reliability', group: 'Seats', description: 'site-reliability' },
  { value: 'retired', label: 'Retired seat', group: 'Seats', disabled: true },
  { value: 'engineering', label: 'Engineering', group: 'Units' },
];

function Picker(props: Partial<React.ComponentProps<typeof Select>>) {
  const [value, setValue] = useState<SelectValue | SelectValue[] | undefined>('engineer');
  return (
    <>
      <Select
        ariaLabel="Owner"
        options={SEATS}
        value={value}
        onChange={(next) => setValue(next)}
        {...props}
      />
      <pre data-testid="value">{JSON.stringify(value)}</pre>
    </>
  );
}

const chosen = () => JSON.parse(screen.getByTestId('value').textContent ?? 'null') as unknown;
const trigger = () => screen.getByRole('combobox', { name: 'Owner' });
const highlighted = (): string | null => {
  const id = trigger().getAttribute('aria-activedescendant');
  return id ? (document.getElementById(id)?.textContent ?? null) : null;
};

test('the list points at its highlighted row, and the arrows step over a disabled one', () => {
  render(<Picker />);
  fireEvent.click(trigger());
  const list = screen.getByRole('listbox', { name: 'Owner' });
  expect(trigger().getAttribute('aria-controls')).toBe(list.id);
  // It opens on the chosen row, not the top of the list.
  expect(highlighted()).toContain('Software Engineer');

  fireEvent.keyDown(trigger(), { key: 'ArrowDown' });
  expect(highlighted()).toContain('Site Reliability');
  // "Retired seat" is disabled, so Down goes past it to the next group.
  fireEvent.keyDown(trigger(), { key: 'ArrowDown' });
  expect(highlighted()).toContain('Engineering');
  // And End lands on the last row that can actually be taken.
  fireEvent.keyDown(trigger(), { key: 'End' });
  expect(highlighted()).toContain('Engineering');
  fireEvent.keyDown(trigger(), { key: 'Home' });
  expect(highlighted()).toContain('Software Engineer');
});

test('aria-selected marks the choice, not the row the arrows are on', () => {
  render(<Picker />);
  fireEvent.click(trigger());
  fireEvent.keyDown(trigger(), { key: 'ArrowDown' });
  expect(highlighted()).toContain('Site Reliability');
  // Selection does not follow focus here: Enter takes a row and Escape leaves
  // it, so walking the list must not tell a reader they chose every row.
  expect(screen.getByRole('option', { name: /Site Reliability/ }).getAttribute('aria-selected')).toBe('false');
  expect(screen.getByRole('option', { name: /Software Engineer/ }).getAttribute('aria-selected')).toBe('true');
});

test('type-ahead reaches a row without a search box', () => {
  render(<Picker />);
  fireEvent.click(trigger());
  fireEvent.keyDown(trigger(), { key: 'e' });
  expect(highlighted()).toContain('Engineering');
});

test('groups are named, and options carry their second line', () => {
  render(<Picker />);
  fireEvent.click(trigger());
  const units = screen.getByRole('group', { name: 'Units' });
  expect(within(units).getAllByRole('option').map((row) => row.textContent)).toEqual(['Engineering']);
  expect(screen.getByRole('option', { name: /Software Engineer/ }).textContent).toContain('software-engineer');
});

test('Enter takes the highlighted row, closes the list and gives focus back', () => {
  render(<Picker />);
  trigger().focus();
  fireEvent.keyDown(trigger(), { key: 'ArrowDown' });
  fireEvent.keyDown(trigger(), { key: 'ArrowDown' });
  fireEvent.keyDown(trigger(), { key: 'Enter' });
  expect(chosen()).toBe('sre');
  expect(screen.queryByRole('listbox')).toBeNull();
  expect(document.activeElement).toBe(trigger());
});

test('Tab leaves the field and takes the list with it, choosing nothing', () => {
  render(<Picker />);
  trigger().focus();
  fireEvent.keyDown(trigger(), { key: 'ArrowDown' });
  fireEvent.keyDown(trigger(), { key: 'Tab' });
  expect(screen.queryByRole('listbox')).toBeNull();
  expect(chosen()).toBe('engineer');
});

test('nothing is taken while an input method is composing a word', () => {
  render(<Picker />);
  trigger().focus();
  fireEvent.click(trigger());
  fireEvent.keyDown(trigger(), { key: 'ArrowDown' });
  expect(highlighted()).toContain('Site Reliability');
  fireEvent.keyDown(trigger(), { key: 'Enter', keyCode: 229 });
  expect(chosen()).toBe('engineer');
  expect(screen.getByRole('listbox')).toBeTruthy();
});

test('Escape closes the list and leaves the dialog around it open', () => {
  const closed = vi.fn();
  render(
    <Modal open title="Edit seat" onClose={closed}>
      <Picker />
    </Modal>,
  );
  trigger().focus();
  fireEvent.keyDown(trigger(), { key: 'ArrowDown' });
  expect(screen.getByRole('listbox')).toBeTruthy();
  fireEvent.keyDown(trigger(), { key: 'Escape' });
  expect(screen.queryByRole('listbox')).toBeNull();
  expect(closed).not.toHaveBeenCalled();
  expect(screen.getByRole('dialog')).toBeTruthy();
});

test('several choices are a multiselectable list, and an unknown one is kept', () => {
  render(<Picker multiple value={['engineer', 'former-unit']} />);
  expect(trigger().textContent).toContain('2 selected');
  fireEvent.click(trigger());
  expect(screen.getByRole('listbox', { name: 'Owner' }).getAttribute('aria-multiselectable')).toBe('true');
  // Taking one keeps the list open, so several neighbours are chosen in a row.
  fireEvent.mouseDown(screen.getByRole('option', { name: /Engineering/ }));
  expect(screen.getByRole('listbox')).toBeTruthy();
});

test('Tab out of a search box hands focus back before the panel goes', () => {
  render(<Picker searchable />);
  const trigger = screen.getByRole('button', { name: 'Owner' });
  fireEvent.click(trigger);
  const box = screen.getByRole('combobox', { name: 'Search' });
  box.focus();
  fireEvent.keyDown(box, { key: 'Tab' });
  expect(screen.queryByRole('listbox')).toBeNull();
  // The search box lives in the portalled panel this press removes, so a
  // browser performing Tab's default afterwards would find the element gone
  // and drop focus on the page body, one press from the top of the document.
  expect(document.activeElement).toBe(trigger);
});

test('a search narrows the list and the box becomes the combobox', () => {
  render(<Picker searchable />);
  fireEvent.click(screen.getByRole('button', { name: 'Owner' }));
  const box = screen.getByRole('combobox', { name: 'Search' });
  fireEvent.change(box, { target: { value: 'rel' } });
  expect(screen.getAllByRole('option').map((row) => row.textContent?.slice(0, 16))).toEqual(['Site Reliability']);
  fireEvent.change(box, { target: { value: 'zzz' } });
  expect(screen.getByText('No matches')).toBeTruthy();
});

test('the listbox is what a Select draws unless a caller asks for the other one', () => {
  render(<Picker />);
  // No native control anywhere: the house style is the listbox, and `native`
  // is drawn only where a call site names it.
  expect(document.querySelector('select')).toBe(null);
  expect(trigger().getAttribute('aria-haspopup')).toBe('listbox');

  cleanup();
  render(<Picker mode="native" />);
  expect(document.querySelector('select')).not.toBe(null);
});

/*
 * A filter bar is a row of pickers, not a form: each one sizes to the answer
 * it is showing. The class has to reach the root of WHICHEVER control is
 * drawn, which is the half that breaks silently: the mode branches were given
 * the caller's className separately, and a form handler passed to only one of
 * them is a bug this file already carries a case for.
 */
test('the toolbar width reaches the root of both controls', () => {
  const { container, rerender } = render(<Picker width="auto" />);
  expect(container.querySelector('.crewlet-select')?.className).toContain('crewlet-select--auto');
  rerender(<Picker width="auto" mode="native" />);
  expect(container.querySelector('.crewlet-select')?.className).toContain('crewlet-select--auto');
  // And a field on a form takes the line it is given, with no class of its own.
  rerender(<Picker />);
  expect(container.querySelector('.crewlet-select')?.className).not.toContain('crewlet-select--auto');
});

test('an "Any" answer the list offers is shown rather than a placeholder over it', () => {
  const ANY: SelectOption[] = [
    { value: '', label: 'Any role' },
    { value: 'owner', label: 'Owner' },
  ];
  function Filter() {
    const [value, setValue] = useState<SelectValue | SelectValue[] | undefined>('');
    return <Select ariaLabel="Role" options={ANY} value={value} onChange={(next) => setValue(next)} placeholder="Select a role" />;
  }
  render(<Filter />);
  const role = screen.getByRole('combobox', { name: 'Role' });
  /*
   * The empty string IS an answer on this list, so the control reads it. The
   * placeholder above it would be a second, unlabelled spelling of the same
   * answer, drawn over the one already chosen, which is what every filter in
   * the console came up showing.
   */
  expect(role.textContent).toContain('Any role');
  expect(role.textContent).not.toContain('Select a role');
});

test('the form handlers a caller passes reach the control it actually draws', () => {
  const blurred = vi.fn();
  const focused = vi.fn();
  render(<Picker onBlur={blurred} onFocus={focused} aria-describedby="hint" required />);
  fireEvent.focus(trigger());
  fireEvent.blur(trigger());
  expect(focused).toHaveBeenCalledTimes(1);
  expect(blurred).toHaveBeenCalledTimes(1);
  // And the field's own description and requiredness travel with them.
  expect(trigger().getAttribute('aria-describedby')).toBe('hint');
  expect(trigger().getAttribute('aria-required')).toBe('true');
});

test('a field can state requiredness without asking for the constraint', () => {
  /*
   * THE DEFECT THIS EXISTS FOR. `aria-required` was not on the props at all,
   * so the only way to tell a reader an answer is expected was `required` —
   * and on a form where requiredness is the UNMARKED DEFAULT that is the wrong
   * flag, because the mark beside the label is drawn from the same one. A
   * consumer that wanted the fact without the asterisk could not express it,
   * and shipped the select with nothing said at all.
   *
   * With neither, nothing is said: an attribute reading `false` is a claim of
   * its own and every current call site would start making it.
   */
  const { rerender } = render(<Picker />);
  expect(trigger().hasAttribute('aria-required')).toBe(false);

  rerender(<Picker aria-required />);
  expect(trigger().getAttribute('aria-required')).toBe('true');
  // The constraint is NOT what was asked for, and is not implied backwards.
  expect(trigger().hasAttribute('required')).toBe(false);
});

test('the props type carries the fact, not only the JSX element', () => {
  /*
   * AND THIS IS THE HALF A RENDER CANNOT HOLD. TypeScript exempts a JSX
   * attribute whose name is not a valid identifier from excess-property
   * checking, so `aria-required` on the element was never a compile error even
   * while the component dropped it: the consumer's call site was green and the
   * control said nothing. The exemption does not apply to a props OBJECT,
   * which is what a consumer's own field component forwards, so this is where
   * the prop has to be declared to exist at all. It is a typecheck guard
   * written as a test, and `npm run typecheck` covers this file.
   */
  const forwarded: SelectProps = {
    ariaLabel: 'Owner',
    options: SEATS,
    value: 'engineer',
    'aria-required': true,
  };
  render(<Select {...forwarded} onChange={() => {}} />);
  expect(trigger().getAttribute('aria-required')).toBe('true');
});

test('the explicit statement wins over the constraint that implies it', () => {
  // `required` implies the ARIA fact; `aria-required` states it on its own.
  // Given both, the more specific one is the answer — otherwise a field could
  // never carry the constraint and say anything else about it.
  render(<Picker required aria-required={false} />);
  expect(trigger().getAttribute('aria-required')).toBe('false');
});

test('requiredness follows the element that IS the combobox, and reaches the native one', () => {
  // With a search box open, focus is in it and it carries the role, so it is
  // what has to carry the fact: a reader is told by whichever element they are
  // standing on.
  render(<Picker searchable aria-required />);
  fireEvent.click(screen.getByRole('button', { name: 'Owner' }));
  expect(screen.getByRole('combobox', { name: 'Search' }).getAttribute('aria-required')).toBe('true');

  cleanup();
  // And the other mode draws one element, which carries it the same way.
  render(<Picker mode="native" aria-required />);
  const control = screen.getByRole('combobox', { name: 'Owner' });
  expect(control.tagName).toBe('SELECT');
  expect(control.getAttribute('aria-required')).toBe('true');
  expect(control.hasAttribute('required')).toBe(false);
});

test('native mode keeps a stored answer the list no longer offers', () => {
  render(
    <Select
      mode="native"
      ariaLabel="Coverage"
      value="every-repository"
      onChange={() => {}}
      options={[
        { value: 'selected', label: 'Selected repositories' },
        { value: 'none', label: 'None' },
      ]}
    />,
  );
  const control = screen.getByRole('combobox', { name: 'Coverage' }) as HTMLSelectElement;
  expect(control.value).toBe('every-repository');
  expect(within(control).getByRole('option', { name: 'every-repository' })).toBeTruthy();
});

test('native mode offers a placeholder only over an answer that does not exist', () => {
  const { rerender } = render(
    <Select
      mode="native"
      ariaLabel="Lead"
      placeholder="Choose one"
      value=""
      onChange={() => {}}
      options={[{ value: 'ceo', label: 'Chief Executive' }]}
    />,
  );
  expect(screen.getByRole('option', { name: 'Choose one' })).toBeTruthy();

  // Not over an answer that exists.
  rerender(
    <Select
      mode="native"
      ariaLabel="Lead"
      placeholder="Choose one"
      value="ceo"
      onChange={() => {}}
      options={[{ value: 'ceo', label: 'Chief Executive' }]}
    />,
  );
  expect(screen.queryByRole('option', { name: 'Choose one' })).toBeNull();

  // And not where "nothing" is itself a choice, which the placeholder would
  // be a second, unlabelled spelling of.
  rerender(
    <Select
      mode="native"
      ariaLabel="Lead"
      placeholder="Choose one"
      value=""
      onChange={() => {}}
      options={[
        { value: '', label: "No lead (inherits the parent's)" },
        { value: 'ceo', label: 'Chief Executive' },
      ]}
    />,
  );
  expect(screen.queryByRole('option', { name: 'Choose one' })).toBeNull();
});

test('native mode reports the value and the option that carried it', () => {
  const onChange = vi.fn();
  render(
    <Select
      mode="native"
      ariaLabel="Lead"
      value="ceo"
      onChange={onChange}
      required
      error
      options={[
        { value: 'ceo', label: 'Chief Executive' },
        { value: 'cto', label: 'Chief Technology Officer' },
      ]}
    />,
  );
  const control = screen.getByRole('combobox', { name: 'Lead' });
  expect(control.getAttribute('aria-invalid')).toBe('true');
  expect(control.hasAttribute('required')).toBe(true);
  fireEvent.change(control, { target: { value: 'cto' } });
  expect(onChange).toHaveBeenCalledWith('cto', expect.objectContaining({ value: 'cto' }));
});

/*
 * The list itself, through axe. The suite in apps/ui-tests runs over the
 * components that draw a surface with no interaction; a list only exists once
 * somebody opens it, and it is the richest markup in this package: a portalled
 * panel of groups, options, headings and a name, none of which the cases above
 * would notice losing.
 */
async function auditPage(): Promise<string[]> {
  const result = await axe.run(document.body, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    // Contrast needs layout and resolved custom properties, neither of which
    // jsdom has. The palette suite measures it from the stylesheets instead.
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  return result.violations.map(
    (violation) => `${violation.id}: ${violation.nodes.map((node) => node.html).join(', ')}`,
  );
}

test('an open list carries no violation, grouped, searchable or multiple', async () => {
  render(
    <main>
      <h1>Seats</h1>
      <Picker searchable multiple value={['engineer', 'former-unit']} />
    </main>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Owner' }));
  // Asserted, not assumed: a list that never opened is a list axe has nothing
  // to say about, and the case would pass for the wrong reason.
  expect(screen.getByRole('listbox', { name: 'Owner' })).toBeTruthy();
  expect(await auditPage()).toEqual([]);
});
