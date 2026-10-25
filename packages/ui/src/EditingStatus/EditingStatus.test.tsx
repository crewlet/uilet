import { cleanup, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test } from 'vitest';
import { installSheets, pseudoElement } from '../../../../apps/ui-tests/src/cascade.js';
import { EditingStatus } from './EditingStatus.js';

let uninstall: (() => void) | undefined;
afterEach(() => {
  uninstall?.();
  uninstall = undefined;
  cleanup();
});

/** The whole status's text, as copied or read by a script: never a stray comma or a word twice. */
const whole = (container: HTMLElement) => container.querySelector('.crewlet-editing-status')!.textContent;

test('says editing, and adds unsaved changes once something differs', () => {
  const { rerender, container } = render(<EditingStatus dirty={false} />);
  const status = screen.getByRole('status');
  expect(status.textContent).toBe('Editing');
  rerender(<EditingStatus dirty />);
  // A space for the ear between the two words; the dot is the stylesheet's.
  expect(status.textContent).toBe('Editing Unsaved changes');
  expect(container.querySelector('.crewlet-editing-status')!.className).toContain('crewlet-editing-status--dirty');
  rerender(<EditingStatus dirty saving />);
  expect(status.textContent).toBe('Editing Saving');
  expect(whole(container)).toBe('Editing Saving');
});

test('takes its words from the caller', () => {
  render(<EditingStatus dirty labels={{ editing: 'Drafting', unsaved: 'Not published' }} />);
  expect(screen.getByRole('status').textContent).toBe('Drafting Not published');
});

test('with a last save, shows how long ago after the state, outside the live region', () => {
  const at = Date.now() - 24_000;
  const { rerender, container } = render(<EditingStatus dirty={false} savedAt={at} labels={{ editing: 'Draft' }} />);
  const status = screen.getByRole('status');
  // Announced once, when the save lands: the words, not the ticking time.
  expect(status.textContent).toBe('Draft Saved');
  const time = container.querySelector('time.crewlet-editing-status__ago')!;
  expect(status.contains(time)).toBe(false);
  expect(time.getAttribute('datetime')).toBe(new Date(at).toISOString());
  // The whole text reads once, in order, with no comma and no word twice.
  expect(whole(container)).toBe(`Draft Saved ${time.textContent}`);
  expect(whole(container)).toMatch(/^Draft Saved \S.*ago$/);
  // Unsaved edits and a save in flight say so instead, with no time.
  rerender(<EditingStatus dirty savedAt={at} labels={{ editing: 'Draft' }} />);
  expect(whole(container)).toBe('Draft Unsaved changes');
  rerender(<EditingStatus dirty saving savedAt={at} labels={{ editing: 'Draft' }} />);
  expect(whole(container)).toBe('Draft Saving');
});

test('the saved word is the caller’s, and a time that does not read shows nothing', () => {
  const { container, rerender } = render(
    <EditingStatus dirty={false} savedAt={Date.now() - 120_000} labels={{ editing: 'Entwurf', saved: 'Gespeichert' }} />,
  );
  expect(screen.getByRole('status').textContent).toBe('Entwurf Gespeichert');
  rerender(<EditingStatus dirty={false} savedAt="not a time" labels={{ editing: 'Entwurf', saved: 'Gespeichert' }} />);
  expect(whole(container)).toBe('Entwurf');
});

test('the dot between the label and the state is drawn, never part of the text', () => {
  uninstall = installSheets('EditingStatus/EditingStatus.css');
  const { container } = render(<EditingStatus dirty={false} savedAt={Date.now() - 24_000} labels={{ editing: 'Draft' }} />);
  const state = container.querySelector('.crewlet-editing-status__state')!;
  expect(getComputedStyle(pseudoElement(state, 'before')).content).toBe('"·"');
  expect(whole(container)).not.toContain('·');
});

test('carries no axe violation, saved and unsaved', async () => {
  const { container } = render(
    <main>
      <EditingStatus dirty={false} savedAt={Date.now() - 24_000} labels={{ editing: 'Draft' }} />
      <EditingStatus dirty />
    </main>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations.map((violation) => violation.id)).toEqual([]);
});
