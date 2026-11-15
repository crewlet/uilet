/**
 * A CARD'S TITLE IS READ IN FULL ON A PHONE. The head keeps to one line while
 * a subtitle beside the title has a tail to give up; on a narrow card the
 * subtitle takes a line of its own, and a title wider than the room the head's
 * controls leave used to be cut at their edge ("Scratch repositories and com"
 * beside a Configuration link). It takes a second line instead, and a wide
 * card still draws its head on one.
 */
import { afterEach, expect, test } from 'vitest';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import type { ReactNode } from 'react';
import { Card } from '@crewlethq/ui';

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

const TITLE = 'Scratch repositories and commit identity';

function PolicyCard({ truncate = false }: { truncate?: boolean }) {
  return (
    <Card padding="none">
      <Card.Header
        subtitle="What the configuration's code block sets"
        actions={
          <a className="t-link" href="#/settings/config">
            Configuration
          </a>
        }
      >
        <Card.Title as="h3" truncate={truncate}>
          {TITLE}
        </Card.Title>
      </Card.Header>
    </Card>
  );
}

function title(at: HTMLElement): HTMLElement {
  return at.querySelector<HTMLElement>('.crewlet-card__title')!;
}

test('on a phone the title takes a second line rather than ending at the controls', async () => {
  // A 390px screen less the page's own inset.
  const at = await mount(358, <PolicyCard />);
  const t = title(at);
  const link = at.querySelector<HTMLElement>('.crewlet-card__header-actions')!;
  // Every word drawn inside the title's own box: nothing clipped.
  expect(t.scrollWidth).toBeLessThanOrEqual(t.clientWidth);
  expect(t.textContent).toBe(TITLE);
  // On two lines, and the link still beside it rather than over it.
  const line = parseFloat(getComputedStyle(t).lineHeight);
  expect(t.getBoundingClientRect().height).toBeGreaterThan(line * 1.5);
  expect(t.getBoundingClientRect().right).toBeLessThanOrEqual(link.getBoundingClientRect().left);
});

test('a wide card keeps its head on one line', async () => {
  const at = await mount(900, <PolicyCard />);
  const t = title(at);
  const line = parseFloat(getComputedStyle(t).lineHeight);
  expect(t.getBoundingClientRect().height).toBeLessThan(line * 1.5);
  expect(t.scrollWidth).toBeLessThanOrEqual(t.clientWidth);
});

test('a title that asked to be truncated still ends with an ellipsis on a phone', async () => {
  const at = await mount(358, <PolicyCard truncate />);
  const t = title(at);
  const line = parseFloat(getComputedStyle(t).lineHeight);
  expect(t.getBoundingClientRect().height).toBeLessThan(line * 1.5);
  expect(getComputedStyle(t).textOverflow).toBe('ellipsis');
});
