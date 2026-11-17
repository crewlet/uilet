import { themes } from '@crewlethq/tokens';
import { COMMENT_PIN_PATH, COMMENT_PIN_PLUS_PATH } from './shape.js';

/** The colours the placing cursor is drawn in: the draft pin's. */
export interface CommentPinCursorColours {
  /** The pin's ground: `--color-surface-elevated`. */
  fill: string;
  /** Its dashed edge and its "+": `--color-brand-accent`. */
  edge: string;
}

/** The light theme's draft pin, for a page with no tokens to read. */
export const COMMENT_PIN_CURSOR_COLOURS: CommentPinCursorColours = {
  fill: themes.light.color.surface.elevated,
  edge: themes.light.color.brand.accent,
};

/** The cursor's side, in CSS px: the small control step a pin is drawn at. */
export const COMMENT_PIN_CURSOR_SIZE = 24;

const attribute = (value: string) => value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/**
 * The CSS `cursor` value that draws the draft comment pin, its hotspot on the
 * pin's tip so a click pins exactly where the tip is. Mirrored for a
 * right-to-left page, whose pins stand up and to the left. Falls back to a
 * crosshair where a custom cursor is not drawn.
 */
export function commentPinCursor(
  colours: Partial<CommentPinCursorColours> = {},
  dir: 'ltr' | 'rtl' = 'ltr',
): string {
  const { fill, edge } = { ...COMMENT_PIN_CURSOR_COLOURS, ...colours };
  const flip = dir === 'rtl' ? ' transform="matrix(-1 0 0 1 24 0)"' : '';
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${COMMENT_PIN_CURSOR_SIZE}" height="${COMMENT_PIN_CURSOR_SIZE}" viewBox="0 0 24 24">` +
    `<g${flip} stroke-linecap="round" stroke-linejoin="round">` +
    `<path d="${COMMENT_PIN_PATH}" fill="${attribute(fill)}" stroke="${attribute(edge)}" stroke-width="2" stroke-dasharray="3.5 2.5"/>` +
    `<path d="${COMMENT_PIN_PLUS_PATH}" fill="none" stroke="${attribute(edge)}" stroke-width="2"/>` +
    `</g></svg>`;
  const [x, y] = dir === 'rtl' ? [21, 21] : [3, 21];
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${x} ${y}, crosshair`;
}

/**
 * The cursor in the colours the draft pin is drawn in at `element`: its
 * theme's and its brand's, read from the tokens there.
 */
export function commentPinCursorAt(element: Element): string {
  const view = element.ownerDocument.defaultView;
  if (!view) return commentPinCursor();
  const { fill, edge } = COMMENT_PIN_CURSOR_COLOURS;
  return commentPinCursor(
    {
      fill: colourAt(element, `var(--color-surface-elevated, ${fill})`),
      edge: colourAt(element, `var(--color-brand-accent, ${edge})`),
    },
    view.getComputedStyle(element).direction === 'rtl' ? 'rtl' : 'ltr',
  );
}

/** What a colour resolves to at `element`, as one colour an image can draw. */
function colourAt(element: Element, colour: string): string {
  const probe = element.ownerDocument.createElement('span');
  probe.style.display = 'none';
  probe.style.color = colour;
  element.appendChild(probe);
  const resolved = element.ownerDocument.defaultView!.getComputedStyle(probe).color;
  probe.remove();
  return resolved;
}
