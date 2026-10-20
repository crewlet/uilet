/**
 * Handing work to an agent: the brief first and its starters while it is
 * empty, what goes with it, the task as filed, and one commit that says why it
 * is held and is pressed by Command+Enter from anywhere in the panel.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { useState } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { Avatar } from '../Avatar/index.js';
import { AgentHandoffPanel, type AgentHandoffPanelProps } from './index.js';

afterEach(cleanup);

function Harness(props: Partial<AgentHandoffPanelProps> & { initial?: string }) {
  const { initial = '', ...rest } = props;
  const [brief, setBrief] = useState(initial);
  return (
    <AgentHandoffPanel
      onClose={() => {}}
      brief={brief}
      onBriefChange={setBrief}
      briefLabel="What should the doc cover?"
      agent={<input aria-label="Agent" />}
      send={{ label: 'Ask SRE Lead', onSend: () => {} }}
      {...rest}
    />
  );
}

test('is a region named "Ask an agent" with its brief labelled', () => {
  render(<Harness />);
  expect(screen.getByRole('complementary', { name: 'Ask an agent' })).toBeTruthy();
  expect(screen.getByRole('textbox', { name: 'What should the doc cover?' })).toBeTruthy();
  expect(screen.getByRole('heading', { level: 3, name: 'Who builds it' })).toBeTruthy();
});

test('starters fill the brief while it is empty, and step aside once it is written', () => {
  const onStarter = vi.fn();
  render(<Harness starters={[{ key: 'guide', label: 'Onboarding guide' }]} onStarter={onStarter} />);
  fireEvent.click(screen.getByRole('button', { name: 'Onboarding guide' }));
  expect(onStarter).toHaveBeenCalledWith('guide');
  fireEvent.change(screen.getByRole('textbox', { name: 'What should the doc cover?' }), {
    target: { value: 'A guide' },
  });
  expect(screen.queryByRole('button', { name: 'Onboarding guide' })).toBeNull();
});

test('lists what goes with the brief, and the task exactly as it is filed', () => {
  render(
    <Harness
      carried={[
        {
          key: 'draft',
          label: 'Your draft',
          detail: '214 words, for the agent to build on',
        },
      ]}
      task={{ title: 'Incident guide', body: 'The body as sent' }}
    />,
  );
  expect(screen.getByText('Your draft')).toBeTruthy();
  expect(screen.getByText('214 words, for the agent to build on')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'The task as it is filed' }));
  expect(screen.getByText('The body as sent')).toBeTruthy();
});

test('a held send says why in words beside it and does not send', () => {
  const onSend = vi.fn();
  render(
    <Harness
      send={{
        label: 'Ask SRE Lead',
        onSend,
        disabledReason: 'Say what the doc should cover.',
      }}
    />,
  );
  const button = screen.getByRole('button', { name: 'Ask SRE Lead' });
  expect(button.getAttribute('aria-disabled')).toBe('true');
  expect(screen.getAllByText('Say what the doc should cover.').length).toBeGreaterThan(0);
  fireEvent.click(button);
  expect(onSend).not.toHaveBeenCalled();
});

test('Command+Enter sends from the brief and from any other field in the panel, once', () => {
  const onSend = vi.fn();
  const page = vi.fn();
  window.addEventListener('keydown', page);
  render(<Harness initial="A guide" send={{ label: 'Ask SRE Lead', onSend }} />);
  fireEvent.keyDown(screen.getByRole('textbox', { name: 'What should the doc cover?' }), {
    key: 'Enter',
    metaKey: true,
  });
  expect(onSend).toHaveBeenCalledTimes(1);
  fireEvent.keyDown(screen.getByRole('textbox', { name: 'Agent' }), {
    key: 'Enter',
    ctrlKey: true,
  });
  expect(onSend).toHaveBeenCalledTimes(2);
  // ANSWERED IN THE PANEL: a page-wide shortcut behind it sees a handled press.
  expect(page.mock.calls.every(([e]) => (e as KeyboardEvent).defaultPrevented)).toBe(true);
  window.removeEventListener('keydown', page);
});

test("the send's media is a picture beside its words, hidden from its name", () => {
  render(
    <Harness
      initial="A guide"
      send={{
        label: 'Ask SRE Lead',
        media: <Avatar name="SRE Lead" kind="agent" size="xs" />,
        onSend: () => {},
      }}
    />,
  );
  const button = screen.getByRole('button', { name: 'Ask SRE Lead' });
  expect(button.querySelector('.crewlet-agent-handoff__media')?.getAttribute('aria-hidden')).toBe('true');
});

test('Command+Enter on the page beside the panel belongs to the page, never a send', () => {
  const onSend = vi.fn();
  render(
    <>
      <input aria-label="The page" />
      <Harness initial="A guide" send={{ label: 'Ask SRE Lead', onSend }} />
    </>,
  );
  fireEvent.keyDown(screen.getByRole('textbox', { name: 'The page' }), { key: 'Enter', metaKey: true });
  expect(onSend).not.toHaveBeenCalled();
});

test('a busy send keeps its words and presses nothing', () => {
  const onSend = vi.fn();
  render(<Harness initial="A guide" send={{ label: 'Ask SRE Lead', onSend, busy: true }} />);
  fireEvent.keyDown(screen.getByRole('textbox', { name: 'What should the doc cover?' }), {
    key: 'Enter',
    metaKey: true,
  });
  expect(onSend).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Ask SRE Lead' }).getAttribute('aria-busy')).toBe('true');
});

test('has no accessibility violations', async () => {
  const { container } = render(
    <Harness
      starters={[{ key: 'a', label: 'Guide' }]}
      onStarter={() => {}}
      carried={[{ key: 'draft', label: 'Your draft' }]}
      steps={['A task is filed.', 'The agent drafts it.']}
    />,
  );
  const result = await axe.run(container, {
    runOnly: {
      type: 'tag',
      values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'],
    },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations.map((violation) => violation.id)).toEqual([]);
});
