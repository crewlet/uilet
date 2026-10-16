/**
 * A QR code a camera can read: the value it was handed, exactly, drawn dark on
 * a light plate with its quiet zone, at error-correction level M.
 *
 * EVERY POSITIVE CASE IS A REAL DECODE. Comparing the drawing with `encode()`
 * of the expected value proves only that the component and the test called one
 * function alike: an inverted plate, a missing quiet zone or a transposed
 * matrix would pass as long as both sides did it. So the rendered `<svg>` is
 * rasterised from its own attributes and handed to `jsqr`, a decoder that
 * shares nothing with the encoder and is told not to try the reversed
 * polarity. Each positive has a control proving the decode can fail.
 */

import { cleanup, render, screen } from '@testing-library/react';
import { color } from '@crewlethq/tokens';
import jsQR from 'jsqr';
import { encode } from 'uqr';
import { afterEach, describe, expect, test } from 'vitest';
import { QR_DARK, QR_LIGHT, QR_QUIET_ZONE, QrCode, qrModulePath, qrModules } from './index.js';

afterEach(cleanup);

type Rgb = [number, number, number];

/** Pixels per module, and modules of page around the drawing the scanner sees. */
const SCALE = 4;
const PAGE = 8;
/** The page is as dark as a dark module, so only the plate gives the scanner light. */
const GROUND: Rgb = [0, 0, 0];

function ink(fill: string | null): Rgb {
  const hex = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(fill ?? '');
  if (!hex) throw new Error(`the scanner reads a #rrggbb fill, and this drawing has ${fill}`);
  return [parseInt(hex[1]!, 16), parseInt(hex[2]!, 16), parseInt(hex[3]!, 16)];
}

function runs(d: string): { x: number; y: number; n: number }[] {
  const out: { x: number; y: number; n: number }[] = [];
  const run = /M(-?\d+) (-?\d+)h(\d+)v1h-\3z/y;
  while (run.lastIndex < d.length) {
    const at = run.lastIndex;
    const m = run.exec(d);
    if (!m) throw new Error(`the module path is not run rectangles from offset ${at}`);
    out.push({ x: Number(m[1]), y: Number(m[2]), n: Number(m[3]) });
  }
  return out;
}

/** What a dark-on-light scanner reads off `svg`, or null when it reads nothing. */
function scan(svg: Element): string | null {
  const [minX, minY, w, h] = (svg.getAttribute('viewBox') ?? '').trim().split(/\s+/).map(Number) as [
    number,
    number,
    number,
    number,
  ];
  const width = (w + 2 * PAGE) * SCALE;
  const height = (h + 2 * PAGE) * SCALE;
  const pixels = new Uint8ClampedArray(width * height * 4);
  const paint = (x: number, y: number, cw: number, ch: number, [r, g, b]: Rgb) => {
    for (let py = Math.max(0, (y - minY + PAGE) * SCALE); py < Math.min(height, (y - minY + PAGE + ch) * SCALE); py++) {
      for (
        let px = Math.max(0, (x - minX + PAGE) * SCALE);
        px < Math.min(width, (x - minX + PAGE + cw) * SCALE);
        px++
      ) {
        const i = (py * width + px) * 4;
        pixels[i] = r;
        pixels[i + 1] = g;
        pixels[i + 2] = b;
        pixels[i + 3] = 255;
      }
    }
  };
  paint(minX - PAGE, minY - PAGE, w + 2 * PAGE, h + 2 * PAGE, GROUND);
  for (const rect of svg.querySelectorAll('rect')) {
    const n = (name: string) => Number(rect.getAttribute(name) ?? 0);
    paint(n('x'), n('y'), n('width'), n('height'), ink(rect.getAttribute('fill')));
  }
  for (const path of svg.querySelectorAll('path')) {
    const fill = ink(path.getAttribute('fill'));
    for (const { x, y, n } of runs(path.getAttribute('d') ?? '')) paint(x, y, n, 1, fill);
  }
  return jsQR(pixels, width, height, { inversionAttempts: 'dontInvert' })?.data ?? null;
}

const LABEL = 'QR code for your authenticator app';
const SHORT =
  'otpauth://totp/crewlet.example.com:jane.doe?algorithm=SHA1&digits=6&issuer=crewlet.example.com&period=30&secret=JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';
const LONG =
  'otpauth://totp/crewlet.internal.example.com:firstname.middlename.lastname?algorithm=SHA1&digits=6&issuer=crewlet.internal.example.com&period=30&secret=KRSXG5CTMVRXEZLUKRSXG5CTMVRXEZLU';

function drawn(value: string): Element {
  render(<QrCode value={value} label={LABEL} />);
  return screen.getByRole('img', { name: LABEL });
}

describe('QrCode', () => {
  test.each([
    { name: 'a short URI', value: SHORT },
    { name: 'a longer one', value: LONG },
  ])('scans to exactly the value it was handed: $name', ({ value }) => {
    expect(scan(drawn(value))).toBe(value);
  });

  test('two values are two different drawings', () => {
    const a = drawn(SHORT).querySelector('path')?.getAttribute('d');
    cleanup();
    const b = drawn(LONG).querySelector('path')?.getAttribute('d');
    expect(a).toBeTruthy();
    expect(a).not.toBe(b);
  });

  test('is dark on its own light plate, in the qr tokens, with four modules of quiet zone', () => {
    const svg = drawn(SHORT);
    const size = qrModules(SHORT)!.length;
    expect(QR_QUIET_ZONE).toBe(4);
    expect(svg.getAttribute('viewBox')).toBe(`-4 -4 ${size + 8} ${size + 8}`);
    const plate = svg.querySelector('rect')!;
    expect(plate.getAttribute('fill')).toBe(QR_LIGHT);
    expect(plate.getAttribute('width')).toBe(String(size + 8));
    expect(svg.querySelector('path')!.getAttribute('fill')).toBe(QR_DARK);
    // The inks are the tokens, and the tokens are black on white.
    expect(QR_DARK).toBe(color.qr.dark);
    expect(QR_LIGHT).toBe(color.qr.light);
    expect(QR_DARK.toLowerCase()).toBe('#000000');
    expect(QR_LIGHT.toLowerCase()).toBe('#ffffff');
  });

  describe('and the scan refuses a drawing a camera would refuse', () => {
    function mutated(change: (svg: Element) => void): Element {
      const svg = drawn(SHORT).cloneNode(true) as Element;
      change(svg);
      return svg;
    }

    test('inverted for a dark theme', () => {
      const svg = mutated((s) => {
        s.querySelector('rect')!.setAttribute('fill', QR_DARK);
        s.querySelector('path')!.setAttribute('fill', QR_LIGHT);
      });
      expect(scan(svg)).toBeNull();
    });

    test('with no plate', () => {
      expect(scan(mutated((s) => s.querySelector('rect')!.remove()))).toBeNull();
    });

    test('with no quiet zone', () => {
      const size = qrModules(SHORT)!.length;
      const svg = mutated((s) => {
        s.setAttribute('viewBox', `0 0 ${size} ${size}`);
        const plate = s.querySelector('rect')!;
        plate.setAttribute('x', '0');
        plate.setAttribute('y', '0');
        plate.setAttribute('width', String(size));
        plate.setAttribute('height', String(size));
      });
      expect(scan(svg)).toBeNull();
    });
  });

  test('is drawn at error-correction level M, read off its own format information', () => {
    const m = qrModules(SHORT)!;
    const level = ((Number(m[8]![0]) << 1) | Number(m[8]![1])) ^ 0b10;
    expect(['M', 'L', 'H', 'Q'][level]).toBe('M');
    // The control: drawn at L, the same bits say L.
    const l = encode(SHORT, { ecc: 'L', border: 0 }).data;
    expect(['M', 'L', 'H', 'Q'][((Number(l[8]![0]) << 1) | Number(l[8]![1])) ^ 0b10]).toBe('L');
  });

  test('draws one run rectangle per run of dark modules, and nothing for a light one', () => {
    expect(
      qrModulePath([
        [true, true, false, true],
        [false, false, false, false],
        [false, true, true, true],
      ]),
    ).toBe('M0 0h2v1h-2zM3 0h1v1h-1zM1 2h3v1h-3z');
  });

  test('draws nothing for a value no QR code can hold, and does not throw', () => {
    // 2,331 bytes is the most a version 40 symbol holds at level M.
    const huge = 'a'.repeat(2332);
    expect(qrModules(huge)).toBeNull();
    render(<QrCode value={huge} label={LABEL} />);
    expect(screen.queryByRole('img', { name: LABEL })).toBeNull();
    expect(qrModules('a'.repeat(2331))).not.toBeNull();
  });
});
