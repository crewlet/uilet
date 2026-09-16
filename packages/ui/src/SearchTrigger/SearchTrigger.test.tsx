/**
 * The narrow-layout case from the engine dashboard's `app/Shell.test.tsx`: the
 * one breakpoint hides the label and the hint, and a button whose name came
 * from its text would be announced as "button" at every width below it.
 */

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { Kbd } from '../Kbd/index.js';
import { SearchTrigger } from './index.js';

afterEach(cleanup);

/**
 * What the stylesheet's breakpoint does to the button, applied as inline
 * styles.
 *
 * Inline rather than as a style element, which the package's own source
 * scan refuses anywhere under `src`: what a name computation reads is the
 * resolved display of these two elements, and it is the same either way.
 */
function narrowLayout(): () => void {
  const hidden = [
    ...document.querySelectorAll<HTMLElement>(
      '.crewlet-search-trigger__label, .crewlet-search-trigger__shortcut',
    ),
  ];
  for (const element of hidden) element.style.display = 'none';
  return () => {
    for (const element of hidden) element.style.display = '';
  };
}

test('the button keeps its name where the narrow layout hides its label', () => {
  render(<SearchTrigger keyshortcuts="Control+K Meta+K /" shortcut={<Kbd keys={['Mod', 'k']} apple={false} />} />);
  const restore = narrowLayout();
  try {
    const search = screen.getByRole('button', { name: 'Search' });
    expect(search.getAttribute('aria-keyshortcuts')).toBe('Control+K Meta+K /');
  } finally {
    restore();
  }
});

test('the label is drawn, and it is the same word the button is called', () => {
  render(<SearchTrigger label="Find anything" />);
  const search = screen.getByRole('button', { name: 'Find anything' });
  // The visible text and the name agree, which is what lets somebody speaking
  // to the page say what they see.
  expect(search.textContent).toContain('Find anything');
});

test('the shortcut hint is drawn beside it and reads as a sentence', () => {
  render(<SearchTrigger shortcut={<Kbd keys={['Mod', 'k']} apple={false} />} />);
  const search = screen.getByRole('button', { name: 'Search' });
  expect([...search.querySelectorAll('kbd')].map((key) => key.textContent)).toEqual(['Ctrl', 'K']);
  expect(within(search).getByText('Control plus K')).toBeDefined();
});

test('it opens what it was given to open', () => {
  const onClick = vi.fn();
  render(<SearchTrigger onClick={onClick} />);
  fireEvent.click(screen.getByRole('button', { name: 'Search' }));
  expect(onClick).toHaveBeenCalledTimes(1);
});

test('it is a button rather than a field, and never submits a form', () => {
  render(
    <form onSubmit={() => expect.unreachable('a search trigger submitted its form')}>
      <SearchTrigger />
    </form>,
  );
  const search = screen.getByRole('button', { name: 'Search' });
  expect(search.getAttribute('type')).toBe('button');
  fireEvent.click(search);
});
