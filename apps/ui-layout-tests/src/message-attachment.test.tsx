/**
 * WHAT A MESSAGE CARRIED STAYS INSIDE ITS WIDTH: a tag under the reader's own
 * bubble whose label is longer than the message can be wide cuts its label
 * with an ellipsis, rather than standing out past the message's start edge.
 */
import { afterEach, expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import type { ReactNode } from 'react';
import { Inline, MessageBubble, Tag } from '@crewlethq/ui';

let root: Root | null = null;
let host: HTMLElement | null = null;

afterEach(() => {
  flushSync(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

const TITLE = 'Advisor › Agent runs ended on their round cap before they finished.';

async function draw(attachment: ReactNode) {
  await page.viewport(390, 844);
  host = document.createElement('div');
  host.style.cssText = 'width: 358px; display: flex; flex-direction: column; padding: 0 16px;';
  document.body.append(host);
  root = createRoot(host);
  flushSync(() =>
    root!.render(
      <MessageBubble from="self" attachment={attachment}>
        Short question?
      </MessageBubble>,
    ),
  );
  await document.fonts.ready;
  const message = host.querySelector('.crewlet-message')!.getBoundingClientRect();
  const tag = host.querySelector('.crewlet-tag')!.getBoundingClientRect();
  const label = host.querySelector<HTMLElement>('.crewlet-tag__label')!;
  return { message, tag, cut: label.scrollWidth > label.clientWidth };
}

// Mutation: drop the attachment row's max width, and the tag runs out of the
// message's start edge at its full length.
test('a tag longer than the message can be wide stays inside it, its label cut', async () => {
  for (const attachment of [
    <Tag key="tag" size="xs" appearance="outline">{TITLE}</Tag>,
    <Inline key="inline" gap={1} wrap>
      <Tag size="xs" appearance="outline">{TITLE}</Tag>
    </Inline>,
  ]) {
    const at = await draw(attachment);
    expect(at.tag.left).toBeGreaterThanOrEqual(at.message.left - 0.5);
    expect(at.tag.right).toBeLessThanOrEqual(at.message.right + 0.5);
    expect(at.cut).toBe(true);
    flushSync(() => root?.unmount());
    host?.remove();
  }
  root = null;
  host = null;
});
