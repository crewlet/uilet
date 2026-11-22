/**
 * A linked cell names a record and stands alone: it is not underlined at rest,
 * while the same link set inside a sentence still is, and a pointer on it
 * underlines it. Measured in a browser in both palettes.
 */
import { afterEach, describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { Link, Table, TableEntityCell, TableKeyCell } from '@crewlethq/ui';

let root: Root | null = null;
let host: HTMLDivElement | null = null;

afterEach(async () => {
  await userEvent.unhover(document.body);
  root?.unmount();
  host?.remove();
  root = null;
  host = null;
  delete document.documentElement.dataset.theme;
});

function mount(theme: 'light' | 'dark'): HTMLDivElement {
  document.documentElement.dataset.theme = theme;
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  flushSync(() =>
    root!.render(
      <>
        <Table
          caption="Runs"
          headers={['Key', 'Owner']}
          data={[
            [
              <TableKeyCell key="key" value="work:task:0b4c6f0e" text="work:task:0b4c" href="#/work/0b4c" />,
              <TableEntityCell key="owner" name="Product Manager" href="#/seats/pm" />,
            ],
          ]}
        />
        <p style={{ color: 'var(--color-text-secondary)' }}>
          Owned by{' '}
          <Link className="in-sentence" href="#/seats/pm" size="inherit" variant="subtle">
            Product Manager
          </Link>
          .
        </p>
      </>,
    ),
  );
  return host;
}

const decoration = (el: Element | null) => getComputedStyle(el!).textDecorationLine;

describe('a linked table cell', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(`is not underlined at rest in the ${theme} palette, as a link in a sentence is`, () => {
      const page = mount(theme);
      expect(decoration(page.querySelector('a.crewlet-table-cell__key'))).toBe('none');
      expect(decoration(page.querySelector('a.crewlet-table-cell__entity'))).toBe('none');
      expect(decoration(page.querySelector('a.in-sentence'))).toBe('underline');
    });
  }

  test('is underlined under a pointer, as every link is', async () => {
    const page = mount('light');
    for (const selector of ['a.crewlet-table-cell__key', 'a.crewlet-table-cell__entity']) {
      const link = page.querySelector<HTMLElement>(selector)!;
      await userEvent.hover(link);
      expect(decoration(link)).toBe('underline');
    }
  });
});
