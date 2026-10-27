import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Button, ToastProvider, Toaster, readingDuration, useToast, type Toast } from '@crewlethq/ui';
import { ShieldUserGlyph } from '@crewlethq/icons/glyphs';

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
/**
 * A toast that goes by itself stays as long as its words take to read: the
 * short one goes after four seconds, the long one after about nine, and
 * neither names a duration. `readingDuration` is the same rule, exported.
 */
export const ReadingTime: Story = {
  render: () => {
    const long =
      'The launch date holds a date without a time, so it was saved as 2026-03-04, ' +
      'the day 2026-03-05T04:00:00Z falls on in America/Los_Angeles.';
    const Short = makeDemo(() => ({ id: nextId(), variant: 'success', message: 'Saved.' }), 'A short one');
    const Long = makeDemo(
      () => ({ id: nextId(), variant: 'info', title: 'Updated ENG-42', message: long }),
      `A long one (${Math.round(readingDuration(`Updated ENG-42 ${long}`) / 1000)}s)`,
    );
    return (
      <div style={{ display: 'flex', gap: 8 }}>
        <Short />
        <Long />
      </div>
    );
  },
};

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
 * It is drawn as every strip is, with its hue on its mark alone: the glyph in
 * the danger ink step, which is measured as text on every theme, while the
 * title and the message keep the strip's own inks and the edge stays the
 * hairline. Its one filled thing is the way out of it, the action on the
 * danger fill. It carries no wash, because the wash is the countdown and a
 * failure has none.
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
 * component supplies neither, and announces it assertively. The glyph is
 * passed at `lg`, the 20px every built-in variant draws its mark at.
 */
export const Quota: Story = {
  render: () => {
    const Demo = makeDemo(
      () => ({
        id: nextId(),
        variant: 'quota',
        icon: <ShieldUserGlyph size="lg" />,
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

const PANEL = 420;

function BesideAPanel() {
  const [open, setOpen] = useState(true);
  return (
    <ToastProvider inset={{ inline: open ? PANEL : 0 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <Writer />
        <Button variant="secondary" onClick={() => setOpen(!open)}>
          {open ? 'Close the panel' : 'Open the panel'}
        </Button>
      </div>
      {open ? (
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            width: PANEL,
            background: 'var(--color-surface-subtle)',
            borderLeft: '1px solid var(--color-border-default)',
          }}
        />
      ) : null}
    </ToastProvider>
  );
}

/**
 * Beside a right panel: the host sets `inset.inline` to the width the panel
 * occupies, so the stack stands at the bottom right of the page beside it
 * rather than over the panel's composer. Close the panel and toasts move back
 * to the window's corner, even while one is up.
 */
export const BesideARightPanel: Story = { render: () => <BesideAPanel /> };

/**
 * Above a phone sheet's foot: `inset.block` is the height of the sheet's foot
 * (its composer and disclaimer), so a toast never covers the composer. View it
 * under 480px wide, where the stack spans the width.
 */
export const AboveAPhoneSheetFoot: Story = {
  render: () => (
    <ToastProvider inset={{ block: 112 }}>
      <Writer />
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          height: 112,
          background: 'var(--color-surface-subtle)',
          borderTop: '1px solid var(--color-border-default)',
        }}
      />
    </ToastProvider>
  ),
};
