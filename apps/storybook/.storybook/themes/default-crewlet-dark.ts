import { create } from 'storybook/theming';
import { color, font, radius, themes } from '@crewlethq/tokens';

// default-crewlet-dark
// The default Storybook chrome theme for the crewlet design system, so the
// tool surface and the rendered canvas share one visual language.
//
// READ FROM THE TOKENS, never copied out of them. Storybook's theming API
// takes finished strings rather than custom properties, and this file used to
// list a hex for each of them with a comment naming the token it came from.
// Four of those hexes were the values the palette was moved away from by the
// time anybody looked: the muted text was the step measured at 4.17:1 on a
// pressed row, and the border was the plain step wearing the strong step's
// name. A value that is copied is a value that drifts, and nothing here could
// have said so.
const dark = themes.dark.color;

export default create({
  base: 'dark',

  brandTitle: 'Crewlet Design System',
  brandTarget: '_self',

  // The accent is the same in every palette: it is the one colour that means
  // "here", and where the reader is does not depend on the theme.
  colorPrimary: color.brand.accent,
  colorSecondary: color.brand.accent,

  appBg: dark.surface.topbar,
  appContentBg: dark.surface.background,
  appPreviewBg: dark.surface.background,
  appBorderColor: dark.border.strong,
  appBorderRadius: Number.parseInt(radius.sm, 10),

  textColor: dark.text.primary,
  textInverseColor: dark.text.inverse,
  textMutedColor: dark.text.tertiary,

  barBg: dark.surface.topbarLift,
  barTextColor: dark.text.tertiary,
  barHoverColor: dark.text.primary,
  barSelectedColor: color.brand.accent,

  inputBg: dark.surface.subtle,
  inputBorder: dark.border.default,
  inputTextColor: dark.text.primary,
  inputBorderRadius: Number.parseInt(radius.sm, 10),

  fontBase: font.family.sans,
  fontCode: font.family.mono,
});
