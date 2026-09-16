import type { Meta, StoryObj } from '@storybook/react-vite';
import { OrgLabel } from '@crewlethq/ui';
import { ApartmentGlyph, PersonGlyph, SmartToyGlyph, WarningGlyph } from '@crewlethq/icons/glyphs';

/**
 * UI / OrgLabel.
 *
 * What a node of an org chart and a row of an org table both say: a mark, a
 * name, the word under it saying what kind of thing this is, and the slot a
 * push arrives in.
 *
 * ONE COMPONENT, TWO LAYOUTS. The two used to be written separately and their
 * stylesheets agreed on 38 of the 62 declarations they set. Seventeen of the 24
 * that differed are one difference restated, and it is the difference these two
 * stories are here to show: a chart node is a box as wide as its own name, so
 * its name is CENTRED between two fixed zones; a table row is a line in a
 * column read down its leading edge, so its name is RANGED LEFT and a column
 * of centred names is a column nobody can scan.
 *
 * In place, `OrgNodeLabel` is this in the node layout and `OrgTableName` is
 * this in the row layout: see the TreeCanvas and OrgTable stories for either
 * one drawn in the surface it belongs to.
 */
const meta: Meta<typeof OrgLabel> = {
  title: 'UI/OrgLabel',
  component: OrgLabel,
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof OrgLabel>;

/*
 * A FRAME PER LAYOUT, because neither layout draws its own: a node's three
 * zones are laid out by the chart card around them and a row's by the grid
 * cell. These stand in for both, at the width each surface gives it, so what
 * is being compared is the label and not the box.
 */
function Node({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        width: 'max-content',
        minWidth: 180,
        padding: 8,
        background: 'var(--color-surface-raised)',
        border: '1px solid var(--color-border-default)',
        borderRadius: 'var(--radius-md)',
      }}
    >
      {children}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        width: 360,
        padding: '6px 8px',
        borderBottom: '1px solid var(--color-border-subtle)',
        /* The two the table's own root publishes, because a row's ink is the
           TABLE's rather than the label's: without them a row drawn outside a
           table has no accent to read and its mark is left at the name's own
           ink, which is brighter than anything the table ever draws. */
        ['--crewlet-org-table-ink' as string]: 'var(--color-text-primary)',
        ['--crewlet-org-table-accent' as string]: 'var(--color-text-tertiary)',
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

const stack = { display: 'flex', flexDirection: 'column', gap: 16 } as const;

/** The node layout: centred between two fixed zones, as a chart card holds it. */
export const Node_: Story = {
  name: 'In a chart node',
  render: () => (
    <div style={stack}>
      <Node>
        <OrgLabel icon={<ApartmentGlyph />} name="Engineering" caption="Department" />
      </Node>
      {/* The mark that stands for the THING the chart is about fills three
          quarters of its zone, where a container half-fills it: that is what
          tells an agent seat from a unit at the far end of a chart without
          either caption being read. */}
      <Node>
        <OrgLabel
          icon={<SmartToyGlyph />}
          iconSize="lg"
          name="Dev Agent"
          caption="Crewlet agent"
          trailing={<span style={{ fontSize: 11 }}>idle</span>}
        />
      </Node>
      {/* A dashed ring is the boundary something standing for somebody outside
          the system wears: a boundary rather than a hue, so it reads to
          somebody who cannot separate hues at all. */}
      <Node>
        <OrgLabel
          icon={<PersonGlyph />}
          iconRing="dashed"
          iconSize="lg"
          name="Ada Lovelace"
          caption="Human seat"
          captionMarks={<WarningGlyph />}
        />
      </Node>
    </div>
  ),
};

/** The row layout: the same four facts, ranged left down a column. */
export const Row_: Story = {
  name: 'In a table row',
  render: () => (
    <div>
      <Row>
        <OrgLabel layout="row" icon={<ApartmentGlyph />} name="Engineering" caption="Unit" />
      </Row>
      <Row>
        <OrgLabel
          layout="row"
          icon={<SmartToyGlyph />}
          name="Dev Agent"
          caption="Agent seat"
          tone="purple"
          trailing={<span style={{ fontSize: 11 }}>idle</span>}
        />
      </Row>
      <Row>
        <OrgLabel
          layout="row"
          icon={<PersonGlyph />}
          iconRing="dashed"
          name="Ada Lovelace"
          caption="Human seat"
          captionMarks={<WarningGlyph />}
          tone="cyan"
        />
      </Row>
    </div>
  ),
};

/**
 * The two side by side, which is the comparison the component exists for: the
 * same props, the same element tree, and the layout is the whole difference.
 */
export const BothLayouts: Story = {
  name: 'The two layouts',
  render: () => (
    <div style={{ display: 'flex', gap: 48, alignItems: 'flex-start' }}>
      <div style={stack}>
        <p className="t-caption">node</p>
        <Node>
          <OrgLabel
            icon={<SmartToyGlyph />}
            iconSize="lg"
            name="Dev Agent"
            caption="Crewlet agent"
            trailing={<span style={{ fontSize: 11 }}>idle</span>}
          />
        </Node>
      </div>
      <div style={stack}>
        <p className="t-caption">row</p>
        <Row>
          <OrgLabel
            layout="row"
            icon={<SmartToyGlyph />}
            name="Dev Agent"
            caption="Agent seat"
            trailing={<span style={{ fontSize: 11 }}>idle</span>}
          />
        </Row>
      </div>
    </div>
  ),
};
