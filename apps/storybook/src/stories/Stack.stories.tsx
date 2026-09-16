import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { AutoGrid, Inline, Spacer, Stack } from '@crewlethq/ui';

/*
 * The four layout primitives, in one story set: they are only ever seen
 * together, and a page assembled from them is the only way to tell whether the
 * rhythm reads. The file is named for Stack rather than "Layout", which is the
 * Container and Section story's title.
 */
const meta: Meta = {
  title: 'UI/Stack, Inline and AutoGrid',
};

export default meta;
type Story = StoryObj;

const Box = ({ children }: { children: ReactNode }) => (
  <div
    style={{
      background: 'var(--color-surface-subtle)',
      border: '1px solid var(--color-border-default)',
      borderRadius: 'var(--radius-md)',
      color: 'var(--color-text-secondary)',
      fontSize: 'var(--font-size-sm)',
      padding: 'var(--spacing-3)',
    }}
  >
    {children}
  </div>
);

export const Steps: Story = {
  render: () => (
    <Stack gap={6}>
      {([1, 2, 3, 4, 6] as const).map((gap) => (
        <Stack key={gap} gap={2}>
          <span style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)' }}>gap {gap}</span>
          <Inline gap={gap}>
            <Box>one</Box>
            <Box>two</Box>
            <Box>three</Box>
          </Inline>
        </Stack>
      ))}
    </Stack>
  ),
};

export const RowWithASpacer: Story = {
  render: () => (
    <Inline gap={2} style={{ border: '1px dashed var(--color-border-default)', padding: 'var(--spacing-2)' }}>
      <Box>Undo</Box>
      <Box>Redo</Box>
      <Spacer />
      <Box>Review and save</Box>
    </Inline>
  ),
};

export const Cards: Story = {
  render: () => (
    <Stack gap={5}>
      {(['sm', 'md', 'lg'] as const).map((min) => (
        <Stack key={min} gap={2}>
          <span style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)' }}>min {min}</span>
          <AutoGrid min={min}>
            {['Seats', 'Runs', 'Spend', 'Events', 'Schedules'].map((label) => (
              <Box key={label}>{label}</Box>
            ))}
          </AutoGrid>
        </Stack>
      ))}
    </Stack>
  ),
};

/**
 * A ROW THAT IS NOT FULL KEEPS ITS TRACKS. The grid lays down every column the
 * width has room for and leaves the ones nothing was placed in empty, so one
 * card is drawn at the width three cards would have been. With the tracks
 * collapsed instead, a company with one seat drew a single tile across the
 * whole pane, which is the same component saying something quite different
 * about how much there is.
 */
export const AShortRow: Story = {
  render: () => (
    <Stack gap={5}>
      <Stack gap={2}>
        <span style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)' }}>one card</span>
        <AutoGrid min="lg">
          <Box>Seats</Box>
        </AutoGrid>
      </Stack>
      <Stack gap={2}>
        <span style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)' }}>four cards</span>
        <AutoGrid min="lg">
          {['Seats', 'Runs', 'Spend', 'Events'].map((label) => (
            <Box key={label}>{label}</Box>
          ))}
        </AutoGrid>
      </Stack>
    </Stack>
  ),
};
