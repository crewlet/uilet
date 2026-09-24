import { create } from 'storybook/theming';
import { font, radius, themes } from '@crewlethq/tokens';

// default-crewlet-light
// The light counterpart to default-crewlet-dark. Not active by default; swap
// the import in manager.ts and preview.ts to use it.
//
// READ FROM THE TOKENS, never copied out of them. Storybook's theming API
// takes finished strings rather than custom properties, and this file used to
// list a hex for each of them with a comment naming the token it came from.
// Four of those hexes were the values the palette was moved away from by the
// time anybody looked: the muted text was the step measured at 4.17:1 on a
// pressed row, and the border was the plain step wearing the strong step's
// name. A value that is copied is a value that drifts, and nothing here could
// have said so.
const light = themes.light.color;

export default create({
  base: 'light',

  brandTitle: 'Crewlet Design System',
  brandTarget: '_self',

  // The accent is per palette: the primary action's fill, and the one colour
  // that means "here". This palette's own, so the tool's selection reads as
  // the canvas's does.
  colorPrimary: light.brand.accent,
  colorSecondary: light.brand.accent,

  appBg: light.surface.frame,
  appContentBg: light.surface.background,
  appPreviewBg: light.surface.background,
  appBorderColor: light.border.strong,
  appBorderRadius: Number.parseInt(radius.sm, 10),

  textColor: light.text.primary,
  textInverseColor: light.text.inverse,
  textMutedColor: light.text.tertiary,

  barBg: light.surface.background,
  barTextColor: light.text.tertiary,
  barHoverColor: light.text.primary,
  barSelectedColor: light.brand.accent,

  inputBg: light.surface.subtle,
  inputBorder: light.border.default,
  inputTextColor: light.text.primary,
  inputBorderRadius: Number.parseInt(radius.sm, 10),

  fontBase: font.family.sans,
  fontCode: font.family.mono,
});
