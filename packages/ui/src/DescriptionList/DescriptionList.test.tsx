/**
 * Metadata pairs, announced as pairs.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import { DescriptionList } from './index.js';

afterEach(cleanup);

test('each pair is a dt and a dd inside one dl', () => {
  // The promise a description list makes, and the reason to reach for it: a
  // screen reader pairs each term with its own detail and counts them.
  const { container } = render(
    <DescriptionList
      items={[
        ['Seat', 'ceo'],
        ['Model', 'claude-opus-5'],
      ]}
    />,
  );
  expect(container.querySelectorAll('dl')).toHaveLength(1);
  expect([...container.querySelectorAll('dt')].map((term) => term.textContent)).toEqual(['Seat', 'Model']);
  expect([...container.querySelectorAll('dd')].map((detail) => detail.textContent)).toEqual([
    'ceo',
    'claude-opus-5',
  ]);
});

test('tuples and children are the same list', () => {
  const { container } = render(
    <DescriptionList items={[['Seat', 'ceo']]}>
      <DescriptionList.Item term="Node">node-a</DescriptionList.Item>
    </DescriptionList>,
  );
  expect([...container.querySelectorAll('dt')].map((term) => term.textContent)).toEqual(['Seat', 'Node']);
  expect(screen.getByText('node-a').tagName).toBe('DD');
});

test('a pair lays out on the list own tracks', () => {
  // A wrapper that participated in the grid would make every pair one cell,
  // and nothing would line up.
  const { container } = render(<DescriptionList items={[['Seat', 'ceo']]} />);
  const pair = container.querySelector('.crewlet-description-list__pair') as HTMLElement;
  expect(pair.parentElement?.tagName).toBe('DL');
  expect(pair.children).toHaveLength(2);
});

describe('fit, for a panel of its own width', () => {
  const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'DescriptionList.css'), 'utf8');

  /** The body of the first rule whose selector is exactly this one. */
  function rule(selector: string): string {
    const escaped = selector.replace(/[.[\]()^$*+?|\\]/g, '\\$&');
    return new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? '';
  }

  test('only a list that asks for it is fitted', () => {
    const { container } = render(
      <>
        <DescriptionList fit items={[['Up', '2 days']]} />
        <DescriptionList items={[['Up', '2 days']]} />
      </>,
    );
    const [fitted, plain] = [...container.querySelectorAll('dl')];
    expect(fitted?.classList.contains('crewlet-description-list--fit')).toBe(true);
    expect(plain?.classList.contains('crewlet-description-list--fit')).toBe(false);
  });

  test('its terms take the longest term, and its pairs stay side by side on a narrow screen', () => {
    /*
     * The default term track is 120px at the least, so "Up" beside "2 days"
     * in a 260px popover spent most of the panel on the space after "Up", and
     * under 480px the list stacked, though a popover is as wide on a phone as
     * on a desktop. The fitted track is the term's own width.
     */
    expect(rule('.crewlet-description-list--fit')).toContain('grid-template-columns: max-content minmax(0, 1fr)');
    // AFTER the narrow rule, which it overrides at the same weight: before it,
    // the narrow rule would stack a fitted list too.
    const narrow = css.indexOf('@media (max-width: 480px)');
    expect(narrow).toBeGreaterThan(-1);
    expect(css.indexOf('\n.crewlet-description-list--fit {')).toBeGreaterThan(narrow);
    // And the narrow rule's space under each detail, there for a stacked list, is taken back.
    expect(rule('.crewlet-description-list--fit .crewlet-description-list__detail')).toContain('margin-bottom: 0');
    // A dense fitted list keeps the dense rhythm at every width.
    expect(rule('.crewlet-description-list--fit.crewlet-description-list--dense')).toContain(
      'gap: var(--spacing-1) var(--spacing-3)',
    );
  });
});

test('lists that have to line up share one term column', () => {
  /*
   * Four cards of limits on one page each sized the column to their own
   * longest term, so their values started at four different places. The track
   * is named by a custom property, inherited, so a page sets it once; a list
   * can be given it as `termWidth`.
   */
  const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'DescriptionList.css'), 'utf8');
  expect(css).toMatch(
    /\.crewlet-description-list\s*\{[^}]*grid-template-columns:\s*var\(--crewlet-description-list-term, minmax\(120px, max-content\)\) 1fr;/,
  );
  const { container, rerender } = render(<DescriptionList termWidth="12rem" items={[['Requests a minute', '600']]} />);
  const list = container.querySelector('dl')!;
  expect(list.style.getPropertyValue('--crewlet-description-list-term')).toBe('12rem');
  // A caller's own style is kept beside it.
  rerender(<DescriptionList termWidth="12rem" style={{ marginTop: 4 }} items={[['Requests a minute', '600']]} />);
  expect(container.querySelector('dl')!.style.marginTop).toBe('4px');
  expect(container.querySelector('dl')!.style.getPropertyValue('--crewlet-description-list-term')).toBe('12rem');
  // Without it the list sets nothing, so a page's own value reaches it.
  rerender(<DescriptionList items={[['Requests a minute', '600']]} />);
  expect(container.querySelector('dl')!.style.getPropertyValue('--crewlet-description-list-term')).toBe('');
});

test('a uniform list sets its terms at the details\' size, in the secondary ink', () => {
  const { container } = render(<DescriptionList uniform items={[['Account', 'crewlet-sre']]} />);
  expect(container.querySelector('dl')!.className).toContain('crewlet-description-list--uniform');
  const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'DescriptionList.css'), 'utf8');
  const rule = /\.crewlet-description-list--uniform \.crewlet-description-list__term\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
  expect(rule).toMatch(/font-size:\s*inherit/);
  expect(rule).toMatch(/color:\s*var\(--color-text-secondary\)/);
});
