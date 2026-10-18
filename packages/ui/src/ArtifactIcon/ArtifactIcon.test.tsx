/**
 * The icon word an artifact's Settings promise ("One short word, such as
 * chart"), drawn as a glyph wherever the artifact is.
 */

import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { CalendarGlyph, ChartColumnGlyph, TableGlyph } from '@crewlethq/icons/glyphs';
import { ArtifactIcon, ARTIFACT_ICON_WORDS, artifactIconGlyph } from './index.js';

afterEach(cleanup);

const markup = (node: React.ReactElement) => render(node).container.innerHTML;

test('a known word names its glyph, whatever its case and spacing', () => {
  expect(artifactIconGlyph('chart')).toBe(ChartColumnGlyph);
  expect(artifactIconGlyph('  Calendar ')).toBe(CalendarGlyph);
  expect(ARTIFACT_ICON_WORDS).toContain('chart');
});

test('an unknown word, an empty one and a prototype key name nothing', () => {
  expect(artifactIconGlyph('spaceship')).toBeNull();
  expect(artifactIconGlyph('')).toBeNull();
  expect(artifactIconGlyph(undefined)).toBeNull();
  expect(artifactIconGlyph('constructor')).toBeNull();
});

test('draws the word glyph, and falls back to the kind glyph', () => {
  const chart = markup(<ArtifactIcon icon="chart" kind="sheet" />);
  cleanup();
  expect(chart).toBe(markup(<ChartColumnGlyph size="md" />));
  cleanup();
  const fallback = markup(<ArtifactIcon icon="spaceship" kind="sheet" />);
  cleanup();
  expect(fallback).toBe(markup(<TableGlyph size="md" />));
});
