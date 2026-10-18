/**
 * The wire between a host page and an artifact's document. Every reader here
 * takes input from the other side of a trust boundary, so each is held to
 * refusing what is not exactly its shape.
 */

import { afterEach, describe, expect, test } from 'vitest';
import {
  applyFrameTheme,
  checkFrameSandbox,
  DEFAULT_FRAME_THEME,
  externalUrl,
  FRAME_MESSAGE,
  frameFragment,
  frameOriginMatches,
  frameThemeMessage,
  negotiateBridge,
  parseFrameFragment,
  portTargetOrigin,
  readFrameHello,
  readFramePortMessage,
  readFrameTheme,
  readOpenLink,
  isFocusExit,
  type FrameTheme,
} from './index.js';

const NONCE = 'n0nce-abcdefghijklmnop';
const THEME: FrameTheme = { mode: 'dark', palette: 'dusk', density: 'compact' };

afterEach(() => {
  for (const name of ['data-theme', 'data-palette', 'data-density']) document.documentElement.removeAttribute(name);
});

describe('the fragment', () => {
  test('round-trips the nonce and the appearance', () => {
    expect(parseFrameFragment(`#${frameFragment(NONCE, THEME)}`)).toEqual({ nonce: NONCE, theme: THEME });
  });

  test('drops a value that is not an allowed one for its default, rather than applying it', () => {
    const parsed = parseFrameFragment('#nonce=short&theme=sepia&palette=Bad%20Name&density=huge');
    expect(parsed.nonce).toBeNull();
    expect(parsed.theme).toEqual(DEFAULT_FRAME_THEME);
  });

  test('an empty fragment is the defaults and no nonce', () => {
    expect(parseFrameFragment('')).toEqual({ nonce: null, theme: DEFAULT_FRAME_THEME });
  });
});

describe('the sandbox check', () => {
  test('passes the tokens a frame may carry, per artifact', () => {
    expect(checkFrameSandbox('allow-scripts allow-same-origin allow-forms', 'per_artifact')).toEqual({
      ok: true,
      value: 'allow-scripts allow-same-origin allow-forms',
    });
  });

  test('refuses allow-same-origin on the shared host, where it would hand every artifact one origin', () => {
    expect(checkFrameSandbox('allow-scripts allow-same-origin', 'shared')).toEqual({ ok: false, refused: ['allow-same-origin'] });
  });

  test.each(['allow-popups', 'allow-popups-to-escape-sandbox', 'allow-top-navigation', 'allow-pointer-lock', 'allow-presentation', 'allow-storage-access-by-user-activation'])(
    'never passes %s',
    (token) => {
      expect(checkFrameSandbox(`allow-scripts ${token}`, 'per_artifact')).toEqual({ ok: false, refused: [token] });
    },
  );
});

describe('origins', () => {
  test('per artifact, a message must come from the artifact origin exactly', () => {
    expect(frameOriginMatches('per_artifact', 'https://a1.example.net', 'https://a1.example.net')).toBe(true);
    expect(frameOriginMatches('per_artifact', 'https://a1.example.net', 'https://a2.example.net')).toBe(false);
    expect(frameOriginMatches('per_artifact', 'https://a1.example.net', 'null')).toBe(false);
  });

  test('on the shared host, only from an opaque origin', () => {
    expect(frameOriginMatches('shared', 'https://artifacts.example.net', 'null')).toBe(true);
    expect(frameOriginMatches('shared', 'https://artifacts.example.net', 'https://artifacts.example.net')).toBe(false);
  });

  test('the port goes to the named origin per artifact, and to the checked window on the shared host', () => {
    expect(portTargetOrigin('per_artifact', 'https://a1.example.net')).toBe('https://a1.example.net');
    expect(portTargetOrigin('shared', 'https://artifacts.example.net')).toBe('*');
  });
});

describe('the hello', () => {
  const hello = { type: FRAME_MESSAGE.hello, nonce: NONCE, contract: '1.0.0', bridge: { min: 1, max: 1 } };

  test('reads a well-formed one', () => {
    expect(readFrameHello(hello)).toEqual(hello);
  });

  test.each([
    ['another type', { ...hello, type: 'crewlet.hi' }],
    ['no nonce', { ...hello, nonce: undefined }],
    ['a short nonce', { ...hello, nonce: 'abc' }],
    ['a contract that is not a version', { ...hello, contract: 'latest' }],
    ['an inverted bridge range', { ...hello, bridge: { min: 2, max: 1 } }],
    ['a fractional bridge version', { ...hello, bridge: { min: 1.5, max: 2 } }],
    ['a string', 'crewlet.hello'],
    ['null', null],
  ])('refuses %s', (_name, data) => {
    expect(readFrameHello(data)).toBeNull();
  });

  test('negotiates the highest version both ends speak, or none', () => {
    expect(negotiateBridge({ min: 1, max: 3 }, { min: 2, max: 4 })).toBe(3);
    expect(negotiateBridge({ min: 1, max: 1 })).toBe(1);
    expect(negotiateBridge({ min: 2, max: 3 }, { min: 1, max: 1 })).toBeNull();
  });

  test('a port message carries its bridge version', () => {
    expect(readFramePortMessage({ type: FRAME_MESSAGE.port, bridge: 1 })).toEqual({ type: FRAME_MESSAGE.port, bridge: 1 });
    expect(readFramePortMessage({ type: FRAME_MESSAGE.port })).toBeNull();
  });
});

describe('the theme message', () => {
  test('round-trips, and refuses any value outside the allowed ones', () => {
    expect(readFrameTheme(frameThemeMessage(THEME))).toEqual(THEME);
    expect(readFrameTheme({ ...frameThemeMessage(THEME), mode: 'sepia' })).toBeNull();
    expect(readFrameTheme({ ...frameThemeMessage(THEME), palette: '"]{}' })).toBeNull();
  });

  test('writes the three attributes the way the application writes its own', () => {
    const root = document.documentElement;
    applyFrameTheme(THEME, root);
    expect([root.getAttribute('data-theme'), root.getAttribute('data-palette'), root.getAttribute('data-density')]).toEqual(['dark', 'dusk', 'compact']);
    // The system, the default theme and the unscaled step are each the
    // ABSENCE of the attribute, because the stylesheet paints them bare.
    applyFrameTheme(DEFAULT_FRAME_THEME, root);
    expect([root.hasAttribute('data-theme'), root.hasAttribute('data-palette'), root.hasAttribute('data-density')]).toEqual([false, false, false]);
  });
});

describe('links', () => {
  test.each(['https://example.com/a?b=c', 'http://example.com/', 'mailto:ops@example.com'])('opens %s', (raw) => {
    expect(externalUrl(raw)?.href).toBe(new URL(raw).href);
  });

  test.each([
    'javascript:alert(1)',
    'data:text/html,<script>1</script>',
    '/relative/path',
    'https://bank.example@evil.example/',
    'https://user:pass@example.com/',
    'file:///etc/passwd',
    'blob:https://example.com/1',
    '',
    `https://example.com/${'a'.repeat(2100)}`,
  ])('refuses %s', (raw) => {
    expect(externalUrl(raw)).toBeNull();
  });

  test('reads an open-link request and a focus exit, and nothing else', () => {
    expect(readOpenLink({ type: FRAME_MESSAGE.openLink, url: 'https://example.com' })).toBe('https://example.com');
    expect(readOpenLink({ type: FRAME_MESSAGE.openLink, url: 42 })).toBeNull();
    expect(isFocusExit({ type: FRAME_MESSAGE.focusExit })).toBe(true);
    expect(isFocusExit({ type: FRAME_MESSAGE.openLink })).toBe(false);
  });
});
