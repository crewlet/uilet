import type { Meta, StoryObj } from '@storybook/react-vite';
import { CrewletFigure, type CrewletMotion } from '@crewlethq/icons';

/**
 * The crewlet mascot, trimmed into five movable body-part paths and animated.
 *
 * To grow this catalog when you add a motion:
 *   1. Add it to the `CrewletMotion` union and its CSS in `CrewletFigure.tsx`.
 *   2. Add one row to the `MOTIONS` array below.
 * Every story here reads from that array, so the new motion shows up
 * automatically in the catalog, the picker, and the crowd.
 */
const MOTIONS: { motion: CrewletMotion; label: string; blurb: string }[] = [
  { motion: 'idle', label: 'Idle', blurb: 'A quiet breath; the wings sway.' },
  { motion: 'dance', label: 'Dance', blurb: 'Wings flap, feet kick, the body bobs.' },
  { motion: 'wave', label: 'Wave', blurb: 'One wing lifts and waves hello.' },
  { motion: 'jump', label: 'Jump', blurb: 'A squash, then a hop off both feet.' },
  { motion: 'walk', label: 'Walk', blurb: 'Legs stride while the arms counter-swing.' },
  { motion: 'spin', label: 'Spin', blurb: 'A full head-over-heels cartwheel.' },
];

const PALETTE = ['#7c56ff', '#ff6fae', '#35c5f0', '#f0a53f', '#57d9a3', '#ac9dff'];

const Card = ({
  motion,
  label,
  blurb,
  color = '#7c56ff',
}: {
  motion: CrewletMotion;
  label: string;
  blurb: string;
  color?: string;
}) => (
  <figure
    style={{
      margin: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--spacing-2, 8px)',
      padding: 'var(--spacing-3, 14px)',
      border: '1px solid var(--color-border, rgba(128,128,128,.25))',
      borderRadius: 14,
      background: 'var(--color-surface, rgba(128,128,128,.05))',
    }}
  >
    <div
      style={{
        aspectRatio: '1.5 / 1',
        display: 'grid',
        placeItems: 'center',
        borderRadius: 10,
        background: 'var(--color-canvas, rgba(128,128,128,.08))',
      }}
    >
      <CrewletFigure motion={motion} color={color} width={132} height={88} />
    </div>
    <figcaption>
      <div style={{ fontWeight: 600, fontSize: 14 }}>{label}</div>
      <div style={{ fontSize: 12.5, opacity: 0.7 }}>{blurb}</div>
      <code style={{ fontSize: 11.5, opacity: 0.6 }}>motion=&quot;{motion}&quot;</code>
    </figcaption>
  </figure>
);

const meta = {
  title: 'Icons/CrewletFigure',
  component: CrewletFigure,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'An animated crewlet built from five trimmed body-part paths. Pick a looping `motion`; the joints are backed so limbs never leave a gap (toggle with `fillGaps`).',
      },
    },
  },
  argTypes: {
    motion: { control: 'inline-radio', options: MOTIONS.map((m) => m.motion) },
    color: { control: 'color' },
    delay: { control: { type: 'number', min: 0, step: 0.1 } },
    fillGaps: { control: 'boolean' },
  },
  args: { motion: 'dance', color: '#7c56ff', delay: 0, fillGaps: true, width: 180, height: 120 },
} satisfies Meta<typeof CrewletFigure>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Interactive: change the motion, colour, and gap-fill from the controls panel. */
export const Playground: Story = {};

/** The full catalog: every available motion at a glance. */
export const Catalog: Story = {
  render: () => (
    <div style={{ maxWidth: 760 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 14,
        }}
      >
        {MOTIONS.map((m) => (
          <Card key={m.motion} {...m} />
        ))}
      </div>
    </div>
  ),
};

/** The same motion in every brand colour, to check it reads on each. */
export const Colours: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'center' }}>
      {PALETTE.map((c) => (
        <CrewletFigure key={c} motion={args.motion ?? 'dance'} color={c} width={120} height={80} />
      ))}
    </div>
  ),
};

/** From an inline icon to a hero mascot. */
export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-end' }}>
      {[40, 72, 120, 200].map((w) => (
        <CrewletFigure key={w} motion={args.motion ?? 'dance'} width={w} height={Math.round(w / 1.5)} />
      ))}
    </div>
  ),
};

/** Gap-fill on (default) versus off. Toggle a wing up mentally: with fillGaps the
 *  body backs the shoulder; without it, the seam shows. */
export const GapFill: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 40 }}>
      {[true, false].map((fg) => (
        <figure key={String(fg)} style={{ margin: 0, textAlign: 'center' }}>
          <CrewletFigure motion={args.motion ?? 'dance'} fillGaps={fg} width={160} height={107} />
          <figcaption style={{ fontSize: 12.5, opacity: 0.7, marginTop: 6 }}>
            <code>fillGaps={String(fg)}</code>
            {fg ? ' (default)' : ''}
          </figcaption>
        </figure>
      ))}
    </div>
  ),
};

/** A crowd: one of each motion, phase-offset so no two move alike. */
export const Crowd: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', maxWidth: 640 }}>
      {MOTIONS.map((m, i) => (
        <CrewletFigure
          key={m.motion}
          motion={m.motion}
          color={PALETTE[i % PALETTE.length] ?? '#7c56ff'}
          delay={i * 0.25}
          width={110}
          height={73}
        />
      ))}
    </div>
  ),
};
