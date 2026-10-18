/*
 * The artifact kit's script: the sheet as custom elements an artifact page
 * writes in its markup, and `mountSheet` for a page that draws one from a
 * script. Loaded as a module, after kit.css and theme.js:
 *
 *   <link rel="stylesheet" href="/_crewlet/kit/0.18.0/kit.css">
 *   <script src="/_crewlet/kit/0.18.0/theme.js"></script>
 *   <script type="module" src="/_crewlet/kit/0.18.0/kit.js"></script>
 *
 * The page needs no framework of its own: the elements carry the design
 * system's own SheetGrid, the same component the dashboard draws a native
 * sheet with, so a page's sheet and the native sheet look and behave alike.
 */

import './sheet.css';
import { defineElements } from './elements.js';

export { CrewletColumnElement, CrewletSheetElement, defineElements, mountSheet } from './elements.js';
export type { MountedSheet, SheetOptions } from './elements.js';
export { RUNTIME_READY_EVENT, whenRuntime } from './runtime.js';
export type { KitRuntime } from './runtime.js';

defineElements();
