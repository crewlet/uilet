/**
 * A dialog whose title is one long identifier wraps it inside the head: the
 * title never runs under the close control or past the dialog's edge.
 */
import { afterEach, expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { LayerHost, Modal } from '@crewlethq/ui';

let root: Root | null = null;
let host: HTMLElement | null = null;

afterEach(() => {
  flushSync(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

const NAME = 'A_VERY_LONG_SECRET_NAME_FOR_THE_DATADOG_INTEGRATION_API_KEY';

test('on a phone a title that is one long identifier wraps inside the head', async () => {
  await page.viewport(390, 844);
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  flushSync(() =>
    root!.render(
      <LayerHost>
        <Modal open title={`Edit ${NAME}`} onClose={() => {}}>
          <p>Replaces the value on every node.</p>
        </Modal>
      </LayerHost>,
    ),
  );
  await document.fonts.ready;
  const title = document.querySelector<HTMLElement>('.crewlet-modal__title')!;
  const close = document.querySelector<HTMLElement>('.crewlet-modal__close')!;
  const dialog = document.querySelector<HTMLElement>('.crewlet-modal')!;
  expect(title.scrollWidth).toBeLessThanOrEqual(title.clientWidth);
  expect(title.getBoundingClientRect().right).toBeLessThanOrEqual(close.getBoundingClientRect().left);
  expect(dialog.getBoundingClientRect().right).toBeLessThanOrEqual(390);
});
