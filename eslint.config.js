import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default tseslint.config(
  {
    ignores: [
      '**/build/**',
      '**/dist/**',
      '**/node_modules/**',
      '**/.turbo/**',
      '**/storybook-static/**',
      '**/src/generated/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      /*
       * Honour the underscore-prefix convention for intentionally
       * unused parameters and destructured discards. Without this
       * override the default rule flags `_ignored`, `_targetKey`,
       * and similar patterns that exist purely to satisfy a callable
       * signature or to omit a field from a rest spread.
       */
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
      }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  /*
   * The two rule sets that only make sense over a component tree, at their
   * recommended settings and over the three places components are written.
   *
   * react-hooks is the one that finds a bug a type checker cannot: an effect
   * whose dependency list does not name what it reads runs with a stale value
   * and nothing anywhere says so. jsx-a11y is the cheapest half of the
   * accessible defaults this design system promises, the half a static reader
   * can see: a label that names nothing, a click handler on a div, an
   * interactive element with no role.
   *
   * They are scoped rather than global because the rest of the repository is
   * build scripts and release tooling, where a rule about JSX would only ever
   * be noise.
   */
  {
    files: ['packages/ui/src/**/*.{ts,tsx}', 'apps/storybook/src/**/*.{ts,tsx}', 'apps/ui-tests/src/**/*.{ts,tsx}'],
    extends: [jsxA11y.flatConfigs.recommended],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      /*
       * An error, not the plugin's default warning. A dependency list that
       * does not name what the effect reads runs it with a stale value, and
       * nothing else in the build says so; a warning nobody fails on is the
       * finding left in place.
       */
      'react-hooks/exhaustive-deps': 'error',
      /*
       * The rule counts how deep the control sits inside its label, and its
       * default of 2 cannot see this system's toggle row: a label wrapping a
       * checkbox, then a text block holding the name and a hint under it. It
       * keeps all its force at 3, because a label with no text at all still
       * fails, and a hint that is a description rather than a name still has
       * to be a description.
       */
      'jsx-a11y/label-has-associated-control': ['error', { depth: 3 }],
    },
  },
);

/*
 * A note on what is NOT enabled above.
 *
 * eslint-plugin-react-hooks 7 moved its `recommended` preset to the React
 * Compiler rule set: set-state-in-effect, static-components, use-memo,
 * preserve-manual-memoization, immutability and incompatible-library, all at
 * error. Those describe what the compiler needs, and this repository does not
 * compile with it, so switching them on would be adopting a migration nobody
 * has decided on: twelve findings across DataTable, Select, TimeWindowPicker
 * and Popover, each a redesign of an effect rather than a dependency list.
 *
 * So the two rules that find a bug in the code as it actually runs are named
 * explicitly, and the rest is left to a decision about the compiler. If that
 * decision is yes, `reactHooks.configs.flat.recommended` replaces both lines
 * and the twelve findings are the migration.
 */
