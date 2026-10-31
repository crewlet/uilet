import type { Meta, StoryObj } from '@storybook/react-vite';
import { useId, useMemo, useRef, useState } from 'react';
import { HashGlyph, LockGlyph, UsersGlyph } from '@crewlethq/icons/glyphs';
import { CREWLET_CHARACTERS } from '@crewlethq/icons/characters';
import { Avatar, Composer, MentionMenu, Tag, mentionQuery, useListbox, type MentionOption } from '@crewlethq/ui';

/**
 * The suggestions a composer opens on "@" or "#". Type "@" or "#" in the box:
 * the arrows move through the list and wrap, Enter or Tab takes the row,
 * Escape closes the list and nothing else. Focus never leaves the box.
 */
const meta: Meta<typeof MentionMenu> = {
  title: 'UI/MentionMenu',
  component: MentionMenu,
};

export default meta;
type Story = StoryObj<typeof MentionMenu>;

const PEOPLE: MentionOption[] = [
  {
    id: 'pm',
    insert: '@pm',
    label: 'Product Manager',
    detail: 'Writing the October brief',
    mark: <Avatar name="Product Manager" kind="agent" character={CREWLET_CHARACTERS[12]} size="sm" status="working" decorative />,
    note: 'Working',
  },
  {
    id: 'backend',
    insert: '@backend-engineer',
    label: 'Senior Backend Engineer',
    detail: 'Waiting on a decision',
    mark: <Avatar name="Senior Backend Engineer" kind="agent" character={CREWLET_CHARACTERS[7]} size="sm" status="needs" decorative />,
    note: 'Needs you',
  },
  { id: 'ada', insert: '@ada', label: 'Ada Park', detail: 'ada', mark: <Avatar name="Ada Park" kind="human" size="sm" decorative /> },
  { id: 'lee', insert: '@lee', label: 'Lee Park', detail: 'lee', mark: <Avatar name="Lee Park" kind="human" size="sm" decorative />, note: 'Not in this room' },
  { id: 'channel', insert: '@channel', label: '@channel', detail: 'Notify everyone in this room', mark: <UsersGlyph size="md" /> },
];

const ROOMS: MentionOption[] = [
  { id: 'engineering', insert: '#engineering', label: 'engineering', detail: 'Shipping the October release', mark: <HashGlyph size="md" /> },
  { id: 'design-crit', insert: '#design-crit', label: 'design-crit', detail: 'Weekly critique', mark: <HashGlyph size="md" /> },
  { id: 'leadership', insert: '#leadership', label: 'leadership', mark: <LockGlyph size="md" /> },
];

export const InAComposer: Story = {
  render: function InAComposer() {
    const [value, setValue] = useState('Can ');
    const [caret, setCaret] = useState(4);
    const [closedAt, setClosedAt] = useState<number | null>(null);
    const field = useRef<HTMLTextAreaElement | null>(null);
    const query = mentionQuery(value, caret);
    const trigger = query?.trigger;
    const typed = query?.query.toLowerCase() ?? '';
    const options = useMemo(() => {
      if (!trigger) return [];
      return (trigger === '@' ? PEOPLE : ROOMS).filter((option) => !typed || option.label.toLowerCase().includes(typed) || option.insert.includes(typed));
    }, [trigger, typed]);
    const open = query !== null && options.length > 0 && closedAt !== query.start;
    const take = (index: number) => {
      const option = options[index];
      if (!option || !query) return;
      const next = `${value.slice(0, query.start)}${option.insert} ${value.slice(caret)}`;
      const at = query.start + option.insert.length + 1;
      setValue(next);
      setCaret(at);
      requestAnimationFrame(() => field.current?.setSelectionRange(at, at));
    };
    const listbox = useListbox({ id: useId(), open, count: options.length, tabCommits: true, onCommit: take, onClose: () => setClosedAt(query?.start ?? null) });
    return (
      <div style={{ maxWidth: 640, paddingTop: 340 }}>
        <div style={{ position: 'relative' }} ref={listbox.anchorRef}>
          {open ? (
            <MentionMenu
              id={listbox.listId}
              listRef={listbox.listRef}
              label={query!.trigger === '@' ? 'People and agents' : 'Rooms'}
              options={options}
              active={listbox.active}
              onPick={(_, index) => take(index)}
              onHover={listbox.setActive}
            />
          ) : null}
          <Composer
            ref={field}
            label="Message #engineering"
            placeholder="Message #engineering"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls={open ? listbox.listId : undefined}
            aria-activedescendant={open && listbox.active >= 0 ? listbox.optionId(listbox.active) : undefined}
            value={value}
            onChange={(next) => {
              setValue(next);
              setClosedAt(null);
              setCaret(field.current?.selectionStart ?? next.length);
            }}
            onSelect={(event) => setCaret((event.target as HTMLTextAreaElement).selectionStart)}
            onKeyDown={(event) => {
              listbox.onKeyDown(event);
            }}
            onSubmit={() => setValue('')}
          />
        </div>
      </div>
    );
  },
};

/** The list on its own, its third row highlighted. */
export const List: Story = {
  render: () => (
    <div style={{ position: 'relative', maxWidth: 560, height: 360 }}>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 0 }}>
        <MentionMenu id="mentions" label="People and agents" options={PEOPLE} active={2} onPick={() => undefined} onHover={() => undefined} />
      </div>
    </div>
  ),
};

/** Rooms on "#", each with its glyph in the face's column so every name starts on one edge. */
export const Rooms: Story = {
  render: () => (
    <div style={{ position: 'relative', maxWidth: 560, height: 260 }}>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 0 }}>
        <MentionMenu
          id="rooms"
          label="Rooms"
          options={ROOMS}
          active={0}
          onPick={() => undefined}
          onHover={() => undefined}
          footer={<Tag size="xs">Private rooms you are in are listed too</Tag>}
        />
      </div>
    </div>
  ),
};
