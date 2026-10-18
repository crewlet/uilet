/**
 * Who is here: ordered by what they are doing, ringed in their hue while
 * present, faded when idle, and said from the reader's point of view.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test, vi } from 'vitest';
import type { PresenceMember } from '../PresenceModel/index.js';
import { PresenceStack } from './index.js';

afterEach(cleanup);

const members: PresenceMember[] = [
  { id: 's1', name: 'Sam Lee', kind: 'human', activity: 'idle', hue: 'blue' },
  { id: 's2', name: 'PM', kind: 'agent', activity: 'viewing', hue: 'rose', character: 'gemlet', location: 'reading version 12 for ENG-412' },
  { id: 's3', name: 'Maya Ortiz', kind: 'human', activity: 'editing', hue: 'cyan', location: 'editing row Acme Corp' },
  { id: 's4', name: 'Jane Founder', kind: 'human', activity: 'viewing', hue: 'green' },
  { id: 's5', name: 'CTO', kind: 'agent', activity: 'editing', hue: 'purple' },
];

test('is one image named from the reader point of view, every member said with what they are doing', () => {
  render(<PresenceStack members={members} />);
  const image = screen.getByRole('img');
  expect(image.getAttribute('aria-label')).toBe(
    'You and 5 others are here. Maya Ortiz, editing row Acme Corp. CTO, editing. Jane Founder, viewing. PM, reading version 12 for ENG-412. Sam Lee, idle',
  );
});

test('draws four badges by default, ordered by activity, and counts the rest', () => {
  const { container } = render(<PresenceStack members={members} />);
  const badges = container.querySelectorAll('.crewlet-presence-stack__badge');
  expect(badges).toHaveLength(4);
  expect(container.querySelector('.crewlet-avatar-stack__more')?.textContent).toBe('+1');
  expect(badges[0]!.classList.contains('crewlet-presence-hue--cyan')).toBe(true);
  expect(badges[0]!.classList.contains('crewlet-presence-stack__badge--present')).toBe(true);
});

test('an idle badge loses its ring and fades', () => {
  const { container } = render(<PresenceStack members={members} max={5} />);
  const idle = container.querySelectorAll('.crewlet-presence-stack__badge')[4]!;
  expect(idle.classList.contains('crewlet-presence-stack__badge--idle')).toBe(true);
  expect(idle.classList.contains('crewlet-presence-stack__badge--present')).toBe(false);
});

test('with onSelect each badge is a button naming its member, and the counted members are still said', () => {
  const onSelect = vi.fn();
  render(<PresenceStack members={members} onSelect={onSelect} max={2} />);
  expect(screen.getByRole('group', { name: 'You and 5 others are here' })).toBeDefined();
  fireEvent.click(screen.getByRole('button', { name: 'Maya Ortiz, editing row Acme Corp' }));
  expect(onSelect).toHaveBeenCalledWith(members[2]);
  expect(screen.getAllByRole('button')).toHaveLength(2);
  expect(screen.getByText(/^3 more: Jane Founder, viewing/)).toBeDefined();
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
