/**
 * A menu drawn as a value of pills is pointed at pill by pill: the pill under
 * the pointer draws its hover, and the trigger paints no ground over the rest.
 */
import { afterEach, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { Menu, Tag } from '@crewlethq/ui';

let root: Root | null = null;
let host: HTMLElement | null = null;

afterEach(() => {
  flushSync(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

const ITEMS = [{ key: 'security', label: 'Security', onSelect: () => {} }];

async function mount(): Promise<HTMLElement> {
  host = document.createElement('div');
  host.style.width = '320px';
  document.body.append(host);
  root = createRoot(host);
  flushSync(() =>
    root!.render(
      <>
        <Menu
          label="Labels of ENG-1"
          valueTrigger
          trigger={
            <span style={{ display: 'inline-flex', gap: 4 }}>
              <Tag appearance="outline">repo:frontend</Tag>
              <Tag appearance="outline">security</Tag>
            </span>
          }
          items={ITEMS}
        />
        <Menu label="Status of ENG-1" valueTrigger trigger="In progress" items={ITEMS} />
        <Tag appearance="outline" onClick={() => {}}>
          Billing
        </Tag>
      </>,
    ),
  );
  await document.fonts.ready;
  return host;
}

/** A token's colour as the browser computes it, for comparing with a drawn one. */
function token(name: string): string {
  const probe = document.createElement('span');
  probe.style.borderTop = `1px solid var(${name})`;
  host!.append(probe);
  const color = getComputedStyle(probe).borderTopColor;
  probe.remove();
  return color;
}

const TRANSPARENT = 'rgba(0, 0, 0, 0)';
const ground = (el: Element) => getComputedStyle(el).backgroundColor;
const edge = (el: Element) => getComputedStyle(el).borderTopColor;
/** Hovers `el` and waits out the transitions the hover started under `root`. */
async function hover(el: Element, root: Element = el): Promise<void> {
  await userEvent.hover(el);
  await Promise.all(root.getAnimations({ subtree: true }).map((a) => a.finished));
}

test('the pill under the pointer draws its hover, and the trigger no ground', async () => {
  const at = await mount();
  const trigger = at.querySelector<HTMLElement>('.crewlet-menu__value-trigger')!;
  const [first, second] = trigger.querySelectorAll<HTMLElement>('.crewlet-tag');
  const rest = edge(second!);
  await hover(first!, trigger);
  expect(ground(trigger)).toBe(TRANSPARENT);
  expect(edge(first!)).toBe(token('--color-border-strong-hover'));
  expect(edge(first!)).not.toBe(rest);
  expect(edge(second!)).toBe(rest);
});

test('a value of words keeps the ground its hover paints', async () => {
  const at = await mount();
  const words = at.querySelectorAll<HTMLElement>('.crewlet-menu__value-trigger')[1]!;
  await hover(words);
  expect(ground(words)).not.toBe(TRANSPARENT);
});

test('a neutral outline pill that acts draws a hover past its resting edge', async () => {
  const at = await mount();
  const pill = at.querySelector<HTMLElement>('button.crewlet-tag')!;
  const rest = edge(pill);
  await hover(pill);
  expect(edge(pill)).toBe(token('--color-border-strong-hover'));
  expect(edge(pill)).not.toBe(rest);
});
