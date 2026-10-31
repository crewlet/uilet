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
import { memo, useState } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { driveMotion, preferReducedMotion, settleMotion } from '../../../../apps/ui-tests/src/motion.js';
import { INBOX_ROW_LEAVE, InboxGroup, InboxList, InboxMore, InboxRow, InboxToggle } from './index.js';

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

// ---- Motion: a row leaving, a row arriving --------------------------------

function Needs({ keys, arrived }: { keys: readonly string[]; arrived?: string }) {
  return (
    <InboxList label="Inbox">
      <InboxGroup label="Needs you" arrived={arrived}>
        {keys.map((key) => (
          <InboxRow key={key} title={`Row ${key}`} onClick={() => {}}>
            Words of {key}
          </InboxRow>
        ))}
      </InboxGroup>
    </InboxList>
  );
}

const rowOf = (key: string) => screen.getByText(`Row ${key}`).closest('li')!;
const drawn = () => [...document.querySelectorAll('.crewlet-inbox-row')].map((li) => li.textContent?.match(/Row (\w)/)?.[1]);

// THE HOST ONLY REMOVES THE ROW. The group keeps its last drawing in its place,
// inert, while its height closes, and drops it once the motion has ended.
test('a row taken from a group stays in its place, inert, until its height has closed', async () => {
  const { rerender } = render(<Needs keys={['a', 'b', 'c']} />);
  const leaving = rowOf('b');
  const motion = driveMotion(leaving).start({ transition: INBOX_ROW_LEAVE.transitions[0] });
  rerender(<Needs keys={['a', 'c']} />);
  expect(drawn()).toEqual(['a', 'b', 'c']);
  expect(leaving.classList.contains('crewlet-inbox-row--leaving')).toBe(true);
  expect(leaving.hasAttribute('inert')).toBe(true);
  motion.finish();
  await settleMotion();
  expect(drawn()).toEqual(['a', 'c']);
});

// THE LAST ROW LEAVES TOO, as long as its group is still drawn: the group
// keeps it while its children are empty, and is left empty once it has gone.
// A group the host stops drawing takes its rows with it at once.
test('the last row of a group leaves with its motion while the group stays drawn', async () => {
  const { rerender } = render(<Needs keys={['a']} />);
  const motion = driveMotion(rowOf('a')).start({ transition: 'grid-template-rows' });
  rerender(<Needs keys={[]} />);
  expect(drawn()).toEqual(['a']);
  expect(rowOf('a').hasAttribute('inert')).toBe(true);
  motion.finish();
  await settleMotion();
  expect(drawn()).toEqual([]);
  expect(screen.getByRole('heading', { name: 'Needs you' })).toBeTruthy();
});

// A HOST DRAWS ITS ROWS THROUGH A WRAPPER OF ITS OWN (memoized, since the
// list redraws on every live push). The group keeps any keyed component child
// as a leaving row; the wrapper forwards `leaving` and `onLeft` to its row, and
// the host's own `onLeft` still runs, once, when the row has closed.
const Item = memo(function Item({
  id,
  leaving,
  onLeft,
}: {
  id: string;
  leaving?: boolean | undefined;
  onLeft?: (() => void) | undefined;
}) {
  return (
    <InboxRow title={`Row ${id}`} leaving={leaving} onLeft={onLeft} onClick={() => {}}>
      Words of {id}
    </InboxRow>
  );
});

function Wrapped({
  keys,
  onLeft,
  empty = false,
}: {
  keys: readonly string[];
  onLeft?: (() => void) | undefined;
  empty?: boolean;
}) {
  return (
    <InboxGroup label="Needs you">
      {keys.map((key) => (
        <Item key={key} id={key} onLeft={onLeft} />
      ))}
      {empty ? <li key="empty">Nothing needs you</li> : null}
    </InboxGroup>
  );
}

test('a row drawn through a wrapper leaves with its motion, and the host hears once that it has gone', async () => {
  const onLeft = vi.fn();
  const { rerender } = render(<Wrapped keys={['a', 'b']} onLeft={onLeft} />);
  const motion = driveMotion(rowOf('b')).start({ transition: 'grid-template-rows' });
  rerender(<Wrapped keys={['a']} onLeft={onLeft} />);
  expect(drawn()).toEqual(['a', 'b']);
  expect(rowOf('b').hasAttribute('inert')).toBe(true);
  expect(onLeft).not.toHaveBeenCalled();
  motion.finish();
  await settleMotion();
  expect(drawn()).toEqual(['a']);
  expect(onLeft).toHaveBeenCalledTimes(1);
});

test('a keyed element that is not a component goes at once', () => {
  const { rerender } = render(<Wrapped keys={[]} empty />);
  expect(screen.getByText('Nothing needs you')).toBeTruthy();
  rerender(<Wrapped keys={['a']} />);
  expect(screen.queryByText('Nothing needs you')).toBeNull();
});

test('a leaving row lets focus go, and a row that comes back is live where it stands', () => {
  const { rerender } = render(<Needs keys={['a', 'b', 'c']} />);
  const leaving = rowOf('b');
  driveMotion(leaving).start({ transition: 'grid-template-rows' });
  within(leaving).getByRole('button').focus();
  rerender(<Needs keys={['a', 'c']} />);
  expect(leaving.contains(document.activeElement)).toBe(false);
  rerender(<Needs keys={['a', 'b', 'c']} />);
  expect(drawn()).toEqual(['a', 'b', 'c']);
  expect(rowOf('b').hasAttribute('inert')).toBe(false);
});

test('under reduced motion a row taken away goes at once', () => {
  const restore = preferReducedMotion(true);
  try {
    const { rerender } = render(<Needs keys={['a', 'b', 'c']} />);
    driveMotion(rowOf('b')).start({ transition: 'grid-template-rows' });
    rerender(<Needs keys={['a', 'c']} />);
    expect(drawn()).toEqual(['a', 'c']);
  } finally {
    restore();
  }
});

test('a row of a list of its own leaves by `leaving`, and says when it has gone', async () => {
  const onLeft = vi.fn();
  const { container, rerender } = render(
    <ul>
      <InboxRow title="Row a" onLeft={onLeft} />
    </ul>,
  );
  const motion = driveMotion(container.querySelector('li')!).start({ transition: 'grid-template-rows' });
  rerender(
    <ul>
      <InboxRow title="Row a" leaving onLeft={onLeft} />
    </ul>,
  );
  expect(container.querySelector('li')?.hasAttribute('inert')).toBe(true);
  expect(onLeft).not.toHaveBeenCalled();
  motion.finish();
  await settleMotion();
  expect(container.querySelector('li')).toBeNull();
  expect(onLeft).toHaveBeenCalled();
});

// A ROW ARRIVED: a wash on the row, or on a closed group's label and count,
// played afresh for each arrival and never drawing anew what the reader can focus.
test('an arrival washes the row, or the label and count of the group it landed in', () => {
  render(
    <ul>
      <InboxRow title="Row a" arrived />
    </ul>,
  );
  expect(rowOf('a').classList.contains('crewlet-inbox-row--arrived')).toBe(true);
  cleanup();

  const Answered = ({ arrived }: { arrived?: string }) => (
    <InboxGroup label="Answered" count={3} collapsible arrived={arrived}>
      <InboxRow key="a" title="Row a" />
    </InboxGroup>
  );
  const { container, rerender } = render(<Answered />);
  expect(container.querySelector('.crewlet-inbox-list__arrival')).toBeNull();
  const toggle = screen.getByRole('button', { name: /Answered/ });
  rerender(<Answered arrived="a" />);
  const first = container.querySelector('.crewlet-inbox-list__arrival')!;
  expect(first.getAttribute('aria-hidden')).toBe('true');
  rerender(<Answered arrived="b" />);
  expect(container.querySelector('.crewlet-inbox-list__arrival')).not.toBe(first);
  expect(screen.getByRole('button', { name: /Answered/ })).toBe(toggle);
});

test('the motions are the kit\'s: the row closes its one track on the slow step, and nothing moves under reduced motion', () => {
  const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'InboxList.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const rule = (selector: string) => {
    const at = css.indexOf(`${selector} {`);
    return at < 0 ? '' : css.slice(at, css.indexOf('}', at)).replace(/\s+/g, ' ');
  };
  expect(rule('.crewlet-inbox-row')).toContain('grid-template-rows: 1fr;');
  const leaving = rule('.crewlet-inbox-row--leaving');
  expect(leaving).toContain('grid-template-rows: 0fr;');
  expect(leaving).toContain('grid-template-rows var(--motion-duration-slow) var(--motion-easing-emphasized)');
  expect(rule('.crewlet-inbox-row--arrived')).toContain('animation: crewlet-inbox-arrive');
  const reduced = css.match(/@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\n\}/)?.[0] ?? '';
  expect(reduced).toMatch(/\.crewlet-inbox-row--leaving\s*\{\s*transition: none;/);
  expect(reduced).toMatch(/\.crewlet-inbox-list__arrival\s*\{\s*animation: none;/);
});
