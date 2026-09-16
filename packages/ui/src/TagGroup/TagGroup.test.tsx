/**
 * The overflow, which is the whole component: a list longer than the card
 * folds to a count that expands IN PLACE.
 *
 * Ported from the engine dashboard's `routes/Integrations.test.tsx` ("a long
 * subject list folds to a count that expands" and "one subject is shown, not
 * hidden behind a count"), because the reason the tail is folded is width and
 * not secrecy: the measured case is thirty-six service accounts somebody is
 * working through.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, describe, expect, test } from 'vitest';
import { Announcer } from '../Announcer/index.js';
import { Tag } from '../Tag/index.js';
import { TagGroup } from './index.js';

afterEach(cleanup);

const subjects = (count: number) => Array.from({ length: count }, (_, i) => `agent-${i}@agents.test.invalid`);

const group = (names: string[]) => (
  <TagGroup label="what this is about">
    {names.map((name) => (
      <Tag key={name} monospace>
        {name}
      </Tag>
    ))}
  </TagGroup>
);

describe('TagGroup', () => {
  test('a long list folds to a count that expands in place', () => {
    const names = subjects(12);
    render(group(names));
    const last = names.at(-1)!;
    expect(screen.queryByText(last)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '+6 more' }));

    expect(screen.getByText(last)).toBeTruthy();
    // In place: the control is gone rather than replaced by a way back.
    expect(screen.queryByRole('button')).toBeNull();
  });

  test('a short list is shown, not hidden behind a count', () => {
    render(group(['sre-lead']));
    expect(screen.getByText('sre-lead')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  test('the list carries its name and its size', () => {
    render(group(subjects(12)));
    expect(screen.getByRole('list', { name: 'what this is about, 12' })).toBeTruthy();
    expect(screen.getAllByRole('listitem')).toHaveLength(7);
  });

  test('expanding does not drop the keyboard on the document body', () => {
    // The control that expands the list is the control that disappears in
    // doing so. A reader who pressed it from the keyboard would otherwise be
    // put back at the top of the page with everything to walk through again.
    render(group(subjects(12)));
    const more = screen.getByRole('button', { name: '+6 more' });
    more.focus();
    fireEvent.click(more);
    expect(document.activeElement).toBe(screen.getByRole('list'));
  });

  test('expanding says how many there now are', () => {
    render(
      <>
        <Announcer />
        {group(subjects(12))}
      </>,
    );
    fireEvent.click(screen.getByRole('button', { name: '+6 more' }));
    expect(screen.getByRole('status').textContent).toBe('Showing all 12.');
  });

  test('every string it draws can be replaced', () => {
    render(
      <TagGroup label="Etiketten" max={2} moreLabel={(hidden) => `und ${hidden} weitere`}>
        {subjects(5).map((name) => (
          <Tag key={name}>{name}</Tag>
        ))}
      </TagGroup>,
    );
    expect(screen.getByRole('button', { name: 'und 3 weitere' })).toBeTruthy();
  });

  test('carries no axe violation', async () => {
    const { container } = render(
      <main>
        <h1>Integrations</h1>
        {group(subjects(12))}
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
