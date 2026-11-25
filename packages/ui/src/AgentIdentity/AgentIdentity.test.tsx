/**
 * An agent's identity at a vendor: one chip per state, one action by state,
 * the Needs you rule, and nothing to set up where the vendor offers no
 * identity per agent.
 */

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test, vi } from 'vitest';
import {
  AGENT_IDENTITY_CHIPS,
  AGENT_IDENTITY_STATES,
  AgentIdentity,
  agentIdentityNeedsSetUp,
  agentIdentityNeedsYou,
  type AgentIdentityState,
} from './index.js';

afterEach(cleanup);

function box(state: AgentIdentityState, extra: Partial<Parameters<typeof AgentIdentity>[0]> = {}) {
  const onSetUp = vi.fn();
  const onUseCompany = vi.fn();
  render(
    <AgentIdentity
      vendor="Apple"
      agent="Growth Marketer"
      state={state}
      summary="Apple sees the company's team keys."
      onSetUp={onSetUp}
      onUseCompany={onUseCompany}
      {...extra}
    />,
  );
  return { region: screen.getByRole('region', { name: 'Identity at Apple' }), onSetUp, onUseCompany };
}

test('is a region named for the vendor, with the state\'s one chip', () => {
  for (const state of AGENT_IDENTITY_STATES) {
    const { region } = box(state);
    expect(within(region).getByText(AGENT_IDENTITY_CHIPS[state].label)).toBeTruthy();
    expect(region.getAttribute('data-state')).toBe(state);
    cleanup();
  }
});

test('every state has a chip word of its own', () => {
  const words = AGENT_IDENTITY_STATES.map((s) => AGENT_IDENTITY_CHIPS[s].label);
  expect(new Set(words).size).toBe(words.length);
});

test('offers Set up identity as the primary action wherever the agent has none that works', () => {
  for (const state of ['company', 'none', 'wrong_role', 'wrong_team', 'refused'] as const) {
    const { onSetUp } = box(state);
    const button = screen.getByRole('button', { name: 'Set up identity: Growth Marketer' });
    expect(button.className).toContain('crewlet-btn--primary');
    fireEvent.click(button);
    expect(onSetUp).toHaveBeenCalledTimes(1);
    expect(agentIdentityNeedsSetUp(state)).toBe(true);
    cleanup();
  }
});

test('offers Replace identity, not primary, once the agent\'s own works, its role read or not', () => {
  for (const state of ['ready', 'unchecked'] as const) {
    box(state);
    const button = screen.getByRole('button', { name: 'Replace identity: Growth Marketer' });
    expect(button.className).not.toContain('crewlet-btn--primary');
    expect(screen.queryByRole('button', { name: /Set up identity/ })).toBeNull();
    cleanup();
  }
});

test('offers nothing while the vendor gets a new identity ready, a check runs or an old one waits to be revoked', () => {
  for (const state of ['preparing', 'checking', 'replacing'] as const) {
    box(state);
    expect(screen.queryAllByRole('button')).toEqual([]);
    cleanup();
  }
});

test('offers the company\'s identity only while the vendor refuses the agent\'s own', () => {
  const { onUseCompany } = box('refused');
  fireEvent.click(screen.getByRole('button', { name: "Use the company's for now: Growth Marketer" }));
  expect(onUseCompany).toHaveBeenCalledTimes(1);
  cleanup();
  for (const state of AGENT_IDENTITY_STATES.filter((s) => s !== 'refused')) {
    box(state);
    expect(screen.queryByRole('button', { name: /Use the company's/ })).toBeNull();
    cleanup();
  }
});

test('draws no action where the vendor offers no identity per agent, whatever the page passes', () => {
  box('company', { perAgent: false });
  expect(screen.getByText("Company's")).toBeTruthy();
  expect(screen.queryAllByRole('button')).toEqual([]);
});

test('says a problem inside the box, in the danger tone for a danger chip', () => {
  box('wrong_team', {
    problem: { title: 'Wrong team', body: 'It belongs to another team. Crewlet kept nothing.' },
  });
  const callout = screen.getByText('It belongs to another team. Crewlet kept nothing.').closest('.crewlet-callout');
  expect(callout?.className).toContain('crewlet-callout--danger');
  cleanup();
  box('wrong_role', { problem: { title: 'Wrong role', body: 'It holds Marketing.' } });
  expect(screen.getByText('It holds Marketing.').closest('.crewlet-callout')?.className).toContain(
    'crewlet-callout--warning',
  );
});

test('an identity getting ready and one with its role unread are information, not set-up', () => {
  expect(AGENT_IDENTITY_CHIPS.preparing).toEqual({ label: 'Getting ready', tone: 'info' });
  expect(AGENT_IDENTITY_CHIPS.unchecked).toEqual({ label: 'Role not checked', tone: 'info' });
  for (const state of ['preparing', 'unchecked'] as const) {
    expect(agentIdentityNeedsSetUp(state)).toBe(false);
    const { region } = box(state, { problem: { title: 'Google shows its role to administrators only', body: 'It works.' } });
    expect(within(region).getByText('It works.').closest('.crewlet-callout')?.className).toContain('crewlet-callout--info');
    expect(screen.queryByRole('button', { name: /Set up identity/ })).toBeNull();
    cleanup();
  }
  // In the order an identity moves through them: made, getting ready, checked, then read or not.
  expect(AGENT_IDENTITY_STATES.slice(1, 6)).toEqual(['none', 'preparing', 'checking', 'ready', 'unchecked']);
});

test('a reason disables the actions and says why', () => {
  box('none', { disabledReason: 'Only an administrator can change access.' });
  const button = screen.getByRole('button', { name: /Set up identity/ });
  expect(button.getAttribute('aria-disabled')).toBe('true');
  expect(button.getAttribute('aria-describedby')).toBeTruthy();
  expect(document.getElementById(button.getAttribute('aria-describedby')!)?.textContent).toBe(
    'Only an administrator can change access.',
  );
});

test('Needs you until the agent\'s own works where the vendor offers one, never while it gets ready; never on a company-only vendor', () => {
  const calm: AgentIdentityState[] = ['ready', 'preparing', 'unchecked'];
  for (const state of AGENT_IDENTITY_STATES) {
    expect(agentIdentityNeedsYou(state, true)).toBe(!calm.includes(state));
    expect(agentIdentityNeedsYou(state, false)).toBe(false);
  }
});

test('carries no axe violation', async () => {
  const { container } = render(
    <main>
      <h1>App Store Connect</h1>
      <AgentIdentity
        vendor="Apple"
        agent="Growth Marketer"
        state="refused"
        summary="crewlet-growth · App Manager"
        problem={{ title: 'Apple refused it', body: 'Key 7KQ4M2ZX9P was revoked.' }}
        onSetUp={() => {}}
        onUseCompany={() => {}}
      />
    </main>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations).toEqual([]);
});
