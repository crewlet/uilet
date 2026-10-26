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

describe('TagGroup overflow="fit"', () => {
  /**
   * jsdom lays nothing out, so each item's line is stubbed: the first
   * `perLine` items sit on the first line and the rest wrap below it.
   */
  const lay = (perLine: number) => {
    const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetTop');
    Object.defineProperty(HTMLElement.prototype, 'offsetTop', {
      configurable: true,
      get(this: HTMLElement) {
        const parent = this.parentElement;
        if (!parent?.classList.contains('crewlet-tag-group')) return 0;
        return [...parent.children].indexOf(this) < perLine ? 0 : 24;
      },
    });
    return () => {
      if (original) Object.defineProperty(HTMLElement.prototype, 'offsetTop', original);
    };
  };

  test('keeps one line and counts what wrapped, room left for the count, with no button to tab to', () => {
    const restore = lay(3);
    try {
      render(
        <TagGroup label="Tags" overflow="fit">
          {['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon'].map((name) => (
            <Tag key={name}>{name}</Tag>
          ))}
        </TagGroup>,
      );
      const list = screen.getByRole('list', { name: 'Tags, 5' });
      // Three fit; the count chip needs the third one's place, so two stay.
      expect(screen.queryByText('Gamma')).toBeNull();
      expect(screen.getByText('Beta')).toBeDefined();
      expect(screen.getByText('+3')).toBeDefined();
      expect(list.className).toContain('crewlet-tag-group--fit');
      expect(screen.queryByRole('button')).toBeNull();
    } finally {
      restore();
    }
  });

  test('a count chip standing a pixel lower on the same line costs no tag that fits', () => {
    // The line centres its items, so a chip of another height starts a pixel
    // away from the tags beside it. The first four items fit on the line.
    const top = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetTop');
    const height = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');
    const inGroup = (el: HTMLElement) => el.parentElement?.classList.contains('crewlet-tag-group') ?? false;
    Object.defineProperty(HTMLElement.prototype, 'offsetTop', {
      configurable: true,
      get(this: HTMLElement) {
        if (!inGroup(this)) return 0;
        if ([...this.parentElement!.children].indexOf(this) >= 4) return 26;
        return this.hasAttribute('data-count') ? 1 : 0;
      },
    });
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      configurable: true,
      get(this: HTMLElement) {
        return inGroup(this) ? 22 : 0;
      },
    });
    try {
      render(
        <TagGroup label="Tags" overflow="fit">
          {['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon'].map((name) => (
            <Tag key={name}>{name}</Tag>
          ))}
        </TagGroup>,
      );
      // Three tags and the count share the line; matching tops alone kept one.
      expect(screen.getByText('Gamma')).toBeDefined();
      expect(screen.queryByText('Delta')).toBeNull();
      expect(screen.getByText('+2')).toBeDefined();
    } finally {
      if (top) Object.defineProperty(HTMLElement.prototype, 'offsetTop', top);
      if (height) Object.defineProperty(HTMLElement.prototype, 'offsetHeight', height);
    }
  });

  test('draws every tag and no count when they all fit', () => {
    render(
      <TagGroup label="Tags" overflow="fit">
        <Tag>Alpha</Tag>
        <Tag>Beta</Tag>
      </TagGroup>,
    );
    expect(screen.getByText('Beta')).toBeDefined();
    expect(screen.queryByText(/^\+/)).toBeNull();
  });
});
