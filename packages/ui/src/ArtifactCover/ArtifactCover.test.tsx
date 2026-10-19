/**
 * A gallery card's native covers: a doc's opening as a small page, a sheet's
 * first columns and rows, each bounded to what a card can hold.
 */

import { cleanup, render } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test } from 'vitest';
import { ArtifactCard } from '../ArtifactCard/index.js';
import { DocCover, SHEET_COVER_COLUMNS, SHEET_COVER_ROWS, SheetCover } from './index.js';

afterEach(cleanup);

const NOW = Date.parse('2026-10-17T12:00:00Z');

test('a doc cover sets its opening as a document', () => {
  const { container } = render(
    <DocCover>
      <h1>Runbook</h1>
      <p>Restart the worker first.</p>
    </DocCover>,
  );
  const page = container.querySelector('.crewlet-doc-cover .crewlet-doc-cover__page');
  expect(page?.querySelector('h1')?.textContent).toBe('Runbook');
});

test('a sheet cover draws at most its bound of columns and rows', () => {
  const columns = ['Vendor', 'Owner', 'Status', 'Score', 'Notes', 'Due'];
  const rows = Array.from({ length: 9 }, (_, i) => columns.map((c) => `${c} ${i}`));
  const { container } = render(<SheetCover columns={columns} rows={rows} />);
  expect(container.querySelectorAll('.crewlet-sheet-cover__cell--head')).toHaveLength(SHEET_COVER_COLUMNS);
  expect(container.querySelectorAll('.crewlet-sheet-cover__cell')).toHaveLength(SHEET_COVER_COLUMNS * (SHEET_COVER_ROWS + 1));
  expect(container.textContent).not.toContain('Notes');
});

test('a cover on a card carries no axe violation and is hidden from assistive tech', async () => {
  const { container } = render(
    <main>
      <h1>Artifacts</h1>
      <ArtifactCard
        title="Vendors"
        kind="sheet"
        href="#/a"
        updatedAt={NOW}
        now={NOW}
        preview={<SheetCover columns={['Vendor', 'Status']} rows={[['Acme', 'Open']]} />}
      />
      <ArtifactCard
        title="Runbook"
        kind="doc"
        href="#/b"
        updatedAt={NOW}
        now={NOW}
        preview={
          <DocCover>
            <h1>Runbook</h1>
          </DocCover>
        }
      />
    </main>,
  );
  expect(container.querySelector('.crewlet-artifact-card__preview')?.getAttribute('aria-hidden')).toBe('true');
  const result = await axe.run(container, { rules: { region: { enabled: false } } });
  expect(result.violations).toEqual([]);
});
