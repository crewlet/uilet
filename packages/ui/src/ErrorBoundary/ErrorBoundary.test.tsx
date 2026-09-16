/**
 * The two ways a caught boundary lets go again, ported from the engine
 * dashboard's `app/ScreenBoundary.test.tsx`, plus what the default fallback
 * owes a reader who has to report the failure.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { ErrorBoundary } from './index.js';

let fail = true;

function Flaky() {
  if (fail) throw new Error('roles[0].llm: an object is not a valid child');
  return <span>drawn</span>;
}

beforeEach(() => {
  fail = true;
  // React reports a caught render error to the console by design. The report
  // is expected here and is not what is under test.
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

test('try again renders the region once it can be drawn', () => {
  render(
    <ErrorBoundary resetKey="#/a">
      <Flaky />
    </ErrorBoundary>,
  );
  expect(screen.getByText('roles[0].llm: an object is not a valid child')).toBeDefined();
  fail = false;
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(screen.getByText('drawn')).toBeDefined();
});

test('a new reset key clears the failure', () => {
  const view = render(
    <ErrorBoundary resetKey="#/a">
      <Flaky />
    </ErrorBoundary>,
  );
  fail = false;
  // Nothing was pressed: going somewhere else is itself the second chance,
  // which is what stops the failure of the screen you left following you.
  view.rerender(
    <ErrorBoundary resetKey="#/b">
      <Flaky />
    </ErrorBoundary>,
  );
  expect(screen.getByText('drawn')).toBeDefined();
});

test('the same reset key keeps the failure, so a re-render is not a retry', () => {
  const view = render(
    <ErrorBoundary resetKey="#/a">
      <Flaky />
    </ErrorBoundary>,
  );
  fail = false;
  view.rerender(
    <ErrorBoundary resetKey="#/a">
      <Flaky />
    </ErrorBoundary>,
  );
  expect(screen.queryByText('drawn')).toBeNull();
});

test('the failure is announced, and the message is verbatim for a report', () => {
  render(
    <ErrorBoundary>
      <Flaky />
    </ErrorBoundary>,
  );
  const alert = screen.getByRole('alert');
  expect(alert.textContent).toContain('This part of the page could not be drawn');
  // Verbatim, in a pre: a message reflowed into prose is one nobody can match
  // against a log line.
  const message = alert.querySelector('pre');
  expect(message?.textContent).toBe('roles[0].llm: an object is not a valid child');
});

test('a fallback draws the failure itself, and is handed the reset', () => {
  render(
    <ErrorBoundary fallback={(error, reset) => <button onClick={reset}>Retry {error.message}</button>}>
      <Flaky />
    </ErrorBoundary>,
  );
  const retry = screen.getByRole('button', { name: /^Retry/ });
  fail = false;
  fireEvent.click(retry);
  expect(screen.getByText('drawn')).toBeDefined();
});

test('the failure is reported once, with the component stack', () => {
  const onError = vi.fn();
  render(
    <ErrorBoundary onError={onError}>
      <Flaky />
    </ErrorBoundary>,
  );
  expect(onError).toHaveBeenCalledTimes(1);
  const [error, info] = onError.mock.calls[0] as [Error, { componentStack?: string | null }];
  expect(error.message).toBe('roles[0].llm: an object is not a valid child');
  expect(info.componentStack).toContain('Flaky');
});

test('a thrown value that is not an Error still reaches the fallback as one', () => {
  function Throws(): never {
    throw 'the socket closed';
  }
  render(
    <ErrorBoundary fallback={(error) => <p>{error.message}</p>}>
      <Throws />
    </ErrorBoundary>,
  );
  expect(screen.getByText('the socket closed')).toBeDefined();
});
