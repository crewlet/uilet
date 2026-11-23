/**
 * The prompt: one question, one answer, and nothing that abandons a request
 * whose outcome the reader has not seen.
 *
 * Every case here was a way the 0.2.0 prompt got that wrong: `submitting`
 * stopped the veil and left Escape and the close control open, the confirm
 * button was renamed to "Working" instead of reporting that it was busy, a
 * rejected confirm became an unhandled rejection, and Enter from a field did
 * nothing at all because the prompt was not a form.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test } from 'vitest';
import { useState } from 'react';
import { ConfirmModal } from './index.js';

afterEach(cleanup);

function press(key: string, init: Partial<KeyboardEventInit> = {}): boolean {
  return fireEvent.keyDown(document.activeElement ?? document.body, { key, ...init });
}

function veil(): HTMLElement {
  return document.querySelector<HTMLElement>('.crewlet-modal-overlay')!;
}

test('a prompt mid-request refuses Escape, the veil and the close control', () => {
  let closed = 0;
  render(
    <ConfirmModal
      open
      submitting
      onClose={() => { closed += 1; }}
      onConfirm={() => {}}
      title="Delete this project?"
      message="This cannot be undone."
    />,
  );
  press('Escape');
  fireEvent.pointerDown(veil());
  fireEvent.click(veil());
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(closed).toBe(0);
});

test('the confirm button reports that it is busy, and keeps its name', () => {
  render(
    <ConfirmModal
      open
      submitting
      onClose={() => {}}
      onConfirm={() => {}}
      title="Delete this project?"
      confirmLabel="Delete forever"
    />,
  );
  const confirm = screen.getByRole('button', { name: 'Delete forever' });
  expect(confirm.getAttribute('aria-busy')).toBe('true');
});

test('a destructive prompt is an alertdialog, so the whole question is announced', () => {
  render(
    <ConfirmModal
      open
      destructive
      onClose={() => {}}
      onConfirm={() => {}}
      title="Delete this project?"
      message="This cannot be undone."
    />,
  );
  const prompt = screen.getByRole('alertdialog', { name: 'Delete this project?' });
  expect(screen.queryByRole('dialog', { name: 'Delete this project?' })).toBeNull();
  // An alertdialog carries its question AND its consequence: the name says
  // what is being asked about, the description says what it costs.
  const said = document.getElementById(prompt.getAttribute('aria-describedby')!);
  expect(said?.textContent).toBe('This cannot be undone.');
});

test('the prompt is a form, so Enter from an acknowledgement confirms it', () => {
  let confirmed = 0;
  render(
    <ConfirmModal open onClose={() => {}} onConfirm={() => { confirmed += 1; }} title="Archive the discount?">
      <label htmlFor="phrase">Type ARCHIVE</label>
      <input id="phrase" />
    </ConfirmModal>,
  );
  const prompt = screen.getByRole('dialog', { name: 'Archive the discount?' });
  // The form is INSIDE the frame: a `<form role="dialog">` is not conformant,
  // and Enter from a control still reaches this one.
  fireEvent.submit(prompt.querySelector('form')!);
  expect(confirmed).toBe(1);
});

test('confirmDisabled refuses the button and the form alike, with a reason a reader can hear', () => {
  let confirmed = 0;
  render(
    <ConfirmModal
      open
      confirmDisabled
      confirmDisabledReason="Type ARCHIVE to continue."
      onClose={() => {}}
      onConfirm={() => { confirmed += 1; }}
      title="Archive the discount?"
    />,
  );
  const confirm = screen.getByRole('button', { name: /Confirm/ });
  expect(confirm.getAttribute('aria-disabled')).toBe('true');
  expect(screen.getByRole('dialog').textContent).toContain('Type ARCHIVE to continue.');
  fireEvent.click(confirm);
  // The key path as well: a soft-disabled button refuses its own click and has
  // nothing to say about Enter pressed in a field beside it.
  fireEvent.submit(screen.getByRole('dialog'));
  expect(confirmed).toBe(0);
});

test('a rejected confirm leaves the prompt open rather than reporting success', async () => {
  let closed = 0;
  render(
    <ConfirmModal
      open
      onClose={() => { closed += 1; }}
      onConfirm={() => Promise.reject(new Error('the gateway refused'))}
      title="Delete this project?"
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
  // Let the rejection settle: an unhandled one fails the run.
  await Promise.resolve();
  await Promise.resolve();
  expect(closed).toBe(0);
  expect(screen.getByRole('dialog', { name: 'Delete this project?' })).toBeDefined();
});

test('the prompt carries no accessibility violation', async () => {
  render(
    <ConfirmModal
      open
      destructive
      onClose={() => {}}
      onConfirm={() => {}}
      title="Delete this project?"
      message="This permanently removes the project and every key it holds."
      confirmLabel="Delete forever"
    >
      <label htmlFor="ack">
        <input id="ack" type="checkbox" /> I understand this cannot be undone
      </label>
    </ConfirmModal>,
  );
  const result = await axe.run(document.body, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations.map((violation) => violation.id)).toEqual([]);
});

test('a confirmation with changes and consequences draws them, the consequences under a rule', () => {
  render(
    <ConfirmModal
      open
      onClose={() => {}}
      onConfirm={() => {}}
      title="Move Site Reliability Engineer?"
      message="Its jobs move to the new model on their next turn."
      changes={[
        {
          key: 'sre',
          subject: 'Site Reliability Engineer',
          rows: [{ kind: 'changed', label: 'Coding', from: 'platform-sonnet-8', to: 'platform-opus-14' }],
        },
      ]}
      consequencesHeading="What follows"
      consequences={[{ kind: 'fact', key: 'turn', tone: 'follows', text: 'A running turn finishes first.' }]}
    />,
  );
  const body = document.querySelector('.crewlet-modal__body')!;
  const parts = Array.from(body.children).map((child) => child.className.split(' ')[0]);
  expect(parts).toEqual(['crewlet-modal__prompt-title', 'crewlet-modal__message', 'crewlet-change-groups', 'crewlet-consequence-list']);
  expect(screen.getByRole('group', { name: 'What follows' })).toBeTruthy();
  expect(body.textContent).toContain('Changed from platform-sonnet-8');
});

test('a required choice holds confirm until it is ticked, from the button and from Enter', () => {
  let confirmed = 0;
  function Rename() {
    const [ack, setAck] = useState(false);
    return (
      <ConfirmModal
        open
        onClose={() => {}}
        onConfirm={() => { confirmed += 1; }}
        title="Rename the company?"
        confirmLabel="Save"
        consequences={[
          { kind: 'choice', key: 'ack', label: 'I understand what renaming the company does', tone: 'danger', required: true, checked: ack, onCheckedChange: setAck },
        ]}
      />
    );
  }
  render(<Rename />);
  const save = screen.getByRole('button', { name: /Save/ });
  expect(save.getAttribute('aria-disabled')).toBe('true');
  fireEvent.click(save);
  fireEvent.submit(save.closest('form')!);
  expect(confirmed).toBe(0);
  fireEvent.click(screen.getByRole('checkbox', { name: 'I understand what renaming the company does' }));
  expect(screen.getByRole('button', { name: /Save/ }).getAttribute('aria-disabled')).not.toBe('true');
  fireEvent.submit(save.closest('form')!);
  expect(confirmed).toBe(1);
});

test('an alternative sits on the footer start and calls its own handler', () => {
  let disabled = 0;
  render(
    <ConfirmModal
      open
      destructive
      onClose={() => {}}
      onConfirm={() => {}}
      title="Remove linear"
      confirmLabel="Remove server"
      alternative={{ label: 'Disable instead', onSelect: () => { disabled += 1; } }}
    />,
  );
  const alternative = screen.getByRole('button', { name: 'Disable instead' });
  expect(alternative.closest('.crewlet-modal__footer-start')).toBeTruthy();
  fireEvent.click(alternative);
  expect(disabled).toBe(1);
});

test('a full confirmation has no axe violations', async () => {
  render(
    <ConfirmModal
      open
      destructive
      onClose={() => {}}
      onConfirm={() => {}}
      title="Remove team-sonnet"
      message="Used by 9 seats, Ask Crewlet and the Advisor."
      shape="framed"
      consequencesHeading="When you remove it"
      consequences={[
        { kind: 'choice', key: 'secret', label: 'Delete its secret', name: 'MODEL_TOKEN_TEAM_SONNET', checked: true, onCheckedChange: () => {} },
        { kind: 'fact', key: 'kept', tone: 'kept', text: 'Another model still uses the shared secret.' },
      ]}
      changes={[{ key: 'pm', subject: 'Product Manager', rows: [{ kind: 'changed', label: 'Coding', from: 'a', to: 'b' }] }]}
      alternative={{ label: 'Disable instead', onSelect: () => {} }}
    />,
  );
  const result = await axe.run(document.body, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations.map((violation) => violation.id)).toEqual([]);
});
