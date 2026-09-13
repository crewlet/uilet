import { create } from 'storybook/theming';

// default-crewlet-dark
// The default Storybook chrome theme for the crewlet design system.
// Hex values are pulled verbatim from the canonical token set so the tool
// surface and the rendered canvas share one visual language.
//
// Sources (see packages/tokens/tokens/*.json):
//   colorPrimary       <- color.brand.primary       #5469d4
//   appBg              <- color.surface.topbar      #15171c
//   appContentBg       <- color.surface.background  #000000
//   barBg              <- color.surface.topbar-lift #1c1e24
//   appBorderColor     <- color.border.strong       #3f4145
//   textColor          <- color.text.primary        #fafafa
//   textMutedColor     <- color.text.tertiary       #8c99ad
export default create({
  base: 'dark',

  brandTitle: 'Crewlet Design System',
  brandTarget: '_self',

  colorPrimary: '#5469d4',
  colorSecondary: '#5469d4',

  appBg: '#15171c',
  appContentBg: '#000000',
  appPreviewBg: '#000000',
  appBorderColor: '#3f4145',
  appBorderRadius: 6,

  textColor: '#fafafa',
  textInverseColor: '#09090b',
  textMutedColor: '#8c99ad',

  barBg: '#1c1e24',
  barTextColor: '#c9ced8',
  barHoverColor: '#fafafa',
  barSelectedColor: '#5469d4',

  inputBg: '#1c1e24',
  inputBorder: '#3f4145',
  inputTextColor: '#fafafa',
  inputBorderRadius: 6,

  fontBase:
    "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
  fontCode:
    "'JetBrains Mono', ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace",
});
