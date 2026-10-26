import type { CSSProperties } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, Card, DescriptionList, IconButton, List, ListItem, RelativeTime, Tag, Text } from '@crewlethq/ui';
import { density } from '@crewlethq/tokens';
import {
  EllipsisVerticalGlyph,
  ScrollTextGlyph,
  SquareTerminalGlyph,
  TargetGlyph,
  TelescopeGlyph,
} from '@crewlethq/icons/glyphs';

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
        <Button variant="ghost" size="small">
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
 * THE TILE. `subtle` is the card at the tile's inset, and it takes the tighter
 * inset without being asked: a grid of records is
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
        icon={<SquareTerminalGlyph size="sm" />}
        count={3}
        subtitle="every run started in the last hour"
        actions={<IconButton label="More actions" icon={<EllipsisVerticalGlyph />} size="sm" />}
      >
        <Card.Title>Coding runs</Card.Title>
      </Card.Header>
      <Card.Body padding="none">
        <List>
          {/* RelativeTime takes the register round it, so the time is set in
              the caption step, as the List stories set theirs. */}
          <ListItem
            href="#/runs/1"
            trailing={
              <Text variant="caption">
                <RelativeTime value={new Date(Date.now() - 120_000).toISOString()} />
              </Text>
            }
          >
            <Text variant="cell">Backend Lead, e2b</Text>
          </ListItem>
          <ListItem
            href="#/runs/2"
            trailing={
              <Text variant="caption">
                <RelativeTime value={new Date(Date.now() - 900_000).toISOString()} />
              </Text>
            }
          >
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
      <Card.Header icon={<SquareTerminalGlyph size="sm" />} subtitle="from each completion's own report">
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
 * A NAME TOO LONG FOR THE ROW. The head is one line and the name block clips,
 * so the subtitle beside it gives up its tail first, and once there is no
 * tail left to trade, the title itself runs out of room.
 *
 * Left alone it is CUT at its own edge, mid-word, short of the count beside
 * it: `text-overflow` acts on a block container only, and the title is flex.
 * `truncate` makes it a block so the line ends in an ellipsis instead. It is
 * opt-in, because a title with
 * its own children inside it lays them out as one line of inline content
 * rather than as centred flex items with a gap; a glyph belongs in the
 * header's own `icon` slot, which is outside the title either way.
 *
 * Narrow the viewport, or drag the two cards narrower, to watch the ellipsis
 * appear on the right-hand one and the word break on the left.
 */
export const ALongTitle: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--spacing-4)', gridTemplateColumns: '1fr 1fr', maxWidth: 560 }}>
      <Card as="section">
        <Card.Header icon={<SquareTerminalGlyph size="sm" />} count={12} subtitle="last hour">
          <Card.Title>Platform Reliability and Developer Experience</Card.Title>
        </Card.Header>
        <Card.Body>
          <Card.Description>Cut at the edge: the default, and what a unit name meets today.</Card.Description>
        </Card.Body>
      </Card>
      <Card as="section">
        <Card.Header icon={<SquareTerminalGlyph size="sm" />} count={12} subtitle="last hour">
          <Card.Title truncate>Platform Reliability and Developer Experience</Card.Title>
        </Card.Header>
        <Card.Body>
          <Card.Description>Ended with an ellipsis: the same title, asked to truncate.</Card.Description>
        </Card.Body>
      </Card>
    </div>
  ),
};

/**
 * A NARROW CARD PUTS ITS SUBTITLE ON A LINE OF ITS OWN. Under 480px of card
 * the subtitle goes under the title and the card's controls, at the head's
 * whole width, and wraps there rather than ending: on a phone this card's
 * subtitle used to be cut to "Resets today at midnight, the week…", and the
 * half it lost was the half that said when. The wide card keeps the one-line
 * head, where the subtitle gives up its tail first.
 */
export const ANarrowCardsSubtitle: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--spacing-4)' }}>
      {[345, 720].map((width) => (
        <div key={width} style={{ width }}>
          <Card as="section">
            <Card.Header
              subtitle="Resets today at midnight, the week on Monday and the month on the 1st"
              actions={
                <Button size="small" variant="secondary">
                  Edit
                </Button>
              }
            >
              <Card.Title>Agent seats</Card.Title>
            </Card.Header>
            <Card.Body>
              <Card.Description>Each seat spends against the budget of its team.</Card.Description>
            </Card.Body>
          </Card>
        </div>
      ))}
    </div>
  ),
};

/**
 * ONE DENSITY, SCOPED TO ONE PANEL, for a story that draws all three side by
 * side.
 *
 * WHY A --density ON A PANEL IS NOT ENOUGH. The token layer declares every
 * spacing and size step on the root as `calc(Npx * var(--density, 1))`, and a
 * custom property is computed where it is declared: every step under the
 * panel already holds the root's number, so a --density set there reaches
 * nothing, and this story drew the normal card three times under three
 * headings. The panel re-declares each step the root writes in terms of
 * --density, read from the loaded stylesheets rather than copied out of them,
 * so each one resolves against the panel's own setting.
 */
function densityScope(step: keyof typeof density): CSSProperties {
  const scope: Record<string, string> = { '--density': density[step] };
  const read = (rules: CSSRuleList) => {
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSStyleRule && rule.selectorText === ':root') {
        for (const name of Array.from(rule.style)) {
          const value = rule.style.getPropertyValue(name).trim();
          if (name.startsWith('--') && value.includes('var(--density')) scope[name] = value;
        }
      } else if (rule instanceof CSSGroupingRule) {
        read(rule.cssRules);
      }
    }
  };
  for (const sheet of Array.from(document.styleSheets)) {
    // A stylesheet from another origin keeps its rules to itself.
    try {
      read(sheet.cssRules);
    } catch {
      continue;
    }
  }
  return scope as CSSProperties;
}

/**
 * The panel at all three densities, side by side. Every inset, row height and
 * gap in it is a spacing token, so one setting reaches all of them; nothing in
 * the card restates a number.
 */
export const EveryDensity: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 'var(--spacing-4)', alignItems: 'flex-start' }}>
      {(['compact', 'normal', 'comfortable'] as const).map((step) => (
        <div key={step} style={{ flex: '1 1 0', minWidth: 0, ...densityScope(step) }}>
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

/**
 * A ROW OF CARDS OF DIFFERENT WIDTHS, one head height: `subtitlePlacement="below"`
 * puts the subtitle under the title at every width, where the default keeps a
 * wide card's head on one line and stacks only a narrow one's.
 */
export const SubtitleBelow: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--spacing-4)', maxWidth: 960 }}>
      <Card>
        <Card.Header subtitle="Input and output tokens, the last 30 days" subtitlePlacement="below">
          <Card.Title>By model</Card.Title>
        </Card.Header>
        <Card.Body>Wide card</Card.Body>
      </Card>
      <Card>
        <Card.Header subtitle="The last 30 days" subtitlePlacement="below">
          <Card.Title>Workers</Card.Title>
        </Card.Header>
        <Card.Body>Side card</Card.Body>
      </Card>
    </div>
  ),
};

/**
 * A company's principles as cards: the mission and the vision side by side,
 * each a passage under a heading with its own glyph, and the standing
 * policies as one compact numbered list below them. The head glyphs are
 * sized `sm`, the step every other card head here draws: unsized, a glyph
 * takes the text round it, which is the page's 16px in Storybook.
 */
export const Principles: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 16, maxWidth: 960 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
        <Card as="section">
          <Card.Header divided={false} icon={<TargetGlyph size="sm" />}>
            <Card.Title>Mission</Card.Title>
          </Card.Header>
          <Card.Body>
            <Text as="p" variant="passage">
              Make splitting shared expenses so easy that nobody ever has to chase a friend for money again.
            </Text>
          </Card.Body>
        </Card>
        <Card as="section">
          <Card.Header divided={false} icon={<TelescopeGlyph size="sm" />}>
            <Card.Title>Vision</Card.Title>
          </Card.Header>
          <Card.Body>
            <Text as="p" variant="passage">
              {'Every shared cost, settled the moment it happens.\nNo spreadsheets, no reminders, no awkward messages.'}
            </Text>
          </Card.Body>
        </Card>
      </div>
      <Card as="section" padding="none">
        <Card.Header icon={<ScrollTextGlyph size="sm" />} count={3}>
          <Card.Title>Standing policies</Card.Title>
        </Card.Header>
        <List variant="numbered-divided" density="compact" measure="wide" aria-label="Standing policies">
          <ListItem>Every amount is exact to the cent. Round only when a person reads it.</ListItem>
          <ListItem>Ask before deleting anything a customer wrote.</ListItem>
          <ListItem>Never move money without a second agent checking the amount and the recipient.</ListItem>
        </List>
      </Card>
    </div>
  ),
};
