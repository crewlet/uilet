/**
 * A field that offers completions: what it says it is, and what Escape does.
 *
 * The Escape case is the one this was built for. The list used to be part of
 * the field's own keydown handler and Escape reached the drawer around it, so
 * dismissing a completion nobody wanted closed the editor with it.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { useState } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { Modal } from '../Modal/index.js';
import { Combobox } from './Combobox.js';

afterEach(cleanup);

const SECRETS = ['SLACK_BOT_TOKEN', 'SLACK_SIGNING_SECRET', 'JIRA_HOST'];

function Field({ commitOn }: { commitOn?: 'mousedown' | 'click' }) {
  const [value, setValue] = useState('');
  const [open, setOpen] = useState(false);
  const offered = SECRETS.filter((name) => name.toLowerCase().includes(value.toLowerCase()));
  return (
    <>
      <Combobox
        label="Secrets"
        aria-label="Token"
        value={value}
        onValueChange={(next) => {
          setValue(next);
          setOpen(true);
        }}
        options={offered.map((name) => ({ value: name }))}
        open={open}
        onOpenChange={setOpen}
        commitOn={commitOn}
        tabCommits
        mono
        emptyMessage="Nothing matches"
      />
      <pre data-testid="value">{value}</pre>
    </>
  );
}

const box = () => screen.getByRole('combobox', { name: 'Token' });
const held = () => screen.getByTestId('value').textContent;

test('the field says it is a combobox, and points at the row the arrows are on', () => {
  render(<Field />);
  expect(box().getAttribute('aria-expanded')).toBe('false');
  fireEvent.keyDown(box(), { key: 'ArrowDown' });
  const list = screen.getByRole('listbox', { name: 'Secrets' });
  expect(box().getAttribute('aria-controls')).toBe(list.id);
  expect(box().getAttribute('aria-expanded')).toBe('true');
  expect(box().getAttribute('aria-autocomplete')).toBe('list');

  const active = () => document.getElementById(box().getAttribute('aria-activedescendant') ?? '');
  expect(active()?.textContent).toBe('SLACK_BOT_TOKEN');
  fireEvent.keyDown(box(), { key: 'ArrowDown' });
  expect(active()?.textContent).toBe('SLACK_SIGNING_SECRET');
});

test('Enter takes the highlighted name without submitting the form around it', () => {
  render(<Field />);
  fireEvent.keyDown(box(), { key: 'ArrowDown' });
  expect(fireEvent.keyDown(box(), { key: 'Enter' })).toBe(false);
  expect(held()).toBe('SLACK_BOT_TOKEN');
  expect(screen.queryByRole('listbox')).toBeNull();
});

test('Tab takes the highlighted name where the list is a completion', () => {
  render(<Field />);
  fireEvent.keyDown(box(), { key: 'ArrowDown' });
  fireEvent.keyDown(box(), { key: 'ArrowDown' });
  fireEvent.keyDown(box(), { key: 'Tab' });
  expect(held()).toBe('SLACK_SIGNING_SECRET');
});

test('a press takes a row on mousedown, before the field can blur under it', () => {
  render(<Field />);
  fireEvent.keyDown(box(), { key: 'ArrowDown' });
  fireEvent.mouseDown(screen.getByRole('option', { name: 'JIRA_HOST' }));
  expect(held()).toBe('JIRA_HOST');
});

test('commitOn click waits for the click and still keeps the field focused', () => {
  render(<Field commitOn="click" />);
  fireEvent.keyDown(box(), { key: 'ArrowDown' });
  const row = screen.getByRole('option', { name: 'JIRA_HOST' });
  // The press is swallowed, so the caret in the field does not move.
  expect(fireEvent.mouseDown(row)).toBe(false);
  expect(held()).toBe('');
  fireEvent.click(row);
  expect(held()).toBe('JIRA_HOST');
});

test('Escape closes the list and leaves the dialog around it open', () => {
  const closed = vi.fn();
  render(
    <Modal open title="Connect Slack" onClose={closed}>
      <Field />
    </Modal>,
  );
  box().focus();
  fireEvent.keyDown(box(), { key: 'ArrowDown' });
  expect(screen.getByRole('listbox')).toBeTruthy();

  fireEvent.keyDown(box(), { key: 'Escape' });
  expect(screen.queryByRole('listbox')).toBeNull();
  expect(closed).not.toHaveBeenCalled();
  // And a second Escape is the dialog's.
  fireEvent.keyDown(box(), { key: 'Escape' });
  expect(closed).toHaveBeenCalledTimes(1);
});

test('a list showing nothing says so, offers no listbox, and Escape is still its own', () => {
  const closed = vi.fn();
  render(
    <Modal open title="Connect Slack" onClose={closed}>
      <Field />
    </Modal>,
  );
  fireEvent.change(box(), { target: { value: 'zzz' } });
  expect(screen.getByText('Nothing matches')).toBeTruthy();
  expect(screen.queryByRole('listbox')).toBeNull();
  expect(box().getAttribute('aria-expanded')).toBe('false');

  fireEvent.keyDown(box(), { key: 'Escape' });
  expect(screen.queryByText('Nothing matches')).toBeNull();
  expect(closed).not.toHaveBeenCalled();
});

test('nothing is taken while an input method is composing a word', () => {
  render(<Field />);
  fireEvent.keyDown(box(), { key: 'ArrowDown' });
  expect(fireEvent.keyDown(box(), { key: 'Enter', isComposing: true })).toBe(true);
  expect(held()).toBe('');
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

test('an open completion list carries no violation', async () => {
  render(
    <main>
      <h1>Connect Slack</h1>
      <Field />
    </main>,
  );
  fireEvent.keyDown(box(), { key: 'ArrowDown' });
  expect(screen.getByRole('listbox', { name: 'Secrets' })).toBeTruthy();
  expect(await auditPage()).toEqual([]);
});
