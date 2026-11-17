import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import {
  DurationField,
  durationSeconds,
  durationValue,
  Input,
  NumberField,
  PresetChips,
  SegmentedControl,
  SettingForm,
  type DurationValue,
} from '@crewlethq/ui';

/**
 * The editor family a setting is changed with: one panel (`SettingForm`) and
 * a control per kind. A number gets steppers and its bounds, a duration an
 * amount and a unit with common durations, a choice a segmented row, text a
 * field. Each shows its default as a placeholder or a "Default" chip.
 */
const meta: Meta = { title: 'UI/Setting editors' };

export default meta;
type Story = StoryObj;

const panel = { background: 'var(--color-surface-subtle)', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-lg)', width: 'fit-content' };

export const ANumber: Story = {
  render: function ANumber() {
    const [value, setValue] = useState('');
    const n = Number(value);
    const error = value.trim() !== '' && (!Number.isInteger(n) ? `“${value}” is not a whole number.` : n < 8 ? 'At least 8.' : n > 64 ? 'At most 64.' : undefined);
    return (
      <div style={panel}>
        <SettingForm label="Shortest password" htmlFor="pw" hint="8 to 64 characters" error={error || undefined} onSave={() => undefined} onCancel={() => undefined}>
          {(field) => (
            <NumberField
              id={field.id}
              aria-describedby={field.describedBy}
              value={value}
              onValueChange={setValue}
              defaultValue={12}
              min={8}
              max={64}
              unit="characters"
              presets={[]}
              formatValue={(v) => `${v} characters`}
            />
          )}
        </SettingForm>
      </div>
    );
  },
};

export const ADuration: Story = {
  render: function ADuration() {
    const [value, setValue] = useState<DurationValue>(() => durationValue(null, 43_200));
    const seconds = durationSeconds(value);
    const error = seconds !== null && Number.isNaN(seconds) ? `“${value.amount}” is not a number.` : seconds !== null && seconds < 300 ? 'At least 5 minutes.' : undefined;
    return (
      <div style={panel}>
        <SettingForm label="Signed out when unused for" htmlFor="idle" hint="5 minutes to 30 days" error={error} onSave={() => undefined} onCancel={() => undefined}>
          {(field) => (
            <DurationField
              id={field.id}
              aria-describedby={field.describedBy}
              value={value}
              onValueChange={setValue}
              defaultValue={43_200}
              min={300}
              max={2_592_000}
              presets={[3_600, 28_800, 86_400, 604_800]}
            />
          )}
        </SettingForm>
      </div>
    );
  },
};

export const APercentage: Story = {
  render: function APercentage() {
    const [value, setValue] = useState('');
    return (
      <div style={panel}>
        <SettingForm label="Share of the budget a call may spend" htmlFor="share" hint="1% to 100%" onSave={() => undefined} onCancel={() => undefined}>
          {(field) => (
            <NumberField
              id={field.id}
              value={value}
              onValueChange={setValue}
              defaultValue={20}
              min={1}
              max={100}
              step={5}
              unit="%"
              formatValue={(v) => `${v}%`}
              presets={['25', '50', '75', '100'].map((p) => ({ value: p, label: `${p}%` }))}
            />
          )}
        </SettingForm>
      </div>
    );
  },
};

export const AChoice: Story = {
  render: function AChoice() {
    const [value, setValue] = useState('default');
    return (
      <div style={panel}>
        <SettingForm label="Search by meaning" onSave={() => undefined} onCancel={() => undefined}>
          <SegmentedControl
            label="Search by meaning"
            semantics="radio"
            value={value}
            onValueChange={setValue}
            options={[
              { value: 'default', label: 'Default (On)' },
              { value: 'on', label: 'On' },
              { value: 'off', label: 'Off' },
            ]}
          />
        </SettingForm>
      </div>
    );
  },
};

export const Text: Story = {
  render: function Text() {
    const [value, setValue] = useState('');
    return (
      <div style={panel}>
        <SettingForm label="Commit identity domain" htmlFor="domain" onSave={() => undefined} onCancel={() => undefined}>
          {(field) => <Input id={field.id} value={value} placeholder="seats.invalid" onChange={(e) => setValue(e.target.value)} />}
        </SettingForm>
      </div>
    );
  },
};

/** A row of common values on its own: the chip matching the field is chosen. */
export const Presets: Story = {
  render: function Presets() {
    const [value, setValue] = useState('5');
    return <PresetChips label="Common values" options={[{ value: '', label: 'Default (3)' }, { value: '5', label: '5' }, { value: '10', label: '10' }]} value={value} onPick={setValue} />;
  },
};
