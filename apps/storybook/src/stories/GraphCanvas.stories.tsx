import { useCallback, useMemo, useState, type CSSProperties } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  GraphCanvas,
  SegmentedControl,
  StatusLegend,
  graphReach,
  type GraphCanvasProps,
  type GraphTraceDirection,
  type StatusLegendItem,
} from '@crewlethq/ui';
import { BothThemes } from '../BothThemes';
import {
  ATLAS_BANDS,
  ENTRY_LABELS,
  firstSlice,
  generatedCompany,
  grownCompany,
  sparseCompany,
  type AtlasMap,
} from '../fixtures/atlasMap';

/**
 * UI / GraphCanvas.
 *
 * A layered map: entries in lanes read left to right, a band of lanes
 * beneath, groups that open and close, and orthogonal edges from each entry
 * to what it relies on. Only the edges drawn at rest show until a card is
 * selected; a selection lights its neighbours, and with a trace what depends
 * on it.
 *
 * Try it: Tab onto the map, walk it with the arrow keys, press Enter on a
 * card to select it or on a group to open or close it, and Escape to clear.
 * Typing a name finds it. Plus and minus zoom, zero fits.
 */
const meta: Meta<typeof GraphCanvas> = {
  title: 'UI/GraphCanvas',
  component: GraphCanvas,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof GraphCanvas>;

const TRACE_OPTIONS = [
  { value: 'off', label: 'Off' },
  { value: 'down', label: 'Depends on' },
  { value: 'up', label: 'Used by' },
  { value: 'both', label: 'Both' },
] as const;
type TraceChoice = (typeof TRACE_OPTIONS)[number]['value'];

const STATES = [
  { key: 'danger', label: 'Alerting', tone: 'danger' },
  { key: 'warning', label: 'Needs a look', tone: 'warning' },
  { key: 'info', label: 'Being worked on', tone: 'info' },
  { key: 'quiet', label: 'Quiet', tone: 'neutral' },
] as const;

/**
 * The map as a screen holds it: the selection, the trace switch in the
 * canvas's own corner, and a legend that pushes back what it leaves out.
 */
function AtlasMapScreen({
  map,
  initialSelected = null,
  initialTrace = 'off',
  depth = Infinity,
  height = '100vh',
  ...rest
}: {
  map: AtlasMap;
  initialSelected?: string | null;
  initialTrace?: TraceChoice;
  depth?: number;
  height?: CSSProperties['height'];
} & Partial<GraphCanvasProps>) {
  const [selected, setSelected] = useState<string | null>(initialSelected);
  const [trace, setTrace] = useState<TraceChoice>(initialTrace);
  const [state, setState] = useState<string | null>(null);
  const toneOf = useCallback(
    (id: string) => map.nodes.find((node) => node.id === id)?.attention?.tone ?? 'quiet',
    [map],
  );
  const items: StatusLegendItem[] = STATES.map((one) => ({
    ...one,
    count: map.nodes.filter((node) => toneOf(node.id) === one.key).length,
  }));
  const cardDimmed = useMemo(
    () => (state === null ? undefined : (id: string) => toneOf(id) !== state),
    [state, toneOf],
  );
  const traced = trace === 'off' ? null : { direction: trace as GraphTraceDirection, depth };
  const reached =
    selected !== null && traced ? graphReach(map.edges, selected, traced.direction, traced.depth).nodes.size - 1 : null;
  return (
    <div style={{ height, minHeight: 360 }}>
      <GraphCanvas
        label="Atlas map"
        bands={ATLAS_BANDS}
        nodes={map.nodes}
        edges={map.edges}
        groups={map.groups}
        labels={ENTRY_LABELS}
        selectedId={selected}
        onSelect={setSelected}
        trace={traced}
        cardDimmed={cardDimmed}
        controlsPlacement="top-right"
        controlsStart={
          <SegmentedControl
            label="Trace"
            semantics="radio"
            size="sm"
            options={TRACE_OPTIONS}
            value={trace}
            onValueChange={setTrace}
          />
        }
        overlayEnd={
          <StatusLegend
            label="Entry states"
            items={items}
            value={state}
            onValueChange={setState}
            countLabel={(count) => `${count} ${count === 1 ? 'entry' : 'entries'}`}
          />
        }
        hint={reached === null ? undefined : `${reached} ${reached === 1 ? 'entry' : 'entries'} lit`}
        {...rest}
      />
    </div>
  );
}

/** A new company that has connected only its code host: one lane filled, every other saying what would fill it. */
export const Sparse: Story = {
  render: () => <AtlasMapScreen map={sparseCompany()} />,
};

/** The first slice: what the engine already knows on the first day, about a dozen entries. */
export const FirstSlice: Story = {
  render: () => <AtlasMapScreen map={firstSlice()} />,
};

/** About fifty entries, with "what depends on orders-db" traced and an alerting monitor on it. */
export const TracedDependents: Story = {
  render: () => <AtlasMapScreen map={grownCompany()} initialSelected="orders-db" initialTrace="up" />,
};

/** A selection without a trace lights its neighbours, the edges hidden at rest included. */
export const Selected: Story = {
  render: () => <AtlasMapScreen map={grownCompany()} initialSelected="checkout" />,
};

/** Three hundred entries open with their groups closed, each one card saying what it holds. */
export const ThreeHundredClosed: Story = {
  render: () => <AtlasMapScreen map={generatedCompany(300)} collapseAbove={200} />,
};

/**
 * Two thousand entries, every group open: the map opens on its start at a
 * size that reads, and only the cards near the view are mounted. Fit it to see
 * all of them drawn as shapes.
 */
export const TwoThousand: Story = {
  render: () => <AtlasMapScreen map={generatedCompany(2000, 11)} />,
};

/** Nothing recorded yet: every lane is drawn and says what would fill it. */
export const EmptyLanes: Story = {
  render: () => <AtlasMapScreen map={{ nodes: [], edges: [], groups: [] }} />,
};

/** The first slice in both palettes, side by side. */
export const LightAndDark: Story = {
  render: () => (
    <BothThemes>
      <div style={{ height: 460 }}>
        <GraphCanvas
          label="Atlas map"
          bands={ATLAS_BANDS}
          labels={ENTRY_LABELS}
          {...firstSlice()}
          selectedId="tool-dd"
          controlsPlacement="top-right"
        />
      </div>
    </BothThemes>
  ),
};

/** On a phone's width the map opens on its start at a size that reads, and pans. */
export const Narrow: Story = {
  render: () => (
    <div style={{ width: 390, maxWidth: '100%', margin: '0 auto' }}>
      <AtlasMapScreen map={grownCompany()} height={640} />
    </div>
  ),
  parameters: { layout: 'fullscreen' },
};
