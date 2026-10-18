// What a page may load before it paints, gzipped, as the plan for artifacts
// sets it. The build refuses a kit over either, and the suite holds the built
// files to the same numbers, from this one place.
export const BUDGETS = Object.freeze({ themeGzip: 2 * 1024, cssGzip: 40 * 1024 });
