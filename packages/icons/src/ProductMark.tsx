import type { ComponentType, SVGProps } from 'react';

import './ProductMark.css';
import type { GlyphSize } from './Glyph.js';
import { cssLength } from './Glyph.js';
import * as masters from './generated/products/index.js';
import * as small from './generated/products/small/index.js';

/** Crewlet's own products, each with a mark of its own. */
export const PRODUCTS = ['worklet', 'doclet', 'chat', 'assistant'] as const;

export type Product = (typeof PRODUCTS)[number];

/**
 * Which drawing of a mark is mounted: `small`, the 16 pixel grid drawing,
 * `master`, the 48 unit master, or `auto`, chosen from the size.
 */
export type ProductMarkDrawing = 'auto' | 'small' | 'master';

/**
 * The smallest size, in px, the master is drawn at. Below it `auto` mounts the
 * 16 pixel grid drawing, whose edges land on whole pixels at 16 px (and at
 * 32 px, twice over) and whose figure is thickened for the size; at 24 px and
 * up every orthogonal edge of the master lands on a whole pixel too.
 */
const MASTER_FROM = 24;

export interface ProductMarkProps extends Omit<SVGProps<SVGSVGElement>, 'title'> {
  product: Product;
  size?: GlyphSize;
  /** Names the mark. Without one it is `aria-hidden`. */
  title?: string;
  /**
   * A product that has not shipped yet: the mark is drawn hollow, its
   * keyline and figure in the brand violet over a faint tint of it. Never
   * grey, which is how a catalogue says "available but not connected" about a
   * vendor, a different fact.
   */
  soon?: boolean;
  /**
   * Which drawing to mount. `auto` (the default) mounts the 16 pixel grid
   * drawing when `size` resolves to fewer than 24 px (a step from `xs` to
   * `lg`, a number, or a length in px) and the master otherwise. A size in
   * any other unit (the default `1em`, a `rem`) cannot be measured while
   * rendering, so it takes the master; pass `small` where such a mark sits in
   * a line of text.
   */
  drawing?: ProductMarkDrawing;
}

type Drawing = ComponentType<SVGProps<SVGSVGElement>>;

const drawings: Record<Product, { small: Drawing; master: Drawing }> = {
  worklet: { small: small.Worklet, master: masters.Worklet },
  doclet: { small: small.Doclet, master: masters.Doclet },
  chat: { small: small.Chat, master: masters.Chat },
  assistant: { small: small.Assistant, master: masters.Assistant },
};

/**
 * The size a `size` prop draws at, in px, or null when it is not in px. Read
 * from the length the mark is drawn at, so the drawing switch and the
 * rendered width can never disagree about what a step or a number means.
 */
function pixels(size: GlyphSize | undefined): number | null {
  const match = /^(\d*\.?\d+)px$/.exec(cssLength(size).trim());
  return match === null ? null : Number(match[1]);
}

/** Whether a mark of this size and choice mounts the 16 pixel grid drawing. */
function drawsSmall(size: GlyphSize | undefined, drawing: ProductMarkDrawing): boolean {
  if (drawing !== 'auto') return drawing === 'small';
  const px = pixels(size);
  return px !== null && px < MASTER_FROM;
}

/**
 * The mark of one of Crewlet's own products: Worklet (projects and tasks),
 * Doclet (spaces and pages), Chat (talking with agents) and Ask Crewlet
 * (asking Crewlet itself, as the signed-in person).
 *
 * ONE FAMILY WITH THE BRAND MARK. Each stands on the same tile: the crewmate
 * head's octagon, chamfered at 45 degrees, in the brand violet with a deeper
 * lower facet for the brand mark's depth. What tells them apart is one white
 * figure each: a tick over one open task (Worklet), a page with a chamfer
 * fold (Doclet), a speech bubble with the crewmate's visor (Chat), and two
 * sparks (Ask Crewlet). Ask Crewlet has no face: it acts as the person who
 * asks and has no identity of its own, so it is drawn as a capability of
 * Crewlet rather than as one more member of a crew.
 *
 * TWO DRAWINGS OF EACH. The 48 unit master serves 24 px and up; the 16 pixel
 * grid drawing serves 16 to 20 px, with its figure redrawn on whole pixels,
 * so a sidebar row never shows a blurred master. `drawing` chooses, and
 * `auto` reads the size.
 *
 * SOON IS DERIVED FROM THE DRAWING. Each drawing carries its own hidden
 * keyline (`data-part="keyline"`), which only the soon rule paints, so the
 * hollow state needs no second file at either size.
 *
 * THE ASSISTANT'S MOTION BELONGS TO ITS HOST. Its main spark carries
 * `data-motion="turn"` and its companion `data-motion="twinkle"`, so a working
 * state (`ThinkingIndicator` in `@crewlethq/ui`) can move them; the mark
 * itself never moves.
 *
 * Sized like a glyph and drawn edge to edge in its square, so it stands at the
 * weight of the vendor marks a catalogue sets beside it.
 */
export function ProductMark({
  product,
  size,
  title,
  soon = false,
  drawing = 'auto',
  className,
  ...rest
}: ProductMarkProps) {
  const pair = drawings[product];
  const Drawing = drawsSmall(size, drawing) ? pair.small : pair.master;
  const dimension = cssLength(size);
  const semantics: SVGProps<SVGSVGElement> = title
    ? { role: 'img', 'aria-label': title, 'aria-hidden': undefined, focusable: 'false' }
    : { 'aria-hidden': true, focusable: 'false' };
  const classes = ['crewlet-product-mark', `crewlet-product-mark--${product}`];
  if (soon) classes.push('crewlet-product-mark--soon');
  if (className !== undefined) classes.push(className);
  return <Drawing width={dimension} height={dimension} {...semantics} className={classes.join(' ')} {...rest} />;
}
