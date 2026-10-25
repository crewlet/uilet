/**
 * What a value field decides, which is not how any of it is drawn.
 *
 * FormField draws the row and the package's controls draw the box, so nothing
 * here asserts a look: what is checked is which control a kind of value gets,
 * what the field does to a value on its way through, and what it offers from
 * the stored entry names. The url affix is the one to read first, because it
 * is the difference between a value that saves and one refused after the fact.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { useState } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { Modal } from '../Modal/index.js';
import { ValueField } from './ValueField.js';

afterEach(cleanup);

// Typed the way a person says it out loud, saved the way the config demands.
// EVERY KIND TAKES THE FOCUS IT IS ASKED TO. The choice was the one control
// that dropped `autoFocus`, so a form opened at a field that happens to be a
// select (a unit's lead) started on its first control instead.
test("autoFocus focuses the field's control, a choice included", () => {
  for (const kind of ['text', 'multiline', 'choice'] as const) {
    render(
      <>
        {/* eslint-disable-next-line jsx-a11y/no-autofocus -- the case under test */}
        <input aria-label="Before" autoFocus />
        <ValueField
          label="Target"
          kind={kind}
          value="a"
          onChange={() => {}}
          choices={[{ value: 'a', label: 'A' }]}
          // eslint-disable-next-line jsx-a11y/no-autofocus -- the case under test
          autoFocus
        />
      </>,
    );
    expect(document.activeElement, kind).toBe(screen.getByLabelText('Target'));
    cleanup();
  }
});

test('a url field supplies the scheme the config requires', () => {
  const onChange = vi.fn();
  render(<ValueField label="Jira site" kind="url" value="" onChange={onChange} />);

  const input = screen.getByLabelText('Jira site') as HTMLInputElement;
  fireEvent.change(input, { target: { value: 'acme.atlassian.net' } });
  expect(onChange).toHaveBeenCalledWith('https://acme.atlassian.net');
});

// The box shows the address, the affix shows the scheme, and the value is
// both. Showing the whole url in a box already prefixed with https:// would
// read as https://https://acme.atlassian.net.
test('a stored url is shown without the scheme the affix carries', () => {
  render(
    <ValueField
      label="Jira site"
      kind="url"
      value="https://acme.atlassian.net"
      onChange={() => {}}
    />,
  );
  expect((screen.getByLabelText('Jira site') as HTMLInputElement).value).toBe('acme.atlassian.net');
});

// PASTING IS HOW A SITE ADDRESS ARRIVES, out of an address bar, scheme and
// all. Doubling it onto the affix would produce a value nothing accepts.
test('a pasted https url is not doubled onto the affix', () => {
  const onChange = vi.fn();
  render(<ValueField label="Jira site" kind="url" value="" onChange={onChange} />);

  fireEvent.change(screen.getByLabelText('Jira site'), {
    target: { value: 'HTTPS://acme.atlassian.net' },
  });
  expect(onChange).toHaveBeenCalledWith('https://acme.atlassian.net');
});

// THE AFFIX IS A DEFAULT, NOT A CAGE. A Data Center instance reachable only
// over http is a thing the config accepts, and rewriting it to https would
// point the engine at a port nothing answers on.
test('a value carrying http keeps it, and the affix steps aside', () => {
  const onChange = vi.fn();
  const { rerender } = render(
    <ValueField label="Jira site" kind="url" value="" onChange={onChange} />,
  );

  fireEvent.change(screen.getByLabelText('Jira site'), {
    target: { value: 'http://jira.internal' },
  });
  expect(onChange).toHaveBeenCalledWith('http://jira.internal');

  rerender(
    <ValueField label="Jira site" kind="url" value="http://jira.internal" onChange={onChange} />,
  );
  const input = screen.getByLabelText('Jira site') as HTMLInputElement;
  expect(input.value).toBe('http://jira.internal');
  expect(screen.queryByText('https://')).toBeNull();
});

// AND IT STEPS ASIDE FOR A REFERENCE, for the same reason it does for http.
// `internal/config.hasHTTPScheme` admits `envref.Has`, so a `${VAR}` is a
// value the engine accepts in this field whole: the scheme the affix stands
// in for is one the reference carries itself once it resolves. Prepending to
// it wrote `https://${VAR}`, which no resolver can read.
test('a reference typed into a url field is left alone', () => {
  const onChange = vi.fn();
  render(<ValueField label="Public base" kind="url" value="" onChange={onChange} />);

  fireEvent.change(screen.getByLabelText('Public base'), {
    target: { value: '${CREWLET_PUBLIC_BASE}' },
  });
  expect(onChange).toHaveBeenCalledWith('${CREWLET_PUBLIC_BASE}');
});

// THE HALF-TYPED CASE IS THE ONE THAT BITES. A person types the reference one
// character at a time, and `${CREWLET_PUBLIC` is not yet a whole reference,
// so a rule that waited for one would prepend the affix on the first
// keystroke and never take it off again.
test('a reference still being typed into a url field is left alone', () => {
  const onChange = vi.fn();
  render(<ValueField label="Public base" kind="url" value="" onChange={onChange} />);

  for (const typed of ['$', '${', '${CREWLET_PUBLIC']) {
    fireEvent.change(screen.getByLabelText('Public base'), { target: { value: typed } });
    expect(onChange).toHaveBeenLastCalledWith(typed);
  }
});

// A STORED REFERENCE IS SHOWN AS ITSELF, with no affix beside it. Rendering
// one behind `https://` told the operator their value was
// `https://${CREWLET_PUBLIC_BASE}`, and the first keystroke made that true.
test('a stored reference is shown whole, with no affix', () => {
  const onChange = vi.fn();
  render(
    <ValueField
      label="Public base"
      kind="url"
      value='${CREWLET_PUBLIC_BASE}'
      onChange={onChange}
    />,
  );
  const input = screen.getByLabelText('Public base') as HTMLInputElement;
  expect(input.value).toBe('${CREWLET_PUBLIC_BASE}');
  expect(screen.queryByText('https://')).toBeNull();

  fireEvent.change(input, { target: { value: '${CREWLET_PUBLIC_BASE_2}' } });
  expect(onChange).toHaveBeenCalledWith('${CREWLET_PUBLIC_BASE_2}');
});

// A reference BEHIND a scheme is the case that always worked, and it has to
// keep working: the affix is carrying the scheme there, so it belongs.
test('a scheme followed by a reference keeps the affix', () => {
  const onChange = vi.fn();
  render(
    <ValueField label="Jira site" kind="url" value='https://${JIRA_HOST}' onChange={onChange} />,
  );
  const input = screen.getByLabelText('Jira site') as HTMLInputElement;
  expect(input.value).toBe('${JIRA_HOST}');

  fireEvent.change(input, { target: { value: '${JIRA_HOST}/x' } });
  expect(onChange).toHaveBeenCalledWith('https://${JIRA_HOST}/x');
});

// Only url fields. A token or a handle with https:// in front of it is
// nonsense, and the affix rewrites what it is attached to.
test('no other kind of field wears a scheme', () => {
  const onChange = vi.fn();
  render(<ValueField label="API token" kind="text" value="" onChange={onChange} />);

  fireEvent.change(screen.getByLabelText('API token'), { target: { value: 'abc' } });
  expect(onChange).toHaveBeenCalledWith('abc');
});

// A REFERENCE IS NOT A CREDENTIAL, so masking it defeats the point of showing
// it. The field held `${JIRA_TOKEN}` and rendered sixteen dots, which is the
// same thing an operator saw before the engine sent the reference at all.
test('a secret holding a reference is readable', () => {
  render(<ValueField label="API token" kind="secret" value='${JIRA_TOKEN}' onChange={() => {}} />);
  const input = screen.getByLabelText('API token') as HTMLInputElement;
  expect(input.type).toBe('text');
  expect(input.value).toBe('${JIRA_TOKEN}');
});

// AND EVERYTHING ELSE IN THAT FIELD IS STILL A CREDENTIAL. The type is what
// keeps it out of an autofill store and out of a screenshot.
test('a secret holding anything else stays masked', () => {
  const cases = ['ATATT-real-credential', '', '${HOST}/x', '${}', 'prefix ${NAME}'];
  for (const value of cases) {
    cleanup();
    render(<ValueField label="API token" kind="secret" value={value} onChange={() => {}} />);
    expect((screen.getByLabelText('API token') as HTMLInputElement).type).toBe('password');
  }
});

// A SINGLE TOKEN TAKES NO WHITESPACE, including from a paste. A space around
// an address is invisible in the box and fatal at the vendor.
test('a single-token field drops whitespace as it is typed or pasted', () => {
  for (const kind of ['url', 'id', 'email'] as const) {
    cleanup();
    const onChange = vi.fn();
    render(<ValueField label="Value" kind={kind} value="" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Value'), {
      target: { value: '  acme.example.com  ' },
    });
    const written = onChange.mock.calls[0]?.[0] as string;
    expect(written.endsWith('acme.example.com')).toBe(true);
    expect(/\s/.test(written)).toBe(false);
  }
});

// FREE TEXT KEEPS ITS SPACES, which is why the rule is per kind: a Datadog
// role is 'Datadog Read Only Role', and stripping there would store a name
// the vendor has no record of.
test('free text keeps the spaces it is given', () => {
  const onChange = vi.fn();
  render(<ValueField label="Role" kind="text" value="" onChange={onChange} />);
  fireEvent.change(screen.getByLabelText('Role'), {
    target: { value: 'Datadog Read Only Role' },
  });
  expect(onChange).toHaveBeenCalledWith('Datadog Read Only Role');
});

// THE BROWSER MUST NOT GET AN OPINION ABOUT A REFERENCE.
//
// Any field here may hold a `${VAR}` naming a sealed entry rather than a
// value. With type="email" the browser refused the form for a value with no
// '@' in it, so the dialog could not be saved at all over a reference the
// engine resolves correctly. The shape is checked where the value is used.
test('an email field never asserts a shape the browser enforces', () => {
  render(
    <ValueField
      label="Account email"
      kind="email"
      value='${ATLASSIAN_USER_ACCOUNT_EMAIL}'
      onChange={() => {}}
    />,
  );
  const input = screen.getByLabelText('Account email') as HTMLInputElement;
  expect(input.type).toBe('text');
  expect(input.checkValidity()).toBe(true);
});

/**
 * Completing a `${NAME}` from the company's sealed entries.
 *
 * A field takes either a value or a reference to one, and the reference has
 * to be exact: a name off by a character resolves to nothing, which reads as
 * configured on every surface while the route it feeds refuses every
 * delivery. Nothing on the form knew the names, so getting one right meant
 * opening the Secrets screen in another tab and copying it across.
 */
const held = ['GITHUB_TOKEN', 'GH_WEBHOOK_SECRET', 'DATADOG_APP_KEY'];

/** A controlled field, because the completion writes through onChange. */
function Editable({ references = held }: { references?: string[] }) {
  const [value, setValue] = useState('');
  return (
    <ValueField
      label="Webhook secret"
      kind="id"
      value={value}
      onChange={setValue}
      references={references}
    />
  );
}

// TYPING `$` OPENS THE LIST, and typing more narrows it.
test("typing a dollar offers the company's sealed entries", () => {
  render(<Editable />);
  const input = screen.getByLabelText('Webhook secret') as HTMLInputElement;

  // NOTHING BEFORE THE `$`. A list over an empty box would be a popup
  // nobody asked for on every field of every form.
  expect(screen.queryByRole('listbox')).toBeNull();

  fireEvent.change(input, { target: { value: '$' } });
  fireEvent.keyUp(input, { key: '$' });
  expect(screen.getAllByRole('option').length).toBe(held.length);

  // NARROWED, and ordered closest first: GH_WEBHOOK_SECRET starts with the
  // query and GITHUB_TOKEN merely contains its letters.
  fireEvent.change(input, { target: { value: '$GH' } });
  fireEvent.keyUp(input, { key: 'H' });
  const shown = screen.getAllByRole('option').map((o) => o.textContent);
  expect(shown).toEqual(['GH_WEBHOOK_SECRET', 'GITHUB_TOKEN']);
});

// ARROWS MOVE, ENTER TAKES, and the value becomes a whole reference.
test('a name is chosen with the arrows and Enter', () => {
  render(<Editable />);
  const input = screen.getByLabelText('Webhook secret') as HTMLInputElement;
  fireEvent.change(input, { target: { value: '$GH' } });
  fireEvent.keyUp(input, { key: 'H' });

  fireEvent.keyDown(input, { key: 'ArrowDown' });
  fireEvent.keyDown(input, { key: 'Enter' });

  // THE SECOND NAME, because the first was highlighted and the arrow moved
  // past it, and written whole: the engine resolves a reference only when it
  // is complete.
  expect(input.value).toBe('${GITHUB_TOKEN}');
  expect(screen.queryByRole('listbox')).toBeNull();
});

// THE HIGHLIGHTED NAME IS BROUGHT INTO VIEW. A company with more secrets than
// the list is tall left the arrows moving a highlight nobody could see: the
// list stayed at the top and the reader arrowed into an empty box. It scrolls
// the LIST and nothing else, by scrollTop, because scrollIntoView scrolls
// every scrollable ancestor it finds and does not exist in jsdom at all.
test('arrowing past the bottom of the list scrolls the highlighted name into view', () => {
  render(<Editable references={['A_ONE', 'A_TWO', 'A_THREE', 'A_FOUR']} />);
  const input = screen.getByLabelText('Webhook secret') as HTMLInputElement;
  fireEvent.change(input, { target: { value: '$A' } });
  fireEvent.keyUp(input, { key: 'A' });

  // jsdom lays nothing out, so the geometry is declared: a box 40px tall
  // holding four 20px rows, scrolled to the top.
  const list = screen.getByRole('listbox');
  let scrolled = 0;
  Object.defineProperty(list, 'scrollTop', {
    configurable: true,
    get: () => scrolled,
    set: (next: number) => {
      scrolled = Math.max(0, next);
    },
  });
  list.getBoundingClientRect = () => ({ top: 0, bottom: 40 }) as DOMRect;
  for (const [i, row] of screen.getAllByRole('option').entries()) {
    row.getBoundingClientRect = () => ({ top: i * 20, bottom: i * 20 + 20 }) as DOMRect;
  }

  // Down to the third row, whose bottom (60) is past the box's (40).
  fireEvent.keyDown(input, { key: 'ArrowDown' });
  fireEvent.keyDown(input, { key: 'ArrowDown' });
  expect(scrolled).toBe(20);
});

// TAB TAKES THE HIGHLIGHTED NAME, which is what it means in every other
// completion list, rather than leaving the field with the list open.
test('Tab takes the highlighted name', () => {
  render(<Editable />);
  const input = screen.getByLabelText('Webhook secret') as HTMLInputElement;
  fireEvent.change(input, { target: { value: '$DATA' } });
  fireEvent.keyUp(input, { key: 'A' });

  fireEvent.keyDown(input, { key: 'Tab' });
  expect(input.value).toBe('${DATADOG_APP_KEY}');
});

// ESCAPE CLOSES THE LIST AND KEEPS WHAT WAS TYPED.
//
// The field lives in a dialog that also closes on Escape, so the key is
// stopped here: one press means 'not this name', and losing a half-filled
// form to it would be the worse of the two readings.
test('Escape closes the list without clearing the field', () => {
  render(<Editable />);
  const input = screen.getByLabelText('Webhook secret') as HTMLInputElement;
  fireEvent.change(input, { target: { value: '$GH' } });
  fireEvent.keyUp(input, { key: 'H' });
  expect(screen.getByRole('listbox')).toBeTruthy();

  fireEvent.keyDown(input, { key: 'Escape' });
  expect(screen.queryByRole('listbox')).toBeNull();
  expect(input.value).toBe('$GH');
});

// A PRESS ON THE VEIL CLOSES THE LIST, NOT THE DIALOG.
//
// The list is a popup on the layer stack, so the press outside it that an
// operator makes to dismiss it cannot also throw away the form it sits in.
test("a press on the dialog's veil with the list open closes only the list", () => {
  const closed = vi.fn();
  render(
    <Modal open stackBody title="Connect GitHub" onClose={closed}>
      <Editable />
    </Modal>,
  );
  const input = screen.getByLabelText('Webhook secret') as HTMLInputElement;
  fireEvent.change(input, { target: { value: '$GH' } });
  fireEvent.keyUp(input, { key: 'H' });
  expect(screen.getByRole('listbox')).toBeTruthy();

  const veil = screen.getByRole('dialog').parentElement!;
  fireEvent.pointerDown(veil);
  fireEvent.click(veil);
  expect(screen.queryByRole('listbox')).toBeNull();
  expect(closed).not.toHaveBeenCalled();
  expect(input.value).toBe('$GH');
});

// THE LIST IS ASKED FOR WHEN IT IS ABOUT TO BE SHOWN.
//
// There is no push for the secret store, so a list read when a form opened
// goes stale the moment somebody adds an entry in another tab, which is
// exactly what a person does on finding the name they wanted is not there.
// Asked on the way in, the list is current at the one moment that matters.
test('the caller is asked to refresh when the list opens', () => {
  const asked = vi.fn();
  function Asking() {
    const [value, setValue] = useState('');
    return (
      <ValueField
        label="Webhook secret"
        kind="id"
        value={value}
        onChange={setValue}
        references={held}
        onReferencesNeeded={asked}
      />
    );
  }
  render(<Asking />);
  const input = screen.getByLabelText('Webhook secret') as HTMLInputElement;

  // NOT BEFORE. A field nobody is completing in costs nothing.
  fireEvent.change(input, { target: { value: 'acme' } });
  fireEvent.keyUp(input, { key: 'e' });
  expect(asked).not.toHaveBeenCalled();

  fireEvent.change(input, { target: { value: 'acme $' } });
  fireEvent.keyUp(input, { key: '$' });
  expect(asked).toHaveBeenCalledTimes(1);

  // ON THE WAY IN ONLY: typing further into an open list is not a second
  // opening, and asking per keystroke would spend a request on each.
  fireEvent.change(input, { target: { value: 'acme $GH' } });
  fireEvent.keyUp(input, { key: 'H' });
  expect(asked).toHaveBeenCalledTimes(1);
});

// A COMPANY THAT HOLDS NOTHING GETS NO LIST, and neither does a query that
// matches nothing: an empty popup is a control that says a company has
// entries when it has none.
test('no list where there is nothing to offer', () => {
  const { rerender } = render(<Editable references={[]} />);
  const input = screen.getByLabelText('Webhook secret') as HTMLInputElement;
  fireEvent.change(input, { target: { value: '$' } });
  fireEvent.keyUp(input, { key: '$' });
  expect(screen.queryByRole('listbox')).toBeNull();

  rerender(<Editable />);
  const live = screen.getByLabelText('Webhook secret') as HTMLInputElement;
  fireEvent.change(live, { target: { value: '$ZZZ' } });
  fireEvent.keyUp(live, { key: 'Z' });
  expect(screen.queryByRole('listbox')).toBeNull();
});

/**
 * A multiline field is prose: a goal, a backstory, a mission.
 */

// THE SAME FIELD, A DIFFERENT CONTROL. Label, help and error bind exactly as
// they do for a one-line field, so a refusal beside a goal is announced the
// same way as a refusal beside a name.
test('a multiline field is a labelled textarea bound to its help and error', () => {
  render(
    <ValueField
      label="Goal"
      kind="multiline"
      value=""
      onChange={() => {}}
      help="What this seat is for."
      error="roles[0].goal: must not be empty"
      rows={5}
    />,
  );
  const box = screen.getByLabelText('Goal') as HTMLTextAreaElement;
  expect(box.tagName).toBe('TEXTAREA');
  expect(box.rows).toBe(5);
  expect(box.getAttribute('aria-invalid')).toBe('true');
  const described = (box.getAttribute('aria-describedby') ?? '').split(' ');
  expect(described).toHaveLength(2);
  for (const id of described) expect(document.getElementById(id)).not.toBeNull();
});

// PROSE KEEPS WHAT IT IS GIVEN. The single-token kinds strip whitespace; a
// backstory with a paragraph break must not lose it, and nor may its spaces.
test('a multiline field keeps newlines and spaces, and offers no reference completion', () => {
  function Prose() {
    const [value, setValue] = useState('');
    return (
      <ValueField
        label="Backstory"
        kind="multiline"
        value={value}
        onChange={setValue}
        references={held}
      />
    );
  }
  render(<Prose />);
  const box = screen.getByLabelText('Backstory') as HTMLTextAreaElement;
  const text = 'Joined in the first week.\n\n  Owns the  release train.  $';
  fireEvent.change(box, { target: { value: text } });
  fireEvent.keyUp(box, { key: '$' });
  expect(box.value).toBe(text);
  expect(screen.queryByRole('listbox')).toBeNull();
  expect(box.getAttribute('spellcheck')).toBe('true');
});

test('a choice whose empty value is a real answer is shown by its own label, with no placeholder', () => {
  function Lead() {
    const [value, setValue] = useState('');
    return (
      <ValueField
        label="Lead"
        kind="choice"
        value={value}
        onChange={setValue}
        choices={[
          { value: '', label: 'No lead (inherits Chief Executive)' },
          { value: 'Engineering Manager', label: 'Engineering Manager' },
        ]}
      />
    );
  }
  render(<Lead />);
  const trigger = screen.getByLabelText('Lead');
  // NOT 'Choose one' over an answer that exists: empty is a real answer on
  // this list, so the option's own label is what the trigger reads.
  expect(trigger.textContent).toBe('No lead (inherits Chief Executive)');

  fireEvent.click(trigger);
  expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
    'No lead (inherits Chief Executive)',
    'Engineering Manager',
  ]);
  expect(
    screen.getAllByRole('option').map((option) => option.getAttribute('aria-selected')),
  ).toEqual(['true', 'false']);
});

// EB01. A CHOICE'S HINT REACHES THE READER, twice over: under each option
// while they are choosing, and on the help line once they have. Every vendor's
// setup declares one per choice and the field accepted them and drew none.
test("a choice's hint is drawn under its option and joins the help line", () => {
  render(
    <ValueField
      label="Coverage"
      kind="choice"
      value="all"
      onChange={() => {}}
      help="Which repositories the app is installed on."
      choices={[
        { value: 'all', label: 'Every repository', hint: 'Including ones created later.' },
        { value: 'selected', label: 'Only the ones I pick', hint: 'You choose them at GitHub.' },
      ]}
    />,
  );
  const trigger = screen.getByLabelText('Coverage');
  const described = document.getElementById(trigger.getAttribute('aria-describedby') ?? '');
  expect(described?.textContent).toBe(
    'Which repositories the app is installed on. Including ones created later.',
  );

  fireEvent.click(trigger);
  expect(screen.getByText('You choose them at GitHub.')).toBeDefined();
});

// A STORED ANSWER THIS LIST DOES NOT OFFER keeps its own row. A form may
// narrow its choices, and a company already holding the dropped one must not
// open the dialog to find a different answer selected, then save it.
test('a stored answer the list no longer offers is kept and shown as itself', () => {
  render(
    <ValueField
      label="Coverage"
      kind="choice"
      value="retired_mode"
      onChange={() => {}}
      choices={[{ value: 'all', label: 'Every repository' }]}
    />,
  );
  const trigger = screen.getByLabelText('Coverage');
  expect(trigger.textContent).toBe('retired_mode');
  fireEvent.click(trigger);
  expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
    'retired_mode',
    'Every repository',
  ]);
});

/**
 * What the control is tied to: the label, the affix sentence, the help line
 * and the error line are four things a reader has to hear, in reading order.
 */
test('the affix, the help and the error are all tied to the control, in reading order', () => {
  render(
    <ValueField
      label="Jira site"
      kind="url"
      value=""
      onChange={() => {}}
      help="The workspace subdomain, not the whole address."
      error="integrations.jira: required value missing"
    />,
  );
  const input = screen.getByLabelText('Jira site');
  const said = (input.getAttribute('aria-describedby') ?? '').split(' ').filter(Boolean);
  const text = said.map((id) => document.getElementById(id)?.textContent ?? '');
  expect(text[0]).toContain('https://');
  expect(text[1]).toContain('The workspace subdomain');
  expect(text[2]).toContain('required value missing');
  expect(input.getAttribute('aria-invalid')).toBe('true');
  // AND THE REFUSAL DOES NOT TAKE THE HELP LINE AWAY.
  expect(screen.getByText(/The workspace subdomain/)).toBeTruthy();
  expect(screen.getByRole('alert').textContent).toContain('required value missing');
});

// A refusal is whatever the caller draws: a list of problems is a node, not a string.
test('an error may be a node the caller draws', () => {
  render(
    <ValueField
      label="Site"
      value=""
      onChange={() => {}}
      error={
        <ul>
          <li>first</li>
          <li>second</li>
        </ul>
      }
    />,
  );
  expect(screen.getByRole('alert').querySelectorAll('li')).toHaveLength(2);
});

// REQUIRED IS THE UNMARKED DEFAULT, and the exception is marked.
test('only requiredness that is news is said out loud', () => {
  const { rerender } = render(<ValueField label="Organization token" value="" onChange={() => {}} required />);
  const label = () => screen.getByText(/Organization token/);
  const input = () => screen.getByLabelText(/Organization token/);
  expect(label().textContent).toBe('Organization token');
  expect(input().getAttribute('aria-required')).toBe('true');

  rerender(<ValueField label="Organization token" value="" onChange={() => {}} required markRequired />);
  expect(label().textContent).toContain('(required)');

  rerender(<ValueField label="Organization token" value="" onChange={() => {}} required={false} />);
  expect(label().textContent).toContain('(optional)');
  expect(input().getAttribute('aria-required')).toBeNull();
});

// A PRODUCT WITH ITS OWN REFERENCE GRAMMAR decides what reads as a name.
test('a reference predicate decides what a secret field unmasks', () => {
  const { rerender } = render(
    <ValueField label="API token" kind="secret" value="@vault/jira" onChange={() => {}} />,
  );
  expect((screen.getByLabelText('API token') as HTMLInputElement).type).toBe('password');

  rerender(
    <ValueField
      label="API token"
      kind="secret"
      value="@vault/jira"
      onChange={() => {}}
      isReference={(value) => value.startsWith('@vault/')}
    />,
  );
  expect((screen.getByLabelText('API token') as HTMLInputElement).type).toBe('text');
});

test('a mark is drawn before the label, and the label still names the control', () => {
  render(
    <ValueField label="Workspace" mark={<svg data-testid="mark" aria-hidden="true" />} value="" onChange={() => {}} />,
  );
  expect(screen.getByLabelText('Workspace').tagName).toBe('INPUT');
  expect(screen.getByTestId('mark')).toBeTruthy();
});

test('the words the field draws itself can be replaced', () => {
  function Named() {
    const [value, setValue] = useState('');
    return (
      <ValueField
        label="Token"
        value={value}
        onChange={setValue}
        references={held}
        labels={{ references: 'Stored entries' }}
      />
    );
  }
  render(<Named />);
  const input = screen.getByLabelText('Token');
  fireEvent.change(input, { target: { value: '$' } });
  fireEvent.keyUp(input, { key: '$' });
  expect(screen.getByRole('listbox', { name: 'Stored entries' })).toBeTruthy();
});

test('every kind passes an accessibility audit', async () => {
  const { container } = render(
    <>
      <ValueField label="Name" value="Ada" onChange={() => {}} help="As it appears on the invoice." />
      <ValueField label="Token" kind="secret" value="" onChange={() => {}} error="Required." />
      <ValueField label="Site" kind="url" value="https://acme.example" onChange={() => {}} />
      <ValueField label="Goal" kind="multiline" value="" onChange={() => {}} />
      <ValueField
        label="Mode"
        kind="choice"
        value="a"
        onChange={() => {}}
        choices={[{ value: 'a', label: 'A', hint: 'The first.' }]}
      />
    </>,
  );
  const results = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    // Contrast needs layout and resolved custom properties, which jsdom lacks.
    rules: { 'color-contrast': { enabled: false } },
  });
  expect(results.violations.map((v) => [v.id, v.nodes.map((n) => n.html)])).toEqual([]);
});

// A MASKED FIELD IS A PASSWORD FIELD AT REST. HTML allows no role on one, so
// it is a combobox only while it has a list of names to offer.
test('a masked field is a combobox only while it offers names', () => {
  function Secret() {
    const [value, setValue] = useState('');
    return <ValueField label="Token" kind="secret" value={value} onChange={setValue} references={held} />;
  }
  render(<Secret />);
  const input = screen.getByLabelText('Token') as HTMLInputElement;
  expect(input.type).toBe('password');
  expect(input.getAttribute('role')).toBeNull();
  expect(input.getAttribute('aria-expanded')).toBeNull();

  fireEvent.change(input, { target: { value: '$' } });
  fireEvent.keyUp(input, { key: '$' });
  expect(input.getAttribute('role')).toBe('combobox');
  expect(input.getAttribute('aria-expanded')).toBe('true');

  fireEvent.keyDown(input, { key: 'Enter' });
  expect(input.value).toBe('${GITHUB_TOKEN}');
  // A whole reference reads as a name, so the box is a text combobox again.
  expect(input.type).toBe('text');
  expect(input.getAttribute('role')).toBe('combobox');
});
