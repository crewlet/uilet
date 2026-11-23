/**
 * Who is here: ordered by what they are doing, ringed in their hue while
 * present, faded when idle, and said from the reader's point of view.
 */

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test, vi } from 'vitest';
import type { PresenceMember } from '../PresenceModel/index.js';
import { AVATAR_SIZES, avatarCorner } from '../Avatar/index.js';
import { PresenceStack } from './index.js';

afterEach(cleanup);

/** Spelled without the leading dashes and prefixed at use: the package's
    variable check reads a quoted `--name` in a .tsx file as a declaration. */
const property = (name: string) => `--${name}`;

const members: PresenceMember[] = [
  { id: 's1', name: 'Kai Lee', kind: 'human', activity: 'idle', hue: 'blue' },
  { id: 's2', name: 'PM', kind: 'agent', activity: 'viewing', hue: 'rose', character: 'gemlet', location: 'reading version 12 for ENG-412' },
  { id: 's3', name: 'Maya Ortiz', kind: 'human', activity: 'editing', hue: 'cyan', location: 'editing row Acme Corp' },
  { id: 's4', name: 'Jane Founder', kind: 'human', activity: 'viewing', hue: 'green' },
  { id: 's5', name: 'CTO', kind: 'agent', activity: 'editing', hue: 'purple' },
];

test('is one image named from the reader point of view, every member said with what they are doing', () => {
  render(<PresenceStack members={members} />);
  const image = screen.getByRole('img');
  expect(image.getAttribute('aria-label')).toBe(
    'You and 5 others are here. Maya Ortiz, editing row Acme Corp. CTO, editing. Jane Founder, viewing. PM, reading version 12 for ENG-412. Kai Lee, idle',
  );
});

test('draws four badges by default, ordered by activity, and counts the rest, named on hover', () => {
  const { container } = render(<PresenceStack members={[...members, { id: 's6', name: 'SRE', kind: 'agent', activity: 'viewing' }]} />);
  const badges = container.querySelectorAll('.crewlet-presence-stack__badge');
  expect(badges).toHaveLength(4);
  const more = container.querySelector('.crewlet-avatar-stack__more')!;
  expect(more.textContent).toBe('+2');
  expect(more.getAttribute('title')).toBe('2 more: SRE, reading, Kai Lee, idle');
  expect(badges[0]!.classList.contains('crewlet-presence-hue--cyan')).toBe(true);
  expect(badges[0]!.classList.contains('crewlet-presence-stack__badge--present')).toBe(true);
});

test("every member, a person's or an agent's, rounds as the face it wraps", () => {
  // One shape for every face, so the member (a button when faces select) takes
  // the face's corner from Avatar's ladder for its focus ring and cut-out.
  for (const size of ['xs', 'md'] as const) {
    const { container, unmount } = render(<PresenceStack members={members} size={size} onSelect={() => {}} />);
    const stack = container.querySelector<HTMLElement>('.crewlet-presence-stack')!;
    expect(stack.style.getPropertyValue(property('crewlet-presence-stack-corner'))).toBe(`${avatarCorner(AVATAR_SIZES[size])}px`);
    unmount();
  }
});

test('an idle badge loses its ring and fades', () => {
  const { container } = render(<PresenceStack members={members} max={5} />);
  const idle = container.querySelectorAll('.crewlet-presence-stack__badge')[4]!;
  expect(idle.classList.contains('crewlet-presence-stack__badge--idle')).toBe(true);
  expect(idle.classList.contains('crewlet-presence-stack__badge--present')).toBe(false);
});

test('one member past the cap is drawn, not counted', () => {
  const { container } = render(<PresenceStack members={members} />);
  expect(container.querySelectorAll('.crewlet-presence-stack__badge')).toHaveLength(5);
  expect(container.querySelector('.crewlet-avatar-stack__more')).toBeNull();
});

test('with onSelect each badge is a button naming its member, and the counted members open from their chip', () => {
  const onSelect = vi.fn();
  render(<PresenceStack members={members} onSelect={onSelect} max={2} />);
  expect(screen.getByRole('group', { name: 'You and 5 others are here' })).toBeDefined();
  fireEvent.click(screen.getByRole('button', { name: 'Maya Ortiz, editing row Acme Corp' }));
  expect(onSelect).toHaveBeenCalledWith(members[2]);
  expect(screen.getAllByRole('button')).toHaveLength(3);
  fireEvent.click(screen.getByRole('button', { name: '3 more' }));
  const panel = screen.getByRole('dialog', { name: '3 more' });
  fireEvent.click(within(panel).getByRole('button', { name: /^Jane Founder, viewing/ }));
  expect(onSelect).toHaveBeenCalledWith(members[3]);
});

test('draws nothing for an empty room, and refuses a max that is not a count', () => {
  const { container } = render(<PresenceStack members={[]} />);
  expect(container.innerHTML).toBe('');
  expect(() => render(<PresenceStack members={members} max={0} />)).toThrow(RangeError);
});

test('carries no axe violation, as an image and as buttons', async () => {
  const { container } = render(
    <main>
      <PresenceStack members={members} />
      <PresenceStack members={members} onSelect={() => {}} />
    </main>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations.map((violation) => violation.id)).toEqual([]);
});
