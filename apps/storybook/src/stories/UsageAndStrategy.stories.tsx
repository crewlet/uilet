import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  LimitMeters,
  Meter,
  ReorderHandle,
  StatCard,
  StatGroup,
  UtilizationDiagram,
  useReorder,
  USAGE_WARN_AT,
} from '@crewlethq/ui';
import { BothThemes } from '../BothThemes';

/**
 * UI / Usage and strategy.
 *
 * ONE RULE FOR EVERY USAGE BAR: green below 80% of the limit (the engine's
 * warning line, `USAGE_WARN_AT`), yellow from 80%, red at the limit. `Meter`
 * and `LimitMeters` paint it by default (`okTone` keeps the old quiet look);
 * `usageTone(used)` gives it to any other drawing, and `UtilizationDiagram`
 * paints its lanes with it.
 */
const meta: Meta = { title: 'UI/Usage and strategy', parameters: { layout: 'padded' } };
export default meta;
type Story = StoryObj;

const window = (id: string, label: string, used: number, state: 'ok' | 'near' | 'refusing' = 'ok') => ({
  id,
  label,
  used,
  state,
  note: 'resets 5am',
  name: `${label} limit, ${Math.round(used * 100)}% used`,
});

/** 40%, 79%, 80%, 95% and 100%: the bars turn at 80% and at the limit. */
export const UsageThresholds: Story = {
  render: () => (
    <BothThemes>
      <div style={{ display: 'grid', gap: 'var(--spacing-4)', width: 320 }}>
        <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>Warning line: {USAGE_WARN_AT * 100}%</span>
        <LimitMeters
          label="Usage limits of opus-main"
          windows={[
            window('a', '5-hour', 0.4),
            window('b', 'Weekly', 0.79),
            window('c', 'Opus', 0.8),
            window('d', 'Sonnet', 0.95, 'near'),
            window('e', 'Daily', 1, 'refusing'),
          ]}
        />
        {[40, 79, 80, 95, 100].map((value) => (
          <Meter key={value} size="compact" label={`Spend ${value}%`} value={value} max={100} hint={`${value}%`} />
        ))}
      </div>
    </BothThemes>
  ),
};

/** Balanced and Sequential, looping while seen; a still frame under reduced motion. */
export const Utilization: Story = {
  render: () => (
    <BothThemes>
      <div style={{ display: 'flex', gap: 'var(--spacing-5)', alignItems: 'center' }}>
        <UtilizationDiagram mode="balanced" label="Balanced: members share the work" />
        <UtilizationDiagram mode="sequential" label="Sequential: one member at a time, in order" />
      </div>
    </BothThemes>
  ),
};

/** Tiles that say a label and a value only (`subLines={0}`). */
export const TilesWithoutANote: Story = {
  render: () => (
    <BothThemes>
      <StatGroup>
        <StatCard label="Models" value={6} subLines={0} />
        <StatCard label="Fleets" value={2} subLines={0} />
        <StatCard label="Seats" value={14} subLines={0} />
      </StatGroup>
    </BothThemes>
  ),
};

function Members() {
  const reorder = useReorder({ keys: ['opus-main', 'opus-team', 'opus-backup'], onReorder: () => {}, nameOf: (key) => key });
  return (
    <ol {...reorder.containerProps} style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 4 }}>
      {reorder.order.map((key, at) => (
        <li key={key} {...reorder.itemProps(key)} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ReorderHandle {...reorder.handleProps(key)} />
          <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--color-text-tertiary)' }}>{at + 1}</span>
          <span>{key}</span>
        </li>
      ))}
    </ol>
  );
}

/** The grip an ordered item is moved by: drag it, or focus it and press an arrow. */
export const Handle: Story = {
  render: () => (
    <BothThemes>
      <Members />
    </BothThemes>
  ),
};
