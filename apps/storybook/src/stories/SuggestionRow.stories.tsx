import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  BookOpenGlyph,
  BotGlyph,
  CoinsGlyph,
  GaugeGlyph,
  MessageCircleQuestionMarkGlyph,
  PackageGlyph,
  PauseGlyph,
  SquareTerminalGlyph,
  TriangleAlertGlyph,
} from '@crewlethq/icons/glyphs';
import { Eyebrow, SuggestionList, SuggestionRow, Tag } from '@crewlethq/ui';

/**
 * Suggested questions and requests, as rows in the list row's grammar: plain
 * for the optional block, divided in a card with a fact, a count and a
 * chevron for what needs the person. A row that ends in an ellipsis fills the
 * message box for the person to finish, and says so.
 */
const meta: Meta<typeof SuggestionRow> = {
  title: 'UI/SuggestionRow',
  component: SuggestionRow,
  decorators: [(Story) => <div style={{ maxWidth: 388 }}>{Story()}</div>],
};

export default meta;
type Story = StoryObj<typeof SuggestionRow>;

const none = () => {};

/** Anywhere in Crewlet: plain rows, no box. */
export const PlainRows: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 8 }}>
      <Eyebrow id="anywhere">Anywhere in Crewlet</Eyebrow>
      <SuggestionList aria-labelledby="anywhere">
        <SuggestionRow icon={<CoinsGlyph />} onSelect={none}>Which agents spent the most tokens this week?</SuggestionRow>
        <SuggestionRow icon={<BotGlyph />} onSelect={none}>What are my agents doing now?</SuggestionRow>
        <SuggestionRow icon={<TriangleAlertGlyph />} onSelect={none}>Which agents failed a turn today?</SuggestionRow>
        <SuggestionRow icon={<PackageGlyph />} onSelect={none}>What shipped this week?</SuggestionRow>
        <SuggestionRow icon={<BookOpenGlyph />} onSelect={none}>Where is the on-call runbook?</SuggestionRow>
        <SuggestionRow icon={<PauseGlyph />} fills onSelect={none}>Pause an agent…</SuggestionRow>
      </SuggestionList>
    </div>
  ),
};

/** Needs you: divided rows in a card, each with its fact, a count and a chevron. */
export const DividedInACard: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 8 }}>
      <Eyebrow id="needs-you">Needs you</Eyebrow>
      <SuggestionList divided aria-labelledby="needs-you">
        <SuggestionRow
          icon={<MessageCircleQuestionMarkGlyph />}
          detail="Agent CTO on ENG-133, Agent PM on PM-37"
          count={<Tag size="sm" variant="warning">2</Tag>}
          chevron
          onSelect={none}
        >
          Decisions waiting on you
        </SuggestionRow>
        <SuggestionRow
          icon={<SquareTerminalGlyph />}
          detail="Agent SWE on ENG-142, for 18 min"
          count={<Tag size="sm" variant="warning">1</Tag>}
          chevron
          onSelect={none}
        >
          A coding run is parked on a question
        </SuggestionRow>
        <SuggestionRow
          icon={<GaugeGlyph />}
          detail="7.8M of 10M tokens, resets Monday"
          count={<Tag size="sm" appearance="outline">78%</Tag>}
          chevron
          onSelect={none}
        >
          Weekly budget is at 78%
        </SuggestionRow>
      </SuggestionList>
    </div>
  ),
};

/** A row that fills the message box: its ellipsis, and ", fills the message box" for assistive technology. */
export const AFillingRow: Story = {
  render: () => (
    <SuggestionList aria-label="Requests">
      <SuggestionRow icon={<PauseGlyph />} fills onSelect={none}>
        Pause an agent…
      </SuggestionRow>
    </SuggestionList>
  ),
};
