import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { CanvasSchematic } from './CanvasSchematic.js';

afterEach(cleanup);

const BOARDS = [
  { id: 'hero', x: 0, y: 0, w: 1440, h: 900, title: 'Hero' },
  { id: 'mobile', x: 1540, y: 0, w: 390, h: 844, title: 'Mobile' },
];

test('every board is drawn where the canvas places it, and only the cover is titled', () => {
  const { container } = render(
    <CanvasSchematic label="Launch, 2 boards" boards={BOARDS} notes={[{ x: 0, y: -120, w: 900, h: 80 }]} cover="mobile" />,
  );
  const svg = screen.getByRole('img', { name: 'Launch, 2 boards' });
  const boards = container.querySelectorAll('.crewlet-canvas-schematic__board');
  expect(boards).toHaveLength(2);
  expect(boards[1]!.getAttribute('x')).toBe('1540');
  expect(boards[1]!.hasAttribute('data-cover')).toBe(true);
  expect(boards[0]!.hasAttribute('data-cover')).toBe(false);
  expect(container.querySelectorAll('.crewlet-canvas-schematic__note')).toHaveLength(1);
  expect(svg.textContent).toBe('Mobile');
  // The view box holds every board and note, with room around them.
  const [x, y, w, h] = svg.getAttribute('viewBox')!.split(' ').map(Number);
  expect(x).toBeLessThan(0);
  expect(y).toBeLessThan(-120);
  expect(x! + w!).toBeGreaterThan(1930);
  expect(y! + h!).toBeGreaterThan(900);
});

test('a design with no boards draws an empty, still labelled, drawing', () => {
  render(<CanvasSchematic label="Empty" boards={[]} />);
  expect(screen.getByRole('img', { name: 'Empty' }).getAttribute('viewBox')).toBe('0 0 1 1');
});
