import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Tag } from '@crewlethq/ui';
import { WarningGlyph } from '@crewlethq/icons/glyphs';

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
      options: [
        'neutral',
        'info',
        'success',
        'warning',
        'danger',
        'brand',
        'phase-onboarding',
        'phase-execute',
        'phase-review',
      ],
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
 * the whole palette is built to keep.
 */
export const Tones: Story = {
  render: () => (
    <Row>
      <Tag>Neutral</Tag>
      <Tag variant="info">Info</Tag>
      <Tag variant="success">Working</Tag>
      <Tag variant="warning">Needs a person</Tag>
      <Tag variant="danger">Broken</Tag>
      <Tag variant="brand">Selected</Tag>
    </Row>
  ),
};

/**
 * The engine's whole phase vocabulary, and nothing else takes these hues.
 *
 * A PHASE IS SET IN THE MICRO-LABEL REGISTER, uppercase and tracked open,
 * where a state is set in the badge's own. Phase is the one categorical
 * identity the product spends colour on outside a chart, and the second
 * register is what separates it at a glance from the state badge beside it on
 * the same row, for a reader who cannot separate the two hues.
 */
export const Phases: Story = {
  render: () => (
    <Row>
      <Tag variant="phase-onboarding">onboarding</Tag>
      <Tag variant="phase-execute">execute</Tag>
      <Tag variant="phase-review">review</Tag>
    </Row>
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
 * THREE HEIGHTS OF ONE BADGE. `sm` is the engine's own geometry and the
 * default: an 11px label in the medium weight, a 4px corner, one pixel of
 * padding above and below and eight on each side. `xs` is a denser mark for a
 * packed row and stays NON-INTERACTIVE, because a pointer target under 24px
 * fails WCAG 2.2 and the type refuses `onClick` at that step. `md` is a small
 * control's height, for a tag standing in a toolbar.
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
 * A TAG THAT ACTS IS FOUR PIXELS TALLER THAN ONE THAT LABELS, and that is the
 * one place this pill departs from the engine's badge: the engine draws its
 * actionable badge at the inert one's 20px, which is a target under the 24px
 * WCAG 2.2 accepts. Everything else about the two is identical, so a row still
 * reads as one set. The same floor lifts a tag whose only control is its
 * remove.
 */
export const LabelAndTarget: Story = {
  render: function Targets() {
    const [on, setOn] = useState(false);
    return (
      <Row>
        <Tag variant="success">Working</Tag>
        <Tag variant="success" pressed={on} onClick={() => setOn((value) => !value)}>
          Working
        </Tag>
        <Tag variant="success" onRemove={() => {}} removeAriaLabel="Remove working">
          Working
        </Tag>
      </Row>
    );
  },
};

export const WithMarkAndCount: Story = {
  render: () => (
    <Row>
      <Tag variant="success" dot>
        Working
      </Tag>
      <Tag variant="warning" dot leadingIcon={<WarningGlyph />}>
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
