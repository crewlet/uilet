import type { Meta, StoryObj } from '@storybook/react-vite';
import { AttentionList, Button, ButtonLink, Card, Text, type AttentionItem } from '@crewlethq/ui';
import { VendorMark } from '@crewlethq/icons';
import { ExternalLinkGlyph, ServerGlyph } from '@crewlethq/icons/glyphs';
import { themeScope } from '../themeScope';

/**
 * What needs a person, as one quiet panel of rows instead of a banner each:
 * the tone's glyph, the subject's mark, a one-line title over a quieter line,
 * the fix in the page's own button, and the recorded words under Details.
 * Problems first. Past a few rows the rest fold behind "Show N more".
 *
 * The panel is a card like the page's others, with no tinted strip or frame:
 * the header counts each tone with its glyph, small and quiet.
 *
 * Every row stands on the list's own columns: each Details and each fix line
 * up down the panel whatever their widths, every title starts on one line
 * whether or not its row has a mark, and a body opens on the title's line.
 */
const meta: Meta<typeof AttentionList> = {
  title: 'UI/AttentionList',
  component: AttentionList,
  decorators: [(Story) => <div style={{ maxWidth: 960 }}>{Story()}</div>],
};

export default meta;
type Story = StoryObj<typeof AttentionList>;

const ITEMS: AttentionItem[] = [
  {
    key: 'drift',
    tone: 'warning',
    media: <VendorMark vendor="github" size="xl" />,
    title: 'GitHub: 3 tools changed since you approved them',
    meta: 'One now claims to be less risky. Each asks first until reviewed.',
    action: (
      <Button size="small" variant="secondary">
        Review
      </Button>
    ),
    details: 'create_pull_request: description. merge_pull_request: arguments. push_files: hints.',
  },
  {
    key: 'partial',
    tone: 'danger',
    media: <VendorMark vendor="github" size="xl" />,
    title: 'GitHub is not running for SRE',
    meta: 'Its app’s new permissions wait for approval at GitHub',
    action: (
      <ButtonLink size="small" variant="secondary" href="#" trailingIcon={<ExternalLinkGlyph size="sm" />}>
        Approve at GitHub
      </ButtonLink>
    ),
    details: '422 Unprocessable Entity: The permissions requested are not granted to this installation.',
  },
  {
    key: 'expiring',
    tone: 'warning',
    media: <VendorMark vendor="notion" size="xl" />,
    title: 'Notion’s sign-in expires in 5 days',
    meta: 'No refresh token was given',
    action: (
      <Button size="small" variant="secondary">
        Re-authorize
      </Button>
    ),
  },
];

/** Three rows: the problem first, then the warnings. */
export const Default: Story = { args: { items: ITEMS } };

/** Many rows fold to the first few and a summary. */
export const Folded: Story = {
  args: {
    collapseAfter: 2,
    items: [
      ...ITEMS,
      { key: 'linear', tone: 'info', media: <VendorMark vendor="linear" size="xl" />, title: 'Linear needs a sign-in', meta: 'Its tools are listed once somebody signs in' },
      { key: 'sentry', tone: 'danger', media: <VendorMark vendor="sentry" size="xl" />, title: 'Sentry refused its token', meta: '401 after sending Sentry-Bearer' },
    ],
  },
};

/** Beside the page's other cards: the panel sits at their weight, whatever its rows say. */
export const BesideCards: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--spacing-4)' }}>
      <AttentionList items={ITEMS} />
      <Card padding="none">
        <Card.Header icon={<ServerGlyph size="sm" />}>
          <Card.Title>Servers</Card.Title>
        </Card.Header>
        <Card.Body>
          <Text as="p" variant="body" tone="secondary">
            The table the alarms are about.
          </Text>
        </Card.Body>
      </Card>
    </div>
  ),
};

/**
 * Fixes of four widths, rows with and without a mark, one with no Details:
 * the Details stand in one column, the fixes end on one edge, and every title
 * starts on one line. Open a row's Details: its body starts on the title's
 * line.
 */
export const MixedRows: Story = {
  args: {
    collapseAfter: 6,
    items: [
      ITEMS[1]!,
      ITEMS[0]!,
      {
        key: 'status',
        tone: 'warning',
        title: 'status-page answers slowly',
        meta: 'Its last three calls took over 20 seconds',
        action: (
          <Button size="small" variant="secondary">
            Test
          </Button>
        ),
        details: 'Timed out after 20 s on node-0.',
      },
      {
        key: 'search',
        tone: 'info',
        media: <VendorMark vendor="linear" size="xl" />,
        title: 'Linear needs a sign-in',
        meta: 'Its tools are listed once somebody signs in',
        action: (
          <Button size="small" variant="secondary">
            Sign in
          </Button>
        ),
      },
    ],
  },
};

/** At a phone's width: no mark, the title wraps with its glyph on the first line, Details and the fix on a line of their own. */
export const Phone: Story = {
  globals: { viewport: { value: 'mobile1' } },
  args: { items: ITEMS },
};

/** The words are the caller's: the heading, each tone's spoken name, the counts, Details and the fold. */
export const Labels: Story = {
  args: {
    items: ITEMS,
    collapseAfter: 1,
    headingLevel: 2,
    labels: {
      title: 'À traiter',
      tones: { danger: 'Problème', warning: 'Avertissement', info: 'Remarque' },
      details: 'Détails',
      more: (hidden) => `Afficher ${hidden} de plus`,
      less: 'Afficher moins',
      summary: (c) => `${c.danger} problème, ${c.warning} avertissements`,
    },
  },
};

/** Nothing needs attention: the list draws nothing at all, so the page shows only its own content. */
export const Empty: Story = { args: { items: [] } };

/** One row, as a page shows the one review it owes. */
export const OneRow: Story = { args: { items: [ITEMS[0]!] } };

/** Both themes. */
export const BothThemes: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--spacing-5)' }}>
      {(['light', 'dark'] as const).map((theme) => (
        <div key={theme} style={{ ...themeScope(theme), padding: 'var(--spacing-4)', background: 'var(--color-surface-background)' }}>
          <AttentionList items={ITEMS} />
        </div>
      ))}
    </div>
  ),
};
