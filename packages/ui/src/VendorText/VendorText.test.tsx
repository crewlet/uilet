/**
 * A vendor's UI names read apart from the words around them, by shape as well
 * as ink, and the page a step names is linked on its own words.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test } from 'vitest';
import { contrast, flatten, OPAQUE_SURFACES, parseHex } from '@crewlethq/tokens/test/palette';
import { channels, installThemed, themeColours } from '../../../../apps/ui-tests/src/cascade.js';
import { StepLink, VendorText, VendorUI, vendorTextString } from './index.js';

afterEach(cleanup);

const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'VendorText.css'), 'utf8');

test('a menu path reads its levels in order, the chevrons drawn and the word between them read', () => {
  const { container } = render(<VendorUI path={['Users and Access', 'Integrations', 'Team Keys']} />);
  const name = container.querySelector('.crewlet-vendor-ui');
  expect(name?.textContent).toBe('Users and Access then Integrations then Team Keys');
  expect(container.querySelectorAll('.crewlet-vendor-ui__separator')).toHaveLength(2);
  for (const chevron of container.querySelectorAll('.crewlet-vendor-ui__separator')) {
    expect(chevron.getAttribute('aria-hidden')).toBe('true');
  }
});

test('a single name draws no separator', () => {
  const { container } = render(<VendorUI path="Generate API Key" />);
  expect(container.textContent).toBe('Generate API Key');
  expect(container.querySelector('.crewlet-vendor-ui__separator')).toBeNull();
});

test('a vendor name is set apart by weight and frame, not by ink alone', () => {
  const rule = /\.crewlet-vendor-ui \{([^}]*)\}/.exec(css)?.[1] ?? '';
  expect(rule).toContain('font-weight: var(--font-weight-semibold)');
  expect(rule).toMatch(/border: 1px solid var\(--color-border-strong\)/);
  // Inline, so a link's underline is drawn under the name inside it.
  expect(rule).toContain('display: inline;');
});

test('the chip stands off every surface it is set on, in both modes, and its words stay clear on it', () => {
  // Read back from the cascade on each opaque rung: the fill a visible step on all of them, the frame
  // at 1.4:1 on the page and card surfaces instructions are set on, the words clear everywhere.
  const SET_ON = ['color-surface-background', 'color-surface-subtle'].map((name) => `--${name}`);
  const failures: string[] = [];
  for (const theme of ['dark', 'light'] as const) {
    const uninstall = installThemed(theme, 'VendorText/VendorText.css');
    const { container } = render(<VendorUI path="Generate API Key" />);
    const chip = getComputedStyle(container.querySelector('.crewlet-vendor-ui')!);
    const palette = themeColours(theme);
    for (const surface of OPAQUE_SURFACES) {
      const ground = parseHex(palette.get(surface) ?? '');
      if (ground === null) throw new Error(`${theme}: ${surface} is not opaque`);
      const fill = flatten(chip.backgroundColor, ground);
      const edge = flatten(chip.borderTopColor, ground);
      const at = `${theme} on ${surface}`;
      if (contrast(fill, ground) < 1.2) failures.push(`${at}: fill ${contrast(fill, ground).toFixed(2)}:1`);
      const floor = SET_ON.includes(surface) ? 1.4 : 1.15;
      if (contrast(edge, ground) < floor) failures.push(`${at}: edge ${contrast(edge, ground).toFixed(2)}:1`);
      if (contrast(channels(chip.color), fill) < 7) failures.push(`${at}: words ${contrast(channels(chip.color), fill).toFixed(2)}:1`);
    }
    cleanup();
    uninstall();
  }
  expect(failures).toEqual([]);
});

test('a step link opens the vendor page in a new tab with no opener, underlined in a sentence, and says so', () => {
  render(<StepLink href="https://example.com/keys">Team Keys</StepLink>);
  const link = screen.getByRole('link', { name: 'Team Keys (opens in a new tab)' });
  expect(link.getAttribute('href')).toBe('https://example.com/keys');
  expect(link.getAttribute('target')).toBe('_blank');
  expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  expect(link.classList.contains('crewlet-link--inherit')).toBe(true);
  expect(link.querySelector('.crewlet-link__external')).toBeTruthy();
});

test('parts draw words as written, each UI name as one, and a link on the words that name the page', () => {
  const { container } = render(
    <p>
      <VendorText
        parts={[
          { text: 'Open ' },
          { ui: ['Users and Access', 'Integrations', 'Team Keys'], url: 'https://example.com/keys' },
          { text: ', then press ' },
          { ui: ['Generate API Key'] },
          { text: ' on the ' },
          { text: 'keys page', url: 'https://example.com/keys' },
          { text: '.' },
        ]}
      />
    </p>,
  );
  const names = container.querySelectorAll('.crewlet-vendor-ui');
  expect(names).toHaveLength(2);
  const links = screen.getAllByRole('link');
  expect(links).toHaveLength(2);
  expect(links[0]?.querySelector('.crewlet-vendor-ui')).toBeTruthy();
  expect(links[1]?.textContent).toContain('keys page');
  expect(container.textContent).toContain('press Generate API Key on the');
});

test('words go through renderWords, and a link whose address does not resolve is drawn without one', () => {
  render(
    <VendorText
      parts={[
        { text: 'Upload ' },
        { text: 'key.pem', url: 'https://{region}.example.com' },
      ]}
      renderWords={(w) => <em>{w}</em>}
      resolveUrl={(url) => (url.includes('{') ? undefined : url)}
    />,
  );
  expect(screen.queryByRole('link')).toBeNull();
  expect(screen.getByText('key.pem').tagName).toBe('EM');
});

test('as plain words, a menu path is joined with >', () => {
  expect(vendorTextString([{ text: 'Open ' }, { ui: ['Settings', 'API'] }, { text: '.' }])).toBe(
    'Open Settings > API.',
  );
});

test('has no accessibility violations', async () => {
  const { container } = render(
    <p>
      <VendorText
        parts={[
          { text: 'Open ' },
          { ui: ['Business Settings', 'System users'], url: 'https://example.com/users' },
          { text: ' and press ' },
          { ui: ['Add'] },
          { text: '.' },
        ]}
      />
    </p>,
  );
  const results = await axe.run(container);
  expect(results.violations).toEqual([]);
});
