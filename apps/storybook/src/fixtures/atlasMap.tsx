/**
 * A company's map of what it runs on, at several sizes, for the GraphCanvas
 * stories: the clusters and their empty messages, the first slice of a company
 * called acme, the same company grown, and generated maps of any size.
 *
 * The request path is the top band, read left to right: what the world
 * reaches, the services (a column a depth, callers left of what they call),
 * the data. Under it what those run on and the accounts they live in, then
 * what stands around: code, monitoring, tools and models.
 */
import type { ReactNode } from 'react';
import type { GraphBand, GraphEdge, GraphGroup, GraphNode } from '@crewlethq/ui';
import { Link, graphNeighbourhood } from '@crewlethq/ui';
import { VendorMark, type Vendor } from '@crewlethq/icons';
import {
  ActivityGlyph,
  BrainGlyph,
  CloudGlyph,
  ContainerGlyph,
  DatabaseGlyph,
  GitBranchGlyph,
  GlobeGlyph,
  HardDriveGlyph,
  LayersGlyph,
  PlugGlyph,
  ServerGlyph,
  WaypointsGlyph,
  WorkflowGlyph,
} from '@crewlethq/icons/glyphs';

export type AtlasKind =
  | 'domain'
  | 'hostname'
  | 'endpoint'
  | 'service'
  | 'host'
  | 'container'
  | 'datastore'
  | 'bucket'
  | 'account'
  | 'repository'
  | 'pipeline'
  | 'monitor'
  | 'tool'
  | 'model';

const KINDS: Record<AtlasKind, { lane: string; word: string; glyph: ReactNode }> = {
  domain: { lane: 'entry', word: 'Domain', glyph: <GlobeGlyph size="sm" /> },
  hostname: { lane: 'entry', word: 'Hostname', glyph: <GlobeGlyph size="sm" /> },
  endpoint: { lane: 'entry', word: 'Endpoint', glyph: <WaypointsGlyph size="sm" /> },
  service: { lane: 'services', word: 'Service', glyph: <LayersGlyph size="sm" /> },
  host: { lane: 'runtime', word: 'Server', glyph: <ServerGlyph size="sm" /> },
  container: { lane: 'runtime', word: 'Container platform', glyph: <ContainerGlyph size="sm" /> },
  datastore: { lane: 'data', word: 'Database', glyph: <DatabaseGlyph size="sm" /> },
  bucket: { lane: 'data', word: 'Bucket', glyph: <HardDriveGlyph size="sm" /> },
  account: { lane: 'platforms', word: 'Account', glyph: <CloudGlyph size="sm" /> },
  repository: { lane: 'code', word: 'Repository', glyph: <GitBranchGlyph size="sm" /> },
  pipeline: { lane: 'code', word: 'Pipeline', glyph: <WorkflowGlyph size="sm" /> },
  monitor: { lane: 'observability', word: 'Monitor', glyph: <ActivityGlyph size="sm" /> },
  tool: { lane: 'tools', word: 'Tool server', glyph: <PlugGlyph size="sm" /> },
  model: { lane: 'tools', word: 'Model', glyph: <BrainGlyph size="sm" /> },
};

/** The lanes of a company's map, each with what would fill it when it is empty. */
export const ATLAS_BANDS: GraphBand[] = [
  {
    id: 'request',
    lanes: [
      {
        id: 'entry',
        label: 'Entry',
        columns: 2,
        empty: (
          <>
            <span>Domains, DNS and CDN appear here from Cloudflare, or when an agent records one.</span>
            <Link href="#connect-cloudflare" size="inherit">
              Connect Cloudflare
            </Link>
          </>
        ),
      },
      {
        id: 'services',
        label: 'Services',
        columns: 3,
        empty: 'Services appear when an agent records what it deploys or runs, or when you add one.',
      },
      {
        id: 'data',
        label: 'Data',
        columns: 2,
        empty: 'Databases, caches, queues and buckets appear from your cloud accounts, or as agents record them.',
      },
    ],
  },
  {
    id: 'under',
    lanes: [
      {
        id: 'runtime',
        label: 'Runtime',
        columns: 4,
        empty: 'Servers and clusters appear from your cloud accounts or the SSH servers you connect.',
      },
      {
        id: 'platforms',
        label: 'Platforms',
        columns: 2,
        empty: 'The accounts and projects your integrations reach appear here.',
      },
    ],
  },
  {
    id: 'around',
    lanes: [
      {
        id: 'code',
        label: 'Code and delivery',
        columns: 3,
        empty: 'Repositories and pipelines appear from your code host.',
      },
      { id: 'observability', label: 'Observability', columns: 2, empty: 'Monitors appear from Datadog.' },
      {
        id: 'tools',
        label: 'Tools and models',
        columns: 2,
        empty: 'Tool servers and models appear from the configuration.',
      },
    ],
  },
];

/** The word for each tone, for the map's legend and each cluster's tally. */
export const ATLAS_TONES = { danger: 'Alerting', warning: 'Needs a look', info: 'Being worked on' } as const;

/** The word for one entry, many, for the map's own labels. */
export const ENTRY_LABELS = {
  lane: (label: string, count: number) => `${label}, ${count} ${count === 1 ? 'entry' : 'entries'}`,
  entries: (count: number) => `${count} ${count === 1 ? 'entry' : 'entries'}`,
  openGroup: (label: string, count: number) => `${label}, ${count} ${count === 1 ? 'entry' : 'entries'}, open`,
  closedGroup: (label: string, count: number) => `${label}, ${count} ${count === 1 ? 'entry' : 'entries'}, closed`,
  keys: 'Arrow keys move between entries and lanes, Enter selects an entry or opens a group, and Escape clears the selection. Plus and minus zoom, and zero fits the map in view.',
};

export interface AtlasMap {
  nodes: GraphNode[];
  edges: GraphEdge[];
  groups: GraphGroup[];
}

interface Entry {
  id: string;
  kind: AtlasKind;
  name: string;
  caption?: string;
  vendor?: Vendor;
  attention?: GraphNode['attention'];
  unconfirmed?: boolean;
}

const ALERTING = { tone: 'danger', label: 'Alerting' } as const;
const NEEDS_LOOK = { tone: 'warning', label: 'Needs a look' } as const;
const WORKED_ON = { tone: 'info', label: 'Being worked on' } as const;

const VENDOR_NAMES: Partial<Record<Vendor, string>> = {
  aws: 'AWS',
  cloudflare: 'Cloudflare',
  datadog: 'Datadog',
  github: 'GitHub',
  ssh: 'SSH',
  claude: 'Anthropic',
  postgresql: 'PostgreSQL',
  'google-cloud': 'Google Cloud',
};

/** How deep the services lane goes: a service stands one column right of the deepest service that calls it. */
const SERVICE_COLUMNS = 3;

/**
 * Builds the map from entries and `from > to` pairs. A pair is a call unless
 * its relation is "runs on" (what a thing runs on) or it is marked as standing
 * around. With `grouped`, each lane's entries are grouped by vendor, which a
 * large map closes to one card each.
 */
function build(entries: Entry[], pairs: [string, string, string, boolean?][], grouped = false): AtlasMap {
  const groups = new Map<string, GraphGroup>();
  const laneOf = new Map(entries.map((entry) => [entry.id, KINDS[entry.kind].lane]));
  const callers = new Map<string, string[]>();
  for (const [from, to, label, calls = true] of pairs) {
    if (!calls || label === 'runs on' || laneOf.get(from) !== 'services' || laneOf.get(to) !== 'services') continue;
    callers.set(to, [...(callers.get(to) ?? []), from]);
  }
  const depths = new Map<string, number>();
  const depthOf = (id: string, seen: Set<string>): number => {
    const known = depths.get(id);
    if (known !== undefined) return known;
    if (seen.has(id)) return 0;
    seen.add(id);
    const depth = Math.max(0, ...(callers.get(id) ?? []).map((caller) => depthOf(caller, seen) + 1));
    depths.set(id, depth);
    return depth;
  };
  const nodes = entries.map((entry): GraphNode => {
    const { lane, word, glyph } = KINDS[entry.kind];
    let group: string | undefined;
    // An account is its vendor already, so accounts are never grouped by one.
    if (grouped && entry.vendor && entry.kind !== 'account') {
      group = `${lane}:${entry.vendor}`;
      if (!groups.has(group)) {
        groups.set(group, {
          id: group,
          lane,
          label: VENDOR_NAMES[entry.vendor] ?? entry.vendor,
          lead: <VendorMark vendor={entry.vendor} size="sm" />,
        });
      }
    }
    return {
      id: entry.id,
      lane,
      group,
      column:
        lane === 'services' && !grouped ? Math.min(SERVICE_COLUMNS - 1, depthOf(entry.id, new Set())) : undefined,
      name: entry.name,
      caption: entry.caption,
      kind: word,
      glyph,
      mark: entry.vendor ? <VendorMark vendor={entry.vendor} size="xs" /> : undefined,
      attention: entry.attention,
      unconfirmed: entry.unconfirmed,
    };
  });
  const edges = pairs.map(
    ([from, to, label, calls = true]): GraphEdge => ({
      id: `${from}>${to}`,
      from,
      to,
      label,
      family: !calls ? 'context' : label === 'runs on' ? 'support' : 'flow',
    }),
  );
  return { nodes, edges, groups: [...groups.values()] };
}

/** A company that has connected GitHub and nothing else. */
export function sparseCompany(): AtlasMap {
  return build(
    [
      { id: 'web', kind: 'repository', name: 'acme/web', caption: 'TypeScript · main', vendor: 'github' },
      { id: 'api', kind: 'repository', name: 'acme/api', caption: 'Go · main', vendor: 'github' },
      { id: 'infra', kind: 'repository', name: 'acme/infra', caption: 'Terraform · main', vendor: 'github' },
    ],
    [],
  );
}

/** What the engine already knows the first day: accounts, zones, servers, code, tools and models. */
export function firstSlice(): AtlasMap {
  return build(
    [
      { id: 'zone', kind: 'domain', name: 'acme.example', caption: 'Cloudflare zone', vendor: 'cloudflare' },
      { id: 'host-api', kind: 'hostname', name: 'api.acme.example', caption: 'proxied', vendor: 'cloudflare' },
      { id: 'web-1', kind: 'host', name: 'web-1', caption: 'used by 3 agents · 2 h ago', vendor: 'ssh' },
      {
        id: 'web-2',
        kind: 'host',
        name: 'web-2',
        caption: 'not used in 30 days',
        vendor: 'ssh',
        attention: NEEDS_LOOK,
      },
      { id: 'aws', kind: 'account', name: 'acme-prod', caption: 'AWS account', vendor: 'aws' },
      { id: 'cf', kind: 'account', name: 'Acme', caption: 'Cloudflare account', vendor: 'cloudflare' },
      { id: 'gh', kind: 'account', name: 'acme', caption: 'GitHub organization', vendor: 'github' },
      { id: 'dd', kind: 'account', name: 'acme', caption: 'Datadog organization', vendor: 'datadog' },
      { id: 'repo-web', kind: 'repository', name: 'acme/web', caption: 'TypeScript · main', vendor: 'github' },
      { id: 'repo-api', kind: 'repository', name: 'acme/api', caption: 'Go · main', vendor: 'github' },
      { id: 'tool-gh', kind: 'tool', name: 'github', caption: 'tool server · 41 tools' },
      { id: 'tool-dd', kind: 'tool', name: 'datadog', caption: 'tool server · 18 tools', attention: ALERTING },
      { id: 'tool-docs', kind: 'tool', name: 'docs-search', caption: 'tool server · 3 tools' },
      { id: 'model-a', kind: 'model', name: 'Claude Opus', caption: 'model · coding CLI', vendor: 'claude' },
      { id: 'model-b', kind: 'model', name: 'Claude Haiku', caption: 'model · coding CLI', vendor: 'claude' },
    ],
    [
      ['host-api', 'zone', 'in zone'],
      ['zone', 'cf', 'belongs to', false],
      ['repo-web', 'gh', 'belongs to', false],
      ['repo-api', 'gh', 'belongs to', false],
      ['tool-gh', 'gh', 'reads from', false],
      ['tool-dd', 'dd', 'reads from', false],
    ],
  );
}

/** The same company grown: services, data and monitors, about fifty entries. */
export function grownCompany(): AtlasMap {
  const first = firstSlice();
  const more = build(
    [
      { id: 'host-app', kind: 'hostname', name: 'app.acme.example', caption: 'proxied', vendor: 'cloudflare' },
      { id: 'host-status', kind: 'hostname', name: 'status.acme.example', caption: 'proxied', vendor: 'cloudflare' },
      { id: 'ep-v1', kind: 'endpoint', name: 'https://api.acme.example/v1', caption: 'public' },
      { id: 'ep-hooks', kind: 'endpoint', name: 'https://api.acme.example/hooks', caption: 'public' },
      { id: 'checkout', kind: 'service', name: 'checkout-api', caption: 'Go · 3 replicas' },
      { id: 'web-app', kind: 'service', name: 'web-app', caption: 'Next.js', attention: WORKED_ON },
      { id: 'billing', kind: 'service', name: 'billing-worker', caption: 'Go · queue consumer' },
      { id: 'search', kind: 'service', name: 'search', caption: 'seen in agent turns', unconfirmed: true },
      { id: 'notify', kind: 'service', name: 'notifier', caption: 'Go · cron' },
      { id: 'status', kind: 'service', name: 'status-page', caption: 'static site' },
      { id: 'app-1', kind: 'host', name: 'app-1', caption: 't3.large · eu-west-1', vendor: 'aws' },
      { id: 'app-2', kind: 'host', name: 'app-2', caption: 't3.large · eu-west-1', vendor: 'aws' },
      { id: 'worker-1', kind: 'host', name: 'worker-1', caption: 't3.medium · eu-west-1', vendor: 'aws' },
      { id: 'ecs', kind: 'container', name: 'acme-cluster', caption: 'ECS · eu-west-1', vendor: 'aws' },
      {
        id: 'orders-db',
        kind: 'datastore',
        name: 'orders-db',
        caption: 'postgres 16 · eu-west-1',
        vendor: 'aws',
        attention: ALERTING,
      },
      { id: 'users-db', kind: 'datastore', name: 'users-db', caption: 'postgres 16 · eu-west-1', vendor: 'aws' },
      { id: 'cache', kind: 'datastore', name: 'sessions', caption: 'redis 7', vendor: 'aws' },
      { id: 'queue', kind: 'datastore', name: 'orders-queue', caption: 'SQS', vendor: 'aws' },
      { id: 'assets', kind: 'bucket', name: 'acme-assets', caption: 'S3 · eu-west-1', vendor: 'aws' },
      { id: 'backups', kind: 'bucket', name: 'acme-backups', caption: 'S3 · eu-central-1', vendor: 'aws' },
      { id: 'r2', kind: 'bucket', name: 'acme-media', caption: 'R2', vendor: 'cloudflare' },
      { id: 'pipe-deploy', kind: 'pipeline', name: 'deploy', caption: 'acme/api · on main', vendor: 'github' },
      { id: 'pipe-web', kind: 'pipeline', name: 'release', caption: 'acme/web · on tag', vendor: 'github' },
      { id: 'repo-infra', kind: 'repository', name: 'acme/infra', caption: 'Terraform · main', vendor: 'github' },
      { id: 'repo-billing', kind: 'repository', name: 'acme/billing', caption: 'Go · main', vendor: 'github' },
      { id: 'mon-5xx', kind: 'monitor', name: 'API 5xx', caption: 'Datadog monitor', vendor: 'datadog' },
      {
        id: 'mon-db',
        kind: 'monitor',
        name: 'db cpu high',
        caption: 'Datadog monitor',
        vendor: 'datadog',
        attention: ALERTING,
      },
      { id: 'mon-queue', kind: 'monitor', name: 'queue depth', caption: 'Datadog monitor', vendor: 'datadog' },
      { id: 'mon-latency', kind: 'monitor', name: 'checkout p99', caption: 'Datadog monitor', vendor: 'datadog' },
      { id: 'mon-uptime', kind: 'monitor', name: 'status uptime', caption: 'Datadog synthetic', vendor: 'datadog' },
      { id: 'tool-db', kind: 'tool', name: 'postgres-readonly', caption: 'tool server · 6 tools' },
      { id: 'model-c', kind: 'model', name: 'embeddings', caption: 'model · API key' },
    ],
    [
      ['host-app', 'zone', 'in zone'],
      ['host-status', 'zone', 'in zone'],
      ['host-api', 'checkout', 'resolves to'],
      ['host-app', 'web-app', 'resolves to'],
      ['host-status', 'status', 'resolves to'],
      ['ep-v1', 'checkout', 'exposes'],
      ['ep-hooks', 'billing', 'exposes'],
      ['checkout', 'app-1', 'runs on'],
      ['checkout', 'app-2', 'runs on'],
      ['web-app', 'ecs', 'runs on'],
      ['billing', 'worker-1', 'runs on'],
      ['notify', 'worker-1', 'runs on'],
      ['search', 'app-2', 'runs on'],
      ['status', 'web-1', 'runs on'],
      ['checkout', 'orders-db', 'depends on'],
      ['checkout', 'cache', 'depends on'],
      ['checkout', 'queue', 'depends on'],
      ['billing', 'queue', 'depends on'],
      ['billing', 'orders-db', 'depends on'],
      ['web-app', 'checkout', 'calls'],
      ['web-app', 'search', 'calls'],
      ['checkout', 'billing', 'calls'],
      ['checkout', 'notify', 'calls'],
      ['web-app', 'users-db', 'depends on'],
      ['web-app', 'assets', 'depends on'],
      ['notify', 'users-db', 'depends on'],
      ['search', 'orders-db', 'depends on'],
      ['status', 'r2', 'depends on'],
      ['checkout', 'repo-api', 'built from', false],
      ['web-app', 'repo-web', 'built from', false],
      ['billing', 'repo-billing', 'built from', false],
      ['checkout', 'pipe-deploy', 'deployed by', false],
      ['web-app', 'pipe-web', 'deployed by', false],
      ['orders-db', 'mon-db', 'monitored by', false],
      ['checkout', 'mon-5xx', 'monitored by', false],
      ['checkout', 'mon-latency', 'monitored by', false],
      ['queue', 'mon-queue', 'monitored by', false],
      ['status', 'mon-uptime', 'monitored by', false],
      ['app-1', 'aws', 'belongs to', false],
      ['app-2', 'aws', 'belongs to', false],
      ['worker-1', 'aws', 'belongs to', false],
      ['ecs', 'aws', 'belongs to', false],
      ['orders-db', 'aws', 'belongs to', false],
      ['users-db', 'aws', 'belongs to', false],
      ['backups', 'aws', 'belongs to', false],
      ['assets', 'aws', 'belongs to', false],
      ['r2', 'cf', 'belongs to', false],
      ['tool-db', 'orders-db', 'reads from'],
    ],
  );
  const groups = new Map([...first.groups, ...more.groups].map((group) => [group.id, group]));
  return {
    nodes: [...first.nodes, ...more.nodes],
    edges: [...first.edges, ...more.edges],
    groups: [...groups.values()],
  };
}

/** mulberry32: the same map on every load. */
function prng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const VENDORS_BY_LANE: Record<string, Vendor[]> = {
  entry: ['cloudflare', 'aws'],
  services: ['aws', 'google-cloud'],
  runtime: ['aws', 'google-cloud', 'ssh'],
  data: ['aws', 'google-cloud', 'postgresql'],
  platforms: ['aws', 'google-cloud', 'cloudflare'],
  code: ['github'],
  observability: ['datadog'],
  tools: ['claude'],
};

const LANE_KINDS: Record<string, AtlasKind[]> = {
  entry: ['hostname', 'hostname', 'endpoint', 'domain'],
  services: ['service'],
  runtime: ['host', 'host', 'container'],
  data: ['datastore', 'datastore', 'bucket'],
  platforms: ['account'],
  code: ['repository', 'pipeline'],
  observability: ['monitor'],
  tools: ['tool', 'model'],
};

/** A generated company of `count` entries, shaped like a real one, grouped by vendor. */
export function generatedCompany(count: number, seed = 7): AtlasMap {
  const random = prng(seed);
  const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)]!;
  const shares: [string, number][] = [
    ['entry', 0.16],
    ['services', 0.14],
    ['runtime', 0.18],
    ['data', 0.14],
    ['platforms', 0.03],
    ['code', 0.17],
    ['observability', 0.12],
    ['tools', 0.06],
  ];
  const entries: Entry[] = [];
  const byLane = new Map<string, string[]>();
  let made = 0;
  shares.forEach(([lane, share], index) => {
    const n = index === shares.length - 1 ? count - made : Math.round(count * share);
    for (let i = 0; i < n; i++) {
      const kind = pick(LANE_KINDS[lane]!);
      const vendor = pick(VENDORS_BY_LANE[lane]!);
      const id = `${lane}-${i}`;
      const roll = random();
      entries.push({
        id,
        kind,
        name: `${KINDS[kind].word.toLowerCase().replace(/ /g, '-')}-${i + 1}`,
        caption: `${VENDOR_NAMES[vendor] ?? vendor} · eu-west-${1 + (i % 3)}`,
        vendor,
        attention: roll < 0.02 ? ALERTING : roll < 0.05 ? NEEDS_LOOK : roll < 0.07 ? WORKED_ON : undefined,
        unconfirmed: random() < 0.04,
      });
      byLane.set(lane, [...(byLane.get(lane) ?? []), id]);
    }
    made += n;
  });
  const of = (lane: string) => byLane.get(lane) ?? [];
  const pairs: [string, string, string, boolean?][] = [];
  for (const id of of('entry')) if (of('services').length > 0) pairs.push([id, pick(of('services')), 'resolves to']);
  for (const id of of('services')) {
    if (of('runtime').length > 0) pairs.push([id, pick(of('runtime')), 'runs on']);
    if (of('data').length > 0 && random() < 0.7) pairs.push([id, pick(of('data')), 'depends on']);
    if (of('code').length > 0) pairs.push([id, pick(of('code')), 'built from', false]);
    if (of('observability').length > 0 && random() < 0.5)
      pairs.push([id, pick(of('observability')), 'monitored by', false]);
  }
  for (const id of [...of('runtime'), ...of('data')]) {
    if (of('platforms').length > 0) pairs.push([id, pick(of('platforms')), 'belongs to', false]);
  }
  const unique = new Map(pairs.filter(([a, b]) => a !== b).map((pair) => [`${pair[0]}>${pair[1]}`, pair]));
  return build(entries, [...unique.values()], true);
}

const AROUND_LANES = {
  used: { id: 'used', label: 'Used by', empty: 'Nothing recorded depends on it.' },
  self: { id: 'self', label: 'This entry' },
  uses: { id: 'uses', label: 'Depends on', empty: 'It depends on nothing recorded.' },
  runs: { id: 'runs', label: 'Runs on', columns: 2, empty: 'Nothing recorded says what it runs on.' },
  around: { id: 'around', label: 'Around it', columns: 2, empty: 'Nothing recorded stands around it.' },
} as const;

/** One entry among its neighbours on a wide surface: its path across, what it runs on and what stands around under it. */
export const ATLAS_AROUND: GraphBand[] = [
  { id: 'path', lanes: [AROUND_LANES.used, AROUND_LANES.self, AROUND_LANES.uses] },
  { id: 'under', lanes: [AROUND_LANES.runs, AROUND_LANES.around] },
];

/** The same on a narrow sheet: one cluster under another, each two columns wide. */
export const ATLAS_AROUND_STACKED: GraphBand[] = (['used', 'self', 'uses', 'runs', 'around'] as const).map((id) => ({
  id,
  lanes: [{ ...AROUND_LANES[id], columns: 2 }],
}));

/** An entry and everything one step from it, each stood in the cluster that says how it relates. */
export function atlasNeighbourhood(map: AtlasMap, self: string): AtlasMap {
  const near = graphNeighbourhood(map.edges, self);
  const laneFor = (id: string): string => {
    if (id === self) return 'self';
    const edge = map.edges.find(
      (one) => near.edges.has(one.id) && (one.from === id || one.to === id) && (one.from === self || one.to === self),
    )!;
    if (edge.family === 'context') return 'around';
    if (edge.family === 'support') return 'runs';
    return edge.to === self ? 'used' : 'uses';
  };
  return {
    nodes: map.nodes
      .filter((node) => near.nodes.has(node.id))
      .map((node) => ({ ...node, lane: laneFor(node.id), column: undefined, group: undefined })),
    edges: map.edges.filter((edge) => near.edges.has(edge.id)),
    groups: [],
  };
}
