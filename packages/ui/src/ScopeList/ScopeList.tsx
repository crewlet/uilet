import { useId, useState } from 'react';
import { SearchGlyph } from '@crewlethq/icons/glyphs';
import { Button } from '../Button/index.js';
import { Checkbox } from '../Checkbox/index.js';
import { Input } from '../Input/index.js';
import { Text } from '../Text/index.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';
import { cx } from '../utils/cx.js';
import { groupInOrder } from '../utils/groupInOrder.js';
import { headingTag, useHeadingLevel } from '../utils/headingLevel.js';

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
  /**
   * What holds it, such as the Analytics account a property sits in: drawn as
   * a heading over its group's rows, searched with them, and read with each box.
   */
  group?: string | undefined;
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
  /** From this many options on, a search field filters them by name, detail, ID and group. 8 by default. */
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
 * Options that name a `group` are drawn in sections, one per group in the
 * order it first appears, each under its name; options with none come first,
 * under no heading. A group the search empties is not drawn.
 *
 * A FIELDSET of checkboxes, named by `label`: each box is named by its row's
 * name and described by its detail, its ID and its group, which are what tell
 * two apps with one name apart. Each section is a group named by its heading.
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
    ? options.filter((o) =>
        `${o.label} ${o.detail ?? ''} ${o.id ?? ''} ${o.value} ${o.group ?? ''}`.toLowerCase().includes(find),
      )
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
  const Heading = headingTag(useHeadingLevel());
  const row = (o: ScopeListOption, i: number, groupId: string | undefined) => {
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
          aria-describedby={cx(idId, groupId) || undefined}
          onCheckedChange={(next) => onChange(next ? [...value, o.value] : value.filter((v) => v !== o.value))}
        />
        {idId ? (
          <Text id={idId} variant="caption" tone="tertiary" mono className="crewlet-scope-list__id">
            {o.id}
          </Text>
        ) : null}
      </li>
    );
  };
  // A ROW'S INDEX IS ITS PLACE AMONG THE ROWS SHOWN, so its ID's element id is unique across sections.
  const at = new Map(shown.map((o, i) => [o.value, i]));
  // EACH GROUP KEEPS ITS PLACE WHILE A SEARCH RUNS: ordered over every option, then emptied of the rows it hides.
  const visible = new Set(shown);
  const runs = groupInOrder(options)
    .map((run) => ({ ...run, items: run.items.filter((o) => visible.has(o)) }))
    .filter((run) => run.items.length > 0);
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
        runs.map((run, r) => {
          if (run.name === undefined) {
            return (
              <ul key="" className="crewlet-scope-list__rows">
                {run.items.map((o) => row(o, at.get(o.value)!, undefined))}
              </ul>
            );
          }
          // BY POSITION, NOT BY NAME: a group's name may hold spaces, and an id is one token.
          const groupId = `${base}-group-${r}`;
          return (
            <div key={run.name} role="group" aria-labelledby={groupId} className="crewlet-scope-list__group">
              <Text as={Heading} id={groupId} variant="label" className="crewlet-scope-list__group-name">
                {run.name}
              </Text>
              <ul className="crewlet-scope-list__rows">{run.items.map((o) => row(o, at.get(o.value)!, groupId))}</ul>
            </div>
          );
        })
      ) : (
        <Text as="p" variant="caption" tone="secondary" className="crewlet-scope-list__empty">
          {find ? labels.noMatch(term.trim()) : labels.none}
        </Text>
      )}
    </fieldset>
  );
}
