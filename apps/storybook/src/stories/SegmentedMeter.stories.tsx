import type { CSSProperties } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card, SegmentedMeter, StatCard, StatusDot, type SegmentedMeterSegment } from '@crewlethq/ui';

const CREW: SegmentedMeterSegment[] = [
  { id: 'working', value: 4, tone: 'info', label: 'working' },
  { id: 'waiting', value: 1, tone: 'warning', label: 'waiting' },
  { id: 'stopped', value: 1, tone: 'danger', label: 'stopped' },
];

const meta: Meta<typeof SegmentedMeter> = {
  title: 'UI/SegmentedMeter',
  component: SegmentedMeter,
  args: {
    segments: CREW,
    total: 7,
    remainderLabel: 'idle',
    size: 'default',
  },
  argTypes: {
    size: { control: 'inline-radio', options: ['default', 'compact'] },
    total: { control: 'number' },
    remainderLabel: { control: 'text' },
    decorative: { control: 'boolean' },
  },
  /*
   * On a card, which is where the design draws every one, at the 96px a stat
   * tile's figure takes. A story that draws its own card replaces the render.
   */
  render: (args) => (
    <Card>
      <Card.Body>
        <div style={{ width: 96 }}>
          <SegmentedMeter {...args} />
        </div>
      </Card.Body>
    </Card>
  ),
};

export default meta;
type Story = StoryObj<typeof SegmentedMeter>;

const caption: CSSProperties = { fontSize: 12, color: 'var(--color-text-tertiary)' };

/**
 * THE APPROVED DESIGN'S STATE BAR: four of seven seats working, one waiting on
 * a person, one stopped, and the rest idle. Each part is its share of the
 * whole, 2px apart, in its state's fill; what the parts leave of the whole is
 * the remainder, in the strong hairline's colour. It is one image to a screen
 * reader, named "4 working, 1 waiting, 1 stopped, 1 idle of 7".
 */
export const Basic: Story = {};

/**
 * AT THE END OF A TILE'S VALUE LINE, where the design draws it, 96px wide.
 * The value and the line under it already say every part, so the bar here is
 * `decorative` and says nothing itself.
 */
export const InAStatCard: Story = {
  render: () => (
    <div style={{ width: 280 }}>
      <StatCard
        label="Agents working now"
        value="4"
        unit="/ 7"
        trend={<SegmentedMeter segments={CREW} total={7} decorative />}
        sub="1 waiting · 1 stopped · 1 idle"
      />
    </div>
  ),
};

/**
 * THE COMPACT STEP is the design's 6px progress bar under a project's name:
 * what is done, what is active, and the rest still to do, each row read as
 * "38 done, 12 active, 11 to do of 61". The colours are named once, above the
 * rows, which is where the design puts the key.
 */
export const ProjectProgress: Story = {
  render: () => {
    const projects = [
      { key: 'ENG', name: 'Core platform', done: 38, active: 12, todo: 11 },
      { key: 'PROD', name: 'Product', done: 14, active: 5, todo: 9 },
      { key: 'LEAD', name: 'Leadership', done: 9, active: 1, todo: 3 },
    ];
    return (
      <Card style={{ width: 360 }}>
        <Card.Body>
          <div style={{ display: 'flex', gap: 10, ...caption, marginBottom: 12 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <StatusDot tone="success" /> Done
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <StatusDot tone="info" /> Active
            </span>
            <span>The rest is to do</span>
          </div>
          <div style={{ display: 'grid', gap: 16 }}>
            {projects.map((project) => {
              const whole = project.done + project.active + project.todo;
              return (
                <div key={project.key} style={{ display: 'grid', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span>{project.name}</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>{Math.round((project.done / whole) * 100)}%</span>
                  </div>
                  <SegmentedMeter
                    size="compact"
                    segments={[
                      { id: 'done', value: project.done, tone: 'success', label: 'done' },
                      { id: 'active', value: project.active, tone: 'info', label: 'active' },
                    ]}
                    total={whole}
                    remainderLabel="to do"
                  />
                </div>
              );
            })}
          </div>
        </Card.Body>
      </Card>
    );
  },
};

/**
 * EVERY STATE A PART CAN BE IN: working (info), waiting on a person
 * (warning), stopped (danger) and done (success). The quiet part of a whole
 * is never a fifth tone: it is the remainder, drawn from `total`.
 */
export const EveryState: Story = {
  args: {
    segments: [
      { id: 'working', value: 3, tone: 'info', label: 'working' },
      { id: 'waiting', value: 2, tone: 'warning', label: 'waiting' },
      { id: 'stopped', value: 1, tone: 'danger', label: 'stopped' },
      { id: 'done', value: 2, tone: 'success', label: 'done' },
    ],
    total: 10,
  },
};

/**
 * A PART OF NOTHING IS NOT DRAWN, rather than drawn at no width: an empty box
 * would still take a gap on each side. And no part is ever narrower than the
 * kit's 7px status dot, so one stopped seat in sixty is still a mark a reader
 * can find and name; the name carries the exact figures.
 */
export const SmallAndEmptyParts: Story = {
  render: () => (
    <Card>
      <Card.Body>
        <div style={{ display: 'grid', gap: 12, width: 96 }}>
          <SegmentedMeter
            segments={[
              { id: 'working', value: 4, tone: 'info', label: 'working' },
              { id: 'waiting', value: 0, tone: 'warning', label: 'waiting' },
              { id: 'stopped', value: 1, tone: 'danger', label: 'stopped' },
            ]}
            total={7}
            remainderLabel="idle"
          />
          <SegmentedMeter
            segments={[
              { id: 'working', value: 52, tone: 'info', label: 'working' },
              { id: 'stopped', value: 1, tone: 'danger', label: 'stopped' },
            ]}
            total={60}
            remainderLabel="idle"
          />
          <SegmentedMeter segments={[]} total={0} />
        </div>
      </Card.Body>
    </Card>
  ),
};
