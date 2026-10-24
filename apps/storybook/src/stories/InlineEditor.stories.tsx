import type { Meta, StoryObj } from '@storybook/react-vite';
import { useRef, useState } from 'react';
import { PencilGlyph, TargetGlyph } from '@crewlethq/icons/glyphs';
import {
  Announcer,
  Button,
  Card,
  ConflictNote,
  FormField,
  InlineEditor,
  Textarea,
  VisuallyHidden,
  countCharacters,
} from '@crewlethq/ui';

/**
 * UI / InlineEditor.
 *
 * One record edited where it is read: its fields, then a bar with the
 * editing status, Cancel and Save. Mod+Enter saves and Escape cancels; Save
 * says why it does nothing rather than being a dead button. The draft and
 * the save are the caller's.
 */
const meta: Meta<typeof InlineEditor> = {
  title: 'UI/InlineEditor',
  component: InlineEditor,
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof InlineEditor>;

const MISSION = 'Make splitting shared expenses so easy that nobody ever has to chase a friend for money again.';
const MAX = 280;

function MissionCard({ conflict = false, failing = false }: { conflict?: boolean; failing?: boolean }) {
  const [saved, setSaved] = useState(MISSION);
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const edit = useRef<HTMLButtonElement | null>(null);
  const editing = draft !== null;
  const length = countCharacters(draft ?? '');

  const close = () => {
    setDraft(null);
    setError(null);
    // Back to the control that opened it, which is the caller's to know.
    requestAnimationFrame(() => edit.current?.focus());
  };

  const save = () => {
    setSaving(true);
    setError(null);
    window.setTimeout(() => {
      setSaving(false);
      if (failing) {
        setError('The mission could not be saved. Try again.');
        return;
      }
      setSaved((draft ?? '').trim());
      close();
    }, 900);
  };

  return (
    <div style={{ width: 520 }}>
      <Announcer />
      <Card as="section">
        <Card.Header
          divided={false}
          icon={<TargetGlyph />}
          actions={
            editing ? undefined : (
              <Button
                ref={edit}
                size="small"
                variant="ghost"
                leadingIcon={<PencilGlyph size="sm" />}
                aria-label="Edit the mission"
                onClick={() => setDraft(saved)}
              >
                Edit
              </Button>
            )
          }
        >
          <Card.Title>Mission</Card.Title>
        </Card.Header>
        <Card.Body>
          {editing ? (
            <InlineEditor
              label="Edit the mission"
              dirty={draft.trim() !== saved}
              invalid={draft.trim() === '' || length > MAX}
              saving={saving}
              error={error}
              notice={
                conflict ? (
                  <ConflictNote
                    subject="The mission"
                    changedBy="Maya"
                    actions={
                      <Button size="small" variant="secondary">
                        Reload
                      </Button>
                    }
                  />
                ) : undefined
              }
              onSave={save}
              onCancel={close}
            >
              <FormField label={<VisuallyHidden>Mission</VisuallyHidden>} limit={{ length, max: MAX }}>
                {(field) => (
                  <Textarea
                    id={field.id}
                    aria-describedby={field.describedBy}
                    error={field.invalid}
                    autoResize
                    rows={3}
                    value={draft}
                    readOnly={saving}
                    onChange={(event) => setDraft(event.target.value)}
                  />
                )}
              </FormField>
            </InlineEditor>
          ) : (
            <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{saved}</p>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}

/** A statement's card, read, then edited in place: press Edit. */
export const InACard: Story = { render: () => <MissionCard /> };

/** The save fails: the failure is an alert above the bar, and the draft stays. */
export const SaveFails: Story = { render: () => <MissionCard failing /> };

/** Somebody else saved first: a `ConflictNote` in the notice slot. */
export const Conflict: Story = { render: () => <MissionCard conflict /> };
