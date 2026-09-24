import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx|mdx)'],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  typescript: {
    check: false,
    reactDocgen: 'react-docgen-typescript',
  },
  /*
   * THE PREVIEW NAMES ITS ICON. The manager's page links the favicon Storybook
   * ships beside it, and the preview's iframe.html links none, so a browser
   * loading a story on its own (a screenshot, a test, a link to one story)
   * asks for /favicon.ico, which no build has, and every such page logged a
   * 404 that buried the errors worth reading. It links the SAME file the
   * manager does, relative, because the site is served from wherever it is
   * deployed; scripts/check-storybook-static.mjs holds both pages to naming
   * an icon the build carries.
   */
  previewHead: (head) => `${head}
<link rel="icon" type="image/svg+xml" href="./favicon.svg" />`,
};

export default config;
