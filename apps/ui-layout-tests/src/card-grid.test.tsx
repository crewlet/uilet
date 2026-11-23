/**
 * Cards side by side end at one height: a short card beside a tall one, a card
 * wrapped in a focus target, a page that aligns the grid to the start, and a
 * footer that stays at its card's foot. Narrow, each card is its own height.
 */
import { afterEach, expect, test } from 'vitest';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import type { ReactNode } from 'react';
import { Button, Card, CardGrid } from '@crewlethq/ui';

let root: Root | null = null;
let host: HTMLElement | null = null;

afterEach(() => {
  flushSync(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

async function mount(width: number, node: ReactNode): Promise<HTMLElement> {
  host = document.createElement('div');
  host.style.width = `${width}px`;
  document.body.append(host);
  root = createRoot(host);
  flushSync(() => root!.render(node));
  await document.fonts.ready;
  return host;
}

const box = (el: Element) => el.getBoundingClientRect();
const cards = (at: HTMLElement) => [...at.querySelectorAll('.crewlet-card')];

const Short = ({ footer = false }: { footer?: boolean }) => (
  <Card padding="none">
    <Card.Header actions={<Button size="small">Test now</Button>}>
      <Card.Title>Answers</Card.Title>
    </Card.Header>
    <Card.Body>Last answered a minute ago.</Card.Body>
    {footer ? <Card.Footer>Footer</Card.Footer> : null}
  </Card>
);

const Tall = ({ footer = false }: { footer?: boolean }) => (
  <Card padding="none">
    <Card.Header>
      <Card.Title>Sign-in</Card.Title>
    </Card.Header>
    <Card.Body>
      {['Method', 'Secret', 'Value', 'Stored', 'Expires', 'Note'].map((line) => (
        <p key={line}>{line}</p>
      ))}
    </Card.Body>
    {footer ? <Card.Footer>Footer</Card.Footer> : null}
  </Card>
);

function expectOneRow(at: HTMLElement) {
  const [a, b] = cards(at);
  expect(Math.abs(box(a!).top - box(b!).top)).toBeLessThan(0.5);
  expect(Math.abs(box(a!).bottom - box(b!).bottom)).toBeLessThan(0.5);
  // The short card's body ends well above its foot, so the equal feet are the grid's doing.
  const body = b!.querySelector('.crewlet-card__body')!;
  expect(box(b!).bottom - box(body).bottom).toBeGreaterThan(40);
}

test('a short card beside a tall one ends where the tall one does', async () => {
  expectOneRow(
    await mount(
      900,
      <CardGrid columns={2}>
        <Tall />
        <Short />
      </CardGrid>,
    ),
  );
});

test('the short card keeps its footer at its foot', async () => {
  const at = await mount(
    900,
    <CardGrid columns={2}>
      <Tall footer />
      <Short footer />
    </CardGrid>,
  );
  expectOneRow(at);
  const [tall, short] = cards(at);
  const footer = (card: Element) => card.querySelector('.crewlet-card__footer')!;
  expect(Math.abs(box(footer(short!)).bottom - box(footer(tall!)).bottom)).toBeLessThan(0.5);
  expect(Math.abs(box(short!).bottom - 1 - box(footer(short!)).bottom)).toBeLessThan(0.5);
});

test('a card wrapped in a focus target fills its cell', async () => {
  expectOneRow(
    await mount(
      900,
      <CardGrid columns={2}>
        <Tall />
        <section tabIndex={-1} aria-label="Answers">
          <Short />
        </section>
      </CardGrid>,
    ),
  );
});

test('a page that aligns the grid to the start still gets one height', async () => {
  expectOneRow(
    await mount(
      900,
      <CardGrid columns={2} style={{ alignItems: 'start' }}>
        <Tall />
        <Short />
      </CardGrid>,
    ),
  );
});

test('a card with an empty body and one of raw children fill the row too', async () => {
  const at = await mount(
    1200,
    <CardGrid columns={3}>
      <Tall />
      <Card padding="none">
        <Card.Header>
          <Card.Title>Nothing yet</Card.Title>
        </Card.Header>
        <Card.Body />
      </Card>
      <Card>One line.</Card>
    </CardGrid>,
  );
  const bottoms = cards(at).map((card) => Math.round(box(card).bottom));
  expect(new Set(bottoms).size).toBe(1);
});

test('the count caps the row and the next card starts a row of its own', async () => {
  const at = await mount(
    1400,
    <CardGrid columns={2} min="sm">
      <Tall />
      <Short />
      <Short />
    </CardGrid>,
  );
  const [a, b, c] = cards(at);
  expect(Math.abs(box(a!).top - box(b!).top)).toBeLessThan(0.5);
  expect(box(c!).top).toBeGreaterThan(box(a!).bottom);
});

test('narrow, one card per row, each its own height', async () => {
  const at = await mount(
    320,
    <CardGrid columns={2} min="lg">
      <Tall footer />
      <Short footer />
    </CardGrid>,
  );
  const [tall, short] = cards(at);
  expect(box(short!).top).toBeGreaterThan(box(tall!).bottom);
  expect(box(short!).height).toBeLessThan(box(tall!).height - 50);
  expect(Math.abs(box(short!).width - 320)).toBeLessThan(0.5);
});

test('two footers in a stretched card stay together at its foot', async () => {
  const at = await mount(
    900,
    <CardGrid columns={2}>
      <Tall />
      <Card padding="none">
        <Card.Header>
          <Card.Title>Checks</Card.Title>
        </Card.Header>
        <Card.Footer variant="meta">Last run a minute ago</Card.Footer>
        <Card.Footer>
          <Button size="small">Run</Button>
        </Card.Footer>
      </Card>
    </CardGrid>,
  );
  const [, short] = cards(at);
  const [first, second] = [...short!.querySelectorAll('.crewlet-card__footer')];
  expect(Math.abs(box(second!).top - box(first!).bottom)).toBeLessThan(0.5);
  expect(Math.abs(box(short!).bottom - 1 - box(second!).bottom)).toBeLessThan(0.5);
});

test('a well inside a card keeps its own height, and what follows it stays under it', async () => {
  const at = await mount(
    900,
    <CardGrid columns={2}>
      <Tall />
      <Card>
        <Card variant="inset">A well</Card>
        <p className="after-well">After the well.</p>
      </Card>
    </CardGrid>,
  );
  const [, outer] = cards(at);
  const well = at.querySelector('.crewlet-card--inset')!;
  const after = at.querySelector('.after-well')!;
  expect(box(well).height).toBeLessThan(80);
  expect(box(outer!).bottom - box(after).bottom).toBeGreaterThan(40);
});

test('a hidden cell stays hidden', async () => {
  const at = await mount(
    900,
    <CardGrid as="ul" columns={2}>
      <li>
        <Tall />
      </li>
      <li hidden>
        <Short />
      </li>
    </CardGrid>,
  );
  expect(box(at.querySelector('li[hidden]')!).height).toBe(0);
});

test("a page's gap class does not change how many cards a row holds", async () => {
  const sheet = document.createElement('style');
  sheet.textContent = '.page-wide-gap { gap: 24px; }';
  document.head.append(sheet);
  try {
    const at = await mount(
      900,
      <CardGrid columns={2} className="page-wide-gap">
        <Tall />
        <Short />
      </CardGrid>,
    );
    expectOneRow(at);
  } finally {
    sheet.remove();
  }
});
