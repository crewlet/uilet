import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ChoiceCards, ChoiceList, type ChoiceCardOption, type ChoiceCardsDensity, type ChoiceCardsMinWidth } from '@crewlethq/ui';
import { VendorMark } from '@crewlethq/icons';
import { GlobeGlyph, PackageGlyph, ServerGlyph, SquareTerminalGlyph } from '@crewlethq/icons/glyphs';
import { themeScope } from '../themeScope';

/**
 * Choices a person compares, as cards of the same lines: a picture, the
 * choice's name and its tag; one line of description; and a few facts, one to
 * a line. Cards side by side share every line, so their facts stand level. A
 * disabled card says why and what fixes it, on its last line or in place of a
 * fact's value. Native radios, so the arrow keys move the choice.
 */
const meta: Meta<typeof ChoiceCards> = {
  title: 'UI/ChoiceCards',
  component: ChoiceCards,
  // A form's column by default. A story that stands cards side by side sets `frameWidth`: a width decorator of its own is drawn inside this frame and cannot widen it.
  decorators: [(Story, { parameters }) => <div style={{ maxWidth: parameters.frameWidth ?? 640 }}>{Story()}</div>],
};

export default meta;
type Story = StoryObj<typeof ChoiceCards>;

const PLACES: ChoiceCardOption[] = [
  {
    value: 'direct',
    label: 'On this engine’s host',
    media: <ServerGlyph size="xl" />,
    description: 'Runs beside the engine.',
    facts: [
      { label: 'Needs', value: 'Nothing more needed', tone: 'success' },
      { label: 'Isolation', value: 'Shares the host' },
    ],
  },
  {
    value: 'container',
    label: 'In a container',
    tag: 'Company default',
    media: <PackageGlyph size="xl" />,
    description: 'A fresh container for each run.',
    facts: [
      { label: 'Needs', value: 'Docker 24.0.7 found', tone: 'success' },
      { label: 'Isolation', value: 'Own filesystem and network' },
    ],
  },
  {
    value: 'e2b',
    label: 'In E2B',
    media: <GlobeGlyph size="xl" />,
    description: 'A cloud sandbox, off the host.',
    facts: [
      { label: 'Needs', value: 'E2B key not set', tone: 'warning' },
      { label: 'Isolation', value: 'A separate machine' },
    ],
    disabled: true,
    disabledReason: 'E2B key not set. Add E2B_API_KEY under Settings, Secrets.',
    // The reason takes the Needs line's value, so the card keeps the lines of the cards beside it.
    disabledReasonAt: 0,
  },
];

const CLIS: ChoiceCardOption[] = [
  {
    value: 'claude-code',
    label: 'Claude Code',
    media: <VendorMark vendor="claude" size={24} />,
    description: 'Anthropic’s coding CLI.',
    facts: [
      { label: 'Runs', value: 'Every job' },
      { label: 'Method', value: 'Key, token, login or cloud' },
    ],
  },
  {
    value: 'codex',
    label: 'Codex',
    // No mark of OpenAI's ships here, so Codex is drawn with the terminal glyph, as any CLI without one is.
    media: <SquareTerminalGlyph size="xl" />,
    description: 'OpenAI’s coding CLI.',
    facts: [
      { label: 'Runs', value: 'Every job but coding' },
      { label: 'Method', value: 'API key or ChatGPT' },
    ],
  },
  {
    value: 'opencode',
    label: 'OpenCode',
    media: <VendorMark vendor="opencode" size={24} />,
    description: 'Open CLI for many providers.',
    facts: [
      { label: 'Runs', value: 'Every job' },
      { label: 'Method', value: 'The provider’s API key' },
    ],
  },
];

function Chooser({
  options,
  initial,
  minCardWidth,
  density,
}: {
  options: ChoiceCardOption[];
  initial: string;
  minCardWidth?: ChoiceCardsMinWidth;
  density?: ChoiceCardsDensity;
}) {
  const [value, setValue] = useState<string | null>(initial);
  return (
    <ChoiceCards
      label="Choose one"
      options={options}
      value={value}
      onChange={setValue}
      minCardWidth={minCardWidth}
      density={density}
    />
  );
}

/** Three places, the company default tagged, one unavailable: its Needs line says why, read with its radio, and it keeps the same lines as the others. */
export const WhereItRuns: Story = { render: () => <Chooser options={PLACES} initial="container" /> };

/** Three coding CLIs, each named by its vendor's mark, the same three lines in every card. */
export const CodingClis: Story = { render: () => <Chooser options={CLIS} initial="claude-code" /> };

/**
 * Side by side on a wider surface: every card spans the same rows, so a
 * description that wraps in one card moves the facts of all three alike.
 */
export const SideBySide: Story = {
  parameters: { frameWidth: 1080 },
  render: () => (
    <Chooser
      initial="claude-code"
      options={CLIS.map((o) =>
        o.value === 'opencode' ? { ...o, description: 'An open CLI that runs models from many providers, chosen per model.' } : o,
      )}
    />
  ),
};

/**
 * The three places side by side, one unavailable: every card the same lines
 * and the same height, the unavailable one's reason on its Needs line.
 */
export const PlacesSideBySide: Story = {
  parameters: { frameWidth: 1080 },
  render: () => <Chooser options={PLACES} initial="container" />,
};

/**
 * COMPACT, THREE ACROSS A FORM'S WIDE COLUMN: `minCardWidth="sm"` (15rem) and
 * `density="compact"`. Less padding, smaller gaps and the small picture, with
 * every line kept: the description, each fact, and the unavailable card's
 * whole reason on its Needs line. Narrower than three cards, they wrap; at a
 * phone's width they stack one to a row.
 */
export const CompactThreeAcross: Story = {
  parameters: { frameWidth: 800 },
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--spacing-5)' }}>
      <Chooser options={CLIS} initial="claude-code" minCardWidth="sm" density="compact" />
      <Chooser options={PLACES} initial="container" minCardWidth="sm" density="compact" />
    </div>
  ),
};

/**
 * Compact in both themes, one card unavailable: the reason reads whole, in
 * the same ink as at the comfortable density.
 */
export const CompactBothThemes: Story = {
  parameters: { frameWidth: 1680 },
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--spacing-5)', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
      {(['light', 'dark'] as const).map((theme) => (
        <div key={theme} style={{ ...themeScope(theme), padding: 'var(--spacing-4)', background: 'var(--color-surface-background)' }}>
          <Chooser options={PLACES} initial="container" minCardWidth="sm" density="compact" />
        </div>
      ))}
    </div>
  ),
};

/** Words only: a name and one line of description, no picture and no facts. */
export const Simple: Story = {
  render: () => (
    <Chooser
      initial="all"
      options={[
        { value: 'all', label: 'Everything', description: 'Use this model for every job.' },
        { value: 'coding', label: 'Coding', description: 'The seat’s own work.' },
        { value: 'none', label: 'Not yet', description: 'Set it up now, assign it later.' },
      ]}
    />
  ),
};

/**
 * A card that cannot be chosen beside two that can, in both themes: it stands
 * on the page's own ground with a quiet radio and a muted picture, never
 * raised like the cards that can be chosen, and its words stay legible.
 */
export const DisabledBesideEnabled: Story = {
  parameters: { frameWidth: 1320 },
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--spacing-5)', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
      {(['light', 'dark'] as const).map((theme) => (
        <div key={theme} style={{ ...themeScope(theme), padding: 'var(--spacing-4)', background: 'var(--color-surface-background)' }}>
          <Chooser options={PLACES} initial="container" />
        </div>
      ))}
    </div>
  ),
};

/**
 * A chosen card that opens a narrower choice of its own: OAuth sign-in opens
 * which client it signs in as, joined to the card under the row. The other
 * cards open nothing, so choosing them closes it.
 */
export const DetailUnderTheChosenCard: Story = {
  render: function Render() {
    const [client, setClient] = useState('cimd');
    return (
      <Chooser
        initial="oauth"
        minCardWidth="xs"
        density="compact"
        options={[
          {
            value: 'oauth',
            label: 'OAuth',
            media: <GlobeGlyph size="lg" />,
            description: 'Sign in once at the vendor.',
            detail: (
              <ChoiceCards
                label="OAuth client"
                minCardWidth="xs"
                density="compact"
                value={client}
                onChange={setClient}
                options={[
                  { value: 'cimd', label: 'Published identity', tag: 'Recommended', description: 'No registration.' },
                  { value: 'dcr', label: 'Register automatically', description: 'Registered on first use.' },
                  { value: 'own', label: 'Your own client', description: 'A client ID and secret.' },
                ]}
              />
            ),
          },
          { value: 'headers', label: 'Header', media: <ServerGlyph size="lg" />, description: 'A token or key.' },
          { value: 'none', label: 'None', media: <SquareTerminalGlyph size="lg" />, description: 'No sign-in.' },
        ]}
      />
    );
  },
};

/**
 * Four methods two to a row, the first one chosen: its detail opens straight
 * under its own row, before the second row of cards, and draws no frame
 * round the framed list it holds. One card's tag says a state in its own pill.
 */
export const DetailUnderItsOwnRow: Story = {
  render: function Render() {
    const [client, setClient] = useState('cimd');
    return (
      <div style={{ maxWidth: 640 }}>
        <Chooser
          initial="oauth"
          minCardWidth="sm"
          density="compact"
          options={[
            {
              value: 'oauth',
              label: 'OAuth',
              media: <GlobeGlyph size="lg" />,
              description: 'Sign in once at the vendor.',
              detail: (
                <ChoiceList
                  label="OAuth client"
                  value={client}
                  onChange={setClient}
                  options={[
                    { value: 'cimd', label: 'Published identity', detail: 'No registration at the vendor.', tag: 'Recommended' },
                    { value: 'dcr', label: 'Register automatically', detail: 'A client is created on first sign-in.' },
                  ]}
                />
              ),
            },
            { value: 'headers', label: 'Header', media: <ServerGlyph size="lg" />, description: 'A token or key.' },
            {
              value: 'community',
              label: 'From the community',
              media: <SquareTerminalGlyph size="lg" />,
              description: 'Listed by its author.',
              tag: 'Not reviewed',
              tagTone: 'warning',
            },
            { value: 'none', label: 'None', media: <SquareTerminalGlyph size="lg" />, description: 'No sign-in.' },
          ]}
        />
      </div>
    );
  },
};

/** A tag that says a state, in each feedback tone, drawn in the card's own pill; without a tone, the neutral pill. */
export const TagTones: Story = {
  render: () => (
    <Chooser
      initial="neutral"
      minCardWidth="xs"
      density="compact"
      options={[
        { value: 'neutral', label: 'Default', tag: 'Company default', description: 'No tone.' },
        { value: 'success', label: 'Verified', tag: 'Reviewed', tagTone: 'success', description: 'Checked by an admin.' },
        { value: 'warning', label: 'Community', tag: 'Not reviewed', tagTone: 'warning', description: 'Listed by its author.' },
        { value: 'danger', label: 'Revoked', tag: 'Blocked', tagTone: 'danger', description: 'Turned off by an admin.' },
        { value: 'info', label: 'Preview', tag: 'New', tagTone: 'info', description: 'Added this week.' },
      ]}
    />
  ),
};

/** Four short cards on one row: where a thing comes from, each a picture and one line. */
export const FourAcross: Story = {
  render: () => (
    <Chooser
      initial="catalogue"
      minCardWidth="xs"
      density="compact"
      options={[
        { value: 'catalogue', label: 'Catalogue', media: <PackageGlyph size="lg" />, description: 'Vetted servers.' },
        { value: 'address', label: 'Address', media: <GlobeGlyph size="lg" />, description: 'Any remote URL.' },
        { value: 'json', label: 'JSON', media: <SquareTerminalGlyph size="lg" />, description: 'Paste a config.' },
        { value: 'community', label: 'Community', media: <ServerGlyph size="lg" />, description: 'Not reviewed.' },
      ]}
    />
  ),
};
