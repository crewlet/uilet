import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ArrangeBoard } from '../ArrangeBoard/ArrangeBoard.js';
import { ArrangeFrame } from '../ArrangeFrame/ArrangeFrame.js';
import { ArrangeGrid } from './ArrangeGrid.js';

describe('ArrangeGrid', () => {
  it('lays its blocks on twelve columns unless told otherwise', () => {
    const { container } = render(<ArrangeGrid>block</ArrangeGrid>);
    const grid = container.firstElementChild as HTMLElement;
    expect(grid.classList.contains('crewlet-arrange-grid')).toBe(true);
    expect(grid.style.getPropertyValue('--crewlet-arrange-columns')).toBe('12');
  });

  it('takes a column count, a class and its own attributes', () => {
    const { container } = render(
      <ArrangeGrid columns={1} className="mine" data-testid="g">
        block
      </ArrangeGrid>,
    );
    const grid = container.firstElementChild as HTMLElement;
    expect(grid.style.getPropertyValue('--crewlet-arrange-columns')).toBe('1');
    expect(grid.classList.contains('mine')).toBe(true);
    expect(grid.dataset.testid).toBe('g');
  });

  it('is the parent a frame spans its columns of', () => {
    const { container } = render(
      <ArrangeBoard editing={false}>
        <ArrangeGrid>
          <ArrangeFrame name="Four" editing={false} columns={4}>
            four
          </ArrangeFrame>
        </ArrangeGrid>
      </ArrangeBoard>,
    );
    const grid = container.querySelector('.crewlet-arrange-grid');
    expect(grid, container.innerHTML).not.toBeNull();
    const frame = grid!.firstElementChild as HTMLElement;
    expect(frame.style.gridColumn).toBe('span 4');
  });
});
