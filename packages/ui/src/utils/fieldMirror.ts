/**
 * A hidden mirror of a text field: the styles that decide where its text
 * wraps, and the caret's place measured on such a mirror. Shared by the
 * Textarea's auto-resize and the mention list's caret anchor.
 */

/** The text styles a mirror copies so it wraps exactly as the field does. */
export const MIRRORED_TEXT_STYLES = [
  'boxSizing',
  'width',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'borderStyle',
  'direction',
  'fontFamily',
  'fontSize',
  'fontStretch',
  'fontStyle',
  'fontVariant',
  'fontWeight',
  'letterSpacing',
  'lineHeight',
  'tabSize',
  'textIndent',
  'textTransform',
  'whiteSpace',
  'wordBreak',
  'wordSpacing',
  'overflowWrap',
] as const;

/** Copies a field's wrapping styles onto its mirror. */
export function copyTextStyles(from: CSSStyleDeclaration, to: HTMLElement): void {
  for (const key of MIRRORED_TEXT_STYLES) to.style[key] = from[key];
}

/** Where a character of a text field starts: px from a box's left and top edges, and the line's height. */
export interface CaretPoint {
  left: number;
  top: number;
  height: number;
}

/**
 * Where character `index` of a text field starts, measured on a hidden mirror
 * of the field that wraps its text the same way, less the field's scroll. In
 * px from the field's border box, or from `relativeTo`'s when given (the box a
 * `MentionMenu` is placed in, for its `anchor`).
 */
export function caretPoint(field: HTMLTextAreaElement | HTMLInputElement, index: number, relativeTo?: Element): CaretPoint {
  const style = getComputedStyle(field);
  const doc = field.ownerDocument;
  const mirror = doc.createElement('div');
  copyTextStyles(style, mirror);
  Object.assign(mirror.style, {
    position: 'absolute',
    top: '0',
    left: '-9999px',
    visibility: 'hidden',
    overflow: 'hidden',
    whiteSpace: field instanceof HTMLTextAreaElement ? 'pre-wrap' : 'pre',
    overflowWrap: 'break-word',
  });
  const at = Math.max(0, Math.min(index, field.value.length));
  mirror.textContent = field.value.slice(0, at);
  const marker = doc.createElement('span');
  marker.textContent = field.value.slice(at) || '.';
  mirror.append(marker);
  doc.body.append(mirror);
  const height = Number.parseFloat(style.lineHeight) || marker.offsetHeight;
  // An offset is from the mirror's padding box; the field's border comes first.
  let left = Number.parseFloat(style.borderLeftWidth) + marker.offsetLeft - field.scrollLeft;
  let top = Number.parseFloat(style.borderTopWidth) + marker.offsetTop - field.scrollTop;
  mirror.remove();
  if (relativeTo) {
    const own = field.getBoundingClientRect();
    const box = relativeTo.getBoundingClientRect();
    left += own.left - box.left;
    top += own.top - box.top;
  }
  return { left, top, height };
}
