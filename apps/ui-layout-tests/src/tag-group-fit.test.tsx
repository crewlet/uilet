/**
 * A ONE-LINE TAG GROUP NEVER CLIPS ITS CHIP, measured: in a cell too narrow
 * for a tag and the chip naming the rest, the tag gives way and cuts its
 * label, and the chip stands whole inside the group's box.
 */
import { afterEach, expect, test } from 'vitest';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import type { ReactNode } from 'react';
import { Tag, TagGroup } from '@crewlethq/ui';

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
  // The group measures after layout and settles over a frame or two.
  await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
  return host;
}

const problems = (width: number) => (
  <div style={{ width }}>
    <TagGroup label="Problems" overflow="fit" noun={{ one: 'problem', other: 'problems' }}>
      <Tag variant="danger">Rate limited</Tag>
      <Tag variant="danger">Timed out</Tag>
      <Tag variant="warning">Out of budget</Tag>
    </TagGroup>
  </div>
);

test.each([140, 200])('at %ipx the chip stands whole inside the group and names what it hides', async (width) => {
  const at = await mount(problems(width));
  const group = at.querySelector('.crewlet-tag-group')!.getBoundingClientRect();
  const chip = at.querySelector('.crewlet-list-overflow')!;
  const box = chip.getBoundingClientRect();
  expect(chip.textContent).toMatch(/^\+\d more problems?$/);
  expect(box.right).toBeLessThanOrEqual(group.right + 0.5);
  expect(box.bottom).toBeLessThanOrEqual(group.bottom + 0.5);
  expect(box.top).toBeGreaterThanOrEqual(group.top - 0.5);
});

test('where there is room, every tag is drawn and no chip', async () => {
  const at = await mount(problems(480));
  expect(at.querySelectorAll('.crewlet-tag')).toHaveLength(3);
  expect(at.querySelector('.crewlet-list-overflow')).toBeNull();
});
