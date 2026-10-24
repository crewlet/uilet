/**
 * A field that offers completions: what it says it is, and what Escape does.
 *
 * The Escape case is the one this was built for. The list used to be part of
 * the field's own keydown handler and Escape reached the drawer around it, so
 * dismissing a completion nobody wanted closed the editor with it.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { useState } from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
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

describe('inline', () => {
  const FOLDERS = [
    { value: 'top', label: 'Top level' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'q4', label: 'Marketing › Q4 review', hint: 'Current' },
    { value: 'press', label: 'Marketing › Q4 review › Press kit' },
    { value: 'more', label: 'Keep typing to narrow them', disabled: true },
    { value: 'board', label: 'Board' },
  ];

  function Picker({ chosen: initial, onCommit }: { chosen?: string; onCommit?: (value: string) => void }) {
    const [value, setValue] = useState('');
    const [chosen, setChosen] = useState<string | undefined>(initial);
    const offered = FOLDERS.filter((folder) => folder.label.toLowerCase().includes(value.toLowerCase()));
    return (
      <Combobox
        inline
        rows={5}
        label="Folders"
        aria-label="Find a folder"
        value={value}
        onValueChange={setValue}
        options={offered}
        chosen={chosen}
        onCommit={(option) => {
          setChosen(option.value);
          onCommit?.(option.value);
        }}
        emptyMessage="No folder matches"
      />
    );
  }

  const field = () => screen.getByRole('combobox', { name: 'Find a folder' });
  const active = () => document.getElementById(field().getAttribute('aria-activedescendant') ?? '')?.textContent ?? '';

  test('the list is on screen without focus, an inline listbox the field controls', () => {
    render(<Picker />);
    const list = screen.getByRole('listbox', { name: 'Folders' });
    expect(field().getAttribute('aria-controls')).toBe(list.id);
    expect(field().getAttribute('aria-expanded')).toBe('true');
    expect(field().getAttribute('aria-autocomplete')).toBe('list');
    expect(screen.getAllByRole('option')).toHaveLength(FOLDERS.length);
    // In the flow beside the field, not a panel over the page or a portal.
    expect(list.closest('.crewlet-combobox--inline')?.contains(field())).toBe(true);
    expect(document.querySelector('.crewlet-combobox__panel')).toBeNull();
  });

  test('losing focus closes nothing, so the surface under the pointer stays where it was', () => {
    render(<Picker />);
    field().focus();
    fireEvent.blur(field());
    expect(screen.getByRole('listbox', { name: 'Folders' })).toBeDefined();
  });

  test('the field filters, and the highlight lands on the first match each time', () => {
    render(<Picker />);
    fireEvent.change(field(), { target: { value: 'q4' } });
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Marketing › Q4 reviewCurrent',
      'Marketing › Q4 review › Press kit',
    ]);
    expect(active()).toBe('Marketing › Q4 reviewCurrent');
  });

  test('the arrows step over a disabled row, and Enter takes the highlighted one', () => {
    const onCommit = vi.fn();
    render(<Picker onCommit={onCommit} />);
    expect(active()).toBe('Top level');
    for (let i = 0; i < 4; i += 1) fireEvent.keyDown(field(), { key: 'ArrowDown' });
    expect(active()).toBe('Board');
    fireEvent.keyDown(field(), { key: 'ArrowUp' });
    expect(active()).toBe('Marketing › Q4 review › Press kit');
    const enter = fireEvent.keyDown(field(), { key: 'Enter' });
    expect(enter).toBe(false);
    expect(onCommit).toHaveBeenCalledWith('press');
  });

  test('Home and End reach the ends while the field is empty, and are the caret\'s once it holds text', () => {
    render(<Picker />);
    expect(fireEvent.keyDown(field(), { key: 'End' })).toBe(false);
    expect(active()).toBe('Board');
    fireEvent.keyDown(field(), { key: 'Home' });
    expect(active()).toBe('Top level');
    fireEvent.change(field(), { target: { value: 'mar' } });
    // Not prevented: the caret moves, and the highlight stays on the first match.
    expect(fireEvent.keyDown(field(), { key: 'End' })).toBe(true);
    expect(active()).toBe('Marketing');
  });

  test('marks the chosen option as selected, with a tick, and starts the highlight on it', () => {
    render(<Picker chosen="q4" />);
    const chosen = screen.getByRole('option', { selected: true });
    expect(chosen.textContent).toContain('Q4 review');
    expect(chosen.querySelector('.crewlet-combobox__check svg')).not.toBeNull();
    expect(active()).toContain('Q4 review');
    expect(screen.getAllByRole('option', { selected: true })).toHaveLength(1);
  });

  test('a press takes a row and keeps focus in the field', () => {
    const onCommit = vi.fn();
    render(<Picker onCommit={onCommit} />);
    field().focus();
    const down = fireEvent.mouseDown(screen.getByRole('option', { name: 'Board' }));
    expect(down).toBe(false);
    expect(onCommit).toHaveBeenCalledWith('board');
    expect(document.activeElement).toBe(field());
  });

  test('keeps its height when the filter leaves nothing, and says so in its own row', () => {
    const { container } = render(<Picker />);
    const box = container.querySelector<HTMLElement>('.crewlet-combobox__list')!;
    expect(box.style.getPropertyValue('--crewlet-combobox-rows')).toBe('5');
    fireEvent.change(field(), { target: { value: 'zzz' } });
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(field().getAttribute('aria-expanded')).toBe('false');
    expect(field().hasAttribute('aria-activedescendant')).toBe(false);
    expect(screen.getByRole('status').textContent).toBe('No folder matches');
    // The same box, still standing at its rows' height.
    expect(container.querySelector('.crewlet-combobox__list')).toBe(box);
    const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'Combobox.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const rule = /\.crewlet-combobox__list\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(rule).toMatch(/height:\s*calc\(\s*var\(--crewlet-combobox-rows\)/);
    expect(rule).not.toMatch(/max-height/);
  });

  test('Escape is never its own: it reaches the dialog the picker sits in', () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Move 3 artifacts">
        <Picker />
      </Modal>,
    );
    field().focus();
    fireEvent.keyDown(field(), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('carries no violation inside its dialog, listing and empty', async () => {
    render(
      <Modal open onClose={() => {}} title="Move 3 artifacts">
        <Picker chosen="q4" />
      </Modal>,
    );
    const run = () =>
      axe.run(document.body, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
        rules: { 'color-contrast': { enabled: false } },
        resultTypes: ['violations'],
      });
    expect((await run()).violations.map((violation) => violation.id)).toEqual([]);
    fireEvent.change(field(), { target: { value: 'zzz' } });
    expect((await run()).violations.map((violation) => violation.id)).toEqual([]);
  });
});
