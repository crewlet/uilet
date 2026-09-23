import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Tag } from '@crewlethq/ui';
import { TriangleAlertGlyph } from '@crewlethq/icons/glyphs';

const meta: Meta<typeof Tag> = {
  title: 'UI/Tag',
  component: Tag,
  args: {
    children: 'Working',
    variant: 'neutral',
    appearance: 'soft',
    size: 'sm',
  },
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: ['neutral', 'info', 'success', 'warning', 'danger', 'brand'],
    },
    appearance: { control: 'inline-radio', options: ['soft', 'outline'] },
    size: { control: 'inline-radio', options: ['xs', 'sm', 'md'] },
    dot: { control: 'boolean' },
    monospace: { control: 'boolean' },
    animateIn: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Tag>;

const Row = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>{children}</div>
);

export const Basic: Story = {};

/**
 * Every tone renders its own word. A reader who cannot separate the warning
 * hue from the danger one still reads two different states, which is the rule
 * the whole palette is built to keep. The four states say what a piece of
 * work is doing: info is working, warning needs a person, danger is stopped,
 * success is done.
 */
export const Tones: Story = {
  render: () => (
    <Row>
      <Tag>Neutral</Tag>
      <Tag variant="info">Working</Tag>
      <Tag variant="warning">Needs a person</Tag>
      <Tag variant="danger">Stopped</Tag>
      <Tag variant="success">Done</Tag>
      <Tag variant="brand">Selected</Tag>
    </Row>
  ),
};

/**
 * A phase is a CATEGORY, and a category is the neutral tag with its word.
 *
 * Beside the state it is in, a phase reads as what it is: the state is the
 * one coloured thing on the row, and the phase is the word that says where
 * the work is. A hue per phase was a second colour vocabulary that said
 * nothing the word did not, spent from the hues the states are held apart in.
 */
export const Phases: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 12 }}>
      <Row>
        <Tag>Onboarding</Tag>
        <Tag variant="success">Done</Tag>
      </Row>
      <Row>
        <Tag>Execute</Tag>
        <Tag variant="info">Working</Tag>
      </Row>
      <Row>
        <Tag>Review</Tag>
        <Tag variant="warning">Needs a person</Tag>
      </Row>
    </div>
  ),
};

export const Appearances: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 12 }}>
      <Row>
        <Tag variant="success">soft</Tag>
        <Tag variant="warning">soft</Tag>
        <Tag variant="danger">soft</Tag>
      </Row>
      <Row>
        <Tag variant="success" appearance="outline">
          outline
        </Tag>
        <Tag variant="warning" appearance="outline">
          outline
        </Tag>
        <Tag variant="danger" appearance="outline">
          outline
        </Tag>
      </Row>
    </div>
  ),
};

/**
 * THREE HEIGHTS OF ONE PILL. `sm` is the approved design's pill and the
 * default: 22px with round ends, a 12px label in the medium weight and 9px
 * inside each end. `xs` is the design's 18px count pill for a packed row, at
 * the 11px step, and stays NON-INTERACTIVE, because a pointer target under
 * 24px fails WCAG 2.2 and the type refuses `onClick` at that step. `md` is a
 * small control's 26px, for a tag standing in a toolbar.
 */
export const Sizes: Story = {
  render: () => (
    <Row>
      <Tag size="xs" variant="info">
        xs
      </Tag>
      <Tag size="sm" variant="info">
        sm
      </Tag>
      <Tag size="md" variant="info">
        md
      </Tag>
    </Row>
  ),
};

/**
 * A TAG THAT ACTS IS TWO PIXELS TALLER THAN ONE THAT LABELS, and that is the
 * one place this pill departs from the design: the design draws its pill at
 * 22px whatever it does, which is a target under the 24px WCAG 2.2 accepts.
 * Everything else about the two is identical, so a row still reads as one set.
 * The same floor lifts a tag whose only control is its remove.
 */
export const LabelAndTarget: Story = {
  render: function Targets() {
    const [on, setOn] = useState(false);
    return (
      <Row>
        <Tag variant="info">Working</Tag>
        <Tag variant="info" pressed={on} onClick={() => setOn((value) => !value)}>
          Working
        </Tag>
        <Tag variant="info" onRemove={() => {}} removeAriaLabel="Remove working">
          Working
        </Tag>
      </Row>
    );
  },
};

export const WithMarkAndCount: Story = {
  render: () => (
    <Row>
      <Tag variant="info" dot>
        Working
      </Tag>
      <Tag variant="warning" dot leadingIcon={<TriangleAlertGlyph />}>
        Needs a person
      </Tag>
      <Tag variant="danger" count={3}>
        Failed
      </Tag>
      <Tag monospace>c1f4d2a</Tag>
    </Row>
  ),
};

/**
 * The press is carried by the boundary, never by a deeper fill: every deeper
 * fill measured under 4.5:1 for at least one tone in the light palette.
 */
export const Interactive: Story = {
  render: function InteractiveTag() {
    const [on, setOn] = useState(true);
    return (
      <Row>
        <Tag variant="danger" size="sm" count={3} pressed={on} onClick={() => setOn((value) => !value)}>
          Failed
        </Tag>
        <Tag variant="neutral" size="sm" pressed={!on} onClick={() => setOn((value) => !value)}>
          All
        </Tag>
      </Row>
    );
  },
};

export const Removable: Story = {
  render: function RemovableTags() {
    const [tags, setTags] = useState(['backend', 'sre', 'platform']);
    return (
      <Row>
        {tags.map((tag) => (
          <Tag key={tag} onRemove={() => setTags((rest) => rest.filter((one) => one !== tag))} removeAriaLabel={`Remove ${tag}`}>
            {tag}
          </Tag>
        ))}
      </Row>
    );
  },
};
