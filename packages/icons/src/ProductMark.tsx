import type { ComponentType, SVGProps } from 'react';

import './ProductMark.css';
import type { GlyphSize } from './Glyph.js';
import { cssLength } from './Glyph.js';
import * as marks from './generated/products/index.js';

/** Crewlet's own products, each with a mark of its own. */
export const PRODUCTS = ['worklet', 'doclet', 'chat', 'assistant'] as const;

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
  worklet: marks.Worklet,
  doclet: marks.Doclet,
  chat: marks.Chat,
  assistant: marks.Assistant,
};

/**
 * The mark of one of Crewlet's own products: Worklet (projects and tasks),
 * Doclet (spaces and pages), Chat (talking with agents) and the Assistant
 * (asking Crewlet itself, as the signed-in person).
 *
 * ONE FAMILY WITH THE BRAND MARK. Each stands on the same tile: the crewmate
 * head's octagon, chamfered at 45 degrees on the 48 grid, in the brand violet
 * with a deeper lower facet for the brand mark's depth. What tells them apart
 * is one white figure each, drawn on the 6 unit grid so its edges land on
 * whole pixels at 16, 24 and 48: a task list (Worklet, one task ticked and one
 * open), an open book with its lines of text (Doclet), the crewmate's
 * two eyes in a speech bubble (Chat), and the crewmate octagon opened into
 * four turning blades around one core (Assistant). The Assistant has no face:
 * it acts as the person who asks and has no identity of its own, so it is
 * drawn as a capability of Crewlet rather than as one more member of a crew.
 * Its blades and core are separate detail paths, so a working state can turn
 * the blades and hold the core still.
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
