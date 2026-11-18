/**
 * A tool-call log in a real layout: it grows with its rows up to its bound and
 * then scrolls inside, in a plain block parent; at a phone's width nothing in
 * it scrolls sideways; and a focused toggle's ring is not clipped by the log.
 */
import { afterEach, expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import type { ReactNode } from 'react';
import { ToolCallLog, type ToolCallLogEntry } from '@crewlethq/ui';

let root: Root | null = null;
let host: HTMLElement | null = null;

afterEach(() => {
  flushSync(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

async function mount(node: ReactNode, width: number): Promise<HTMLElement> {
  host = document.createElement('div');
  host.style.width = `${width}px`;
  document.body.append(host);
  root = createRoot(host);
  flushSync(() => root!.render(node));
  await document.fonts.ready;
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  return host;
}

const LONG = `cd /tmp && gh pr view 131 -R example/route-cache-worker --json ${'state,mergedAt,headRefName,'.repeat(6)}commits`;
const PATH = `/home/user/workspace/${'route-cache-worker-'.repeat(6)}CollectionDetail.jsx`;

const entries = (n: number): ToolCallLogEntry[] => [
  { kind: 'say', key: 's', text: `All 363 pass. Now checking ${PATH} against the base without the change.` },
  { kind: 'call', key: 'long', tool: 'Bash', detail: LONG, input: `${LONG}\n${'echo done\n'.repeat(4)}`, status: 'ok', durationMs: 2210 },
  { kind: 'call', key: 'err', tool: 'Read', detail: PATH, status: 'error', error: `ENOENT: ${PATH}`, durationMs: 12 },
  { kind: 'note', key: 'n', text: `The run ended: ${PATH}`, tone: 'danger' },
  ...Array.from({ length: n }, (_, i): ToolCallLogEntry =>
    i % 2
      ? { kind: 'say', key: `r${i}`, text: `Step ${i} done.` }
      : { kind: 'call', key: `r${i}`, tool: 'Bash', detail: `go test ./pkg/${i}/...`, status: 'ok', durationMs: 40 * i },
  ),
];

test('in a plain block parent it grows with its rows, then scrolls inside its bound', async () => {
  await page.viewport(1280, 900);
  const short = await mount(<ToolCallLog label="Live output" entries={entries(0)} maxHeight={320} />, 720);
  const shortLog = short.querySelector<HTMLElement>('[role="log"]')!;
  expect(shortLog.scrollHeight).toBeLessThanOrEqual(shortLog.clientHeight + 1);
  expect(short.querySelector<HTMLElement>('.crewlet-tool-call-log__body')!.getBoundingClientRect().height).toBeLessThan(320);
  flushSync(() => root?.unmount());
  host?.remove();

  const tall = await mount(<ToolCallLog label="Live output" entries={entries(60)} maxHeight={320} />, 720);
  const body = tall.querySelector<HTMLElement>('.crewlet-tool-call-log__body')!;
  const log = tall.querySelector<HTMLElement>('[role="log"]')!;
  expect(Math.round(body.getBoundingClientRect().height)).toBeLessThanOrEqual(320);
  expect(log.scrollHeight).toBeGreaterThan(log.clientHeight);
});

test('at a phone width nothing scrolls sideways, and a long detail is cut on one line', async () => {
  await page.viewport(390, 844);
  const at = await mount(<ToolCallLog label="Live output" entries={entries(4)} copyText="x" live caption="read 3s ago on node-1" />, 358);
  const log = at.querySelector<HTMLElement>('[role="log"]')!;
  expect(log.scrollWidth).toBeLessThanOrEqual(log.clientWidth);
  expect(at.scrollWidth).toBeLessThanOrEqual(358);
  for (const el of at.querySelectorAll<HTMLElement>('*')) {
    expect(el.getBoundingClientRect().right, el.className).toBeLessThanOrEqual(at.getBoundingClientRect().right + 0.5);
  }
  const detail = at.querySelector<HTMLElement>('.crewlet-tool-call-log__detail')!;
  expect(detail.scrollWidth).toBeGreaterThan(detail.clientWidth);
  expect(detail.getBoundingClientRect().height).toBeLessThan(24);
});

test("a focused toggle's ring stands inside the log's view, not clipped by it", async () => {
  await page.viewport(390, 844);
  const at = await mount(<ToolCallLog label="Live output" entries={entries(0)} />, 358);
  const log = at.querySelector<HTMLElement>('[role="log"]')!;
  const toggle = at.querySelector<HTMLButtonElement>('.crewlet-tool-call-log__more')!;
  toggle.focus();
  const ring = Number.parseFloat(getComputedStyle(toggle).outlineWidth);
  expect(ring).toBeGreaterThan(0);
  const view = log.getBoundingClientRect();
  const box = toggle.getBoundingClientRect();
  expect(box.left - ring).toBeGreaterThanOrEqual(view.left);
  expect(box.right + ring).toBeLessThanOrEqual(view.right);
});

test("a detail cut at its start keeps the path's file name in view, its ellipsis on the left", async () => {
  await page.viewport(390, 844);
  const log = await mount(
    <ToolCallLog
      label="Live output"
      entries={[{ kind: 'call', key: 'p', tool: 'Read', detail: PATH, detailCut: 'start', status: 'ok', durationMs: 12 }]}
    />,
    358,
  );
  const detail = log.querySelector<HTMLElement>('.crewlet-tool-call-log__detail')!;
  const text = detail.querySelector('bdi')!.firstChild!;
  const charAt = (at: number) => {
    const range = document.createRange();
    range.setStart(text, at);
    range.setEnd(text, at + 1);
    return range.getBoundingClientRect();
  };
  const box = detail.getBoundingClientRect();
  expect(detail.scrollWidth).toBeGreaterThan(detail.clientWidth);
  const last = charAt(PATH.length - 1);
  expect(last.right).toBeLessThanOrEqual(box.right + 1);
  expect(last.left).toBeGreaterThanOrEqual(box.left);
  expect(charAt(0).right).toBeLessThanOrEqual(box.left);
  expect(detail.textContent).toBe(PATH);
});

test('a live log opens at its end and follows it; a finished one opens at its start', async () => {
  await page.viewport(1280, 900);
  const live = await mount(<ToolCallLog label="Live output" live entries={entries(60)} maxHeight={320} />, 720);
  const liveLog = live.querySelector<HTMLElement>('[role="log"]')!;
  expect(liveLog.scrollHeight - liveLog.scrollTop - liveLog.clientHeight).toBeLessThan(2);
  flushSync(() => root?.unmount());
  host?.remove();

  const done = await mount(<ToolCallLog label="What it did" entries={entries(60)} maxHeight={320} />, 720);
  expect(done.querySelector<HTMLElement>('[role="log"]')!.scrollTop).toBe(0);
});
