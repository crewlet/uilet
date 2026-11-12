/**
 * The keyboard walk over a laid out map, as a pure function of the layout.
 *
 * The arrows move the way they point. Up and Down move along a lane's column
 * and on into the band above or below; Left and Right move to the next column
 * of the lane, then to the item nearest in height in the lane beside; Home
 * and End go to a lane's ends, and with Control or Command to the map's. An
 * empty lane is a stop too, so its message is read.
 */

import type { GraphItem, GraphLanePlaced, GraphLayout } from './layout.js';

export interface GraphStepKey {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
}

/**
 * The item a key moves to from `from`, `null` for a key the walk owns that
 * goes nowhere from here (so it is still swallowed), and `undefined` for a key
 * that is not the walk's.
 */
export function graphStep(layout: GraphLayout, from: string, event: GraphStepKey): string | null | undefined {
  const item = layout.itemByKey.get(from);
  if (!item) return undefined;
  const lane = layout.laneById.get(item.lane)!;
  const mod = event.ctrlKey === true || event.metaKey === true;
  switch (event.key) {
    case 'ArrowDown':
      return alongColumn(layout, item, lane, 1) ?? acrossBands(layout, item, 1);
    case 'ArrowUp':
      return alongColumn(layout, item, lane, -1) ?? acrossBands(layout, item, -1);
    case 'ArrowRight':
      return besideColumn(layout, item, lane, 1) ?? besideLane(layout, item, lane, 1);
    case 'ArrowLeft':
      return besideColumn(layout, item, lane, -1) ?? besideLane(layout, item, lane, -1);
    case 'Home':
      return mod ? (layout.lanes[0]?.items[0] ?? null) : lane.items[0]!;
    case 'End': {
      if (!mod) return lane.items[lane.items.length - 1]!;
      const last = layout.lanes[layout.lanes.length - 1];
      return last ? last.items[last.items.length - 1]! : null;
    }
    default:
      return undefined;
  }
}

const middle = (item: GraphItem) => item.y + item.height / 2;
const centre = (item: GraphItem) => item.x + item.width / 2;

const covers = (item: GraphItem, col: number) => col >= item.col && col < item.col + item.cols;

/** The next item up or down the lane that shares a column with this one, or nothing at the lane's end. */
function alongColumn(layout: GraphLayout, item: GraphItem, lane: GraphLanePlaced, step: 1 | -1): string | null {
  let best: string | null = null;
  let bestRow = Infinity;
  for (const key of lane.items) {
    const other = layout.itemByKey.get(key)!;
    const away = (other.row - item.row) * step;
    if (other === item || away <= 0 || away >= bestRow) continue;
    let shares = false;
    for (let col = item.col; col < item.col + item.cols && !shares; col++) shares = covers(other, col);
    if (!shares) continue;
    best = key;
    bestRow = away;
  }
  return best;
}

/** The item nearest in height in the lane's next column that holds one, or nothing past its last. */
function besideColumn(layout: GraphLayout, item: GraphItem, lane: GraphLanePlaced, step: 1 | -1): string | null {
  const edge = step === 1 ? item.col + item.cols - 1 : item.col;
  let best: string | null = null;
  let bestCost = Infinity;
  for (const key of lane.items) {
    const other = layout.itemByKey.get(key)!;
    const away = step === 1 ? other.col - edge : edge - (other.col + other.cols - 1);
    if (other === item || away <= 0) continue;
    // The nearest column first, then the nearest row in it.
    const cost = away * 1e6 + Math.abs(middle(other) - middle(item));
    if (cost < bestCost) {
      bestCost = cost;
      best = key;
    }
  }
  return best;
}

/** The item nearest in height in the next lane of the same band, or nothing at the band's end. */
function besideLane(layout: GraphLayout, item: GraphItem, lane: GraphLanePlaced, step: 1 | -1): string | null {
  const inBand = layout.lanes.filter((one) => one.band === lane.band);
  const next = inBand[inBand.indexOf(lane) + step];
  if (!next) return null;
  return nearest(layout, next.items, (other) => Math.abs(middle(other) - middle(item)));
}

/** In the lane under or over the item's own column: the item of its first row, or of its last, nearest that column. */
function acrossBands(layout: GraphLayout, item: GraphItem, step: 1 | -1): string | null {
  const band = item.band + step;
  const lanes = layout.lanes.filter((one) => one.band === band);
  if (lanes.length === 0) return null;
  const x = centre(item);
  let best: GraphLanePlaced | null = null;
  let bestDistance = Infinity;
  for (const lane of lanes) {
    const left = lane.panel.x;
    const right = lane.panel.x + lane.panel.width;
    const distance = x < left ? left - x : x > right ? x - right : 0;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = lane;
    }
  }
  if (!best) return null;
  // The lane's nearest row, and in it the item nearest under or over this one.
  return nearest(layout, best.items, (other) => other.row * step * 1e6 + Math.abs(centre(other) - x));
}

function nearest(layout: GraphLayout, keys: readonly string[], cost: (item: GraphItem) => number): string | null {
  let best: string | null = null;
  let bestCost = Infinity;
  for (const key of keys) {
    const value = cost(layout.itemByKey.get(key)!);
    if (value < bestCost) {
      bestCost = value;
      best = key;
    }
  }
  return best;
}
