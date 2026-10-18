# @crewlethq/artifact-kit

The Crewlet design system as a framework-free browser bundle, for the pages people and agents publish as artifacts. An artifact page links it and paints with the same tokens, themes and fonts as the dashboard around it, and follows the reader's appearance as it changes.

The engine serves this package's `dist/` directory, unchanged, from the artifact's own origin at `/_crewlet/kit/<version>/`, so a page never fetches it from a third-party host and works on a closed network.

## What a page links

```html
<link rel="stylesheet" href="/_crewlet/kit/0.18.0/kit.css">
<script src="/_crewlet/kit/0.18.0/theme.js"></script>
```

Link both in the `<head>`, `theme.js` as a classic blocking script, before anything paints. Then write colours, spacing and type with the tokens rather than literal values:

```css
.summary {
  padding: var(--spacing-3);
  border-radius: var(--radius-md);
  background: var(--color-surface-elevated);
  color: var(--color-text-primary);
}
```

## What is in it

| File | Content |
| ---- | ------- |
| `kit.css` | The canonical variables, the dark and light palettes of the default theme, every named theme under `data-palette`, the density steps under `data-density`, the self-hosted Geist and Geist Mono faces and the document baseline, in one file. |
| `fonts/` | The four Geist faces `kit.css` references, with `OFL.txt`. |
| `theme.js` | The theme bootstrap, under 2 KB gzipped. |

`theme.js` reads the reader's appearance from the frame URL's fragment, where the dashboard puts it (`#nonce=...&theme=dark&palette=dusk&density=compact`), and writes `data-theme`, `data-palette` and `data-density` on `<html>` before the first paint, exactly as the dashboard writes its own. When the dashboard transfers the bridge port it follows the reader's appearance on it, so changing the theme in the dashboard repaints the page without a reload. Every value is checked against the allowed ones before it is written. The wire it speaks is `FrameProtocol` in `@crewlethq/ui`, bundled rather than restated.

## Budgets

The build refuses a kit over either budget, and the suite holds the built files to the same numbers (`scripts/budgets.mjs`):

| File | Gzipped budget |
| ---- | -------------- |
| `theme.js` | 2 KB |
| `kit.css` | 40 KB |

## Building

```sh
npm run build --workspace @crewlethq/artifact-kit   # dist/
npm test --workspace @crewlethq/artifact-kit        # the suite over dist/
```

It builds from `@crewlethq/tokens` and `@crewlethq/ui` as a consumer installs them, so the kit carries exactly what the published packages carry.

## License

The code is licensed under the [MIT License](LICENSE). The Geist and Geist Mono font files in `dist/fonts/` are licensed under the SIL Open Font License 1.1 (`dist/fonts/OFL.txt`).
