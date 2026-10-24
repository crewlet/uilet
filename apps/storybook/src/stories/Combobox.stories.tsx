import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Button, Combobox, FormField, Modal, type ComboboxOption } from '@crewlethq/ui';
import { FolderGlyph, FolderInputGlyph, FolderPlusGlyph, SearchGlyph } from '@crewlethq/icons/glyphs';

const meta: Meta<typeof Combobox> = {
  title: 'UI/Combobox',
  component: Combobox,
};

export default meta;
type Story = StoryObj<typeof Combobox>;

const SECRETS = [
  'SLACK_BOT_TOKEN',
  'SLACK_SIGNING_SECRET',
  'JIRA_HOST',
  'JIRA_API_TOKEN',
  'GITHUB_APP_PRIVATE_KEY',
];

/**
 * The completion the engine's config fields offer: the names of the sealed
 * entries a company holds. The list is anchored under the field, so opening
 * it moves nothing on the form.
 */
export const Secrets: Story = {
  render: () => {
    function Demo() {
      const [value, setValue] = useState('');
      const [open, setOpen] = useState(false);
      const offered = SECRETS.filter((name) => name.toLowerCase().includes(value.toLowerCase()));
      return (
        <div style={{ width: 420 }}>
          <FormField label="Bot token" helper="A value, or the name of a sealed entry.">
            {(field) => (
              <Combobox
                id={field.id}
                aria-describedby={field.describedBy}
                label="Secrets"
                appearance="reference"
                mono
                tabCommits
                placeholder="${SLACK_BOT_TOKEN}"
                value={value}
                onValueChange={(next) => {
                  setValue(next);
                  setOpen(true);
                }}
                options={offered.map((name) => ({ value: name }))}
                open={open}
                onOpenChange={setOpen}
                emptyMessage="Nothing matches"
              />
            )}
          </FormField>
          <p style={{ marginTop: 200, fontSize: 13 }}>
            Nothing below the field moves when the list opens.
          </p>
        </div>
      );
    }
    return <Demo />;
  },
};

/** A row can carry a second line of identity beside its name. */
export const WithHints: Story = {
  render: () => {
    function Demo() {
      const [value, setValue] = useState('');
      const [open, setOpen] = useState(true);
      return (
        <div style={{ width: 420 }}>
          <Combobox
            label="Seats"
            aria-label="Owner"
            placeholder="Search seats"
            value={value}
            onValueChange={(next) => {
              setValue(next);
              setOpen(true);
            }}
            options={[
              { value: 'Software Engineer', hint: 'software-engineer' },
              { value: 'Site Reliability', hint: 'site-reliability' },
              { value: 'Designer', hint: 'designer' },
            ]}
            open={open}
            onOpenChange={setOpen}
          />
        </div>
      );
    }
    return <Demo />;
  },
};

/** The folders a reader may file into, by path, as the Move to… dialog lists them. Story data. */
const PLACES = [
  { id: '', path: [] as string[], name: 'Top level' },
  { id: 'marketing', path: [], name: 'Marketing' },
  { id: 'q4', path: ['Marketing'], name: 'Q4 review' },
  { id: 'press', path: ['Marketing', 'Q4 review'], name: 'Press kit' },
  { id: 'board', path: [], name: 'Board' },
  { id: 'reports', path: [], name: 'Reports' },
  { id: 'weekly', path: ['Reports'], name: 'Weekly' },
  { id: 'research', path: [], name: 'Research' },
];
const CURRENT = 'q4';
const CREATE = 'create';

/** A place drawn as the mockup draws it: its parents quiet, its own name in the row's ink. */
function Place({ path, name }: { path: readonly string[]; name: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--spacing-2)', minWidth: 0 }}>
      <FolderGlyph size="sm" aria-hidden="true" />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {path.length > 0 ? <span style={{ color: 'var(--color-text-tertiary)' }}>{`${path.join(' › ')} › `}</span> : null}
        {name}
      </span>
    </span>
  );
}

/**
 * INLINE, THE LIST IS THE DIALOG'S BODY: the Move to… dialog. The list is
 * always on screen under the field and filtered by it, at one height whatever
 * the filter leaves, so the dialog never changes size under the pointer (a
 * popup that closed when the field lost focus moved Cancel away between the
 * press and the release). The arrows, Enter and the pointer choose; Escape
 * reaches the dialog. The place it is in now is marked Current, and a phrase
 * that names no folder offers to make one.
 */
export const InlinePicker: Story = {
  render: function Render() {
    const [open, setOpen] = useState(true);
    const [query, setQuery] = useState('');
    const [chosen, setChosen] = useState<string | undefined>(undefined);
    const words = query.trim().toLowerCase();
    const matches = PLACES.filter((place) => [...place.path, place.name].join(' › ').toLowerCase().includes(words));
    const options: ComboboxOption[] = [
      ...matches.map((place) => ({
        value: place.id || 'top',
        label: <Place path={place.path} name={place.name} />,
        ...(place.id === CURRENT ? { hint: 'Current' } : {}),
      })),
      ...(words && !PLACES.some((place) => place.name.toLowerCase() === words)
        ? [
            {
              value: CREATE,
              label: (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--spacing-2)', color: 'var(--color-brand-accent-ink)' }}>
                  <FolderPlusGlyph size="sm" aria-hidden="true" />
                  {`Create “${query.trim()}” in Marketing`}
                </span>
              ),
            },
          ]
        : []),
    ];
    return (
      <>
        <Button leadingIcon={<FolderInputGlyph size="sm" />} onClick={() => setOpen(true)}>
          Move to…
        </Button>
        <Modal
          open={open}
          onClose={() => setOpen(false)}
          phoneSheet
          size="md"
          title="Move 3 artifacts"
          footer={
            <>
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button disabledReason={chosen ? undefined : 'Choose a folder first'} onClick={() => setOpen(false)}>
                Move here
              </Button>
            </>
          }
        >
          <Combobox
            inline
            rows={6}
            label="Folders"
            aria-label="Find a folder"
            placeholder="Find a folder"
            leading={<SearchGlyph size="sm" />}
            value={query}
            onValueChange={setQuery}
            options={options}
            chosen={chosen}
            onCommit={(option) => setChosen(option.value === CREATE ? undefined : option.value)}
            emptyMessage="No folder matches. Clear the search to see them all."
          />
          <p style={{ margin: 0, color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)' }}>
            Moving never changes who can open them.
          </p>
        </Modal>
      </>
    );
  },
};
