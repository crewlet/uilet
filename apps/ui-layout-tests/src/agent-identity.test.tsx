/**
 * An agent's identity heads its box with the one action at the box's top
 * right, at a desk's width and a phone's, and a long name in its line wraps
 * inside the box. The set-up sheet's steps and the value to copy keep inside
 * the sheet on a phone, and its checklist's tag and link stand at a row's end
 * at a desk and wrap under the name on a phone.
 */
import { afterEach, expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import {
  AgentIdentity,
  AgentIdentitySheet,
  DescriptionList,
  type AgentIdentityEntry,
  type AgentIdentityState,
} from '@crewlethq/ui';

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

for (const width of [320, 256]) test(`in a ${width}px box with two actions, they keep the top right and nothing leaves the box`, async () => {
  await page.viewport(320, 844);
  const at = await mount(width, 'refused');
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
  expect(box(title).width).toBeGreaterThanOrEqual(Math.min(120, width * 0.4) - 1);
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

const ENTRIES: AgentIdentityEntry[] = [
  { id: '301234567', name: 'Tally web', group: 'Tally Labs', state: 'added' },
  { id: '302234567', name: 'Tally app', group: 'Tally Labs', state: 'applying', href: 'https://example.com/p/302234567' },
  {
    id: '403234567',
    name: 'Tally widgets for the Lock Screen and the Home Screen',
    group: 'Tally Retail',
    state: 'wrong_role',
    href: 'https://example.com/p/403234567',
    note: 'It holds Viewer; Growth Marketer needs Marketer.',
  },
  { id: '402234567', name: 'Tally web', group: 'Tally Retail', state: 'missing', href: 'https://example.com/p/402234567' },
];

/** The sheet with a checklist and the wider way, held or not, come to rest. */
async function mountSheet(notReady?: string) {
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  flushSync(() =>
    root!.render(
      <AgentIdentitySheet
        open
        onClose={() => {}}
        agent="Growth Marketer"
        vendor="Google Analytics"
        why="Google Analytics then records the agent's changes under its own Google identity."
        steps={[{ text: 'On each property below, press Open, then Add users.' }]}
        entries={ENTRIES}
        wider={{
          title: 'Or add it once to the account',
          body: 'Added to an account, the identity reaches every property in it.',
          links: [
            { label: 'Tally Labs access', href: 'https://example.com/a/1' },
            { label: 'Tally Retail access', href: 'https://example.com/a/2' },
          ],
        }}
        notReady={notReady}
        handIn={{ kind: 'nothing', text: 'Nothing to bring back.' }}
        reads={[{ id: 'properties', label: "Read each of the agent's properties" }]}
        onCheck={() => new Promise(() => {})}
      />,
    ),
  );
  await settle();
  await Promise.all(document.getAnimations().map((a) => a.finished));
  return document.querySelector<HTMLElement>('.crewlet-agent-identity-sheet__step')!;
}

for (const notReady of [undefined, 'Ready to add in about a minute.']) {
  test(`on a phone${notReady ? ', held,' : ''} each entry's tag and link wrap under its name and nothing runs past the sheet`, async () => {
    await page.viewport(390, 844);
    const step = await mountSheet(notReady);
    const s = box(step);
    const rows = [...step.querySelectorAll<HTMLElement>('.crewlet-agent-identity-sheet__entry')];
    expect(rows).toHaveLength(ENTRIES.length);
    for (const row of rows) {
      const r = box(row);
      for (const el of row.querySelectorAll('*')) {
        const b = box(el);
        // A held link's reason is read, not drawn.
        if (b.width === 0 || el.closest('.crewlet-visually-hidden')) continue;
        expect(b.right).toBeLessThanOrEqual(r.right + 0.5);
        expect(b.left).toBeGreaterThanOrEqual(r.left - 0.5);
      }
      expect(row.scrollWidth).toBeLessThanOrEqual(row.clientWidth);
    }
    // EVERY ROW'S TAG AND LINK go under its name, so the rows read alike and no name is squeezed.
    for (const row of rows) {
      const end = box(row.querySelector('.crewlet-agent-identity-sheet__entry-end')!);
      const words = box(row.querySelector('.crewlet-agent-identity-sheet__entry-words')!);
      expect(end.top).toBeGreaterThanOrEqual(words.bottom - 0.5);
      expect(Math.abs(end.left - words.left)).toBeLessThan(1);
    }
    expect(step.scrollWidth).toBeLessThanOrEqual(step.clientWidth);
    expect(s.right).toBeLessThanOrEqual(390.5);
  });
}

test('at a desk, a short entry keeps its tag and link at the row\'s end, on its name\'s line', async () => {
  await page.viewport(1440, 900);
  const step = await mountSheet();
  const row = [...step.querySelectorAll<HTMLElement>('.crewlet-agent-identity-sheet__entry')][3]!;
  const r = box(row);
  const end = box(row.querySelector('.crewlet-agent-identity-sheet__entry-end')!);
  const name = box(row.querySelector('.crewlet-agent-identity-sheet__entry-name')!);
  expect(r.right - end.right).toBeLessThan(1);
  expect(end.top).toBeLessThan(name.bottom);
  expect(step.scrollWidth).toBeLessThanOrEqual(step.clientWidth);
});
