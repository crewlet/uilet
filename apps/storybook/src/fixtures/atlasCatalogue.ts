/**
 * The same company as `atlasMap`, as the rows of its catalogue: each entry
 * with who answers for it, how it is, how it relates, how busy its record has
 * been and how sure the record is. Everything here is made up, and derived
 * from the entry's place in the list so every load draws the same rows.
 */
import type { Vendor } from '@crewlethq/icons';
import type { GraphNode } from '@crewlethq/ui';
import { grownCompany, type AtlasMap } from './atlasMap';

export type AtlasHealth = 'alerting' | 'look' | 'quiet';
export type AtlasConfidence = 'confirmed' | 'likely' | 'unconfirmed';

export interface AtlasRow {
  id: string;
  node: GraphNode;
  vendor?: { id: Vendor; name: string } | undefined;
  owner?: { name: string; kind: 'human' | 'agent' } | undefined;
  health: AtlasHealth;
  /** The engine's word for how it is. */
  healthWord: string;
  usedBy: number;
  dependsOn: number;
  /** Lines recorded about it per day, oldest first. A count, never a rate. */
  activity: number[];
  changedAt: number;
  changeReason: string;
  confidence: AtlasConfidence;
}

/** The instant every story reads the clock at, so "2 hours ago" never drifts. */
export const ATLAS_NOW = Date.UTC(2026, 10, 12, 9, 0, 0);
export const ATLAS_DAYS = 14;

const OWNERS: AtlasRow['owner'][] = [
  { name: 'Payments', kind: 'human' },
  { name: 'Platform', kind: 'human' },
  { name: 'Site reliability', kind: 'agent' },
  { name: 'Growth', kind: 'human' },
  undefined,
];
const REASONS = [
  'Seen again by the cloud account',
  'Recorded by an agent after a deploy',
  'Confirmed by a person',
  'A standing alarm was raised',
  'Reported differently by two sources',
];
const VENDORS: Partial<Record<string, { id: Vendor; name: string }>> = {
  aws: { id: 'aws', name: 'AWS' },
  cloudflare: { id: 'cloudflare', name: 'Cloudflare' },
  github: { id: 'github', name: 'GitHub' },
  datadog: { id: 'datadog', name: 'Datadog' },
  claude: { id: 'claude', name: 'Anthropic' },
  ssh: { id: 'ssh', name: 'SSH' },
};

export const HEALTH_ORDER: readonly AtlasHealth[] = ['alerting', 'look', 'quiet'];
export const HEALTH_WORD: Record<AtlasHealth, string> = {
  alerting: 'Alerting',
  look: 'Needs a look',
  quiet: 'Quiet',
};
export const HEALTH_TONE = { alerting: 'danger', look: 'warning', quiet: 'neutral' } as const;
export const CONFIDENCE_WORD: Record<AtlasConfidence, string> = {
  confirmed: 'Confirmed',
  likely: 'Likely',
  unconfirmed: 'Unconfirmed',
};

/** The vendor an entry lives at, read back from the mark the map fixture gave it. */
function vendorOf(node: GraphNode): AtlasRow['vendor'] {
  const mark = node.mark as { props?: { vendor?: string } } | undefined;
  return mark?.props?.vendor ? VENDORS[mark.props.vendor] : undefined;
}

export function atlasRows(map: AtlasMap = grownCompany()): AtlasRow[] {
  return map.nodes.map((node, index) => {
    const health: AtlasHealth =
      node.attention?.tone === 'danger' ? 'alerting' : node.attention?.tone === 'warning' ? 'look' : 'quiet';
    // A wave with the entry's own phase and weight, so the column of shapes is varied and still the same every load.
    const activity = Array.from({ length: ATLAS_DAYS }, (_, day) =>
      Math.max(0, Math.round((1 + (index % 4)) * (1.2 + Math.sin((day + index * 3) / 2.1)) - (index % 3))),
    );
    return {
      id: node.id,
      node,
      vendor: vendorOf(node),
      owner: OWNERS[index % OWNERS.length],
      health,
      healthWord: node.attention?.label ?? HEALTH_WORD.quiet,
      usedBy: map.edges.filter((edge) => edge.to === node.id).length,
      dependsOn: map.edges.filter((edge) => edge.from === node.id).length,
      activity,
      changedAt: ATLAS_NOW - (1 + ((index * 7) % 40)) * 3_600_000,
      changeReason: health === 'alerting' ? REASONS[3]! : REASONS[index % 3]!,
      confidence: node.unconfirmed ? 'unconfirmed' : index % 9 === 4 ? 'likely' : 'confirmed',
    };
  });
}
