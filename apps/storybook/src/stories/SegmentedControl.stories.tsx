import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { SegmentedControl, TabPanel } from '@crewlethq/ui';
import { AccountTreeGlyph, GroupGlyph, ListGlyph } from '@crewlethq/icons/glyphs';

const meta: Meta<typeof SegmentedControl> = {
  title: 'UI/SegmentedControl',
  component: SegmentedControl,
};

export default meta;
type Story = StoryObj<typeof SegmentedControl>;

/**
 * A SETTING: announced as a radio group, and the arrows select as they move,
 * because a choice that is not in the URL costs nothing to change.
 */
export const Setting: Story = {
  render: () => {
    function Demo() {
      const [density, setDensity] = useState('normal');
      return (
        <SegmentedControl
          label="Density"
          semantics="radio"
          value={density}
          onValueChange={setDensity}
          options={[
            { value: 'compact', label: 'S', srLabel: 'Compact', title: 'Compact' },
            { value: 'normal', label: 'M', srLabel: 'Normal', title: 'Normal' },
            { value: 'comfortable', label: 'L', srLabel: 'Comfortable', title: 'Comfortable' },
          ]}
        />
      );
    }
    return <Demo />;
  },
};

/**
 * A row of SECTIONS: the arrows move focus and Enter or Space selects,
 * because a section pushes a history entry.
 */
export const Sections: Story = {
  render: () => {
    function Demo() {
      const [lens, setLens] = useState('chart');
      return (
        <div style={{ width: 520 }}>
          <SegmentedControl
            label="View"
            semantics="tabs"
            panelId="org-lens"
            value={lens}
            onValueChange={setLens}
            options={[
              { value: 'chart', label: 'Chart', icon: <AccountTreeGlyph /> },
              { value: 'directory', label: 'Directory', icon: <ListGlyph />, count: 24 },
              { value: 'charter', label: 'Charter', icon: <GroupGlyph /> },
            ]}
          />
          <TabPanel id="org-lens" value={lens}>
            <p style={{ paddingTop: 16 }}>The {lens} lens.</p>
          </TabPanel>
        </div>
      );
    }
    return <Demo />;
  },
};

/** A choice a reader has to read before making it is a card row, not a chip. */
export const Cards: Story = {
  render: () => {
    function Demo() {
      const [template, setTemplate] = useState('startup');
      return (
        <div style={{ width: 460 }}>
          <SegmentedControl
            label="Template"
            semantics="radio"
            value={template}
            onValueChange={setTemplate}
            options={[
              {
                value: 'startup',
                label: 'Startup',
                description: 'One unit and three seats, with the founder as its lead.',
              },
              {
                value: 'agency',
                label: 'Agency',
                description: 'A unit per client, each with its own delivery lead.',
              },
              {
                value: 'empty',
                label: 'Empty',
                description: 'Nothing but the founder. Every seat is added by hand.',
              },
            ]}
          />
        </div>
      );
    }
    return <Demo />;
  },
};
