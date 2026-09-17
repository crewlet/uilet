/**
 * What a card owes: props that reach the stylesheet rather than the DOM, a
 * region a reader can find by its own heading, and a link that is a link.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, render, screen } from '@testing-library/react';
import { createPortal } from 'react-dom';
import { afterEach, expect, test } from 'vitest';
import { Card, useCardHeaderSlot } from './index.js';
import { HeadingLevelProvider } from '../utils/headingLevel.js';
import { inset, installSheets, px } from '../../../../apps/ui-tests/src/cascade.js';

/*
 * The stylesheet, in the document, for the guards that ask what the CASCADE
 * decides rather than what the source file says. A rule can be present in the
 * file and still not reach the element a component renders, and a guard that
 * matches the file's text goes green either way.
 */
let uninstall: (() => void) | null = null;
const styled = () => {
  uninstall = installSheets('Card/Card.css');
};

afterEach(() => {
  cleanup();
  uninstall?.();
  uninstall = null;
  // A test that puts its own probes in the document, rather than rendering a
  // component, leaves them there for the next one to match.
  document.body.innerHTML = '';
});

/*
 * A path rather than `new URL(..., import.meta.url)`: Vite rewrites that exact
 * pattern into an asset reference, so the URL that comes back names the dev
 * server rather than the file on disk.
 */
const here = dirname(fileURLToPath(import.meta.url));

/** The shadow tokens whose LIGHT value is the keyword `none`. */
function noneInLight(): string[] {
  const theme = JSON.parse(
    readFileSync(join(here, '../../../tokens/tokens/themes/light.json'), 'utf8'),
  ) as { shadow: Record<string, { value: string }> };
  return Object.entries(theme.shadow)
    .filter(([, step]) => step.value.trim() === 'none')
    .map(([name]) => `--shadow-${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`);
}

test('no shadow list carries a token that is `none` in one theme', () => {
  // `box-shadow: <shadow>, none` is INVALID: `none` is a value on its own and
  // never one entry of a list, so the whole declaration is dropped at
  // computed-value time and the element renders with no shadow at all. The
  // elevated card composed --shadow-hairline, which is `none` in the light
  // theme, into its list, and the light card lost the elevation the list was
  // written for. A token like that goes on an element of its own, where a sole
  // `none` is valid in both themes.
  const css = readFileSync(join(here, 'Card.css'), 'utf8');
  const lists = [...css.matchAll(/box-shadow:\s*([^;}]+)/g)]
    .map((match) => match[1] ?? '')
    .filter((value) => value.includes(','));
  const conditional = noneInLight();
  // A theme with no such token would make the rule vacuous, and the guard
  // would go green for the wrong reason.
  expect(conditional.length).toBeGreaterThan(0);
  const offenders = lists.flatMap((list) =>
    conditional.filter((token) => list.includes(token)).map((token) => `${token} in "${list.trim()}"`),
  );
  expect(offenders).toEqual([]);
});

test('no padding prop reaches the DOM, and each one reaches the stylesheet', () => {
  // `padding` was declared on the section props and never destructured, so it
  // fell through the rest spread and rendered as `padding="md"` on a div,
  // where it did nothing at all: three slots' padding was a prop the component
  // accepted and ignored.
  const { container } = render(
    <Card padding="sm">
      <Card.Header>
        <Card.Title>Nimbus</Card.Title>
      </Card.Header>
      <Card.Body padding="tight">rows</Card.Body>
      <Card.Footer padding="none">foot</Card.Footer>
    </Card>,
  );

  expect(container.querySelectorAll('[padding]')).toHaveLength(0);
  // The card is built from slots, so its own surface carries nothing whatever
  // it was asked for: `sm` names the inset its own content would take.
  expect(container.querySelector('.crewlet-card')?.className).toContain('crewlet-card--p-none');
  expect(container.querySelector('.crewlet-card__body')?.className).toContain('crewlet-card__body--p-tight');
  expect(container.querySelector('.crewlet-card__footer')?.className).toContain('crewlet-card__footer--p-none');
});

test('a sectioning card is named by its own title', () => {
  render(
    <Card as="section">
      <Card.Header>
        <Card.Title>Coding runs</Card.Title>
      </Card.Header>
      <Card.Body>rows</Card.Body>
    </Card>,
  );
  // A screen reader listing a page's regions finds this one by its heading
  // rather than as an unnamed "region".
  expect(screen.getByRole('region', { name: 'Coding runs' })).toBeDefined();
});

test('a sectioning card with no title points at nothing, rather than at a missing id', () => {
  // A dangling aria-labelledby leaves the region with NO name, which is worse
  // than the unnamed region it was meant to fix.
  const { container } = render(
    <Card as="section">
      <Card.Body>rows</Card.Body>
    </Card>,
  );
  expect(container.querySelector('section')?.getAttribute('aria-labelledby')).toBeNull();
});

test('the title takes the level where the card sits, and its contents go one deeper', () => {
  render(
    <HeadingLevelProvider level={3}>
      <Card as="section">
        <Card.Header>
          <Card.Title>Spend</Card.Title>
        </Card.Header>
        <Card.Body>
          <Card>
            <Card.Header>
              <Card.Title>By model</Card.Title>
            </Card.Header>
          </Card>
        </Card.Body>
      </Card>
    </HeadingLevelProvider>,
  );
  expect(screen.getByText('Spend').tagName).toBe('H3');
  expect(screen.getByText('By model').tagName).toBe('H4');
});

test('a card that goes somewhere is a real link, and is reachable', () => {
  render(
    <Card href="#/seats/ceo" as="section">
      <Card.Header>
        <Card.Title>Chief Executive</Card.Title>
      </Card.Header>
    </Card>,
  );
  const link = screen.getByRole('link', { name: /Chief Executive/ });
  expect(link.tagName).toBe('A');
  expect(link.getAttribute('href')).toBe('#/seats/ceo');
  // An anchor with an href is focusable without a tabindex of its own.
  link.focus();
  expect(document.activeElement).toBe(link);
});

test('the header slots draw where they belong, and the count is not tinted', () => {
  render(
    <Card>
      <Card.Header divided count={3} subtitle="every run in the last hour" actions={<button type="button">Refresh</button>}>
        <Card.Title>Coding runs</Card.Title>
      </Card.Header>
    </Card>,
  );
  expect(screen.getByText('3')).toBeDefined();
  expect(screen.getByText('every run in the last hour')).toBeDefined();
  // The action is a sibling of the title, never nested inside a control.
  const action = screen.getByRole('button', { name: 'Refresh' });
  expect(action.closest('.crewlet-card__header-actions')).not.toBeNull();
  expect(action.closest('.crewlet-card__title')).toBeNull();
});

test('a card built from slots is flush, and one given raw children keeps its own padding', () => {
  // The two recipes. A card whose slots carry the padding must not also carry
  // its own, or the header's rule stops short of the edge and every inset on
  // the card is doubled; a card given a paragraph must still be padded, or the
  // words sit on the border.
  const { container: composed } = render(
    <Card>
      <Card.Body>rows</Card.Body>
    </Card>,
  );
  const flush = composed.querySelector('.crewlet-card');
  expect(flush?.className).toContain('crewlet-card--flush');
  expect(flush?.className).toContain('crewlet-card--p-none');

  cleanup();
  const { container: raw } = render(<Card>a sentence</Card>);
  const padded = raw.querySelector('.crewlet-card');
  expect(padded?.className).not.toContain('crewlet-card--flush');
  expect(padded?.className).toContain('crewlet-card--p-md');

  cleanup();
  // An explicit padding on a FLUSH card does not put padding back on the card:
  // the slots still have to reach its edges. It names the inset of what the
  // card holds beside them, and there is nothing beside them here.
  const { container: asked } = render(
    <Card padding="lg">
      <Card.Body>rows</Card.Body>
    </Card>,
  );
  expect(asked.querySelector('.crewlet-card')?.className).toContain('crewlet-card--p-none');

  cleanup();
  // On a card given raw children it is the card's own surface that takes it.
  const { container: block } = render(<Card padding="lg">a sentence</Card>);
  expect(block.querySelector('.crewlet-card')?.className).toContain('crewlet-card--p-lg');
});

test('a header carries its rule unless it is told not to', () => {
  // The rule is the header. Without it a card with a table under its title is
  // a title floating over rows, which is the one shape this header exists to
  // stop.
  const { container } = render(
    <Card>
      <Card.Header>
        <Card.Title>Coding runs</Card.Title>
      </Card.Header>
    </Card>,
  );
  expect(container.querySelector('.crewlet-card__header')?.className).not.toContain(
    'crewlet-card__header--plain',
  );

  cleanup();
  const { container: plain } = render(
    <Card>
      <Card.Header divided={false}>
        <Card.Title>Coding runs</Card.Title>
      </Card.Header>
    </Card>,
  );
  expect(plain.querySelector('.crewlet-card__header')?.className).toContain('crewlet-card__header--plain');
});

test('slots reached through a fragment are still slots', () => {
  // A fragment is ONE child to Children.toArray, and it is how the slots reach
  // a card whenever a condition renders them: the ordinary
  // `{ready ? <><Card.Header /><Card.Body /></> : <Skeleton />}`. Counted as a
  // plain element, that card takes its own padding on top of the slots' own:
  // every inset doubled, and the header's rule stopping short of both edges
  // with nothing to say why.
  const { container } = render(
    <Card>
      <>
        <Card.Header>
          <Card.Title>Coding runs</Card.Title>
        </Card.Header>
        <Card.Body>rows</Card.Body>
      </>
    </Card>,
  );
  const card = container.querySelector('.crewlet-card');
  expect(card?.className).toContain('crewlet-card--flush');
  expect(card?.className).toContain('crewlet-card--p-none');
});

test('a tile takes the panel ground and the tighter inset, and an explicit padding still wins', () => {
  // `subtle` used to take the PAGE's ground, which draws a white card on a
  // white page held together by its hairline alone, at the panel's own 16px
  // inset. A grid of records is scanned down one column of names: at the
  // panel's inset each tile spends a third of its height on air.
  styled();
  const { container } = render(<Card variant="subtle">SRE Lead</Card>);
  const tile = container.querySelector('.crewlet-card')!;
  expect(tile.className).toContain('crewlet-card--p-tight');
  // The inset the tile actually draws, rather than the rule it was written in:
  // the selector moved into a group once the three scales became one, and a
  // guard matching that rule's own text went red over nothing drawn.
  expect(px(tile, 'padding-left')).toBe(12);
  expect(px(tile, 'padding-top')).toBe(12);

  cleanup();
  const explicit = render(<Card variant="subtle" padding="md">SRE Lead</Card>).container;
  expect(explicit.querySelector('.crewlet-card')?.className).toContain('crewlet-card--p-md');

  const css = readFileSync(join(here, 'Card.css'), 'utf8');
  const ground = (variant: string) =>
    /background-color:\s*var\((--[\w-]+)\)/.exec(
      new RegExp(`\\.crewlet-card--${variant}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? '',
    )?.[1];
  // The same ground the default card stands on, so every ink measured against
  // a card is measured against a tile too. The name is matched rather than
  // spelled: a token name written as a string in a source file is read as a
  // DECLARATION by the package's custom property check.
  expect(ground('subtle')).toMatch(/^--color-surface-subtle$/);
  expect(ground('subtle')).toBe(ground('default'));
});

test('a title keeps the page leading rather than the baseline heading leading', () => {
  // Card.Title renders a heading element, and the document baseline sets every
  // heading at the tight step. In a header row shared with a subtitle, a count
  // and the card's own buttons it is then the one thing on a different
  // rhythm, which is what made a head with a button in it taller than one
  // without.
  const css = readFileSync(join(here, 'Card.css'), 'utf8');
  const title = /\.crewlet-card__title\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
  expect(title).toMatch(/line-height:\s*var\(--font-line-height-normal\)/);
});

/*
 * The header row a card offers the panel inside it. What a table does with it
 * is held in the table's own suite; what is held here is the CARD's half of
 * the contract, which is the half a second panel, a card with no header and a
 * panel outside any card all depend on.
 */
function Probe({ label, wanted = true }: { label: string; wanted?: boolean }) {
  const chrome = useCardHeaderSlot(wanted);
  return (
    <>
      <span data-testid={`${label}-hosted`}>{String(chrome.hosted)}</span>
      {chrome.node === null ? null : createPortal(<button type="button">{label}</button>, chrome.node)}
    </>
  );
}

const hosted = (label: string) => screen.getByTestId(`${label}-hosted`).textContent;

test('a card with a header lends its row to one panel, and tells the next one no', () => {
  // Two pagers on one header row would each page rows the reader cannot tell
  // apart, so the row is TAKEN rather than shared. The first to ask holds it.
  const { container } = render(
    <Card as="section">
      <Card.Header>
        <Card.Title>Seats</Card.Title>
      </Card.Header>
      <Probe label="first" />
      <Probe label="second" />
    </Card>,
  );
  expect(hosted('first')).toBe('true');
  expect(hosted('second')).toBe('false');
  const row = container.querySelector('.crewlet-card__header-chrome')!;
  expect(row.textContent).toBe('first');
});

test('a panel that wants nothing there leaves the row for one that does', () => {
  const { container } = render(
    <Card as="section">
      <Card.Header>
        <Card.Title>Seats</Card.Title>
      </Card.Header>
      <Probe label="quiet" wanted={false} />
      <Probe label="loud" />
    </Card>,
  );
  expect(hosted('quiet')).toBe('false');
  expect(hosted('loud')).toBe('true');
  expect(container.querySelector('.crewlet-card__header-chrome')!.textContent).toBe('loud');
});

test('the row goes back when the panel holding it goes', () => {
  /*
   * A card whose panel is drawn from a condition would otherwise keep an empty
   * header row for the life of the screen, and the panel that replaced it
   * would draw a bar of its own under a header with nothing on it.
   *
   * The keys are what make this a MOUNT rather than an update: the row is held
   * by whoever asked for it, and a component React keeps in place through a
   * prop change never asked again. Which is also the rule's edge: a panel
   * already told no keeps its own bar rather than being promoted when the
   * holder leaves, because controls that jumped out of a panel's own bar and
   * onto a header the moment a sibling vanished would be a layout nobody
   * touched moving under the reader.
   */
  const { container, rerender } = render(
    <Card as="section">
      <Card.Header>
        <Card.Title>Seats</Card.Title>
      </Card.Header>
      <Probe key="first" label="first" />
    </Card>,
  );
  expect(hosted('first')).toBe('true');
  rerender(
    <Card as="section">
      <Card.Header>
        <Card.Title>Seats</Card.Title>
      </Card.Header>
      <Probe key="second" label="second" />
    </Card>,
  );
  expect(hosted('second')).toBe('true');
  expect(container.querySelector('.crewlet-card__header-chrome')!.textContent).toBe('second');
});

test('a card with no header, and no card at all, lend nothing', () => {
  const { container } = render(
    <>
      <Card as="section">
        <Card.Body>Rows.</Card.Body>
        <Probe label="bodied" />
      </Card>
      <Probe label="loose" />
    </>,
  );
  expect(hosted('bodied')).toBe('false');
  expect(hosted('loose')).toBe('false');
  expect(container.querySelector('.crewlet-card__header-chrome')).toBe(null);
});

test('the card own actions come first on the row, then the panel controls', () => {
  // The cog stays the last thing on the line, which is where it sits in the
  // table's own bar: a reader who has learnt where it is finds it in the same
  // place on a panel.
  const { container } = render(
    <Card as="section">
      <Card.Header actions={<button type="button">Refresh</button>}>
        <Card.Title>Seats</Card.Title>
      </Card.Header>
      <Probe label="pager" />
    </Card>,
  );
  const row = [...container.querySelectorAll('.crewlet-card__header > *')].map((node) =>
    node.className.replace('crewlet-card__header-', ''),
  );
  expect(row).toEqual(['main', 'actions', 'chrome']);
});

test('an empty row is given no box, and the card own actions keep the row end', () => {
  /*
   * Every header inside a card renders the row, because the panel that might
   * fill it is below the header in the tree. Without the first rule every card
   * in the product opens its header gap for a box with nothing in it; without
   * the second, the card's actions and the panel's controls both carry an auto
   * margin and SPLIT the free space between them, which puts the card's own
   * actions in the middle of its own header.
   *
   * Asked of the CASCADE over the rendered header rather than of the text of
   * the stylesheet: a `:empty` rule a later one overrides, or one whose
   * selector does not match the node the component actually renders, reads
   * exactly the same in the file.
   */
  styled();
  const { container } = render(
    <Card as="section">
      <Card.Header actions={<button type="button">Refresh</button>}>
        <Card.Title>Seats</Card.Title>
      </Card.Header>
      <Probe label="pager" />
    </Card>,
  );
  const chrome = container.querySelector('.crewlet-card__header-chrome')!;
  expect(chrome.textContent).toBe('pager');
  expect(getComputedStyle(chrome).display).toBe('flex');
  // The panel's controls close onto the card's own, which keep the row end.
  expect(getComputedStyle(chrome).marginInlineStart).toBe('0px');
  expect(getComputedStyle(container.querySelector('.crewlet-card__header-actions')!).marginInlineStart).toBe(
    'auto',
  );

  cleanup();
  const { container: bare } = render(
    <Card as="section">
      <Card.Header>
        <Card.Title>Seats</Card.Title>
      </Card.Header>
    </Card>,
  );
  const unused = bare.querySelector('.crewlet-card__header-chrome')!;
  expect(unused.childNodes).toHaveLength(0);
  expect(getComputedStyle(unused).display).toBe('none');
});

test('a card draws its own content at its own inset, on the title line', () => {
  /*
   * THE DEFECT THIS EXISTS FOR. A card is flush the moment it holds a slot,
   * and flush means the card carries no padding: the slots carry theirs and
   * reach its edges. A child that is NOT a slot carries none of its own, so it
   * was drawn hard against the border while the title three lines above it sat
   * at the card's inset. In one card on the engine's spend screen the empty
   * chart line was indented and the sentence under it was not, 16px apart,
   * because the chart had been given a padding of its own to cover the same
   * fault one element at a time.
   */
  styled();
  const { container } = render(
    <Card as="section">
      <Card.Header subtitle="from each completion's own reported model">
        <Card.Title>By model</Card.Title>
      </Card.Header>
      <p>No model calls in this window.</p>
      <p className="note">Built from what each completion reported.</p>
    </Card>,
  );
  const card = container.querySelector('.crewlet-card')!;
  const title = screen.getByText('By model');
  const first = screen.getByText('No model calls in this window.');
  const second = screen.getByText('Built from what each completion reported.');

  // Both sentences are in ONE body, which is where the caller wrote them: a
  // body each would put a second inset between two lines of one block.
  const bodies = card.querySelectorAll('.crewlet-card__body');
  expect(bodies).toHaveLength(1);
  expect(first.parentElement).toBe(bodies[0]);
  expect(second.parentElement).toBe(bodies[0]);

  // And the body starts where the title starts.
  expect(inset(first, card)).toBe(inset(title, card));
  expect(inset(second, card)).toBe(inset(first, card));
  expect(inset(first, card)).toBe(16);
});

test('a head stays one line, and the subtitle is what gives up its tail', () => {
  /*
   * The head is one line. A title left free to wrap took one back the moment
   * the subtitle beside it needed a pixel: at 1100px wide the spend screen
   * drew "By model" as "By" over "model" and the head stood 67px instead of
   * 48, while the subtitle beside it still had a tail to give up.
   *
   * Two rules, both asked of the rendered nodes rather than of the file: the
   * title never wraps, and the subtitle absorbs the shrinking, so a title
   * keeps its identity and the row keeps its height.
   */
  styled();
  const { container } = render(
    <Card as="section">
      <Card.Header subtitle="from each completion's own reported model">
        <Card.Title>By model</Card.Title>
      </Card.Header>
    </Card>,
  );
  const title = container.querySelector('.crewlet-card__title')!;
  const main = container.querySelector('.crewlet-card__header-main')!;
  const subtitle = container.querySelector('.crewlet-card__subtitle')!;
  expect(getComputedStyle(title).whiteSpace).toBe('nowrap');
  // And a title with nowhere left to go is cut at the row's end rather than
  // drawn across the controls beside it.
  expect(getComputedStyle(main).overflow).toBe('hidden');
  expect(px(subtitle, 'flex-shrink')).toBeGreaterThan(px(main, 'flex-shrink') * 10);
});

test('a title asked to truncate ENDS, and one that was not is untouched', () => {
  /*
   * THE DEFECT THIS EXISTS FOR. The name block clips so the head stays one
   * line, and the title itself is a FLEX container: `text-overflow` applies to
   * a block container and never to a flex one, so a title longer than the row
   * was cut at the header's edge mid-word rather than ellipsed, and the text
   * it would have acted on is an anonymous flex item that no rule in the
   * stylesheet can reach. A consumer fixed it by redeclaring
   * `.crewlet-card__title` in its own sheet, which is a package class reached
   * into from outside.
   *
   * Asked of the CASCADE rather than of the file: a modifier that ties with
   * the base rule on specificity and loses on source order reads exactly the
   * same in the source.
   */
  styled();
  const { container } = render(
    <Card as="section">
      <Card.Header subtitle="every unit under Engineering">
        <Card.Title truncate>Platform Reliability and Developer Experience</Card.Title>
      </Card.Header>
    </Card>,
  );
  const title = container.querySelector('.crewlet-card__title')!;
  // A block container, which is the only kind `text-overflow` acts on.
  expect(getComputedStyle(title).display).toBe('block');
  expect(getComputedStyle(title).overflow).toBe('hidden');
  expect(getComputedStyle(title).getPropertyValue('text-overflow')).toBe('ellipsis');
  // And the head's own rule is untouched: the line does not grow a second one.
  expect(getComputedStyle(title).whiteSpace).toBe('nowrap');

  cleanup();
  // The default is what every current call site draws, unchanged: the flex
  // title, with no truncation rule on it at all.
  const { container: asBefore } = render(
    <Card as="section">
      <Card.Header>
        <Card.Title>Platform Reliability and Developer Experience</Card.Title>
      </Card.Header>
    </Card>,
  );
  const plain = asBefore.querySelector('.crewlet-card__title')!;
  expect(plain.className).not.toContain('crewlet-card__title--truncate');
  expect(getComputedStyle(plain).display).toBe('flex');
  expect(getComputedStyle(plain).getPropertyValue('text-overflow')).not.toBe('ellipsis');
});

test('a truncating title keeps the caller own class, and the heading it always was', () => {
  /*
   * The modifier is ADDED to what the title already carried, never in place of
   * it: a rule a consumer wrote against `.crewlet-card__title` still matches,
   * and its own class still lands last.
   *
   * There is deliberately no guard here that `truncate` stays off the DOM, the
   * way the padding props have one. React drops an unknown attribute whose
   * value is a boolean rather than rendering it, so a `truncate` left in the
   * rest spread produces no attribute to find and such a guard could not fail:
   * what a forgotten destructure actually costs is the class, which the case
   * above is what holds.
   */
  const { container } = render(
    <Card>
      <Card.Header>
        <Card.Title truncate className="mine">
          Platform Reliability
        </Card.Title>
      </Card.Header>
    </Card>,
  );
  const title = container.querySelector('.crewlet-card__title')!;
  expect(title.tagName).toBe('H2');
  expect(title.className.split(/\s+/)).toEqual([
    'crewlet-card__title',
    'crewlet-card__title--truncate',
    'mine',
  ]);
});

test('a card told to carry no inset leaves its own content flush, and adds no box', () => {
  // What `padding="none"` is for: a table reaches the card's edges. A body
  // around it at no inset would still add a column direction and a gap between
  // its rows and whatever else the card holds.
  styled();
  const { container } = render(
    <Card as="section" padding="none">
      <Card.Header>
        <Card.Title>By seat</Card.Title>
      </Card.Header>
      <table>
        <tbody>
          <tr>
            <td>SRE Lead</td>
          </tr>
        </tbody>
      </table>
    </Card>,
  );
  const card = container.querySelector('.crewlet-card')!;
  expect(card.querySelector('.crewlet-card__body')).toBeNull();
  expect(container.querySelector('table')!.parentElement).toBe(card);
  expect(inset(container.querySelector('table')!, card)).toBe(0);
});

test('a slot is never wrapped, and a card with no slot is left as it was', () => {
  // The body is added to what is NOT a slot. A Card.Body drawn inside another
  // one would be the header's rule stopping 16px short of both edges and every
  // inset on the card doubled.
  const { container } = render(
    <Card as="section">
      <Card.Header>
        <Card.Title>Seats</Card.Title>
      </Card.Header>
      <Card.Body>rows</Card.Body>
      <Card.Footer>3 seats</Card.Footer>
    </Card>,
  );
  expect(container.querySelectorAll('.crewlet-card__body')).toHaveLength(1);
  expect(container.querySelector('.crewlet-card__body')!.parentElement).toBe(
    container.querySelector('.crewlet-card'),
  );

  cleanup();
  // No slot at all is the other recipe: the card is the padded block, and its
  // children are its own.
  const { container: block } = render(
    <Card>
      <p>a sentence</p>
    </Card>,
  );
  expect(block.querySelector('.crewlet-card__body')).toBeNull();
  expect(block.querySelector('p')!.parentElement).toBe(block.querySelector('.crewlet-card'));
});

test('one word names one inset, on the card and on either section', () => {
  /*
   * They were two scales sharing two words. `tight` was 12px on every edge on
   * the card and 8px over 16px on a body; `md` was 16px on a card and a body
   * and 8px over 16px on a footer. A caller who read the card's steps and
   * wrote one of them on a body got an inset nobody had documented.
   */
  styled();
  document.body.insertAdjacentHTML(
    'beforeend',
    ['none', 'tight', 'sm', 'md', 'lg']
      .map(
        (step) =>
          `<i data-step="${step}" class="crewlet-card crewlet-card--p-${step}"></i>` +
          `<i data-step="${step}" class="crewlet-card__body crewlet-card__body--p-${step}"></i>` +
          `<i data-step="${step}" class="crewlet-card__footer crewlet-card__footer--p-${step}"></i>`,
      )
      .join(''),
  );
  for (const step of ['none', 'tight', 'sm', 'md', 'lg']) {
    const [card, body, footer] = [...document.querySelectorAll(`i[data-step="${step}"]`)];
    for (const side of ['top', 'left'] as const) {
      expect(px(body!, `padding-${side}`)).toBe(px(card!, `padding-${side}`));
      expect(px(footer!, `padding-${side}`)).toBe(px(card!, `padding-${side}`));
    }
  }
  // And the scale is the one the card's own documentation describes: a tile's
  // 12px on every edge, and a vertical-only step that keeps the header's edge.
  const at = (step: string) =>
    document.querySelector(`i.crewlet-card--p-${step}`) as HTMLElement;
  expect([px(at('tight'), 'padding-top'), px(at('tight'), 'padding-left')]).toEqual([12, 12]);
  expect([px(at('sm'), 'padding-top'), px(at('sm'), 'padding-left')]).toEqual([8, 16]);
  expect([px(at('md'), 'padding-top'), px(at('md'), 'padding-left')]).toEqual([16, 16]);
});
