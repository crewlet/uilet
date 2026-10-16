import { useMemo } from 'react';
import { color } from '@crewlethq/tokens';
import { encode } from 'uqr';
import { cx } from '../utils/cx.js';

/**
 * A QR code, drawn as inline SVG from the encoder's module matrix.
 *
 * INLINE SVG AND NOTHING ELSE. The encoder answers a matrix of booleans and
 * this draws it as one `<path>` on one `<rect>`: not an `<img>` with a `data:`
 * URI, not markup set as HTML, and nothing fetched. A strict
 * Content-Security-Policy admits each of those only by being widened, and the
 * value a QR code carries is often a credential (a second factor's seed),
 * which must not leave the DOM it is shown in.
 *
 * BLACK ON A WHITE PLATE, IN EVERY THEME. A QR code is a symbol a camera reads,
 * and its two inks are part of the symbol rather than colours of the palette.
 * A code is specified dark on light, and some authenticator apps do not read
 * one inverted for a dark theme, so it is never inverted. The inks are the
 * `color.qr` tokens, which are the same in every palette, and they are written
 * as the SVG's own fill attributes so the code draws correctly with no
 * stylesheet at all. The plate keeps its inks under forced colours too.
 *
 * FOUR MODULES OF QUIET ZONE, AND LEVEL M. The margin a reader needs to find
 * the finder patterns is four light modules on every side, the standard's own
 * figure. Error correction is M, which still reads with 15% of the symbol
 * lost and is the level authenticator codes are conventionally drawn at.
 */

/** Light modules around the symbol, on every side. */
export const QR_QUIET_ZONE = 4;

/** The dark modules' ink: the `color.qr.dark` token. */
export const QR_DARK: string = color.qr.dark;

/** The plate's ink, the quiet zone included: the `color.qr.light` token. */
export const QR_LIGHT: string = color.qr.light;

/**
 * The symbol's modules for `value`, `true` for dark, row by row, or null for
 * a value too long for any QR code to hold.
 *
 * NULL RATHER THAN A THROW. The encoder refuses an oversized value with a
 * `RangeError`, and a code that cannot be drawn is an aid missing rather than
 * a screen that should fall over: whoever renders one keeps the value's other
 * forms beside it. Any other error is a fault and is not caught.
 */
export function qrModules(value: string): boolean[][] | null {
  try {
    return encode(value, { ecc: 'M', border: 0 }).data;
  } catch (error) {
    if (error instanceof RangeError) return null;
    throw error;
  }
}

/**
 * The dark modules as one SVG path in module units: one rectangle per
 * horizontal run of dark modules, so adjacent modules share an edge rather
 * than meeting at two anti-aliased ones.
 */
export function qrModulePath(modules: readonly (readonly boolean[])[]): string {
  let d = '';
  modules.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      if (!row[x]) {
        x += 1;
        continue;
      }
      let end = x;
      while (end < row.length && row[end]) end += 1;
      d += `M${x} ${y}h${end - x}v1h-${end - x}z`;
      x = end;
    }
  });
  return d;
}

export interface QrCodeProps {
  /** What the code encodes, exactly. */
  value: string;
  /** The image's accessible name: what the code is for, never the value itself. */
  label: string;
  className?: string | undefined;
}

/**
 * `value` as a QR code, named by `label`, or nothing for a value no QR code
 * can hold. Keep the value's other forms (a key to type, a link to open)
 * beside it: a code is an aid, and not every reader has a camera.
 */
export function QrCode({ value, label, className }: QrCodeProps) {
  const modules = useMemo(() => qrModules(value), [value]);
  if (!modules) return null;
  const span = modules.length + 2 * QR_QUIET_ZONE;
  return (
    <svg
      className={cx('crewlet-qr-code', className)}
      viewBox={`${-QR_QUIET_ZONE} ${-QR_QUIET_ZONE} ${span} ${span}`}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
      focusable="false"
    >
      <rect x={-QR_QUIET_ZONE} y={-QR_QUIET_ZONE} width={span} height={span} fill={QR_LIGHT} />
      <path d={qrModulePath(modules)} fill={QR_DARK} />
    </svg>
  );
}
