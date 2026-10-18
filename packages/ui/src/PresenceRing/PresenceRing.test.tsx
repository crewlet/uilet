/**
 * A collaborator's ring: in their hue, inset, dashed when idle, and never
 * read out.
 */

import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { NODE_HUES } from '../utils/nodeHue.js';
import { PresenceRing, presenceHueClass } from './index.js';

afterEach(cleanup);

test('wraps its content in the hue class every presence mark reads, and adds nothing a screen reader reads', () => {
  const { container } = render(
    <PresenceRing hue="cyan">
      <span>Globex</span>
    </PresenceRing>,
  );
  const ring = container.firstElementChild as HTMLElement;
  expect(ring.className).toBe('crewlet-presence-ring crewlet-presence-hue--cyan');
  expect(ring.textContent).toBe('Globex');
  expect(ring.style.getPropertyValue('--crewlet-presence-ring-inset')).toBe('1px');
});

test('an idle collaborator is dashed, and the inset is the caller to set', () => {
  const { container } = render(<PresenceRing hue="rose" state="idle" inset={3} />);
  const ring = container.firstElementChild as HTMLElement;
  expect(ring.classList.contains('crewlet-presence-ring--idle')).toBe(true);
  expect(ring.style.getPropertyValue('--crewlet-presence-ring-inset')).toBe('3px');
});

test('one class per node hue, and neutral for a host that draws everyone alike', () => {
  expect(NODE_HUES.map(presenceHueClass)).toEqual(NODE_HUES.map((hue) => `crewlet-presence-hue--${hue}`));
  expect(presenceHueClass('neutral')).toBe('crewlet-presence-hue--neutral');
});
