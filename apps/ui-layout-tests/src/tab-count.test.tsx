/**
 * A tab's count reads as the label's own: a one-figure count is a circle, a
 * longer one a pill, standing 6px from the label in an underline tab bar.
 */
import { afterEach, expect, test } from 'vitest';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { Tabs } from '@crewlethq/ui';

let root: Root | null = null;
let host: HTMLElement | null = null;

afterEach(() => {
  flushSync(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

async function mount(): Promise<HTMLElement> {
  host = document.createElement('div');
  host.style.width = '640px';
  document.body.append(host);
  root = createRoot(host);
  flushSync(() =>
    root!.render(
      <Tabs
        variant="underline"
        ariaLabel="Sections"
        value="agents"
        items={[
          { value: 'agents', label: 'Agents', count: 1 },
          { value: 'runs', label: 'Runs', count: 128 },
          { value: 'settings', label: 'Settings' },
        ]}
      />,
    ),
  );
  await document.fonts.ready;
  for (let i = 0; i < 3; i++) await new Promise((resolve) => requestAnimationFrame(resolve));
  return host;
}

const box = (el: Element) => el.getBoundingClientRect();

test('a one-figure count is a circle and a longer one a pill as tall', async () => {
  const el = await mount();
  const [one, many] = [...el.querySelectorAll('.crewlet-count')].map(box);
  expect(one!.width).toBeCloseTo(one!.height, 1);
  expect(many!.height).toBeCloseTo(one!.height, 1);
  expect(many!.width).toBeGreaterThan(many!.height);
});

test('the count stands 6px from its label, nearer than the next tab', async () => {
  const el = await mount();
  const [agents, runs] = [...el.querySelectorAll('[role="tab"]')];
  const label = box(agents!.querySelector('.crewlet-tabs__label')!);
  const count = box(agents!.querySelector('.crewlet-count')!);
  expect(count.left - label.right).toBeCloseTo(6, 1);
  expect(box(runs!.querySelector('.crewlet-tabs__label')!).left - count.right).toBeGreaterThan(12);
});
