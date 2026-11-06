/**
 * A room in a directory is one link to the room and one control beside it,
 * and its facts read as facts.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { List } from '../List/index.js';
import { RoomRow } from './index.js';
import { installSheets } from '../../../../apps/ui-tests/src/cascade.js';

afterEach(cleanup);

test('the row is a link to the room, and Join stands beside it with its note under both', () => {
  const onJoin = vi.fn();
  render(
    <List aria-label="Rooms">
      <RoomRow
        href="#/chat/launch"
        mark={<svg data-testid="mark" />}
        name="launch"
        topic="Friday's release"
        facts={['3 members', 'last message 2 hours ago', undefined, '']}
        action={
          <button type="button" onClick={onJoin}>
            Join
          </button>
        }
        note="You can't join a private room yourself."
      />
    </List>,
  );
  const link = screen.getByRole('link', { name: "launch Friday's release 3 members last message 2 hours ago" });
  expect(link.getAttribute('href')).toBe('#/chat/launch');
  const join = screen.getByRole('button', { name: 'Join' });
  expect(link.contains(join)).toBe(false);
  // The mark is decoration: the name says which room it is.
  expect(screen.getByTestId('mark').parentElement?.getAttribute('aria-hidden')).toBe('true');
  // Two facts, one dot between them, and the empty ones left out.
  expect(link.querySelectorAll('.crewlet-room-row__sep')).toHaveLength(1);
  expect(screen.getByRole('listitem').textContent).toContain("You can't join a private room yourself.");
  fireEvent.click(join);
  expect(onJoin).toHaveBeenCalledTimes(1);
});

test('a room with no topic and no facts draws its name line alone', () => {
  const { container } = render(
    <List aria-label="Rooms">
      <RoomRow href="#/chat/quiet" mark={null} name="quiet" topic="" facts={[]} />
    </List>,
  );
  expect(container.querySelector('.crewlet-room-row__topic')).toBeNull();
  expect(container.querySelector('.crewlet-room-row__facts')).toBeNull();
  expect(screen.getByRole('link', { name: 'quiet' })).toBeDefined();
});

test('a long name wraps rather than running under the action', () => {
  const remove = installSheets('List/List.css', 'RoomRow/RoomRow.css');
  try {
    const { container } = render(
      <List aria-label="Rooms">
        <RoomRow href="#/chat/x" mark={null} name="aroomnamewithnohyphenatallthatgoesonandon" action={<button type="button">Open</button>} />
      </List>,
    );
    const name = container.querySelector<HTMLElement>('.crewlet-room-row__name')!;
    expect(getComputedStyle(name).getPropertyValue('overflow-wrap')).toBe('anywhere');
    // It wraps inside its shrinking title, not by moving the title to a new line.
    const title = container.querySelector<HTMLElement>('.crewlet-room-row__title')!;
    expect(getComputedStyle(title).getPropertyValue('min-width')).toBe('0px');
  } finally {
    remove();
  }
});

test('a long name wraps inside its title, so the mark stays on its first line', () => {
  // A wrapping name line moved the whole title to a line of its own on a
  // phone, leaving the mark alone above it and the tag on a third line.
  const uninstall = installSheets('RoomRow/RoomRow.css');
  try {
    const { container } = render(
      <List aria-label="Rooms">
        <RoomRow href="#/r/1" mark={<span>#</span>} name="rights-holder-requests-and-takedowns" tags={<span>Joined</span>} />
      </List>,
    );
    const line = container.querySelector('.crewlet-room-row__name')!;
    const title = container.querySelector('.crewlet-room-row__title')!;
    expect(getComputedStyle(line).flexWrap).not.toBe('wrap');
    expect(getComputedStyle(title).flexShrink).toBe('1');
    expect(getComputedStyle(title).minWidth).toBe('0px');
    expect(getComputedStyle(line).overflowWrap).toBe('anywhere');
  } finally {
    uninstall();
  }
});
