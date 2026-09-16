import type { Preview } from '@storybook/react-vite';
import '@crewlethq/tokens/css';
import '@crewlethq/tokens/css/themes';
import '@crewlethq/tokens/css/density';
import '@crewlethq/tokens/css/fonts';
import '@crewlethq/tokens/css/base';
import '@crewlethq/ui/styles.css';
import './preview.css';
import { color, themes } from '@crewlethq/tokens';
import { defaultCrewletDark } from './themes';

/*
 * `@crewlethq/tokens/css/material-symbols` is deliberately not here. No
 * component in this package draws a font ligature any more: the drawings ship
 * in @crewlethq/icons, so a story renders the same glyph on a machine with no
 * network as on one with a font cache.
 */

type ThemeName = 'system' | 'dark' | 'light';
type DensityName = 'normal' | 'compact' | 'comfortable';

/**
 * Paints the chosen palette on <html>, which is the contract
 * @crewlethq/tokens/css/themes declares: a document with no data-theme is
 * light, or dark if the system asks, and the attribute wins in both
 * directions.
 *
 * SYSTEM REMOVES THE ATTRIBUTE rather than setting a third value, because
 * following the system IS the absence of a choice. Without this option there
 * was no way to see the state most readers are actually in.
 */
function applyTheme(theme: ThemeName) {
  if (theme === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', theme);
}

/** The same shape for density: normal is the absence of an attribute. */
function applyDensity(density: DensityName) {
  if (density === 'normal') document.documentElement.removeAttribute('data-density');
  else document.documentElement.setAttribute('data-density', density);
}

const preview: Preview = {
  globalTypes: {
    theme: {
      name: 'Theme',
      description: 'Follow the system, or pin a palette, to audit token visibility.',
      toolbar: {
        icon: 'paintbrush',
        items: [
          { value: 'system', title: 'System', icon: 'browser' },
          { value: 'light', title: 'Light', icon: 'sun' },
          { value: 'dark', title: 'Dark', icon: 'moon' },
        ],
        dynamicTitle: true,
      },
    },
    density: {
      name: 'Density',
      description: 'Scales every spacing and size token. Targets floor at 24px.',
      toolbar: {
        icon: 'component',
        items: [
          { value: 'compact', title: 'Compact' },
          { value: 'normal', title: 'Normal' },
          { value: 'comfortable', title: 'Comfortable' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: 'dark',
    density: 'normal',
  },
  decorators: [
    (Story, context) => {
      applyTheme((context.globals.theme as ThemeName) ?? 'dark');
      applyDensity((context.globals.density as DensityName) ?? 'normal');
      return Story(context);
    },
  ],
  parameters: {
    docs: { theme: defaultCrewletDark },
    /*
     * The Theme toolbar above is the primary mechanism for switching the
     * canvas; --color-surface-background follows the selected theme. The
     * backgrounds addon is left available without a default so a contributor
     * can still pin a specific surface inline when auditing contrast against
     * an off-token colour, but it does not fight the theme switch at first
     * paint.
     */
    backgrounds: {
      // Read from the tokens, not copied out of them, for the same reason the
      // chrome themes are: a hex written here is a hex nothing keeps current,
      // and a contrast audit run against a surface the palette no longer has
      // is worse than no audit.
      options: {
        marketing: { name: 'marketing', value: color.surface.background },
        dark: { name: 'dark', value: themes.dark.color.surface.background },
        topbar: { name: 'topbar', value: themes.dark.color.surface.topbar },
        elevated: { name: 'elevated', value: themes.dark.color.surface.elevated },
        light: { name: 'light', value: themes.light.color.surface.background },
        subtle: { name: 'subtle', value: themes.light.color.surface.subtle },
      },
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
