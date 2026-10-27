/**
 * The inbox's column: each row one control with the task as a second control
 * under it, a neutral selected fill announced as the open row, and the quiet
 * toggles at the end.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { useState } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { InboxGroup, InboxList, InboxMore, InboxRow, InboxToggle } from './index.js';

afterEach(cleanup);

function Column({ onOpen = () => {} }: { onOpen?: (key: string) => void }) {
  return (
    <InboxList label="Inbox">
      <InboxGroup label="Needs you">
        <InboxRow
          title="Crewlet-PM"
          meta="38m"
          actionable
          selected
          onClick={() => onOpen('ask-1')}
          aside={<a href="#/worklet/FAIR-3">FAIR-3 Ledger and settlement</a>}
        >
          Which settlement should the ledger use?
        </InboxRow>
        <InboxRow title="Crewlet-SWE" qualifier="stopped" qualifierTone="danger" meta="2h" onClick={() => onOpen('seat-1')}>
          Today&rsquo;s token budget is spent
        </InboxRow>
      </InboxGroup>
      <InboxGroup label="Updates">
        <InboxRow title="Jane" meta="1d" unread excerpt="Can you look at the edge case?" href="#/inbox?row=n-1">
          Mentioned you
        </InboxRow>
        <InboxRow title="Crewlet-PM" meta="2d" done doneLabel="Answered" onClick={() => onOpen('ask-0')}>
          Ship the export first?
        </InboxRow>
      </InboxGroup>
      <InboxGroup label="Answered" count={1} collapsible>
        <InboxRow
          title="Crewlet-PM"
          meta="Sat"
          done
          doneLabel="Answered"
          status={<span>Answered</span>}
          outcome="You chose A command-line tool"
          outcomeIcon={<svg />}
          outcomeTone="success"
          onClick={() => onOpen('ask-9')}
        >
          Should the MVP be a command-line tool?
        </InboxRow>
      </InboxGroup>
      <InboxMore>
        <InboxToggle expanded={false}>3 snoozed</InboxToggle>
        <InboxToggle expanded>Earlier updates</InboxToggle>
      </InboxMore>
    </InboxList>
  );
}

test('the column is a named navigation, and each group is named by its heading', () => {
  render(<Column />);
  const nav = screen.getByRole('navigation', { name: 'Inbox' });
  expect(within(nav).getByRole('region', { name: 'Needs you' })).toBeTruthy();
  expect(within(nav).getByRole('heading', { name: 'Updates' })).toBeTruthy();
});

test('a row is one control whose name reads every part apart, and the task is a control of its own', () => {
  render(<Column />);
  const row = screen.getByRole('button', { name: /^Crewlet-PM 38m Which settlement should the ledger use\?$/ });
  const task = screen.getByRole('link', { name: 'FAIR-3 Ledger and settlement' });
  // A link nested inside the row's button would be invalid and unreachable by
  // keyboard: the task sits beside the control, in the same item.
  expect(row.contains(task)).toBe(false);
  expect(row.closest('li')).toBe(task.closest('li'));
});

test('the open row is announced as current and takes the neutral selected fill', () => {
  render(<Column />);
  const row = screen.getByRole('button', { name: /Which settlement/ });
  expect(row.getAttribute('aria-current')).toBe('true');
  expect(row.closest('li')!.className).toContain('crewlet-inbox-row--selected');
  expect(screen.getByRole('button', { name: /Today/ }).getAttribute('aria-current')).toBeNull();
});

// THE OPEN ROW SURVIVES FORCED COLORS, which repaints the pressed fill to
// Canvas: an outline in the system's highlight is the mark that mode keeps.
test('the open row keeps a mark in forced colors, where its fill is painted away', () => {
  const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'InboxList.css'), 'utf8').replace(
    /\/\*[\s\S]*?\*\//g,
    '',
  );
  const forced = /@media\s*\(forced-colors:\s*active\)\s*\{([\s\S]*?\})\s*\}/.exec(css)?.[1] ?? '';
  expect(forced).toMatch(/\.crewlet-inbox-row--selected\s*\{[^}]*outline:\s*2px solid Highlight/);
});

test('unread and settled are read out, not only drawn', () => {
  render(<Column />);
  expect(screen.getByRole('link', { name: /Mentioned you Can you look at the edge case\? Unread$/ })).toBeTruthy();
  expect(screen.getByRole('button', { name: /Ship the export first\? Answered$/ })).toBeTruthy();
});

test('a row opens as a button, or as a link a router can take the press of', () => {
  const onOpen = vi.fn();
  render(<Column onOpen={onOpen} />);
  fireEvent.click(screen.getByRole('button', { name: /Today/ }));
  expect(onOpen).toHaveBeenCalledWith('seat-1');

  const onClick = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
  render(
    <InboxList label="Links">
      <InboxGroup label="Updates">
        <InboxRow title="Jane" href="#/inbox?row=n-2" onClick={onClick}>
          Moved to Done
        </InboxRow>
      </InboxGroup>
    </InboxList>,
  );
  const link = screen.getByRole('link', { name: /Moved to Done/ });
  expect(link.getAttribute('href')).toBe('#/inbox?row=n-2');
  fireEvent.click(link);
  expect(onClick).toHaveBeenCalledTimes(1);
});

test('the danger qualifier is drawn in its own ink', () => {
  const { container } = render(<Column />);
  const qualifier = container.querySelector('.crewlet-inbox-row__qualifier--danger');
  expect(qualifier?.textContent).toBe('stopped');
});

test('a group can be named for a screen reader only', () => {
  render(
    <InboxList label="Inbox">
      <InboxGroup label="Snoozed" hideLabel>
        <InboxRow title="Jane" onClick={() => {}}>
          Moved to Done
        </InboxRow>
      </InboxGroup>
    </InboxList>,
  );
  const heading = screen.getByRole('heading', { name: 'Snoozed' });
  expect(heading.className).toContain('crewlet-visually-hidden');
  expect(screen.getByRole('region', { name: 'Snoozed' })).toBeTruthy();
});

test('a toggle says whether what it opens is open', () => {
  render(<Column />);
  expect(screen.getByRole('button', { name: '3 snoozed' }).getAttribute('aria-expanded')).toBe('false');
  expect(screen.getByRole('button', { name: 'Earlier updates' }).getAttribute('aria-expanded')).toBe('true');
});

test('carries no axe violation', async () => {
  const { container } = render(
    <main>
      <h1>Inbox</h1>
      <Column />
    </main>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations).toEqual([]);
});

test('a settled row is never struck through, and says its outcome and status in words', () => {
  render(
    <InboxList label="Inbox">
      <InboxGroup label="Answered">
        <InboxRow
          title="Crewlet-PM"
          meta="2m"
          done
          doneLabel="Answered"
          status={<span>Answered</span>}
          outcome={<>You chose One JSON file per group</>}
          outcomeIcon={<svg />}
          outcomeTone="success"
          onClick={() => {}}
        >
          How should the MVP store a group&rsquo;s data locally?
        </InboxRow>
      </InboxGroup>
    </InboxList>,
  );
  const row = screen.getByRole('button', {
    name: /^Crewlet-PM Answered 2m How should the MVP store a group’s data locally\? You chose One JSON file per group Answered$/,
  });
  expect(row.querySelector('.crewlet-inbox-row__outcome--success')).toBeTruthy();
  const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'InboxList.css'), 'utf8').replace(
    /\/\*[\s\S]*?\*\//g,
    '',
  );
  expect(css).not.toContain('line-through');
});

test('a collapsible group is a disclosure in its heading, counted, and hides its rows while closed', () => {
  const onOpenChange = vi.fn();
  render(
    <InboxList label="Inbox">
      <InboxGroup label="Answered" count={4} collapsible onOpenChange={onOpenChange}>
        <InboxRow title="Crewlet-PM" onClick={() => {}}>
          Ship the export first?
        </InboxRow>
      </InboxGroup>
    </InboxList>,
  );
  const toggle = screen.getByRole('button', { name: 'Answered, 4' });
  expect(toggle.closest('h2, h3, h4, h5, h6')).toBeTruthy();
  expect(toggle.getAttribute('aria-expanded')).toBe('false');
  expect(screen.queryByRole('button', { name: /Ship the export/ })).toBeNull();
  fireEvent.click(toggle);
  expect(toggle.getAttribute('aria-expanded')).toBe('true');
  expect(onOpenChange).toHaveBeenCalledWith(true);
  expect(screen.getByRole('button', { name: /Ship the export/ })).toBeTruthy();
  expect(screen.getByRole('region', { name: 'Answered, 4' })).toBeTruthy();
});

test('a collapsible group can be held by its caller, and opens on its own button', () => {
  function Held() {
    const [open, setOpen] = useState(true);
    return (
      <InboxList label="Inbox">
        <InboxGroup label="Answered" count={2} collapsible open={open} onOpenChange={setOpen}>
          <InboxRow title="Crewlet-PM" onClick={() => {}}>
            Ship the export first?
          </InboxRow>
        </InboxGroup>
      </InboxList>
    );
  }
  render(<Held />);
  const toggle = screen.getByRole('button', { name: 'Answered, 2' });
  // A native button: Enter and Space press it, and it says what it controls.
  expect(toggle.tagName).toBe('BUTTON');
  expect(toggle.getAttribute('type')).toBe('button');
  const rows = document.getElementById(toggle.getAttribute('aria-controls')!);
  expect(rows?.tagName).toBe('UL');
  expect(toggle.getAttribute('aria-expanded')).toBe('true');
  expect(rows?.hidden).toBe(false);
  fireEvent.click(toggle);
  expect(toggle.getAttribute('aria-expanded')).toBe('false');
  expect(rows?.hidden).toBe(true);
});

test('a group whose label is hidden is never collapsed, since nothing could open it', () => {
  render(
    <InboxList label="Inbox">
      <InboxGroup label="Snoozed" hideLabel collapsible>
        <InboxRow title="Crewlet-PM" onClick={() => {}}>
          Assigned you
        </InboxRow>
      </InboxGroup>
    </InboxList>,
  );
  expect(screen.getByRole('button', { name: /Assigned you/ })).toBeTruthy();
});
