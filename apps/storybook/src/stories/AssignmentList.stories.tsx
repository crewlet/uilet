import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { AssignmentList, AssignmentPicker, Button, Menu, Text, type AssignmentRow } from '@crewlethq/ui';
import { BotGlyph, SearchGlyph, UserGlyph } from '@crewlethq/icons/glyphs';
import { BothThemes } from '../BothThemes';

/**
 * Who is assigned what: a row a subject, the value and its picker right after the name, names and values cut with their
 * words on hover, and a row with an unsaved change saying what it was. Saving such changes opens a `ConfirmModal` with
 * `changes`.
 */
const meta: Meta<typeof AssignmentList> = {
  title: 'UI/AssignmentList',
  component: AssignmentList,
  decorators: [(Story) => <div style={{ maxWidth: 880 }}>{Story()}</div>],
};

export default meta;
type Story = StoryObj<typeof AssignmentList>;

const MODELS = {
  'platform-sonnet-8': 'Claude Sonnet 4.5',
  'platform-sonnet-12': 'Claude Sonnet 4.5',
  'platform-opus-long-context-14': 'Claude Opus 4.1, extended thinking',
} as const;
type ModelKey = keyof typeof MODELS;

const SEATS: { key: string; name: string; model: ModelKey; helper?: boolean }[] = [
  { key: 'ask', name: 'Ask Crewlet', model: 'platform-sonnet-8', helper: true },
  { key: 'advisor', name: 'Advisor', model: 'platform-sonnet-8', helper: true },
  { key: 'pm', name: 'Product Manager', model: 'platform-sonnet-8' },
  { key: 'sre', name: 'Senior Site Reliability Engineer, Payments Platform', model: 'platform-opus-long-context-14' },
  { key: 'qa', name: 'QA Engineer', model: 'platform-sonnet-8' },
  { key: 'be', name: 'Senior Backend Engineer', model: 'platform-sonnet-12' },
];

function Card() {
  const [picked, setPicked] = useState<Record<string, ModelKey>>({ qa: 'platform-opus-long-context-14' });
  const pending = Object.keys(picked).length;
  const row = (seat: (typeof SEATS)[number]): AssignmentRow => {
    const model = picked[seat.key] ?? seat.model;
    return {
      key: seat.key,
      name: seat.name,
      icon: seat.helper ? <SearchGlyph size="sm" aria-hidden="true" /> : <UserGlyph size="sm" aria-hidden="true" />,
      was: picked[seat.key] && picked[seat.key] !== seat.model ? seat.model : undefined,
      value: (
        <Menu
          label={`Model for ${seat.name}`}
          width="trigger"
          items={(Object.keys(MODELS) as ModelKey[]).map((key) => ({
            key,
            label: key,
            description: MODELS[key],
            onSelect: () =>
              setPicked((now) => {
                const next = { ...now };
                if (key === seat.model) delete next[seat.key];
                else next[seat.key] = key;
                return next;
              }),
          }))}
          renderTrigger={(props) => (
            <AssignmentPicker
              {...props}
              aria-label={`Model for ${seat.name}: ${model}`}
              icon={<BotGlyph size="sm" />}
              primary={model}
              secondary={MODELS[model]}
            />
          )}
        />
      ),
      href: seat.helper ? undefined : `#seat-${seat.key}`,
      actions: seat.helper ? null : (
        <Menu label={`More actions for ${seat.name}`} align="end" items={[{ key: 'open', label: 'Open seat', onSelect: () => {} }]} />
      ),
    };
  };
  return (
    <AssignmentList
      groups={[
        { key: 'helpers', label: 'Helpers', rows: SEATS.filter((s) => s.helper).map(row) },
        { key: 'seats', label: 'Seats', rows: SEATS.filter((s) => !s.helper).map(row) },
      ]}
      footer={
        pending > 0 ? (
          <>
            <Text variant="caption" tone="secondary">
              {pending === 1 ? '1 change not saved' : `${pending} changes not saved`}
            </Text>
            <Button variant="ghost" size="small" onClick={() => setPicked({})}>
              Discard
            </Button>
            <Button variant="primary" size="small">
              Review and move
            </Button>
          </>
        ) : null
      }
    />
  );
}

/** Settings, Models: who runs on which model, with a long seat name, a long model and a pending row. */
export const WhoRunsOnWhichModel: Story = {
  render: () => (
    <BothThemes>
      <div style={{ border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <Card />
      </div>
    </BothThemes>
  ),
};

/** A seat whose jobs run on different models: a picker per part, each labelled under the name. */
export const SplitRow: Story = {
  render: () => (
    <BothThemes>
      <AssignmentList
        groups={[
          {
            key: 'seats',
            label: 'Seats',
            rows: [
              {
                key: 'qa',
                name: 'QA Engineer',
                href: '#seat-qa',
                icon: <UserGlyph size="sm" aria-hidden="true" />,
                lines: (['Coding', 'Reviews', 'Routines'] as const).map((label, index) => ({
                  key: label,
                  label,
                  value: (
                    <AssignmentPicker
                      aria-label={`${label} for QA Engineer`}
                      primary={index === 0 ? 'platform-opus-long-context-14' : 'platform-sonnet-8'}
                      secondary={index === 0 ? MODELS['platform-opus-long-context-14'] : MODELS['platform-sonnet-8']}
                    />
                  ),
                })),
                actions: <Menu label="More actions for QA Engineer" align="end" items={[{ key: 'one', label: 'Use one model', onSelect: () => {} }]} />,
              },
            ],
          },
        ]}
      />
    </BothThemes>
  ),
};

/** At a phone's width: the picker drops under the name, the actions stay on the name's line. */
export const Narrow: Story = {
  decorators: [(Story) => <div style={{ maxWidth: 340 }}>{Story()}</div>],
  render: () => <Card />,
};
