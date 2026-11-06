/**
 * The emoji a picker offers, in groups, each with the name it is searched
 * and announced by. No React in it: a reaction's pill reads a name from here
 * too.
 */

/** One emoji and the words it is found and read by. */
export interface EmojiEntry {
  emoji: string;
  name: string;
  /**
   * Its standard shortcode (`:eyes:`), the spelling a chat engine stores a
   * reaction in, so a host converts with `emojiShortcode`/`emojiOfShortcode`
   * rather than keeping a table of its own.
   */
  shortcode?: string | undefined;
}

/** A titled run of emoji in the picker. */
export interface EmojiGroup {
  /** Shown over the group, and names it for a screen reader. */
  label: string;
  items: readonly EmojiEntry[];
}

const entries = (rows: ReadonlyArray<readonly [string, string, string]>): EmojiEntry[] =>
  rows.map(([emoji, name, shortcode]) => ({ emoji, name, shortcode }));

export const EMOJI_GROUPS: readonly EmojiGroup[] = [
  {
    label: 'Frequently used',
    items: entries([
      ['👍', 'thumbs up', ':+1:'],
      ['✅', 'check', ':white_check_mark:'],
      ['👀', 'eyes', ':eyes:'],
      ['🙌', 'raised hands', ':raised_hands:'],
      ['🚀', 'rocket', ':rocket:'],
      ['🎉', 'party', ':tada:'],
      ['🙏', 'thanks', ':pray:'],
      ['❤️', 'heart', ':heart:'],
    ]),
  },
  {
    label: 'Smileys',
    items: entries([
      ['😀', 'grin', ':grinning:'],
      ['😄', 'smile', ':smile:'],
      ['😂', 'joy', ':joy:'],
      ['🙂', 'slight smile', ':slightly_smiling_face:'],
      ['😍', 'heart eyes', ':heart_eyes:'],
      ['🤔', 'thinking', ':thinking:'],
      ['😅', 'sweat smile', ':sweat_smile:'],
      ['😮', 'open mouth', ':open_mouth:'],
      ['😬', 'grimace', ':grimacing:'],
      ['😴', 'sleeping', ':sleeping:'],
      ['🤯', 'mind blown', ':exploding_head:'],
      ['🥳', 'partying', ':partying_face:'],
      ['😎', 'cool', ':sunglasses:'],
      ['🫡', 'salute', ':saluting_face:'],
      ['🤝', 'handshake', ':handshake:'],
      ['👏', 'clap', ':clap:'],
    ]),
  },
  {
    label: 'Work',
    items: entries([
      ['🔥', 'fire', ':fire:'],
      ['💯', 'hundred', ':100:'],
      ['⚠️', 'warning', ':warning:'],
      ['❌', 'cross', ':x:'],
      ['⏳', 'hourglass', ':hourglass_flowing_sand:'],
      ['📌', 'pin', ':pushpin:'],
      ['📎', 'paperclip', ':paperclip:'],
      ['🧪', 'test tube', ':test_tube:'],
      ['🐛', 'bug', ':bug:'],
      ['🛠️', 'tools', ':hammer_and_wrench:'],
      ['📈', 'chart up', ':chart_with_upwards_trend:'],
      ['📉', 'chart down', ':chart_with_downwards_trend:'],
      ['🔒', 'lock', ':lock:'],
      ['🔑', 'key', ':key:'],
      ['💡', 'idea', ':bulb:'],
      ['📝', 'memo', ':memo:'],
    ]),
  },
];

/**
 * The name an emoji is read by ("eyes" for 👀), from the groups given, or the
 * emoji itself for one the picker does not offer.
 */
export function emojiName(emoji: string, groups: readonly EmojiGroup[] = EMOJI_GROUPS): string {
  for (const group of groups) {
    const found = group.items.find((item) => item.emoji === emoji || item.shortcode === emoji);
    if (found) return found.name;
  }
  // A shortcode the groups do not know is read by its words: ":sparkles:" is "sparkles".
  return isShortcode(emoji) ? emoji.slice(1, -1).replace(/[_-]+/g, ' ') : emoji;
}

/** Whether a stored reaction is spelled as a shortcode (`:eyes:`). */
export function isShortcode(value: string): boolean {
  return /^:[^:\s]+:$/.test(value);
}

/** The shortcode an emoji is stored as (`:eyes:` for 👀), or the emoji itself where the groups give none. */
export function emojiShortcode(emoji: string, groups: readonly EmojiGroup[] = EMOJI_GROUPS): string {
  for (const group of groups) {
    const found = group.items.find((item) => item.emoji === emoji);
    if (found?.shortcode) return found.shortcode;
  }
  return emoji;
}

/**
 * The emoji a stored reaction is drawn as: the glyph a shortcode names, the
 * value itself where it is already a glyph, or null for a shortcode the
 * groups do not know (draw its name, never its colons).
 */
export function emojiOfShortcode(stored: string, groups: readonly EmojiGroup[] = EMOJI_GROUPS): string | null {
  if (!isShortcode(stored)) return stored;
  for (const group of groups) {
    const found = group.items.find((item) => item.shortcode === stored);
    if (found) return found.emoji;
  }
  return null;
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
