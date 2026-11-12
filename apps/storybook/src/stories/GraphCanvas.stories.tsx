import { useMemo, useState, type CSSProperties } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Button,
  GraphCanvas,
  IconButton,
  StatusDot,
  Text,
  graphReach,
  type GraphCanvasProps,
  type GraphNode,
} from '@crewlethq/ui';
import { XGlyph } from '@crewlethq/icons/glyphs';
import { BothThemes } from '../BothThemes';
import {
  ATLAS_AROUND,
  ATLAS_BANDS,
  ATLAS_TONES,
  ENTRY_LABELS,
  atlasNeighbourhood,
  firstSlice,
  generatedCompany,
  grownCompany,
  sparseCompany,
  type AtlasMap,
} from '../fixtures/atlasMap';

/**
 * UI / GraphCanvas.
 *
 * A layered map: entries stand in clusters read left to right, bands of
 * clusters under each other, and right-angled lines run from each entry to
 * what it relies on, around every card. At rest only the calls are drawn,
 * with dashes moving the way they point; what things run on is one trunk per
 * pair of clusters with its count, and what stands around is drawn for the
 * entry a reader stands on. The legend switches each family on.
 *
 * Try it: rest the pointer on a card for its neighbours and its card, press
 * it to light its whole path, press it again or the ground to clear. Tab onto
 * the map and walk it with the arrow keys; Enter selects, Escape clears,
 * typing a name finds it. Plus and minus zoom, zero fits.
 */
const meta: Meta<typeof GraphCanvas> = {
  title: 'UI/GraphCanvas',
  component: GraphCanvas,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof GraphCanvas>;

const plural = (count: number) => `${count} ${count === 1 ? 'entry' : 'entries'}`;

/** The card beside an entry: what it is and how it is, in the kit's own type. */
function EntryCard({ node }: { node: GraphNode }) {
  return (
    <div style={{ display: 'grid', gap: 'var(--spacing-1)' }}>
      <Text variant="body">{node.title ?? node.name}</Text>
      <Text variant="caption" tone="secondary">
        {[node.kind, node.caption].filter(Boolean).join(' · ')}
      </Text>
      <StatusDot tone={node.attention?.tone ?? 'neutral'}>{node.attention?.label ?? 'Quiet'}</StatusDot>
    </div>
  );
}

const dock: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--spacing-3)',
  padding: 'var(--spacing-2) var(--spacing-3)',
};

/** The map as a screen holds it: the selection, the card beside an entry, and the dock that says what is selected. */
function AtlasMapScreen({
  map,
  initialSelected = null,
  height = '100vh',
  ...rest
}: {
  map: AtlasMap;
  initialSelected?: string | null;
  height?: CSSProperties['height'];
} & Partial<GraphCanvasProps>) {
  const [selected, setSelected] = useState<string | null>(initialSelected);
  const byId = useMemo(() => new Map(map.nodes.map((node) => [node.id, node])), [map]);
  const node = selected === null ? undefined : byId.get(selected);
  const carrying = useMemo(() => map.edges.filter((edge) => edge.family !== 'context'), [map]);
  const impact = useMemo(() => {
    if (selected === null) return '';
    const up = graphReach(carrying, selected, 'up', Infinity).nodes.size - 1;
    const down = graphReach(carrying, selected, 'down', Infinity).nodes.size - 1;
    return `${up === 0 ? 'Nothing depends on it' : `${plural(up)} depend on it`}, and it depends on ${down}`;
  }, [carrying, selected]);
  return (
    <div style={{ height, minHeight: 360 }}>
      <GraphCanvas
        label="Atlas map"
        bands={ATLAS_BANDS}
        nodes={map.nodes}
        edges={map.edges}
        groups={map.groups}
        labels={ENTRY_LABELS}
        tones={ATLAS_TONES}
        selectedId={selected}
        onSelect={setSelected}
        controlsPlacement="top-right"
        renderCard={(id) => {
          const one = byId.get(id);
          return one ? <EntryCard node={one} /> : null;
        }}
        dock={
          node ? (
            <div style={dock}>
              <div style={{ display: 'grid', minWidth: 0 }}>
                <Text variant="body" truncate>
                  {node.title ?? node.name}
                </Text>
                <Text variant="caption" tone="secondary" truncate>
                  {[node.kind, node.attention?.label ?? 'Quiet', impact].filter(Boolean).join(' · ')}
                </Text>
              </div>
              <Button variant="primary" size="small">
                Details
              </Button>
              <IconButton label="Clear the selection" icon={<XGlyph />} size="sm" onClick={() => setSelected(null)} />
            </div>
          ) : undefined
        }
        {...rest}
      />
    </div>
  );
}

/** A new company that has connected only its code host: one cluster filled, every other saying what would fill it. */
export const Sparse: Story = {
  render: () => <AtlasMapScreen map={sparseCompany()} />,
};

/** The first slice: what the engine already knows on the first day, about a dozen entries. */
export const FirstSlice: Story = {
  render: () => <AtlasMapScreen map={firstSlice()} />,
};

/** About fifty entries at rest: the calls, with their dashes, and a trunk for what each cluster runs on. */
export const AtRest: Story = {
  render: () => <AtlasMapScreen map={grownCompany()} />,
};

/** A selection lights its whole path, both ways, every family included, and the rest recedes. */
export const Selected: Story = {
  render: () => <AtlasMapScreen map={grownCompany()} initialSelected="checkout" />,
};

/** "What depends on orders-db": the trace narrowed to one way. */
export const TracedDependents: Story = {
  render: () => (
    <AtlasMapScreen map={grownCompany()} initialSelected="orders-db" trace={{ direction: 'up', depth: Infinity }} />
  ),
};

/** An entry another surface points at, such as a table row under the pointer, is lit with its neighbours. */
export const PointedAt: Story = {
  render: () => <AtlasMapScreen map={grownCompany()} hoveredId="orders-db" />,
};

/** Every family drawn line by line, as the legend's three switches leave it. */
export const EveryLine: Story = {
  render: () => (
    <AtlasMapScreen map={grownCompany()} families={new Set(['flow', 'support', 'context'] as const)} />
  ),
};

/** Three hundred entries, every one a card. */
export const ThreeHundred: Story = {
  render: () => <AtlasMapScreen map={generatedCompany(300)} />,
};

/** Three hundred entries open with their groups closed, each one card saying what it holds. */
export const ThreeHundredClosed: Story = {
  render: () => <AtlasMapScreen map={generatedCompany(300)} collapseAbove={200} />,
};

/** Two thousand entries with their groups closed: a summary that opens where a reader looks. */
export const TwoThousandClosed: Story = {
  render: () => <AtlasMapScreen map={generatedCompany(2000, 11)} collapseAbove={200} />,
};

/**
 * Two thousand entries, every group open: the map opens on its start at a
 * size that reads, and only the cards near the view are mounted. Fit it to see
 * all of them drawn as shapes.
 */
export const TwoThousand: Story = {
  render: () => <AtlasMapScreen map={generatedCompany(2000, 11)} />,
};

/** Nothing recorded yet: every cluster is drawn and says what would fill it. */
export const EmptyLanes: Story = {
  render: () => <AtlasMapScreen map={{ nodes: [], edges: [], groups: [] }} />,
};

/**
 * One entry among its neighbours, as a detail sheet draws it: the same map
 * with its chrome off, so no zoom bar, legend or trunk, and the entry itself
 * selected so every line to it is lit.
 */
export const Neighbourhood: Story = {
  render: () => {
    const self = 'checkout';
    const { nodes, edges } = atlasNeighbourhood(grownCompany(), self);
    return (
      <div style={{ height: 420, maxWidth: 720, margin: '0 auto', padding: 'var(--spacing-4)' }}>
        <GraphCanvas
          label="checkout-api and what it touches"
          bands={ATLAS_AROUND}
          nodes={nodes}
          edges={edges}
          labels={ENTRY_LABELS}
          selectedId={self}
          chrome={false}
        />
      </div>
    );
  },
};

/** The grown company in both palettes, at rest and with a selection. */
export const LightAndDark: Story = {
  render: () => (
    <BothThemes>
      <AtlasMapScreen map={grownCompany()} height={620} />
    </BothThemes>
  ),
};

/** The same, selected: the lit path and the receding rest in both palettes. */
export const SelectedLightAndDark: Story = {
  render: () => (
    <BothThemes>
      <AtlasMapScreen map={grownCompany()} height={620} initialSelected="checkout" />
    </BothThemes>
  ),
};

const narrowAt = (width: number): Story => ({
  render: () => (
    <div style={{ width, maxWidth: '100%', margin: '0 auto' }}>
      <AtlasMapScreen map={grownCompany()} height={640} initialSelected="checkout" />
    </div>
  ),
  parameters: { layout: 'fullscreen' },
});

/**
 * On a phone's width the map opens on its start at a size that reads, and
 * pans. Nothing floats over the picture: the dock and the legend stand under it.
 */
export const Narrow: Story = narrowAt(390);

/** The same on a tablet's width. */
export const Tablet: Story = narrowAt(768);
