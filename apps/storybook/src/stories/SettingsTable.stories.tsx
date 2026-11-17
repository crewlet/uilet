import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Card, IconButton, NumberField, Popover, SettingForm, SettingsTable } from '@crewlethq/ui';
import { BellGlyph, GaugeGlyph, NetworkGlyph, PencilGlyph } from '@crewlethq/icons/glyphs';

const meta: Meta<typeof SettingsTable> = {
  title: 'UI/SettingsTable',
  component: SettingsTable,
  argTypes: { header: { control: 'boolean' } },
};

export default meta;
type Story = StoryObj<typeof SettingsTable>;

const pencil = (label: string) => <IconButton size="sm" variant="ghost" icon={<PencilGlyph />} label={`Change ${label}`} tooltip />;

/**
 * One group of settings in a card, on DataGrid's anatomy: the card's head with
 * its icon and count, the column heads, rows of DataGrid's height with its
 * hairlines and hover. The pencil ends each row; a value that differs from its
 * default carries a mark and a reset before the pencil, which asks first.
 */
export const InACard: Story = {
  args: { header: true },
  render: (args) => (
    <div style={{ maxWidth: 960 }}>
      <Card padding="none">
        <Card.Header icon={<GaugeGlyph size="sm" />} count={3}>
          <Card.Title id="turn-guardrails">Guardrails on every turn</Card.Title>
        </Card.Header>
        <SettingsTable {...args} aria-labelledby="turn-guardrails">
          <SettingsTable.Row
            label="Review rounds per turn"
            settingKey="turn_engine.max_iterations"
            source="Default"
            actions={pencil('Review rounds per turn')}
          >
            3
          </SettingsTable.Row>
          <SettingsTable.Row
            label="Tool rounds per run"
            settingKey="turn_engine.max_tool_rounds"
            source="Changed from 24"
            changed
            defaultLabel="24"
            onReset={() => undefined}
            actions={pencil('Tool rounds per run')}
          >
            32
          </SettingsTable.Row>
          <SettingsTable.Row
            label="Tool rounds on a first turn"
            settingKey="turn_engine.onboarding_max_tool_rounds"
            source="Default"
            actions={pencil('Tool rounds on a first turn')}
          >
            10
          </SettingsTable.Row>
        </SettingsTable>
      </Card>
    </div>
  ),
};

/**
 * THE PENCIL OPENS THE SETTING'S PANEL: a `SettingForm` holding the kind's
 * control, here a `NumberField` with its steppers, bounds and default.
 */
export const Editing: Story = {
  render: function Editing() {
    const [value, setValue] = useState(32);
    const [open, setOpen] = useState(false);
    const [typed, setTyped] = useState('');
    const n = typed.trim() === '' ? 24 : Number(typed);
    const error = !Number.isInteger(n) ? 'A whole number.' : n < 1 ? 'At least 1.' : n > 200 ? 'At most 200.' : undefined;
    return (
      <div style={{ maxWidth: 960 }}>
        <Card padding="none">
          <Card.Header icon={<GaugeGlyph size="sm" />} count={1}>
            <Card.Title id="editing">Guardrails on every turn</Card.Title>
          </Card.Header>
          <SettingsTable aria-labelledby="editing">
            <SettingsTable.Row
              label="Tool rounds per run"
              settingKey="turn_engine.max_tool_rounds"
              source={value === 24 ? 'Default' : 'Changed from 24'}
              changed={value !== 24}
              defaultLabel="24"
              onReset={() => setValue(24)}
              actions={
                <Popover
                  label="Tool rounds per run"
                  align="end"
                  height="layer"
                  open={open}
                  onOpenChange={(next) => {
                    setTyped(next && value !== 24 ? String(value) : '');
                    setOpen(next);
                  }}
                  trigger={(isOpen, toggle) => (
                    <IconButton
                      size="sm"
                      variant="ghost"
                      icon={<PencilGlyph />}
                      label="Change Tool rounds per run"
                      aria-expanded={isOpen}
                      onClick={toggle}
                    />
                  )}
                >
                  <SettingForm
                    label="Tool rounds per run"
                    htmlFor="rounds"
                    hint="1 to 200"
                    error={error}
                    saveHeld={error ?? (n === value ? 'This is the value already.' : undefined)}
                    onSave={() => {
                      setValue(n);
                      setOpen(false);
                    }}
                    onCancel={() => setOpen(false)}
                  >
                    {(field) => (
                      <NumberField
                        id={field.id}
                        aria-describedby={field.describedBy}
                        focusOnMount
                        value={typed}
                        onValueChange={setTyped}
                        defaultValue={24}
                        min={1}
                        max={200}
                        presets={[
                          { value: '50', label: '50' },
                          { value: '100', label: '100' },
                        ]}
                      />
                    )}
                  </SettingForm>
                </Popover>
              }
            >
              {value}
            </SettingsTable.Row>
          </SettingsTable>
        </Card>
      </div>
    );
  },
};

/**
 * TABLES ON ONE PAGE SHARE ONE GRID. The tracks are fractions of the table and
 * the controls' track a fixed width, so two cards of one width put their
 * values, sources and pencils on one line however long either card's names are.
 */
export const OneGridDownAPage: Story = {
  render: () => (
    <div style={{ maxWidth: 960, display: 'grid', gap: 'var(--spacing-4)' }}>
      <Card padding="none">
        <Card.Header icon={<NetworkGlyph size="sm" />} count={3}>
          <Card.Title id="delegation">Delegation</Card.Title>
        </Card.Header>
        <SettingsTable aria-labelledby="delegation">
          <SettingsTable.Row
            label="Workers at once"
            settingKey="turn_engine.delegation.max_parallel"
            source="Changed from 3"
            changed
            defaultLabel="3"
            onReset={() => undefined}
            actions={pencil('Workers at once')}
          >
            4
          </SettingsTable.Row>
          <SettingsTable.Row
            label="Share of the budget a call may spend"
            settingKey="turn_engine.delegation.budget_fraction"
            source="Default"
            actions={pencil('Share of the budget a call may spend')}
          >
            20%
          </SettingsTable.Row>
          <SettingsTable.Row
            label="One call's time limit"
            settingKey="turn_engine.delegation.call_timeout_seconds"
            source="Default"
            actions={pencil("One call's time limit")}
          >
            15 minutes
          </SettingsTable.Row>
        </SettingsTable>
      </Card>
      <Card padding="none">
        <Card.Header icon={<BellGlyph size="sm" />} count={2}>
          <Card.Title id="notifications">Notifications</Card.Title>
        </Card.Header>
        <SettingsTable aria-labelledby="notifications">
          <SettingsTable.Row
            label="Wake-ups per seat"
            settingKey="notification_rate_limit"
            source="Default"
            actions={pencil('Wake-ups per seat')}
          >
            Off
          </SettingsTable.Row>
          <SettingsTable.Row
            label="Notices gathered into one wake-up"
            settingKey="notification_coalesce_max_batch"
            source="Default"
            actions={pencil('Notices gathered into one wake-up')}
          >
            20
          </SettingsTable.Row>
        </SettingsTable>
      </Card>
    </div>
  ),
};

/** On its own, outside a card, the table draws DataGrid's standing frame. A read-only table leaves its controls' track empty. */
export const StandingAlone: Story = {
  render: () => (
    <div style={{ maxWidth: 720 }}>
      <SettingsTable aria-label="Retention">
        <SettingsTable.Row label="Events kept" settingKey="stream.max_age" source="Default">
          30 days
        </SettingsTable.Row>
        <SettingsTable.Row label="Spend history kept" settingKey="spend.history" source="Changed from 90 days" changed>
          181 days
        </SettingsTable.Row>
      </SettingsTable>
    </div>
  ),
};

/** Narrow: the name and its controls take the first line, the value and its source the second. */
export const Narrow: Story = {
  render: () => (
    <div style={{ width: 340 }}>
      <Card padding="none">
        <Card.Header icon={<GaugeGlyph size="sm" />} count={2}>
          <Card.Title id="narrow-turn">Guardrails on every turn</Card.Title>
        </Card.Header>
        <SettingsTable aria-labelledby="narrow-turn">
          <SettingsTable.Row
            label="Review rounds per turn"
            settingKey="turn_engine.max_iterations"
            source="Default"
            actions={pencil('Review rounds per turn')}
          >
            3
          </SettingsTable.Row>
          <SettingsTable.Row
            label="A scheduled turn, unless its schedule says otherwise"
            settingKey="schedules.timeout_seconds"
            source="Changed from 3 minutes"
            changed
            defaultLabel="3 minutes"
            onReset={() => undefined}
            actions={pencil('A scheduled turn')}
          >
            5 minutes
          </SettingsTable.Row>
        </SettingsTable>
      </Card>
    </div>
  ),
};
