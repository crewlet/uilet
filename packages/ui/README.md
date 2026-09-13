# @crewlethq/ui

Crewlet shared React components. Built on top of `@crewlethq/tokens` (CSS variables) and `@crewlethq/icons`.

## Use it

```tsx
import '@crewlethq/tokens/css';                   // load CSS variables once at app entry
import '@crewlethq/tokens/css/fonts';             // self-hosted Inter and JetBrains Mono
import '@crewlethq/tokens/css/material-symbols';  // icon font the components render glyphs with
import '@crewlethq/ui/styles.css';                // component styles (or rely on per-component CSS imports)
import { Button, Card } from '@crewlethq/ui';
import { Icon } from '@crewlethq/icons';

<Card>
  <Card.Body>
    <Button variant="primary" leadingIcon={<Icon name="AgentReading" />}>
      Open documentation
    </Button>
    <Button variant="outline">Cancel</Button>
  </Card.Body>
</Card>
```

The components render their glyphs as ligatures of the Material Symbols Outlined icon font inside `<span class="material-symbols-outlined">`. `@crewlethq/tokens/css/material-symbols` loads that font from Google Fonts (Apache License 2.0) and is the only import above that contacts a third-party host. Skip it when the app already loads the font under the same class name; see the `@crewlethq/tokens` README for details.

## What is in here

| Area | Components |
| ---- | ---------- |
| Actions | `Button` (variants `primary`, `secondary`, `outline`, `tertiary`, `accent`, `danger`; sizes `small`, `medium`, `large`; shapes `square`, `pill`), `IconButton`, `Copyable`, `Kbd` |
| Forms | `Input`, `Textarea`, `Label`, `FormField`, `FormRow`, `Checkbox`, `Select`, `Tag`, `TagsInput`, `DateTimePicker`, `TimeWindowPicker`, `ImageUpload` |
| Data display | `DataTable`, `CopyableCell`, `Table`, `StatCard`, `PricingCard`, `Avatar`, `CodeBlock`, `Skeleton`, `Eyebrow` |
| Feedback and overlays | `Callout`, `Toaster`, `Modal`, `ConfirmModal`, `Popover` |
| Layout | `AppShell`, `Container`, `Section`, `Card`, `Tabs`, `Accordion` |

Storybook stories live under `apps/storybook/src/stories`.

Add new components under `src/<Name>/` with a `Component.tsx`, optional `Component.css`, and an `index.ts`. Re-export from `src/index.ts`.

## Theming hooks

- **Light and dark palettes.** Import `@crewlethq/tokens/css/themes` and toggle `theme-light` or `theme-dark` on `<body>`. Every component reads the canonical `--color-*` variables, so no provider is needed.
- **Accent colour.** The selected, active and focus states read `--color-brand-accent` and its companions from `@crewlethq/tokens`: `--color-brand-accent-rgb` (the same colour as a comma-separated `r, g, b` triple, for translucent tints), `--color-brand-accent-hover`, `--color-brand-accent-active`, `--color-brand-accent-soft` and `--color-brand-accent-soft-strong`. Rebind them together to retint the components. `Select` menus, `Popover` panels and the `DateTimePicker` and `TimeWindowPicker` popovers are portaled to `<body>`, so declare the override on `<body>` (or `<html>`) for those panels to follow it.

```css
/* Retint every accent state to the brand slate. */
body {
  --color-brand-accent: var(--color-brand-slate);
  --color-brand-accent-hover: var(--color-brand-slate);
  --color-brand-accent-active: var(--color-brand-slate);
  --color-brand-accent-rgb: 60, 64, 82;
  --color-brand-accent-soft: rgba(60, 64, 82, 0.10);
  --color-brand-accent-soft-strong: rgba(60, 64, 82, 0.32);
}
```

- **Component variables.** A few components expose their own `--crewlet-*` variables for values that are not tokens, for example `--crewlet-data-table-active-sort-color`, `--crewlet-data-table-row-hover-bg` and `--crewlet-data-table-archived-tint-rgb` on the compact `DataTable`, and `--crewlet-avatar-tint-fg` for the initials on a tinted `Avatar`. Override them from a rule that targets the component's root.

The component stylesheets read only variables that `@crewlethq/tokens` emits or that the components declare themselves; `npm run lint` in this package enforces it.

## Why CSS, not CSS-in-JS

The tokens package emits plain CSS variables. Plain CSS keeps every consumer (any bundler, server-rendered or not) compatible with no runtime overhead and no theme provider, and AI tools can read and modify the styles without a build step.

## License

MIT. The license text is in [`LICENSE`](./LICENSE), which ships in the package. The Crewlet name, logo and character are trademarks and are not covered by that license.
