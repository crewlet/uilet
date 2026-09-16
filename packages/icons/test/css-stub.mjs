// Lets plain Node load the built entry, which imports its own stylesheets.
//
// A component that carries rules imports them as a side effect, so a bundler
// emits the CSS beside the JS and a consumer gets it without being told to
// (the same contract @crewlethq/ui has, and the reason `sideEffects` names
// "**/*.css"). Node has no loader for a stylesheet, so it throws
// `ERR_UNKNOWN_FILE_EXTENSION` on the first import and takes the whole run
// with it. These hooks answer a .css import with an empty module, which is
// what the suite wants anyway: it asserts markup, and no rule in a stylesheet
// changes an attribute.

import { registerHooks } from 'node:module';

registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith('.css')) return { format: 'module', shortCircuit: true, source: 'export {};' };
    return nextLoad(url, context);
  },
});
