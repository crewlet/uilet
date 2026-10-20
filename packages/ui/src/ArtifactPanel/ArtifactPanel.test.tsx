/**
 * A panel at the artifact's side: named by its heading, focus taken on open
 * and handed back on close, Escape from anywhere inside it, and the workspace
 * that lays it beside the artifact or over it.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { useState } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { Section } from '../Section/index.js';
import { ArtifactPanel, ArtifactWorkspace } from './index.js';

afterEach(cleanup);

function Harness({ focusOnOpen = true }: { focusOnOpen?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <ArtifactWorkspace
      bodyLabel="Notes"
      panel={
        open ? (
          <ArtifactPanel title="History" onClose={() => setOpen(false)} focusOnOpen={focusOnOpen}>
            <input aria-label="Label" />
          </ArtifactPanel>
        ) : null
      }
    >
      <button type="button" onClick={() => setOpen((o) => !o)}>
        History
      </button>
    </ArtifactWorkspace>
  );
}

test('is a region named by its heading', () => {
  render(
    <ArtifactPanel title="Details" onClose={() => {}}>
      <p>Facts</p>
    </ArtifactPanel>,
  );
  expect(screen.getByRole('complementary', { name: 'Details' })).toBeTruthy();
  expect(screen.getByRole('heading', { level: 2, name: 'Details' })).toBeTruthy();
});

test('a section inside heads one level under the panel', () => {
  render(
    <ArtifactPanel title="Settings" onClose={() => {}}>
      <Section title="Owner">
        <p>Miles</p>
      </Section>
    </ArtifactPanel>,
  );
  expect(screen.getByRole('heading', { level: 3, name: 'Owner' })).toBeTruthy();
});

test('opening moves focus to its heading, and closing from inside hands it back', () => {
  render(<Harness />);
  const trigger = screen.getByRole('button', { name: 'History' });
  trigger.focus();
  fireEvent.click(trigger);
  expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'History' }));
  fireEvent.click(screen.getByRole('button', { name: 'Close history' }));
  expect(screen.queryByRole('complementary')).toBeNull();
  expect(document.activeElement).toBe(trigger);
});

test('a panel a link opened on arrival leaves focus where it was', () => {
  function Arrived() {
    return (
      <ArtifactPanel title="History" onClose={() => {}} focusOnOpen={false}>
        <p>Versions</p>
      </ArtifactPanel>
    );
  }
  const before = document.activeElement;
  render(<Arrived />);
  expect(document.activeElement).toBe(before);
});

test('Escape closes it from a field inside', () => {
  render(<Harness />);
  fireEvent.click(screen.getByRole('button', { name: 'History' }));
  const field = screen.getByRole('textbox', { name: 'Label' });
  field.focus();
  fireEvent.keyDown(field, { key: 'Escape' });
  expect(screen.queryByRole('complementary')).toBeNull();
});

test('an Escape something inside already answered is left alone', () => {
  const onClose = vi.fn();
  render(
    <ArtifactPanel title="History" onClose={onClose}>
      <input aria-label="Label" onKeyDown={(e) => e.preventDefault()} />
    </ArtifactPanel>,
  );
  fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' });
  expect(onClose).not.toHaveBeenCalled();
});

test('expanding is a control of its head, named for what it does', () => {
  const onExpandedChange = vi.fn();
  const { rerender } = render(
    <ArtifactPanel title="Data" onClose={() => {}} onExpandedChange={onExpandedChange}>
      <p>Rows</p>
    </ArtifactPanel>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Expand to the full view' }));
  expect(onExpandedChange).toHaveBeenCalledWith(true);
  rerender(
    <ArtifactPanel title="Data" onClose={() => {}} expanded onExpandedChange={onExpandedChange}>
      <p>Rows</p>
    </ArtifactPanel>,
  );
  expect(screen.getByRole('button', { name: 'Back to the side' })).toBeTruthy();
});

test('the workspace says whether a panel is open, and expanded', () => {
  const { container, rerender } = render(
    <ArtifactWorkspace panel={null}>
      <p>Body</p>
    </ArtifactWorkspace>,
  );
  const ws = container.querySelector('.crewlet-artifact-workspace')!;
  expect(ws.getAttribute('data-panel')).toBeNull();
  rerender(
    <ArtifactWorkspace expanded panel={<ArtifactPanel title="Data" onClose={() => {}}>Rows</ArtifactPanel>}>
      <p>Body</p>
    </ArtifactWorkspace>,
  );
  expect(ws.getAttribute('data-panel')).toBe('expanded');
});

test('carries no axe violation', async () => {
  const { container } = render(
    <main>
      <ArtifactWorkspace
        bodyLabel="Notes"
        panel={
          <ArtifactPanel title="Details" onClose={() => {}} onExpandedChange={() => {}}>
            <dl>
              <dt>Owner</dt>
              <dd>Miles</dd>
            </dl>
          </ArtifactPanel>
        }
      >
        <p>Body</p>
      </ArtifactWorkspace>
    </main>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations.map((violation) => violation.id)).toEqual([]);
});

test('a footer stays outside the scrolling body, at the panel foot', () => {
  render(
    <ArtifactPanel title="Ask" onClose={() => {}} footer={<button type="button">Send</button>}>
      <p>Brief</p>
    </ArtifactPanel>,
  );
  const send = screen.getByRole('button', { name: 'Send' });
  const body = screen.getByText('Brief').closest('.crewlet-artifact-panel__body');
  expect(body?.contains(send)).toBe(false);
  expect(send.closest('.crewlet-artifact-panel__foot')).toBeTruthy();
});
