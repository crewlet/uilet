import type { ReactNode } from 'react';
import { FaceSlightlySmilingPlusGlyph } from '@crewlethq/icons/glyphs';
import { EmojiPicker, emojiName, type EmojiPickerProps } from '../EmojiPicker/index.js';
import { Tooltip } from '../Tooltip/index.js';
import { cx } from '../utils/cx.js';

/** One emoji's reactions on a message. */
export interface ReactionSummary {
  emoji: string;
  /** How many reacted with it, the reader included. */
  count: number;
  /** Whether the reader is one of them. */
  mine: boolean;
  /**
   * Who else reacted, by name, in the order they did; the reader is left out
   * (`mine` says whether they reacted). Optional: without it the pill says
   * how many reacted rather than who.
   */
  people?: readonly string[] | undefined;
  /** The emoji's name, for its pill's accessible name. Read from the picker's names by default. */
  name?: string | undefined;
}

export interface ReactionBarLabels {
  /** Names the row of pills. */
  group: string;
  /** The reader, who always leads the list of who reacted. */
  you: string;
  /** Those not named: "1 other", "2 others". */
  others: (count: number) => string;
  /** Everyone, where no names are known: "1 member", "3 members". */
  members: (count: number) => string;
  /** A pill's hint: "You and Product Manager reacted with 👀". */
  reacted: (who: string, emoji: string) => string;
  /** A pill's accessible name: "eyes: You and Product Manager reacted". */
  pill: (name: string, who: string) => string;
}

export const REACTION_BAR_LABELS: ReactionBarLabels = {
  group: 'Reactions',
  you: 'You',
  others: (count) => (count === 1 ? '1 other' : `${count.toLocaleString()} others`),
  members: (count) => (count === 1 ? '1 member' : `${count.toLocaleString()} members`),
  reacted: (who, emoji) => `${who} reacted with ${emoji}`,
  pill: (name, who) => `${name}: ${who} reacted`,
};

/** "A", "A and B", "A, B and C", "A, B and 3 others". */
function sentence(names: readonly string[], unnamed: number, others: (count: number) => string): string {
  const shown = names.length > 3 ? names.slice(0, 2) : names;
  const rest = names.length - shown.length + unnamed;
  const parts = rest > 0 ? [...shown, others(rest)] : [...shown];
  if (parts.length <= 1) return parts[0] ?? '';
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/**
 * Who reacted, in words, with the reader first: "You, Product Manager and 1
 * other". In the order the data held them the reader fell mid sentence
 * ("Product Manager and You"). Without names it counts: "You and 2 others",
 * "3 members".
 */
export function reactionWho(reaction: ReactionSummary, labels: ReactionBarLabels = REACTION_BAR_LABELS): string {
  const you = reaction.mine ? [labels.you] : [];
  if (reaction.people) {
    const names = [...you, ...reaction.people];
    return sentence(names, Math.max(0, reaction.count - names.length), labels.others);
  }
  if (reaction.mine) return sentence(you, Math.max(0, reaction.count - 1), labels.others);
  return labels.members(reaction.count);
}

export interface ReactionBarProps {
  reactions: readonly ReactionSummary[];
  /** Adds the reader's reaction with that emoji, or takes it back. */
  onToggle: (emoji: string) => void;
  /** After the pills: an `AddReaction`. */
  add?: ReactNode;
  /**
   * Why the reader cannot react here ("Join the room to react."): the pills
   * still say who reacted, are marked unavailable, and add the reason to
   * their hint rather than toggling.
   */
  disabledReason?: string | undefined;
  labels?: Partial<ReactionBarLabels> | undefined;
  className?: string | undefined;
}

/**
 * The reactions under a message, one pill to an emoji with its count, then
 * the control that adds one.
 *
 * AT REST A PILL IS A FILL, NOT A FRAME: the soft fill and no edge, so a row
 * of reactions reads as a quiet strip. Under the pointer the pill drops its
 * fill for the strong edge. The reader's own is the accent's soft fill inside
 * an accent ring with its count at the medium weight, so it differs from the
 * others by more than its hue. Each pill is a toggle (`aria-pressed`), and its
 * hint says who reacted, the reader first.
 */
export function ReactionBar({ reactions, onToggle, add, disabledReason, labels: overrides, className }: ReactionBarProps) {
  const labels = overrides ? { ...REACTION_BAR_LABELS, ...overrides } : REACTION_BAR_LABELS;
  if (reactions.length === 0 && !add) return null;
  return (
    <div className={cx('crewlet-reaction-bar', className)} role="group" aria-label={labels.group}>
      {reactions.map((reaction) => {
        const who = reactionWho(reaction, labels);
        const hint = labels.reacted(who, reaction.emoji);
        return (
          <Tooltip key={reaction.emoji} content={disabledReason ? `${hint}. ${disabledReason}` : hint}>
            <button
              type="button"
              className={cx('crewlet-reaction', reaction.mine && 'is-mine')}
              aria-pressed={reaction.mine}
              aria-label={labels.pill(reaction.name ?? emojiName(reaction.emoji), who)}
              aria-disabled={disabledReason ? true : undefined}
              onClick={() => {
                if (!disabledReason) onToggle(reaction.emoji);
              }}
            >
              <span className="crewlet-reaction__emoji" aria-hidden="true">
                {reaction.emoji}
              </span>
              <span className="crewlet-reaction__count" aria-hidden="true">
                {reaction.count.toLocaleString()}
              </span>
            </button>
          </Tooltip>
        );
      })}
      {add}
    </div>
  );
}

export interface AddReactionProps extends Pick<EmojiPickerProps, 'onPick' | 'onOpenChange' | 'side' | 'groups'> {
  /** The pill's name and hint, and the picker's: "Add a reaction" by default. */
  label?: string | undefined;
  /** Which edge of the pill the picker lines up with, `start` by default. */
  align?: EmojiPickerProps['align'];
}

/**
 * The pill after a message's reactions that opens the emoji picker. Inside a
 * `ChatMessage` it is quiet until the row is pointed at, focused or tapped.
 */
export function AddReaction({ label = 'Add a reaction', align = 'start', ...picker }: AddReactionProps) {
  return (
    <EmojiPicker
      {...picker}
      label={label}
      tooltip={label}
      align={align}
      trigger={(_open, toggle) => (
        <button type="button" className="crewlet-reaction crewlet-reaction--add" aria-label={label} onClick={toggle}>
          <FaceSlightlySmilingPlusGlyph size="sm" />
        </button>
      )}
    />
  );
}
