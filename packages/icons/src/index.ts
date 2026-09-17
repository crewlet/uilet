export { Icon } from './Icon.js';
export type { IconProps, IconSize } from './Icon.js';
export { default as CrewletFigure } from './CrewletFigure.js';
export type { CrewletFigureProps, CrewletMotion } from './CrewletFigure.js';
export { VendorMark, VENDORS } from './VendorMark.js';
export type { Vendor, VendorMarkProps } from './VendorMark.js';
// Every illustration under its own name, plus ICON_NAMES and IconName.
//
// Named exports, and NO `Icons` namespace. A namespace re-export compiles to a
// call at module scope that names every member, which nothing can prove is
// safe to drop, so `Icons.CrewletIcon` carried all 558 KB of the set into
// every build that used it (measured: 515 KB against 2 KB for the named
// export). There is no way to offer both.
export * from './generated/index.js';

// The Material Symbols glyphs are NOT here. They are 105 drawings that almost
// no consumer wants all of, so they have their own entry, which a bundler
// reaches into one glyph at a time: import { CloseGlyph } from
// '@crewlethq/icons/glyphs'.
