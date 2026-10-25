/** One message: an article named for who said it, on its writer's side, with what it carried under it. */
import { cleanup, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test } from 'vitest';
import { installMotion } from '../../../../apps/ui-tests/src/cascade.js';
import { Tag } from '../Tag/index.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';
import { MessageBubble } from './index.js';

afterEach(cleanup);

test('the reader’s own is named "You said" and carries the page it was sent with', () => {
  const { container } = render(
    <MessageBubble
      from="self"
      attachment={
        <Tag size="xs" appearance="outline">
          <VisuallyHidden>Sent with </VisuallyHidden>Work › Tasks
        </Tag>
      }
    >
      File a task for Agent SWE to fix the flaky sign-in test
    </MessageBubble>,
  );
  const message = screen.getByRole('article', { name: 'You said' });
  expect(message.className).toContain('crewlet-message--self');
  expect(container.querySelector('.crewlet-message__attachment')!.textContent).toBe('Sent with Work › Tasks');
});

test('anybody else’s takes the name it is given', () => {
  render(
    <MessageBubble from="other" label="Sam Rivera said">
      Can you check the runbook?
    </MessageBubble>,
  );
  expect(screen.getByRole('article', { name: 'Sam Rivera said' }).className).toContain('crewlet-message--other');
});

test('rises in only when asked, and never under reduced motion', () => {
  const uninstall = installMotion('reduce', 'MessageBubble/MessageBubble.css');
  const { container } = render(
    <MessageBubble from="self" animateIn>
      Hello
    </MessageBubble>,
  );
  expect(getComputedStyle(container.querySelector('.crewlet-message')!).animation).toBe('none');
  uninstall();
});

test('carries no axe violation', async () => {
  const { container } = render(
    <main>
      <MessageBubble from="self">Which budget runs out first?</MessageBubble>
      <MessageBubble from="other" label="Sam Rivera said">
        The weekly one.
      </MessageBubble>
    </main>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations).toEqual([]);
});
