/**
 * The rule this component exists to hold: a seat's name is identity, so it is
 * never drawn in the accent.
 *
 * The badge is decorative, which is the other half. A row that read both would
 * say "Carlos Diaz avatar, Carlos Diaz" at every one of the eight places a
 * seat chip appears.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, describe, expect, test } from 'vitest';
import { EntityChip } from './index.js';

afterEach(cleanup);

describe('EntityChip', () => {
  test('is one link, named by the name alone', () => {
    render(<EntityChip name="Carlos Diaz" href="#/seats/carlos" />);
    const link = screen.getByRole('link', { name: 'Carlos Diaz' });
    expect(link.getAttribute('href')).toBe('#/seats/carlos');
    // One tab stop: the badge is not a second control, and not a second thing
    // to read either.
    expect(screen.queryByRole('img')).toBeNull();
  });

  test('without a target it is text rather than a dead link', () => {
    const { container } = render(<EntityChip name="Carlos Diaz" />);
    expect(screen.queryByRole('link')).toBeNull();
    expect(container.querySelector('.crewlet-entity-chip')?.className).not.toContain('entity-chip--link');
  });

  test('a human seat is drawn with the dashed edge', () => {
    const { container } = render(<EntityChip name="Ada Byron" variant="human" href="#/seats/ada" />);
    expect(container.querySelector('.crewlet-avatar')?.className).toContain('crewlet-avatar--dashed');
  });

  test('asChild puts the look on a router link and keeps its navigation', () => {
    render(
      <EntityChip name="Carlos Diaz" asChild>
        <a href="#/seats/carlos" data-router="true">
          ignored
        </a>
      </EntityChip>,
    );
    const link = screen.getByRole('link', { name: 'Carlos Diaz' });
    expect(link.getAttribute('data-router')).toBe('true');
    expect(link.className).toContain('crewlet-entity-chip');
    // The child's own children are replaced by the chip's: a caller passes the
    // element for its behaviour, not for its contents.
    expect(link.textContent).not.toContain('ignored');
  });

  test('asChild refuses anything but one element, loudly', () => {
    // Silently rendering the text would put the chip's look on nothing and
    // lose the navigation the caller passed the element for.
    expect(() =>
      render(
        <EntityChip name="Carlos Diaz" asChild>
          plain text
        </EntityChip>,
      ),
    ).toThrow();
  });

  test('a link chip is the page ink at rest and the accent on hover, with an underline', () => {
    // A name rendered in the accent everywhere it appears is
    // identity-colouring by accident: it leaves the one thing on the page that
    // IS the reader's position looking like forty links that are not. The
    // accent is spent for exactly as long as the pointer is there, and the
    // underline is what a reader who cannot separate the two inks sees.
    const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'EntityChip.css'), 'utf8');
    const token = (name: string) => `--${name}`;
    const root = /\.crewlet-entity-chip\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(root).toContain(`color: var(${token('color-text-primary')})`);
    const hover = /\.crewlet-entity-chip--link:hover,\s*\.crewlet-entity-chip--link:focus-visible\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(hover).toContain(`color: var(${token('color-brand-accent-ink')})`);
    expect(css).toMatch(/\.crewlet-entity-chip__name,?\s*[^{]*\{[^}]*text-decoration:\s*underline/);
  });

  test('carries no axe violation', async () => {
    const { container } = render(
      <main>
        <h1>Directory</h1>
        <EntityChip name="Carlos Diaz" href="#/seats/carlos" />
        <EntityChip name="Ada Byron" variant="human" />
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
