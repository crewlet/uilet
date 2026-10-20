import type { Meta, StoryObj } from '@storybook/react-vite';
import { ArtifactMakeRow, type ArtifactMakeRowItem } from '@crewlethq/ui';

const meta: Meta<typeof ArtifactMakeRow> = {
  title: 'UI/ArtifactMakeRow',
  component: ArtifactMakeRow,
};

export default meta;
type Story = StoryObj<typeof ArtifactMakeRow>;

const ITEMS: ArtifactMakeRowItem[] = [
  { kind: 'doc', label: 'Docs', detail: 'Write and print', href: '#/artifacts/new/doc' },
  { kind: 'slides', label: 'Slides', detail: 'A deck to present', href: '#/artifacts/new/slides' },
  { kind: 'design', label: 'Design', detail: 'Screens on a canvas', href: '#/artifacts/new/design' },
  { kind: 'dashboard', label: 'Dashboard', detail: 'Live figures', href: '#/artifacts/new/dashboard' },
  { kind: 'html', label: 'HTML', detail: 'Any web page', href: '#/artifacts/new/html' },
  { kind: 'sheet', label: 'Sheet', detail: 'A table to fill in', href: '#/artifacts/new/sheet' },
];

/**
 * The gallery's Make something new tray: each kind's glyph on its own tint,
 * its name and what it is for, the whole item one link named by the kind.
 * The tray is Crewlet's dotted field, and an item lifts off it as a card
 * under the pointer. Switch the theme to see every hue repainted.
 */
export const Row: Story = {
  render: () => (
    <div style={{ width: 1120 }}>
      <ArtifactMakeRow aria-label="Make something new" items={ITEMS} />
    </div>
  ),
};

/**
 * THE TRAY SIZES ITSELF BY ITS OWN WIDTH: one line with what each kind is
 * for on a wide page, the six names under their marks on a laptop's narrower
 * column, and three across in two lines on a phone. A name is never cut.
 */
export const Widths: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 24 }}>
      {[1120, 720, 360].map((width) => (
        <div key={width} style={{ width }}>
          <ArtifactMakeRow aria-label={`Make something new, ${width} wide`} items={ITEMS} />
        </div>
      ))}
    </div>
  ),
};

/** A kind the reader cannot start stays a stop on the row and says why. */
export const Unavailable: Story = {
  render: () => (
    <div style={{ width: 1120 }}>
      <ArtifactMakeRow
        aria-label="Make something new"
        items={ITEMS.map((item) =>
          item.kind === 'sheet'
            ? { ...item, href: undefined, disabledReason: 'Starting a sheet needs the Artifacts app. Ask an administrator for it.' }
            : item,
        )}
      />
    </div>
  ),
};
