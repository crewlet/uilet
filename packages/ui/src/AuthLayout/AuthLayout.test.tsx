/**
 * The sign-in page: a main landmark, the product's lockup, and one card named
 * by the page's only `h1`.
 */

import { cleanup, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, describe, expect, test } from 'vitest';
import { AuthLayout } from './index.js';

afterEach(cleanup);

describe('AuthLayout', () => {
  test('is the main landmark, with one card named by the page heading', () => {
    render(
      <AuthLayout title="Sign in" description="Use your login and password.">
        <form aria-label="Sign in">
          <button type="submit">Sign in</button>
        </form>
      </AuthLayout>,
    );
    expect(screen.getByRole('main')).toBeTruthy();
    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings.map((heading) => heading.textContent)).toEqual(['Sign in']);
    expect(screen.getByRole('region', { name: 'Sign in' })).toBeTruthy();
    expect(screen.getByText('Use your login and password.')).toBeTruthy();
  });

  test('draws the lockup with the mark as decoration, and the name as the text', () => {
    const { container } = render(<AuthLayout title="Sign in" />);
    const brand = container.querySelector('.crewlet-auth-layout__brand')!;
    expect(brand.classList.contains('crewlet-brand')).toBe(true);
    expect(brand.querySelector('.crewlet-brand__mark')?.getAttribute('aria-hidden')).toBe('true');
    expect(brand.querySelector('.crewlet-brand__mark svg')).not.toBeNull();
    expect(brand.querySelector('img')).toBeNull();
    expect(brand.textContent).toBe('Crewlet');
    // Not a link until there is somewhere to go.
    expect(screen.queryByRole('link')).toBeNull();
  });

  test('a card that says it all draws no empty body', () => {
    const { container } = render(<AuthLayout title="This link is incomplete" description="Part of it is missing." />);
    expect(container.querySelector('.crewlet-auth-layout__body')).toBeNull();
  });

  test('the lockup is the way home when it is given one', () => {
    render(<AuthLayout title="Sign in" homeHref="/" productName="Acme" />);
    expect(screen.getByRole('link', { name: 'Acme' }).getAttribute('href')).toBe('/');
  });

  test('carries no axe violation', async () => {
    const { container } = render(
      <AuthLayout title="Set your password" description="Choose a password for jane.founder.">
        <form aria-label="Set your password">
          <label>
            Password
            <input type="password" autoComplete="new-password" />
          </label>
          <button type="submit">Set password</button>
        </form>
      </AuthLayout>,
    );
    const result = await axe.run(container, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
      rules: { 'color-contrast': { enabled: false } },
      resultTypes: ['violations'],
    });
    expect(result.violations.map((violation) => violation.id)).toEqual([]);
  });
});
