/**
 * The form row: what a control is named by, what it is described by, and what
 * survives a refusal.
 *
 * The case this file exists for is the last one. `FormField` used to swap the
 * help line out for the error, so the sentence saying what a valid value
 * looks like vanished at the exact moment somebody needed it.
 *
 * It also holds the two guards the whole FIELD REGISTER shares, over every
 * stylesheet that draws one: that a focused field shows ONE ring and that
 * every field kind is clean under axe. Both are one rule each, and a rule
 * written out once per component is five copies free to drift, which is how
 * two spellings of the focus ring came to be there in the first place. Their
 * own headers are down the file.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { useState } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { Announcer } from '../Announcer/index.js';
import { Checkbox } from '../Checkbox/index.js';
import { Combobox } from '../Combobox/index.js';
import { ListInput } from '../ListInput/index.js';
import { Select } from '../Select/index.js';
import { Switch } from '../Switch/index.js';
import { TagsInput } from '../TagsInput/index.js';
import { HeadingLevelProvider } from '../utils/headingLevel.js';
import { FormField } from './FormField.js';
import { FormSection } from './FormSection.js';
import { Input, InputAffix } from './Input.js';
import { Label } from './Label.js';
import { ReadOnlyField } from './ReadOnlyField.js';
import { Textarea } from './Textarea.js';

afterEach(cleanup);

const describedText = (control: Element): string =>
  (control.getAttribute('aria-describedby') ?? '')
    .split(' ')
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent ?? '')
    .join(' | ');

test('help and error are both read, in reading order, with the help first', () => {
  render(
    <FormField
      label="Workspace"
      helper="The subdomain, not the whole address."
      error="That workspace does not exist."
    >
      {(field) => <Input id={field.id} aria-describedby={field.describedBy} error={field.invalid} />}
    </FormField>,
  );
  const box = screen.getByRole('textbox', { name: 'Workspace' });
  expect(describedText(box)).toBe('The subdomain, not the whole address. | That workspace does not exist.');
  expect(box.getAttribute('aria-invalid')).toBe('true');
  expect(screen.getByRole('alert').textContent).toBe('That workspace does not exist.');
});

test('a caller-supplied sentence is described before the help and the error', () => {
  render(
    <FormField label="Site" helper="Where the engine reaches you." describedBy="site-affix">
      {(field) => (
        <Input
          id={field.id}
          aria-describedby={field.describedBy}
          leading={<InputAffix id="site-affix" text="https://" />}
        />
      )}
    </FormField>,
  );
  expect(describedText(screen.getByRole('textbox', { name: 'Site' }))).toBe(
    'Begins with https:// | Where the engine reaches you.',
  );
  // The characters are a picture, and the sentence is what is read: drawn
  // twice, a screen reader spells the punctuation out before the value.
  expect(screen.getByText('https://').getAttribute('aria-hidden')).toBe('true');
});

test('requiredness is a mark for the eye and an attribute for the reader', () => {
  const { rerender } = render(
    <FormField label="Name" required>
      {(field) => <Input id={field.id} aria-required={field.required} />}
    </FormField>,
  );
  const box = screen.getByRole('textbox', { name: 'Name' });
  expect(box.getAttribute('aria-required')).toBe('true');
  // The asterisk says nothing out loud, so the name stays the label alone.
  expect(screen.getByText('*').getAttribute('aria-hidden')).toBe('true');

  rerender(
    <FormField label="Name" optional>
      {(field) => <Input id={field.id} aria-required={field.required} />}
    </FormField>,
  );
  expect(screen.getByRole('textbox', { name: /Name/ }).getAttribute('aria-required')).toBe('false');
  expect(screen.getByText('(optional)')).toBeTruthy();

  rerender(
    <Label requiredNews htmlFor="gated">
      Token
    </Label>,
  );
  expect(screen.getByText('(required)')).toBeTruthy();
});

test('a group of controls is a fieldset named by its legend', () => {
  render(
    <FormField as="fieldset" label="Goals" helper="The first one is read first.">
      <input aria-label="Goal 1 of 1" />
    </FormField>,
  );
  const group = screen.getByRole('group', { name: 'Goals' });
  expect(group.tagName).toBe('FIELDSET');
  // A legend names the group, so nothing inside it claims to label one control.
  expect(group.querySelector('label')).toBeNull();
});

test('a section takes its heading level from the surface around it, clamped at six', () => {
  render(
    <HeadingLevelProvider level={5}>
      <FormSection title="Schedule" hint="When the seat wakes up.">
        <FormSection title="Catch-up">
          <p>Inner</p>
        </FormSection>
      </FormSection>
    </HeadingLevelProvider>,
  );
  expect(screen.getByRole('heading', { name: 'Schedule', level: 5 })).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Catch-up', level: 6 })).toBeTruthy();
  // Named regions, so a screen reader can jump to one and say which it is.
  expect(screen.getByRole('region', { name: 'Schedule' })).toBeTruthy();
});

test('a section nested three deep stops at six rather than becoming a div', () => {
  render(
    <HeadingLevelProvider level={6}>
      <FormSection title="Deepest">
        <FormSection title="Deeper still">
          <p>Inner</p>
        </FormSection>
      </FormSection>
    </HeadingLevelProvider>,
  );
  expect(screen.getByRole('heading', { name: 'Deepest', level: 6 })).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Deeper still', level: 6 })).toBeTruthy();
});

test('a fact the form shows and does not collect is text, not a disabled box', () => {
  render(
    <ReadOnlyField
      label="Handle"
      value="software-engineer"
      reason="Derived from the seat's name."
      mono
    />,
  );
  expect(screen.queryByRole('textbox')).toBeNull();
  expect(screen.getByText('software-engineer')).toBeTruthy();
  expect(screen.getByText("Derived from the seat's name.")).toBeTruthy();
});

test('the width steps are a ramp, and the widest one holds a sentence', () => {
  /*
   * The steps are named for what they HOLD, so they have to keep their order:
   * xs is a figure, sm a handle, md a name, and lg the one a reader types a
   * sentence into. The widest step is measured against the longest of those in
   * the product, the knowledge search, whose own placeholder runs past sixty
   * characters; drawn at the step below it the sentence was cut mid-word.
   */
  const here = dirname(fileURLToPath(import.meta.url));
  const css = readFileSync(resolve(here, 'Input.css'), 'utf8');
  const step = (name: string) => {
    const found = new RegExp(`--crewlet-input-width-${name}:\\s*(\\d+)px`).exec(css);
    if (!found) throw new Error(`Input.css declares no --crewlet-input-width-${name}`);
    return Number(found[1]);
  };
  const ramp = ['xs', 'sm', 'md', 'lg'].map(step);
  expect(ramp).toEqual([...ramp].sort((a, b) => a - b));
  expect(new Set(ramp).size).toBe(ramp.length);
  expect(step('lg')).toBe(520);
});

test('a search field keeps its type', () => {
  render(<Input type="search" aria-label="Search seats" width="sm" />);
  expect(screen.getByRole('searchbox', { name: 'Search seats' }).getAttribute('type')).toBe('search');
});

test('the clear control is a real button, drawn only while there is something to clear', () => {
  const cleared = vi.fn();
  render(<Input type="search" aria-label="Search seats" onClear={cleared} clearLabel="Clear search" />);
  // Nothing typed, nothing to clear: a control that does nothing is not drawn.
  expect(screen.queryByRole('button', { name: 'Clear search' })).toBe(null);

  const box = screen.getByRole('searchbox', { name: 'Search seats' });
  fireEvent.change(box, { target: { value: 'ada' } });
  fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));

  expect(cleared).toHaveBeenCalledTimes(1);
  // An uncontrolled field is emptied here, because nobody else holds its value.
  expect((box as HTMLInputElement).value).toBe('');
  /*
   * And focus goes back to the field: the button that was just pressed has
   * been removed with the text it cleared, and focus left on it falls to the
   * page body, where the next keystroke reaches nothing.
   */
  expect(document.activeElement).toBe(box);
});

test('a controlled field takes its clear control from the value the caller holds', () => {
  render(<Input type="search" aria-label="Search seats" value="ada" onChange={() => {}} onClear={() => {}} clearLabel="Clear search" />);
  expect(screen.getByRole('button', { name: 'Clear search' })).toBeDefined();
  cleanup();

  render(<Input type="search" aria-label="Search seats" value="" onChange={() => {}} onClear={() => {}} clearLabel="Clear search" />);
  expect(screen.queryByRole('button', { name: 'Clear search' })).toBe(null);
});

test("a caller's own onChange still fires with the clear control drawn", () => {
  const changed = vi.fn();
  render(<Input aria-label="Handle" onChange={changed} onClear={() => {}} />);
  fireEvent.change(screen.getByRole('textbox', { name: 'Handle' }), { target: { value: 'ada' } });
  expect(changed).toHaveBeenCalledTimes(1);
});

/*
 * ── One ring, over every field this package draws ──────────────────────────
 *
 * WHY THESE THREE TESTS ARE HERE AND NOT SPLIT ACROSS SIX SUITES. This is one
 * rule, and it broke in one way in five stylesheets at once: a field drew its
 * indicator as the border recoloured to --color-focus AND --shadow-focus,
 * which is itself a ring (a background-coloured gap, then a band), so a
 * focused field showed two accent edges with a gap between them. Written out
 * per component the rule would be five copies free to drift, which is how the
 * two spellings were there to be found in the first place. Input.css is where
 * the field register is defined, so the guard over all of it reads here.
 *
 * Each test breaks in the way the defect actually arrived, so none of them can
 * pass while the field draws two rings.
 */

const FIELD_SHEETS = [
  'Input/Input.css',
  'Select/Select.css',
  'TagsInput/TagsInput.css',
  'Checkbox/Checkbox.css',
  'Switch/Switch.css',
  // Neither draws a field of its own: Combobox and ListInput compose the ones
  // above. Listed so the day one of them grows a ring, this table is what says
  // so, rather than a scan that quietly never looked.
  'Combobox/Combobox.css',
  'ListInput/ListInput.css',
];

/**
 * Everything about a rule that can paint an edge a reader sees, plus the one
 * property that can stop an edge being painted at all: see the zero-opacity
 * case below.
 */
const RING = /^(outline(-[a-z]+)?|box-shadow|border(-color)?|opacity)$/;

interface RingRule {
  where: string;
  selector: string;
  declared: Map<string, string>;
}

/**
 * Every rule in the field stylesheets, with its ring declarations, comments
 * blanked so prose about a rule is never read as the rule.
 */
function sheetRules(): RingRule[] {
  const here = dirname(fileURLToPath(import.meta.url));
  const found: RingRule[] = [];
  for (const sheet of FIELD_SHEETS) {
    const text = readFileSync(resolve(here, '..', sheet), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ');
    for (const [, selector = '', body = ''] of text.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const declared = new Map<string, string>();
      for (const part of body.split(';')) {
        const at = part.indexOf(':');
        if (at < 0) continue;
        const property = part.slice(0, at).trim().toLowerCase();
        if (RING.test(property)) declared.set(property, part.slice(at + 1).trim().replace(/\s+/g, ' '));
      }
      found.push({ where: sheet, selector: selector.trim().replace(/\s+/g, ' '), declared });
    }
  }
  return found;
}

const focusRules = (): RingRule[] => sheetRules().filter((rule) => rule.selector.includes(':focus'));

test('the field stylesheets are read, and they are the ones that draw a field', () => {
  // A scan that found nothing would pass the two tests below for any tree.
  const rules = sheetRules();
  expect(rules.length).toBeGreaterThan(80);
  expect(new Set(rules.map((rule) => rule.where)).size).toBe(FIELD_SHEETS.length);
  expect(focusRules().length).toBeGreaterThan(5);
});

test('a focused field draws its ring as one outline, never a shadow or a recoloured boundary', () => {
  /*
   * The two halves of what was there before, each stated on its own so a
   * failure says which one came back.
   *
   * A SHADOW IS NOT AN INDICATOR. Forced-colors mode drops every box-shadow
   * and keeps outlines, so a ring drawn as a shadow is no ring at all for the
   * readers who most need one; --shadow-focus is two rings besides.
   *
   * AND THE BOUNDARY IS NOT ONE EITHER. It is already drawn, at 3:1, in
   * --color-border-control. Recolouring it under an outline adds an edge and
   * says nothing, and it is what painted the error state out from under the
   * reader fixing it.
   */
  const shadowed = focusRules()
    .filter((rule) => (rule.declared.get('box-shadow') ?? 'none') !== 'none')
    .map((rule) => `${rule.where}  ${rule.selector}  box-shadow: ${rule.declared.get('box-shadow')}`);
  expect(shadowed).toEqual([]);

  const recoloured = focusRules()
    .filter((rule) => rule.declared.has('border') || rule.declared.has('border-color'))
    .map((rule) => `${rule.where}  ${rule.selector}  border: ${rule.declared.get('border') ?? rule.declared.get('border-color')}`);
  expect(recoloured).toEqual([]);
});

test('one element draws the ring, and it is the one a reader reads as the field', () => {
  /*
   * THE EXACT LIST, not a count: the way the second ring arrives is a NEW
   * rule, on a nested element, drawn inside the one already there. Both had
   * shipped. `.crewlet-input:focus-within` put the whole field's ring around
   * the IconButton's own the moment a reader tabbed onto a search box's clear
   * control, which is a ring around a button inside a ring around the field;
   * and `.crewlet-select__trigger:focus-visible` held a transparent outline
   * that forced-colors mode turns into a second system-coloured ring, two
   * pixels outside the frame's.
   *
   * So a new entry here is the question "is this drawn inside another ring?"
   * being asked, which is the only thing that stops the answer being two.
   */
  const ringed = focusRules()
    .filter((rule) => rule.declared.has('outline') || rule.declared.has('outline-color'))
    .map((rule) => rule.selector)
    .sort();
  expect(ringed).toEqual(
    [
      // The box, and the two states that only change its colour.
      '.crewlet-input:has(.crewlet-input__control:focus-visible)',
      '.crewlet-input.is-error:has(.crewlet-input__control:focus-visible)',
      '.crewlet-input--command:has(.crewlet-input__control:focus-visible)',
      '.crewlet-textarea:focus-visible',
      '.crewlet-textarea.is-error:focus-visible',
      '.crewlet-select:focus-within',
      '.crewlet-select.is-error:focus-within',
      '.crewlet-tags-input__box:focus-visible',
      // The two small controls that ARE their own target, so their ring is
      // outset: an inset one on a 16px box is a box with no middle left.
      '.crewlet-checkbox__control:focus-visible',
      // On the TRACK, not on the control: the control is at zero opacity, and
      // an outline on an element at zero alpha is drawn for nobody.
      '.crewlet-switch__track:has(.crewlet-switch__control:focus-visible)',
    ].sort(),
  );

  /*
   * THE FIELD'S RING IS KEYED ON ITS OWN CONTROL. A field that asks
   * :focus-within answers yes for anything inside it, and a search box holds
   * a second focusable.
   */
  const shell = ringed.find((selector) => selector === '.crewlet-input:has(.crewlet-input__control:focus-visible)');
  expect(shell).toBeDefined();

  /*
   * And the control inside a ringed frame suppresses its own. Left to the
   * document baseline's :focus-visible, each of these would paint a second
   * ring inside the frame's; the frame is what a reader reads as the field.
   */
  const suppressed = ['.crewlet-input__control', '.crewlet-select__native', '.crewlet-select__trigger'];
  const silent = sheetRules().filter(
    (rule) => !rule.selector.includes(':focus') && rule.declared.get('outline') === 'none',
  );
  for (const control of suppressed) {
    expect(silent.some((rule) => rule.selector.split(',').some((part) => part.trim() === control))).toBe(true);
  }

  /*
   * AND NO RING IS DRAWN ON SOMETHING THE SHEET PAINTS AT ZERO ALPHA. Opacity
   * applies to the whole of an element's rendering, its outline included, so a
   * ring on a hidden control is a ring nobody is shown, and it is invisible to
   * every other check here, because the declaration is perfectly correct. The
   * Switch shipped that way: its native checkbox is drawn over the track at
   * `opacity: 0` so the pointer hits a real input, and its focus ring went on
   * the control, so tabbing onto a switch showed nothing at all.
   *
   * The subject is what matters, not the whole selector: a ring keyed on a
   * hidden control with `:has()` and drawn on the visible box is the FIX, so
   * the test reads the selector with its `:has()` argument removed.
   */
  const invisible = sheetRules()
    .filter((rule) => rule.declared.get('opacity') === '0')
    .flatMap((rule) => rule.selector.split(',').map((part) => part.trim()));
  expect(invisible.length).toBeGreaterThan(0);
  const drawnOnNothing = ringed.filter((selector) => {
    const subject = selector.replace(/:has\([^()]*\)/g, '');
    return invisible.some((hidden) => subject.includes(hidden));
  });
  expect(drawnOnNothing).toEqual([]);
});

test('every field rings on one geometry, and a boxed one rings inside its own boundary', () => {
  /*
   * ONE OUTLINE, --color-focus, at one width, and two offsets for one reason.
   *
   * A BOXED FIELD RINGS INSIDE ITSELF, on the offset the token exists for: an
   * outset ring is clipped by a scroller, and a filter box lives in a toolbar
   * inside one. Inset, it also COVERS the boundary rather than standing off
   * it, so the field neither grows a halo when a caret lands in it nor shows
   * a second edge under the ring.
   *
   * A CHECKBOX AND A SWITCH RING OUTSIDE, because each IS its own target
   * rather than a frame around one: 2px eaten off a 16px box is a box with no
   * middle left, and there is no boundary to cover because the ring is the
   * only thing drawn out there.
   */
  const inset = 'var(--size-focus-ring-inset-offset)';
  const geometry = focusRules()
    .filter((rule) => rule.declared.get('outline')?.includes('var(--color-focus)'))
    .map((rule) => `${rule.selector} | ${rule.declared.get('outline')} | ${rule.declared.get('outline-offset')}`)
    .sort();
  expect(geometry).toEqual(
    (
      [
        ['.crewlet-input:has(.crewlet-input__control:focus-visible)', inset],
        ['.crewlet-textarea:focus-visible', inset],
        ['.crewlet-select:focus-within', inset],
        ['.crewlet-tags-input__box:focus-visible', inset],
        ['.crewlet-checkbox__control:focus-visible', '2px'],
        ['.crewlet-switch__track:has(.crewlet-switch__control:focus-visible)', '2px'],
      ] as const
    )
      .map(([selector, offset]) => `${selector} | 2px solid var(--color-focus) | ${offset}`)
      .sort(),
  );

  /*
   * A REFUSED FIELD KEEPS ITS OWN COLOUR WHILE THE READER IS IN IT. The ring
   * covers the boundary, so a focus-coloured one over an error would paint
   * out the one mark on the field saying the value cannot be saved, at the
   * moment somebody is fixing it. Only the colour changes: the ring is in the
   * same place, so "here" and "refused" stay one edge rather than two.
   */
  const refused = focusRules()
    .filter((rule) => rule.selector.includes('.is-error'))
    .map((rule) => `${rule.selector} | ${rule.declared.get('outline-color')}`)
    .sort();
  expect(refused).toEqual(
    [
      '.crewlet-input.is-error:has(.crewlet-input__control:focus-visible)',
      '.crewlet-textarea.is-error:focus-visible',
      '.crewlet-select.is-error:focus-within',
    ]
      .map((selector) => `${selector} | var(--color-feedback-danger)`)
      .sort(),
  );
});

test('the clear control sits inside the field, which is why the ring names the control', () => {
  /*
   * The markup the rule above is written against, asserted rather than
   * assumed: if the clear control ever moved outside the box, :focus-within
   * would be correct again and the selector could be simplified. While it is
   * in here, it cannot be.
   */
  render(<Input type="search" aria-label="Search seats" defaultValue="ada" onClear={() => {}} clearLabel="Clear search" />);
  const clear = screen.getByRole('button', { name: 'Clear search' });
  const box = screen.getByRole('searchbox', { name: 'Search seats' });
  const shell = box.closest('.crewlet-input');
  expect(shell).not.toBeNull();
  expect(shell?.contains(clear)).toBe(true);
});

/*
 * ── Every field kind, through axe, under each theme ────────────────────────
 *
 * The audit the field register did not have. `Select`, `Combobox` and
 * `TagsInput` each run their own over the surface they open; `Input`,
 * `Textarea`, `Checkbox`, `Switch` and `ListInput` ran none at all, here or in
 * apps/ui-tests, so the register's commonest markup was the part nothing
 * checked. It is one form rather than five, because that is what a reader
 * meets and because a name, a description and a refusal are asserted together
 * or not at all.
 *
 * AND WHAT THE THEME DOES AND DOES NOT CHANGE, said plainly. What a theme
 * repaints is COLOUR, and colour is the one thing jsdom cannot answer: it
 * computes no layout and resolves no custom property, so axe reports
 * `color-contrast` as incomplete rather than running it, and the contrast of
 * every step, the focus ring's included, is measured from the stylesheets by
 * @crewlethq/tokens' palette suite instead. What running the audit under each
 * root ATTRIBUTE holds is the other half: that no field reaches for the theme
 * and draws different markup in it. Nothing should, and a field that started
 * to would be a name or a description that exists in one theme only.
 */
async function fieldViolations(container: Element): Promise<string[]> {
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  return result.violations.map(
    (violation) => `${violation.id}: ${violation.help} (${violation.nodes.map((node) => node.html).join(', ')})`,
  );
}

function EveryFieldKind() {
  const [tags, setTags] = useState<string[]>(['eu-west-1']);
  const [goals, setGoals] = useState<string[]>(['Ship the beta', 'Hire two engineers']);
  const [region, setRegion] = useState<string | number | undefined>('eu');
  const [completion, setCompletion] = useState('');
  const [pager, setPager] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  return (
    <main>
      <h1>Company</h1>
      <Announcer />
      <FormField label="Handle" helper="Lower case, no spaces.">
        {(field) => <Input id={field.id} aria-describedby={field.describedBy} defaultValue="ada" />}
      </FormField>
      <FormField label="Site" describedBy="site-scheme">
        {(field) => (
          <Input
            id={field.id}
            aria-describedby={field.describedBy}
            leading={<InputAffix id="site-scheme" text="https://" />}
            defaultValue="example.com"
          />
        )}
      </FormField>
      {/* The refusal, which is the state the ring's colour turns on. */}
      <FormField label="Workspace" helper="The subdomain, not the whole address." error="That workspace does not exist.">
        {(field) => <Input id={field.id} aria-describedby={field.describedBy} error={field.invalid} defaultValue="nope" />}
      </FormField>
      {/* The search box, whose clear control is the second focusable inside a
          field and the reason the ring is keyed on the control. */}
      <Input type="search" aria-label="Search seats" defaultValue="ada" onClear={() => {}} clearLabel="Clear search" />
      {/* Read-only, which draws no control at all: the value and why it cannot
          be edited here. */}
      <ReadOnlyField label="Seat id" value="software-engineer" reason="Derived from the seat's name." mono />
      <FormField label="Mission" helper="A sentence the unit is read by.">
        {(field) => <Textarea id={field.id} aria-describedby={field.describedBy} defaultValue="Ship it." />}
      </FormField>
      <FormField label="Notes" error="Too long.">
        {(field) => <Textarea id={field.id} aria-describedby={field.describedBy} error={field.invalid} defaultValue="…" />}
      </FormField>
      <Select
        ariaLabel="Region"
        value={region}
        onChange={(next) => setRegion(next as string)}
        options={[
          { value: 'eu', label: 'Europe' },
          { value: 'us', label: 'North America' },
        ]}
      />
      <Select
        mode="native"
        ariaLabel="Fallback region"
        error
        value={region}
        onChange={(next) => setRegion(next as string)}
        options={[
          { value: 'eu', label: 'Europe' },
          { value: 'us', label: 'North America' },
        ]}
      />
      {/* Resting, with its list shut. Combobox's own suite audits the open
          one; what nothing audited is the field a form is read at rest. */}
      <Combobox
        aria-label="Token"
        label="Secrets"
        value={completion}
        onValueChange={setCompletion}
        open={false}
        onOpenChange={() => {}}
        options={[{ value: 'SLACK_BOT_TOKEN' }]}
      />
      {/* Named by a FormField, the way a form uses it: TagsInput's own `label`
          names the chip list and the offered listbox, and the box takes its
          name from the label the field draws over it. */}
      <FormField label="Regions" helper="Where seats may run.">
        {(field) => <TagsInput id={field.id} label="Regions" value={tags} onChange={setTags} placeholder="Add a region" />}
      </FormField>
      <ListInput label="Goals" itemName="goal" value={goals} onChange={setGoals} placeholder="Add a goal" />
      <Checkbox label="Pause delivery" description="Stops webhooks without removing the app." checked={confirmed} onCheckedChange={setConfirmed} />
      <Switch label="Deliver webhooks" description="Pauses delivery without removing the app." checked={pager} onCheckedChange={setPager} />
    </main>
  );
}

for (const theme of ['light', 'dark'] as const) {
  test(`every field kind carries no violation in the ${theme} theme`, async () => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      const { container } = render(<EveryFieldKind />);
      // Asserted, not assumed. An audit of a tree that failed to render would
      // pass for the wrong reason, and this one holds eleven controls.
      expect(container.querySelectorAll('input, textarea, select, [role="combobox"]').length).toBeGreaterThan(9);
      expect(document.documentElement.getAttribute('data-theme')).toBe(theme);
      expect(await fieldViolations(container)).toEqual([]);
    } finally {
      document.documentElement.removeAttribute('data-theme');
    }
  });
}
