/**
 * A link in running text is underlined at rest: its accent ink against
 * secondary text falls under the 3:1 an unmarked link needs. Measured in a
 * browser in both palettes.
 */
import { afterEach, describe, expect, test } from 'vitest';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { Link, type LinkVariant } from '@crewlethq/ui';

let root: Root | null = null;
let host: HTMLDivElement | null = null;

afterEach(() => {
  root?.unmount();
  host?.remove();
  root = null;
  host = null;
  delete document.documentElement.dataset.theme;
});

function sentence(theme: 'light' | 'dark', variant: LinkVariant): HTMLAnchorElement {
  document.documentElement.dataset.theme = theme;
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  flushSync(() =>
    root!.render(
      <p style={{ color: 'var(--color-text-secondary)' }}>
        Two entries depend on orders-db.{' '}
        <Link href="#/company/atlas" size="inherit" variant={variant}>
          Show it on the map
        </Link>
      </p>,
    ),
  );
  return host.querySelector('a')!;
}

describe('a link set inside a sentence', () => {
  for (const theme of ['light', 'dark'] as const) {
    for (const variant of ['default', 'subtle'] as const) {
      test(`is underlined at rest in the ${theme} palette (${variant})`, () => {
        const link = sentence(theme, variant);
        expect(getComputedStyle(link).textDecorationLine).toBe('underline');
      });
    }
  }

  test('a quiet reference keeps its own rule, never underlined at rest', () => {
    const link = sentence('dark', 'quiet');
    expect(getComputedStyle(link).textDecorationLine).toBe('none');
  });
});
