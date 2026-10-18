import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useState } from 'react';
import { LiveCursor } from '@crewlethq/ui';

const meta: Meta<typeof LiveCursor> = {
  title: 'UI/LiveCursor',
  component: LiveCursor,
};

export default meta;
type Story = StoryObj<typeof LiveCursor>;

const stage = { position: 'relative' as const, height: 280, border: '1px dashed var(--color-border-default)', borderRadius: 'var(--radius-md)' };

/** A cursor moving round a board. It glides between points, and jumps under a reduced-motion preference. */
export const Moving: Story = {
  render: function Render() {
    const [at, setAt] = useState({ x: 40, y: 40 });
    useEffect(() => {
      const timer = window.setInterval(() => setAt({ x: 40 + Math.round(Math.random() * 360), y: 30 + Math.round(Math.random() * 180) }), 900);
      return () => window.clearInterval(timer);
    }, []);
    return (
      <div style={stage}>
        <LiveCursor x={at.x} y={at.y} name="Maya Ortiz" hue="cyan" />
        <LiveCursor x={260} y={140} name="PM" hue="rose" kind="agent" />
      </div>
    );
  },
};

/** A cursor that stopped: 40% after the rest time, hidden after the hide time (shortened here). */
export const IdleFade: Story = {
  render: () => (
    <div style={stage}>
      <LiveCursor x={120} y={80} name="Jane Founder" hue="green" idleAfterMs={1500} hideAfterMs={6000} />
    </div>
  ),
};

/** Interpolation off: every move is a jump, which is what a reduced-motion preference always gets. */
export const ReducedMotion: Story = {
  render: function Render() {
    const [x, setX] = useState(40);
    useEffect(() => {
      const timer = window.setInterval(() => setX((value) => (value > 360 ? 40 : value + 80)), 700);
      return () => window.clearInterval(timer);
    }, []);
    return (
      <div style={stage}>
        <LiveCursor x={x} y={100} name="Sam Lee" hue="amber" interpolate={false} />
      </div>
    );
  },
};
