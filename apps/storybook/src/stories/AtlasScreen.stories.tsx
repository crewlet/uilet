import { useMemo, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  ActivityStrip,
  Button,
  Card,
  DataGrid,
  EntityChip,
  GraphCanvas,
  IconButton,
  IconTile,
  Input,
  Legend,
  PropertyList,
  Sparkline,
  StackedBar,
  StackedRing,
  StatusDot,
  TableDateCell,
  TableTextCell,
  TableTwoLineCell,
  Tag,
  Text,
  Timeline,
  VisuallyHidden,
  graphReach,
  type DataGridBand,
  type DataGridColumn,
  type PropertyListGroup,
} from '@crewlethq/ui';
import { VendorMark } from '@crewlethq/icons';
import { ArrowUpRightGlyph, CornerDownLeftGlyph, SearchGlyph, TargetGlyph, XGlyph } from '@crewlethq/icons/glyphs';
import { BothThemes } from '../BothThemes';
import {
  ATLAS_AROUND_STACKED,
  ATLAS_BANDS,
  ATLAS_TONES,
  ENTRY_LABELS,
  atlasNeighbourhood,
  grownCompany,
} from '../fixtures/atlasMap';
import {
  ATLAS_DAYS,
  ATLAS_NOW,
  CONFIDENCE_WORD,
  HEALTH_ORDER,
  HEALTH_TONE,
  HEALTH_WORD,
  atlasRows,
  type AtlasRow,
} from '../fixtures/atlasCatalogue';

/**
 * UI / Atlas screen parts.
 *
 * A map and catalogue of what a company runs on, composed from the kit's own
 * parts, to show that nothing on such a screen is page code:
 *
 * - the catalogue is a `DataGrid` with bands (rows grouped by health), its
 *   rows led by an `IconTile` disc with the vendor's mark and a status badge,
 *   then `EntityChip` (owner), `StatusDot` (the health word and its mark),
 *   `Tag` (relations), a fine `Sparkline` beside its count, and a `Tag` for
 *   how sure the record is;
 * - the band over it is `StackedRing`, `ActivityStrip`, and `StackedBar` with
 *   its `Legend`, on `Card`;
 * - the detail is its header, the entry among its neighbours (the same
 *   `GraphCanvas` with `chrome={false}`), its facts as a `PropertyList` whose
 *   every value carries the kit's source by-line (`setBy`), and its recent
 *   changes as a `Timeline`;
 * - the map is `GraphCanvas`, sharing one selection and one pointed-at entry
 *   with the grid (`hoveredId` and `onHover`, `isPointed` and `onRowPoint`).
 *
 * Health is the engine's word, activity is a count of recorded lines, and the
 * moving dashes show direction: nothing here is a rate, a latency or a budget.
 */
const meta: Meta = {
  title: 'UI/Atlas screen parts',
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj;

const MAP = grownCompany();
const ROWS = atlasRows(MAP);
const plural = (count: number) => `${count} ${count === 1 ? 'entry' : 'entries'}`;
const sum = (values: readonly number[]) => values.reduce((a, b) => a + b, 0);

/** The entry's disc, as every surface draws it: its glyph, its vendor's mark, and a badge when it needs a person. */
function Disc({ row, size = 'sm' }: { row: AtlasRow; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <IconTile
      shape="disc"
      tone="neutral"
      size={size}
      mark={row.vendor ? <VendorMark vendor={row.vendor.id} /> : undefined}
      status={row.node.attention ? { tone: row.node.attention.tone } : undefined}
      dashed={row.confidence === 'unconfirmed'}
    >
      {row.node.glyph}
    </IconTile>
  );
}

/** How an entry relates, as two counts: what uses it, and what it uses. Each chip says its words to a screen reader. */
function Relations({ row }: { row: AtlasRow }) {
  if (row.usedBy === 0 && row.dependsOn === 0) return <VisuallyHidden>No relations</VisuallyHidden>;
  return (
    <span style={{ display: 'inline-flex', gap: 'var(--spacing-1)' }}>
      <Tag size="xs" appearance="outline" leadingIcon={<CornerDownLeftGlyph />}>
        {row.usedBy}
        <VisuallyHidden> used by</VisuallyHidden>
      </Tag>
      <Tag size="xs" appearance="outline" leadingIcon={<ArrowUpRightGlyph />}>
        {row.dependsOn}
        <VisuallyHidden> depends on</VisuallyHidden>
      </Tag>
    </span>
  );
}

/**
 * Every column has a floor, so a grid too narrow for all of them gives columns
 * way in order (`drop`) instead of cutting every value short.
 */
const COLUMNS: DataGridColumn<AtlasRow>[] = [
  {
    key: 'name',
    header: 'Entry',
    width: 'minmax(13rem, 2fr)',
    sortValue: (row) => row.node.name,
    phoneLead: true,
    cell: (row) => <TableTwoLineCell icon={<Disc row={row} size="md" />} value={row.node.name} detail={row.node.kind} />,
  },
  {
    key: 'vendor',
    header: 'Vendor',
    width: 'minmax(8rem, 1fr)',
    drop: 4,
    sortValue: (row) => row.vendor?.name ?? '',
    cell: (row) =>
      row.vendor ? (
        <TableTextCell mark={<VendorMark vendor={row.vendor.id} size="sm" />}>{row.vendor.name}</TableTextCell>
      ) : (
        <VisuallyHidden>No vendor</VisuallyHidden>
      ),
  },
  {
    key: 'owner',
    header: 'Owner',
    width: 'minmax(9rem, 1fr)',
    drop: 6,
    sortValue: (row) => row.owner?.name ?? '',
    cell: (row) =>
      row.owner ? (
        <EntityChip name={row.owner.name} kind={row.owner.kind} size="xs" />
      ) : (
        <Text variant="cell" tone="tertiary">
          No owner yet
        </Text>
      ),
  },
  {
    key: 'health',
    header: 'Health',
    width: 'minmax(8rem, 1fr)',
    sortValue: (row) => HEALTH_ORDER.indexOf(row.health),
    cell: (row) => <StatusDot tone={HEALTH_TONE[row.health]}>{row.healthWord}</StatusDot>,
  },
  {
    key: 'relations',
    header: 'Relations',
    width: 'minmax(7rem, 0.8fr)',
    drop: 1,
    cell: (row) => <Relations row={row} />,
  },
  {
    key: 'activity',
    header: 'Activity',
    width: 'minmax(8rem, 1fr)',
    drop: 2,
    sortValue: (row) => sum(row.activity),
    cell: (row) => (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
        <span style={{ width: '4.5rem' }}>
          <Sparkline values={row.activity} weight="fine" color="var(--color-brand-accent)" height="1.375rem" />
        </span>
        <Text variant="cell" tone="secondary" numeric>
          {sum(row.activity)}
          <VisuallyHidden> lines recorded in {ATLAS_DAYS} days</VisuallyHidden>
        </Text>
      </span>
    ),
  },
  {
    key: 'changed',
    header: 'Last change',
    width: 'minmax(10rem, 1.4fr)',
    drop: 5,
    sortValue: (row) => row.changedAt,
    cell: (row) => (
      <TableTwoLineCell value={<TableDateCell value={row.changedAt} now={ATLAS_NOW} />} detail={row.changeReason} />
    ),
  },
  {
    key: 'confidence',
    header: 'Confidence',
    width: 'minmax(7rem, 0.8fr)',
    drop: 3,
    sortValue: (row) => row.confidence,
    cell: (row) => (
      <Tag size="xs" appearance={row.confidence === 'confirmed' ? 'quiet' : 'outline'}>
        {CONFIDENCE_WORD[row.confidence]}
      </Tag>
    ),
  },
];

/** The rows under a heading per health, the worst first, each heading with its mark and its count. */
function bandsOf(rows: readonly AtlasRow[]): DataGridBand<AtlasRow>[] {
  return HEALTH_ORDER.map((health) => ({
    key: health,
    label: HEALTH_WORD[health],
    mark: <StatusDot tone={HEALTH_TONE[health]} />,
    rows: rows.filter((row) => row.health === health),
  })).filter((band) => band.rows.length > 0);
}

function Catalogue({
  rows = ROWS,
  selected,
  onSelect,
  pointed,
  onPoint,
}: {
  rows?: readonly AtlasRow[];
  selected: string | null;
  onSelect: (id: string) => void;
  pointed?: string | null;
  onPoint?: (id: string | null) => void;
}) {
  const [sort, setSort] = useState('name');
  return (
    <div style={{ display: 'grid', gap: 'var(--spacing-2)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--spacing-3)' }}>
        <Text variant="heading">Catalogue</Text>
        <Text variant="caption" tone="secondary">
          {plural(rows.length)}
        </Text>
      </div>
      <DataGrid
        aria-label="Catalogue of everything the company runs on"
        bands={bandsOf(rows)}
        columns={COLUMNS}
        rowKey={(row) => row.id}
        sort={sort}
        onSortChange={setSort}
        isSelected={(row) => row.id === selected}
        isPointed={(row) => row.id === pointed}
        onRowPoint={onPoint ? (row) => onPoint(row?.id ?? null) : undefined}
        onRowActivate={(row) => onSelect(row.id)}
        rowTone={(row) => (row.health === 'quiet' ? undefined : HEALTH_TONE[row.health])}
        empty={{ title: 'Nothing matches', hint: 'Try a name, a vendor or a team.' }}
      />
    </div>
  );
}

const frame = { padding: 'var(--spacing-4)', display: 'grid', gap: 'var(--spacing-4)' } as const;

function CatalogueAlone() {
  const [selected, setSelected] = useState<string | null>('orders-db');
  return (
    <div style={frame}>
      <Catalogue selected={selected} onSelect={setSelected} />
    </div>
  );
}

/** The catalogue alone: rich rows, grouped by health, sortable, one row the selection. */
export const CatalogueGrid: Story = { render: () => <CatalogueAlone /> };

const tile = { display: 'grid', gap: 'var(--spacing-2)', alignContent: 'start', minWidth: 0 } as const;
const overline = (words: string) => (
  <Text variant="label">{words}</Text>
);
/** A tile of the band: it grows by its share and wraps under the others when the row runs out. */
const share = (grow: number, basis: string) => ({ flex: `${grow} 1 ${basis}`, minWidth: 0 }) as const;

/** The band over the map: how many entries and how they are, what needs attention, the week, and where the record comes from. */
function Band({ rows = ROWS, onSelect }: { rows?: readonly AtlasRow[]; onSelect?: (id: string) => void }) {
  const count = (health: AtlasRow['health']) => rows.filter((row) => row.health === health).length;
  const wrong = rows.filter((row) => row.health !== 'quiet').sort((a, b) => b.usedBy - a.usedBy);
  const perDay = Array.from({ length: ATLAS_DAYS }, (_, day) => sum(rows.map((row) => row.activity[day] ?? 0)));
  const sure = (confidence: AtlasRow['confidence']) => rows.filter((row) => row.confidence === confidence).length;
  const vendors = [
    ...new Map(rows.flatMap((row) => (row.vendor ? [[row.vendor.id, row.vendor] as const] : []))).values(),
  ];
  const health = [
    { id: 'quiet', label: 'Quiet', value: count('quiet'), color: 'var(--color-border-control)' },
    { id: 'look', label: 'To look at', value: count('look'), color: 'var(--color-feedback-warning)' },
    { id: 'alerting', label: 'Alerting', value: count('alerting'), color: 'var(--color-feedback-danger)' },
  ];
  const sources = [
    { id: 'confirmed', label: 'Confirmed', value: sure('confirmed'), color: 'var(--color-brand-accent)' },
    { id: 'likely', label: 'Likely', value: sure('likely'), color: 'var(--color-brand-accent-soft-strong)' },
    { id: 'unconfirmed', label: 'Unconfirmed', value: sure('unconfirmed'), color: 'var(--color-border-control)' },
  ];
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-3)' }}>
      <Card padding="md" style={share(1.1, '15rem')}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-4)' }}>
          <StackedRing segments={health}>{rows.length}</StackedRing>
          <div style={tile}>
            {overline('The company runs on')}
            <Text variant="heading">{plural(rows.length)}</Text>
            <Legend items={health} />
          </div>
        </div>
      </Card>
      <Card padding="md" style={share(1.9, '26rem')}>
        <div style={tile}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--spacing-3)' }}>
            {overline('Needs attention now')}
            <Text variant="caption" tone="tertiary">
              {wrong.length} in all
            </Text>
          </div>
          <div
            style={{
              display: 'grid',
              gap: 'var(--spacing-2)',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(15rem, 100%), 1fr))',
            }}
          >
            {wrong.slice(0, 2).map((row) => (
              <Card key={row.id} padding="sm" data-attention-entry="">
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto minmax(0, 1fr) auto',
                    alignItems: 'center',
                    gap: 'var(--spacing-3)',
                  }}
                >
                  <Disc row={row} size="md" />
                  <div data-attention-words="" style={{ display: 'grid', minWidth: 0 }}>
                    <Text variant="body" truncate style={{ fontWeight: 'var(--font-weight-semibold)' }}>
                      {row.node.name}
                    </Text>
                    <Text variant="caption" tone="secondary">
                      {row.changeReason}
                    </Text>
                  </div>
                  <IconButton
                    label={`Show ${row.node.name} on the map`}
                    icon={<TargetGlyph />}
                    size="sm"
                    onClick={() => onSelect?.(row.id)}
                  />
                </div>
              </Card>
            ))}
          </div>
        </div>
      </Card>
      <Card padding="md" style={share(0.9, '12rem')}>
        <div style={tile}>
          {overline('Recorded this week')}
          <span style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--spacing-2)' }}>
            <Text variant="display" numeric>
              {sum(perDay.slice(-7))}
            </Text>
            <Text variant="caption" tone="secondary">
              updates
            </Text>
          </span>
          <ActivityStrip
            label={`Lines recorded per day, the last ${ATLAS_DAYS} days`}
            buckets={perDay.map((v, day) => ({ t: ATLAS_NOW - (ATLAS_DAYS - 1 - day) * 86_400_000, v }))}
          />
        </div>
      </Card>
      <Card padding="md" style={share(1, '14rem')}>
        <div style={tile}>
          {overline('Where it comes from')}
          <span style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-2)' }}>
            {vendors.map((vendor) => (
              <VendorMark key={vendor.id} vendor={vendor.id} size="sm" title={vendor.name} />
            ))}
          </span>
          <StackedBar segments={sources} />
          <Legend items={sources} />
        </div>
      </Card>
    </div>
  );
}

/** The band alone. */
export const SummaryBand: Story = {
  render: () => (
    <div style={frame}>
      <Band />
    </div>
  ),
};

const CHANGES = [
  { at: 2, word: 'Alert', text: 'A standing alarm was raised: cpu high', state: 'danger' as const },
  { at: 9, word: 'Changed', text: 'Engine version 16.3 to 16.4, seen by the cloud account', state: 'default' as const },
  { at: 30, word: 'Confirmed', text: 'Purpose confirmed as it stands by a person', state: 'default' as const },
  { at: 170, word: 'Found', text: 'Found in the cloud account', state: 'default' as const },
];

const cloud = { actor: 'AWS', verb: 'seen', mark: <VendorMark vendor="aws" size="sm" />, ago: '9h ago' } as const;
const FACTS: PropertyListGroup[] = [
  {
    name: 'What it is',
    items: [
      { label: 'Engine', value: 'postgres 16.4', setBy: cloud },
      { label: 'Region', value: 'eu-west-1', setBy: cloud },
      { label: 'Account', value: 'acme-prod', setBy: cloud },
      {
        label: 'Purpose',
        value: 'Orders and their line items',
        setBy: { actor: 'engineer', verb: 'observed', qualifier: 'likely', ago: '2d ago' },
      },
    ],
  },
];

/**
 * The detail: identity and health, the entry among its neighbours in the
 * map's own look, what is known with where each value comes from, then what
 * was recorded.
 */
function Detail({ row }: { row: AtlasRow }) {
  const near = useMemo(() => atlasNeighbourhood(MAP, row.id), [row.id]);
  // A sheet is short of room, so a cluster nothing stands in is left out rather than drawn empty.
  const bands = ATLAS_AROUND_STACKED.filter((band) => near.nodes.some((node) => node.lane === band.id));
  const carrying = MAP.edges.filter((edge) => edge.family !== 'context');
  const reach = (direction: 'up' | 'down') => graphReach(carrying, row.id, direction, Infinity).nodes.size - 1;
  return (
    <div style={{ display: 'grid', gap: 'var(--spacing-4)', maxWidth: '28rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
        <Disc row={row} size="lg" />
        <div style={{ display: 'grid', gap: 'var(--spacing-1)', minWidth: 0 }}>
          <Text variant="heading">{row.node.name}</Text>
          <Text variant="caption" tone="secondary">
            {[row.node.kind, row.vendor?.name].filter(Boolean).join(' · ')}
          </Text>
        </div>
      </div>
      <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)', flexWrap: 'wrap' }}>
        <StatusDot tone={HEALTH_TONE[row.health]}>{row.healthWord}</StatusDot>
        {row.owner ? <EntityChip name={row.owner.name} kind={row.owner.kind} size="xs" /> : null}
        <Tag size="xs" appearance={row.confidence === 'confirmed' ? 'quiet' : 'outline'}>
          {CONFIDENCE_WORD[row.confidence]}
        </Tag>
      </span>
      <div style={{ display: 'grid', gap: 'var(--spacing-2)' }}>
        {overline('What it touches')}
        <Text variant="body">
          {plural(reach('up'))} depend on it, and it depends on {reach('down')}.
        </Text>
        <div style={{ height: `${6 + bands.length * 5.5}rem` }}>
          <GraphCanvas
            label={`${row.node.name} and what it touches`}
            bands={bands}
            nodes={near.nodes}
            edges={near.edges}
            labels={ENTRY_LABELS}
            selectedId={row.id}
            chrome={false}
          />
        </div>
      </div>
      <PropertyList aria-label="What is known, each value with where it comes from" groups={FACTS} />
      <div style={{ display: 'grid', gap: 'var(--spacing-2)' }}>
        {overline('Recent changes')}
        <Timeline itemLabel="Change" density="compact">
          {CHANGES.map((change) => (
            <Timeline.Item key={change.at} state={change.state}>
              <Text variant="cell">
                {change.word}: {change.text}
              </Text>
              <Text variant="caption" tone="tertiary">
                <TableDateCell value={ATLAS_NOW - change.at * 3_600_000} now={ATLAS_NOW} />
              </Text>
            </Timeline.Item>
          ))}
        </Timeline>
      </div>
    </div>
  );
}

/** The detail: its header, the entry among its neighbours, its facts with their sources, and its recent changes. */
export const DetailHeadAndChanges: Story = {
  render: () => (
    <div style={frame}>
      <Detail row={ROWS.find((row) => row.id === 'orders-db')!} />
    </div>
  ),
};

/**
 * The page: the band, one search, the map, and the catalogue under it. Map
 * and grid share one selection, one pointed-at entry and one search.
 */
function Page({ initialSelected = null }: { initialSelected?: string | null }) {
  const [selected, setSelected] = useState<string | null>(initialSelected);
  const [pointed, setPointed] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const needle = query.trim().toLowerCase();
  const matching = useMemo(
    () =>
      needle === ''
        ? ROWS
        : ROWS.filter((row) =>
            [row.node.name, row.node.kind, row.vendor?.name, row.owner?.name].some((word) =>
              word?.toLowerCase().includes(needle),
            ),
          ),
    [needle],
  );
  const matches = useMemo(() => new Set(matching.map((row) => row.id)), [matching]);
  const row = selected === null ? undefined : ROWS.find((one) => one.id === selected);
  const carrying = useMemo(() => MAP.edges.filter((edge) => edge.family !== 'context'), []);
  const impact =
    selected === null
      ? ''
      : `${plural(graphReach(carrying, selected, 'up', Infinity).nodes.size - 1)} depend on it, and it depends on ${
          graphReach(carrying, selected, 'down', Infinity).nodes.size - 1
        }`;
  return (
    <div style={frame}>
      <Band onSelect={setSelected} />
      <div style={{ maxWidth: '36rem' }}>
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          leading={<SearchGlyph size="sm" />}
          placeholder="Find a service, database, domain, repository, team or vendor"
          aria-label="Search the atlas: the map and the catalogue narrow together"
        />
      </div>
      <div style={{ height: 'min(34rem, 70vh)', minHeight: 360 }}>
        <GraphCanvas
          label="Architecture map: everything the company runs on and how it relates"
          bands={ATLAS_BANDS}
          nodes={MAP.nodes}
          edges={MAP.edges}
          labels={ENTRY_LABELS}
          tones={ATLAS_TONES}
          selectedId={selected}
          onSelect={setSelected}
          hoveredId={pointed}
          onHover={setPointed}
          cardDimmed={needle === '' ? undefined : (id) => !matches.has(id)}
          controlsPlacement="top-right"
          renderCard={(id) => {
            const one = ROWS.find((candidate) => candidate.id === id);
            return one ? (
              <div style={{ display: 'flex', gap: 'var(--spacing-3)', alignItems: 'center' }}>
                <Disc row={one} size="md" />
                <div style={{ display: 'grid', gap: 'var(--spacing-1)', minWidth: 0 }}>
                  <Text variant="body" truncate>
                    {one.node.name}
                  </Text>
                  <Text variant="caption" tone="secondary">
                    {[one.node.kind, one.vendor?.name, one.owner?.name].filter(Boolean).join(' · ')}
                  </Text>
                  <StatusDot tone={HEALTH_TONE[one.health]}>{one.healthWord}</StatusDot>
                </div>
              </div>
            ) : null;
          }}
          dock={
            row ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-3)',
                  padding: 'var(--spacing-2) var(--spacing-3)',
                }}
              >
                <Disc row={row} />
                <div style={{ display: 'grid', minWidth: 0 }}>
                  <Text variant="body" truncate>
                    {row.node.name}
                  </Text>
                  <Text variant="caption" tone="secondary" truncate>
                    {[row.node.kind, row.healthWord, impact].join(' · ')}
                  </Text>
                </div>
                <Button variant="primary" size="small">
                  Details
                </Button>
                <IconButton label="Clear the selection" icon={<XGlyph />} size="sm" onClick={() => setSelected(null)} />
              </div>
            ) : undefined
          }
        />
      </div>
      <Catalogue
        rows={matching}
        selected={selected}
        onSelect={setSelected}
        pointed={pointed}
        onPoint={setPointed}
      />
    </div>
  );
}

/** The whole page at rest. */
export const MapAndCatalogue: Story = { render: () => <Page /> };

/** The whole page with an entry selected in both the map and the grid. */
export const MapAndCatalogueSelected: Story = { render: () => <Page initialSelected="checkout" /> };

/** The band, the catalogue and the detail in both palettes. */
export const LightAndDark: Story = {
  render: () => (
    <BothThemes>
      <div style={{ display: 'grid', gap: 'var(--spacing-4)' }}>
        <Band />
        <Detail row={ROWS.find((row) => row.id === 'orders-db')!} />
        <Catalogue rows={ROWS.slice(0, 14)} selected="orders-db" onSelect={() => {}} />
      </div>
    </BothThemes>
  ),
};
