/**
 * Who can open an artifact. Changes are asked of the engine and shown as
 * saving until it answers; a reader who cannot share still sees the audience;
 * no control ever offers owner.
 */

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { ARTIFACT_ROLES, roleAtLeast, SHAREABLE_ROLES, ShareDialog, type ShareAudienceRow, type ShareDialogProps } from './index.js';

afterEach(cleanup);

const MAYA: ShareAudienceRow = { id: 'owner', principal: { id: 'maya', kind: 'person', name: 'Maya Ortiz' }, role: 'owner', self: true };
const PM: ShareAudienceRow = { id: 's1', principal: { id: 'pm', kind: 'agent', name: '@pm', character: 'gemlet', hue: 'rose' }, role: 'contributor' };
const OPS: ShareAudienceRow = { id: 's2', principal: { id: 'ops', kind: 'team', name: 'Operations', detail: '6 people, 4 agents' }, role: 'commenter' };
const JANE: ShareAudienceRow = { id: 'e1', principal: { id: 'jane', kind: 'person', name: 'Jane Founder' }, role: 'commenter', via: 'Through Operations' };

function dialog(props: Partial<ShareDialogProps> = {}) {
  const onRoleChange = vi.fn();
  const onRemove = vi.fn();
  const onCompanyAccessChange = vi.fn();
  render(
    <ShareDialog
      open
      onClose={() => {}}
      title="Vendor scorecard"
      audience={[MAYA, PM, OPS, JANE]}
      onRoleChange={onRoleChange}
      onRemove={onRemove}
      companyName="Acme"
      companyAccess="none"
      onCompanyAccessChange={onCompanyAccessChange}
      link="https://acme.example.com/#/artifacts/7b0c"
      {...props}
    />,
  );
  return { onRoleChange, onRemove, onCompanyAccessChange };
}

const row = (name: string) => screen.getByText(name).closest('li') as HTMLElement;

describe('the role ladder', () => {
  test('is the engine ladder, and a share grants every role but owner', () => {
    expect(ARTIFACT_ROLES).toEqual(['viewer', 'commenter', 'contributor', 'editor', 'owner']);
    expect(SHAREABLE_ROLES).toEqual(['viewer', 'commenter', 'contributor', 'editor']);
    expect(roleAtLeast('editor', 'contributor')).toBe(true);
    expect(roleAtLeast('commenter', 'contributor')).toBe(false);
  });
});

describe('the audience', () => {
  test('names the dialog for the artifact and lists who has access', () => {
    dialog();
    expect(screen.getByRole('dialog', { name: 'Share “Vendor scorecard”' })).toBeDefined();
    const list = within(screen.getByRole('region', { name: 'Who has access' })).getAllByRole('listitem');
    expect(list).toHaveLength(4);
    expect(row('Maya Ortiz').textContent).toContain('(you)');
  });

  test('the owner row offers no role control and no remove: owner moves only by transfer', () => {
    dialog();
    expect(within(row('Maya Ortiz')).queryByRole('combobox')).toBeNull();
    expect(within(row('Maya Ortiz')).queryByRole('button', { name: /Remove/ })).toBeNull();
    expect(row('Maya Ortiz').textContent).toContain('Owner');
  });

  test('no role control offers owner', () => {
    dialog();
    fireEvent.click(screen.getByRole('combobox', { name: 'Role for Operations' }));
    const options = screen.getAllByRole('option').map((option) => option.textContent ?? '');
    expect(options.some((label) => label.startsWith('Owner'))).toBe(false);
    expect(options.map((label) => label.split('Reads')[0]?.split('Also')[0])).toEqual(['Viewer', 'Commenter', 'Contributor', 'Editor']);
  });

  test('a role change is asked of the caller, for that row', () => {
    const { onRoleChange } = dialog();
    fireEvent.click(screen.getByRole('combobox', { name: 'Role for Operations' }));
    fireEvent.mouseDown(screen.getByRole('option', { name: /^Editor/ }));
    expect(onRoleChange).toHaveBeenCalledWith(OPS, 'editor');
  });

  test('a removal is asked of the caller', () => {
    const { onRemove } = dialog();
    fireEvent.click(screen.getByRole('button', { name: 'Remove Operations' }));
    expect(onRemove).toHaveBeenCalledWith(OPS);
  });

  test('a pending row says it is saving, and a refused row says why', () => {
    dialog({ audience: [MAYA, { ...OPS, pending: true }, { ...PM, refusal: 'Only a person can change what an agent may publish.' }] });
    expect(row('Operations').getAttribute('aria-busy')).toBe('true');
    expect(within(row('Operations')).getByText('Saving')).toBeDefined();
    expect(within(row('@pm')).getByText('Only a person can change what an agent may publish.')).toBeDefined();
  });

  test('an effective row is shown with what it is through, and carries no control', () => {
    dialog();
    expect(row('Jane Founder').textContent).toContain('Through Operations');
    expect(within(row('Jane Founder')).queryByRole('combobox')).toBeNull();
    expect(within(row('Jane Founder')).queryByRole('button')).toBeNull();
  });

  test('an agent row says what the agent may do with its role', () => {
    dialog();
    expect(within(row('@pm')).getByText('@pm can read this artifact in its turns and edit its data.')).toBeDefined();
  });

  test('a share that reaches nobody is listed with why, reads no access, and offers Remove alone', () => {
    // A STORED SHARE THE ENGINE NO LONGER HONOURS is the owner's to take away:
    // hidden, it was a record nobody could see or remove.
    const LOGIN: ShareAudienceRow = {
      id: 'seat:token:maya',
      principal: { id: 'token:maya', kind: 'person', name: 'maya (API token)' },
      role: 'viewer',
      invalid: 'token:maya is a sign-in, not a seat. Remove it and share with their seat.',
    };
    const { onRemove } = dialog({ audience: [MAYA, LOGIN] });
    const it = row('maya (API token)');
    expect(it.className).toContain('is-invalid');
    expect(within(it).getByText('token:maya is a sign-in, not a seat. Remove it and share with their seat.')).toBeDefined();
    expect(within(it).getByText('No access')).toBeDefined();
    expect(within(it).queryByRole('combobox')).toBeNull();
    fireEvent.click(within(it).getByRole('button', { name: 'Remove maya (API token)' }));
    expect(onRemove).toHaveBeenCalledWith(LOGIN);
  });
});

describe('a reader who cannot share', () => {
  test('sees who has access and why there is no control, and nothing to press', () => {
    dialog({ readOnly: { reason: 'You can see who has access. Ask the owner to share it.' }, picker: () => <input aria-label="Add" /> });
    expect(screen.getByText('You can see who has access. Ask the owner to share it.')).toBeDefined();
    expect(screen.queryByRole('textbox', { name: 'Add' })).toBeNull();
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.queryByRole('button', { name: /Remove/ })).toBeNull();
    expect(row('Operations').textContent).toContain('Commenter');
    expect(screen.getByText('Only people with access above')).toBeDefined();
  });
});

describe('adding people', () => {
  test('hands the grantee search the role chosen beside it', () => {
    const picker = vi.fn(({ role }: { role: string }) => <span>picker at {role}</span>);
    dialog({ picker });
    expect(screen.getByText('picker at viewer')).toBeDefined();
    fireEvent.click(screen.getByRole('combobox', { name: 'Role for people you add' }));
    fireEvent.mouseDown(screen.getByRole('option', { name: /^Contributor/ }));
    expect(screen.getByText('picker at contributor')).toBeDefined();
  });

  test('offers only the roles this reader may grant', () => {
    dialog({ picker: () => <span>picker</span>, grantableRoles: ['viewer', 'commenter'] });
    fireEvent.click(screen.getByRole('combobox', { name: 'Role for people you add' }));
    expect(screen.getAllByRole('option')).toHaveLength(2);
  });
});

describe('company access', () => {
  test('is one choice in words, asked of the caller', () => {
    const { onCompanyAccessChange } = dialog();
    fireEvent.click(screen.getByRole('combobox', { name: 'Company access' }));
    fireEvent.mouseDown(screen.getByRole('option', { name: 'Everyone in Acme can comment' }));
    expect(onCompanyAccessChange).toHaveBeenCalledWith('commenter');
  });

  test('a refusal is said under it', () => {
    dialog({ companyRefusal: 'Only a person can share with the whole company.' });
    expect(screen.getByText('Only a person can share with the whole company.')).toBeDefined();
  });
});

test('carries no axe violation, managing and read only', async () => {
  dialog({ picker: () => <input aria-label="Add people, agents or teams" />, note: 'You can manage this because you are an administrator.' });
  const managing = await axe.run(document.body, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(managing.violations.map((violation) => violation.id)).toEqual([]);
  cleanup();
  dialog({ readOnly: { reason: 'Ask the owner to share it.' } });
  const reading = await axe.run(document.body, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(reading.violations.map((violation) => violation.id)).toEqual([]);
});
