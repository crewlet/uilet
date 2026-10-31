/**
 * The emoji a picker offers, in groups, each with the name it is searched
 * and announced by. No React in it: a reaction's pill reads a name from here
 * too.
 */

/** One emoji and the words it is found and read by. */
export interface EmojiEntry {
  emoji: string;
  name: string;
}

/** A titled run of emoji in the picker. */
export interface EmojiGroup {
  /** Shown over the group, and names it for a screen reader. */
  label: string;
  items: readonly EmojiEntry[];
}

const entries = (pairs: ReadonlyArray<readonly [string, string]>): EmojiEntry[] =>
  pairs.map(([emoji, name]) => ({ emoji, name }));

export const EMOJI_GROUPS: readonly EmojiGroup[] = [
  {
    label: 'Frequently used',
    items: entries([
      ['👍', 'thumbs up'],
      ['✅', 'check'],
      ['👀', 'eyes'],
      ['🙌', 'raised hands'],
      ['🚀', 'rocket'],
      ['🎉', 'party'],
      ['🙏', 'thanks'],
      ['❤️', 'heart'],
    ]),
  },
  {
    label: 'Smileys',
    items: entries([
      ['😀', 'grin'],
      ['😄', 'smile'],
      ['😂', 'joy'],
      ['🙂', 'slight smile'],
      ['😍', 'heart eyes'],
      ['🤔', 'thinking'],
      ['😅', 'sweat smile'],
      ['😮', 'open mouth'],
      ['😬', 'grimace'],
      ['😴', 'sleeping'],
      ['🤯', 'mind blown'],
      ['🥳', 'partying'],
      ['😎', 'cool'],
      ['🫡', 'salute'],
      ['🤝', 'handshake'],
      ['👏', 'clap'],
    ]),
  },
  {
    label: 'Work',
    items: entries([
      ['🔥', 'fire'],
      ['💯', 'hundred'],
      ['⚠️', 'warning'],
      ['❌', 'cross'],
      ['⏳', 'hourglass'],
      ['📌', 'pin'],
      ['📎', 'paperclip'],
      ['🧪', 'test tube'],
      ['🐛', 'bug'],
      ['🛠️', 'tools'],
      ['📈', 'chart up'],
      ['📉', 'chart down'],
      ['🔒', 'lock'],
      ['🔑', 'key'],
      ['💡', 'idea'],
      ['📝', 'memo'],
    ]),
  },
];

/**
 * The name an emoji is read by ("eyes" for 👀), from the groups given, or the
 * emoji itself for one the picker does not offer.
 */
export function emojiName(emoji: string, groups: readonly EmojiGroup[] = EMOJI_GROUPS): string {
  for (const group of groups) {
    const found = group.items.find((item) => item.emoji === emoji);
    if (found) return found.name;
  }
  return emoji;
}

/** Every emoji in the groups whose name holds the query, ignoring case, once each; null for an empty query. */
export function searchEmoji(query: string, groups: readonly EmojiGroup[] = EMOJI_GROUPS): EmojiEntry[] | null {
  const words = query.trim().toLowerCase();
  if (!words) return null;
  const seen = new Set<string>();
  const found: EmojiEntry[] = [];
  for (const group of groups) {
    for (const item of group.items) {
      if (seen.has(item.emoji) || !item.name.toLowerCase().includes(words)) continue;
      seen.add(item.emoji);
      found.push(item);
    }
  }
  return found;
}
