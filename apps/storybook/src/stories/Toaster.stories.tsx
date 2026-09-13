import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Button, Toaster, type Toast } from '@crewlethq/ui';

const meta: Meta<typeof Toaster> = {
  title: 'UI/Toaster',
  component: Toaster,
};

export default meta;
type Story = StoryObj<typeof Toaster>;

let seq = 0;
const nextId = () => (seq += 1);

function makeDemo(makeToast: () => Toast) {
  return function Demo() {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const push = () => setToasts((prev) => [...prev, makeToast()]);
    const dismiss = (id: string | number) => setToasts((prev) => prev.filter((t) => t.id !== id));
    return (
      <>
        <Button onClick={push}>Trigger toast</Button>
        <Toaster toasts={toasts} onDismiss={dismiss} />
      </>
    );
  };
}

export const Info: Story = {
  render: () => {
    const Demo = makeDemo(() => ({
      id: nextId(),
      variant: 'info',
      message: 'Heads up: the agent restarted to pick up new policies.',
      duration: 10000,
    }));
    return <Demo />;
  },
};

export const Success: Story = {
  render: () => {
    const Demo = makeDemo(() => ({
      id: nextId(),
      variant: 'success',
      title: 'Settings saved',
      message: 'Your notification preferences were updated.',
      duration: 10000,
    }));
    return <Demo />;
  },
};

export const Warn: Story = {
  render: () => {
    const Demo = makeDemo(() => ({
      id: nextId(),
      variant: 'warn',
      title: 'Storage almost full',
      message: 'This workspace has used 90% of its storage.',
      duration: 10000,
    }));
    return <Demo />;
  },
};

export const Error: Story = {
  render: () => {
    const Demo = makeDemo(() => ({
      id: nextId(),
      variant: 'error',
      message: 'Could not save the member role. Please try again.',
      duration: 10000,
    }));
    return <Demo />;
  },
};

export const WithButtonAction: Story = {
  render: () => {
    const Demo = makeDemo(() => ({
      id: nextId(),
      variant: 'info',
      title: 'Update available',
      message: 'Version 2.4 is available. Refresh to update.',
      duration: 0,
      action: { label: 'Refresh', onClick: () => alert('reload') },
    }));
    return <Demo />;
  },
};

export const WithLinkAction: Story = {
  render: () => {
    const Demo = makeDemo(() => ({
      id: nextId(),
      variant: 'warn',
      title: 'Connection unstable',
      message: 'Some changes may take longer to sync.',
      duration: 10000,
      action: { label: 'View status', href: '#/status' },
    }));
    return <Demo />;
  },
};

export const CustomRenderBody: Story = {
  render: () => {
    const Demo = makeDemo(() => ({
      id: nextId(),
      variant: 'quota',
      duration: 10000,
      renderBody: ({ onDismiss }) => (
        <>
          <span className="crewlet-toast__icon">
            <span className="material-symbols-outlined" aria-hidden>shield_person</span>
          </span>
          <div className="crewlet-toast__body">
            <div className="crewlet-toast__title">Limit reached</div>
            <div className="crewlet-toast__message">
              This workspace has reached its project limit. Archive a project to add another.
            </div>
            <div className="crewlet-toast__actions">
              <Button size="small" variant="accent" onClick={onDismiss}>Manage projects</Button>
            </div>
          </div>
        </>
      ),
    }));
    return <Demo />;
  },
};

export const Sticky: Story = {
  render: () => {
    const Demo = makeDemo(() => ({
      id: nextId(),
      variant: 'info',
      message: 'This toast has duration: 0 and stays until dismissed.',
      duration: 0,
    }));
    return <Demo />;
  },
};
