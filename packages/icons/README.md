# @crewlethq/icons

Crewlet signature icon set, including the illustrated agent variants such as `agent-reading` (crewlet reading a book). SVG sources live in `svg/`. The build compiles each one into a typed React component and re-exports them through a single `<Icon name="..." />` API.

## Use it

```tsx
import { Icon } from '@crewlethq/icons';

<Icon name="AgentReading" size="lg" title="Documentation" />
```

`size` accepts `'sm' | 'md' | 'lg' | 'xl'`, a number (px), or any CSS length string. `title` makes the icon accessible to screen readers; without it, the icon is marked `aria-hidden`.

`name` is typed as the `IconName` union, so TypeScript rejects a name the package does not ship. Plain JavaScript gets no such check, and `<Icon>` renders nothing for an unknown name, so search for a name across the whole project when an icon is renamed. `ICON_NAMES` lists every name in file-name order; treat it as a set and never index it by position, because adding or renaming an icon shifts the order.

Each icon is also exported as its own component through the `Icons` namespace (`<Icons.AgentReading />`).

### Raw SVG files

The source SVGs ship in the package and are exported as `@crewlethq/icons/svg/*`, for an `<img>`, a favicon or any other surface that needs a file rather than a React component:

```ts
import markUrl from '@crewlethq/icons/svg/crewlet-icon.svg';
```

A bundler resolves the import to a URL. Outside a bundler, resolve the same specifier with `import.meta.resolve('@crewlethq/icons/svg/crewlet-icon.svg')` to get the file on disk.

### CrewletFigure

`CrewletFigure` renders the Crewlet character as five separately animated body parts:

```tsx
import { CrewletFigure } from '@crewlethq/icons';

<CrewletFigure motion="wave" style={{ fontSize: 96 }} />
```

| Prop | Type | Default | Purpose |
| ---- | ---- | ------- | ------- |
| `motion` | `CrewletMotion`: `'idle' \| 'dance' \| 'wave' \| 'jump' \| 'walk' \| 'spin'` | `'idle'` | The looping motion. |
| `delay` | number (seconds) | `0` | Phase offset, so several figures do not move in lockstep. |
| `color` | CSS colour | `'#7c56ff'` | Body fill. |
| `fillGaps` | boolean | `true` | Backs each joint with body, so a moving limb never uncovers a gap. `false` renders the plain trim, where the pieces meet with visible seams. |

The figure is sized in `em` like the icons (set `font-size` or pass `width` and `height`) and is `aria-hidden`; give the surrounding element an accessible name when the figure carries meaning. Every motion stops when the user prefers reduced motion. The geometry lives in `src/crewletParts.ts`.

## Add an icon

1. Drop `<your-icon>.svg` into `svg/`. File names become PascalCase component names (for example, `agent-celebrating.svg` -> `AgentCelebrating`).
2. Run `npm run build`.
3. The new icon is auto-exported from `@crewlethq/icons` and appears in `ICON_NAMES`.

## Conventions for source SVGs

Three families coexist in this package:

**Brand artwork**: `crewlet-icon` (the Crewlet mark) and `crewlet-reading` (a full-colour illustration of the Crewlet character reading a newspaper), together with `CrewletFigure`. Filled artwork on its own viewBox; render it as supplied. `crewlet-reading` is a large, detailed illustration (about 670 KB of SVG), so reserve it for hero and empty-state surfaces rather than inline icon slots. The Crewlet name, mark and character are trademarks that the MIT License does not cover; see [TRADEMARKS.md](./TRADEMARKS.md) before using them outside an official Crewlet product.

**Feature illustrations** (80x80): `hierarchy`, `human-in-loop` and `company-as-code`. Self-contained artwork with its own gradients and background disc, so it does not inherit `currentColor`. The build prefixes every `id` in a file with that file's name, because inline SVGs share the page's id space; keep gradient and other `id` references inside the file that defines them.

**Signature illustrations** (32x32): the crewlet "agent" character in different contexts (`agent-idle`, `agent-working`, `agent-thinking`, `agent-reading`, `agent-greeting`, `agent-success`, `agent-error` and `agent-loading`). The set reads as one character through a shared line style and scale rather than an identical outline: the head and shoulders move, shrink or give way to a torso when the pose needs room for a prop (a book, a desk, a thought bubble). Name new variants `agent-<pose>.svg`.

Signature illustrations follow these rules so they recolor from CSS and sit on one visual weight:
- A `0 0 32 32` viewBox.
- `stroke="currentColor"` and `fill="none"`.
- A single 1.6 stroke weight.
- `stroke-linecap="round"` and `stroke-linejoin="round"`.
- No hard-coded width or height attributes (the build strips them).

## License

MIT. The license text is in [`LICENSE`](./LICENSE), which ships in the package. The license covers copyright only: the Crewlet name, logo and character are trademarks, and [`TRADEMARKS.md`](./TRADEMARKS.md), which also ships in the package, says how they may be used.
