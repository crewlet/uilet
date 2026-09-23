# Lucide glyphs

The glyph drawings behind `@crewlethq/icons/glyphs`. The build compiles each file into one React component, so a consumer imports `XGlyph` rather than a font, a sprite or a URL, and a closed network draws the same glyph an open one does.

| Source | Version | Files | License | Upstream |
| ------ | ------- | ----- | ------- | -------- |
| `lucide-static` | 1.47.0 (17 September 2026) | one SVG per glyph, the upstream `LICENSE`, and `SHA256SUMS` | ISC, and MIT for the icons Lucide derives from Feather | <https://lucide.dev>, <https://github.com/lucide-icons/lucide> |

Every file is a stroke drawing on the 24 unit grid: an `<svg>` root carrying `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"` and round caps and joins, and one geometry element per line beneath it. `scripts/glyphs.mjs` refuses anything else, so a file the build would compile into something other than what upstream drew never reaches a component. The files keep upstream's stroke width of 2; the components draw at `var(--crewlet-glyph-stroke, 1.75)`, which is the approved design's weight, and the package [README](../README.md#glyphs) says how that is set.

## What the set is

Lucide publishes some 1,850 icons and this package carries the ones something draws, because a glyph nobody draws is a name somebody will reach for without asking whether it means what they want. The set is the union of:

- **The successors of the 105 Material Symbols** the package carried until 0.4, one per name, as the [migration table](../README.md#breaking-changes-in-050) lists them. That covers every glyph `@crewlethq/ui` and the Storybook imported, and every glyph the Crewlet console imports, including the four it had vendored for itself (`star`, the filled star, `bug_report` and `view_column`), which the Material set had since taken in.
- **The 59 drawings on the approved design's artboards** (Home, Inbox, the command palette, the navigation map, the board, a task, a trace, the org chart, an agent, knowledge, spend and settings). Each is the artboard's own rendering of a Lucide icon on the same grid, at the same 1.75 stroke, and is vendored as that icon: `activity`, `arrow-down-to-line`, `arrow-right`, `arrow-up-right`, `bell`, `book-open`, `brain`, `calendar`, `chart-no-axes-gantt`, `check`, `chevron-down`, `chevron-right`, `chevron-up`, `circle-check`, `clock`, `code`, `coins`, `columns-3`, `command`, `corner-down-left`, `cpu`, `database`, `ellipsis`, `file-text`, `globe`, `hash`, `house`, `inbox`, `info`, `key`, `link`, `list`, `list-filter`, `maximize-2`, `message-square`, `minus`, `network`, `paperclip`, `pause`, `pin`, `plug`, `plus`, `search`, `send`, `server`, `settings-2`, `shield`, `sliders-vertical`, `square-kanban`, `star`, `sun`, `table`, `triangle-alert`, `user`, `users`, `wand-sparkles`, `wrench`, `x` and `zap`.
- **`badge-percent`**, the discount note on the Storybook's `PricingCard`, which drew Material's `tag`, a hash sign, beside "Save $5 (10% off)".

## Provenance

The files are copied byte for byte out of the npm tarball of `lucide-static` 1.47.0, <https://registry.npmjs.org/lucide-static/-/lucide-static-1.47.0.tgz>, whose integrity is `sha512-yWIrkdXc688Feq5VjOktsKmV5Ikc7y5Nu3rrdtbr8nWjkJWk8QlnZfVtIak22Af+fNhZ7k4cTJpZo1zmj7X5sA==` (`npm view lucide-static@1.47.0 dist.integrity`). `scripts/vendor-glyphs.mjs` refuses a tarball with any other integrity before reading a byte of it. The tarball rather than a repository checkout or a CDN path, because it is the artifact the version names, and the registry signs it.

The upstream path of each file follows from its name: `x.svg` is `package/icons/x.svg` in the tarball, and `LICENSE` is `package/LICENSE`. Each drawing still opens with the comment upstream prints on it, `<!-- @license lucide-static v1.47.0 - ISC -->`, and the build checks that it names the pinned version.

Only canonical names are vendored. The tarball also carries every name Lucide has retired as a second file holding the same drawing (`trash-2` is `trash`, `building-2` is `building-complex`), and the script refuses one, naming the canonical icon to take instead.

[`SHA256SUMS`](./SHA256SUMS) holds the checksum of every file here, `LICENSE` included. `shasum -a 256 -c SHA256SUMS` verifies them from this directory, and the package build fails when a file is missing, unlisted or does not match its checksum.

## License

The drawings are Lucide's, under the ISC License. The icons Lucide derives from Feather are also under Feather's MIT License, and upstream's [`LICENSE`](./LICENSE) carries both texts and the list of those icons; it is vendored unchanged and checksummed with the drawings. Both licenses require their notice to travel with every copy, so the file ships in the npm tarball (`scripts/release.mjs` refuses a tarball that carries the drawings without it), in the built Storybook, and belongs in the third-party notices of any application that bundles the package, which reaches it as `@crewlethq/icons/glyphs/LICENSE`.

The package's own `license` field is therefore `MIT AND ISC`. The Feather portion needs no third term, because MIT already names the license of everything else in `@crewlethq/icons`.

## Adding or replacing a glyph

1. Run `node scripts/vendor-glyphs.mjs <name> ...` from the package root, with Lucide's own name for each icon (<https://lucide.dev/icons>). It downloads the pinned tarball, checks its integrity, writes each drawing and the upstream `LICENSE` here, and rewrites `SHA256SUMS` and the table below. With no arguments it re-extracts every glyph already here, which is how a new pin is applied.
2. To remove a glyph, delete its file and run the script with no arguments, so its checksum and its row go with it.
3. To move to a newer release, change `VERSION` and `INTEGRITY` in `scripts/glyphs.mjs` (from `npm view lucide-static@<version> dist.integrity`), run the script with no arguments, and update the version, date and integrity in this file. Review the diff: a glyph whose drawing changed upstream shows up as a changed file, and one that was renamed fails the run with the name it took.
4. Run `npm run build` in this package. The glyph components, `GLYPH_NAMES` and the `GlyphName` union are generated from the files here, so a new glyph needs no other edit. A glyph that may be drawn filled is also added to `FILLABLE` in `scripts/glyphs.mjs`, and the build refuses one whose drawing is not closed.

## The glyphs

<!-- The table below is written by scripts/vendor-glyphs.mjs. Do not edit it by hand. -->

| Glyph | Component | Upstream file |
| ----- | --------- | ------------- |
| `activity` | `ActivityGlyph` | `package/icons/activity.svg` |
| `arrow-down` | `ArrowDownGlyph` | `package/icons/arrow-down.svg` |
| `arrow-down-to-line` | `ArrowDownToLineGlyph` | `package/icons/arrow-down-to-line.svg` |
| `arrow-right` | `ArrowRightGlyph` | `package/icons/arrow-right.svg` |
| `arrow-up` | `ArrowUpGlyph` | `package/icons/arrow-up.svg` |
| `arrow-up-down` | `ArrowUpDownGlyph` | `package/icons/arrow-up-down.svg` |
| `arrow-up-right` | `ArrowUpRightGlyph` | `package/icons/arrow-up-right.svg` |
| `badge-percent` | `BadgePercentGlyph` | `package/icons/badge-percent.svg` |
| `ban` | `BanGlyph` | `package/icons/ban.svg` |
| `bell` | `BellGlyph` | `package/icons/bell.svg` |
| `book-open` | `BookOpenGlyph` | `package/icons/book-open.svg` |
| `bot` | `BotGlyph` | `package/icons/bot.svg` |
| `brain` | `BrainGlyph` | `package/icons/brain.svg` |
| `bug` | `BugGlyph` | `package/icons/bug.svg` |
| `building-complex` | `BuildingComplexGlyph` | `package/icons/building-complex.svg` |
| `calendar` | `CalendarGlyph` | `package/icons/calendar.svg` |
| `calendar-clock` | `CalendarClockGlyph` | `package/icons/calendar-clock.svg` |
| `camera` | `CameraGlyph` | `package/icons/camera.svg` |
| `chart-no-axes-gantt` | `ChartNoAxesGanttGlyph` | `package/icons/chart-no-axes-gantt.svg` |
| `check` | `CheckGlyph` | `package/icons/check.svg` |
| `chevron-down` | `ChevronDownGlyph` | `package/icons/chevron-down.svg` |
| `chevron-left` | `ChevronLeftGlyph` | `package/icons/chevron-left.svg` |
| `chevron-right` | `ChevronRightGlyph` | `package/icons/chevron-right.svg` |
| `chevron-up` | `ChevronUpGlyph` | `package/icons/chevron-up.svg` |
| `chevrons-left` | `ChevronsLeftGlyph` | `package/icons/chevrons-left.svg` |
| `chevrons-right` | `ChevronsRightGlyph` | `package/icons/chevrons-right.svg` |
| `chevrons-up-down` | `ChevronsUpDownGlyph` | `package/icons/chevrons-up-down.svg` |
| `circle-alert` | `CircleAlertGlyph` | `package/icons/circle-alert.svg` |
| `circle-check` | `CircleCheckGlyph` | `package/icons/circle-check.svg` |
| `circle-question-mark` | `CircleQuestionMarkGlyph` | `package/icons/circle-question-mark.svg` |
| `clock` | `ClockGlyph` | `package/icons/clock.svg` |
| `code` | `CodeGlyph` | `package/icons/code.svg` |
| `cog` | `CogGlyph` | `package/icons/cog.svg` |
| `coins` | `CoinsGlyph` | `package/icons/coins.svg` |
| `columns-3` | `Columns3Glyph` | `package/icons/columns-3.svg` |
| `command` | `CommandGlyph` | `package/icons/command.svg` |
| `compass` | `CompassGlyph` | `package/icons/compass.svg` |
| `copy` | `CopyGlyph` | `package/icons/copy.svg` |
| `corner-down-left` | `CornerDownLeftGlyph` | `package/icons/corner-down-left.svg` |
| `cpu` | `CpuGlyph` | `package/icons/cpu.svg` |
| `crown` | `CrownGlyph` | `package/icons/crown.svg` |
| `database` | `DatabaseGlyph` | `package/icons/database.svg` |
| `diff` | `DiffGlyph` | `package/icons/diff.svg` |
| `ellipsis` | `EllipsisGlyph` | `package/icons/ellipsis.svg` |
| `ellipsis-vertical` | `EllipsisVerticalGlyph` | `package/icons/ellipsis-vertical.svg` |
| `external-link` | `ExternalLinkGlyph` | `package/icons/external-link.svg` |
| `eye` | `EyeGlyph` | `package/icons/eye.svg` |
| `eye-off` | `EyeOffGlyph` | `package/icons/eye-off.svg` |
| `file-text` | `FileTextGlyph` | `package/icons/file-text.svg` |
| `flag` | `FlagGlyph` | `package/icons/flag.svg` |
| `folder` | `FolderGlyph` | `package/icons/folder.svg` |
| `folder-input` | `FolderInputGlyph` | `package/icons/folder-input.svg` |
| `folder-plus` | `FolderPlusGlyph` | `package/icons/folder-plus.svg` |
| `fullscreen` | `FullscreenGlyph` | `package/icons/fullscreen.svg` |
| `globe` | `GlobeGlyph` | `package/icons/globe.svg` |
| `grip-vertical` | `GripVerticalGlyph` | `package/icons/grip-vertical.svg` |
| `hash` | `HashGlyph` | `package/icons/hash.svg` |
| `house` | `HouseGlyph` | `package/icons/house.svg` |
| `inbox` | `InboxGlyph` | `package/icons/inbox.svg` |
| `info` | `InfoGlyph` | `package/icons/info.svg` |
| `key` | `KeyGlyph` | `package/icons/key.svg` |
| `layers` | `LayersGlyph` | `package/icons/layers.svg` |
| `layout-dashboard` | `LayoutDashboardGlyph` | `package/icons/layout-dashboard.svg` |
| `link` | `LinkGlyph` | `package/icons/link.svg` |
| `list` | `ListGlyph` | `package/icons/list.svg` |
| `list-filter` | `ListFilterGlyph` | `package/icons/list-filter.svg` |
| `maximize` | `MaximizeGlyph` | `package/icons/maximize.svg` |
| `maximize-2` | `Maximize2Glyph` | `package/icons/maximize-2.svg` |
| `menu` | `MenuGlyph` | `package/icons/menu.svg` |
| `message-square` | `MessageSquareGlyph` | `package/icons/message-square.svg` |
| `minimize` | `MinimizeGlyph` | `package/icons/minimize.svg` |
| `minus` | `MinusGlyph` | `package/icons/minus.svg` |
| `monitor` | `MonitorGlyph` | `package/icons/monitor.svg` |
| `moon` | `MoonGlyph` | `package/icons/moon.svg` |
| `network` | `NetworkGlyph` | `package/icons/network.svg` |
| `package` | `PackageGlyph` | `package/icons/package.svg` |
| `paperclip` | `PaperclipGlyph` | `package/icons/paperclip.svg` |
| `pause` | `PauseGlyph` | `package/icons/pause.svg` |
| `pencil` | `PencilGlyph` | `package/icons/pencil.svg` |
| `pin` | `PinGlyph` | `package/icons/pin.svg` |
| `plug` | `PlugGlyph` | `package/icons/plug.svg` |
| `plus` | `PlusGlyph` | `package/icons/plus.svg` |
| `power` | `PowerGlyph` | `package/icons/power.svg` |
| `redo` | `RedoGlyph` | `package/icons/redo.svg` |
| `refresh-ccw` | `RefreshCcwGlyph` | `package/icons/refresh-ccw.svg` |
| `refresh-cw` | `RefreshCwGlyph` | `package/icons/refresh-cw.svg` |
| `repeat-2` | `Repeat2Glyph` | `package/icons/repeat-2.svg` |
| `rotate-ccw` | `RotateCcwGlyph` | `package/icons/rotate-ccw.svg` |
| `rotate-cw` | `RotateCwGlyph` | `package/icons/rotate-cw.svg` |
| `save` | `SaveGlyph` | `package/icons/save.svg` |
| `search` | `SearchGlyph` | `package/icons/search.svg` |
| `send` | `SendGlyph` | `package/icons/send.svg` |
| `server` | `ServerGlyph` | `package/icons/server.svg` |
| `settings` | `SettingsGlyph` | `package/icons/settings.svg` |
| `settings-2` | `Settings2Glyph` | `package/icons/settings-2.svg` |
| `shield` | `ShieldGlyph` | `package/icons/shield.svg` |
| `shield-user` | `ShieldUserGlyph` | `package/icons/shield-user.svg` |
| `sliders-vertical` | `SlidersVerticalGlyph` | `package/icons/sliders-vertical.svg` |
| `split` | `SplitGlyph` | `package/icons/split.svg` |
| `square-kanban` | `SquareKanbanGlyph` | `package/icons/square-kanban.svg` |
| `square-terminal` | `SquareTerminalGlyph` | `package/icons/square-terminal.svg` |
| `star` | `StarGlyph` | `package/icons/star.svg` |
| `sun` | `SunGlyph` | `package/icons/sun.svg` |
| `table` | `TableGlyph` | `package/icons/table.svg` |
| `target` | `TargetGlyph` | `package/icons/target.svg` |
| `trash` | `TrashGlyph` | `package/icons/trash.svg` |
| `triangle-alert` | `TriangleAlertGlyph` | `package/icons/triangle-alert.svg` |
| `undo` | `UndoGlyph` | `package/icons/undo.svg` |
| `user` | `UserGlyph` | `package/icons/user.svg` |
| `user-plus` | `UserPlusGlyph` | `package/icons/user-plus.svg` |
| `users` | `UsersGlyph` | `package/icons/users.svg` |
| `wand-sparkles` | `WandSparklesGlyph` | `package/icons/wand-sparkles.svg` |
| `wrench` | `WrenchGlyph` | `package/icons/wrench.svg` |
| `x` | `XGlyph` | `package/icons/x.svg` |
| `zap` | `ZapGlyph` | `package/icons/zap.svg` |
| `zoom-in` | `ZoomInGlyph` | `package/icons/zoom-in.svg` |
| `zoom-out` | `ZoomOutGlyph` | `package/icons/zoom-out.svg` |

<!-- End of the generated table. -->
