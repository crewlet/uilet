import { useId, useState } from 'react';
import { SearchGlyph } from '@crewlethq/icons/glyphs';
import { Button } from '../Button/index.js';
import { Checkbox } from '../Checkbox/index.js';
import { Input } from '../Input/index.js';
import { Text } from '../Text/index.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';
import { cx } from '../utils/cx.js';

/** One thing an agent may be given: an app, an ad account, a property, a site. */
export interface ScopeListOption {
  /** What `onChange` is called with. */
  value: string;
  /** Its name, drawn first. */
  label: string;
  /** A quiet line under the name, in monospace: a bundle ID, a package name. */
  detail?: string | undefined;
  /** Its ID, quiet at the row's end in monospace: an Apple ID, an account number. */
  id?: string | undefined;
  /** It cannot be chosen now; the reason is read with it. */
  disabled?: boolean | undefined;
  disabledReason?: string | undefined;
}

/** Every word the list says, for an application that words them its own way. */
export interface ScopeListLabels {
  /** The count over the rows: "1 of 2 chosen". */
  chosen: (chosen: number, of: number) => string;
  chooseAll: string;
  clear: string;
  /** The search field's name and placeholder. */
  find: string;
  /** Said where the search matches nothing. */
  noMatch: (term: string) => string;
  /** Said where there is nothing to choose from at all. */
  none: string;
}

export const SCOPE_LIST_LABELS: ScopeListLabels = {
  chosen: (chosen, of) => `${chosen.toLocaleString()} of ${of.toLocaleString()} chosen`,
  chooseAll: 'Choose all',
  clear: 'Clear',
  find: 'Find by name or ID',
  noMatch: (term) => `Nothing matches “${term}”.`,
  none: 'Nothing to choose from.',
};

export interface ScopeListProps {
  /** What the rows are, for a screen reader: "Growth Marketer's apps". */
  label: string;
  options: readonly ScopeListOption[];
  /** The values chosen. */
  value: readonly string[];
  onChange: (value: string[]) => void;
  /** From this many options on, a search field filters them by name, detail and ID. 8 by default. */
  searchFrom?: number | undefined;
  /** The count and the Choose all or Clear control over the rows. On by default. */
  bulk?: boolean | undefined;
  labels?: Partial<ScopeListLabels> | undefined;
  className?: string | undefined;
}

/**
 * The things an agent may reach at a vendor, each a row to tick: its name
 * first, a detail quiet under it, its ID quiet at the row's end, and a chosen
 * row in the selected fill. A count and one control to choose every row shown
 * or clear them stand over the rows, and a long list is searched.
 *
 * A FIELDSET of checkboxes, named by `label`: each box is named by its row's
 * name and described by its detail and ID, which are what tell two apps with
 * one name apart.
 */
export function ScopeList({
  label,
  options,
  value,
  onChange,
  searchFrom = 8,
  bulk = true,
  labels: overrides,
  className,
}: ScopeListProps) {
  const labels = { ...SCOPE_LIST_LABELS, ...overrides };
  const base = useId();
  const [term, setTerm] = useState('');
  const chosen = new Set(value);
  const searchable = options.length >= searchFrom;
  // A SEARCH APPLIES ONLY WHILE ITS FIELD IS DRAWN: a list that shrinks below
  // `searchFrom` loses the field, and a term left behind would filter it with
  // nothing on the screen to clear it.
  const find = searchable ? term.trim().toLowerCase() : '';
  const shown = find
    ? options.filter((o) => `${o.label} ${o.detail ?? ''} ${o.id ?? ''} ${o.value}`.toLowerCase().includes(find))
    : options;
  const open = shown.filter((o) => !o.disabled);
  // EVERY ROW SHOWN, never one a search has hidden: Choose all after a search
  // chooses what the person can see.
  const allShown = open.length > 0 && open.every((o) => chosen.has(o.value));
  const toggleShown = () => {
    if (allShown) {
      const off = new Set(open.map((o) => o.value));
      onChange(value.filter((v) => !off.has(v)));
    } else {
      onChange([...value, ...open.map((o) => o.value).filter((v) => !chosen.has(v))]);
    }
  };
  const count = options.filter((o) => chosen.has(o.value)).length;
  return (
    <fieldset className={cx('crewlet-scope-list', className)}>
      <VisuallyHidden as="legend">{label}</VisuallyHidden>
      {bulk ? (
        <div className="crewlet-scope-list__bar">
          <Text variant="caption" tone="secondary">
            {labels.chosen(count, options.length)}
          </Text>
          <Button size="small" variant="ghost" disabled={open.length === 0} onClick={toggleShown}>
            {allShown ? labels.clear : labels.chooseAll}
          </Button>
        </div>
      ) : null}
      {searchable ? (
        <Input
          type="search"
          aria-label={labels.find}
          placeholder={labels.find}
          inputSize="sm"
          width="full"
          leading={<SearchGlyph size="sm" />}
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
      ) : null}
      {shown.length > 0 ? (
        <ul className="crewlet-scope-list__rows">
          {shown.map((o, i) => {
            const on = chosen.has(o.value);
            const idId = o.id && o.id !== o.label ? `${base}-id-${i}` : undefined;
            return (
              <li key={o.value} className="crewlet-scope-list__row" data-chosen={on || undefined}>
                <Checkbox
                  className="crewlet-scope-list__check"
                  label={o.label}
                  description={
                    o.detail || (o.disabled && o.disabledReason) ? (
                      <>
                        {o.detail ? <span className="crewlet-scope-list__detail">{o.detail}</span> : null}
                        {o.disabled && o.disabledReason ? <span>{o.disabledReason}</span> : null}
                      </>
                    ) : undefined
                  }
                  checked={on}
                  disabled={o.disabled}
                  aria-describedby={idId}
                  onCheckedChange={(next) =>
                    onChange(next ? [...value, o.value] : value.filter((v) => v !== o.value))
                  }
                />
                {idId ? (
                  <Text id={idId} variant="caption" tone="tertiary" mono className="crewlet-scope-list__id">
                    {o.id}
                  </Text>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <Text as="p" variant="caption" tone="secondary" className="crewlet-scope-list__empty">
          {find ? labels.noMatch(term.trim()) : labels.none}
        </Text>
      )}
    </fieldset>
  );
}
