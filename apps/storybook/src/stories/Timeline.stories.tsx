import type { Meta, StoryObj } from '@storybook/react-vite';
import type { CrewletCharacterId } from '@crewlethq/icons/characters';
import { BanGlyph, KeyGlyph, PlusGlyph, ShieldCheckGlyph } from '@crewlethq/icons/glyphs';
import {
  Avatar,
  Disclosure,
  NODE_HUES,
  NODE_HUE_NAMES,
  Prose,
  Text,
  Timeline,
  type NodeHue,
  type TimelineProps,
} from '@crewlethq/ui';
import { themeScope } from '../themeScope';

const meta: Meta<typeof Timeline> = {
  title: 'UI/Timeline',
  component: Timeline,
  args: { itemLabel: 'Round', alternating: true },
  argTypes: {
    alternating: { control: 'boolean' },
    hue: { control: 'select', options: [undefined, ...NODE_HUES] },
    density: { control: 'inline-radio', options: ['comfortable', 'compact'] },
  },
};

export default meta;
type Story = StoryObj<typeof Timeline>;

/**
 * The round ledger of a turn. Each item carries its own bracket, so a ledger
 * of ONE round is delimited too, and appending a round changes nothing about
 * the rounds already drawn.
 */
export const ARoundLedger: Story = {
  render: (args) => (
    <div style={{ maxWidth: 560 }}>
      <Timeline {...args}>
        <Timeline.Item>
          <Prose tone="muted">I need the company document before I can answer this.</Prose>
          <Disclosure title="read_config" mono size="compact" headingLevel="none">
            <Text variant="caption">Returned 4.1 KB.</Text>
          </Disclosure>
        </Timeline.Item>
        <Timeline.Item state="danger">
          <Prose tone="muted">The unit lead is the CTO, so the brief goes there.</Prose>
          <Disclosure title="publish_event" mono size="compact" headingLevel="none">
            <Text variant="caption">Refused: the stream was not reachable.</Text>
          </Disclosure>
        </Timeline.Item>
        <Timeline.Item state="active">
          <Prose streaming>Retrying the publish</Prose>
        </Timeline.Item>
      </Timeline>
    </div>
  ),
};

/** One step still gets its bracket, which is the case that used to get none. */
export const ASingleStep: Story = {
  render: (args) => (
    <div style={{ maxWidth: 560 }}>
      <Timeline {...args}>
        <Timeline.Item>
          <Prose>The answer was already in the brief, so nothing was called.</Prose>
        </Timeline.Item>
      </Timeline>
    </div>
  ),
};

/** The character each hue's agent is drawn as in the stories below. */
const FACES: Readonly<Record<NodeHue, CrewletCharacterId>> = {
  purple: 'crewlet',
  cyan: 'gemlet',
  green: 'hexlet',
  amber: 'peaklet',
  rose: 'prismlet',
  blue: 'towerlet',
};

/**
 * What a sync does for one agent, as a review dialog lists it: a glyph per
 * kind of action, and a danger node on the step that takes access away.
 */
function Plan(props: TimelineProps & { vendor: string }) {
  const { vendor, ...rest } = props;
  return (
    <Timeline itemLabel="Step" aria-label={`What the next sync does at ${vendor}`} {...rest}>
      <Timeline.Item marker={<PlusGlyph size="xs" aria-hidden />}>
        <Text>Create the application</Text>
      </Timeline.Item>
      <Timeline.Item marker={<ShieldCheckGlyph size="xs" aria-hidden />}>
        <Text>Grant it read access to 2 projects</Text>
        <Text variant="caption" tone="secondary">
          The level each project already has is kept.
        </Text>
      </Timeline.Item>
      <Timeline.Item marker={<KeyGlyph size="xs" aria-hidden />}>
        <Text>Mint an API key and seal it</Text>
      </Timeline.Item>
      <Timeline.Item state="danger" marker={<BanGlyph size="xs" aria-hidden />}>
        <Text>Revoke the key it held before</Text>
      </Timeline.Item>
    </Timeline>
  );
}

/**
 * COMPACT, IN AN AGENT'S HUE: the steps a review dialog lists before somebody
 * saves. Each default node takes the agent's own colour, the one its avatar
 * wears, and the step that takes access away keeps the danger node. Pick a hue
 * and a density from the controls.
 */
export const AnAgentsPlan: Story = {
  args: { itemLabel: 'Step', hue: 'cyan', density: 'compact', alternating: false },
  render: (args) => (
    <div style={{ display: 'grid', gap: 'var(--spacing-3)', maxWidth: 420 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
        <Avatar name="Software Engineer" character="gemlet" hue={args.hue} size="lg" decorative />
        <Text variant="heading">Software Engineer</Text>
      </div>
      <Plan {...args} vendor="Scaleway" />
    </div>
  ),
};

/**
 * EVERY HUE, IN BOTH PALETTES. One compact plan per agent hue, light over
 * dark, each beside the face drawn in the same hue. Each panel is painted by
 * `themeScope`, since the theme layer paints on the root alone.
 */
export const EveryHueInBothThemes: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--spacing-5)', padding: 'var(--spacing-5)' }}>
      {(['light', 'dark'] as const).map((theme) => (
        <section
          key={theme}
          aria-label={theme === 'light' ? 'Light palette' : 'Dark palette'}
          style={{
            ...themeScope(theme),
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 'var(--spacing-5)',
            padding: 'var(--spacing-5)',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--color-surface-background)',
            color: 'var(--color-text-primary)',
          }}
        >
          {NODE_HUES.map((hue) => (
            <div key={hue} style={{ display: 'grid', gap: 'var(--spacing-3)', alignContent: 'start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
                <Avatar name={`${NODE_HUE_NAMES[hue]} agent`} character={FACES[hue]} hue={hue} size="md" decorative />
                <Text>{NODE_HUE_NAMES[hue]} agent</Text>
              </div>
              <Plan hue={hue} density="compact" vendor="Scaleway" />
            </div>
          ))}
        </section>
      ))}
    </div>
  ),
};
