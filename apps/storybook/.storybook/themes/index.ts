// Crewlet Storybook chrome themes.
//
//   defaultCrewletDark   the default chrome (sidebar, toolbar, panels)
//   defaultCrewletLight  the light-mode counterpart
//
// Storybook only renders one chrome theme at a time. To switch the active
// theme, change the import inside manager.ts and preview.ts.
//
// The canvas backgrounds (where stories render) are controlled separately by
// preview.ts and can be flipped per-story via the paint-roller toolbar.
export { default as defaultCrewletDark } from './default-crewlet-dark';
export { default as defaultCrewletLight } from './default-crewlet-light';
