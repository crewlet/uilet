import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Button, ErrorBoundary, Stack } from '@crewlethq/ui';

const meta: Meta<typeof ErrorBoundary> = {
  title: 'UI/ErrorBoundary',
  component: ErrorBoundary,
};

export default meta;
type Story = StoryObj<typeof ErrorBoundary>;

/** A region that throws on its first render and draws on the next one. */
function Flaky({ broken }: { broken: boolean }) {
  if (broken) throw new Error('roles[0].llm: an object is not a valid child');
  return <p style={{ color: 'var(--color-text-secondary)' }}>The screen drew.</p>;
}

export const DefaultFallback: Story = {
  render: () => (
    <ErrorBoundary>
      <Flaky broken />
    </ErrorBoundary>
  ),
};

export const TryAgain: Story = {
  render: function TryAgainStory() {
    const [broken, setBroken] = useState(true);
    return (
      <Stack gap={4} align="start">
        <Button size="small" variant="secondary" onClick={() => setBroken((value) => !value)}>
          {broken ? 'Repair the data' : 'Break the data'}
        </Button>
        <ErrorBoundary>
          <Flaky broken={broken} />
        </ErrorBoundary>
      </Stack>
    );
  },
};

export const OwnFallback: Story = {
  render: () => (
    <ErrorBoundary
      fallback={(error, reset) => (
        <Stack gap={3} align="start">
          <p style={{ color: 'var(--color-feedback-danger-ink)', margin: 0 }}>{error.message}</p>
          <Button size="small" onClick={reset}>
            Draw it again
          </Button>
        </Stack>
      )}
    >
      <Flaky broken />
    </ErrorBoundary>
  ),
};
