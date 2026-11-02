/**
 * A person or an agent as one row of a list: a button that toggles (pressed,
 * with a plus that turns into a check), a plain button that opens something,
 * or an option in a listbox a field owns.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test } from 'vitest';
import { Switch } from '../Switch/index.js';
import { PersonRow } from './index.js';

afterEach(cleanup);

test('a toggling row is a pressed button whose mark turns from a plus into a check', () => {
  let pressed = 0;
  const { rerender } = render(
    <PersonRow avatar={<span />} name="Ada" detail="Reviewing PR 41" mark="toggle" selected={false} onSelect={() => (pressed += 1)} />,
  );
  const row = screen.getByRole('button', { name: /Ada/ });
  expect(row.getAttribute('aria-pressed')).toBe('false');
  expect(row.getAttribute('type')).toBe('button');
  const plus = row.querySelector('.crewlet-person-row__mark svg')?.outerHTML;
  fireEvent.click(row);
  expect(pressed).toBe(1);
  rerender(<PersonRow avatar={<span />} name="Ada" detail="Reviewing PR 41" mark="toggle" selected onSelect={() => (pressed += 1)} />);
  expect(row.getAttribute('aria-pressed')).toBe('true');
  expect(row.classList.contains('is-selected')).toBe(true);
  // The state is not colour alone: the mark itself changes.
  expect(row.querySelector('.crewlet-person-row__mark svg')?.outerHTML).not.toBe(plus);
  expect(row.querySelector('.crewlet-person-row__mark')?.getAttribute('aria-hidden')).toBe('true');
});

test('a row that opens something is a plain button with no pressed state and no mark', () => {
  render(<PersonRow avatar={<span />} name="Product Manager" tag={<span>Agent</span>} meta="Working" />);
  const row = screen.getByRole('button', { name: /Product Manager/ });
  expect(row.hasAttribute('aria-pressed')).toBe(false);
  expect(row.querySelector('.crewlet-person-row__mark')).toBeNull();
  expect(row.textContent).toBe('Product ManagerAgentWorking');
});

test('a click the host prevents does not select', () => {
  let pressed = 0;
  render(<PersonRow avatar={<span />} name="Ada" onClick={(event) => event.preventDefault()} onSelect={() => (pressed += 1)} />);
  fireEvent.click(screen.getByRole('button', { name: 'Ada' }));
  expect(pressed).toBe(0);
});

test('as an option it is never a tab stop, says whether it is selected, and draws the arrows\' row', () => {
  render(
    <ul role="listbox" aria-label="People" aria-multiselectable="true">
      <PersonRow as="option" id="p-0" avatar={<span />} name="Ada" selected highlighted />
      <PersonRow as="option" id="p-1" avatar={<span />} name="Miles" disabled />
    </ul>,
  );
  const [ada, miles] = screen.getAllByRole('option');
  expect(ada!.getAttribute('aria-selected')).toBe('true');
  expect(ada!.classList.contains('is-highlighted')).toBe(true);
  expect(ada!.hasAttribute('tabindex')).toBe(false);
  expect(miles!.getAttribute('aria-selected')).toBe('false');
  expect(miles!.getAttribute('aria-disabled')).toBe('true');
});

test('a row\'s own control stands beside its button, never inside it, and keeps its own name', () => {
  let opened = 0;
  let following = false;
  render(
    <ul aria-label="Members">
      <li>
        <PersonRow
          avatar={<span />}
          name="Designer"
          detail="Answers when named"
          onSelect={() => (opened += 1)}
          action={<Switch label="Designer gets every message" labelHidden checked={following} onCheckedChange={(on) => (following = on)} />}
        />
      </li>
    </ul>,
  );
  const row = screen.getByRole('button', { name: /Designer/ });
  const toggle = screen.getByRole('switch', { name: 'Designer gets every message' });
  // A control inside a button is one Tab cannot reach and a reader hears as
  // part of the button's name.
  expect(row.contains(toggle)).toBe(false);
  expect(row.textContent).not.toContain('gets every message');
  fireEvent.click(toggle);
  expect(following).toBe(true);
  expect(opened).toBe(0);
  fireEvent.click(row);
  expect(opened).toBe(1);
});

test('a list of rows carries no axe violation', async () => {
  const { container } = render(
    <main>
      <ul aria-label="Suggestions">
        <li>
          <PersonRow avatar={<span />} name="Ada" detail="Reviewing PR 41" mark="toggle" selected={false} />
        </li>
        <li>
          <PersonRow avatar={<span />} name="Miles" detail="Designer" mark="toggle" selected />
        </li>
        <li>
          <PersonRow avatar={<span />} name="QA" detail="Gets every message" action={<Switch label="QA gets every message" labelHidden checked onChange={() => {}} />} />
        </li>
      </ul>
      <ul role="listbox" aria-label="People">
        <PersonRow as="option" id="o-0" avatar={<span />} name="Ada" density="compact" selected highlighted />
      </ul>
    </main>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations.map((violation) => violation.id)).toEqual([]);
});
