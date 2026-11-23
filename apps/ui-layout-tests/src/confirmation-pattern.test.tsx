/**
 * The confirmation pattern's layout: cut values never widen what holds them, a picker's name is
 * kept whole while it fits, and an assignment list's values start at one edge across its groups.
 */
import { afterEach, expect, test } from 'vitest';
import type { ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { AssignmentList, AssignmentPicker, ChangeGroups, ConsequenceList } from '@crewlethq/ui';

let root: Root | null = null;
let host: HTMLDivElement | null = null;

afterEach(() => {
  root?.unmount();
  host?.remove();
  root = null;
  host = null;
});

function mount(node: ReactNode, style = 'display: grid; width: 320px') {
  host = document.createElement('div');
  host.setAttribute('style', style);
  document.body.append(host);
  root = createRoot(host);
  flushSync(() => root!.render(node));
  return host;
}

const LONG = 'platform-opus-long-context-extended-thinking-fourteen-preview';

test('long values are cut inside a narrow grid cell and never widen it', () => {
  const box = mount(
    <div>
      <ChangeGroups
        groups={[
          {
            key: 's',
            subject: 'Senior Site Reliability Engineer, Payments Platform and Regional Failover',
            rows: [{ kind: 'changed', label: 'Coding and code review', from: LONG, to: LONG }],
          },
        ]}
      />
      <ConsequenceList
        items={[{ kind: 'choice', key: 'c', label: 'Delete its secret', name: `TOKEN_${LONG.toUpperCase()}`, checked: true, onCheckedChange: () => {} }]}
      />
    </div>,
  );
  expect(box.scrollWidth).toBeLessThanOrEqual(320);
  for (const el of box.querySelectorAll<HTMLElement>('.crewlet-change-list__to, .crewlet-change-list__from, .crewlet-resource-name')) {
    expect(el.getBoundingClientRect().right).toBeLessThanOrEqual(box.getBoundingClientRect().right + 0.5);
    expect(getComputedStyle(el).textOverflow).toBe('ellipsis');
  }
});

test("a picker's name is kept whole while it fits; what it is gives way first", () => {
  const box = mount(
    <div style={{ width: 360 }}>
      <AssignmentPicker primary="platform-opus-long-context-14" secondary="Claude Opus 4.1, extended thinking" />
    </div>,
    'display: block',
  );
  const primary = box.querySelector<HTMLElement>('.crewlet-assignment-picker__primary')!;
  const secondary = box.querySelector<HTMLElement>('.crewlet-assignment-picker__secondary')!;
  const range = document.createRange();
  range.selectNodeContents(primary);
  expect(primary.getBoundingClientRect().width).toBeGreaterThanOrEqual(range.getBoundingClientRect().width - 0.01);
  expect(secondary.scrollWidth).toBeGreaterThan(secondary.clientWidth);
});

test("an assignment list's values start at one edge across its groups", () => {
  const picker = (name: string) => <AssignmentPicker primary={name} aria-label={`Model: ${name}`} />;
  const box = mount(
    <AssignmentList
      groups={[
        { key: 'h', label: 'Helpers', rows: [{ key: 'a', name: 'Advisor', value: picker('platform-sonnet-8') }] },
        {
          key: 's',
          label: 'Seats',
          rows: [{ key: 'b', name: 'Senior Backend Engineer', value: picker('platform-sonnet-12'), was: 'platform-sonnet-8' }],
        },
      ]}
    />,
    'display: block; width: 800px',
  );
  const lefts = [...box.querySelectorAll<HTMLElement>('.crewlet-assignment-list__value')].map((el) => el.getBoundingClientRect().left);
  expect(lefts).toHaveLength(2);
  expect(Math.abs(lefts[0]! - lefts[1]!)).toBeLessThan(0.5);
  // The value starts right after the longest name, not at the far half of the row.
  expect(lefts[0]! - box.getBoundingClientRect().left).toBeLessThan(800 * 0.45);
});
