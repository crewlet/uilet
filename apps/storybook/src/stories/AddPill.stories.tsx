import type { Meta, StoryObj } from '@storybook/react-vite';
import { AddPill } from '@crewlethq/ui';
import { CrewletFigure } from '@crewlethq/icons';
import { CreateNewFolderGlyph, PersonAddGlyph } from '@crewlethq/icons/glyphs';

/**
 * UI / AddPill.
 *
 * The control that adds a child: one quiet mark at rest, splitting into the
 * kinds it can add when you point at it.
 *
 * Try it: move onto the mark and the pill opens so the choices can be read;
 * move off and it closes again. Press the mark and it stays open, so you can
 * move onto a choice at leisure; a press anywhere else, Escape, or a choice
 * closes it. From the keyboard it is a disclosure: the mark carries
 * `aria-expanded`, Enter opens it and takes focus to the first choice, and
 * Escape gives focus back.
 *
 * It is drawn at about a third of an org chart node's height and hit at a full
 * pointer target, so a resting chart is cards and branches with one small mark
 * on each branch rather than a field of buttons. Ask your system for reduced
 * motion and it is simply open or closed.
 *
 * It is GREEN, and it is the one thing on a chart drawn in that hue, so "the
 * green plus" names a control rather than describing one. Two steps serve two
 * surfaces: `sm` splits over the mark on a branch, `md` opens beside the mark
 * in a table row.
 */
const meta: Meta<typeof AddPill> = {
  title: 'UI/AddPill',
  component: AddPill,
};

export default meta;
type Story = StoryObj<typeof AddPill>;

const SECTIONS = [
  { key: 'unit', label: 'Add a unit', icon: <CreateNewFolderGlyph />, onSelect: () => {} },
  { key: 'agent', label: 'Add an agent seat', icon: <CrewletFigure />, onSelect: () => {} },
  { key: 'human', label: 'Add a human seat', icon: <PersonAddGlyph />, onSelect: () => {} },
];

export const Default: Story = {
  args: { label: 'Add to Engineering', sections: SECTIONS },
};

/**
 * Two choices rather than three. The pill is as wide as a pointer target per
 * section, so it grows with what it offers; past four it is wider than the
 * node it hangs under, which is where a menu is the right answer instead.
 */
export const TwoChoices: Story = {
  args: { label: 'Add to Platform', sections: SECTIONS.slice(0, 2) },
};

/**
 * A choice the draft cannot take right now is REFUSED rather than removed: a
 * reader learns the chart offers it and that it will not do it now, which a
 * missing third of a pill does not say.
 */
export const OneRefused: Story = {
  args: {
    label: 'Add to Engineering',
    sections: [SECTIONS[0]!, SECTIONS[1]!, { ...SECTIONS[2]!, disabled: true }],
  },
};

/**
 * On a branch, which is where it is drawn in an org chart: the disc carries the
 * page's own ground, so the line it sits on stops at its edge rather than
 * running through the mark.
 */
export const OnABranch: Story = {
  args: { label: 'Add to Engineering', sections: SECTIONS },
  render: (args) => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        height: '8rem',
        background: `linear-gradient(var(--color-border-control), var(--color-border-control)) 50% 0 / 3px 100% no-repeat`,
      }}
    >
      <div style={{ marginTop: 'var(--spacing-7)' }}>
        <AddPill {...args} />
      </div>
    </div>
  ),
};

/**
 * The ROW step: one control step, drawn at the size it is hit, with the choices
 * opening BESIDE the mark rather than over it. A table row has controls of its
 * own at its end, and a pill drawn over them would cover them.
 */
export const InARow: Story = {
  args: { label: 'Add to Engineering', sections: SECTIONS, size: 'md', layout: 'inline' },
};

/**
 * A choice refused WITH ITS REASON, which is what the read-only rule asks for:
 * the reason is read after the choice's own name, so a reader who cannot see
 * the pill is told why the press will do nothing.
 */
export const RefusedWithAReason: Story = {
  args: {
    label: 'Add to Engineering',
    sections: [
      SECTIONS[0]!,
      SECTIONS[1]!,
      { ...SECTIONS[2]!, disabledReason: 'This draft is read-only while a check is out.' },
    ],
  },
};
