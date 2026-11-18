import { useId, useState, type CSSProperties, type ReactNode } from 'react';
import {
  ChevronDownGlyph,
  ChevronRightGlyph,
  CircleAlertGlyph,
  CircleCheckGlyph,
  CircleDashedGlyph,
  CircleXGlyph,
  TriangleAlertGlyph,
} from '@crewlethq/icons/glyphs';
import { ChatThread } from '../ChatThread/index.js';
import { CopyButton } from '../Copyable/index.js';
import { Spinner } from '../Spinner/index.js';
import { cx } from '../utils/cx.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';

/** Where a call stands: under way, answered, failed, or with no answer held. */
export type ToolCallStatus = 'running' | 'ok' | 'error' | 'unknown';

/** One tool call: its label, its key argument and, when known, its result. */
export interface ToolCallLogCall {
  kind: 'call';
  key: string;
  /** The tool's label as a reader knows it: "Bash", "Crewlet · Get work item". */
  tool: string;
  /** What runs of calls are grouped by; the label when left out. */
  group?: string | undefined;
  /** The key argument's first line, shown on one line and cut to fit. */
  detail?: string | undefined;
  /** Which end of a detail too long for its line is cut: `start` keeps a path's file name in view. */
  detailCut?: 'end' | 'start' | undefined;
  /** The whole input, shown on demand when it says more than the detail. */
  input?: string | undefined;
  /** Lines of the input past what the log holds. */
  inputUnkept?: number | undefined;
  status: ToolCallStatus;
  durationMs?: number | undefined;
  /** A failed call's reason, its first line. */
  error?: string | undefined;
}

/** The agent's own words between its calls. */
export interface ToolCallLogSay {
  kind: 'say';
  key: string;
  text: string;
}

/** A line the host adds about the run: a gap, a note handed to it, how it ended. */
export interface ToolCallLogNote {
  kind: 'note';
  key: string;
  text: string;
  tone?: 'neutral' | 'warning' | 'danger' | undefined;
}

export type ToolCallLogEntry = ToolCallLogCall | ToolCallLogSay | ToolCallLogNote;

export interface ToolCallLogLabels {
  /** The toggle that opens an input with lines past the first. */
  moreLines: (count: number) => string;
  /** The same toggle for a one-line input the detail cut. */
  showFull: string;
  showLess: string;
  /** Under an open input the log holds only part of. */
  unkept: (count: number) => string;
  /** A run of calls folded into one row. */
  group: (tool: string, count: number) => string;
  /** How many of a run's calls failed. */
  failedIn: (count: number) => string;
  running: string;
  ok: string;
  error: string;
  /** A call whose result the log does not hold. */
  unknown: string;
  duration: (ms: number) => string;
  jumpToLatest: string;
  newItems: (count: number) => string;
  copy: string;
  copied: string;
}

/** "450ms", "1.2s", "2m 5s", "1h 3m". */
export function toolCallDuration(ms: number): string {
  if (ms < 1000) return `${Math.max(0, Math.round(ms))}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)}s`;
  const seconds = Math.round(ms / 1000);
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

const count = (n: number, one: string, many: string) => (n === 1 ? `1 ${one}` : `${n.toLocaleString()} ${many}`);

export const TOOL_CALL_LOG_LABELS: ToolCallLogLabels = {
  moreLines: (n) => count(n, 'more line', 'more lines'),
  showFull: 'Show in full',
  showLess: 'Show less',
  unkept: (n) => `${count(n, 'more line was', 'more lines were')} not kept.`,
  group: (tool, n) => `${tool} · ${count(n, 'call', 'calls')}`,
  failedIn: (n) => `${n.toLocaleString()} failed`,
  running: 'Running',
  ok: 'Succeeded',
  error: 'Failed',
  unknown: 'No result',
  duration: toolCallDuration,
  jumpToLatest: 'Jump to latest',
  newItems: (n) => count(n, 'new entry', 'new entries'),
  copy: 'Copy',
  copied: 'Copied',
};

export interface ToolCallLogProps {
  entries: readonly ToolCallLogEntry[];
  /** The log's title, and its name for a screen reader. */
  label: string;
  /** The run is still going: the log is busy and keeps the end in view. */
  live?: boolean | undefined;
  /** What the copy action copies; no copy action without it. */
  copyText?: string | undefined;
  /** How tall the log grows before it scrolls. */
  maxHeight?: string | number | undefined;
  /** How many like calls in a row fold into one row. */
  groupAt?: number | undefined;
  /** Muted words beside the title: when it was read, what it holds. */
  caption?: ReactNode;
  labels?: Partial<ToolCallLogLabels> | undefined;
  className?: string | undefined;
}

type Row =
  | { kind: 'entry'; entry: ToolCallLogEntry }
  | { kind: 'group'; key: string; tool: string; calls: ToolCallLogCall[] };

/** Entries as rows: `groupAt` or more like calls in a row become one group. */
export function toolCallRows(entries: readonly ToolCallLogEntry[], groupAt: number): Row[] {
  const rows: Row[] = [];
  let run: ToolCallLogCall[] = [];
  const flush = () => {
    if (run.length >= Math.max(2, groupAt)) {
      rows.push({ kind: 'group', key: run[0]!.key, tool: run[0]!.group ?? run[0]!.tool, calls: run });
    } else {
      for (const entry of run) rows.push({ kind: 'entry', entry });
    }
    run = [];
  };
  for (const entry of entries) {
    if (entry.kind === 'call') {
      const by = entry.group ?? entry.tool;
      const prior = run[0];
      if (prior && (prior.group ?? prior.tool) !== by) flush();
      run.push(entry);
      continue;
    }
    flush();
    rows.push({ kind: 'entry', entry });
  }
  flush();
  return rows;
}

/**
 * An agent's run as a reader follows it: its narration, each tool call as a
 * row with its key argument and result, runs of like calls folded, and long
 * inputs a click away. Follows the end while the reader is there.
 */
export function ToolCallLog({
  entries,
  label,
  live = false,
  copyText,
  maxHeight,
  groupAt = 3,
  caption,
  labels: overrides,
  className,
}: ToolCallLogProps) {
  const labels = overrides ? { ...TOOL_CALL_LOG_LABELS, ...overrides } : TOOL_CALL_LOG_LABELS;
  const rows = toolCallRows(entries, groupAt);
  const style =
    maxHeight === undefined
      ? undefined
      : ({ '--crewlet-tool-call-log-max-height': typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight } as CSSProperties);
  return (
    <div className={cx('crewlet-tool-call-log', className)} style={style}>
      <div className="crewlet-tool-call-log__header">
        <span className="crewlet-tool-call-log__title">
          <span className="crewlet-tool-call-log__label">{label}</span>
          {caption ? <span className="crewlet-tool-call-log__caption">{caption}</span> : null}
        </span>
        {copyText === undefined ? null : (
          <CopyButton text={copyText} label={labels.copy} copiedLabel={labels.copied} className="crewlet-tool-call-log__copy" />
        )}
      </div>
      <div className="crewlet-tool-call-log__body">
        <ChatThread
          label={label}
          busy={live}
          flush
          labels={{ jumpToLatest: labels.jumpToLatest, newItems: labels.newItems }}
          className="crewlet-tool-call-log__thread"
        >
          {rows.map((row) =>
            row.kind === 'group' ? (
              <CallGroup key={`g:${row.key}`} tool={row.tool} calls={row.calls} labels={labels} />
            ) : (
              <EntryRow key={row.entry.key} entry={row.entry} labels={labels} />
            ),
          )}
        </ChatThread>
      </div>
    </div>
  );
}

function EntryRow({ entry, labels }: { entry: ToolCallLogEntry; labels: ToolCallLogLabels }) {
  if (entry.kind === 'call') return <CallRow call={entry} labels={labels} />;
  if (entry.kind === 'say') return <p className="crewlet-tool-call-log__say">{entry.text}</p>;
  const tone = entry.tone ?? 'neutral';
  return (
    <p className={cx('crewlet-tool-call-log__note', `crewlet-tool-call-log__note--${tone}`)}>
      {tone === 'neutral' ? null : (
        <span className="crewlet-tool-call-log__note-mark" aria-hidden="true">
          {tone === 'danger' ? <CircleAlertGlyph size="sm" /> : <TriangleAlertGlyph size="sm" />}
        </span>
      )}
      <span className="crewlet-tool-call-log__note-text">{entry.text}</span>
    </p>
  );
}

/** The mark for a status, and its words for a screen reader. */
function StatusMark({ status, labels }: { status: ToolCallStatus; labels: ToolCallLogLabels }) {
  const words = { running: labels.running, ok: labels.ok, error: labels.error, unknown: labels.unknown }[status];
  return (
    <span className={cx('crewlet-tool-call-log__mark', `crewlet-tool-call-log__mark--${status}`)}>
      <span className="crewlet-tool-call-log__mark-glyph" aria-hidden="true">
        {status === 'running' ? (
          <Spinner size="sm" />
        ) : status === 'ok' ? (
          <CircleCheckGlyph size="sm" />
        ) : status === 'error' ? (
          <CircleXGlyph size="sm" />
        ) : (
          <CircleDashedGlyph size="sm" />
        )}
      </span>
      <VisuallyHidden>{words}</VisuallyHidden>
    </span>
  );
}

/** A detail on one line. Cut at its start, it runs right to left so the overflow and its ellipsis fall on the
 *  left, its words isolated so they still read left to right. */
function Detail({ text, cut = 'end' }: { text: string; cut?: 'end' | 'start' | undefined }) {
  return (
    <span className={cx('crewlet-tool-call-log__detail', cut === 'start' && 'crewlet-tool-call-log__detail--start')} title={text}>
      {cut === 'start' ? <bdi>{text}</bdi> : text}
    </span>
  );
}

/** Whether the input says more than the detail does. */
function inputBeyondDetail(call: ToolCallLogCall): boolean {
  if (call.input === undefined) return false;
  const input = call.input.replace(/\n+$/, '');
  return input !== '' && input.trim() !== (call.detail ?? '').trim();
}

function CallRow({ call, labels }: { call: ToolCallLogCall; labels: ToolCallLogLabels }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const input = call.input?.replace(/\n+$/, '') ?? '';
  const more = inputBeyondDetail(call);
  // Lines past the first, the ones the host did not keep included.
  const extra = input.split('\n').length - 1 + (call.inputUnkept ?? 0);
  return (
    <div className="crewlet-tool-call-log__call" data-status={call.status}>
      <div className="crewlet-tool-call-log__head">
        <StatusMark status={call.status} labels={labels} />
        <span className="crewlet-tool-call-log__tool">{call.tool}</span>
        {call.detail ? (
          <Detail text={call.detail} cut={call.detailCut} />
        ) : (
          <span className="crewlet-tool-call-log__detail" />
        )}
        {call.durationMs === undefined ? null : (
          <span className="crewlet-tool-call-log__duration">{labels.duration(call.durationMs)}</span>
        )}
      </div>
      {call.status === 'error' && call.error ? <p className="crewlet-tool-call-log__error">{call.error}</p> : null}
      {more ? (
        <>
          <button
            type="button"
            className="crewlet-tool-call-log__more"
            aria-expanded={open}
            aria-controls={id}
            onClick={() => setOpen((was) => !was)}
          >
            <span className="crewlet-tool-call-log__chevron" aria-hidden="true">
              {open ? <ChevronDownGlyph size="xs" /> : <ChevronRightGlyph size="xs" />}
            </span>
            {open ? labels.showLess : extra > 0 ? labels.moreLines(extra) : labels.showFull}
          </button>
          <div id={id} className="crewlet-tool-call-log__full" hidden={!open}>
            <pre className="crewlet-tool-call-log__input">{input}</pre>
            {call.inputUnkept && call.inputUnkept > 0 ? (
              <p className="crewlet-tool-call-log__unkept">{labels.unkept(call.inputUnkept)}</p>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}

/** A run's status: running while any runs, failed where any failed, else ok once all are. */
function groupStatus(calls: readonly ToolCallLogCall[]): ToolCallStatus {
  if (calls.some((c) => c.status === 'running')) return 'running';
  if (calls.some((c) => c.status === 'error')) return 'error';
  if (calls.every((c) => c.status === 'ok')) return 'ok';
  return 'unknown';
}

function CallGroup({ tool, calls, labels }: { tool: string; calls: ToolCallLogCall[]; labels: ToolCallLogLabels }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const failed = calls.filter((c) => c.status === 'error').length;
  const timed = calls.every((c) => c.durationMs !== undefined);
  const total = timed ? calls.reduce((sum, c) => sum + (c.durationMs ?? 0), 0) : undefined;
  const status = groupStatus(calls);
  const last = calls.at(-1);
  return (
    <div className="crewlet-tool-call-log__group" data-status={status}>
      <div className="crewlet-tool-call-log__head">
        <StatusMark status={status} labels={labels} />
        <button
          type="button"
          className="crewlet-tool-call-log__group-toggle"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((was) => !was)}
        >
          <span className="crewlet-tool-call-log__tool">{labels.group(tool, calls.length)}</span>
          <span className="crewlet-tool-call-log__chevron" aria-hidden="true">
            {open ? <ChevronDownGlyph size="xs" /> : <ChevronRightGlyph size="xs" />}
          </span>
        </button>
        {!open && last?.detail ? (
          <Detail text={last.detail} cut={last.detailCut} />
        ) : (
          <span className="crewlet-tool-call-log__detail" />
        )}
        {total === undefined ? null : <span className="crewlet-tool-call-log__duration">{labels.duration(total)}</span>}
      </div>
      {failed > 0 ? (
        <p className="crewlet-tool-call-log__error crewlet-tool-call-log__error--count">{labels.failedIn(failed)}</p>
      ) : null}
      <div id={id} className="crewlet-tool-call-log__members" hidden={!open}>
        {open ? calls.map((call) => <CallRow key={call.key} call={call} labels={labels} />) : null}
      </div>
    </div>
  );
}
