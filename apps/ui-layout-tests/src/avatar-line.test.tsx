/**
 * FACES IN A LINE SHARE ONE MIDDLE, measured: a person's initials and an
 * agent's character, side by side in a line of text or each in the inline
 * span a tooltip hangs off, stand at the same height at every step. An inline
 * flex box takes its baseline from what it holds, so before the face was
 * centred on its line a person beside two agents stood 2px lower at 20px.
 */
import { afterEach, expect, test } from 'vitest';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import type { ReactNode } from 'react';
import { Avatar, type AvatarSizeStep } from '@crewlethq/ui';

let root: Root | null = null;
let host: HTMLElement | null = null;

afterEach(() => {
  flushSync(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

async function mount(node: ReactNode): Promise<HTMLElement> {
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  flushSync(() => root!.render(node));
  await document.fonts.ready;
  return host;
}

const STEPS: AvatarSizeStep[] = ['xs', 'sm', 'md', 'lg'];

test.each(STEPS)('a person and two agents at %s stand on one middle, each in an inline span', async (size) => {
  const at = await mount(
    <p style={{ margin: 0, fontSize: 14, lineHeight: 1.45 }}>
      Watching{' '}
      <span title="Jane Founder">
        <Avatar name="Jane Founder" kind="human" size={size} />
      </span>
      <span title="Site Reliability Engineer">
        <Avatar name="Site Reliability Engineer" kind="agent" character="crewlet" hue="purple" size={size} />
      </span>
      <span title="CTO">
        <Avatar name="CTO" kind="agent" character="gemlet" hue="cyan" size={size} />
      </span>
    </p>,
  );
  const faces = [...at.querySelectorAll('.crewlet-avatar')].map((face) => face.getBoundingClientRect());
  expect(faces).toHaveLength(3);
  const [person, ...agents] = faces;
  for (const agent of agents) {
    expect(Math.abs(agent.top - person!.top)).toBeLessThanOrEqual(0.5);
    expect(agent.height).toBe(person!.height);
    expect(agent.width).toBe(person!.width);
  }
});

test('faces directly in a sentence stand on one middle too', async () => {
  const at = await mount(
    <p style={{ margin: 0, fontSize: 14, lineHeight: 1.45 }}>
      Asked <Avatar name="Jane Founder" kind="human" size="sm" /> and{' '}
      <Avatar name="CTO" kind="agent" character="gemlet" hue="cyan" size="sm" /> about it
    </p>,
  );
  const [person, agent] = [...at.querySelectorAll('.crewlet-avatar')].map((face) => face.getBoundingClientRect());
  expect(Math.abs(agent!.top - person!.top)).toBeLessThanOrEqual(0.5);
});
