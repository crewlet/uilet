/**
 * THE RAIL KEEPS ITS WIDTH WHEN ITS MIDDLE SCROLLS. The rail's middle (its
 * field and its navigation) is the rail's scroller, and a scrollbar drawn in
 * the layout takes its width from the scroller's content: when a long group
 * (a list of running work) grew the middle past the window, the field and
 * every row lost the bar's width, and the field's words were cut beside its
 * shortcut ("Search everythi..."). The field and a row are measured here at
 * rest and with the middle scrolling, on a scrolling screen and on a flush one,
 * and must keep one width, the one they had at rest before the rail reserved
 * anything.
 *
 * This file runs on the browser instance that draws scrollbars in the layout
 * (vitest.config.ts): the runner's headless default hides them, and there a
 * scroller gives up no width at all.
 */
import { afterEach, expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { AppShell, Kbd, NavGroup, NavItem, SearchTrigger, SidebarNav } from '@crewlethq/ui';

let root: Root | null = null;
let host: HTMLDivElement | null = null;

afterEach(() => {
  flushSync(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

/** A rail like an application's: a field, a few places, and a group of running work `running` rows long. */
function Console({ running, fill }: { running: number; fill?: 'flush' | undefined }) {
  return (
    <AppShell
      fill={fill}
      sidebar={
        <AppShell.Rail
          header={<a href="#/">Nimbus</a>}
          search={
            <SearchTrigger label="Search everything" keyshortcuts="Control+K" shortcut={<Kbd keys={['Ctrl', 'K']} />} />
          }
          footer={<a href="#/settings">Settings</a>}
        >
          <SidebarNav label="Navigation">
            <NavItem href="#/" label="Home" current />
            <NavItem href="#/inbox" label="Inbox" />
            <NavGroup label="Running">
              {Array.from({ length: running }, (_, at) => (
                <NavItem key={at} href={`#/live/${String(at)}`} label={`Release review ${String(at + 1)}`} />
              ))}
            </NavGroup>
          </SidebarNav>
        </AppShell.Rail>
      }
      topbar={<AppShell.Topbar title="Home" />}
    >
      <p>The screen.</p>
    </AppShell>
  );
}

interface Drawn {
  /** Whether the rail's middle overflows, so it scrolls. */
  scrolls: boolean;
  /** The width the middle's scrollbar takes from its content, reserved or drawn. */
  bar: number;
  field: { width: number; end: number };
  row: { width: number; end: number };
  /** Whether the field's words are cut. */
  cut: boolean;
}

async function draw(running: number, fill?: 'flush'): Promise<Drawn> {
  await page.viewport(1440, 900);
  host = document.createElement('div');
  host.style.cssText = 'height: 100vh;';
  document.body.append(host);
  root = createRoot(host);
  flushSync(() => root!.render(<Console running={running} fill={fill} />));
  await document.fonts.ready;
  await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
  const body = host.querySelector<HTMLElement>('.crewlet-app-shell__rail-body')!;
  const field = host.querySelector<HTMLElement>('.crewlet-search-trigger')!.getBoundingClientRect();
  const label = host.querySelector<HTMLElement>('.crewlet-search-trigger__label')!;
  const row = host.querySelector<HTMLElement>('.crewlet-nav-item__row')!.getBoundingClientRect();
  const drawn = {
    scrolls: body.scrollHeight > body.clientHeight,
    bar: body.offsetWidth - body.clientWidth,
    field: { width: field.width, end: field.right },
    row: { width: row.width, end: row.right },
    cut: label.scrollWidth > label.clientWidth,
  };
  flushSync(() => root?.unmount());
  host.remove();
  root = null;
  host = null;
  return drawn;
}

/** The width a field and a row had before the rail reserved anything: the rail less the nav's gutter at each side. */
function atRest(): number {
  const ruler = document.createElement('div');
  ruler.style.cssText = 'width: calc(var(--size-shell-rail) - 2 * var(--size-nav-gutter));';
  document.body.append(ruler);
  const width = ruler.getBoundingClientRect().width;
  ruler.remove();
  return width;
}

for (const fill of [undefined, 'flush'] as const) {
  test(`the field and a row keep one width whether or not the rail's middle scrolls, beside a ${fill ?? 'scrolling'} screen`, async () => {
    const width = atRest();
    expect(width).toBeGreaterThan(0);
    const rest = await draw(3, fill);
    const scrolling = await draw(60, fill);
    expect(rest.scrolls).toBe(false);
    expect(scrolling.scrolls).toBe(true);
    // The bar takes width in this browser, so the case below is not vacuous.
    expect(scrolling.bar, 'the scrollbar takes width from the middle').toBeGreaterThan(0);

    for (const [name, drawn] of [
      ['at rest', rest],
      ['scrolling', scrolling],
    ] as const) {
      expect(drawn.field.width, `the field ${name}`).toBeCloseTo(width, 1);
      expect(drawn.row.width, `a row ${name}`).toBeCloseTo(width, 1);
      // The field's edges are a row's highlight edges.
      expect(drawn.field.end, `the field ends where a row ends, ${name}`).toBeCloseTo(drawn.row.end, 1);
      expect(drawn.cut, `the field's words are whole ${name}`).toBe(false);
    }
    expect(scrolling.field.end, 'the field ends where it did at rest').toBeCloseTo(rest.field.end, 1);
    expect(scrolling.row.end, 'a row ends where it did at rest').toBeCloseTo(rest.row.end, 1);
  });
}
