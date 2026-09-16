/**
 * The stack: one item open at a time, arrows that move between the triggers,
 * and the heading level the surrounding surface declares.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { Accordion } from './index.js';
import { HeadingLevelProvider } from '../utils/headingLevel.js';

afterEach(cleanup);

/*
 * A path rather than `new URL(..., import.meta.url)`: Vite rewrites that exact
 * pattern into an asset reference, so the URL that comes back names the dev
 * server rather than the file on disk.
 */
const here = dirname(fileURLToPath(import.meta.url));

/** The declarations of one rule, by selector, from a stylesheet's source. */
function ruleOf(sheet: string, selector: string): string {
  const at = sheet.indexOf(`${selector} {`);
  expect(at, `${selector} is not in the stylesheet`).toBeGreaterThan(-1);
  return sheet.slice(at, sheet.indexOf('}', at));
}

function stack() {
  return render(
    <Accordion defaultValue="one">
      <Accordion.Item value="one" title="First">
        first body
      </Accordion.Item>
      <Accordion.Item value="two" title="Second">
        second body
      </Accordion.Item>
      <Accordion.Item value="three" title="Third" disabled>
        third body
      </Accordion.Item>
    </Accordion>,
  );
}

test('single opens one item at a time and closes the one it replaces', () => {
  stack();
  const first = screen.getByRole('button', { name: /First/ });
  const second = screen.getByRole('button', { name: /Second/ });
  expect(first.getAttribute('aria-expanded')).toBe('true');

  fireEvent.click(second);
  expect(second.getAttribute('aria-expanded')).toBe('true');
  expect(first.getAttribute('aria-expanded')).toBe('false');
});

test('the arrows move between triggers, wrap, and skip a disabled one', () => {
  stack();
  const first = screen.getByRole('button', { name: /First/ });
  const second = screen.getByRole('button', { name: /Second/ });

  first.focus();
  fireEvent.keyDown(first, { key: 'ArrowDown' });
  expect(document.activeElement).toBe(second);

  // Third is disabled, so Down from Second wraps to First rather than landing
  // on a control that cannot be pressed.
  fireEvent.keyDown(second, { key: 'ArrowDown' });
  expect(document.activeElement).toBe(first);

  fireEvent.keyDown(first, { key: 'End' });
  expect(document.activeElement).toBe(second);
});

test('each trigger is wrapped in the heading level where the stack sits', () => {
  // TWO levels, because one of them would pass against a hard-coded tag: an
  // outline with a level missing is exactly what a fixed h3 produces, and it
  // is invisible to a test that only ever renders at that level.
  render(
    <>
      <HeadingLevelProvider level={2}>
        <Accordion>
          <Accordion.Item value="one" title="Shallow">
            body
          </Accordion.Item>
        </Accordion>
      </HeadingLevelProvider>
      <HeadingLevelProvider level={5}>
        <Accordion>
          <Accordion.Item value="two" title="Deep">
            body
          </Accordion.Item>
        </Accordion>
      </HeadingLevelProvider>
    </>,
  );
  expect(screen.getByRole('heading', { level: 2, name: /Shallow/ })).toBeDefined();
  expect(screen.getByRole('heading', { level: 5, name: /Deep/ })).toBeDefined();
});

test('an item actions are beside its trigger, not inside it', () => {
  render(
    <Accordion appearance="card">
      <Accordion.Item value="slack" title="Slack" meta="connected" count={2} actions={<button type="button">Disconnect</button>}>
        body
      </Accordion.Item>
    </Accordion>,
  );
  const trigger = screen.getByRole('button', { name: /Slack/ });
  const action = screen.getByRole('button', { name: 'Disconnect' });
  // This is the whole of the rule an integrations card turns on: the card's
  // own buttons must not be nested inside the identity row's toggle.
  expect(trigger.contains(action)).toBe(false);
  expect(screen.getByText('connected')).toBeDefined();
});

test('the card appearance drops the stack own frame', () => {
  // Inside a Card the card's border is the frame, and a second one inside it
  // draws a box in a box.
  const { container } = render(
    <Accordion appearance="card">
      <Accordion.Item value="one" title="First">
        body
      </Accordion.Item>
    </Accordion>,
  );
  const root = container.querySelector('.crewlet-accordion') as HTMLElement;
  expect(root.className).toContain('crewlet-accordion--card');
  expect(root.className).not.toContain('crewlet-accordion--default');
});

test('the compact trigger is the disclosure head, ink included', () => {
  // The compact stack IS the console's expander, and every other expander in
  // the package rests on the secondary step and reaches the primary one under
  // a pointer. The heading register this modifier overrides declares the
  // primary step at the SAME specificity the shared anatomy declares the
  // secondary one at, so an ink left out here is not inherited: it is won by
  // the heading, and the compact head sits at its own hover colour before
  // anybody hovers it. Asserted rather than remembered, because nothing else
  // ties the two stylesheets together.
  const accordion = readFileSync(join(here, 'Accordion.css'), 'utf8');
  const disclosure = readFileSync(join(here, '../Disclosure/Disclosure.css'), 'utf8');

  const rest = ruleOf(disclosure, '.crewlet-disclosure__trigger');
  const hover = ruleOf(disclosure, '.crewlet-disclosure__trigger:hover');
  expect(rest).toContain('color: var(--color-text-secondary)');
  expect(hover).toContain('color: var(--color-text-primary)');

  expect(ruleOf(accordion, '.crewlet-accordion--compact .crewlet-accordion__trigger')).toContain(
    'color: var(--color-text-secondary)',
  );
  expect(ruleOf(accordion, '.crewlet-accordion--compact .crewlet-accordion__trigger:hover')).toContain(
    'color: var(--color-text-primary)',
  );
});
