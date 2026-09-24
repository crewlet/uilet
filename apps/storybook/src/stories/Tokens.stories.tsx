import { useSyncExternalStore } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ThemeName } from '@crewlethq/tokens';
import { swatchesFor, type SwatchRoot, type TokenSwatch } from '../tokenSwatches';
import {
  spacing,
  radius,
  shadow,
  font,
  motion,
  breakpoint,
  zIndex,
  blur,
} from '@crewlethq/tokens';

const Swatch = ({ name, value, source }: TokenSwatch) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: 'var(--radius-md)',
        background: value,
        border: '1px solid var(--color-border-default)',
      }}
    />
    <code style={{ fontSize: 'var(--font-size-sm)' }}>
      {name} <span style={{ color: 'var(--color-text-tertiary)' }}>{value}</span>
      {source === 'base' ? <span style={{ color: 'var(--color-text-tertiary)' }}> (every root)</span> : null}
    </code>
  </div>
);

const SwatchList = ({ title, note, root }: { title: string; note: string; root: SwatchRoot }) => (
  <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
    <h2 style={{ margin: 0, fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)' }}>{title}</h2>
    <p style={{ margin: '0 0 var(--spacing-2)', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-compact)' }}>
      {note}
    </p>
    {swatchesFor(root).map((swatch) => (
      <Swatch key={swatch.name} {...swatch} />
    ))}
  </section>
);

const LIGHT_QUERY = '(prefers-color-scheme: light)';

/** The palette the system asks for, followed live, as the theme layer does. */
function useSystemTheme(): ThemeName {
  return useSyncExternalStore(
    (change) => {
      const query = window.matchMedia(LIGHT_QUERY);
      query.addEventListener('change', change);
      return () => query.removeEventListener('change', change);
    },
    () => (window.matchMedia(LIGHT_QUERY).matches ? 'light' : 'dark'),
    () => 'dark',
  );
}

/**
 * THE PALETTE THE TOOLBAR SELECTED, and the base root beneath it under its own
 * heading. See `swatchesFor` for why the typed `color` export alone is the
 * wrong list here.
 */
const Palette = ({ theme }: { theme: 'system' | ThemeName }) => {
  const system = useSystemTheme();
  const shown = theme === 'system' ? system : theme;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-8)' }}>
      <SwatchList
        root={shown}
        title={`The ${shown} palette${theme === 'system' ? ', which the system asks for' : ''}`}
        note={`What an application loading @crewlethq/tokens/css/themes paints in the ${shown} palette: themes.${shown}.color over the base root. A value marked (every root) is one the palette does not declare, so it paints the base root's.`}
      />
      <SwatchList
        root="base"
        title="The base root, with no theme layer"
        note="What @crewlethq/tokens/css alone paints, and what the typed color export holds: the marketing palette on its black page. An application does not see these grounds."
      />
    </div>
  );
};

const Spacing = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
    {Object.entries(spacing).map(([k, v]) => (
      <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
        <div style={{ width: v, height: 16, background: 'var(--color-border-control)' }} />
        <code style={{ fontSize: 'var(--font-size-sm)' }}>spacing.{k} = {v}</code>
      </div>
    ))}
  </div>
);

const Radii = () => (
  <div style={{ display: 'flex', gap: 'var(--spacing-3)', flexWrap: 'wrap' }}>
    {Object.entries(radius).map(([k, v]) => (
      <div key={k} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-2)' }}>
        <div style={{ width: 56, height: 56, borderRadius: v, background: 'var(--color-surface-subtle)' }} />
        <code style={{ fontSize: 'var(--font-size-xs)' }}>{k}</code>
      </div>
    ))}
  </div>
);

const Shadows = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
    {Object.entries(shadow).map(([k, v]) => (
      <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-4)' }}>
        <div
          style={{
            width: 96,
            height: 56,
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-surface-subtle)',
            boxShadow: v,
          }}
        />
        <code style={{ fontSize: 'var(--font-size-xs)' }}>shadow.{k}</code>
      </div>
    ))}
  </div>
);

const Typography = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
    {Object.entries(font.size).map(([k, v]) => (
      <div key={k} style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--spacing-3)' }}>
        <span style={{ fontSize: v, fontFamily: 'var(--font-family-sans)' }}>The crewlet agent reads docs.</span>
        <code style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>size.{k} = {v}</code>
      </div>
    ))}
    <div style={{ marginTop: 'var(--spacing-4)' }}>
      <span style={{ fontFamily: 'var(--font-family-display)', fontSize: 'var(--font-size-3xl)' }}>Display, Geist (alias of sans)</span>
    </div>
    <div>
      <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: 'var(--font-size-md)' }}>Mono, Geist Mono</span>
    </div>
  </div>
);

const Motion = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
    <div>
      <strong style={{ fontFamily: 'var(--font-family-sans)' }}>Durations</strong>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)', marginTop: 'var(--spacing-2)' }}>
        {Object.entries(motion.duration).map(([k, v]) => (
          <code key={k} style={{ fontSize: 'var(--font-size-sm)' }}>
            duration.{k} = <span style={{ color: 'var(--color-text-tertiary)' }}>{v}</span>
          </code>
        ))}
      </div>
    </div>
    <div>
      <strong style={{ fontFamily: 'var(--font-family-sans)' }}>Easings</strong>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)', marginTop: 'var(--spacing-2)' }}>
        {Object.entries(motion.easing).map(([k, v]) => (
          <code key={k} style={{ fontSize: 'var(--font-size-sm)' }}>
            easing.{k} = <span style={{ color: 'var(--color-text-tertiary)' }}>{v}</span>
          </code>
        ))}
      </div>
    </div>
  </div>
);

const Breakpoints = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
    {Object.entries(breakpoint).map(([k, v]) => (
      <code key={k} style={{ fontSize: 'var(--font-size-sm)' }}>
        breakpoint.{k} = <span style={{ color: 'var(--color-text-tertiary)' }}>{v}</span>
      </code>
    ))}
  </div>
);

const ZIndex = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
    {Object.entries(zIndex).map(([k, v]) => (
      <code key={k} style={{ fontSize: 'var(--font-size-sm)' }}>
        zIndex.{k} = <span style={{ color: 'var(--color-text-tertiary)' }}>{v}</span>
      </code>
    ))}
  </div>
);

const Blur = () => (
  <div style={{ display: 'flex', gap: 'var(--spacing-4)', flexWrap: 'wrap' }}>
    {Object.entries(blur).map(([k, v]) => (
      <div key={k} style={{ position: 'relative', width: 120, height: 80 }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'var(--color-brand-gradient)',
            borderRadius: 'var(--radius-md)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backdropFilter: `blur(${v})`,
            WebkitBackdropFilter: `blur(${v})`,
            background: 'rgba(0, 0, 0, 0.2)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-text-primary)',
            fontSize: 'var(--font-size-xs)',
          }}
        >
          blur.{k} = {v}
        </div>
      </div>
    ))}
  </div>
);

const meta: Meta = {
  title: 'Foundations/Tokens',
  parameters: { layout: 'padded' },
};

export default meta;

export const Colors: StoryObj = {
  render: (_, { globals }) => <Palette theme={(globals.theme as 'system' | ThemeName | undefined) ?? 'dark'} />,
};
export const SpacingScale: StoryObj = { render: () => <Spacing /> };
export const RadiusScale: StoryObj = { render: () => <Radii /> };
export const ShadowScale: StoryObj = { render: () => <Shadows /> };
export const TypographyScale: StoryObj = { render: () => <Typography /> };
export const MotionTokens: StoryObj = { render: () => <Motion /> };
export const BreakpointTokens: StoryObj = { render: () => <Breakpoints /> };
export const ZIndexTokens: StoryObj = { render: () => <ZIndex /> };
export const BlurTokens: StoryObj = { render: () => <Blur /> };
