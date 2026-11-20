/**
 * A CONTROL'S NAME HOLDS THE WORDS IT SHOWS (WCAG 2.5.3, label in name), as
 * a browser draws them. A person who drives the page by voice says what they
 * see, and a control whose visible words are not in its name cannot be
 * reached that way. jsdom draws nothing, so axe's check there finds no
 * visible words and passes anything: it is run here, on the drawn page.
 *
 * Two kit controls failed it: the link preview, a link named by its title
 * while it showed its source and details too, and an inbox row, whose face's
 * initials were the first words drawn in a control named from its title.
 */
import axe from 'axe-core';
import { afterEach, expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import type { ReactNode } from 'react';
import { Avatar, InboxGroup, InboxList, InboxRow, LinkCard } from '@crewlethq/ui';

let root: Root | null = null;
let host: HTMLDivElement | null = null;

afterEach(() => {
  flushSync(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

async function mount(node: ReactNode): Promise<HTMLElement> {
  await page.viewport(1280, 800);
  host = document.createElement('div');
  host.style.cssText = 'width: 420px; padding: 24px;';
  document.body.append(host);
  root = createRoot(host);
  flushSync(() => root!.render(<main>{node}</main>));
  await document.fonts.ready;
  return host;
}

/** What axe's label-in-name check finds on the drawn page, one line per control. */
async function mismatches(within: HTMLElement): Promise<string[]> {
  const result = await axe.run(within, {
    runOnly: { type: 'rule', values: ['label-content-name-mismatch'] },
    resultTypes: ['violations'],
  });
  return result.violations.flatMap((rule) => rule.nodes.map((node) => node.html.slice(0, 120)));
}

test('a link preview is named by the words it shows', async () => {
  const shown = await mount(
    <>
      <LinkCard
        href="https://example.com/"
        external
        address="https://example.com/"
        source={{ name: 'example.com', mark: null }}
        title="Example Domain"
        meta="Read 16:42"
      />
      <LinkCard
        href="#/worklet/WRK-41"
        source={{ name: 'Worklet', mark: null }}
        code="WRK-41"
        title="Fix the login redirect"
        meta="Due Friday"
        status="In progress"
        statusTone="info"
        owner={{ face: <Avatar name="Mira Rowe" size={16} decorative />, name: 'Mira Rowe' }}
      />
    </>,
  );
  expect(await mismatches(shown)).toEqual([]);
  // Each link's drawn words are where its name starts.
  for (const link of shown.querySelectorAll<HTMLAnchorElement>('a')) {
    expect(link.hasAttribute('aria-label') || link.hasAttribute('aria-labelledby'), 'labelled over its words').toBe(false);
    const squash = (words: string) => words.replace(/\s+/g, ' ').trim();
    const title = squash(link.querySelector('.crewlet-link-card__title')!.textContent ?? '');
    expect(squash(link.textContent ?? '').startsWith(title)).toBe(true);
    expect(squash(link.innerText).startsWith(title)).toBe(true);
  }
  // A press anywhere on the preview lands on its link.
  const card = shown.querySelector('.crewlet-link-card')!.getBoundingClientRect();
  const source = shown.querySelector('.crewlet-link-card__source')!.getBoundingClientRect();
  expect(source.top).toBeLessThan(shown.querySelector('.crewlet-link-card__title')!.getBoundingClientRect().top);
  const hit = document.elementFromPoint(source.left + 4, source.top + source.height / 2);
  expect(hit?.closest('a')).toBe(shown.querySelector('a'));
  expect(card.height).toBeGreaterThan(0);
});

test('an inbox row with a face is named starting with the words it shows', async () => {
  const shown = await mount(
    <InboxList label="Inbox">
      <InboxGroup label="Needs you">
        <InboxRow
          title="Jane Founder"
          meta="1h"
          leading={<Avatar name="Jane Founder" size={24} decorative />}
          actionable
          href="#/inbox/ask/1"
        >
          Can marketing be ready for a Dec 3 launch?
        </InboxRow>
        <InboxRow title="Casey Morgan" meta="2m" leading={<Avatar name="Casey Morgan" size={24} />} href="#/inbox/ask/2">
          Can you review the index change?
        </InboxRow>
      </InboxGroup>
    </InboxList>,
  );
  expect(await mismatches(shown)).toEqual([]);
  // And the name begins with the title, the first words the control shows.
  const control = shown.querySelector<HTMLElement>('.crewlet-inbox-row__control')!;
  const name = (control.getAttribute('aria-labelledby') ?? '')
    .split(' ')
    .map((id) => document.getElementById(id)?.textContent ?? '')
    .join(' ');
  expect(name.startsWith('Jane Founder')).toBe(true);
  expect(control.innerText.trim().startsWith('Jane Founder')).toBe(true);
  // The face is still drawn where its slot is, over the copy that holds it.
  const drawn = shown.querySelector('.crewlet-inbox-row__leading--drawn')!.getBoundingClientRect();
  const slot = control.querySelector('.crewlet-inbox-row__leading--place')!.getBoundingClientRect();
  expect(Math.abs(drawn.left - slot.left)).toBeLessThan(0.5);
  expect(Math.abs(drawn.top - slot.top)).toBeLessThan(0.5);
  expect(Math.abs(drawn.width - slot.width)).toBeLessThan(0.5);
});

test('a chat row with a 36px face keeps the face over its slot', async () => {
  const shown = await mount(
    <InboxList label="Activity" density="chat">
      <InboxGroup label="Today" hideLabel>
        <InboxRow title="Avery Quinn" meta="09:15" leading={<Avatar name="Avery Quinn" size={36} decorative />} onClick={() => {}}>
          Here is the write-up of the staging incident.
        </InboxRow>
      </InboxGroup>
    </InboxList>,
  );
  expect(await mismatches(shown)).toEqual([]);
  const drawn = shown.querySelector('.crewlet-inbox-row__leading--drawn')!.getBoundingClientRect();
  const slot = shown.querySelector('.crewlet-inbox-row__leading--place')!.getBoundingClientRect();
  expect(Math.abs(drawn.left - slot.left)).toBeLessThan(0.5);
  expect(Math.abs(drawn.top - slot.top)).toBeLessThan(0.5);
});
