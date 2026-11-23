/**
 * A chart whose data has not arrived holds the room it will draw in: its plot
 * at the height it was given, its scale's row, and a legend row where it draws
 * one, marked busy and said once, with no figure a reader could take for data.
 */

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { BarList, Histogram, StackedColumns, TimeSeries } from './index.js';

afterEach(cleanup);

const plotHeight = (root: HTMLElement) =>
  (root.querySelector('.crewlet-skeleton__glow-box') as HTMLElement | null)?.style.height;

test('a loading time series holds its plot, its scale and its legend row', () => {
  const { container } = render(<TimeSeries label="Tokens per hour" series={[]} from={0} to={1} height="7rem" loading />);
  const figure = container.querySelector('figure')!;
  expect(figure.getAttribute('aria-busy')).toBe('true');
  expect(plotHeight(figure)).toBe('7rem');
  expect(figure.querySelector('.crewlet-time-series__scale')).not.toBeNull();
  expect(figure.querySelector('.crewlet-time-series__legend')).not.toBeNull();
  expect(screen.getByRole('status').textContent).toBe('Loading Tokens per hour');
  expect(container.querySelector('.crewlet-chart-empty')).toBeNull();
});

test('a loading time series with no legend draws no legend row', () => {
  const { container } = render(<TimeSeries label="x" series={[]} from={0} to={1} legend="none" loading />);
  expect(container.querySelector('.crewlet-time-series__legend')).toBeNull();
});

test('loading stacked columns keep their head, plot, dates and legend', () => {
  const { container } = render(
    <StackedColumns label="Turns" series={[]} buckets={[]} height="9rem" head={<span>Turns a day</span>} loading />,
  );
  const figure = container.querySelector('figure')!;
  expect(screen.getByText('Turns a day')).toBeTruthy();
  expect(plotHeight(figure)).toBe('9rem');
  expect(figure.querySelector('.crewlet-stacked-columns__scale')).not.toBeNull();
  expect(figure.querySelector('.crewlet-stacked-columns__legend--below')).not.toBeNull();
});

test('a loading bar list holds a row for each row it will show', () => {
  const { container } = render(<BarList data={[]} limit={5} loading loadingLabel="Loading spend by model" />);
  expect(container.querySelectorAll('.crewlet-bar-list__item')).toHaveLength(5);
  expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
  expect(screen.getByRole('status').textContent).toBe('Loading spend by model');
});

test('a loading histogram holds its plot and its tick row', () => {
  const { container } = render(
    <Histogram bars={[]} label="Events" formatTitle={() => ''} formatTick={() => ''} height={96} loading />,
  );
  expect(plotHeight(container)).toBe('96px');
  expect(container.querySelector('.crewlet-histogram__axis')).not.toBeNull();
});
