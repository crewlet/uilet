// What a page may load, gzipped, as the plan for artifacts sets it: the theme
// bootstrap blocks the first paint, the stylesheet paints it, and the kit's
// script carries the sheet. The build refuses a kit over any of them, and the
// suite holds the built files to the same numbers, from this one place.
export const BUDGETS = Object.freeze({ themeGzip: 2 * 1024, cssGzip: 40 * 1024, kitGzip: 160 * 1024 });
