/**
 * A reference in a struck change value (an old assignee, a removed member) is
 * struck whole in the value's ink, its first word included.
 */
import { afterEach, expect, test } from 'vitest';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { Avatar, ChangeList, InlineRef } from '@crewlethq/ui';

let root: Root | null = null;
let host: HTMLDivElement | null = null;

afterEach(() => {
  root?.unmount();
  host?.remove();
  root = null;
  host = null;
});

const seat = (name: string) => (
  <InlineRef
    href="#/company/org/seats/qa"
    kind="Agent"
    markShape="face"
    mark={<Avatar name={name} kind="agent" size="text" decorative />}
    wrap
  >
    {name}
  </InlineRef>
);

test("a reference in a struck value is struck whole, in the value's ink", () => {
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  flushSync(() =>
    root!.render(
      <ChangeList
        rows={[
          { kind: 'changed', label: 'Assignee', from: seat('Agent CTO'), to: seat('Agent PM') },
          { kind: 'removed', label: 'Member', from: seat('Jane Founder') },
        ]}
      />,
    ),
  );
  const struck = [...host.querySelectorAll('del')];
  expect(struck).toHaveLength(2);
  for (const del of struck) {
    const ref = del.querySelector('.crewlet-inline-ref')!;
    const head = ref.querySelector('.crewlet-inline-ref__head')!;
    expect(getComputedStyle(head).textDecorationLine).toBe('line-through');
    expect(getComputedStyle(ref).color).toBe(getComputedStyle(del).color);
  }
  // The new value is a link in the accent's ink, never struck.
  const added = host.querySelector('.crewlet-change-list__to .crewlet-inline-ref__head')!;
  expect(getComputedStyle(added).textDecorationLine).not.toContain('line-through');
});
