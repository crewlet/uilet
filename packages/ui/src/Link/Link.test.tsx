/**
 * A link that leaves the application says so in words, and withholds the
 * referrer and the opener while it does.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { Link } from './index.js';

const linkCss = (): string =>
  readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'Link.css'), 'utf8').replace(
    /\/\*[\s\S]*?\*\//g,
    '',
  );

afterEach(cleanup);

test('an external link reads the new-tab sentence and hands over nothing', () => {
  // The mark alone says "new tab" to somebody looking at it and nothing at all
  // to somebody listening.
  render(
    <Link href="https://example.com/install" external>
      Install
    </Link>,
  );
  const link = screen.getByRole('link', { name: 'Install (opens in a new tab)' });
  expect(link.getAttribute('target')).toBe('_blank');
  expect(link.getAttribute('rel')).toBe('noreferrer');
});

test('an application link stays in this tab and adds nothing to its name', () => {
  render(<Link href="#/org?lens=builder">Org chart</Link>);
  const link = screen.getByRole('link', { name: 'Org chart' });
  expect(link.getAttribute('target')).toBeNull();
  expect(link.getAttribute('rel')).toBeNull();
});

test('a caption-sized link is still a link', () => {
  // The defect this component exists for: a caption-sized anchor wearing the
  // caption's class took the caption's quiet ink, so four real navigations
  // rendered as dim static micro-text a reader could only find by hovering.
  render(
    <Link href="#/events/e-1" size="caption">
      e-1
    </Link>,
  );
  const link = screen.getByRole('link', { name: 'e-1' });
  expect(link.className).toContain('crewlet-link--caption');
  expect(link.className).toContain('crewlet-link--default');
});

test('a quiet link takes its own register and the size of the words around it', () => {
  render(
    <p>
      Asks on{' '}
      <Link href="#/work/FAIR-3" variant="quiet" size="inherit">
        FAIR-3
      </Link>
    </p>,
  );
  const link = screen.getByRole('link', { name: 'FAIR-3' });
  expect(link.className).toContain('crewlet-link--quiet');
  expect(link.className).toContain('crewlet-link--inherit');
  expect(link.className).not.toContain('crewlet-link--body');
});

// A QUIET LINK NEVER UNDERLINES, EXCEPT WHERE COLOUR CANNOT BE SEEN. Forced
// colors paints every link in one system colour, so the hover's step up to the
// accent ink is invisible there, and the underline is the hover that is left.
test('a quiet link answers a hover with an underline in forced colors, and only there', () => {
  const css = linkCss();
  const forced = /@media\s*\(forced-colors:\s*active\)\s*\{([\s\S]*?\})\s*\}/.exec(css)?.[1] ?? '';
  expect(forced).toMatch(/\.crewlet-link--quiet:hover\s*\{[^}]*text-decoration:\s*underline/);
  const rest = css.replace(/@media[^{]*\{[\s\S]*?\}\s*\}/g, '');
  expect(rest).toMatch(/\.crewlet-link--quiet:hover\s*\{[^}]*text-decoration:\s*none/);
});

test('asChild puts the look on a router own link and keeps its navigation', () => {
  render(
    <Link asChild external>
      <a href="https://example.com" data-router="true">
        Docs
      </a>
    </Link>,
  );
  const link = screen.getByRole('link', { name: 'Docs (opens in a new tab)' });
  expect(link.getAttribute('data-router')).toBe('true');
  expect(link.className).toContain('crewlet-link');
  // The sentence is a PROMISE, and asChild used to break it: the mark was
  // drawn and the words were read over a link that opened in this tab and
  // handed the referrer over on the way.
  expect(link.getAttribute('target')).toBe('_blank');
  expect(link.getAttribute('rel')).toBe('noreferrer');
});

test('asChild with no element child says so rather than rendering nothing', () => {
  expect(() =>
    render(
      <Link asChild>{'plain text'}</Link>,
    ),
  ).toThrow();
});
