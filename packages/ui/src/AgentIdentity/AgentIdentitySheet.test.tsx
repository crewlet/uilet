/**
 * The one set-up sheet: three steps the same on every vendor, the value to
 * copy with its rule, the file or token brought back, Make it for me where
 * Crewlet can, and the check drawn only as it answers.
 */

import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test, vi } from 'vitest';
import type { ModalProps } from '../Modal/index.js';
import { Modal } from '../Modal/index.js';
import {
  AgentIdentitySheet,
  type AgentIdentityBrought,
  type AgentIdentitySheetProps,
  type AgentIdentityVerdict,
} from './index.js';

afterEach(cleanup);

const APPLE: Omit<AgentIdentitySheetProps, 'onCheck' | 'onClose'> = {
  open: true,
  agent: 'Growth Marketer',
  vendor: 'Apple',
  why: 'Apple then records its submissions under its own key.',
  steps: [
    { text: 'Open Users and Access, then Integrations, then Team Keys.' },
    {
      text: 'Name:',
      copy: { label: "key's name", value: 'crewlet-growth', rule: 'Lowercase letters, digits and hyphens, at most 30.' },
    },
    { text: 'Access: App Manager. Never Admin.' },
  ],
  link: { label: 'Open Team Keys', href: 'https://appstoreconnect.apple.com/access/integrations/api' },
  note: 'Only the Account Holder or an Admin can make team keys.',
  handIn: {
    kind: 'file',
    accept: '.p8',
    hint: 'The file Apple offered: AuthKey_<Key ID>.p8',
    field: { label: 'Key ID', fromName: /^AuthKey_([A-Z0-9]{10})\.p8$/ },
  },
  reads: [
    { id: 'sign', label: "Sign in with the key and the team's issuer" },
    { id: 'role', label: 'Read its role' },
    { id: 'apps', label: "Read the agent's apps" },
  ],
};

/** A check the test answers by hand. */
function deferred() {
  let answer!: (v: AgentIdentityVerdict) => void;
  let refuse!: (e: unknown) => void;
  const promise = new Promise<AgentIdentityVerdict>((ok, fail) => {
    answer = ok;
    refuse = fail;
  });
  return { promise, answer, refuse };
}

function sheet(extra: Partial<AgentIdentitySheetProps> = {}) {
  const pending = deferred();
  const onCheck = vi.fn((_: AgentIdentityBrought) => pending.promise);
  const onClose = vi.fn();
  const utils = render(<AgentIdentitySheet {...APPLE} onCheck={onCheck} onClose={onClose} {...extra} />);
  return { ...utils, onCheck, onClose, pending };
}

const dialog = () => screen.getByRole('dialog', { name: 'Set up identity: Growth Marketer' });
const button = (name: string | RegExp) => within(dialog()).getByRole('button', { name });
const steps = () => within(dialog()).getByRole('list', { name: "Setting up Growth Marketer's identity at Apple" });

/** Each read's state, as the list draws it. */
const readStates = (list: HTMLElement) =>
  within(list)
    .getAllByRole('listitem')
    .map((li) => /crewlet-step-list__step--(\w+)/.exec(li.className)?.[1]);

function chooseFile(name: string) {
  const input = dialog().querySelector<HTMLInputElement>('input[type="file"]')!;
  const file = new File(['-----BEGIN PRIVATE KEY-----'], name, { type: 'application/octet-stream' });
  fireEvent.change(input, { target: { files: [file] } });
  return file;
}

test('opens on the vendor step of three, titled for the agent, with the vendor\'s numbered steps', () => {
  sheet();
  expect(dialog()).toBeTruthy();
  const items = within(steps()).getAllByRole('listitem');
  expect(items.map((i) => i.textContent)).toEqual([
    expect.stringContaining('At Apple'),
    expect.stringContaining('Back here'),
    expect.stringContaining('Check'),
  ]);
  expect(within(steps()).getByText('At Apple').closest('[aria-current="step"]')).toBeTruthy();
  const numbered = within(dialog()).getByRole('region', { name: 'At Apple' }).querySelector('ol');
  expect(numbered?.querySelectorAll(':scope > li')).toHaveLength(3);
  expect(within(dialog()).getByRole('link', { name: /Open Team Keys/ }).getAttribute('href')).toBe(
    'https://appstoreconnect.apple.com/access/integrations/api',
  );
  expect(within(dialog()).getByText('Only the Account Holder or an Admin can make team keys.')).toBeTruthy();
});

test('draws the suggested name ready to copy, with the vendor\'s rule under it', () => {
  sheet();
  expect(within(dialog()).getByRole('button', { name: "Copy the key's name" })).toBeTruthy();
  expect(within(dialog()).getByText('crewlet-growth')).toBeTruthy();
  expect(within(dialog()).getByText('Lowercase letters, digits and hyphens, at most 30.')).toBeTruthy();
});

test('a replacement is titled Replace identity', () => {
  sheet({ replacing: true });
  expect(screen.getByRole('dialog', { name: 'Replace identity: Growth Marketer' })).toBeTruthy();
});

test('reads the key ID from the file\'s name and sends the file, the ID and nothing else', async () => {
  const { onCheck } = sheet();
  fireEvent.click(button('Next'));
  const check = button('Check');
  expect(check.getAttribute('aria-disabled')).toBe('true');
  const file = chooseFile('AuthKey_7KQ4M2ZX9P.p8');
  expect((within(dialog()).getByRole('textbox', { name: 'Key ID' }) as HTMLInputElement).value).toBe('7KQ4M2ZX9P');
  expect(within(dialog()).getByText('AuthKey_7KQ4M2ZX9P.p8')).toBeTruthy();
  fireEvent.click(button('Check'));
  expect(onCheck).toHaveBeenCalledWith({ made: false, file, field: '7KQ4M2ZX9P' });
});

test('refuses a file of another kind and says which one to choose', () => {
  sheet();
  fireEvent.click(button('Next'));
  chooseFile('notes.txt');
  expect(within(dialog()).getByText('Choose the .p8 file Apple gave you.')).toBeTruthy();
  expect(button('Check').getAttribute('aria-disabled')).toBe('true');
});

test('says nothing is done while the check runs, then every read done when it works', async () => {
  const { pending, onClose } = sheet();
  fireEvent.click(button('Next'));
  chooseFile('AuthKey_7KQ4M2ZX9P.p8');
  fireEvent.click(button('Check'));
  const reads = within(dialog()).getByRole('list', { name: "Checking Growth Marketer's identity at Apple" });
  const states = () => readStates(reads);
  expect(states()).toEqual(['running', 'pending', 'pending']);
  expect(button('Check').getAttribute('aria-busy')).toBe('true');
  await act(async () => pending.answer({ ok: true, view: <p>Works. Crewlet keeps it.</p> }));
  expect(states()).toEqual(['done', 'done', 'done']);
  expect(within(dialog()).getByText('Works. Crewlet keeps it.')).toBeTruthy();
  fireEvent.click(button('Done'));
  expect(onClose).toHaveBeenCalled();
});

test('marks the read a refusal stopped at, leaves the rest unmade, and Try again goes back for a new file', async () => {
  const { pending } = sheet();
  fireEvent.click(button('Next'));
  chooseFile('AuthKey_7KQ4M2ZX9P.p8');
  fireEvent.click(button('Check'));
  await act(async () =>
    pending.answer({ ok: false, failedAt: 'role', view: <p>Apple answered, but with the wrong role.</p> }),
  );
  const reads = within(dialog()).getByRole('list', { name: "Checking Growth Marketer's identity at Apple" });
  expect(readStates(reads)).toEqual([
    'done',
    'failed',
    'pending',
  ]);
  fireEvent.click(button('Try again'));
  expect(within(dialog()).getByRole('region', { name: 'Back here' })).toBeTruthy();
  expect(within(dialog()).getByText('Drop the file here')).toBeTruthy();
});

test('a check that throws is drawn as one that did not finish', async () => {
  const { pending } = sheet();
  fireEvent.click(button('Next'));
  chooseFile('AuthKey_7KQ4M2ZX9P.p8');
  fireEvent.click(button('Check'));
  await act(async () => pending.refuse(new Error('The engine did not answer.')));
  expect(within(dialog()).getByText('The check did not finish')).toBeTruthy();
  expect(within(dialog()).getByText('The engine did not answer.')).toBeTruthy();
  expect(button('Try again')).toBeTruthy();
});

test('a token is pasted into a password field and sent trimmed', () => {
  const { onCheck } = sheet({ handIn: { kind: 'token', label: 'Robot token', hint: 'Shown once at Expo.' } });
  fireEvent.click(button('Next'));
  const field = within(dialog()).getByLabelText('Robot token') as HTMLInputElement;
  expect(field.type).toBe('password');
  fireEvent.change(field, { target: { value: '  expo_abc  ' } });
  fireEvent.click(button('Check'));
  expect(onCheck).toHaveBeenCalledWith({ made: false, token: 'expo_abc' });
});

test('Make it for me runs the check at once, listing what Crewlet does before the reads', () => {
  const { onCheck } = sheet({
    handIn: { kind: 'nothing', text: 'Nothing to bring back.' },
    make: {
      title: 'Crewlet can make it for you',
      body: 'With the company\'s admin token. 3 of 10 system users used.',
      reads: [{ id: 'make', label: 'Make the system user' }],
    },
  });
  expect(within(steps()).getByText('Crewlet can make it')).toBeTruthy();
  // THE STEPS BY HAND FOLD under the button, one press away.
  expect(within(dialog()).getByRole('button', { name: 'Or make it by hand at Apple' }).getAttribute('aria-expanded')).toBe(
    'false',
  );
  expect(button('I made it by hand')).toBeTruthy();
  fireEvent.click(button('Make it for me'));
  expect(onCheck).toHaveBeenCalledWith({ made: true });
  const reads = within(dialog()).getByRole('list', { name: "Checking Growth Marketer's identity at Apple" });
  expect(within(reads).getByText('Make the system user')).toBeTruthy();
  expect(within(steps()).getByText('Nothing to bring')).toBeTruthy();
});

test('a make that cannot run now says why and leaves the steps by hand open', () => {
  sheet({
    make: {
      title: 'Crewlet can make it for you',
      body: '10 of 10 system users used.',
      disabledReason: 'Meta has no room for another system user.',
    },
  });
  expect(button('Make it for me').getAttribute('aria-disabled')).toBe('true');
  expect(within(dialog()).queryByRole('button', { name: /Or make it by hand/ })).toBeNull();
  expect(within(dialog()).getByText('Access: App Manager. Never Admin.')).toBeTruthy();
  expect(button('Next')).toBeTruthy();
});

test('an answer to a check the person left is dropped', async () => {
  const { pending } = sheet();
  fireEvent.click(button('Next'));
  chooseFile('AuthKey_7KQ4M2ZX9P.p8');
  fireEvent.click(button('Check'));
  cleanup();
  await act(async () => pending.answer({ ok: true, view: <p>Late</p> }));
  expect(screen.queryByText('Late')).toBeNull();
});

test('opens in the dialog the application passes', () => {
  const Wrapped = vi.fn((props: ModalProps) => <Modal {...props} />);
  sheet({ modal: Wrapped });
  expect(Wrapped).toHaveBeenCalled();
  expect(Wrapped.mock.calls[0]![0]).toMatchObject({ open: true, variant: 'sheet', title: 'Set up identity: Growth Marketer' });
  expect(dialog()).toBeTruthy();
});

test('a closed sheet draws nothing and keeps nothing', () => {
  const { rerender, onCheck, onClose } = sheet();
  fireEvent.click(button('Next'));
  chooseFile('AuthKey_7KQ4M2ZX9P.p8');
  rerender(<AgentIdentitySheet {...APPLE} open={false} onCheck={onCheck} onClose={onClose} />);
  expect(screen.queryByRole('dialog')).toBeNull();
  rerender(<AgentIdentitySheet {...APPLE} onCheck={onCheck} onClose={onClose} />);
  expect(within(steps()).getByText('At Apple').closest('[aria-current="step"]')).toBeTruthy();
});

test('carries no axe violation on each step', async () => {
  const { pending } = sheet();
  const run = () =>
    axe.run(document.body, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
      rules: { 'color-contrast': { enabled: false } },
      resultTypes: ['violations'],
    });
  expect((await run()).violations).toEqual([]);
  fireEvent.click(button('Next'));
  expect((await run()).violations).toEqual([]);
  chooseFile('AuthKey_7KQ4M2ZX9P.p8');
  fireEvent.click(button('Check'));
  await act(async () => pending.answer({ ok: false, failedAt: 'role', view: <p>Wrong role.</p> }));
  expect((await run()).violations).toEqual([]);
});
