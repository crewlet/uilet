import type { CSSProperties } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { CREWLET_CHARACTERS } from '@crewlethq/icons/characters';
import { BotGlyph, KeyGlyph } from '@crewlethq/icons/glyphs';
import { AVATAR_STATUSES, Avatar, AvatarStack, Card, NODE_HUES } from '@crewlethq/ui';
import samplePortrait from '../fixtures/sample-portrait.svg';

const meta: Meta<typeof Avatar> = {
  title: 'UI/Avatar',
  component: Avatar,
  args: {
    name: 'Software Engineer',
    size: 'md',
    kind: 'agent',
    tone: 'neutral',
  },
  argTypes: {
    src: { control: 'text' },
    name: { control: 'text' },
    size: { control: 'inline-radio', options: ['xs', 'sm', 'md', 'lg'] },
    kind: { control: 'inline-radio', options: ['agent', 'human'] },
    tone: { control: 'inline-radio', options: ['neutral', 'seeded'] },
    ring: { control: 'inline-radio', options: [undefined, 'brand'] },
    status: { control: 'inline-radio', options: [undefined, 'working', 'needs', 'stopped'] },
    decorative: { control: 'boolean' },
    colorSeed: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof Avatar>;

const row: CSSProperties = { display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' };
const caption: CSSProperties = { textAlign: 'center', fontSize: 12, color: 'var(--color-text-tertiary)' };
const CREW = [
  'Software Engineer',
  'Chief Technology',
  'Product Manager',
  'AI Systems',
  'Frontend Engineer',
  'Developer Relations',
  'Chief Executive',
];

export const WithImage: Story = {
  args: { src: samplePortrait, name: 'Carlos Diaz', size: 'lg' },
};

export const InitialsOnly: Story = {};

/**
 * ONE SHAPE FOR PEOPLE AND AGENTS: a rounded square whose corner is two ninths
 * of the side, between the xs and lg radius steps, so a row of people and
 * agents lines up on one square. The face's contents say who it is: an
 * agent's initials are set in the mono face, the way a handle is written, a
 * person's in the sans face, and an agent may be drawn as its character. Its
 * outline is the hairline step.
 */
export const Kinds: Story = {
  render: () => (
    <div style={row}>
      {(['agent', 'human'] as const).map((kind) => {
        const name = kind === 'agent' ? 'Software Engineer' : 'Jane Founder';
        return (
          <div key={kind} style={{ ...row, gap: 12 }}>
            <Avatar name={name} kind={kind} size="lg" />
            <Avatar src={samplePortrait} name={name} kind={kind} size="lg" />
            <span style={caption}>{kind}</span>
          </div>
        );
      })}
    </div>
  ),
};

/**
 * A CONVERSATION'S GUTTER: people and agents at 36px, one above the other, as
 * a message list draws them. One shape lines every face up on the same square
 * whoever it is, and the status badge sits where a reader looks for presence.
 */
export const MixedRow: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 12, padding: 16, background: 'var(--color-surface-background)' }}>
      <div style={{ ...row, gap: 12 }}>
        <Avatar name="Jane Founder" kind="human" size={36} />
        <span style={caption}>a person</span>
      </div>
      <div style={{ ...row, gap: 12 }}>
        <Avatar name="Software Engineer" character="gemlet" hue="cyan" size={36} status="working" />
        <span style={caption}>an agent at work</span>
      </div>
      <div style={{ ...row, gap: 12 }}>
        <Avatar src={samplePortrait} name="Miles Okafor" kind="human" size={36} />
        <span style={caption}>a person&apos;s picture</span>
      </div>
      <div style={{ ...row, gap: 12 }}>
        <Avatar name="Site Reliability" size={36} status="needs" />
        <span style={caption}>an agent waiting on somebody</span>
      </div>
    </div>
  ),
};

/**
 * Half the names this draws are handles, so the initials split on hyphen,
 * underscore and dot as well as on whitespace: `backend-engineer` is BE, not
 * a column of Bs.
 */
export const Handles: Story = {
  render: () => (
    <div style={row}>
      {['Carlos Diaz', 'backend-engineer', 'sre_lead', 'carlos.diaz', 'Acme'].map((name) => (
        <div key={name} style={{ textAlign: 'center', fontSize: 12 }}>
          <Avatar name={name} size="lg" />
          <div style={{ marginTop: 4 }}>{name}</div>
        </div>
      ))}
    </div>
  ),
};

/**
 * An agent's initials skip its leading "agent" word, which the badge already
 * says: Agent CEO, Agent CTO and Agent PM are CE, CT and PM rather than AC, AC
 * and AP. The accessible name keeps the whole name, and a person called Agent
 * Smith keeps the word, because it is their name.
 */
export const AgentNames: Story = {
  render: () => (
    <div style={row}>
      {[
        { name: 'Agent CEO', kind: 'agent' as const },
        { name: 'Agent CTO', kind: 'agent' as const },
        { name: 'Agent PM', kind: 'agent' as const },
        { name: 'Agent Smith', kind: 'human' as const },
      ].map(({ name, kind }) => (
        <div key={name} style={{ textAlign: 'center', fontSize: 12 }}>
          <Avatar name={name} kind={kind} size="lg" />
          <div style={{ marginTop: 4 }}>{name}</div>
        </div>
      ))}
    </div>
  ),
};

/**
 * A glyph for a face, for a principal whose initials would mean nothing: an
 * API token named `token:reader` drew TO, as if it were somebody.
 */
export const GlyphFace: Story = {
  render: () => (
    <div style={row}>
      <Avatar name="token:reader" kind="human" size="lg" icon={<KeyGlyph size="sm" />} />
      <Avatar name="ci-deployer" kind="human" size="md" icon={<BotGlyph size="sm" />} />
      <Avatar name="token:reader" kind="human" size="sm" icon={<KeyGlyph size="sm" />} />
    </div>
  ),
};

/**
 * A mark on the corner says HOW a principal is present, where a status says
 * what an agent is doing. A seat's badge acting through an API token keeps
 * its own face, its initials, and wears a key there, so "Miles" reads as
 * Miles and the credential is still shown. It is drawn quiet, in the neutral
 * badge's raised fill, and a status wins over it on the one corner.
 */
export const Mark: Story = {
  render: () => (
    <div style={row}>
      {(['lg', 'md', 'sm'] as const).map((size) => (
        <Avatar
          key={size}
          name="Miles"
          kind="human"
          size={size}
          mark={<KeyGlyph size="xs" />}
          markLabel="signed in with an API token"
        />
      ))}
      <Avatar name="Agent PM" size="md" status="working" mark={<KeyGlyph size="xs" />} />
    </div>
  ),
};

/**
 * The corner moves with the box, at two ninths of it (8px on a 36px face), as
 * one proportion a numeric size follows too, and is held between the xs radius
 * (4px) on the smallest faces and the lg radius (12px) on the largest.
 */
export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 16 }}>
      {(['agent', 'human'] as const).map((kind) => {
        const name = kind === 'agent' ? 'Software Engineer' : 'Jane Founder';
        return (
          <div key={kind} style={row}>
            {(['xs', 'sm', 'md', 'lg'] as const).map((size) => (
              <Avatar key={size} name={name} kind={kind} size={size} />
            ))}
            <Avatar name={name} kind={kind} size={64} />
            <Avatar src={samplePortrait} name={name} kind={kind} size={96} />
          </div>
        );
      })}
    </div>
  ),
};

/**
 * THE STATUS: what an agent is doing, as a small badge on the lower-right
 * corner whose shape says it (play, a question, a square) on the state's fill.
 * The notch is cut out of the face, so the badge reads on the sheet and on a
 * card alike. An idle badge has none. Say the state in words beside the badge
 * as well; the glyph is what a badge drawn alone carries.
 */
export const Status: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 16 }}>
      {['var(--color-surface-background)', 'var(--color-surface-subtle)'].map((ground) => (
        <div key={ground} style={{ ...row, gap: 24, padding: 16, background: ground, borderRadius: 12 }}>
          {[undefined, ...AVATAR_STATUSES].map((status) => (
            <div key={status ?? 'idle'} style={{ display: 'grid', justifyItems: 'center', gap: 8 }}>
              <div style={{ ...row, gap: 12 }}>
                <Avatar name="Software Engineer" character="gemlet" hue="cyan" status={status} />
                <Avatar name="Software Engineer" status={status} />
                <Avatar name="Jane Founder" kind="human" status={status} />
              </div>
              <span style={caption}>{status ?? 'idle'}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  ),
};

/**
 * Every status at every size: the badge is 0.25 of the face and hangs 0.04 of
 * it past the corner (a 10px badge under 2px out on a 40px face), and it never
 * drops under 8px, the smallest its glyph still reads as a shape.
 */
export const StatusSizes: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 16, padding: 16, background: 'var(--color-surface-subtle)', borderRadius: 12 }}>
      {AVATAR_STATUSES.map((status) => (
        <div key={status} style={{ ...row, gap: 20 }}>
          {(['xs', 'sm', 'md', 'lg'] as const).map((size) => (
            <Avatar key={size} name="Product Manager" character="crewlet" hue="rose" size={size} status={status} />
          ))}
          <Avatar name="Product Manager" character="crewlet" hue="rose" size={64} status={status} />
          <span style={caption}>{status}</span>
        </div>
      ))}
    </div>
  ),
};

/**
 * THE SELECTED RING: a 1.5px line 2px outside the badge, in the accent. It is
 * the one ring there is; a state is a status, never a ring.
 */
export const Selected: Story = {
  render: () => (
    <div style={{ ...row, gap: 24, padding: 16 }}>
      <Avatar name="Software Engineer" ring="brand" />
      <Avatar name="Jane Founder" kind="human" ring="brand" />
      <Avatar name="Software Engineer" character="gemlet" hue="cyan" ring="brand" />
    </div>
  ),
};

/**
 * NEUTRAL BY DEFAULT. A hash of a name carries no information: rename the seat
 * and its colour changes, which is the proof it never meant anything. Identity
 * is the outline, the monogram and the name beside it. A badge is never filled
 * with the accent; a selected one takes `ring="brand"`.
 */
export const Tones: Story = {
  render: () => (
    <div style={row}>
      <Avatar name="Carlos Diaz" size="lg" tone="neutral" />
      <Avatar name="Carlos Diaz" size="lg" tone="seeded" colorSeed="ceo" />
      <Avatar name="Carlos Diaz" size="lg" ring="brand" />
    </div>
  ),
};

/** The one case a stable per-identity tint earns its place: a roster somebody scans. */
export const IdentityTints: Story = {
  render: () => (
    <div style={row}>
      {['support-bot', 'deploy-bot', 'qa-runner', 'triage-bot', 'oncall-bot', 'docs-bot'].map((key) => (
        <div key={key} style={{ textAlign: 'center', fontSize: 12 }}>
          <Avatar name={key} tone="seeded" colorSeed={key} size="lg" />
          <div style={{ marginTop: 4 }}>{key}</div>
        </div>
      ))}
    </div>
  ),
};

/**
 * SEVERAL BADGES AS ONE MARK, each overlapping the one before it by 6px and
 * cut out of it by a 2px ring of the ground, which is the sheet by default:
 * every stack the approved design draws stands on it, in a page's top bar and
 * in a task's side column. Past `max` (four by default) the rest are counted
 * in a pill, which is a number rather than somebody. The ring is the only edge
 * a stacked face draws: its own hairline would frame it inside the ring. A
 * screen reader hears one
 * image: "2 agents and 1 person: Jane Founder, Chief Technology, Software
 * Engineer".
 */
/**
 * An agent drawn as the Crewlet character an operator chose for it, in its
 * hue: every character, through the six hues in turn. A badge of 56px and up
 * draws the character's keyline and visor gap; a smaller one draws it compact.
 */
export const Characters: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 24 }}>
      {([96, 'lg', 'sm'] as const).map((size) => (
        <div key={size} style={row}>
          {CREWLET_CHARACTERS.map((character, i) => (
            <Avatar
              key={character}
              name={character}
              character={character}
              hue={NODE_HUES[i % NODE_HUES.length]}
              size={size}
            />
          ))}
        </div>
      ))}
    </div>
  ),
};

export const Stack: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 16, padding: 16, background: 'var(--color-surface-background)' }}>
      <div style={row}>
        <AvatarStack members={CREW.slice(0, 4).map((name) => ({ name }))} />
        <span style={caption}>four agents</span>
      </div>
      <div style={row}>
        <AvatarStack
          members={[
            { name: 'Jane Founder', kind: 'human' },
            { name: 'Chief Technology', character: 'hexlet', hue: 'amber' },
            { name: 'Software Engineer', character: 'gemlet', hue: 'cyan' },
          ]}
        />
        <span style={caption}>a person and two agents</span>
      </div>
      <div style={row}>
        <AvatarStack members={CREW.map((name) => ({ name }))} />
        <span style={caption}>seven: four drawn, the rest counted</span>
      </div>
      <div style={row}>
        <AvatarStack
          members={[
            { name: 'Jane Founder', kind: 'human', src: samplePortrait },
            { name: 'Software Engineer' },
            { name: 'Chief Technology' },
          ]}
          size="md"
        />
        <span style={caption}>at the md step; a picture takes the same corner</span>
      </div>
    </div>
  ),
};

/**
 * THE GROUND IS A VARIABLE, because the cut-out has to be the colour of what
 * the stack stands on. On a card, set `--crewlet-avatar-stack-ground` on the
 * stack to the card's rung; left at the sheet, every badge wears a band of the
 * wrong grey.
 */
export const StackOnACard: Story = {
  render: () => (
    <Card>
      <Card.Body>
        <AvatarStack
          members={CREW.slice(0, 4).map((name) => ({ name }))}
          style={{ ['--crewlet-avatar-stack-ground' as string]: 'var(--color-surface-subtle)' } as CSSProperties}
        />
      </Card.Body>
    </Card>
  ),
};
