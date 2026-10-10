import type { CSSProperties } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { CREWLET_CHARACTERS } from '@crewlethq/icons/characters';
import { Avatar, AvatarStack, Card, NODE_HUES } from '@crewlethq/ui';
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
    ring: { control: 'inline-radio', options: [undefined, 'info', 'warning', 'danger', 'success', 'brand'] },
    decorative: { control: 'boolean' },
    colorSeed: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof Avatar>;

const row: CSSProperties = { display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' };
const caption: CSSProperties = { textAlign: 'center', fontSize: 12, color: 'var(--color-text-tertiary)' };
const RINGS = [undefined, 'info', 'warning', 'danger', 'success', 'brand'] as const;
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
 * AN AGENT IS A SQUIRCLE AND A PERSON A CIRCLE, and that outline is the one
 * thing telling them apart. The agent's initials are set in the mono face, the
 * way a handle is written; a person's in the sans face. A picture keeps its
 * kind's outline.
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
 * The corner moves with the box, at 0.29 of it: the approved design's 7px at
 * 24 and 9px at 30, as one proportion a numeric size follows too. Where the
 * browser draws `corner-shape: squircle` an agent is a whole squircle instead,
 * as deep at the diagonal as that corner.
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
 * THE STATE RING: a 1.5px line 2px outside the badge, in the state's own fill
 * or, for `brand`, the accent, which means SELECTED. The gap is transparent,
 * so the ring reads on the sheet and on a card alike. A ring is never the only
 * carrier of a state: say it in words beside the badge.
 */
export const Rings: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 16 }}>
      {['var(--color-surface-background)', 'var(--color-surface-subtle)'].map((ground) => (
        <div key={ground} style={{ ...row, gap: 24, padding: 16, background: ground, borderRadius: 12 }}>
          {RINGS.map((ring) => (
            <div key={ring ?? 'none'} style={{ display: 'grid', justifyItems: 'center', gap: 8 }}>
              <div style={{ ...row, gap: 12 }}>
                <Avatar name="Software Engineer" ring={ring} />
                <Avatar name="Jane Founder" kind="human" ring={ring} />
              </div>
              <span style={caption}>{ring ?? 'no ring'}</span>
            </div>
          ))}
        </div>
      ))}
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
 * in a pill, which is a number rather than somebody. A screen reader hears one
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
            { name: 'Chief Technology', ring: 'info' },
            { name: 'Software Engineer', ring: 'warning' },
          ]}
        />
        <span style={caption}>a person and two agents, with their state rings</span>
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
        <span style={caption}>at the md step; a picture keeps its kind&apos;s outline</span>
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
