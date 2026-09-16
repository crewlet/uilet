/**
 * The empty state's one rule: it says WHY.
 *
 * "No events" on a company that has never run and "no events" on a node whose
 * event store could not be read are the same sentence and completely
 * different problems. The description is required by the type for that reason,
 * and the heading level is what keeps a screen's outline intact around it.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, describe, expect, test } from 'vitest';
import { Button } from '../Button/index.js';
import { HeadingLevelProvider } from '../utils/headingLevel.js';
import { EmptyState } from './index.js';

afterEach(cleanup);

describe('EmptyState', () => {
  test('renders the sentence that says why, beside the title', () => {
    render(
      <EmptyState
        title="No events yet"
        description="This company has not run a turn. Start a seat to see its work here."
      />,
    );
    expect(screen.getByRole('heading', { name: 'No events yet' })).toBeTruthy();
    expect(screen.getByText(/has not run a turn/)).toBeTruthy();
  });

  test('its heading takes the level of where it finds itself', () => {
    render(
      <HeadingLevelProvider level={4}>
        <EmptyState title="Nothing here" description="Nothing has happened yet." />
      </HeadingLevelProvider>,
    );
    expect(screen.getByRole('heading', { level: 4, name: 'Nothing here' })).toBeTruthy();
  });

  test('a caller can take the heading away where a section already names it', () => {
    render(<EmptyState headingLevel="none" title="Nothing here" description="Nothing has happened yet." />);
    expect(screen.queryByRole('heading')).toBeNull();
    expect(screen.getByText('Nothing here')).toBeTruthy();
  });

  test('the mark is decoration, so nothing reads the glyph out', () => {
    const { container } = render(<EmptyState title="Nothing" description="Nothing yet." />);
    expect(container.querySelector('.crewlet-empty-state__mark')?.getAttribute('aria-hidden')).toBe('true');
  });

  test('the box is quiet, and quiet is not faint', () => {
    // The engine sets the sentence a step under the page's own ink and the
    // line beneath it a step under that: nothing is here, so the box should
    // not out-shout the content around it that is present. Both steps clear
    // 4.5:1 on every ground, which is what separates quiet from faint. The
    // mark is the one thing allowed the decoration step, and it is set on the
    // svg so it can never reach a word.
    const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'EmptyState.css'), 'utf8');
    // The step names are spelled without their leading dashes and prefixed at
    // use: the package's variable check reads a quoted `--name` in a .tsx file
    // as a DECLARATION, and a component may declare only --crewlet-* names.
    const token = (name: string) => `--${name}`;
    const inkOf = (block: string) =>
      new RegExp(`\\.crewlet-empty-state__${block}\\s*\\{[^}]*color:\\s*var\\((--[\\w-]+)\\)`).exec(css)?.[1];
    expect(inkOf('title')).toBe(token('color-text-secondary'));
    expect(inkOf('description')).toBe(token('color-text-tertiary'));
    expect(/\.crewlet-empty-state__mark svg\s*\{[^}]*color:\s*var\(--color-text-muted\)/.test(css)).toBe(true);
    // And nowhere else: the decoration step measures 2.33:1 at its worst.
    expect(css.match(/--color-text-muted/g)?.length).toBe(1);
  });

  test('the action is a control, reachable after the sentence', () => {
    render(
      <EmptyState
        title="Not configured"
        description="Connect Slack to let a seat answer a mention."
        action={<Button size="small">Connect Slack</Button>}
      />,
    );
    expect(screen.getByRole('button', { name: 'Connect Slack' })).toBeTruthy();
  });

  test('carries no axe violation', async () => {
    const { container } = render(
      <main>
        <h1>Activity</h1>
        <EmptyState
          title="Nothing could be read"
          description="The event store on this node did not answer. The work may have happened."
          action={<Button size="small">Try again</Button>}
        />
      </main>,
    );
    const result = await axe.run(container, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
      rules: { 'color-contrast': { enabled: false } },
      resultTypes: ['violations'],
    });
    expect(result.violations.map((violation) => violation.id)).toEqual([]);
  });
});

test('the title keeps the page leading', () => {
  // The box is one sentence with a sentence under it. At the tight step the
  // heading's line sits closer to its own descenders than to the line it
  // introduces, which reads as two fragments rather than as a statement and
  // its explanation.
  const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'EmptyState.css'), 'utf8');
  const title = /\.crewlet-empty-state__title\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
  expect(title).toMatch(/line-height:\s*var\(--font-line-height-normal\)/);
});
