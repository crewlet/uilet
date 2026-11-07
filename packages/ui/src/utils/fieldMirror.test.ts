import { expect, test } from 'vitest';
import { MIRRORED_TEXT_STYLES, copyTextStyles } from './fieldMirror.js';

// One list for every mirror, so the auto-resize and the caret anchor wrap a
// field's text the same way. Mutation: drop a wrapping style and it fails.
test('copies every style that decides where a field wraps onto the mirror', () => {
  for (const key of ['width', 'fontFamily', 'fontSize', 'lineHeight', 'letterSpacing', 'paddingLeft', 'borderLeftWidth', 'whiteSpace', 'overflowWrap', 'wordBreak'] as const) {
    expect(MIRRORED_TEXT_STYLES).toContain(key);
  }
  const field = document.createElement('textarea');
  Object.assign(field.style, { width: '320px', fontSize: '15px', lineHeight: '22px', paddingLeft: '12px', letterSpacing: '1px' });
  document.body.append(field);
  const mirror = document.createElement('div');
  copyTextStyles(getComputedStyle(field), mirror);
  expect([mirror.style.width, mirror.style.fontSize, mirror.style.lineHeight, mirror.style.paddingLeft, mirror.style.letterSpacing]).toEqual(['320px', '15px', '22px', '12px', '1px']);
  field.remove();
});
