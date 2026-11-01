/**
 * The three things a folded section has to get right: its controls are not
 * inside its toggle, its heading is at the level where it sits, and `lazy`
 * means what it says.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { installThemed } from '../../../../apps/ui-tests/src/cascade.js';
import { Disclosure } from './index.js';
import { HeadingLevelProvider } from '../utils/headingLevel.js';

afterEach(cleanup);

/*
 * A path rather than `new URL(..., import.meta.url)`: Vite rewrites that exact
 * pattern into an asset reference, so the URL that comes back names the dev
 * server rather than the file on disk.
 */
const here = dirname(fileURLToPath(import.meta.url));

test('a flush section starts its chevron and its panel on the line its box starts on', () => {
  const { container } = render(
    <Disclosure title="Arguments" size="compact" headingLevel="none" flush defaultOpen>
      <p>{'{ "title": "Fix" }'}</p>
    </Disclosure>,
  );
  expect(container.firstElementChild!.classList.contains('crewlet-disclosure--flush')).toBe(true);
  const css = readFileSync(join(here, 'Disclosure.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  expect(css).toMatch(/\.crewlet-disclosure--flush \.crewlet-disclosure__trigger \{[^}]*margin-inline-start: calc\(-1 \* var\(--spacing-2\)\)/);
  // The trigger's own start inset, taken back exactly.
  expect(css).toMatch(/\.crewlet-disclosure__trigger \{[^}]*padding: var\(--spacing-1\) var\(--spacing-2\);/);
  // After the compact panel's inset, so a compact flush section is flush too.
  const compact = css.indexOf('.crewlet-disclosure--compact .crewlet-disclosure__panel {');
  const flush = css.indexOf('.crewlet-disclosure--flush .crewlet-disclosure__panel {');
  expect(flush).toBeGreaterThan(compact);
  expect(css.slice(flush, css.indexOf('}', flush))).toContain('padding-inline: 0');
});

test('the section own controls are beside the toggle, never inside it', () => {
  // A button nested in a button is not a thing, and worse: pressing the copy
  // control would collapse the very block it just copied.
  render(
    <Disclosure title="Thinking" actions={<button type="button">Copy</button>}>
      body
    </Disclosure>,
  );
  const toggle = screen.getByRole('button', { name: /Thinking/ });
  const copy = screen.getByRole('button', { name: 'Copy' });
  expect(copy.closest('button')).toBe(copy);
  expect(toggle.contains(copy)).toBe(false);
});

test('the fact and the count are read as words, not run into the title', () => {
  // Both sit INSIDE the button, so both are part of its name, and a name is
  // its parts concatenated with nothing put between them: the trigger was
  // announced as "Thinking12s2".
  render(
    <Disclosure title="Thinking" meta="12s" count={2}>
      body
    </Disclosure>,
  );
  expect(screen.getByRole('button', { name: 'Thinking 12s 2' })).toBeDefined();
});

test('the heading is the level where the section sits, and wraps the toggle', () => {
  render(
    <HeadingLevelProvider level={4}>
      <Disclosure title="Rounds">body</Disclosure>
    </HeadingLevelProvider>,
  );
  const toggle = screen.getByRole('button', { name: /Rounds/ });
  // The heading WRAPS the button rather than replacing it: a reader navigating
  // by heading finds the section, and the same element still opens it.
  expect(toggle.parentElement?.tagName).toBe('H4');
  expect(screen.getByRole('heading', { level: 4, name: /Rounds/ })).toBeDefined();
});

test('headingLevel none leaves the toggle unwrapped', () => {
  // A disclosure that is not a section of anything, a row inside a card, must
  // not put a heading into the document outline.
  render(
    <Disclosure title="arguments" headingLevel="none">
      body
    </Disclosure>,
  );
  expect(screen.queryByRole('heading')).toBeNull();
  expect(screen.getByRole('button', { name: /arguments/ })).toBeDefined();
});

test('lazy mounts the children only while open', () => {
  render(
    <Disclosure title="Record" lazy>
      <span>expensive</span>
    </Disclosure>,
  );
  expect(screen.queryByText('expensive')).toBeNull();

  fireEvent.click(screen.getByRole('button', { name: /Record/ }));
  expect(screen.getByText('expensive')).toBeDefined();

  fireEvent.click(screen.getByRole('button', { name: /Record/ }));
  expect(screen.queryByText('expensive')).toBeNull();
});

test('without lazy the panel stays mounted and is hidden', () => {
  // A panel removed from the tree loses whatever the reader had done inside
  // it: a scroll position, a half-typed field, an expanded row.
  const { container } = render(<Disclosure title="Record">kept</Disclosure>);
  const panel = container.querySelector('.crewlet-disclosure__panel') as HTMLElement;
  expect(panel.hidden).toBe(true);
  expect(panel.textContent).toBe('kept');
});

test('the toggle says what it controls, both ways', () => {
  const { container } = render(<Disclosure title="Rounds">body</Disclosure>);
  const toggle = screen.getByRole('button', { name: /Rounds/ });
  const panel = container.querySelector('.crewlet-disclosure__panel') as HTMLElement;

  expect(toggle.getAttribute('aria-expanded')).toBe('false');
  expect(toggle.getAttribute('aria-controls')).toBe(panel.id);
  expect(panel.getAttribute('aria-labelledby')).toBe(toggle.id);

  fireEvent.click(toggle);
  expect(toggle.getAttribute('aria-expanded')).toBe('true');
});

test('a controlled disclosure reports the change and draws what it is told', () => {
  const onOpenChange = vi.fn();
  const { rerender } = render(
    <Disclosure title="Rounds" open={false} onOpenChange={onOpenChange}>
      body
    </Disclosure>,
  );
  const toggle = screen.getByRole('button', { name: /Rounds/ });

  fireEvent.click(toggle);
  expect(onOpenChange).toHaveBeenCalledWith(true);
  // It did NOT open itself: a controlled component that also keeps its own
  // state is two sources of truth, and they disagree on the first refusal.
  expect(toggle.getAttribute('aria-expanded')).toBe('false');

  rerender(
    <Disclosure title="Rounds" open onOpenChange={onOpenChange}>
      body
    </Disclosure>,
  );
  expect(toggle.getAttribute('aria-expanded')).toBe('true');
});

test('the head keeps its target floor at the caption size', () => {
  // The head is set in the caption register, which is what makes the floor
  // load bearing rather than decorative: 12px of text with 4px of padding is a
  // 20px row, under the 24px WCAG 2.2 accepts, and `--size-row-sm` is the step
  // that floors at 24 under every density. Drop the floor to fit the smaller
  // type and the toggle stops being a target a finger can hit.
  const css = readFileSync(join(here, 'Disclosure.css'), 'utf8');
  const at = css.indexOf('.crewlet-disclosure__trigger {');
  expect(at).toBeGreaterThan(-1);
  const rule = css.slice(at, css.indexOf('}', at));
  expect(rule).toContain('font-size: var(--font-size-xs)');
  expect(rule).toContain('min-height: var(--size-row-sm)');

  // And the compact modifier does not restate the head's register. It used to
  // carry this exact size and gap, which is now the standalone head's own, and
  // one rule restating another is a rule that can only drift from it.
  expect(css).not.toContain('.crewlet-disclosure--compact .crewlet-disclosure__trigger');
});

test('a long fact gives up its room before the title does, and never all of it', () => {
  // A log's row at a 1024px window: the fact (replay mode, generation, range,
  // size) held its full width at `flex: none`, so the title, the only item
  // that could shrink, went to 0px and the row stopped saying which log it
  // was, while the fact ran out of the toggle under the badge beside it.
  const css = readFileSync(join(here, 'Disclosure.css'), 'utf8');
  const ruleOf = (selector: string) => {
    const at = css.indexOf(`${selector} {`);
    expect(at, selector).toBeGreaterThan(-1);
    return css.slice(at, css.indexOf('}', at));
  };
  const meta = ruleOf('.crewlet-disclosure__meta');
  // The fact grows from a zero basis into the room the title leaves, up to its
  // own width. A shrink ratio (a hundred to the title's one) still left the
  // title a fraction of a pixel of every shortfall, and an ellipsis does not
  // round: "tracker" was drawn "track…" beside a fact with room to give.
  expect(meta).toMatch(/flex:\s*1\s+1\s+0%?;/);
  expect(meta).toMatch(/max-width:\s*max-content/);
  expect(ruleOf('.crewlet-disclosure__title')).not.toMatch(/flex(-shrink)?:/);
  // It ends in an ellipsis rather than running on, inside the toggle.
  expect(meta).toMatch(/overflow:\s*hidden/);
  expect(meta).toMatch(/text-overflow:\s*ellipsis/);
  expect(meta).toMatch(/white-space:\s*nowrap/);
  // And it keeps a floor, so a fact that is a mark never shrinks to nothing.
  const floor = /min-width:\s*([^;]+);/.exec(meta)?.[1]?.trim();
  expect(floor).toBeDefined();
  expect(floor).not.toBe('0');

  // The fact is still the toggle's name in full: only its drawing is cut.
  const fact = 'replays from the snapshot, generation 14, 1.6 MB';
  render(
    <Disclosure title="tracker" meta={fact} actions={<span>Held by the backup</span>} headingLevel="none">
      Checks
    </Disclosure>,
  );
  expect(screen.getByRole('button').textContent).toContain(fact);
});

test('a closed panel is not drawn, whatever display the open one takes', () => {
  const uninstall = installThemed('light', 'Disclosure/Disclosure.css');
  const { container } = render(
    <Disclosure title="Tool call">
      <p>Arguments</p>
    </Disclosure>,
  );
  const panel = container.querySelector('.crewlet-disclosure__panel')!;
  expect(getComputedStyle(panel).display).toBe('none');
  fireEvent.click(screen.getByRole('button', { name: 'Tool call' }));
  expect(getComputedStyle(panel).display).toBe('flex');
  uninstall();
});
