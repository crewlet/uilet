import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { ChevronDownGlyph, ChevronLeftGlyph, EllipsisGlyph } from '@crewlethq/icons/glyphs';
import { ArtifactIcon } from '../ArtifactIcon/index.js';
import type { ArtifactKind } from '../ArtifactKindGlyph/index.js';
import { Button } from '../Button/index.js';
import { IconButton } from '../IconButton/index.js';
import { Kbd, isApplePlatform } from '../Kbd/index.js';
import { Menu, type MenuEntry, type MenuItem } from '../Menu/index.js';
import { SegmentedControl } from '../SegmentedControl/index.js';
import { Tooltip } from '../Tooltip/index.js';
import { cx } from '../utils/cx.js';

/**
 * One control at the bar's end: a panel it opens, or an action it runs.
 *
 * A TOOL IS DATA, NOT AN ELEMENT, because the bar draws each one twice: as an
 * icon button while the bar has room, and as a row of the More menu once it
 * does not. An element could only ever be drawn in one of the two.
 */
export interface ArtifactBarTool {
  key: string;
  /** What it does, in words: the button's name, its tooltip and its menu row. */
  label: string;
  /** A glyph from @crewlethq/icons/glyphs. */
  icon: ReactNode;
  onSelect: () => void;
  /** A panel it opens is open: drawn pressed, and said to be. */
  pressed?: boolean | undefined;
  /**
   * The shortcut, as the keys it is pressed with (`['h']`, `['Mod', 'k']`).
   * Drawn in the tooltip and the menu row and set as `aria-keyshortcuts`;
   * binding it is the caller's.
   */
  keys?: readonly string[] | undefined;
  /** A small figure on the glyph: how many people are here. Say it in `label` too. */
  badge?: string | number | undefined;
  /** Unavailable, and why. The control stays drawn and says it. */
  disabledReason?: string | undefined;
  /**
   * Drawn with its word beside the glyph while the bar is wide, and kept in
   * the bar as a glyph when it is not, rather than folded into More: Share,
   * or a kind's primary action such as a doc's Edit.
   */
  labelled?: boolean | undefined;
  /**
   * `primary`: the one action a kind's state turns on, such as Save while a
   * doc is edited. Drawn as the primary button, labelled, and its word kept at
   * every width, because a glyph alone does not say what a press commits.
   */
  emphasis?: 'primary' | undefined;
  /**
   * A primary tool's word on a narrow bar, where the full one would push the
   * title out: "Create" for "Create and ask SRE Lead". The full word stays its
   * accessible name at every width, and it is drawn whole while there is room.
   */
  shortLabel?: string | undefined;
}

/** The ways a kind draws itself, as one choice: a deck's Edit, Grid and Present. */
export interface ArtifactBarModes {
  /** Names the group: "View". */
  label: string;
  value: string;
  options: readonly { value: string; label: string; icon?: ReactNode }[];
  onValueChange: (value: string) => void;
}

export interface ArtifactBarLabels {
  /** The More menu's name. */
  more: (title: string) => string;
  /** Said after the title's own name when it can be renamed by pressing it. */
  renameHint: string;
  /** The title field's name while renaming. */
  titleField: string;
  /** What an empty title is told. */
  emptyTitle: string;
}

export const ARTIFACT_BAR_LABELS: ArtifactBarLabels = {
  more: (title) => `More for “${title}”`,
  renameHint: 'Rename',
  titleField: 'Title',
  emptyTitle: 'A title cannot be empty.',
};

export interface ArtifactBarProps {
  title: string;
  kind: ArtifactKind;
  /** The artifact's own icon word; its kind's glyph where it has none. */
  icon?: string | null | undefined;
  /** What the kind is called, said with the glyph: "Slides". */
  kindLabel: string;
  /** The way back to where the reader came from, as a link. */
  back?: { href: string; label: string } | undefined;
  /** Before everything, such as an application shell's navigation toggle. */
  start?: ReactNode;
  /**
   * Renames in place. Left out, the title is read only. It answers what went
   * wrong, in a sentence, to keep the field open and say it; or nothing when
   * the new title was taken.
   */
  onRename?: ((title: string) => Promise<string | null | undefined | void> | string | null | undefined | void) | undefined;
  /** Whether the title is being renamed now; controlled, for a Rename row elsewhere. */
  renaming?: boolean | undefined;
  onRenamingChange?: ((renaming: boolean) => void) | undefined;
  /** Beside the title: the version chip ([ArtifactVersionChip]). */
  version?: ReactNode;
  /** The kind's views, drawn in the middle of the bar. */
  modes?: ArtifactBarModes | undefined;
  /** Who else is here, such as a presence stack. Folded away first on a narrower bar. */
  presence?: ReactNode;
  /**
   * What the kind is doing now, said before its tools: an `EditingStatus`
   * while a doc is edited, or plain words ("Creating…"), which the bar draws
   * in its quiet small step. Never folded away; a status that has words to
   * spare folds them itself.
   */
  status?: ReactNode;
  /** The kind's own controls, before the panels: a doc's Edit. */
  kindTools?: readonly ArtifactBarTool[] | undefined;
  /** The panels and actions every artifact has: details, history, people, share. */
  tools?: readonly ArtifactBarTool[] | undefined;
  /** The More menu's own rows. The tools that fold on a narrow bar are added above them. */
  menu?: readonly MenuEntry[] | undefined;
  /** `header` stands as the page's banner; `div` sits inside a host's own. */
  as?: 'header' | 'div' | undefined;
  /** The title's heading level: 1 where the bar is the page's own head. */
  headingLevel?: 1 | 2 | 3 | undefined;
  /** The title is still being read: a placeholder stands in its place. */
  pending?: boolean | undefined;
  labels?: Partial<ArtifactBarLabels> | undefined;
  className?: string | undefined;
}

/**
 * The one slim bar an open artifact sits under, so the artifact keeps the
 * rest of the screen.
 *
 * WHAT IT HOLDS, IN THE ORDER A READER SCANS IT: the way back, what the
 * artifact is (its glyph and its title, renamed in place by whoever may), the
 * version on show, then the kind's own views in the middle, and at the end
 * who else is here, the kind's tools, the panels every artifact has, Share
 * and More. Everything past the title opens on demand: a panel, a menu or a
 * dialog, never a second row of chrome.
 *
 * IT FOLDS BY ITS OWN WIDTH, a container query rather than the window's, since
 * a sidebar or a panel beside it is what decides its room. Narrower than a
 * laptop's sheet the presence stack goes, then the labelled tools' words;
 * narrower than a phone's two panes, the views and every tool but the
 * labelled ones fold into More, where each is a row with its shortcut, and
 * the kind's glyph gives the title its room. Both arrangements are drawn and
 * the stylesheet shows one, so no control is ever in two places a reader can
 * see at once and nothing is measured in script.
 */
export function ArtifactBar({
  title,
  kind,
  icon,
  kindLabel,
  back,
  start,
  onRename,
  renaming,
  onRenamingChange,
  version,
  modes,
  presence,
  status,
  kindTools = [],
  tools = [],
  menu = [],
  as = 'header',
  headingLevel = 1,
  pending = false,
  labels,
  className,
}: ArtifactBarProps) {
  const words = { ...ARTIFACT_BAR_LABELS, ...labels };
  const headingId = useId();
  const Root = as;
  const apple = isApplePlatform();
  const folding = [...kindTools, ...tools].filter((t) => !t.labelled);
  const pinned = [...kindTools, ...tools].filter((t) => t.labelled);
  const folded: MenuEntry[] = [
    ...(modes
      ? modes.options.map(
          (option): MenuItem => ({
            key: `mode:${option.value}`,
            label: option.label,
            icon: option.icon,
            checked: option.value === modes.value,
            onSelect: () => modes.onValueChange(option.value),
          }),
        )
      : []),
    ...(modes && folding.length > 0 ? [{ kind: 'separator' as const, key: 'sep:modes' }] : []),
    ...folding.map(
      (tool): MenuItem => ({
        key: `tool:${tool.key}`,
        label: tool.label,
        icon: tool.icon,
        onSelect: tool.onSelect,
        ...(tool.disabledReason !== undefined ? { disabled: true, description: tool.disabledReason } : {}),
        ...(tool.keys ? { hint: <Kbd keys={tool.keys} subtle apple={apple} /> } : {}),
      }),
    ),
  ];
  const narrowMenu: MenuEntry[] = [
    ...folded,
    ...(folded.length > 0 && menu.length > 0 ? [{ kind: 'separator' as const, key: 'sep:menu' }] : []),
    ...menu,
  ];
  return (
    <Root
      className={cx('crewlet-artifact-bar', presence ? 'crewlet-artifact-bar--present' : null, className)}
      aria-labelledby={pending ? undefined : headingId}
    >
      <div className={cx('crewlet-artifact-bar__row', modes && 'crewlet-artifact-bar__row--centred')}>
        <div className="crewlet-artifact-bar__lead">
          {start}
          {back ? (
            <Tooltip content={back.label} placement="bottom">
              <IconButton asChild label={back.label} size="sm" variant="ghost" title="">
                <a href={back.href}>
                  <ChevronLeftGlyph size="sm" />
                </a>
              </IconButton>
            </Tooltip>
          ) : null}
          <span className={cx('crewlet-artifact-bar__glyph', `crewlet-kind--${kind}`)} role="img" aria-label={kindLabel} title={kindLabel}>
            <ArtifactIcon icon={icon ?? undefined} kind={kind} size="sm" />
          </span>
          {pending ? (
            <span className="crewlet-artifact-bar__placeholder" aria-hidden />
          ) : (
            <BarTitle
              title={title}
              id={headingId}
              level={headingLevel}
              onRename={onRename}
              renaming={renaming}
              onRenamingChange={onRenamingChange}
              words={words}
            />
          )}
          {version ? <span className="crewlet-artifact-bar__version">{version}</span> : null}
        </div>
        {modes ? (
          <div className="crewlet-artifact-bar__modes crewlet-artifact-bar__wide">
            <SegmentedControl
              label={modes.label}
              semantics="radio"
              size="sm"
              options={modes.options.map((o) => ({ value: o.value, label: o.label, ...(o.icon ? { icon: o.icon } : {}) }))}
              value={modes.value}
              onValueChange={modes.onValueChange}
            />
          </div>
        ) : null}
        <div className="crewlet-artifact-bar__end">
          {status ? <span className="crewlet-artifact-bar__status">{status}</span> : null}
          {presence ? <span className="crewlet-artifact-bar__presence">{presence}</span> : null}
          {kindTools.some((t) => !t.labelled) ? (
            <span className="crewlet-artifact-bar__tools crewlet-artifact-bar__wide">
              {kindTools.filter((t) => !t.labelled).map((tool) => (
                <ToolButton key={tool.key} tool={tool} apple={apple} />
              ))}
            </span>
          ) : null}
          {tools.some((t) => !t.labelled) ? (
            <span className="crewlet-artifact-bar__tools crewlet-artifact-bar__wide">
              {kindTools.some((t) => !t.labelled) ? <span className="crewlet-artifact-bar__rule" aria-hidden /> : null}
              {tools.filter((t) => !t.labelled).map((tool) => (
                <ToolButton key={tool.key} tool={tool} apple={apple} />
              ))}
            </span>
          ) : null}
          {pinned.length > 0 ? (
            <span className="crewlet-artifact-bar__tools">
              {pinned.map((tool) => (
                <LabelledTool key={tool.key} tool={tool} apple={apple} />
              ))}
            </span>
          ) : null}
          {menu.length > 0 ? (
            <span className="crewlet-artifact-bar__wide">
              <Menu label={words.more(title)} icon={<EllipsisGlyph size="sm" />} triggerVariant="ghost" align="end" items={menu} />
            </span>
          ) : null}
          {narrowMenu.length > 0 ? (
            <span className="crewlet-artifact-bar__narrow">
              <Menu
                label={words.more(title)}
                icon={<EllipsisGlyph size="sm" />}
                triggerVariant="ghost"
                align="end"
                items={narrowMenu}
              />
            </span>
          ) : null}
        </div>
      </div>
    </Root>
  );
}

/** The `aria-keyshortcuts` spelling of a shortcut: `Control+K`, `H`. */
function ariaKeys(keys: readonly string[], apple: boolean): string {
  return keys
    .map((key) => {
      if (key === 'Mod') return apple ? 'Meta' : 'Control';
      return key.length === 1 ? key.toUpperCase() : key;
    })
    .join('+');
}

function Tip({ tool, apple }: { tool: ArtifactBarTool; apple: boolean }) {
  return (
    <span className="crewlet-artifact-bar__tip">
      {tool.label}
      {tool.keys ? <Kbd keys={tool.keys} subtle apple={apple} /> : null}
    </span>
  );
}

/** A tool as an icon button, its name and shortcut in the tooltip. */
function ToolButton({ tool, apple }: { tool: ArtifactBarTool; apple: boolean }) {
  return (
    <span className="crewlet-artifact-bar__tool">
      <Tooltip content={<Tip tool={tool} apple={apple} />} placement="bottom">
        <IconButton
          label={tool.label}
          icon={tool.icon}
          size="sm"
          variant="ghost"
          // The tooltip carries the name; a native one beside it is a second tip.
          title=""
          pressed={tool.pressed}
          disabledReason={tool.disabledReason}
          aria-keyshortcuts={tool.keys ? ariaKeys(tool.keys, apple) : undefined}
          onClick={tool.onSelect}
        />
      </Tooltip>
      {tool.badge !== undefined ? (
        <span className="crewlet-artifact-bar__badge" aria-hidden>
          {tool.badge}
        </span>
      ) : null}
    </span>
  );
}

/** A labelled tool: its word beside the glyph while the bar is wide, the glyph alone when it is not. */
function LabelledTool({ tool, apple }: { tool: ArtifactBarTool; apple: boolean }) {
  const shortcut = tool.keys ? ariaKeys(tool.keys, apple) : undefined;
  if (tool.emphasis === 'primary') {
    return (
      <Tooltip content={<Tip tool={tool} apple={apple} />} placement="bottom" disabled={!tool.keys}>
        <Button
          size="small"
          variant="primary"
          leadingIcon={tool.icon}
          disabledReason={tool.disabledReason}
          aria-keyshortcuts={shortcut}
          aria-label={tool.shortLabel ? tool.label : undefined}
          onClick={tool.onSelect}
        >
          {tool.shortLabel ? (
            <>
              <span className="crewlet-artifact-bar__word-full">{tool.label}</span>
              <span className="crewlet-artifact-bar__word-short">{tool.shortLabel}</span>
            </>
          ) : (
            tool.label
          )}
        </Button>
      </Tooltip>
    );
  }
  return (
    <>
      <span className="crewlet-artifact-bar__roomy">
        <Tooltip content={<Tip tool={tool} apple={apple} />} placement="bottom" disabled={!tool.keys}>
          <Button
            size="small"
            variant="secondary"
            leadingIcon={tool.icon}
            pressed={tool.pressed}
            disabledReason={tool.disabledReason}
            aria-keyshortcuts={shortcut}
            onClick={tool.onSelect}
          >
            {tool.label}
          </Button>
        </Tooltip>
      </span>
      <span className="crewlet-artifact-bar__tight">
        <Tooltip content={<Tip tool={tool} apple={apple} />} placement="bottom">
          <IconButton
            label={tool.label}
            icon={tool.icon}
            size="sm"
            variant="ghost"
            title=""
            pressed={tool.pressed}
            disabledReason={tool.disabledReason}
            aria-keyshortcuts={shortcut}
            onClick={tool.onSelect}
          />
        </Tooltip>
      </span>
    </>
  );
}

/**
 * The title, and renaming it in place.
 *
 * THE HEADING KEEPS THE TITLE AS ITS NAME. Pressing it renames, so where it
 * may be renamed the words are a button inside the heading rather than the
 * heading made a button: a reader moving by heading still hears the title,
 * and the button says what pressing it does in its description.
 *
 * ENTER TAKES IT, ESCAPE PUTS IT BACK, AND LEAVING THE FIELD TAKES IT TOO, as
 * every title renamed in place does. Escape is the field's own, so the panel
 * or the page under it does not close on the same press. An answer that names
 * a problem keeps the field open and says it there.
 */
function BarTitle({
  title,
  id,
  level,
  onRename,
  renaming,
  onRenamingChange,
  words,
}: {
  title: string;
  id: string;
  level: 1 | 2 | 3;
  onRename: ArtifactBarProps['onRename'];
  renaming: boolean | undefined;
  onRenamingChange: ((renaming: boolean) => void) | undefined;
  words: ArtifactBarLabels;
}) {
  const Heading = `h${level}` as const;
  const hintId = useId();
  const errorId = useId();
  const [own, setOwn] = useState(false);
  const editing = (renaming ?? own) && onRename !== undefined;
  const setEditing = (on: boolean) => {
    if (renaming === undefined) setOwn(on);
    onRenamingChange?.(on);
  };
  const [draft, setDraft] = useState(title);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const field = useRef<HTMLInputElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const settled = useRef(false);

  useEffect(() => {
    if (!editing) return;
    settled.current = false;
    setDraft(title);
    setError(null);
    const el = field.current;
    el?.focus();
    el?.select();
    // Only on opening: a title pushed from elsewhere while typing must not
    // replace what the reader is typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  if (onRename === undefined) {
    return (
      <Heading id={id} className="crewlet-artifact-bar__title" title={title}>
        {title}
      </Heading>
    );
  }

  const finish = (refocus: boolean) => {
    settled.current = true;
    setEditing(false);
    setError(null);
    if (refocus) requestAnimationFrame(() => button.current?.focus());
  };

  const commit = async (refocus: boolean) => {
    if (settled.current || busy) return;
    const next = draft.trim();
    if (next === title) {
      finish(refocus);
      return;
    }
    if (next === '') {
      setError(words.emptyTitle);
      return;
    }
    setBusy(true);
    try {
      const answer = await onRename(next);
      if (typeof answer === 'string' && answer !== '') {
        setError(answer);
        field.current?.focus();
        return;
      }
      finish(refocus);
    } finally {
      setBusy(false);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      void commit(true);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      finish(true);
    }
  };

  if (editing) {
    return (
      <Heading id={id} className="crewlet-artifact-bar__title crewlet-artifact-bar__title--editing">
        <span className="crewlet-artifact-bar__sizer" data-value={draft || ' '}>
          <input
            ref={field}
            className="crewlet-artifact-bar__field"
            aria-label={words.titleField}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            aria-busy={busy || undefined}
            readOnly={busy}
            value={draft}
            size={1}
            onChange={(event) => {
              setDraft(event.target.value);
              if (error) setError(null);
            }}
            onKeyDown={onKeyDown}
            onBlur={() => void commit(false)}
          />
        </span>
        {error ? (
          <span id={errorId} role="alert" className="crewlet-artifact-bar__error">
            {error}
          </span>
        ) : null}
      </Heading>
    );
  }
  // The hint is beside the heading, not in it, or it would join the title in
  // the heading's own name.
  return (
    <>
      <Heading id={id} className="crewlet-artifact-bar__title">
        <button
          ref={button}
          type="button"
          className="crewlet-artifact-bar__rename"
          title={title}
          aria-describedby={hintId}
          onClick={() => setEditing(true)}
        >
          {title}
        </button>
      </Heading>
      {/* HIDDEN, NOT VISUALLY HIDDEN: a description is read from a hidden
          element, and a visually hidden one was also a stray "Rename" a
          screen reader met on its own beside the title. */}
      <span id={hintId} hidden>
        {words.renameHint}
      </span>
    </>
  );
}

export interface ArtifactVersionChipProps {
  /** The version on show. */
  version: number;
  /** The newest version. */
  latest: number;
  /** The versions to pick from, newest first, and what else the menu offers. */
  items: readonly MenuEntry[];
  /** Names the menu. */
  label?: string | undefined;
  /** The chip's words: `v3`, or `v2 of 3` for an older one. */
  format?: ((version: number, latest: number) => string) | undefined;
}

/**
 * The version on show, as a quiet chip beside the title that opens the
 * versions. An older version than the newest says so in the chip itself and
 * takes the accent, so a reader looking at history cannot mistake it for
 * what everyone else sees.
 */
export function ArtifactVersionChip({
  version,
  latest,
  items,
  label = 'Versions',
  format = (v, l) => (v === l ? `v${v}` : `v${v} of ${l}`),
}: ArtifactVersionChipProps) {
  const older = version !== latest;
  return (
    <Menu
      label={label}
      items={items}
      align="start"
      renderTrigger={(props) => (
        <button
          {...props}
          type="button"
          className={cx('crewlet-version-chip', older && 'crewlet-version-chip--older')}
          aria-label={`${label}: ${format(version, latest)}`}
        >
          <span className="crewlet-version-chip__words">{format(version, latest)}</span>
          <ChevronDownGlyph size="xs" />
        </button>
      )}
    />
  );
}
