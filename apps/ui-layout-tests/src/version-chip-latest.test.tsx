/**
 * Show latest stands beside an older version's chip at its height and on its
 * centre line, keeps the bar on one row, and takes its short word on a phone.
 */
import { afterEach, expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import type { ReactNode } from 'react';
import { InfoGlyph, Share2Glyph } from '@crewlethq/icons/glyphs';
import { ArtifactBar, ArtifactVersionChip, LayerHost } from '@crewlethq/ui';

let root: Root | null = null;
let host: HTMLElement | null = null;

afterEach(() => {
  flushSync(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

async function mount(node: ReactNode): Promise<HTMLElement> {
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  flushSync(() => root!.render(node));
  await document.fonts.ready;
  for (let i = 0; i < 4; i++) await new Promise((resolve) => requestAnimationFrame(resolve));
  return host;
}

for (const width of [1440, 390]) {
  test(`at ${width}px the chip and Show latest share a height and a centre, inside a one-row bar`, async () => {
    await page.viewport(width, 800);
    const at = await mount(
      <LayerHost>
        <div style={{ width }}>
          <ArtifactBar
            title="Architecture notes for the November planning offsite"
            kind="doc"
            kindLabel="Doc"
            back={{ href: '#', label: 'Back to artifacts' }}
            version={<ArtifactVersionChip version={18} latest={19} items={[]} onShowLatest={() => {}} />}
            tools={[
              { key: 'details', label: 'Details', icon: <InfoGlyph size="sm" />, onSelect: () => {} },
              { key: 'share', label: 'Share', icon: <Share2Glyph size="sm" />, labelled: true, onSelect: () => {} },
            ]}
          />
        </div>
      </LayerHost>,
    );
    const chip = at.querySelector<HTMLElement>('.crewlet-version-chip')!.getBoundingClientRect();
    const latest = at.querySelector<HTMLElement>('.crewlet-version-chip__latest')!;
    const box = latest.getBoundingClientRect();
    expect(Math.abs(box.height - chip.height)).toBeLessThan(0.5);
    expect(Math.abs(box.top + box.height / 2 - (chip.top + chip.height / 2))).toBeLessThan(0.5);
    expect(box.left).toBeGreaterThanOrEqual(chip.right);
    // Its words are whole, and the row did not grow sideways.
    expect(latest.scrollWidth).toBeLessThanOrEqual(latest.clientWidth + 1);
    const row = at.querySelector<HTMLElement>('.crewlet-artifact-bar__row')!;
    expect(row.scrollWidth).toBeLessThanOrEqual(row.clientWidth + 1);
    const title = at.querySelector<HTMLElement>('.crewlet-artifact-bar__title')!.getBoundingClientRect();
    expect(title.width, 'the title keeps room').toBeGreaterThan(width < 640 ? 60 : 200);
    const shown = (cls: string) => getComputedStyle(latest.querySelector(cls)!).display !== 'none';
    expect(shown('.crewlet-version-chip__latest-full')).toBe(width >= 640);
    expect(shown('.crewlet-version-chip__latest-short')).toBe(width < 640);
  });
}
