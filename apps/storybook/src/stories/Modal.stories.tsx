import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Button, ChoiceList, ConfirmModal, Checkbox, FormField, Input, Modal } from '@crewlethq/ui';
import { FolderInputGlyph, PencilGlyph, SearchGlyph } from '@crewlethq/icons/glyphs';

/**
 * UI / Modal.
 *
 * The keyboard contract is asserted in the jsdom suites, not in a play
 * function: uilet's CI runs release check, install, build, lint, typecheck and
 * test, and no job executes one. These pages are for looking at the surfaces.
 */
const meta: Meta<typeof Modal> = {
  title: 'UI/Modal',
  component: Modal,
};

export default meta;
type Story = StoryObj<typeof Modal>;

export const Basic: Story = {
  render: function BasicStory() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button onClick={() => setOpen(true)}>Open modal</Button>
        <Modal
          open={open}
          onClose={() => setOpen(false)}
          title="Edit project name"
          subtitle="Visible to project members only."
          icon={<PencilGlyph size="md" />}
          footer={
            <>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={() => setOpen(false)}>Save</Button>
            </>
          }
        >
          <FormField label="Name">
            {({ id }) => <Input id={id} defaultValue="Quarterly reports" />}
          </FormField>
        </Modal>
      </>
    );
  },
};

/**
 * A subtitle under the title, with actions in the head: the mark, the actions
 * and the close control sit on the title's line, not on the head's top edge
 * and not centred across the description. The subtitle runs to two lines to
 * show it.
 */
export const SubtitleWithActions: Story = {
  render: function SubtitleWithActionsStory() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button onClick={() => setOpen(true)}>Open board</Button>
        <Modal
          open={open}
          onClose={() => setOpen(false)}
          size="lg"
          title="Landing page"
          subtitle="Board 1 of 3, at its full size. Zoom and pan here; the canvas behind keeps where you were."
          icon={<PencilGlyph size="md" />}
          headerActions={
            <>
              <Button size="small" variant="ghost">Previous</Button>
              <Button size="small">Next</Button>
            </>
          }
        >
          <p>The board at its full size.</p>
        </Modal>
      </>
    );
  },
};

/**
 * Where a dialog sits, and why `top` is the default.
 *
 * A reader who just pressed a button is looking at the top half of the window.
 * A surface that opens in the middle of the screen asks them to find it again,
 * and the veil fades the page rather than darkening it precisely so the place
 * they were keeping is still there behind it.
 */
export const Placement: Story = {
  render: function PlacementStory() {
    const [at, setAt] = useState<'top' | 'center' | null>(null);
    return (
      <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
        <Button onClick={() => setAt('top')}>top (the default)</Button>
        <Button onClick={() => setAt('center')}>center</Button>
        <Modal
          open={at !== null}
          onClose={() => setAt(null)}
          {...(at === 'center' ? { placement: 'center' as const } : {})}
          title={at === 'center' ? 'Centred' : 'Where the eye already is'}
          footer={<Button variant="primary" onClick={() => setAt(null)}>Close</Button>}
        >
          <p>The page behind is faded to context, not darkened out of the way.</p>
        </Modal>
      </div>
    );
  },
};

export const Sizes: Story = {
  render: function SizesStory() {
    const [size, setSize] = useState<'sm' | 'md' | 'lg' | 'xl' | null>(null);
    return (
      <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
        <Button onClick={() => setSize('sm')}>sm (480)</Button>
        <Button onClick={() => setSize('md')}>md (560)</Button>
        <Button onClick={() => setSize('lg')}>lg (720)</Button>
        <Button onClick={() => setSize('xl')}>xl (1080)</Button>
        <Modal
          open={size !== null}
          onClose={() => setSize(null)}
          title={`Size: ${size}`}
          size={size ?? 'sm'}
        >
          <p>The frame caps at the size step's own width, and at the window below that.</p>
        </Modal>
      </div>
    );
  },
};

/**
 * A prompt raised over a sheet.
 *
 * One Escape closes the prompt and leaves the sheet, with its edits, exactly
 * where it was, because both are on one layer stack.
 */
export const Stacked: Story = {
  render: function StackedStory() {
    const [sheet, setSheet] = useState(false);
    const [prompt, setPrompt] = useState(false);
    return (
      <>
        <Button onClick={() => setSheet(true)}>Edit the seat</Button>
        <Modal
          open={sheet}
          variant="sheet"
          title="Edit Software Engineer"
          onClose={() => setSheet(false)}
          stackBody
          footerStart="Last saved a moment ago"
          footer={
            <>
              <Button variant="ghost" onClick={() => setPrompt(true)}>Discard</Button>
              <Button variant="primary" onClick={() => setSheet(false)}>Save</Button>
            </>
          }
        >
          <FormField label="Name">{({ id }) => <Input id={id} defaultValue="Software Engineer" />}</FormField>
          <FormField label="Goal">{({ id }) => <Input id={id} defaultValue="Ship the product" />}</FormField>
        </Modal>
        <ConfirmModal
          open={prompt}
          destructive
          onClose={() => setPrompt(false)}
          onConfirm={() => { setPrompt(false); setSheet(false); }}
          title="Discard your edits?"
          message="The changes to this seat have not been saved."
          confirmLabel="Discard"
        />
      </>
    );
  },
};

/**
 * A surface mid-write. Escape, the veil and the close control all refuse, and
 * the close control says why rather than going quiet.
 */
export const Busy: Story = {
  render: function BusyStory() {
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    return (
      <>
        <Button onClick={() => { setOpen(true); setBusy(true); }}>Open a busy dialog</Button>
        <Modal
          open={open}
          onClose={() => setOpen(false)}
          title="Rotating the key"
          dismissable={!busy}
          footer={<Button variant="secondary" onClick={() => setBusy(false)}>Pretend it finished</Button>}
        >
          <p>{busy ? 'The request is in flight. Nothing here closes until it answers.' : 'Done. Escape works again.'}</p>
        </Modal>
      </>
    );
  },
};

/** A form: Enter from any field submits, and the confirm button is its submit. */
export const FormSubmit: Story = {
  render: function FormSubmitStory() {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');
    const [saved, setSaved] = useState('');
    return (
      <>
        <Button onClick={() => setOpen(true)}>New unit</Button>
        {saved ? <p>Saved: {saved}</p> : null}
        <Modal
          open={open}
          onClose={() => setOpen(false)}
          title="New unit"
          stackBody
          onSubmit={() => { setSaved(name); setOpen(false); }}
          footer={
            <>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" variant="primary">Create</Button>
            </>
          }
        >
          <FormField label="Name" helper="Press Enter to create it.">
            {({ id }) => <Input id={id} value={name} onChange={(event) => setName(event.target.value)} />}
          </FormField>
        </Modal>
      </>
    );
  },
};

/**
 * A field that takes `autoFocus` keeps it. Focus is not moved on top of it, and
 * it still returns to whatever opened the surface on the way out.
 */
export const AutoFocusField: Story = {
  render: function AutoFocusFieldStory() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button onClick={() => setOpen(true)}>Rename</Button>
        <Modal open={open} onClose={() => setOpen(false)} title="Rename the company" stackBody>
          <FormField label="Current name">{({ id }) => <Input id={id} defaultValue="Acme" readOnly />}</FormField>
          <FormField label="New name">
            {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
            {({ id }) => <Input id={id} autoFocus placeholder="The name it takes instead" />}
          </FormField>
        </Modal>
      </>
    );
  },
};

/** The side sheet: pinned to the inline end, full height, full width when narrow. */
const FOLDERS = [
  { value: 'top', label: 'Top level' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'q4', label: 'Marketing › Q4 review', tag: 'Current' },
  { value: 'press', label: 'Marketing › Q4 review › Press kit' },
  { value: 'board', label: 'Board' },
  { value: 'reports', label: 'Reports' },
  { value: 'weekly', label: 'Reports › Weekly' },
  { value: 'research', label: 'Research' },
  { value: 'interviews', label: 'Research › Interviews' },
  { value: 'drafts', label: 'Drafts' },
] as const;

/**
 * THE PHONE SHEET (`phoneSheet`): the Move to… dialog, whose body is a list
 * of folders a thumb works through. Above the phone breakpoint it is the
 * usual dialog; under it (the Mobile viewport) it takes the whole window, the
 * head and the foot standing still while the list scrolls between them. Every
 * dialog that does not ask for it keeps its shape on a phone.
 */
export const PhoneSheet: Story = {
  render: function PhoneSheetStory() {
    const [open, setOpen] = useState(false);
    const [folder, setFolder] = useState<string | null>('q4');
    const [query, setQuery] = useState('');
    const shown = FOLDERS.filter((option) => option.label.toLowerCase().includes(query.trim().toLowerCase()));
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
          stackBody
          title="Move 3 artifacts"
          footer={
            <>
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setOpen(false)}>Move here</Button>
            </>
          }
        >
          <Input
            aria-label="Find a folder"
            placeholder="Find a folder"
            leading={<SearchGlyph size="sm" />}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onClear={() => setQuery('')}
          />
          <ChoiceList label="Folder" options={shown} value={folder} onChange={setFolder} />
          <p style={{ margin: 0, color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)' }}>
            Moving never changes who can open them.
          </p>
        </Modal>
      </>
    );
  },
};

export const Sheet: Story = {
  render: function SheetStory() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button onClick={() => setOpen(true)}>Open the sheet</Button>
        <Modal
          open={open}
          variant="sheet"
          title="Machine user keys"
          subtitle="One active key at a time."
          onClose={() => setOpen(false)}
          stackBody
          footer={<Button variant="secondary" onClick={() => setOpen(false)}>Done</Button>}
        >
          <FormField label="Label">{({ id }) => <Input id={id} placeholder="What this key is for" />}</FormField>
          <p>Rotating replaces the key, and the old one stops authenticating immediately.</p>
        </Modal>
      </>
    );
  },
};

/**
 * An EDITOR sheet, committed from its own head.
 *
 * A sheet's body is a column a reader scrolls, and the commit pair at the
 * bottom of it is a pair they have to travel the whole form to reach and
 * travel back from to see the field they were applying. `headerActions` puts
 * them in the band at the top; with Cancel there, the close control is turned
 * off, because it is the same door drawn twice.
 */
export const SheetCommittedFromItsHead: Story = {
  render: function SheetHeadStory() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button onClick={() => setOpen(true)}>Edit the seat</Button>
        <Modal
          open={open}
          variant="sheet"
          title="Edit SRE Lead"
          onClose={() => setOpen(false)}
          stackBody
          showCloseButton={false}
          headerActions={
            <>
              <Button variant="secondary" size="small" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="small" onClick={() => setOpen(false)}>
                Apply
              </Button>
            </>
          }
          footerStart="A seat needs a name."
        >
          <FormField label="Name">{({ id }) => <Input id={id} placeholder="SRE Lead" />}</FormField>
          <FormField label="Goal">
            {({ id }) => <Input id={id} placeholder="Keep it running" />}
          </FormField>
        </Modal>
      </>
    );
  },
};

/**
 * A sheet reached from another: the step back leads the head, beside the
 * title it returns from, and the commit stays at the head's end.
 */
export const SheetWithAWayBack: Story = {
  render: function SheetBackStory() {
    const [at, setAt] = useState<'closed' | 'library' | 'options'>('closed');
    return (
      <>
        <Button onClick={() => setAt('library')}>Add a widget</Button>
        <Modal
          open={at === 'library'}
          variant="sheet"
          title="Add to Home"
          onClose={() => setAt('closed')}
          stackBody
        >
          <Button variant="secondary" onClick={() => setAt('options')}>
            Page shortcut
          </Button>
        </Modal>
        <Modal
          open={at === 'options'}
          variant="sheet"
          title="Add Page shortcut"
          subtitle="Choose what it shows, then add it."
          onBack={() => setAt('library')}
          backLabel="Back to widgets"
          onClose={() => setAt('closed')}
          stackBody
          headerActions={
            <Button variant="primary" size="small" onClick={() => setAt('closed')}>
              Add to Home
            </Button>
          }
        >
          <FormField label="Page">{({ id }) => <Input id={id} placeholder="Backups" />}</FormField>
        </Modal>
      </>
    );
  },
};

/** A destructive prompt, with an acknowledgement in its body. */
export const ConfirmDestructive: Story = {
  render: function ConfirmDestructiveStory() {
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [understood, setUnderstood] = useState(false);
    return (
      <>
        <Button variant="danger" onClick={() => setOpen(true)}>Delete project</Button>
        <ConfirmModal
          open={open}
          destructive
          submitting={busy}
          confirmDisabled={!understood}
          confirmDisabledReason="Acknowledge the consequence first."
          onClose={() => { setOpen(false); setUnderstood(false); }}
          onConfirm={async () => {
            setBusy(true);
            await new Promise((done) => setTimeout(done, 800));
            setBusy(false);
            setOpen(false);
            setUnderstood(false);
          }}
          title="Delete this project?"
          message="This removes the project, its members and every API key it holds."
          confirmLabel="Delete forever"
        >
          <Checkbox
            checked={understood}
            onChange={(event) => setUnderstood(event.target.checked)}
            label="I understand this cannot be undone"
          />
        </ConfirmModal>
      </>
    );
  },
};
