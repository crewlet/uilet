/**
 * The pill that holds finished rows back, and the one thing it must not do:
 * say the same news over and over.
 *
 * A busy company finishes a phase every few seconds. Announcing each arrival
 * would interrupt the reader once a second while they read the thing they
 * stayed on the page for, which is the interruption the whole component
 * exists to prevent.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { Announcer } from '../Announcer/index.js';
import { NewItemsNotice } from './index.js';

afterEach(cleanup);

describe('NewItemsNotice', () => {
  test('draws nothing while nothing is being held', () => {
    render(<NewItemsNotice count={0} noun="new turn" onShow={() => {}} />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  test('says how many and what they are, in a button that says what it does', () => {
    render(<NewItemsNotice count={3} noun="new phase" onShow={() => {}} />);
    expect(screen.getByRole('button', { name: 'Show 3 new phases that finished while you were reading' })).toBeTruthy();
  });

  test('one of something is not "1 new phases"', () => {
    render(<NewItemsNotice count={1} noun="new phase" onShow={() => {}} />);
    expect(screen.getByRole('button').textContent).toContain('1 new phase ');
  });

  test('the reader is the one who lets them in', () => {
    const onShow = vi.fn();
    render(<NewItemsNotice count={2} noun="new turn" onShow={onShow} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onShow).toHaveBeenCalledTimes(1);
  });

  test('it is announced once as it appears, not again as the count climbs', () => {
    render(
      <>
        <Announcer />
        <NewItemsNotice count={1} noun="new turn" onShow={() => {}} />
      </>,
    );
    const region = screen.getByRole('status');
    expect(region.textContent).toBe('1 new turn finished while you were reading.');

    cleanup();
    const { rerender } = render(
      <>
        <Announcer />
        <NewItemsNotice count={1} noun="new turn" onShow={() => {}} />
      </>,
    );
    rerender(
      <>
        <Announcer />
        <NewItemsNotice count={7} noun="new turn" onShow={() => {}} />
      </>,
    );
    // Still the first sentence: the pill's own number is current for whenever
    // the reader reaches it.
    expect(screen.getByRole('status').textContent).toBe('1 new turn finished while you were reading.');
  });

  test('the next batch is announced again once the first has been let in', () => {
    const { rerender } = render(
      <>
        <Announcer />
        <NewItemsNotice count={2} noun="new turn" onShow={() => {}} />
      </>,
    );
    rerender(
      <>
        <Announcer />
        <NewItemsNotice count={0} noun="new turn" onShow={() => {}} />
      </>,
    );
    rerender(
      <>
        <Announcer />
        <NewItemsNotice count={5} noun="new turn" onShow={() => {}} />
      </>,
    );
    expect(screen.getByRole('status').textContent).toBe('5 new turns finished while you were reading.');
  });

  test('every string it draws can be replaced, for a noun an s does not pluralise', () => {
    render(
      <NewItemsNotice
        count={3}
        noun="new entry"
        onShow={() => {}}
        label={(count, noun) => `Show ${count} ${noun === 'new entry' && count !== 1 ? 'new entries' : noun}`}
      />,
    );
    expect(screen.getByRole('button', { name: 'Show 3 new entries' })).toBeTruthy();
  });

  test('the hover spends two steps of the one hue, each where it is measured', () => {
    // The boundary takes the FILL step, measured at 3:1 as a mark, and the
    // label the INK step, measured at 4.5:1 as text. The engine paints its
    // label in the fill step too, which measures 4.39:1 on a light card and
    // 3.45:1 on a dark one; the two steps exist so a component never has to
    // pick one of those numbers.
    const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'NewItemsNotice.css'), 'utf8');
    const hover = /\.crewlet-new-items:hover\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(hover).toMatch(/border-color:\s*var\(--color-brand-accent\)/);
    expect(hover).toMatch(/color:\s*var\(--color-brand-accent-ink\)/);
  });

  test('carries no axe violation', async () => {
    const { container } = render(
      <main>
        <h1>Model</h1>
        <Announcer />
        <NewItemsNotice count={3} noun="new phase" onShow={() => {}} />
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
