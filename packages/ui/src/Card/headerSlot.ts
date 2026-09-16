/**
 * The seam a card's header offers the panel inside it: a place on the header
 * row for that panel's OWN controls.
 *
 * WHY A SEAM RATHER THAN A PROP THE CALLER WIRES. A table's pager and its
 * settings cog are the table's: their state is inside it, they move with its
 * pages and they open its frame. A card's header is the card's. Drawing the
 * first inside the second is therefore something neither component can do
 * alone, and every way of faking it puts the join in the CALLER: the screen
 * lifts the table's page into its own state so it can hand a pager to
 * `Card.Header`'s `actions`, or it leaves the table's own bar where it is and
 * pulls it up with a stylesheet of its own. The first makes every panel
 * restate what the table already knows; the second is a rule about class names
 * that no test holds and no reader of the card can see.
 *
 * So the card publishes a slot and the panel draws into it, through the React
 * tree the two already share. The caller composes what it always composed:
 * a card, a header, a table.
 *
 * THE SLOT IS TAKEN BY ONE PANEL. A card holding two tables would otherwise
 * put two pagers and two cogs on one header row, each belonging to rows the
 * reader cannot tell apart. The first to ask holds it; anybody else is told no
 * and keeps its own bar, which is the shape it has outside a card anyway.
 */

import { createContext, useContext, useLayoutEffect, useRef, useState } from 'react';

/** What the card offers, as its header sees it. Internal to [Card]. */
export interface CardHeaderSlot {
  /**
   * This card draws a header, so there IS a row to sit in. Read from the
   * card's own children at render time rather than reported by the header
   * from an effect: a panel has to know where its controls go on the first
   * frame, and a header that announced itself one commit later would have
   * every table draw a bar and then take it away again.
   */
  hasHeader: boolean;
  /** The node to draw into. Null until the header has rendered one. */
  node: HTMLElement | null;
  /** Takes the row. True to the one holder; false to everybody after it. */
  claim: (claimant: object) => boolean;
  /** Gives it back, so a panel that unmounts does not hold an empty header. */
  release: (claimant: object) => void;
}

export const CardHeaderSlotContext = createContext<CardHeaderSlot | null>(null);

/** Where a panel's own controls are drawn, once it has asked for a header. */
export interface CardHeaderChrome {
  /**
   * A card's header is drawing them, so the panel draws no bar of its own.
   * True from the FIRST render inside a card that has a header, before
   * [CardHeaderChrome.node] exists, so nothing is ever drawn in two places.
   */
  hosted: boolean;
  /** The node to render into, or null while there is nowhere yet. */
  node: HTMLElement | null;
}

const NO_HEADER: CardHeaderChrome = { hosted: false, node: null };

/**
 * Asks the card above for its header row.
 *
 * `wanted` is whether this panel has controls to put there at all: a table
 * with no pager and no cog asks for nothing, so the card's header stays free
 * for a second table that does have them.
 *
 * The answer is a value rather than a rendered node, so the caller keeps its
 * own controls and decides where to put them; what it gets back is the two
 * facts it cannot work out for itself.
 */
export function useCardHeaderSlot(wanted: boolean): CardHeaderChrome {
  const slot = useContext(CardHeaderSlotContext);
  /*
   * An identity for this panel, and nothing else: the slot is held by WHO
   * asked, never by what they are, so a second table of the same type is still
   * a second claimant. Lazily made, because a fresh object on every render
   * would be a fresh claimant on every render.
   */
  const claimant = useRef<object | null>(null);
  claimant.current ??= {};
  const [lost, setLost] = useState(false);
  const offered = wanted && slot !== null && slot.hasHeader;
  const claim = slot?.claim;
  const release = slot?.release;

  /*
   * A LAYOUT EFFECT, so the answer is settled before the browser paints: a
   * panel that learned it had lost the slot from an ordinary effect would have
   * already shown a frame with its controls nowhere at all. Claimants are
   * resolved in tree order, which React runs effects in, so the same table
   * wins every time rather than whichever one happened to re-render.
   */
  useLayoutEffect(() => {
    if (!offered || !claim || !release) return;
    const self = claimant.current as object;
    setLost(!claim(self));
    return () => {
      release(self);
      setLost(false);
    };
  }, [offered, claim, release]);

  if (!offered || lost) return NO_HEADER;
  return { hosted: true, node: slot?.node ?? null };
}
