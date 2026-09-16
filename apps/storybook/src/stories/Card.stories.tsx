import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, Card, DescriptionList, IconButton, List, ListItem, RelativeTime, Tag, Text } from '@crewlethq/ui';
import { density } from '@crewlethq/tokens';
import { MoreVertGlyph, TerminalGlyph } from '@crewlethq/icons/glyphs';

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  args: { variant: 'default' },
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: ['default', 'subtle', 'outlined', 'inset', 'quiet', 'elevated', 'dashed'],
    },
    /*
     * Left UNSET on purpose in the default args: a card built from slots takes
     * `none` and lets the slots carry the padding, which is the panel shape.
     * Choosing a step here overrides that, which is what a card given raw
     * children wants.
     */
    padding: { control: 'inline-radio', options: [undefined, 'none', 'tight', 'sm', 'md', 'lg'] },
    rail: { control: 'inline-radio', options: [undefined, 'info', 'warning', 'danger'] },
    interactive: { control: 'boolean' },
    selected: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Card>;

/**
 * THE PANEL. A card built from Header, Body and Footer is flush: the head sits
 * at the card's own inset with its rule reaching both edges, the body is
 * padded to the same line, and the foot is a quiet strip in the caption
 * register. Nothing here sets a padding.
 *
 * Switch the Theme toolbar to see both palettes.
 */
export const Basic: Story = {
  render: (args) => (
    <Card {...args} style={{ maxWidth: 400 }}>
      <Card.Header>
        <Card.Title>Production cluster</Card.Title>
        <Tag variant="success">healthy</Tag>
      </Card.Header>
      <Card.Body>
        <Card.Description>Six worker nodes, last reconciled two minutes ago.</Card.Description>
      </Card.Body>
      <Card.Footer>
        <Button variant="tertiary" size="small">
          Edit
        </Button>
        <Button variant="primary" size="small">
          Open
        </Button>
      </Card.Footer>
    </Card>
  ),
};

const BasicRender = Basic.render!;

export const Elevated: Story = { args: { variant: 'elevated' }, render: BasicRender };
export const Outlined: Story = { args: { variant: 'outlined' }, render: BasicRender };
export const Subtle: Story = { args: { variant: 'subtle' }, render: BasicRender };

/**
 * THE TILE. `subtle` is the ground a panel stands on with none of its lift,
 * and it takes the tighter inset without being asked: a grid of records is
 * read by scanning down one column of names, and at the panel's own step each
 * tile spends a third of its height on air. Pass a `padding` to overrule it.
 */
export const Tiles: Story = {
  render: () => (
    <div
      style={{
        display: 'grid',
        gap: 'var(--spacing-3)',
        gridTemplateColumns: 'repeat(auto-fill, minmax(min(240px, 100%), 1fr))',
        maxWidth: 780,
      }}
    >
      {[
        { name: 'SRE Lead', handle: '@sre-lead', state: 'idle' },
        { name: 'Release Manager', handle: '@release', state: 'working' },
        { name: 'Docs Editor', handle: '@docs', state: 'idle' },
      ].map((seat) => (
        <Card key={seat.handle} variant="subtle" href="#seat">
          <Text variant="body">{seat.name}</Text>
          <Text variant="caption">{seat.handle}</Text>
          <Tag appearance="outline" size="sm">
            {seat.state}
          </Tag>
        </Card>
      ))}
    </div>
  ),
};

/**
 * The two grounds a block INSIDE a record takes. `inset` is the well, and
 * `quiet` is the nested panel: the same ground at the tighter radius, with no
 * elevation, so two borders at one radius do not read as a box drawn twice.
 */
export const NestedGrounds: Story = {
  render: () => (
    <Card as="section" style={{ maxWidth: 440 }}>
      <Card.Header>
        <Card.Title>Seat budget</Card.Title>
      </Card.Header>
      <Card.Body>
        <Card variant="inset" padding="sm">
          <Text variant="label">Spent this month</Text>
          <Text variant="stat" numeric>
            $184.20
          </Text>
        </Card>
        <Card variant="quiet" padding="sm">
          <Card.Description>A nested panel, one radius step in from the card holding it.</Card.Description>
        </Card>
      </Card.Body>
    </Card>
  ),
};

/**
 * The same card, both recipes. On the left the slots carry the padding and the
 * head's rule reaches the edge; on the right the card carries its own and the
 * words sit inside it. A card given raw children is padded without asking.
 */
export const TheTwoRecipes: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--spacing-4)', gridTemplateColumns: '1fr 1fr', maxWidth: 720 }}>
      <Card>
        <Card.Header>
          <Card.Title>Built from slots</Card.Title>
        </Card.Header>
        <Card.Body>
          <Card.Description>Flush: the head, the body and the foot set their own inset.</Card.Description>
        </Card.Body>
      </Card>
      <Card>
        <Card.Title>Given raw children</Card.Title>
        <Card.Description>Padded at spacing-4, with nothing to align a rule to.</Card.Description>
      </Card>
    </div>
  ),
};

/**
 * A header with everything in it, over a body that sits flush: the shape a
 * panel carrying a table or a feed takes. The header's rule and the list's
 * first row land on the card's own edges, which is what the flush recipe is
 * for.
 */
export const AFlushPanel: Story = {
  render: (args) => (
    <Card {...args} as="section" style={{ maxWidth: 480 }}>
      <Card.Header
        icon={<TerminalGlyph size="sm" />}
        count={3}
        subtitle="every run started in the last hour"
        actions={<IconButton label="More actions" icon={<MoreVertGlyph />} size="sm" />}
      >
        <Card.Title>Coding runs</Card.Title>
      </Card.Header>
      <Card.Body padding="none">
        <List>
          <ListItem href="#/runs/1" trailing={<RelativeTime value={new Date(Date.now() - 120_000).toISOString()} />}>
            <Text variant="cell">Backend Lead, e2b</Text>
          </ListItem>
          <ListItem href="#/runs/2" trailing={<RelativeTime value={new Date(Date.now() - 900_000).toISOString()} />}>
            <Text variant="cell">Platform Engineer, host</Text>
          </ListItem>
        </List>
      </Card.Body>
      <Card.Footer variant="meta">Runs older than 30 days are swept.</Card.Footer>
    </Card>
  ),
};

/**
 * A card's OWN content, written straight under the header with no body around
 * it. The card draws one for it, at the inset the header sits on, so the
 * sentence under a title starts on the same line as the title.
 *
 * `padding` on a card built from slots names that inset: at `none` the content
 * is left exactly as it was written, for a table that has to reach the card's
 * edges.
 */
export const ContentWithNoBody: Story = {
  render: (args) => (
    <Card {...args} as="section" style={{ maxWidth: 400 }}>
      <Card.Header icon={<TerminalGlyph size="sm" />} subtitle="from each completion's own report">
        <Card.Title>By model</Card.Title>
      </Card.Header>
      <Text variant="cell" as="p">
        No model calls in this window.
      </Text>
      <Text variant="caption" as="p">
        Built from what each completion reported, never from a provider's configured name.
      </Text>
    </Card>
  ),
};

/**
 * The panel at all three densities, side by side. Every inset, row height and
 * gap in it is a spacing token, so one setting on the root reaches all of
 * them; nothing in the card restates a number.
 */
export const EveryDensity: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 'var(--spacing-4)', alignItems: 'flex-start' }}>
      {(['compact', 'normal', 'comfortable'] as const).map((step) => (
        /*
         * --density is what the token layer's own density.css sets from
         * data-density on the ROOT, so three densities on one page set the
         * variable directly and read its value from the tokens rather than
         * copying three numbers out of them.
         */
        <div key={step} style={{ flex: '1 1 0', minWidth: 0, ['--density' as string]: density[step] }}>
          <Text variant="label" as="div" style={{ marginBottom: 'var(--spacing-2)' }}>
            {step}
          </Text>
          <Card as="section">
            <Card.Header count={3} subtitle="in the last hour">
              <Card.Title>Coding runs</Card.Title>
            </Card.Header>
            <Card.Body>
              <Card.Description>Six worker nodes, last reconciled two minutes ago.</Card.Description>
            </Card.Body>
            <Card.Footer variant="meta">Swept after 30 days.</Card.Footer>
          </Card>
        </div>
      ))}
    </div>
  ),
};

/**
 * The rail carries a STATE, never an identity. Working takes the info rail,
 * a seat that needs a person takes warning, and a broken one takes danger.
 */
export const Rails: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--spacing-3)', maxWidth: 320 }}>
      {(['info', 'warning', 'danger'] as const).map((rail) => (
        <Card key={rail} rail={rail} padding="sm">
          <Card.Title>{rail === 'info' ? 'Working' : rail === 'warning' ? 'Needs a person' : 'Broken'}</Card.Title>
          <Card.Description>The word is the signal; the rail is how it is found.</Card.Description>
        </Card>
      ))}
      <Card variant="dashed" padding="sm">
        <Card.Title>A human seat</Card.Title>
        <Card.Description>Defined, and not an agent.</Card.Description>
      </Card>
    </div>
  ),
};

/** A card that goes somewhere is a real anchor, so it opens in a tab. */
export const ALinkCard: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--spacing-3)', maxWidth: 320 }}>
      <Card href="#/seats/ceo" padding="sm">
        <Card.Title>Chief Executive</Card.Title>
        <Card.Description>Reports to nobody. Two units below.</Card.Description>
      </Card>
      <Card href="#/seats/cto" padding="sm" selected>
        <Card.Title>Chief Technology Officer</Card.Title>
        <Card.Description>Chosen, which is what the ring says.</Card.Description>
      </Card>
    </div>
  ),
};

/** A record's own metadata, in the slot a detail page wants. */
export const WithMetadata: Story = {
  render: () => (
    <Card as="section" style={{ maxWidth: 440 }}>
      <Card.Header divided={false}>
        <Card.Title>Turn t-1</Card.Title>
      </Card.Header>
      <Card.Body>
        <DescriptionList
          items={[
            ['Seat', 'Chief Technology Officer'],
            ['Phase', 'execute'],
            ['Rounds', '4'],
          ]}
        />
      </Card.Body>
    </Card>
  ),
};
