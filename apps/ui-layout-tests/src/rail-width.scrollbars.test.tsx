/**
 * The rail's field and rows keep their at-rest width while its middle scrolls.
 * Runs on the browser that draws scrollbars in the layout (vitest.config.ts).
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
