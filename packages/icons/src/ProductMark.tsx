import type { ComponentType, SVGProps } from 'react';

import './ProductMark.css';
import type { GlyphSize } from './Glyph.js';
import { cssLength } from './Glyph.js';
import * as marks from './generated/products/index.js';

/** Crewlet's own products, each with a mark of its own. */
export const PRODUCTS = ['works', 'knowledge', 'chat'] as const;

export type Product = (typeof PRODUCTS)[number];

export interface ProductMarkProps extends Omit<SVGProps<SVGSVGElement>, 'title'> {
  product: Product;
  size?: GlyphSize;
  /** Names the mark. Without one it is `aria-hidden`. */
  title?: string;
  /**
   * A product that has not shipped yet: the mark is drawn hollow, its
   * outline and face in the brand violet over a faint tint of it. Never grey,
   * which is how a catalogue says "available but not connected" about a
   * vendor, a different fact.
   */
  soon?: boolean;
}

const drawings: Record<Product, ComponentType<SVGProps<SVGSVGElement>>> = {
  works: marks.Works,
  knowledge: marks.Knowledge,
  chat: marks.Chat,
};

/**
 * The mark of one of Crewlet's own products: Works (projects and tasks),
 * Knowledge (spaces and pages) and Chat (talking with agents).
 *
 * ONE FAMILY WITH THE BRAND MARK. Each stands on the same tile: the crewmate
 * head's octagon, chamfered at 45 degrees on the 48 grid, in the brand violet
 * with a deeper lower facet for the brand mark's depth. What tells them apart
 * is one white figure each, drawn on the 6 unit grid so its edges land on
 * whole pixels at 16, 24 and 48: a task list (Works, one task ticked and one
 * open), an open book with its lines of text (Knowledge), and the crewmate's
 * two eyes in a speech bubble (Chat).
 *
 * Sized like a glyph and drawn edge to edge in its square, so it stands at the
 * weight of the vendor marks a catalogue sets beside it.
 */
export function ProductMark({ product, size, title, soon = false, className, ...rest }: ProductMarkProps) {
  const Drawing = drawings[product];
  const dimension = cssLength(size);
  const semantics: SVGProps<SVGSVGElement> = title
    ? { role: 'img', 'aria-label': title, 'aria-hidden': undefined, focusable: 'false' }
    : { 'aria-hidden': true, focusable: 'false' };
  const classes = ['crewlet-product-mark', `crewlet-product-mark--${product}`];
  if (soon) classes.push('crewlet-product-mark--soon');
  if (className !== undefined) classes.push(className);
  return <Drawing width={dimension} height={dimension} {...semantics} className={classes.join(' ')} {...rest} />;
}
