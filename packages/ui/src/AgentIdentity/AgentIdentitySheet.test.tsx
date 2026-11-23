/**
 * The one set-up sheet: three steps the same on every vendor, the value to
 * copy beside its step's words, the file or token brought back, Make it for
 * me where Crewlet can, and the check drawn only as it answers.
 */

import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test, vi } from 'vitest';
import type { ModalProps } from '../Modal/index.js';
import { Modal } from '../Modal/index.js';
import { VendorText } from '../VendorText/index.js';
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
    {
      text: (
        <VendorText
          parts={[
            { text: 'Open ' },
            { ui: ['Users and Access', 'Integrations', 'Team Keys'], url: 'https://appstoreconnect.apple.com/access/integrations/api' },
            { text: '.' },
          ]}
        />
      ),
    },
    {
      text: 'Name:',
      copy: { label: "key's name", value: 'crewlet-growth', rule: 'Lowercase letters, digits and hyphens, at most 30.' },
    },
    { text: 'Access: App Manager. Never Admin.' },
  ],
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

/** Every WCAG A and AA rule axe checks, over the whole page (the sheet is portalled to the body). */
async function axeClean() {
  const result = await axe.run(document.body, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations).toEqual([]);
}

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
  expect(within(dialog()).getByText('Only the Account Holder or an Admin can make team keys.')).toBeTruthy();
});

test('the page a step names is linked on that step, and no button repeats it', () => {
  sheet();
  const first = within(dialog()).getByRole('region', { name: 'At Apple' }).querySelector('ol > li');
  const link = within(first as HTMLElement).getByRole('link', {
    name: /Users and Access then Integrations then Team Keys/,
  });
  expect(link.getAttribute('href')).toBe('https://appstoreconnect.apple.com/access/integrations/api');
  expect(link.getAttribute('target')).toBe('_blank');
  expect(within(dialog()).getAllByRole('link')).toHaveLength(1);
});

test('a page no step names keeps its button under the steps', () => {
  sheet({ steps: [{ text: 'Press Generate.' }], link: { label: 'Open Team Keys', href: 'https://example.com/keys' } });
  expect(within(dialog()).getByRole('link', { name: /Open Team Keys/ }).getAttribute('href')).toBe(
    'https://example.com/keys',
  );
});

test('draws the suggested name as a compact copy after its step\'s words, the rule only on its tooltip', () => {
  sheet();
  const copy = within(dialog()).getByRole('button', { name: "Copy the key's name" });
  const chip = within(dialog()).getByText('crewlet-growth').closest('.crewlet-copyable')!;
  expect(chip.classList.contains('crewlet-copyable--compact')).toBe(true);
  expect(chip.contains(copy)).toBe(true);
  // In the step's own sentence, "Name: crewlet-growth", rather than a panel under it.
  expect(chip.closest('li')!.textContent).toMatch(/^Name: crewlet-growth/);
  // Copied as it is, so the rule it was made to is no line of its own.
  expect(within(dialog()).queryByText('Lowercase letters, digits and hyphens, at most 30.')).toBeNull();
  expect(chip.parentElement!.getAttribute('title')).toBe('Lowercase letters, digits and hyphens, at most 30.');
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

test('a refused or renamed second file takes the first one\'s place whole', () => {
  const { onCheck } = sheet();
  fireEvent.click(button('Next'));
  chooseFile('AuthKey_7KQ4M2ZX9P.p8');
  chooseFile('notes.txt');
  // THE OLD FILE AND ITS KEY ID ARE GONE under the error, and nothing can be checked.
  expect(within(dialog()).getByText('Drop the file here')).toBeTruthy();
  expect((within(dialog()).getByRole('textbox', { name: 'Key ID' }) as HTMLInputElement).value).toBe('');
  expect(button('Check').getAttribute('aria-disabled')).toBe('true');
  // A .p8 FILE NAMED ANOTHER WAY keeps no ID read from the one before it.
  chooseFile('AuthKey_7KQ4M2ZX9P.p8');
  const renamed = chooseFile('team-key.p8');
  expect((within(dialog()).getByRole('textbox', { name: 'Key ID' }) as HTMLInputElement).value).toBe('');
  fireEvent.change(within(dialog()).getByRole('textbox', { name: 'Key ID' }), { target: { value: '3HN8RT6YQ1' } });
  fireEvent.click(button('Check'));
  expect(onCheck).toHaveBeenCalledWith({ made: false, file: renamed, field: '3HN8RT6YQ1' });
});

test('the picker takes one file', () => {
  sheet();
  fireEvent.click(button('Next'));
  expect(dialog().querySelector<HTMLInputElement>('input[type="file"]')!.multiple).toBe(false);
});

test('focus follows the step, so a control that leaves with its step never drops it behind the sheet', () => {
  sheet();
  fireEvent.click(button('Next'));
  expect(document.activeElement).toBe(within(dialog()).getByRole('region', { name: 'Back here' }));
  fireEvent.click(button('Back'));
  expect(document.activeElement).toBe(within(dialog()).getByRole('region', { name: 'At Apple' }));
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
  // THE LIVE REGION IS THERE BEFORE THE VERDICT, so what fills it is heard.
  expect(dialog().querySelector('.crewlet-agent-identity-sheet__verdict[aria-live="polite"]')).toBeTruthy();
  await axeClean();
  await act(async () => pending.answer({ ok: true, view: <p>Works. Crewlet keeps it.</p> }));
  expect(states()).toEqual(['done', 'done', 'done']);
  expect(within(dialog()).getByText('Works. Crewlet keeps it.').closest('[aria-live="polite"]')).toBeTruthy();
  expect(within(dialog()).queryByRole('button', { name: 'Back' })).toBeNull();
  await axeClean();
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
  // THE CHECK IS NOT A STEP TO JUMP BACK TO: it is reached again only by running it.
  expect(within(steps()).queryByRole('button', { name: /Check/ })).toBeNull();
});

test('a failed read says why under it, and a read the check did not reach says nothing', async () => {
  const { pending } = sheet();
  fireEvent.click(button('Next'));
  chooseFile('AuthKey_7KQ4M2ZX9P.p8');
  fireEvent.click(button('Check'));
  await act(async () =>
    pending.answer({
      ok: false,
      failedAt: 'sign',
      steps: {
        sign: { note: 'Apple refuses every API call until the Account Holder accepts the agreement.' },
        role: { note: 'Never drawn: the check stopped before it.', detail: 'financeReports_getCollection 200' },
      },
      view: <p>Accept the agreement, then check again.</p>,
    }),
  );
  const reads = within(dialog()).getByRole('list', { name: "Checking Growth Marketer's identity at Apple" });
  expect(readStates(reads)).toEqual(['failed', 'pending', 'pending']);
  expect(within(reads).getByText('Apple refuses every API call until the Account Holder accepts the agreement.')).toBeTruthy();
  expect(within(reads).queryByText('Never drawn: the check stopped before it.')).toBeNull();
  expect(reads.textContent).not.toContain('financeReports_getCollection');
  await axeClean();
});

test('a read that ran shows the vendor\'s answers under it', async () => {
  const { pending } = sheet();
  fireEvent.click(button('Next'));
  chooseFile('AuthKey_7KQ4M2ZX9P.p8');
  fireEvent.click(button('Check'));
  await act(async () =>
    pending.answer({
      ok: false,
      failedAt: 'role',
      steps: { role: { note: 'Fits no role.', detail: 'financeReports_getCollection 200' } },
      view: <p>Fits no role.</p>,
    }),
  );
  const reads = within(dialog()).getByRole('list', { name: "Checking Growth Marketer's identity at Apple" });
  // THE DETAIL BREAKS AT ITS SPACES, so it is read as the list's text.
  expect(reads.textContent).toContain('financeReports_getCollection 200');
  expect(within(reads).getByText('Fits no role.')).toBeTruthy();
});

test('a check that throws is drawn as one that did not finish', async () => {
  const { pending } = sheet();
  fireEvent.click(button('Next'));
  chooseFile('AuthKey_7KQ4M2ZX9P.p8');
  fireEvent.click(button('Check'));
  await act(async () => pending.refuse(new Error('The engine did not answer.')));
  expect(within(dialog()).getByText('The check did not finish')).toBeTruthy();
  // IT ANSWERED NOTHING ABOUT ANY READ, so none is said done.
  expect(readStates(within(dialog()).getByRole('list', { name: "Checking Growth Marketer's identity at Apple" }))).toEqual([
    'stopped',
    'stopped',
    'stopped',
  ]);
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

const WITH_DETAIL: AgentIdentitySheetProps['handIn'] = {
  kind: 'file',
  accept: '.p8',
  hint: 'The file Apple offered: AuthKey_<Key ID>.p8',
  field: { label: 'Key ID', fromName: /^AuthKey_([A-Z0-9]{10})\.p8$/ },
  detail: { label: 'Vendor number', hint: 'Only for a Sales key: digits, on Payments and Financial Reports.', inputMode: 'numeric' },
};

test('a detail beside the file is labelled optional, carries its hint, and is sent trimmed', async () => {
  const { onCheck } = sheet({ handIn: WITH_DETAIL });
  fireEvent.click(button('Next'));
  // NAMED BY ITS LABEL AND MARKED OPTIONAL in it, as every optional field in the kit is.
  const box = within(dialog()).getByRole('textbox', { name: /^Vendor number\s*\(optional\)$/ }) as HTMLInputElement;
  expect(box.labels?.[0]?.textContent).toBe('Vendor number (optional)');
  expect(box.inputMode).toBe('numeric');
  const said = (box.getAttribute('aria-describedby') ?? '').split(' ').map((id) => document.getElementById(id)?.textContent);
  expect(said).toContain('Only for a Sales key: digits, on Payments and Financial Reports.');
  // OPTIONAL: the file and its key ID are enough to check.
  const file = chooseFile('AuthKey_7KQ4M2ZX9P.p8');
  expect(button('Check').getAttribute('aria-disabled')).not.toBe('true');
  await axeClean();
  fireEvent.change(box, { target: { value: ' 85012345 ' } });
  fireEvent.click(button('Check'));
  expect(onCheck).toHaveBeenCalledWith({ made: false, file, field: '7KQ4M2ZX9P', detail: '85012345' });
});

test('a detail left empty, or only spaces, is left out of the check', () => {
  const { onCheck } = sheet({ handIn: WITH_DETAIL });
  fireEvent.click(button('Next'));
  const file = chooseFile('AuthKey_7KQ4M2ZX9P.p8');
  fireEvent.change(within(dialog()).getByRole('textbox', { name: /^Vendor number/ }), { target: { value: '   ' } });
  fireEvent.click(button('Check'));
  expect(onCheck.mock.calls[0]![0]).toEqual({ made: false, file, field: '7KQ4M2ZX9P' });
  expect(onCheck.mock.calls[0]![0]).not.toHaveProperty('detail');
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
  // ONE PRIMARY PER VIEW: going by hand is the quiet choice beside Make it for me.
  expect(button('I made it by hand').className).not.toContain('crewlet-btn--primary');
  fireEvent.click(button('Make it for me'));
  expect(onCheck).toHaveBeenCalledWith({ made: true });
  expect(document.activeElement).toBe(within(dialog()).getByRole('region', { name: 'Check' }));
  const reads = within(dialog()).getByRole('list', { name: "Checking Growth Marketer's identity at Apple" });
  expect(within(reads).getByText('Make the system user')).toBeTruthy();
  expect(within(steps()).getByText('Nothing to bring')).toBeTruthy();
});

test('after a failed make, Try again offers both ways and asks the hand-made one for its token', async () => {
  const { pending } = sheet({
    handIn: { kind: 'token', label: 'System user token' },
    make: { title: 'Crewlet can make it for you', body: '3 of 10 used.' },
  });
  fireEvent.click(button('Make it for me'));
  await act(async () => pending.answer({ ok: false, view: <p>Meta refused the admin token.</p> }));
  expect(steps().className).toContain('crewlet-stepper--danger');
  fireEvent.click(button('Try again'));
  expect(within(dialog()).getByRole('region', { name: 'At Apple' })).toBeTruthy();
  expect(within(steps()).getByText('Paste it')).toBeTruthy();
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

test('a sheet closed during a check opens fresh, with nothing of that check', async () => {
  const { pending, rerender, onCheck, onClose } = sheet();
  fireEvent.click(button('Next'));
  chooseFile('AuthKey_7KQ4M2ZX9P.p8');
  fireEvent.click(button('Check'));
  rerender(<AgentIdentitySheet {...APPLE} open={false} onCheck={onCheck} onClose={onClose} />);
  rerender(<AgentIdentitySheet {...APPLE} onCheck={onCheck} onClose={onClose} />);
  await act(async () => pending.answer({ ok: true, view: <p>Late</p> }));
  expect(screen.queryByText('Late')).toBeNull();
  expect(within(steps()).getByText('At Apple').closest('[aria-current="step"]')).toBeTruthy();
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
  fireEvent.click(button('Next'));
  expect(within(dialog()).getByText('Drop the file here')).toBeTruthy();
  expect((within(dialog()).getByRole('textbox', { name: 'Key ID' }) as HTMLInputElement).value).toBe('');
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
