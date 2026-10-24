import type { Meta, StoryObj } from '@storybook/react-vite';
import { TypeSpecimen } from '@crewlethq/ui';

const meta: Meta<typeof TypeSpecimen> = {
  title: 'UI/TypeSpecimen',
  component: TypeSpecimen,
};

export default meta;
type Story = StoryObj<typeof TypeSpecimen>;

/**
 * THE TYPOGRAPHY CARD: the heading and the body face, each shown in itself,
 * "Aa" large and a line read in it, with its role and its name in the
 * interface's own type.
 */
export const Pair: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 24, maxWidth: 720 }}>
      <TypeSpecimen label="Heading" family="Geist" fontFamily="var(--font-family-sans)" weight="semibold" detail="Crewlet's face" />
      <TypeSpecimen label="Body" family="Geist Mono" fontFamily="var(--font-family-mono)" detail="Crewlet's face" />
    </div>
  ),
};

/**
 * A FACE THIS PAGE HAS NOT LOADED falls back to the package's sans, so an
 * uploaded face still loading (or never uploaded) reads as the interface's
 * type rather than the browser's default.
 */
export const Fallback: Story = {
  render: () => (
    <div style={{ maxWidth: 360 }}>
      <TypeSpecimen label="Heading" family="Acme Display" detail="Uploaded, 4 files" sample="Plan the quarter in one page." />
    </div>
  ),
};

/** The small specimen: the lead of a face's option in a select, the letters smaller and the line gone. */
export const Small: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 12, maxWidth: 280 }}>
      <TypeSpecimen size="sm" label="Kit" family="Geist" fontFamily="var(--font-family-sans)" />
      <TypeSpecimen size="sm" label="Kit" family="Geist Mono" fontFamily="var(--font-family-mono)" />
      <TypeSpecimen size="sm" label="System stack" family="Serif" fontFamily="ui-serif, Georgia, serif" />
    </div>
  ),
};
