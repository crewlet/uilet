/*
 * The stylesheets this package imports for their side effect alone.
 *
 * TypeScript 6.0 resolves a side-effect import the way it resolves every
 * other one and fails when nothing declares the module (TS2882). A .css file
 * declares nothing and never will: what resolves these imports is a bundler,
 * and tsup's copy loader is what emits each stylesheet beside the JavaScript
 * that imports it, for a consumer's bundler to follow in turn.
 *
 * Declaring the pattern says exactly that and no more — the module exists,
 * and there is nothing to import from it.
 */
declare module '*.css';
