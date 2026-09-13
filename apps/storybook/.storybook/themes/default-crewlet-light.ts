import { create } from 'storybook/theming';

// default-crewlet-light
// Light-mode counterpart to default-crewlet-dark. Not active by default; swap
// the import in manager.ts and preview.ts to use it.
//
// Sources: the body.theme-light overrides that @crewlethq/tokens emits into
// dist/css/themes.css (see packages/tokens/scripts/build.mjs), so the tool
// chrome and a canvas rendered in the light theme share one palette.
//   colorPrimary       <- color.brand.accent        #5469d4 (same in both modes)
//   appBg              <- color.surface.subtle      #f4f4f5
//   appContentBg       <- color.surface.background  #ffffff
//   barBg              <- color.surface.background  #ffffff
//   appBorderColor     <- color.border.default      #e4e4e7
//   textColor          <- color.text.primary        #09090b
//   textMutedColor     <- color.text.secondary      #71717a
export default create({
  base: 'light',

  brandTitle: 'Crewlet Design System',
  brandTarget: '_self',

  colorPrimary: '#5469d4',
  colorSecondary: '#5469d4',

  appBg: '#f4f4f5',
  appContentBg: '#ffffff',
  appPreviewBg: '#ffffff',
  appBorderColor: '#e4e4e7',
  appBorderRadius: 6,

  textColor: '#09090b',
  textInverseColor: '#ffffff',
  textMutedColor: '#71717a',

  barBg: '#ffffff',
  barTextColor: '#71717a',
  barHoverColor: '#09090b',
  barSelectedColor: '#5469d4',

  inputBg: '#ffffff',
  inputBorder: '#e4e4e7',
  inputTextColor: '#09090b',
  inputBorderRadius: 6,

  fontBase:
    "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
  fontCode:
    "'JetBrains Mono', ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace",
});
