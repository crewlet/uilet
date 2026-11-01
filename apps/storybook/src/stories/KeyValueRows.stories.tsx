import { useState, type ComponentProps } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Announcer, KeyValueRows, type KeyValueRow } from '@crewlethq/ui';
import { themeScope } from '../themeScope';

/**
 * Keys and their values as rows under one column head: request headers,
 * environment variables, any list of names and what each is set to. Each
 * field is named on its own for a screen reader ("Header 2", "Value for
 * Authorization"), the remove button is the fields' height, Add is a flush
 * quiet action under the rows, and a refused key is said under it without
 * moving the value or the button beside it. Add puts the focus in the new
 * key; Remove moves it to a neighbouring row, or to Add.
 */
const meta: Meta<typeof KeyValueRows> = {
  title: 'UI/KeyValueRows',
  component: KeyValueRows,
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 560 }}>
        <Announcer />
        {Story()}
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof KeyValueRows>;

interface Header extends KeyValueRow {
  /** Saved before: its name is fixed and its value is never read back. */
  stored: boolean;
}

let made = 0;
const blankHeader = (): Header => ({ id: `new-${(made += 1)}`, key: '', value: '', stored: false });

function Headers({
  initial,
  ...rest
}: { initial: Header[] } & Omit<ComponentProps<typeof KeyValueRows<Header>>, 'value' | 'onChange' | 'label' | 'keyLabel' | 'createRow'>) {
  const [rows, setRows] = useState(initial);
  return (
    <KeyValueRows<Header>
      label="Headers"
      keyLabel="Header"
      value={rows}
      onChange={setRows}
      createRow={blankHeader}
      secret
      keyPlaceholder="X-Api-Key"
      keyReadOnly={(row) => row.stored}
      valuePlaceholder={(row) => (row.stored ? 'Stored. Type to replace it' : 'Sealed when you save')}
      {...rest}
    />
  );
}

function Variables({ initial, ...rest }: { initial: KeyValueRow[] } & Partial<ComponentProps<typeof KeyValueRows>>) {
  const [rows, setRows] = useState(initial);
  return (
    <KeyValueRows
      label="Environment variables"
      keyLabel="Variable"
      value={rows}
      onChange={setRows}
      keyPlaceholder="LOG_LEVEL"
      valuePlaceholder="info"
      {...rest}
    />
  );
}

/**
 * Secret header values: one saved before, whose name is fixed and whose value
 * is never read back (its placeholder says so), and one new. Typing shows
 * dots, and no browser offers a saved password.
 */
export const SecretHeaders: Story = {
  render: () => (
    <Headers
      hideLabel
      initial={[
        { id: 'auth', key: 'Authorization', value: '', stored: true },
        { id: 'team', key: 'X-Team', value: '', stored: false },
      ]}
    />
  ),
};

/** Plain values under a drawn legend, as a list among a form's other fields. */
export const EnvironmentVariables: Story = {
  render: () => (
    <Variables
      initial={[
        { id: '1', key: 'LOG_LEVEL', value: 'info' },
        { id: '2', key: 'ROOT', value: '/srv/shared' },
        { id: '3', key: 'READ_ONLY', value: 'true' },
      ]}
      helper="Set when the process starts. Names are upper case letters, digits and underscores."
    />
  ),
};

/**
 * A refused key and a refused value, each said under its own field: every
 * row stands on its fields' top edge, so the value and the remove button
 * beside a refused key stay level with it, and the rows under it move down
 * together.
 */
export const RefusedRows: Story = {
  render: () => (
    <Variables
      initial={[
        { id: '1', key: 'LOG_LEVEL', value: 'info' },
        { id: '2', key: 'log level', value: 'debug' },
        { id: '3', key: 'LOG_LEVEL', value: 'warn' },
        { id: '4', key: 'TIMEOUT', value: 'thirty' },
      ]}
      keyError={(row, index) =>
        row.key.includes(' ')
          ? 'Use letters, digits and underscores, with no spaces.'
          : row.key === 'LOG_LEVEL' && index > 0
            ? 'Another row already sets LOG_LEVEL.'
            : null
      }
      valueError={(row) => (row.key === 'TIMEOUT' && !/^\d+$/.test(row.value) ? 'A whole number of seconds.' : null)}
    />
  ),
};

/** No row yet, with what the list says while it is empty, and with nothing said (the legend and Add alone). */
export const Empty: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--spacing-6)' }}>
      <Variables initial={[]} empty="The process starts with only the variables its command line sets." />
      <Variables initial={[]} />
    </div>
  ),
};

/** Keys and values longer than their columns scroll inside their fields; the columns keep their halves. */
export const LongText: Story = {
  render: () => (
    <div style={{ maxWidth: 380 }}>
      <Variables
        initial={[
          { id: '1', key: 'OTEL_EXPORTER_OTLP_TRACES_ENDPOINT', value: 'https://collector.observability.internal:4318/v1/traces' },
          { id: '2', key: 'X', value: 'y' },
        ]}
      />
    </div>
  ),
};

/** Nothing can be changed while the form saves. */
export const Disabled: Story = {
  render: () => <Variables initial={[{ id: '1', key: 'LOG_LEVEL', value: 'info' }]} disabled />,
};

/** Right to left: the key column leads from the right and the remove button ends the row on the left. */
export const RightToLeft: Story = {
  render: () => (
    <div dir="rtl">
      <Variables
        initial={[
          { id: '1', key: 'LOG_LEVEL', value: 'info' },
          { id: '2', key: 'REGION', value: 'eu-west-1' },
        ]}
        labels={{
          key: (n) => `المتغير ${n}`,
          value: (key) => `قيمة ${key}`,
          remove: (key) => `إزالة ${key}`,
          add: 'إضافة متغير',
          removed: (key) => `تمت إزالة ${key}`,
        }}
        label="متغيرات البيئة"
        keyLabel="المتغير"
        valueLabel="القيمة"
      />
    </div>
  ),
};

/** Both themes, with a refused key. */
export const BothThemes: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--spacing-5)' }}>
      {(['light', 'dark'] as const).map((theme) => (
        <div key={theme} style={{ ...themeScope(theme), padding: 'var(--spacing-4)', background: 'var(--color-surface-background)' }}>
          <Headers
            initial={[
              { id: 'auth', key: 'Authorization', value: '', stored: true },
              { id: 'bad', key: 'X Team', value: 'platform', stored: false },
            ]}
            keyError={(row) => (row.key.includes(' ') ? 'A header name has no spaces.' : null)}
          />
        </div>
      ))}
    </div>
  ),
};
