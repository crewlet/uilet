import { useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { MessageSquareGlyph, XGlyph } from '@crewlethq/icons/glyphs';
import { Button } from '../Button/index.js';
import { Composer } from '../Composer/index.js';
import { Count } from '../Count/index.js';
import { Document } from '../Document/index.js';
import { IconButton } from '../IconButton/index.js';
import { PrincipalAvatar, type Principal } from '../Principal/index.js';
import { RelativeTime, formatExact, toISO, toInstant, type TimeValue } from '../RelativeTime/index.js';
import { cx } from '../utils/cx.js';
import { headingTag, useHeadingLevel } from '../utils/headingLevel.js';

/** One remark in a thread. */
export interface CommentThreadComment {
  /** Stable across edits: what a reply points at. */
  id: string;
  /** Who wrote it. Absent, the remark is the system's, named by `labels.system`. */
  author?: Principal | null | undefined;
  /** The remark, already rendered by the host: markdown turned into elements, or plain text. */
  body: ReactNode;
  createdAt: TimeValue;
  /** When it was last edited. "(edited)" is shown when it differs from `createdAt`. */
  editedAt?: TimeValue | undefined;
  /** The id of the remark this one answers. */
  replyTo?: string | undefined;
}

/**
 * What a submit answers. `false` keeps the draft and the reply target, for a
 * write the server refused; anything else clears them.
 */
export type CommentThreadSubmitResult = boolean | void;

export interface CommentThreadLabels {
  heading: string;
  empty: string;
  /** The author of a remark that names nobody. */
  system: string;
  edited: string;
  inReplyTo: (name: string) => string;
  /** The Reply control's accessible name, which names whose remark it answers. */
  replyTo: (name: string) => string;
  reply: string;
  replying: (name: string) => string;
  stopReplying: string;
  /** The field's accessible name. `subject` is the document commented on, when the host names one. */
  field: (subject: string | undefined, replyingTo: string | undefined) => string;
  placeholder: string;
  submit: string;
  submitReply: string;
  /** Why the submit control waits while the field is empty. */
  emptyDraft: string;
}

export const COMMENT_THREAD_LABELS: CommentThreadLabels = {
  heading: 'Comments',
  empty: 'Nobody has commented.',
  system: 'System',
  edited: '(edited)',
  inReplyTo: (name) => `in reply to ${name}`,
  replyTo: (name) => `Reply to ${name}`,
  reply: 'Reply',
  replying: (name) => `Replying to ${name}`,
  stopReplying: 'Stop replying',
  field: (subject, replyingTo) =>
    replyingTo !== undefined
      ? `Reply to ${replyingTo}`
      : subject !== undefined
        ? `Comment on “${subject}”`
        : 'Write a comment',
  placeholder: 'Write a comment',
  submit: 'Comment',
  submitReply: 'Reply',
  emptyDraft: 'Write the comment first.',
};

export interface CommentThreadProps {
  comments: readonly CommentThreadComment[];
  /** The document commented on, named in the field's label: Comment on "Onboarding". */
  subject?: string | undefined;
  /**
   * Posts a remark, or a reply when `replyTo` is set. Without it the thread is
   * read-only: no field and no Reply controls. Resolve to `false` to keep the
   * draft, such as when the server refused the write.
   */
  onSubmit?:
    | ((body: string, replyTo: CommentThreadComment | null) => CommentThreadSubmitResult | Promise<CommentThreadSubmitResult>)
    | undefined;
  /** Why the reader cannot post right now. The submit control is disabled and the reason is shown under it. */
  disabledReason?: string | undefined;
  /** A post in flight that the host is tracking. The thread also tracks its own. */
  busy?: boolean | undefined;
  /** A line beside the submit control: who is told, how the remark is shared. */
  hint?: ReactNode;
  /** Under the field: the server's refusal of the last post, as the host words it. */
  notice?: ReactNode;
  /** Whether the thread draws its own heading. On by default; off where the host already titles the section. */
  heading?: boolean | undefined;
  /** Overrides the shared clock, for a story or a suite. */
  now?: number | undefined;
  labels?: Partial<CommentThreadLabels> | undefined;
  className?: string | undefined;
}

/**
 * A document's comments, oldest first, and a field to add one.
 *
 * A REPLY NAMES WHAT IT ANSWERS in words ("in reply to Maya"), so the thread
 * stays flat and readable in order while each answer still points at its
 * question. Pressing Reply moves focus into the field, which names whom it
 * answers, and the reply can be abandoned from beside it.
 *
 * THE BODY IS THE HOST'S. A remark arrives already rendered (markdown into
 * elements), so this draws it in the kit's document type at the size a remark
 * read beside other things takes, and never parses anything itself.
 *
 * A SUBMIT IS ONE AT A TIME. The submit control is disabled while a post is in
 * flight, so a second press cannot send the same remark twice, and the draft
 * is cleared only once the host says the post landed.
 */
export function CommentThread({
  comments,
  subject,
  onSubmit,
  disabledReason,
  busy = false,
  hint,
  notice,
  heading = true,
  now,
  labels: overrides,
  className,
}: CommentThreadProps) {
  const labels: CommentThreadLabels = overrides ? { ...COMMENT_THREAD_LABELS, ...overrides } : COMMENT_THREAD_LABELS;
  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState<CommentThreadComment | null>(null);
  const [sending, setSending] = useState(false);
  const field = useRef<HTMLTextAreaElement>(null);
  const headingID = useId();
  const level = useHeadingLevel();
  const Heading = headingTag(level);
  const byID = useMemo(() => new Map(comments.map((comment) => [comment.id, comment])), [comments]);
  const nameOf = (comment: CommentThreadComment) => comment.author?.name ?? labels.system;

  const body = draft.trim();
  const pending = busy || sending;
  const reason = disabledReason ?? (body === '' ? labels.emptyDraft : undefined);
  const blocked = pending || reason !== undefined;

  const send = async () => {
    if (!onSubmit || blocked) return;
    setSending(true);
    try {
      const result = await onSubmit(body, replyTo);
      if (result !== false) {
        setDraft('');
        setReplyTo(null);
      }
    } finally {
      setSending(false);
    }
  };

  const startReply = (comment: CommentThreadComment) => {
    setReplyTo(comment);
    field.current?.focus();
  };

  return (
    <section
      className={cx('crewlet-comment-thread', className)}
      aria-labelledby={heading ? headingID : undefined}
      aria-label={heading ? undefined : labels.heading}
    >
      {heading && (
        <Heading className="crewlet-comment-thread__heading" id={headingID}>
          <MessageSquareGlyph size="sm" />
          {labels.heading}
          <Count value={comments.length} />
        </Heading>
      )}
      {comments.length === 0 ? (
        <p className="crewlet-comment-thread__empty">{labels.empty}</p>
      ) : (
        // The markers are off, and WebKit drops the list role with them, so
        // the role is declared and the redundant-role rule silenced for that.
        // eslint-disable-next-line jsx-a11y/no-redundant-roles
        <ol role="list" className="crewlet-comment-thread__list">
          {comments.map((comment) => {
            const parent = comment.replyTo !== undefined ? byID.get(comment.replyTo) : undefined;
            const created = toInstant(comment.createdAt);
            const edited = toInstant(comment.editedAt);
            const name = nameOf(comment);
            return (
              <li key={comment.id} className="crewlet-comment-thread__comment">
                <div className="crewlet-comment-thread__head">
                  {comment.author ? (
                    <span className="crewlet-comment-thread__author">
                      <PrincipalAvatar principal={comment.author} size="xs" />
                      <span className="crewlet-comment-thread__name">{comment.author.name}</span>
                    </span>
                  ) : (
                    <span className="crewlet-comment-thread__name">{labels.system}</span>
                  )}
                  <RelativeTime value={comment.createdAt} now={now} className="crewlet-comment-thread__meta" />
                  {edited !== null && edited !== created && (
                    <time
                      className="crewlet-comment-thread__meta"
                      dateTime={toISO(comment.editedAt) ?? undefined}
                      title={formatExact(comment.editedAt) ?? undefined}
                    >
                      {labels.edited}
                    </time>
                  )}
                  {parent && <span className="crewlet-comment-thread__meta">{labels.inReplyTo(nameOf(parent))}</span>}
                  {onSubmit && (
                    <Button
                      size="small"
                      variant="ghost"
                      className="crewlet-comment-thread__reply"
                      aria-label={labels.replyTo(name)}
                      onClick={() => startReply(comment)}
                    >
                      {labels.reply}
                    </Button>
                  )}
                </div>
                <Document size="sm" measure="none">
                  {comment.body}
                </Document>
              </li>
            );
          })}
        </ol>
      )}

      {onSubmit && (
        <div className="crewlet-comment-thread__compose">
          {replyTo && (
            <span className="crewlet-comment-thread__replying">
              {labels.replying(nameOf(replyTo))}
              <IconButton
                size="sm"
                variant="ghost"
                label={labels.stopReplying}
                icon={<XGlyph size="sm" />}
                onClick={() => {
                  setReplyTo(null);
                  field.current?.focus();
                }}
              />
            </span>
          )}
          <Composer
            ref={field}
            value={draft}
            onChange={setDraft}
            onSubmit={() => void send()}
            label={labels.field(subject, replyTo ? nameOf(replyTo) : undefined)}
            placeholder={labels.placeholder}
            actions={
              <Button
                size="small"
                variant="secondary"
                loading={pending}
                disabledReason={pending ? undefined : reason}
                onClick={() => void send()}
              >
                {replyTo ? labels.submitReply : labels.submit}
              </Button>
            }
          />
          {/* A STANDING REASON IS SAID IN THE OPEN, in place of the hint: a
              reader who cannot post should not have to find a disabled
              control's description to learn why. */}
          {(disabledReason ?? hint) !== undefined && (
            <p className="crewlet-comment-thread__hint">{disabledReason ?? hint}</p>
          )}
          {notice}
        </div>
      )}
    </section>
  );
}
