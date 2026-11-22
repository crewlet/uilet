import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ArrangeBoard } from '../ArrangeBoard/ArrangeBoard.js';
import { ArrangeFrame } from '../ArrangeFrame/ArrangeFrame.js';
import { ArrangeGroup } from '../ArrangeGroup/ArrangeGroup.js';
import { ArrangeGrid } from './ArrangeGrid.js';
import { packGrid } from './usePackedGrid.js';

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

describe('ArrangeGrid pack', () => {
  // jsdom lays nothing out: each block is as tall as its `data-h` says.
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      const height = Number(this.dataset.h ?? 0);
      return { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: height, width: 0, height, toJSON: () => ({}) } as DOMRect;
    });
  });
  afterEach(() => vi.restoreAllMocks());

  const blocks = (
    <>
      <div data-h="600">Decisions</div>
      <div data-h="160">Live</div>
      <div data-h="120.6">Completed</div>
    </>
  );

  it('lays blocks in rows unless asked to pack', () => {
    const { container } = render(<ArrangeGrid>{blocks}</ArrangeGrid>);
    const grid = container.firstElementChild as HTMLElement;
    expect(grid.hasAttribute('data-packed')).toBe(false);
    expect(Array.from(grid.children, (el) => (el as HTMLElement).style.gridRowEnd)).toEqual(['', '', '']);
  });

  it('packed, spans each block over one-pixel rows as tall as it is, to the nearest row', () => {
    const { container } = render(<ArrangeGrid pack>{blocks}</ArrangeGrid>);
    const grid = container.firstElementChild as HTMLElement;
    expect(grid.hasAttribute('data-packed')).toBe(true);
    expect(grid.style.gridAutoRows).toBe('1px');
    expect(Array.from(grid.children, (el) => (el as HTMLElement).style.gridRowEnd)).toEqual([
      'span 600',
      'span 160',
      'span 121',
    ]);
  });

  it('measures a block again when its content changes', async () => {
    const { container } = render(<ArrangeGrid pack>{blocks}</ArrangeGrid>);
    const live = container.querySelectorAll<HTMLElement>('[data-h]')[1]!;
    await act(async () => {
      live.dataset.h = '360';
      live.append('and more');
    });
    expect(live.style.gridRowEnd).toBe('span 360');
  });

  it('turned off, gives the grid its rows back', () => {
    const { container, rerender } = render(<ArrangeGrid pack>{blocks}</ArrangeGrid>);
    rerender(<ArrangeGrid pack={false}>{blocks}</ArrangeGrid>);
    const grid = container.firstElementChild as HTMLElement;
    expect(grid.hasAttribute('data-packed')).toBe(false);
    expect(grid.style.gridAutoRows).toBe('');
    expect(Array.from(grid.children, (el) => (el as HTMLElement).style.gridRowEnd)).toEqual(['', '', '']);
  });

  it("packs a group's body as the grid it stands on does, unless the group says otherwise", () => {
    const group = (pack?: boolean) => (
      <ArrangeGroup title="Delivery" collapsed={false} onCollapsedChange={() => {}} pack={pack}>
        {blocks}
      </ArrangeGroup>
    );
    const body = (c: HTMLElement) => c.querySelector('.crewlet-arrange-group__body')!;
    expect(body(render(<ArrangeGrid pack>{group()}</ArrangeGrid>).container).hasAttribute('data-packed')).toBe(true);
    expect(body(render(<ArrangeGrid pack>{group(false)}</ArrangeGrid>).container).hasAttribute('data-packed')).toBe(false);
    expect(body(render(<ArrangeGrid>{group()}</ArrangeGrid>).container).hasAttribute('data-packed')).toBe(false);
  });

  it('takes coarser rows on a page too tall for a browser to place one-pixel rows', () => {
    const grid = document.createElement('div');
    for (const h of [20000, 300]) {
      const el = document.createElement('div');
      el.dataset.h = String(h);
      grid.append(el);
    }
    expect(packGrid(grid)).toBe(true);
    expect(grid.style.gridAutoRows).toBe('3px');
    expect((grid.firstElementChild as HTMLElement).style.gridRowEnd).toBe('span 6667');
    // The same blocks again: nothing is laid or written.
    expect(packGrid(grid)).toBe(false);
  });
});
