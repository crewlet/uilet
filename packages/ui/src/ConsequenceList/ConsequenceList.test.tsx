/**
 * Consequences as typed items: a choice is a named, described checkbox; a fact
 * is a line with no control; a named resource is a chip inside the name.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { useState } from 'react';
import { afterEach, expect, test } from 'vitest';
import { ConsequenceList, ResourceName, consequencesAnswered, type ConsequenceItem } from './index.js';

afterEach(cleanup);

function Removal() {
  const [secret, setSecret] = useState(true);
  return (
    <ConsequenceList
      heading="When you remove it"
      items={[
        {
          kind: 'choice',
          key: 'secret',
          label: 'Delete its secret',
          name: 'MODEL_TOKEN_TEAM_SONNET',
          description: 'Removed from the secret store with the model.',
          checked: secret,
          onCheckedChange: setSecret,
        },
        {
          kind: 'fact',
          key: 'shared',
          tone: 'kept',
          text: (
            <>
              <ResourceName>MODEL_TOKEN_SHARED</ResourceName> stays: another model still uses it.
            </>
          ),
        },
      ]}
    />
  );
}

test('a choice is a checkbox named by its label and chip, described by what it does', () => {
  render(<Removal />);
  const box = screen.getByRole('checkbox', { name: 'Delete its secret MODEL_TOKEN_TEAM_SONNET' });
  expect(box).toHaveProperty('checked', true);
  expect(box.getAttribute('aria-describedby')).toBeTruthy();
  expect(document.getElementById(box.getAttribute('aria-describedby')!)?.textContent).toBe(
    'Removed from the secret store with the model.',
  );
  fireEvent.click(box);
  expect(box).toHaveProperty('checked', false);
});

test('the group is named by its eyebrow, and a fact has no control', () => {
  render(<Removal />);
  expect(screen.getByRole('group', { name: 'When you remove it' })).toBeTruthy();
  expect(screen.getAllByRole('checkbox')).toHaveLength(1);
  expect(screen.getByText(/stays: another model still uses it/).closest('p')?.className).toContain(
    'crewlet-consequence-list__fact--kept',
  );
});

test('a danger choice takes the danger tone, and only it', () => {
  render(
    <ConsequenceList
      items={[
        { kind: 'choice', key: 'a', label: 'Also remove the accounts', tone: 'danger', checked: false, onCheckedChange: () => {} },
        { kind: 'choice', key: 'b', label: 'Clear its settings', checked: false, onCheckedChange: () => {} },
      ]}
    />,
  );
  const [danger, plain] = Array.from(document.querySelectorAll('.crewlet-checkbox'));
  expect(danger?.className).toContain('crewlet-checkbox--danger');
  expect(plain?.className).not.toContain('crewlet-checkbox--danger');
});

test('consequencesAnswered waits for every required choice and nothing else', () => {
  const items = (checked: boolean): ConsequenceItem[] => [
    { kind: 'choice', key: 'ack', label: 'I understand', required: true, checked, onCheckedChange: () => {} },
    { kind: 'choice', key: 'opt', label: 'Optional', checked: false, onCheckedChange: () => {} },
    { kind: 'fact', key: 'f', text: 'A fact' },
  ];
  expect(consequencesAnswered(items(false))).toBe(false);
  expect(consequencesAnswered(items(true))).toBe(true);
  expect(consequencesAnswered(undefined)).toBe(true);
});

test('has no axe violations', async () => {
  render(<Removal />);
  const result = await axe.run(document.body, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations.map((violation) => violation.id)).toEqual([]);
});

test('a divided list is ruled off from what is above it', () => {
  render(<ConsequenceList divided items={[{ kind: 'fact', key: 'f', text: 'A fact' }]} />);
  expect(document.querySelector('.crewlet-consequence-list')?.className).toContain('crewlet-consequence-list--divided');
});
