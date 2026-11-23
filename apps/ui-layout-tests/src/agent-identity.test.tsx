/**
 * An agent's identity heads its box with the one action at the box's top
 * right, at a desk's width and a phone's, and a long name in its line wraps
 * inside the box. The set-up sheet's steps and the value to copy keep inside
 * the sheet on a phone.
 */
import { afterEach, expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { AgentIdentity, AgentIdentitySheet, DescriptionList, type AgentIdentityState } from '@crewlethq/ui';

let root: Root | null = null;
let host: HTMLElement | null = null;

afterEach(() => {
  flushSync(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

async function settle() {
  await document.fonts.ready;
  for (let i = 0; i < 4; i++) await new Promise((resolve) => requestAnimationFrame(resolve));
}

/** An agent's box as an access table opens it: a wrapping flex box with the identity first and the details under it. */
async function mount(width: number, state: AgentIdentityState, summary = 'crewlet-growth · App Manager · checked 4 minutes ago') {
  host = document.createElement('div');
  host.style.width = `${width}px`;
  host.style.display = 'flex';
  host.style.flexWrap = 'wrap';
  host.style.gap = '12px';
  document.body.append(host);
  root = createRoot(host);
  flushSync(() =>
    root!.render(
      <>
        <AgentIdentity
          vendor="Google Play"
          agent="Growth Marketer"
          state={state}
          summary={summary}
          problem={state === 'refused' ? { title: 'Google Play refused it', body: "Growth Marketer's calls stop until it is set up again." } : undefined}
          onSetUp={() => {}}
          onUseCompany={() => {}}
        />
        <DescriptionList items={[['Level on its apps', 'Operate']]} />
      </>,
    ),
  );
  await settle();
  return host;
}

const box = (el: Element) => el.getBoundingClientRect();
const section = (at: HTMLElement) => at.querySelector<HTMLElement>('.crewlet-agent-identity')!;
const primary = (at: HTMLElement) =>
  [...at.querySelectorAll<HTMLButtonElement>('button')].find((b) => /^(Set up|Replace) identity$/.test(b.textContent ?? ''))!;

test('at a desk, the identity spans the box and its action stands at the top right', async () => {
  await page.viewport(1440, 900);
  const at = await mount(900, 'none');
  const s = box(section(at));
  const action = box(primary(at));
  const label = box(at.querySelector('.crewlet-agent-identity__title')!);
  expect(s.width).toBeCloseTo(900, 0);
  expect(Math.abs(s.right - action.right)).toBeLessThan(1);
  expect(action.top - s.top).toBeLessThan(2);
  // ON THE LABEL'S LINE: the two centred on each other.
  expect(Math.abs(label.top + label.height / 2 - (action.top + action.height / 2))).toBeLessThan(3);
  // THE DETAILS COME AFTER IT, under the rule, never beside it.
  expect(box(at.querySelector('dl')!).top).toBeGreaterThanOrEqual(s.bottom);
});

test('on a phone with two actions, they keep the top right and nothing leaves the box', async () => {
  await page.viewport(390, 844);
  const at = await mount(320, 'refused');
  const s = section(at);
  const r = box(s);
  const action = box(primary(at));
  expect(Math.abs(r.right - action.right)).toBeLessThan(1);
  const company = [...at.querySelectorAll('button')].find((b) => b.textContent === "Use the company's for now")!;
  // SET UP IDENTITY IS THE TOP RIGHT, the label's line, with the other action under it.
  expect(action.top - r.top).toBeLessThan(2);
  expect(box(company).top).toBeGreaterThanOrEqual(action.bottom);
  // THE LABEL KEEPS A COLUMN OF ITS OWN: no word under a button, and the chip whole.
  const title = s.querySelector<HTMLElement>('.crewlet-agent-identity__title')!;
  expect(box(title).width).toBeGreaterThanOrEqual(120);
  for (const word of [title.querySelector('span')!, title.querySelector<HTMLElement>('.crewlet-tag')!]) {
    const w = box(word);
    for (const b of [action, box(company)]) {
      expect(w.right <= b.left || b.right <= w.left || w.bottom <= b.top || b.bottom <= w.top).toBe(true);
    }
  }
  const chip = title.querySelector<HTMLElement>('.crewlet-tag')!;
  expect(chip.scrollWidth).toBeLessThanOrEqual(chip.clientWidth);
  expect(chip.textContent).toBe('Refused');
  for (const el of s.querySelectorAll('*')) {
    const b = box(el);
    if (b.width === 0) continue;
    expect(b.right).toBeLessThanOrEqual(r.right + 0.5);
    expect(b.left).toBeGreaterThanOrEqual(r.left - 0.5);
  }
  expect(s.scrollWidth).toBeLessThanOrEqual(s.clientWidth);
});

test('a long unbroken name in the line wraps inside the box', async () => {
  await page.viewport(390, 844);
  const at = await mount(320, 'ready', 'crewlet-growth-3fa91c@example-identity-project.iam.gserviceaccount.com · Admin');
  const s = section(at);
  const line = box(s.querySelector('.crewlet-agent-identity__summary')!);
  expect(line.right).toBeLessThanOrEqual(box(s).right + 0.5);
  expect(s.scrollWidth).toBeLessThanOrEqual(s.clientWidth);
});

test('on a phone, the sheet\'s numbered steps and the value to copy keep inside it', async () => {
  await page.viewport(390, 844);
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  flushSync(() =>
    root!.render(
      <AgentIdentitySheet
        open
        onClose={() => {}}
        agent="Growth Marketer"
        vendor="Google Play"
        why="Google Play then records what the agent does under its own Google identity."
        steps={[
          { text: 'Open Users and permissions, then Invite new users.' },
          {
            text: 'Email address:',
            copy: {
              label: "Google identity's email",
              value: 'crewlet-growth-3fa91c@example-identity-project.iam.gserviceaccount.com',
              rule: "Google's rule: lowercase letters, digits and hyphens, 6 to 30.",
            },
          },
        ]}
        link={{ label: 'Open Users and permissions', href: 'https://play.google.com/console/users-and-permissions' }}
        handIn={{ kind: 'nothing', text: 'Nothing to bring back.' }}
        reads={[{ id: 'apps', label: "Read each of the agent's apps" }]}
        onCheck={() => new Promise(() => {})}
      />,
    ),
  );
  await settle();
  // THE SHEET SLIDES IN: measured where it comes to rest.
  await Promise.all(document.getAnimations().map((a) => a.finished));
  const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
  const d = box(dialog);
  expect(d.right).toBeLessThanOrEqual(390.5);
  const step = dialog.querySelector<HTMLElement>('.crewlet-agent-identity-sheet__step')!;
  const s = box(step);
  for (const el of step.querySelectorAll('li, .crewlet-copyable, a')) {
    const b = box(el);
    expect(b.right).toBeLessThanOrEqual(s.right + 0.5);
  }
  expect(step.scrollWidth).toBeLessThanOrEqual(step.clientWidth);
});
