/**
 * A collapsible callout rests as one line, and a compact notice list keeps one
 * line per notice where there is room and wraps, never clips, where there is not.
 */
import { afterEach, expect, test } from 'vitest';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import type { ReactNode } from 'react';
import { Callout, NoticeList, type Notice } from '@crewlethq/ui';

let root: Root | null = null;
let host: HTMLElement | null = null;

afterEach(() => {
  flushSync(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

async function mount(width: number, node: ReactNode): Promise<HTMLElement> {
  host = document.createElement('div');
  host.style.width = `${width}px`;
  document.body.append(host);
  root = createRoot(host);
  flushSync(() => root!.render(node));
  await document.fonts.ready;
  return host;
}

const link = (words: string) => (
  <a className="t-link" href="#/settings">
    {words}
  </a>
);

const NOTICES: Notice[] = [
  { key: 'a', title: "Agents run directly on the engine's own server", summary: 'sonnet', detail: 'They can read every repository.', action: link('Open Models') },
  { key: 'b', title: 'Agents that learn on their main model', subject: '9 agents', lines: [{ items: ['Agent CEO', 'Agent CTO'] }], detail: 'Learning costs more than it needs to.', action: link('Open Models') },
  { key: 'c', title: 'Schedules run 12 or more times a day', summary: 'Site Reliability Engineer for the Platform Infrastructure Group', detail: 'Each run costs a turn.', action: link('Open Schedules') },
  { key: 'd', title: "No agent watches the engine's own alarms", detail: 'Nobody hears of an alarm.' },
];

function Warnings({ open }: { open?: boolean }) {
  return (
    <Callout variant="warning" appearance="quiet" collapsible defaultOpen={open} title="4 configuration warnings">
      <NoticeList compact notices={NOTICES} />
    </Callout>
  );
}

const box = (el: Element) => el.getBoundingClientRect();
const lineOf = (el: Element) => parseFloat(getComputedStyle(el).lineHeight);

test('closed, the callout is one line at a desktop and a phone width', async () => {
  for (const width of [1100, 330]) {
    const at = await mount(width, <Warnings />);
    const callout = at.querySelector('.crewlet-callout')!;
    const toggle = at.querySelector('.crewlet-callout__toggle')!;
    expect(box(callout).height).toBeLessThanOrEqual(44);
    expect(box(toggle).height).toBeGreaterThanOrEqual(24);
    expect(callout.scrollWidth).toBeLessThanOrEqual(callout.clientWidth);
    flushSync(() => root?.unmount());
    host?.remove();
  }
});

test('open and wide, each notice is one line with its action beside it', async () => {
  const at = await mount(1100, <Warnings open />);
  for (const row of at.querySelectorAll('.crewlet-notice-list__item')) {
    const toggle = row.querySelector('.crewlet-notice-list__toggle')!;
    const floor = parseFloat(getComputedStyle(toggle).minHeight);
    expect(box(toggle).height).toBeLessThanOrEqual(Math.max(floor, lineOf(toggle) + 4));
    const action = row.querySelector('.crewlet-disclosure__actions');
    if (action) expect(box(action).top).toBeLessThan(box(toggle).bottom);
  }
});

test('open on a phone, a long summary wraps inside the callout and the action moves under it', async () => {
  const at = await mount(330, <Warnings open />);
  const callout = at.querySelector('.crewlet-callout')!;
  expect(callout.scrollWidth).toBeLessThanOrEqual(callout.clientWidth);
  const long = at.querySelectorAll('.crewlet-notice-list__item')[2]!;
  const summary = long.querySelector('.crewlet-notice-list__summary')!;
  expect(box(summary).right).toBeLessThanOrEqual(box(callout).right);
  const toggle = long.querySelector('.crewlet-notice-list__toggle')!;
  const action = long.querySelector('.crewlet-disclosure__actions')!;
  expect(box(action).top).toBeGreaterThanOrEqual(box(toggle).bottom - 1);
  expect(box(action).right).toBeLessThanOrEqual(box(callout).right);
});
