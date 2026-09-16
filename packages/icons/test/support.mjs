// What every suite here needs to look at markup.
//
// The server renderer rather than a DOM: these suites assert attributes on an
// element the component writes itself, so nothing needs a browser, and a
// package that draws pictures gains no confidence from a layout engine it
// never asks anything of.

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

export const PACKAGE = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const render = (component, props) => renderToStaticMarkup(createElement(component, props));

/** One attribute of the first element in some markup, or null when it has none. */
export const attribute = (markup, name) => new RegExp(`\\s${name}="([^"]*)"`).exec(markup)?.[1] ?? null;

/** The PascalCase component name an SVG file name compiles to. */
export const componentName = (file) =>
  file
    .replace(/\.svg$/, '')
    .split(/[-_\s]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
