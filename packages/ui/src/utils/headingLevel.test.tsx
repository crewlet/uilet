/**
 * The heading level is a property of WHERE a component is, not of the
 * component. A form section is an h3 on a page under an h2 screen title and an
 * h2 inside a dialog whose title is the h1 of everything beneath it.
 */

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { HeadingLevelProvider, headingTag, nextHeadingLevel, useHeadingLevel } from './index.js';

afterEach(cleanup);

function Section({ title }: { title: string }) {
  const level = useHeadingLevel();
  const Tag = headingTag(level);
  return (
    <HeadingLevelProvider level={nextHeadingLevel(level)}>
      <Tag>{title}</Tag>
    </HeadingLevelProvider>
  );
}

test('a section under a page title is an h2, and under a surface that says otherwise is what it says', () => {
  render(
    <>
      <Section title="On the page" />
      <HeadingLevelProvider level={3}>
        <Section title="In a dialog" />
      </HeadingLevelProvider>
    </>,
  );
  expect(screen.getByText('On the page').tagName).toBe('H2');
  expect(screen.getByText('In a dialog').tagName).toBe('H3');
});

test('the step clamps at 6, because there is no h7', () => {
  // A div in the middle of an outline is worse than a repeated level: a reader
  // navigating by heading simply loses the section.
  expect(nextHeadingLevel(5)).toBe(6);
  expect(nextHeadingLevel(6)).toBe(6);
  render(
    <HeadingLevelProvider level={6}>
      <Section title="As deep as it goes" />
    </HeadingLevelProvider>,
  );
  expect(screen.getByText('As deep as it goes').tagName).toBe('H6');
});
