import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Button, ConfirmModal, FormField, Input, Modal } from '@crewlethq/ui';

const meta: Meta<typeof Modal> = {
  title: 'UI/Modal',
  component: Modal,
};

export default meta;
type Story = StoryObj<typeof Modal>;

export const Basic: Story = {
  render: () => {
    function Demo() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <Button onClick={() => setOpen(true)}>Open modal</Button>
          <Modal
            open={open}
            onClose={() => setOpen(false)}
            title="Edit project name"
            subtitle="Visible to project members only."
            footer={
              <>
                <Button variant="tertiary" onClick={() => setOpen(false)}>Cancel</Button>
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
    }
    return <Demo />;
  },
};

export const Sizes: Story = {
  render: () => {
    function Demo() {
      const [size, setSize] = useState<'sm' | 'md' | 'lg' | 'xl' | null>(null);
      return (
        <div style={{ display: 'flex', gap: 8 }}>
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
            <p>The dialog frame caps at the size variant's max-width.</p>
          </Modal>
        </div>
      );
    }
    return <Demo />;
  },
};

export const ConfirmDestructive: Story = {
  render: () => {
    function Demo() {
      const [open, setOpen] = useState(false);
      const [busy, setBusy] = useState(false);
      const onConfirm = async () => {
        setBusy(true);
        await new Promise((r) => setTimeout(r, 800));
        setBusy(false);
        setOpen(false);
      };
      return (
        <>
          <Button variant="danger" onClick={() => setOpen(true)}>Delete project</Button>
          <ConfirmModal
            open={open}
            onClose={() => setOpen(false)}
            onConfirm={onConfirm}
            destructive
            title="Delete this project?"
            message="This permanently removes the project, its members, and every API key. The action cannot be undone."
            confirmLabel="Delete forever"
            submitting={busy}
          />
        </>
      );
    }
    return <Demo />;
  },
};

export const ConfirmWithPhrase: Story = {
  render: () => {
    function Demo() {
      const [open, setOpen] = useState(false);
      const [phrase, setPhrase] = useState('');
      const expected = 'DELETE';
      return (
        <>
          <Button variant="danger" onClick={() => setOpen(true)}>Type to confirm</Button>
          <ConfirmModal
            open={open}
            onClose={() => { setOpen(false); setPhrase(''); }}
            onConfirm={() => { setOpen(false); setPhrase(''); }}
            destructive
            title="Are you sure?"
            message={<>Type <strong>{expected}</strong> to confirm.</>}
            confirmDisabled={phrase !== expected}
            confirmLabel="Delete"
          >
            <FormField label="Confirmation">
              {({ id }) => (
                <Input id={id} value={phrase} onChange={(e) => setPhrase(e.target.value)} placeholder={expected} />
              )}
            </FormField>
          </ConfirmModal>
        </>
      );
    }
    return <Demo />;
  },
};
