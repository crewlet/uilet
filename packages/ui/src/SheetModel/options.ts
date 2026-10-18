/**
 * What an option's colour name means on the sheet.
 *
 * A SELECT CHIP is an author's category, drawn in one of the six node hues
 * the author chose for it (or neutral): chosen, never derived, which is the
 * one sense in which a hue may name a thing rather than a state.
 *
 * A STATUS is a state, so it is drawn in one of the five tones, never a hue:
 * the dashboard's state colours keep their meaning on a sheet too. Its tone
 * is the colour name when that names a tone or a hue a tone is drawn in, and
 * otherwise follows its category.
 *
 * Colour is never the only carrier: every chip and every status carries its
 * label, and a status carries its dot.
 */

import { isNodeHue, type NodeHue } from '../utils/nodeHue.js';
import type { Tone } from '../utils/tone.js';
import type { SheetColumn, SheetOption, SheetStatusCategory } from './types.js';

/** The other names an author may write for a hue, mapped onto the six. */
const HUE_ALIASES: Readonly<Record<string, NodeHue>> = {
  violet: 'purple',
  indigo: 'purple',
  teal: 'cyan',
  sky: 'cyan',
  emerald: 'green',
  lime: 'green',
  yellow: 'amber',
  orange: 'amber',
  red: 'rose',
  pink: 'rose',
};

/** The hue a select chip is drawn in, or neutral for none, an unknown name or a grey. */
export function optionHue(color: string | undefined): NodeHue | 'neutral' {
  if (color === undefined) return 'neutral';
  const name = color.trim().toLowerCase();
  if (isNodeHue(name)) return name;
  return HUE_ALIASES[name] ?? 'neutral';
}

const TONES: readonly Tone[] = ['neutral', 'info', 'success', 'warning', 'danger'];

const TONE_OF_HUE: Readonly<Record<NodeHue, Tone>> = {
  green: 'success',
  amber: 'warning',
  rose: 'danger',
  blue: 'info',
  cyan: 'info',
  purple: 'neutral',
};

const TONE_OF_CATEGORY: Readonly<Record<SheetStatusCategory, Tone>> = {
  todo: 'neutral',
  in_progress: 'info',
  done: 'success',
  blocked: 'danger',
};

/** The tone a status option is drawn in. */
export function statusTone(option: Pick<SheetOption, 'color' | 'category'>): Tone {
  const name = option.color?.trim().toLowerCase();
  if (name !== undefined && (TONES as readonly string[]).includes(name)) return name as Tone;
  if (name !== undefined) {
    const hue = optionHue(name);
    if (hue !== 'neutral') return TONE_OF_HUE[hue];
  }
  return option.category ? TONE_OF_CATEGORY[option.category] : 'neutral';
}

/** The option an id names in a column, archived ones included, or undefined. */
export function findOption(column: Pick<SheetColumn, 'options'>, id: string): SheetOption | undefined {
  return column.options?.find((option) => option.id === id);
}

/** The options a person may still choose: archived ones are drawn but never offered. */
export function liveOptions(column: Pick<SheetColumn, 'options'>): SheetOption[] {
  return (column.options ?? []).filter((option) => !option.archived);
}

/** Parses the kit's `options` attribute: `Gold:amber,Silver:neutral,Bronze:rose`, ids derived from labels. */
export function parseOptionList(text: string): SheetOption[] {
  const seen = new Set<string>();
  const out: SheetOption[] = [];
  for (const part of text.split(',')) {
    const [rawLabel = '', rawColor] = part.split(':');
    const label = rawLabel.trim();
    if (label === '') continue;
    let id = label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    if (id === '') id = `option_${out.length + 1}`;
    while (seen.has(id)) id = `${id}_`;
    seen.add(id);
    const color = rawColor?.trim();
    out.push(color ? { id, label, color } : { id, label });
  }
  return out;
}
