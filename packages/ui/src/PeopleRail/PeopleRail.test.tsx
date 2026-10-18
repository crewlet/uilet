/**
 * The People rail: everybody present in words, one entry a seat, ordered as
 * the presence stack orders them, with Follow beside everybody but the reader.
 */

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test, vi } from 'vitest';
import type { PresenceMember } from '../PresenceModel/index.js';
import { ButtonLink } from '../Button/index.js';
import { PeopleRail } from './index.js';

afterEach(cleanup);

const room: PresenceMember[] = [
  { id: 'a', seat: 'maya', name: 'Maya Ortiz', kind: 'human', activity: 'idle' },
  { id: 'b', seat: 'maya', name: 'Maya Ortiz', kind: 'human', activity: 'editing', location: 'Editing on r1, score' },
  { id: 'c', seat: 'pm', name: 'Product Manager', kind: 'agent', activity: 'viewing', hue: 'cyan' },
  { id: 'd', name: 'Guest', kind: 'human', activity: 'idle' },
];

test('lists the reader first, then everybody once, in the stack order, in words', () => {
  render(<PeopleRail members={room} self={{ name: 'Jane Founder', kind: 'human' }} />);
  const rows = within(screen.getByRole('list')).getAllByRole('listitem');
  expect(rows).toHaveLength(4);
  expect(rows[0]!.textContent).toContain('You');
  // TWO TABS OF ONE PERSON ARE ONE ENTRY, the most active, and editing comes first.
  expect(screen.getAllByText('Maya Ortiz')).toHaveLength(1);
  expect(rows[1]!.textContent).toContain('Editing on r1, score');
  // An agent viewing READS, said by the presence vocabulary.
  expect(rows[2]!.textContent).toContain('Reading');
  expect(rows[3]!.textContent).toContain('Idle');
});

test('Follow names whom it follows, toggles, and reports the member or null', () => {
  const onFollow = vi.fn();
  const { rerender } = render(<PeopleRail members={room} onFollow={onFollow} />);
  fireEvent.click(screen.getByRole('button', { name: 'Follow Maya Ortiz' }));
  expect(onFollow).toHaveBeenLastCalledWith(room[1]);
  rerender(<PeopleRail members={room} following="maya" onFollow={onFollow} />);
  const stop = screen.getByRole('button', { name: 'Stop following Maya Ortiz' });
  expect(stop.getAttribute('aria-pressed')).toBe('true');
  fireEvent.click(stop);
  expect(onFollow).toHaveBeenLastCalledWith(null);
});

test("a host's controls sit beside Follow, and the rail closes when told how", () => {
  const onClose = vi.fn();
  render(
    <PeopleRail
      members={room}
      onClose={onClose}
      actions={(member) =>
        member.kind === 'agent' ? (
          <ButtonLink size="small" variant="ghost" href="#/turns/run-7">
            Open turn
          </ButtonLink>
        ) : null
      }
    />,
  );
  expect(screen.getByRole('link', { name: 'Open turn' }).getAttribute('href')).toBe('#/turns/run-7');
  // No Follow control without a follow handler.
  expect(screen.queryByRole('button', { name: /Follow/ })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Close people' }));
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('an empty room says nobody else is here', () => {
  render(<PeopleRail members={[]} self={{ name: 'Jane', kind: 'human' }} />);
  expect(screen.getByText('Nobody else is here right now.')).toBeTruthy();
});

test('the rail is a named complementary region and carries no violation', async () => {
  const { container } = render(
    <main>
      <PeopleRail members={room} self={{ name: 'Jane', kind: 'human' }} following="pm" onFollow={() => {}} onClose={() => {}} />
    </main>,
  );
  expect(screen.getByRole('complementary', { name: 'People here' })).toBeTruthy();
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html).join(', ')}`)).toEqual([]);
});
