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
  expect(rule).toMatch(/border: 1px solid var\(--color-border-default\)/);
  // Inline, so a link's underline is drawn under the name inside it.
  expect(rule).toContain('display: inline;');
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
