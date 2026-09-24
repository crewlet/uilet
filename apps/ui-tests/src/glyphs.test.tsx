/**
 * The glyph contract as a consumer's compiler and a consumer's DOM see it.
 *
 * `@crewlethq/icons` holds its own markup in its own suite; what only a
 * TypeScript consumer can hold is the TYPE half of the filled state. `filled`
 * exists on a FILLABLE glyph and on nothing else, and `fill`, the stroke width
 * and the caps are not props at all, because each paints a stroke drawing into
 * something the design does not draw. Every `@ts-expect-error` below is an
 * assertion `npm run typecheck` makes: the day one of those props starts to
 * compile, the directive has nothing to expect and the typecheck fails.
 */
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import { FILLABLE, GLYPH_NAMES, StarGlyph, XGlyph, type FillableGlyphName, type GlyphName } from '@crewlethq/icons/glyphs';
import { glyphByName } from '@crewlethq/icons/glyphs/registry';

afterEach(cleanup);

describe('the filled state', () => {
  test('is a prop of a FILLABLE glyph, and paints its inside in the text colour', () => {
    const { container } = render(<StarGlyph filled />);
    expect(container.querySelector('svg')!.getAttribute('fill')).toBe('currentColor');
    const Star = glyphByName('star');
    const { container: looked } = render(<Star filled />);
    expect(looked.querySelector('svg')!.getAttribute('fill')).toBe('currentColor');
  });

  test('is not a prop of any other glyph, by type', () => {
    // @ts-expect-error `x` is not FILLABLE, so its component has no `filled`.
    const refused = <XGlyph filled />;
    const X = glyphByName('x');
    // @ts-expect-error The registry answers with the glyph's own type.
    const alsoRefused = <X filled />;
    const { container } = render(
      <>
        {refused}
        {alsoRefused}
      </>,
    );
    // And by the frame, for the caller the types do not reach.
    for (const svg of container.querySelectorAll('svg')) expect(svg.getAttribute('fill')).toBe('none');
  });

  test('names only glyphs the package carries', () => {
    const fillable: readonly FillableGlyphName[] = FILLABLE;
    const names: readonly GlyphName[] = GLYPH_NAMES;
    expect(fillable.every((name) => names.includes(name))).toBe(true);
    expect(fillable.length).toBeGreaterThan(0);
  });
});

describe('what the frame owns', () => {
  test('is not a prop, so a caller cannot draw a glyph off the design', () => {
    const glyphs = (
      <>
        {/* @ts-expect-error A stroke drawing's inside is not a caller's to paint. */}
        <XGlyph fill="currentColor" />
        {/* @ts-expect-error The weight is --crewlet-glyph-stroke, on an ancestor. */}
        <XGlyph strokeWidth={2} />
        {/* @ts-expect-error Round caps are the design's, on every glyph. */}
        <XGlyph strokeLinecap="butt" />
        {/* @ts-expect-error The drawing is on the 24 grid. */}
        <XGlyph viewBox="0 0 48 48" />
      </>
    );
    const { container } = render(glyphs);
    for (const svg of container.querySelectorAll('svg')) {
      expect(svg.getAttribute('fill')).toBe('none');
      expect(svg.getAttribute('stroke-width')).toBe('1.75');
      expect(svg.getAttribute('stroke-linecap')).toBe('round');
      expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
    }
  });

  test('a Material name is not a glyph name any more', () => {
    // @ts-expect-error `close` was Material's; Lucide's is `x`.
    expect(glyphByName('close')).toBeUndefined();
  });
});
