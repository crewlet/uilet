import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card, SettingsTable } from '@crewlethq/ui';
import { BellGlyph, GaugeGlyph, NetworkGlyph } from '@crewlethq/icons/glyphs';

const meta: Meta<typeof SettingsTable> = {
  title: 'UI/SettingsTable',
  component: SettingsTable,
  argTypes: { header: { control: 'boolean' } },
};

export default meta;
type Story = StoryObj<typeof SettingsTable>;

/**
 * One group of settings in a card: the name with its document key under it,
 * the value in tabular figures and where it comes from. Only the value that
 * differs from its default carries a mark. The card is `padding="none"`, so
 * the rows' hairlines reach its edges.
 */
export const InACard: Story = {
  args: { header: false },
  render: (args) => (
    <div style={{ maxWidth: 960 }}>
      <Card padding="none">
        <Card.Header icon={<GaugeGlyph size="sm" />}>
          <Card.Title id="turn-guardrails">Guardrails on every turn</Card.Title>
        </Card.Header>
        <SettingsTable {...args} aria-labelledby="turn-guardrails">
          <SettingsTable.Row label="Review rounds per turn" settingKey="turn_engine.max_iterations" source="Default">
            3
          </SettingsTable.Row>
          <SettingsTable.Row
            label="Tool rounds per run"
            settingKey="turn_engine.max_tool_rounds"
            source="Set, default 24"
            changed
          >
            32
          </SettingsTable.Row>
          <SettingsTable.Row
            label="Tool rounds on a first turn"
            settingKey="turn_engine.onboarding_max_tool_rounds"
            source="Default"
          >
            10
          </SettingsTable.Row>
        </SettingsTable>
      </Card>
    </div>
  ),
};

/**
 * TABLES ON ONE PAGE SHARE ONE GRID. The tracks are fractions of the table,
 * so two cards of one width put their values and sources on one line however
 * long either card's names are.
 */
export const OneGridDownAPage: Story = {
  render: () => (
    <div style={{ maxWidth: 960, display: 'grid', gap: 'var(--spacing-4)' }}>
      <Card padding="none">
        <Card.Header icon={<NetworkGlyph size="sm" />}>
          <Card.Title id="delegation">Delegation</Card.Title>
        </Card.Header>
        <SettingsTable aria-labelledby="delegation">
          <SettingsTable.Row label="Workers at once" settingKey="turn_engine.delegation.max_parallel" source="Set, default 3" changed>
            4
          </SettingsTable.Row>
          <SettingsTable.Row
            label="Share of the budget a call may spend"
            settingKey="turn_engine.delegation.budget_fraction"
            source="Default"
          >
            20%
          </SettingsTable.Row>
          <SettingsTable.Row
            label="One call's time limit"
            settingKey="turn_engine.delegation.call_timeout_seconds"
            source="Default"
          >
            15 minutes
          </SettingsTable.Row>
        </SettingsTable>
      </Card>
      <Card padding="none">
        <Card.Header icon={<BellGlyph size="sm" />}>
          <Card.Title id="notifications">Notifications</Card.Title>
        </Card.Header>
        <SettingsTable aria-labelledby="notifications">
          <SettingsTable.Row label="Wake-ups per seat" settingKey="notification_rate_limit" source="Default">
            Off
          </SettingsTable.Row>
          <SettingsTable.Row label="Notices gathered into one wake-up" settingKey="notification_coalesce_max_batch" source="Default">
            20
          </SettingsTable.Row>
        </SettingsTable>
      </Card>
    </div>
  ),
};

/** On its own, outside a card, the table draws the flush panel itself; its header row drawn. */
export const StandingAlone: Story = {
  render: () => (
    <div style={{ maxWidth: 720 }}>
      <SettingsTable aria-label="Retention" header>
        <SettingsTable.Row label="Events kept" settingKey="stream.max_age" source="Default">
          30 days
        </SettingsTable.Row>
        <SettingsTable.Row label="Spend history kept" settingKey="spend.history" source="Set, default 90 days" changed>
          181 days
        </SettingsTable.Row>
      </SettingsTable>
    </div>
  ),
};

/** Narrow: the name takes the first line and the value and source share the second. */
export const Narrow: Story = {
  render: () => (
    <div style={{ width: 340 }}>
      <Card padding="none">
        <Card.Header icon={<GaugeGlyph size="sm" />}>
          <Card.Title id="narrow-turn">Guardrails on every turn</Card.Title>
        </Card.Header>
        <SettingsTable aria-labelledby="narrow-turn">
          <SettingsTable.Row label="Review rounds per turn" settingKey="turn_engine.max_iterations" source="Default">
            3
          </SettingsTable.Row>
          <SettingsTable.Row
            label="A scheduled turn, unless its schedule says otherwise"
            settingKey="schedules.timeout_seconds"
            source="Set, default 3 minutes"
            changed
          >
            5 minutes
          </SettingsTable.Row>
        </SettingsTable>
      </Card>
    </div>
  ),
};
