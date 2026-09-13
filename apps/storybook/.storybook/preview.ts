import type { Preview } from '@storybook/react-vite';
import '@crewlethq/tokens/css';
import '@crewlethq/tokens/css/themes';
import '@crewlethq/tokens/css/fonts';
import '@crewlethq/tokens/css/material-symbols';
import '@crewlethq/ui/styles.css';
import './preview.css';
import { defaultCrewletDark } from './themes';

type ThemeName = 'dark' | 'light';

const THEME_CLASSES: Record<ThemeName, string> = {
  dark: 'theme-dark',
  light: 'theme-light',
};

/**
 * Applies the selected theme class to <body> so the @crewlethq/tokens/themes
 * overrides take effect. Removes any previously applied theme class first
 * so switching is idempotent (no class pile-up across story navigations).
 */
function applyTheme(theme: ThemeName) {
  const body = document.body;
  for (const cls of Object.values(THEME_CLASSES)) body.classList.remove(cls);
  body.classList.add(THEME_CLASSES[theme]);
}

const preview: Preview = {
  globalTypes: {
    theme: {
      name: 'Theme',
      description: 'Toggle dark / light theme to audit token visibility.',
      toolbar: {
        icon: 'paintbrush',
        items: [
          { value: 'dark',  title: 'Dark',  icon: 'moon' },
          { value: 'light', title: 'Light', icon: 'sun' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: 'dark',
  },
  decorators: [
    (Story, context) => {
      applyTheme((context.globals.theme as ThemeName) ?? 'dark');
      return Story(context);
    },
  ],
  parameters: {
    docs: { theme: defaultCrewletDark },
    /*
     * The Theme toolbar (globalTypes.theme above) is the primary mechanism
     * for switching the canvas; --color-surface-background follows the
     * selected theme. The backgrounds addon is left available without a
     * default so contributors can still pin a specific surface inline when
     * auditing contrast against an off-token colour, but it does not fight
     * the theme switch by forcing a value at first paint.
     */
    backgrounds: {
      options: {
        dark:     { name: 'dark',     value: '#000000' },
        topbar:   { name: 'topbar',   value: '#15171c' },
        elevated: { name: 'elevated', value: '#22252b' },
        light:    { name: 'light',    value: '#ffffff' },
        subtle:   { name: 'subtle',   value: '#f4f4f5' },
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
