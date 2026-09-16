/*
 * The package's root export.
 *
 * It re-exports a GENERATED barrel (scripts/write-barrel.mjs), one line per
 * component folder, because the barrel is the one file every component folder
 * would otherwise have to touch: eight people adding components at once is
 * eight conflicts in it. Add a folder with an index.ts and it is exported.
 *
 * A consumer that wants one component and none of the rest imports the folder
 * directly, `@crewlethq/ui/Button`, which carries that component's stylesheet
 * and nothing else.
 */
export * from './generated/index.js';
