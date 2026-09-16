import { useId, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Announcer, Button, Count, EmptyValue, StatusDot, VisuallyHidden, announce, useListbox } from '@crewlethq/ui';

/**
 * UI / Marks.
 *
 * The four small pieces that carry meaning without carrying a component: a
 * count, a status dot, an absent value and the words only a screen reader
 * hears. Each one exists because the same rule was being re-decided at every
 * call site.
 */
const meta: Meta = {
  title: 'UI/Marks',
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj;

const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' };
const page: React.CSSProperties = { display: 'grid', gap: 'var(--spacing-5)', minWidth: 420 };

/**
 * A count is never tinted. A red 3 beside "Failures" says the same thing
 * twice, and a red 3 beside "Retries" says something nobody meant.
 *
 * It is the one mark in this package the engine restyle left untouched: the
 * pill, its inset ground, its tertiary ink, its 11px medium type, its tabular
 * figures and its 20px floor were already the engine's count chip.
 */
export const Counts: Story = {
  render: () => (
    <div style={page}>
      <div style={row}>
        <strong>Open incidents</strong>
        <Count value={3} label="open incidents" />
      </div>
      <div style={row}>
        <strong>Seats</strong>
        <Count value={128} label="seats" />
      </div>
      <div style={row}>
        <strong>Nothing yet</strong>
        <Count value={0} label="records" />
      </div>
    </div>
  ),
};

/**
 * A status dot always sits beside its own word, which is why it is hidden from
 * assistive technology: a reader who heard both would be told the state twice.
 *
 * The quiet dot takes the tertiary step rather than the decoration one the
 * engine spends there. A 6px mark is read the way a glyph is, so it has to
 * clear 3:1, and the decoration step measures 2.33:1 on a light page. The
 * pulse is the engine's 1.8s breath, which is 0.55 flashes a second.
 */
export const StatusDots: Story = {
  render: () => (
    <div style={page}>
      {(
        [
          ['neutral', 'Quiet'],
          ['info', 'Working'],
          ['success', 'Done'],
          ['warning', 'Needs a person'],
          ['danger', 'Broken'],
          ['brand', 'Selected'],
          ['phase-onboarding', 'Onboarding'],
          ['phase-execute', 'Execute'],
          ['phase-review', 'Review'],
        ] as const
      ).map(([tone, word]) => (
        <div key={tone} style={row}>
          <StatusDot tone={tone} />
          <span>{word}</span>
        </div>
      ))}
      <div style={row}>
        <StatusDot tone="info" pulse />
        <span>Working, still</span>
      </div>
    </div>
  ),
};

/**
 * An absent number is a marked absence, never a zero: a cost nobody measured
 * and a cost of nothing are different facts, and a table that draws both as 0
 * has thrown the difference away.
 */
export const AbsentValues: Story = {
  render: () => (
    <table style={{ borderCollapse: 'collapse', minWidth: 420 }}>
      <tbody>
        {(
          [
            ['Tokens spent', '12,480'],
            ['Last run', <EmptyValue key="a" />],
            ['Budget', <EmptyValue key="b" label="Not configured" />],
            ['Seat kind', <EmptyValue key="c" label="Not applicable" />],
          ] as const
        ).map(([name, value], index) => (
          <tr key={index}>
            <th style={{ textAlign: 'left', padding: 'var(--spacing-2)', color: 'var(--color-text-secondary)' }}>
              {name}
            </th>
            <td style={{ padding: 'var(--spacing-2)', fontVariantNumeric: 'tabular-nums' }}>{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  ),
};

/**
 * The announcer: one polite region, and a sentence keyed by a counter so the
 * same words twice are announced twice. Turn a screen reader on and press the
 * button repeatedly.
 */
export const Announcing: Story = {
  render: function AnnouncingStory() {
    const [n, setN] = useState(0);
    return (
      <div style={page}>
        <Announcer />
        <Button
          onClick={() => {
            setN((was) => was + 1);
            announce('Removed Site Reliability');
          }}
        >
          Remove a tag
        </Button>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          Announced {n} time{n === 1 ? '' : 's'}, each one read aloud.
        </p>
        <p>
          <VisuallyHidden>This sentence is read and never seen.</VisuallyHidden>
          The sentence above this one is visually hidden.
        </p>
      </div>
    );
  },
};

/**
 * The listbox keys, on the classes every list a field offers shares. Focus
 * stays in the text box and the list is pointed at with
 * `aria-activedescendant`, so the arrows work while somebody is still typing.
 */
export const Listbox: Story = {
  render: function ListboxStory() {
    const id = useId();
    const [query, setQuery] = useState('');
    const all = ['Engineering', 'Design', 'Operations', 'Research', 'Support', 'Finance'];
    const options = all.filter((name) => name.toLowerCase().includes(query.toLowerCase()));
    const [chosen, setChosen] = useState<string | null>(null);
    const [open, setOpen] = useState(true);
    const listbox = useListbox({
      id,
      open,
      count: options.length,
      onCommit: (index) => {
        const value = options[index];
        if (value !== undefined) setChosen(value);
      },
      onClose: () => setOpen(false),
    });
    return (
      <div style={{ ...page, minWidth: 320 }}>
        <input
          aria-label="Unit"
          role="combobox"
          aria-expanded={open}
          aria-controls={listbox.listId}
          aria-activedescendant={open ? listbox.optionId(listbox.active) : undefined}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onKeyDown={listbox.onKeyDown}
          className="crewlet-input__control"
          style={{
            padding: 'var(--spacing-2) var(--spacing-3)',
            background: 'var(--color-surface-subtle)',
            border: '1px solid var(--color-border-control)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text-primary)',
          }}
        />
        {open && (
          <ul
            className="crewlet-listbox"
            role="listbox"
            id={listbox.listId}
            ref={listbox.listRef}
            aria-label="Units"
            style={{ background: 'var(--color-surface-elevated)', borderRadius: 'var(--radius-lg)' }}
          >
            {options.length === 0 ? (
              <li className="crewlet-listbox__empty">Nothing matches that name.</li>
            ) : (
              options.map((name, index) => (
                <li
                  key={name}
                  id={listbox.optionId(index)}
                  role="option"
                  className="crewlet-listbox__option"
                  aria-selected={index === listbox.active}
                  {...listbox.optionHandlers(index)}
                >
                  {name}
                </li>
              ))
            )}
          </ul>
        )}
        <p style={{ color: 'var(--color-text-secondary)' }}>Chosen: {chosen ?? <EmptyValue label="Nothing yet" />}</p>
      </div>
    );
  },
};
