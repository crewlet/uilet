/**
 * A titled band that holds blocks of a page: a region named by its title, a
 * header that folds it, a name that is a field only while the page is edited,
 * and a body that says when it holds nothing.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test, vi } from 'vitest';
import { ArrangeGroup } from './index.js';

afterEach(cleanup);

test('the group is a region named by its title, with its count beside it', () => {
  render(
    <ArrangeGroup title="Delivery" count={3} collapsed={false} onCollapsedChange={() => {}}>
      <p>Card</p>
    </ArrangeGroup>,
  );
  const region = screen.getByRole('region', { name: 'Delivery' });
  expect(region.querySelector('.crewlet-arrange-group__title')?.textContent).toBe('Delivery');
  expect(region.querySelector('.crewlet-arrange-group__count')?.textContent).toContain('3');
});

test('an untitled group is still named', () => {
  render(<ArrangeGroup title="" collapsed={false} onCollapsedChange={() => {}} />);
  expect(screen.getByRole('region', { name: 'Untitled group' })).toBeTruthy();
});

test('the header folds the group: one button, expanded state and the body it controls', () => {
  const onCollapsedChange = vi.fn();
  const { rerender } = render(
    <ArrangeGroup title="Delivery" collapsed={false} onCollapsedChange={onCollapsedChange}>
      <p>Card</p>
    </ArrangeGroup>,
  );
  const toggle = screen.getByRole('button', { name: 'Delivery' });
  expect(toggle.getAttribute('aria-expanded')).toBe('true');
  const body = document.getElementById(toggle.getAttribute('aria-controls')!)!;
  expect(body.hidden).toBe(false);
  fireEvent.click(toggle);
  expect(onCollapsedChange).toHaveBeenCalledWith(true);
  rerender(
    <ArrangeGroup title="Delivery" collapsed onCollapsedChange={onCollapsedChange}>
      <p>Card</p>
    </ArrangeGroup>,
  );
  expect(toggle.getAttribute('aria-expanded')).toBe('false');
  expect(body.hidden).toBe(true);
  fireEvent.click(toggle);
  expect(onCollapsedChange).toHaveBeenLastCalledWith(false);
});

test('read only, the name is text and there is no field', () => {
  render(<ArrangeGroup title="Delivery" collapsed={false} onCollapsedChange={() => {}} />);
  expect(screen.queryByRole('textbox')).toBeNull();
});

test('while editing, the name is a field and the fold control is named for what it does', () => {
  const onTitleChange = vi.fn();
  render(
    <ArrangeGroup title="Delivery" collapsed={false} onCollapsedChange={() => {}} onTitleChange={onTitleChange} />,
  );
  const field = screen.getByRole('textbox', { name: 'Group name' }) as HTMLInputElement;
  expect(field.value).toBe('Delivery');
  fireEvent.change(field, { target: { value: 'Shipping' } });
  expect(onTitleChange).toHaveBeenCalledWith('Shipping');
  expect(screen.getByRole('button', { name: 'Collapse Delivery' })).toBeTruthy();
});

test('a collapsed group being edited offers to expand', () => {
  render(<ArrangeGroup title="Delivery" collapsed onCollapsedChange={() => {}} onTitleChange={() => {}} />);
  expect(screen.getByRole('button', { name: 'Expand Delivery' })).toBeTruthy();
});

test('an empty body says so, and a body with blocks does not', () => {
  const { rerender, container } = render(
    <ArrangeGroup title="Delivery" collapsed={false} onCollapsedChange={() => {}} empty="Drag widgets here." />,
  );
  expect(container.querySelector('.crewlet-arrange-group__empty')?.textContent).toBe('Drag widgets here.');
  rerender(
    <ArrangeGroup title="Delivery" collapsed={false} onCollapsedChange={() => {}} empty="Drag widgets here.">
      <p>Card</p>
    </ArrangeGroup>,
  );
  expect(container.querySelector('.crewlet-arrange-group__empty')).toBeNull();
  expect(screen.getByText('Card')).toBeTruthy();
});

test('bodyProps reach the body, its class kept beside the group’s own and its columns set', () => {
  const onDrop = vi.fn();
  const { container } = render(
    <ArrangeGroup
      title="Delivery"
      collapsed={false}
      onCollapsedChange={() => {}}
      columns={6}
      bodyProps={{ className: 'drop-zone', 'data-reorder-over': 'true', onDrop }}
    >
      <p>Card</p>
    </ArrangeGroup>,
  );
  const body = container.querySelector<HTMLElement>('.crewlet-arrange-group__body')!;
  expect(body.classList.contains('drop-zone')).toBe(true);
  expect(body.getAttribute('data-reorder-over')).toBe('true');
  expect(body.style.getPropertyValue('--crewlet-arrange-columns')).toBe('6');
  fireEvent.drop(body);
  expect(onDrop).toHaveBeenCalledTimes(1);
});

test('the tone is a modifier on the group', () => {
  const { container } = render(
    <ArrangeGroup title="Spend" tone="purple" collapsed={false} onCollapsedChange={() => {}} />,
  );
  expect(container.querySelector('.crewlet-arrange-group')?.classList.contains('crewlet-arrange-group--purple')).toBe(
    true,
  );
});

test('passes axe, read only and while editing', async () => {
  const { container, rerender } = render(
    <ArrangeGroup title="Delivery" count={1} collapsed={false} onCollapsedChange={() => {}}>
      <p>Card</p>
    </ArrangeGroup>,
  );
  expect((await axe.run(container)).violations).toEqual([]);
  rerender(
    <ArrangeGroup title="Delivery" count={1} collapsed={false} onCollapsedChange={() => {}} onTitleChange={() => {}}>
      <p>Card</p>
    </ArrangeGroup>,
  );
  expect((await axe.run(container)).violations).toEqual([]);
});
