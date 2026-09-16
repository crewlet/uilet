/**
 * Metadata pairs, announced as pairs.
 */

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { DescriptionList } from './index.js';

afterEach(cleanup);

test('each pair is a dt and a dd inside one dl', () => {
  // The promise a description list makes, and the reason to reach for it: a
  // screen reader pairs each term with its own detail and counts them.
  const { container } = render(
    <DescriptionList
      items={[
        ['Seat', 'ceo'],
        ['Model', 'claude-opus-5'],
      ]}
    />,
  );
  expect(container.querySelectorAll('dl')).toHaveLength(1);
  expect([...container.querySelectorAll('dt')].map((term) => term.textContent)).toEqual(['Seat', 'Model']);
  expect([...container.querySelectorAll('dd')].map((detail) => detail.textContent)).toEqual([
    'ceo',
    'claude-opus-5',
  ]);
});

test('tuples and children are the same list', () => {
  const { container } = render(
    <DescriptionList items={[['Seat', 'ceo']]}>
      <DescriptionList.Item term="Node">node-a</DescriptionList.Item>
    </DescriptionList>,
  );
  expect([...container.querySelectorAll('dt')].map((term) => term.textContent)).toEqual(['Seat', 'Node']);
  expect(screen.getByText('node-a').tagName).toBe('DD');
});

test('a pair lays out on the list own tracks', () => {
  // A wrapper that participated in the grid would make every pair one cell,
  // and nothing would line up.
  const { container } = render(<DescriptionList items={[['Seat', 'ceo']]} />);
  const pair = container.querySelector('.crewlet-description-list__pair') as HTMLElement;
  expect(pair.parentElement?.tagName).toBe('DL');
  expect(pair.children).toHaveLength(2);
});
