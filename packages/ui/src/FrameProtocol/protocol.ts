import { DEFAULT_THEME_ID, type ThemeId } from '@crewlethq/tokens';
import {
  applyDensity,
  applyPalette,
  applyTheme,
  isDensityPreference,
  isPaletteId,
  isThemePreference,
  type DensityPreference,
  type ThemePreference,
} from '../ThemeSwitcher/apply.js';

/*
 * The wire between a page that embeds an artifact and the artifact's own
 * document, written once for both ends.
 *
 * THE HOST END is `SandboxedFrame` in this package. THE FRAME END is the
 * engine's runtime shim and the artifact kit's `theme.js`, which import this
 * module (it carries no React, so a bootstrap that must stay under two
 * kilobytes can). Every message name, every fragment key and every check on a
 * value that crosses the boundary lives here, so the two ends cannot drift.
 *
 * EVERYTHING ARRIVING FROM THE OTHER END IS UNTRUSTED. A reader here returns
 * `null` for anything that is not exactly the shape it names; nothing is cast.
 */

/** The message names, on the window before the handshake and on the port after it. */
export const FRAME_MESSAGE = {
  /** Frame to host, on the window: "I am the document you embedded, here is your nonce". */
  hello: 'crewlet.hello',
  /** Host to frame, on the window, carrying the transferred port. */
  port: 'crewlet.port',
  /** Host to frame, on the port: the reader's appearance changed. */
  theme: 'crewlet.theme',
  /** Frame to host, on the port: open this link outside the frame. */
  openLink: 'crewlet.openLink',
  /** Frame to host, on the port: give keyboard focus back to the page around the frame. */
  focusExit: 'crewlet.focusExit',
} as const;

/**
 * The bridge protocol versions this host speaks, negotiated in the hello.
 *
 * The page-facing contract (`window.crewlet`) and the host-facing bridge are
 * versioned apart: a page pins its contract for as long as it is published,
 * while the bridge moves with the host, which supports the current version and
 * the one before it.
 */
export const FRAME_BRIDGE = { min: 1, max: 1 } as const;

/**
 * How the engine isolated the artifact, as its `Frame.mode` says.
 *
 * `per_artifact` serves every artifact from an origin of its own, so its
 * messages arrive from that origin. `shared` serves every artifact from one
 * host with an opaque origin, so its messages arrive from `"null"` and only
 * the source window and the nonce bind them to this frame.
 */
export type FrameOriginMode = 'per_artifact' | 'shared';

export const FRAME_ORIGIN_MODES = ['per_artifact', 'shared'] as const satisfies readonly FrameOriginMode[];

/** The reader's appearance, as the page around the frame resolved it. */
export interface FrameTheme {
  mode: ThemePreference;
  /** A theme id from `@crewlethq/tokens`. */
  palette: ThemeId;
  density: DensityPreference;
}

/** What a frame paints before the host has said anything: the system, the default theme, the unscaled step. */
export const DEFAULT_FRAME_THEME: FrameTheme = { mode: 'system', palette: DEFAULT_THEME_ID, density: 'normal' };

/* ── The fragment ───────────────────────────────────────────────────── */

/**
 * The fragment the host appends to the engine's frame URL.
 *
 * A FRAGMENT, NEVER A QUERY. A browser never sends a fragment to a server and
 * never writes it to a log, so the handshake nonce and the reader's appearance
 * stay between the two documents. The theme is in it so the frame paints in
 * the reader's palette on its first frame, before any message can arrive.
 */
export function frameFragment(nonce: string, theme: FrameTheme): string {
  const params = new URLSearchParams();
  params.set('nonce', nonce);
  params.set('theme', theme.mode);
  params.set('palette', theme.palette);
  params.set('density', theme.density);
  return params.toString();
}

/** What a frame reads back from its own fragment. Each value is checked; a bad one falls back. */
export interface FrameFragment {
  /** The handshake nonce, or null when the fragment carries none. */
  nonce: string | null;
  theme: FrameTheme;
}

const NONCE = /^[A-Za-z0-9_-]{16,256}$/;

/**
 * Reads a frame's own `location.hash`.
 *
 * A value that is not one of the allowed ones is dropped for its default
 * rather than applied, because the fragment is a string anybody can edit by
 * hand in the address of a page opened on its own.
 */
export function parseFrameFragment(hash: string): FrameFragment {
  const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
  const nonce = params.get('nonce');
  const mode = params.get('theme');
  const palette = params.get('palette');
  const density = params.get('density');
  return {
    nonce: nonce !== null && NONCE.test(nonce) ? nonce : null,
    theme: {
      mode: isThemePreference(mode) ? mode : DEFAULT_FRAME_THEME.mode,
      // A well-formed id the tokens do not know selects no block and paints
      // the default, which is what an unknown palette should do.
      palette: isPaletteId(palette) ? (palette as ThemeId) : DEFAULT_FRAME_THEME.palette,
      density: isDensityPreference(density) ? density : DEFAULT_FRAME_THEME.density,
    },
  };
}

/** Whether a nonce is the shape the engine mints. */
export function isFrameNonce(value: unknown): value is string {
  return typeof value === 'string' && NONCE.test(value);
}

/* ── Origins ────────────────────────────────────────────────────────── */

/**
 * The origin of an absolute http or https URL, or null.
 *
 * Only those two schemes: a frame served from `data:`, `blob:` or
 * `javascript:` would inherit or forge an origin, and the frame policy has no
 * answer for any of them.
 */
export function httpOrigin(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  return url.protocol === 'https:' || url.protocol === 'http:' ? url.origin : null;
}

/** Whether a message's origin is the one this mode says the frame's document has. */
export function frameOriginMatches(mode: FrameOriginMode, expected: string, actual: string): boolean {
  return mode === 'per_artifact' ? actual === expected : actual === 'null';
}

/**
 * The `targetOrigin` the host posts the port with.
 *
 * Per artifact, the artifact's own origin: if the frame has navigated
 * anywhere else in the meantime, the browser drops the message. An opaque
 * origin cannot be named, so `"*"` is the only value that reaches it, and the
 * port is posted to the verified source window in the same task as the
 * verified hello, so no navigation can come between the check and the send.
 */
export function portTargetOrigin(mode: FrameOriginMode, origin: string): string {
  return mode === 'per_artifact' ? origin : '*';
}

/* ── The sandbox ────────────────────────────────────────────────────── */

/**
 * Every sandbox token a frame may carry, and when.
 *
 * The engine computes the attribute and the host sets it VERBATIM; this is a
 * second check, so a host never embeds a policy the engine would never have
 * written. There is no `allow-popups` at all: an external link goes through
 * the bridge's `openLink`, which the page around the frame opens after an
 * interstitial, with `noopener`.
 */
export const FRAME_SANDBOX_TOKENS: Readonly<Record<string, 'always' | 'per_artifact' | 'declared'>> = {
  'allow-scripts': 'always',
  'allow-forms': 'always',
  // Only on an origin of the artifact's own: on the shared host it would hand
  // every artifact the same storage and the same origin.
  'allow-same-origin': 'per_artifact',
  // Only when the version declares them, which the engine decides.
  'allow-downloads': 'declared',
  'allow-modals': 'declared',
};

export type FrameSandboxVerdict = { ok: true; value: string } | { ok: false; refused: string[] };

/** Checks the engine's sandbox attribute against the tokens a frame in this mode may carry. */
export function checkFrameSandbox(sandbox: string, mode: FrameOriginMode): FrameSandboxVerdict {
  const tokens = sandbox.split(/\s+/).filter(Boolean);
  const refused = tokens.filter((token) => {
    const rule = FRAME_SANDBOX_TOKENS[token];
    if (rule === undefined) return true;
    return rule === 'per_artifact' && mode !== 'per_artifact';
  });
  return refused.length > 0 ? { ok: false, refused } : { ok: true, value: tokens.join(' ') };
}

/* ── Messages ───────────────────────────────────────────────────────── */

const record = (data: unknown): Record<string, unknown> | null =>
  typeof data === 'object' && data !== null && !Array.isArray(data) ? (data as Record<string, unknown>) : null;

const CONTRACT = /^\d{1,4}\.\d{1,5}\.\d{1,6}$/;

const bridgeVersion = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 9999;

/** The range of bridge versions a runtime speaks. */
export interface FrameBridgeRange {
  min: number;
  max: number;
}

/** Frame to host: the first message, posted on the window. */
export interface FrameHello {
  type: typeof FRAME_MESSAGE.hello;
  nonce: string;
  /** The page-facing contract the runtime implements, `major.minor.patch`. */
  contract: string;
  bridge: FrameBridgeRange;
}

/** Reads a hello, or null for anything that is not exactly one. */
export function readFrameHello(data: unknown): FrameHello | null {
  const message = record(data);
  if (!message || message['type'] !== FRAME_MESSAGE.hello) return null;
  const { nonce, contract } = message;
  const bridge = record(message['bridge']);
  if (!isFrameNonce(nonce) || typeof contract !== 'string' || !CONTRACT.test(contract) || !bridge) return null;
  const { min, max } = bridge;
  if (!bridgeVersion(min) || !bridgeVersion(max) || min > max) return null;
  return { type: FRAME_MESSAGE.hello, nonce, contract, bridge: { min, max } };
}

/** The highest bridge version both ends speak, or null when they share none. */
export function negotiateBridge(offered: FrameBridgeRange, supported: FrameBridgeRange = FRAME_BRIDGE): number | null {
  const high = Math.min(offered.max, supported.max);
  return high >= Math.max(offered.min, supported.min) ? high : null;
}

/** Host to frame: the port message, posted on the window with the port transferred. */
export interface FramePortMessage {
  type: typeof FRAME_MESSAGE.port;
  bridge: number;
}

/** Reads a port message, or null. The port itself is the event's `ports[0]`. */
export function readFramePortMessage(data: unknown): FramePortMessage | null {
  const message = record(data);
  if (!message || message['type'] !== FRAME_MESSAGE.port || !bridgeVersion(message['bridge'])) return null;
  return { type: FRAME_MESSAGE.port, bridge: message['bridge'] };
}

/** Host to frame: the reader's appearance, on the port. */
export interface FrameThemeMessage extends FrameTheme {
  type: typeof FRAME_MESSAGE.theme;
}

export function frameThemeMessage(theme: FrameTheme): FrameThemeMessage {
  return { type: FRAME_MESSAGE.theme, mode: theme.mode, palette: theme.palette, density: theme.density };
}

/** Reads a theme message, or null when any of its three values is not an allowed one. */
export function readFrameTheme(data: unknown): FrameTheme | null {
  const message = record(data);
  if (!message || message['type'] !== FRAME_MESSAGE.theme) return null;
  const { mode, palette, density } = message;
  if (!isThemePreference(mode) || !isPaletteId(palette) || !isDensityPreference(density)) return null;
  return { mode, palette: palette as ThemeId, density };
}

/** Writes the three appearance attributes on a root element, the same way the application writes its own. */
export function applyFrameTheme(theme: FrameTheme, root?: Element | null): void {
  applyTheme(theme.mode, root);
  applyPalette(theme.palette, root);
  applyDensity(theme.density, root);
}

/** Frame to host: open a link outside the frame. */
export interface FrameOpenLinkMessage {
  type: typeof FRAME_MESSAGE.openLink;
  url: string;
}

/** Reads an open-link request's raw URL, or null. Use `externalUrl` to decide whether it may be opened. */
export function readOpenLink(data: unknown): string | null {
  const message = record(data);
  if (!message || message['type'] !== FRAME_MESSAGE.openLink) return null;
  return typeof message['url'] === 'string' ? message['url'] : null;
}

/** Whether a port message asks for focus back. */
export function isFocusExit(data: unknown): boolean {
  return record(data)?.['type'] === FRAME_MESSAGE.focusExit;
}

/** The longest link an artifact may ask the host to open. */
export const EXTERNAL_URL_MAX = 2048;

/**
 * A link an artifact may ask to open, parsed, or null.
 *
 * Absolute `https:`, `http:` and `mailto:` only. `javascript:` and `data:`
 * would run or render in the page that opens them; a relative link has no
 * meaning outside the frame it was written in. A URL carrying a user name or
 * password is refused too, because `https://bank.example@evil.example` is the
 * classic way to make a destination read as somewhere it is not.
 */
export function externalUrl(raw: string): URL | null {
  if (raw.length === 0 || raw.length > EXTERNAL_URL_MAX) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol === 'mailto:') return url.pathname.length > 0 ? url : null;
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (url.username !== '' || url.password !== '' || url.hostname === '') return null;
  return url;
}
