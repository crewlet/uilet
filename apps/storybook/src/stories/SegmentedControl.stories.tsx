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

/**
 * A single-choice filter that drives a URL parameter, where a choice is NOT
 * free: every change re-runs the screen's query. With `activate="manual"` the
 * arrows move focus alone and Enter or Space chooses, so crossing the row
 * costs one query rather than one per keystroke — and the tab stop follows
 * focus, so Tab out and Tab back returns to the option the reader left.
 *
 * Arrow across both rows with the keyboard and watch the counters.
 */
export const ManualActivation: Story = {
  render: () => {
    function Row({ activate }: { activate: 'automatic' | 'manual' }) {
      const [kind, setKind] = useState('all');
      const [queries, setQueries] = useState(0);
      return (
        <div style={{ display: 'grid', gap: 8, justifyItems: 'start' }}>
          <SegmentedControl
            label={`Event kind (${activate})`}
            semantics="radio"
            activate={activate}
            value={kind}
            onValueChange={(next) => {
              setKind(next);
              setQueries((ran) => ran + 1);
            }}
            options={[
              { value: 'all', label: 'All' },
              { value: 'decision', label: 'Decision', count: 12 },
              { value: 'delivery', label: 'Delivery', count: 4 },
              { value: 'fault', label: 'Fault', count: 0 },
            ]}
          />
          <span style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)' }}>
            {activate}: {queries} quer{queries === 1 ? 'y' : 'ies'} run
          </span>
        </div>
      );
    }
    return (
      <div style={{ display: 'grid', gap: 24 }}>
        <Row activate="automatic" />
        <Row activate="manual" />
      </div>
    );
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
