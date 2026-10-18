import { useId, useMemo, useState } from 'react';
import { Combobox, type ComboboxOption } from '../Combobox/index.js';
import { PRINCIPAL_KINDS, PrincipalAvatar, type Principal, type PrincipalKind } from '../Principal/index.js';
import { cx } from '../utils/cx.js';

/** A principal that may be offered but not taken, with the reason in words. */
export interface PrincipalOption extends Principal {
  disabled?: boolean | undefined;
  /** Why it cannot be picked: "Already has access", "Only a person can add the whole company". */
  disabledReason?: string | undefined;
}

export interface PrincipalPickerLabels {
  /** The heading over each kind's group of suggestions. */
  groups: Record<PrincipalKind, string>;
  empty: string;
  loading: string;
}

const LABELS: PrincipalPickerLabels = {
  groups: { person: 'People', agent: 'Agents', team: 'Teams' },
  empty: 'Nobody matches. Try a name, a handle or a team.',
  loading: 'Searching',
};

export interface PrincipalPickerProps {
  /** What the field holds. The caller owns it, and searches with it. */
  query: string;
  onQueryChange: (query: string) => void;
  /**
   * The matches for `query`, in any order: they are grouped people, then
   * agents, then teams. The caller filters, because who matches is the
   * engine's answer, not a substring of a list the browser happens to hold.
   */
  options: readonly PrincipalOption[];
  onPick: (principal: Principal) => void;
  /** Names the field and its list. */
  label: string;
  placeholder?: string | undefined;
  /** A search is in flight; the list says so instead of saying nobody matches. */
  loading?: boolean | undefined;
  disabled?: boolean | undefined;
  className?: string | undefined;
  labels?: Partial<PrincipalPickerLabels> | undefined;
}

const key = (principal: Principal): string => `${principal.kind}:${principal.id}`;

/**
 * A search over people, agents and teams, with each match drawn as itself.
 *
 * THE LIST IS GROUPED BY KIND, because "Operations" the team and "Operations
 * Lead" the agent are different answers to "who should see this", and a flat
 * list of names makes a reader stop on every row to find out which is which.
 * The groups are real ARIA groups named by their headings, and the highlight
 * still moves through every option in order, across the groups.
 *
 * Picking clears the field, ready for the next name.
 */
export function PrincipalPicker({
  query,
  onQueryChange,
  options,
  onPick,
  label,
  placeholder,
  loading = false,
  disabled = false,
  className,
  labels,
}: PrincipalPickerProps) {
  const text = { ...LABELS, ...labels, groups: { ...LABELS.groups, ...labels?.groups } };
  const [open, setOpen] = useState(false);
  const groupId = useId();

  // In the order the list draws them, so the highlight's index is a row's index.
  const ordered = useMemo(
    () => PRINCIPAL_KINDS.flatMap((kind) => options.filter((option) => option.kind === kind)),
    [options],
  );
  const offered = useMemo<ComboboxOption[]>(
    () => ordered.map((option) => ({ value: key(option), label: option.name, disabled: option.disabled ?? false })),
    [ordered],
  );

  return (
    <Combobox
      value={query}
      onValueChange={(next) => {
        onQueryChange(next);
        setOpen(true);
      }}
      options={offered}
      open={open && !disabled}
      onOpenChange={setOpen}
      label={label}
      aria-label={label}
      placeholder={placeholder}
      disabled={disabled}
      containerClassName={cx('crewlet-principal-picker', className)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      emptyMessage={loading ? text.loading : query.trim() ? text.empty : undefined}
      onCommit={(_option, index) => {
        const picked = ordered[index];
        if (!picked || picked.disabled) return;
        onPick(picked);
        onQueryChange('');
      }}
      renderList={
        ordered.length > 0
          ? ({ active, optionId, optionHandlers }) =>
              PRINCIPAL_KINDS.map((kind) => {
                const rows = ordered.map((option, index) => ({ option, index })).filter(({ option }) => option.kind === kind);
                if (rows.length === 0) return null;
                const headingId = `${groupId}-${kind}`;
                return (
                  <div key={kind} role="group" aria-labelledby={headingId} className="crewlet-principal-picker__group">
                    <div id={headingId} role="presentation" className="crewlet-principal-picker__heading">
                      {text.groups[kind]}
                    </div>
                    {rows.map(({ option, index }) => (
                      <div
                        key={key(option)}
                        id={optionId(index)}
                        role="option"
                        aria-selected={index === active}
                        aria-disabled={option.disabled || undefined}
                        className={cx(
                          'crewlet-listbox__option',
                          'crewlet-principal-picker__option',
                          index === active && 'is-highlight',
                          option.disabled && 'is-disabled',
                        )}
                        {...(option.disabled ? {} : optionHandlers(index))}
                      >
                        <PrincipalAvatar principal={option} size="sm" />
                        <span className="crewlet-principal-picker__text">
                          <span className="crewlet-principal-picker__name">{option.name}</span>
                          {option.disabledReason ?? option.detail ? (
                            <span className="crewlet-listbox__hint">{option.disabledReason ?? option.detail}</span>
                          ) : null}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })
          : undefined
      }
    />
  );
}
