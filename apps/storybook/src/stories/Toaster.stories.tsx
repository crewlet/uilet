import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Button, ToastProvider, Toaster, useToast, type Toast } from '@crewlethq/ui';
import { ShieldPersonGlyph } from '@crewlethq/icons/glyphs';

const meta: Meta<typeof Toaster> = {
  title: 'UI/Toaster',
  component: Toaster,
};

export default meta;
type Story = StoryObj<typeof Toaster>;

let seq = 0;
const nextId = () => (seq += 1);

/** The controlled form: the application holds the stack and the Toaster draws it. */
function makeDemo(makeToast: () => Toast, label = 'Trigger toast') {
  return function Demo() {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const push = () => setToasts((prev) => [...prev, makeToast()]);
    const dismiss = (id: string | number) => setToasts((prev) => prev.filter((one) => one.id !== id));
    return (
      <>
        <Button onClick={push}>{label}</Button>
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
      message: 'The agent restarted to pick up the new policy.',
    }));
    return <Demo />;
  },
};

/**
 * A success goes by itself after four seconds: long enough to read one line,
 * short enough not to sit over the row the reader is looking at next.
 */
export const Success: Story = {
  render: () => {
    const Demo = makeDemo(() => ({
      id: nextId(),
      variant: 'success',
      message: 'Saved. The engine is applying it.',
    }));
    return <Demo />;
  },
};

/**
 * A FAILURE DOES NOT AUTO-DISMISS. A success confirms something the reader
 * already knows they asked for; a failure is news, and news that removes
 * itself is news somebody misses while reading the form they were about to
 * fix.
 *
 * It is also the one toned strip, and it gets the hue twice: the fill step on
 * the edge, where 3:1 is the floor a boundary has to clear, and the ink step
 * on every word, which is the measured text pair on this surface. Never the
 * fill behind a word.
 */
export const Failure: Story = {
  render: () => {
    const Demo = makeDemo(
      () => ({
        id: nextId(),
        variant: 'danger',
        title: 'The write was refused',
        message: 'The revision on the node moved while this form was open.',
        action: { label: 'Reload', onClick: () => {} },
      }),
      'Trigger a refusal',
    );
    return <Demo />;
  },
};

export const Warning: Story = {
  render: () => {
    const Demo = makeDemo(() => ({
      id: nextId(),
      variant: 'warning',
      message: 'Two seats are waiting on an approval.',
    }));
    return <Demo />;
  },
};

/**
 * A variant of the application's own. It brings its own glyph and title; the
 * component supplies neither, and announces it assertively.
 */
export const Quota: Story = {
  render: () => {
    const Demo = makeDemo(
      () => ({
        id: nextId(),
        variant: 'quota',
        icon: <ShieldPersonGlyph size="md" />,
        title: 'Usage limit reached',
        message: 'This company has used its token allowance for the month.',
        action: { label: 'See plans', href: '#/billing' },
      }),
      'Trigger a limit notice',
    );
    return <Demo />;
  },
};

function Writer() {
  const toast = useToast();
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <Button onClick={() => toast.ok('Saved. The engine is applying it.')}>Save</Button>
      <Button variant="danger" onClick={() => toast.failed('The write was refused.')}>
        Refuse the write
      </Button>
    </div>
  );
}

/**
 * The provider form: a screen calls `useToast().ok()` and never holds a stack
 * of its own. With no provider above it the hook is a no-op rather than a
 * crash, so a shared component can report an outcome without making a toast
 * host a hard dependency of every application that imports it.
 */
export const WithAProvider: Story = {
  render: () => (
    <ToastProvider>
      <Writer />
    </ToastProvider>
  ),
};
