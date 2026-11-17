/**
 * A POPOVER NEVER RUNS PAST ITS LAYER, measured.
 *
 * Its height was held to 360px or 60% of the window, whatever the layer it
 * opened in: in a layer shorter than that (a frame, a pane) the panel was
 * placed with its start in view and its end cut off by the layer's edge, its
 * last rows or a form's actions out of reach. It is now held to the layer's
 * room and scrolls, and a form may take that whole room to show at once.
 */
import { afterEach, expect, test } from 'vitest';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { Button, LayerHost, Popover, type PopoverHeight } from '@crewlethq/ui';

let root: Root | null = null;
let host: HTMLElement | null = null;

afterEach(() => {
  flushSync(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

/** A layer `tall` pixels high that clips, as a frame's does, with a trigger `from` pixels down. */
async function open(
  tall: number,
  from: number,
  height: PopoverHeight,
  content: number,
) {
  host = document.createElement('div');
  host.style.cssText = `position: fixed; left: 40px; top: 40px; width: 600px; height: ${tall}px; overflow: hidden;`;
  document.body.append(host);
  root = createRoot(host);
  flushSync(() =>
    root!.render(
      <LayerHost>
        <div style={{ position: 'absolute', left: 40, top: from }}>
          <Popover
            label='New comment'
            height={height}
            defaultOpen
            trigger={(_, toggle) => <Button onClick={toggle}>Comment</Button>}
          >
            <div style={{ height: content, padding: 'var(--spacing-3)' }}>
              A form
            </div>
          </Popover>
        </div>
      </LayerHost>,
    ),
  );
  const panel = await waitForPanel();
  return { panel, layer: host.getBoundingClientRect() };
}

async function waitForPanel(): Promise<HTMLElement> {
  for (let i = 0; i < 50; i++) {
    const panel = document.querySelector<HTMLElement>('.crewlet-popover');
    if (panel && panel.style.visibility !== 'hidden' && panel.style.top)
      return panel;
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
  throw new Error('the panel was never placed');
}

function expectInside(panel: HTMLElement, layer: DOMRect) {
  const box = panel.getBoundingClientRect();
  expect(box.top).toBeGreaterThanOrEqual(layer.top);
  expect(box.bottom).toBeLessThanOrEqual(layer.bottom);
  expect(box.left).toBeGreaterThanOrEqual(layer.left);
  expect(box.right).toBeLessThanOrEqual(layer.right);
}

test('in a layer shorter than the panel, it is held inside and scrolls, whichever height it asks', async () => {
  for (const height of ['capped', 'layer'] as const) {
    const { panel, layer } = await open(220, 180, height, 500);
    expectInside(panel, layer);
    expect(panel.scrollHeight).toBeGreaterThan(panel.clientHeight);
    flushSync(() => root?.unmount());
    host?.remove();
  }
});

test('a form shows whole where its layer has room, past the cap a list keeps', async () => {
  const capped = await open(800, 40, 'capped', 500);
  expect(capped.panel.getBoundingClientRect().height).toBeLessThanOrEqual(360);
  expect(capped.panel.scrollHeight).toBeGreaterThan(capped.panel.clientHeight);
  flushSync(() => root?.unmount());
  host?.remove();

  const form = await open(800, 40, 'layer', 500);
  expectInside(form.panel, form.layer);
  expect(form.panel.scrollHeight).toBeLessThanOrEqual(form.panel.clientHeight);
});
