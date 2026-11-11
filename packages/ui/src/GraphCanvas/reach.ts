/**
 * What a selected entry reaches along the edges, as a pure function the map
 * and its caller share, so the count a screen says ("14 entries depend on
 * orders-db") is the set the map lights.
 */

import type { GraphLayoutEdge } from './layout.js';

/**
 * Which way a trace walks. Edges point from the entry that relies to the one
 * relied on, so `up` is what depends on the start, `down` is what the start
 * depends on, and `both` is the two together.
 */
export type GraphTraceDirection = 'up' | 'down' | 'both';

export interface GraphReach {
  /** Every entry reached, the start included, with its distance in hops. */
  nodes: ReadonlyMap<string, number>;
  /** The edges the walk took. */
  edges: ReadonlySet<string>;
}

/**
 * Walks from `from` along `edges` in `direction`, at most `depth` hops
 * (`Infinity` for no limit). Breadth first, so each entry's distance is its
 * shortest; an edge is taken when its far end is within the limit, which
 * includes an edge closing a cycle back onto an entry already reached.
 */
export function graphReach(
  edges: readonly GraphLayoutEdge[],
  from: string,
  direction: GraphTraceDirection,
  depth: number,
): GraphReach {
  const out = new Map<string, GraphLayoutEdge[]>();
  const into = new Map<string, GraphLayoutEdge[]>();
  for (const edge of edges) {
    if (edge.from === edge.to) continue;
    let list = out.get(edge.from);
    if (!list) out.set(edge.from, (list = []));
    list.push(edge);
    list = into.get(edge.to);
    if (!list) into.set(edge.to, (list = []));
    list.push(edge);
  }
  const nodes = new Map<string, number>([[from, 0]]);
  const taken = new Set<string>();
  const walk = (
    next: (id: string) => readonly GraphLayoutEdge[] | undefined,
    far: (edge: GraphLayoutEdge) => string,
  ) => {
    const seen = new Map<string, number>([[from, 0]]);
    let frontier = [from];
    for (let hop = 1; hop <= depth && frontier.length > 0; hop++) {
      const following: string[] = [];
      for (const id of frontier) {
        for (const edge of next(id) ?? []) {
          const other = far(edge);
          taken.add(edge.id);
          if (seen.has(other)) continue;
          seen.set(other, hop);
          following.push(other);
        }
      }
      frontier = following;
    }
    for (const [id, hops] of seen) nodes.set(id, Math.min(hops, nodes.get(id) ?? Infinity));
  };
  if (direction === 'up' || direction === 'both')
    walk(
      (id) => into.get(id),
      (edge) => edge.from,
    );
  if (direction === 'down' || direction === 'both')
    walk(
      (id) => out.get(id),
      (edge) => edge.to,
    );
  return { nodes, edges: taken };
}

/** The entries one edge away from `id`, either way, and the edges that touch it. */
export function graphNeighbourhood(edges: readonly GraphLayoutEdge[], id: string): GraphReach {
  const nodes = new Map<string, number>([[id, 0]]);
  const taken = new Set<string>();
  for (const edge of edges) {
    if (edge.from === edge.to) continue;
    if (edge.from === id) {
      nodes.set(edge.to, 1);
      taken.add(edge.id);
    } else if (edge.to === id) {
      nodes.set(edge.from, 1);
      taken.add(edge.id);
    }
  }
  return { nodes, edges: taken };
}
