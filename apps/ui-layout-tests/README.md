# @crewlethq/ui-layout-tests

The real-browser layout suite for `@crewlethq/ui`: what only a layout engine
can answer, such as whether a panel scrolls sideways when it holds a long path.
The jsdom suite (`@crewlethq/ui-tests`) lays nothing out and cannot measure a
width, so this one renders the components from source, with the product's
stylesheets, in a headless browser driven by the test runner's browser mode.

It is a private workspace for the same reason the jsdom suite is: no test
tooling reaches a published tarball.

```sh
npx playwright install chromium --only-shell        # once: the browser it drives
npm test --workspace @crewlethq/ui-layout-tests     # one run
```

CI installs the same browser before the workspace's tests run.
