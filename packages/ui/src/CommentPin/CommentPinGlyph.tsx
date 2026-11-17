import { GLYPH_STROKE, cssLength, type GlyphProps } from '@crewlethq/icons/glyphs';
import { COMMENT_PIN_PATH, COMMENT_PIN_PLUS_PATH } from './shape.js';

/**
 * The draft comment pin as a glyph: its outline and its "+", drawn in the
 * glyph set's frame, so a Comment control and the pins it places read as one.
 */
export function CommentPinGlyph({ size, title, className, style, ...rest }: GlyphProps) {
  const dimension = cssLength(size);
  const semantics = title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true, focusable: false };
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={dimension}
      height={dimension}
      stroke="currentColor"
      {...semantics}
      className={className === undefined ? 'crewlet-glyph' : `crewlet-glyph ${className}`}
      {...rest}
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth={GLYPH_STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ ...style, strokeWidth: `var(--crewlet-glyph-stroke, ${GLYPH_STROKE})` }}
    >
      <path d={COMMENT_PIN_PATH} />
      <path d={COMMENT_PIN_PLUS_PATH} />
    </svg>
  );
}
