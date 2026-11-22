/**
 * THE BUILD IS THE RAIL FOOT'S LAST LINE: under the account row, from the
 * badge's edge, one line however long the version, and the row above it
 * keeps its height and its controls.
 */
import { afterEach, expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { AppShell, Avatar, IconButton } from '@crewlethq/ui';
import { PaletteGlyph, SettingsGlyph } from '@crewlethq/icons/glyphs';

let root: Root | null = null;
let host: HTMLDivElement | null = null;

afterEach(() => {
  flushSync(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

async function draw(build?: string, detail = 'lee.parklee · Operations'): Promise<HTMLElement> {
  await page.viewport(1440, 900);
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  flushSync(() =>
    root!.render(
      <AppShell
        sidebar={
          <AppShell.Rail
            header={<a href="#/">Nimbus</a>}
            footer={
              <AppShell.AccountRow
                avatar={<Avatar name="Lee Park" kind="human" size="md" ring="brand" decorative />}
                name="Lee Park"
                detail={detail}
                href="#/account"
                build={build}
                actions={
                  <>
                    <IconButton label="Settings" icon={<SettingsGlyph size="sm" />} size="sm" variant="ghost" />
                    <IconButton label="Preferences" icon={<PaletteGlyph size="sm" />} size="sm" variant="ghost" />
                  </>
                }
              />
            }
          >
            <p>Places</p>
          </AppShell.Rail>
        }
        topbar={<AppShell.Topbar title="Home" />}
      >
        <p>The screen.</p>
      </AppShell>,
    ),
  );
  await document.fonts.ready;
  return host;
}

const box = (shown: HTMLElement, selector: string) => shown.querySelector(selector)!.getBoundingClientRect();

test.each([
  ['a release', 'Crewlet v1.4.0', 'lee.parklee · Operations'],
  ['the image of main', 'Crewlet main-3fa94c1d02be', 'lee.parklee · Operations'],
  ['a pseudo-version', 'Crewlet v0.0.0-20261121174512-3fa94c1d02be', 'lee.parklee · Operations'],
  ['a release beside a long detail', 'Crewlet v1.4.0', 'lee.park@operations.example.com · Operations and finance'],
])('%s is one quiet line under the row, from the badge, inside the rail', async (_, build, detail) => {
  const without = await draw(undefined, detail);
  const rest = { who: box(without, '.crewlet-account-row__who'), actions: box(without, '.crewlet-account-row__actions') };
  flushSync(() => root?.unmount());
  host?.remove();

  const shown = await draw(build, detail);
  const who = box(shown, '.crewlet-account-row__who');
  const avatar = box(shown, '.crewlet-account-row__avatar');
  const element = shown.querySelector<HTMLElement>('.crewlet-account-row__build')!;
  const line = element.getBoundingClientRect();
  const foot = shown.querySelector<HTMLElement>('.crewlet-app-shell__rail-foot')!;
  // Under the row, which keeps its height, its width and its controls.
  expect(line.top).toBeGreaterThanOrEqual(who.bottom - 0.5);
  expect(who.height).toBeCloseTo(rest.who.height, 1);
  expect(who.width).toBeCloseTo(rest.who.width, 1);
  // The controls stay on the row's line, beside the name, which is cut rather than pushing them down.
  const actions = box(shown, '.crewlet-account-row__actions');
  expect(actions.top).toBeCloseTo(rest.actions.top, 1);
  expect(actions.left).toBeCloseTo(rest.actions.left, 1);
  expect(actions.bottom).toBeLessThanOrEqual(line.top + 0.5);
  // From the badge's edge, one line, cut at the rail's edge rather than past it.
  expect(element.getBoundingClientRect().left + parseFloat(getComputedStyle(element).paddingInlineStart)).toBeCloseTo(avatar.left, 0);
  expect(line.height).toBeCloseTo(parseFloat(getComputedStyle(element).lineHeight), 0);
  expect(line.right).toBeLessThanOrEqual(foot.getBoundingClientRect().right);
  expect(foot.scrollWidth).toBeLessThanOrEqual(foot.clientWidth);
  // In the detail's quiet ink.
  expect(getComputedStyle(element).color).toBe(getComputedStyle(shown.querySelector('.crewlet-account-row__detail')!).color);
});
