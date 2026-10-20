/**
 * An artifact's own icon: the one short word its author gave it ("chart",
 * "calendar"), drawn as a glyph, with the kind's glyph when the word names
 * nothing this design system draws.
 *
 * A CLOSED VOCABULARY, not a lookup into every glyph by name. The word is
 * typed by a person or an agent into a free field, so it is matched against a
 * small table of common words, case-insensitive, and anything else falls back
 * to the kind: an unknown word never draws a broken or arbitrary mark, and a
 * glyph renamed in the icon set is one edit here rather than a stored word
 * that silently stops matching.
 */

import {
  ActivityGlyph,
  BookOpenGlyph,
  BugGlyph,
  CalendarGlyph,
  ChartColumnGlyph,
  ChartNoAxesGanttGlyph,
  ChartPieGlyph,
  ClockGlyph,
  CodeGlyph,
  CoinsGlyph,
  CompassGlyph,
  DatabaseGlyph,
  FileTextGlyph,
  FlagGlyph,
  FolderGlyph,
  GaugeGlyph,
  GlobeGlyph,
  ImageGlyph,
  LayoutDashboardGlyph,
  ListChecksGlyph,
  ListGlyph,
  PackageGlyph,
  Settings2Glyph,
  ShieldGlyph,
  SquareKanbanGlyph,
  StarGlyph,
  TableGlyph,
  TargetGlyph,
  UserGlyph,
  UsersGlyph,
  WandSparklesGlyph,
  type GlyphSize,
} from '@crewlethq/icons/glyphs';
import { ArtifactKindGlyph, type ArtifactKind } from '../ArtifactKindGlyph/index.js';

type Glyph = typeof ChartColumnGlyph;

const WORDS: Readonly<Record<string, Glyph>> = {
  chart: ChartColumnGlyph,
  graph: ChartColumnGlyph,
  metrics: ChartColumnGlyph,
  analytics: ChartColumnGlyph,
  pie: ChartPieGlyph,
  dashboard: LayoutDashboardGlyph,
  calendar: CalendarGlyph,
  schedule: CalendarGlyph,
  table: TableGlyph,
  sheet: TableGlyph,
  spreadsheet: TableGlyph,
  doc: FileTextGlyph,
  document: FileTextGlyph,
  notes: FileTextGlyph,
  report: FileTextGlyph,
  memo: FileTextGlyph,
  map: CompassGlyph,
  compass: CompassGlyph,
  globe: GlobeGlyph,
  web: GlobeGlyph,
  list: ListGlyph,
  checklist: ListChecksGlyph,
  tasks: ListChecksGlyph,
  todo: ListChecksGlyph,
  board: SquareKanbanGlyph,
  kanban: SquareKanbanGlyph,
  plan: ChartNoAxesGanttGlyph,
  roadmap: ChartNoAxesGanttGlyph,
  timeline: ChartNoAxesGanttGlyph,
  people: UsersGlyph,
  team: UsersGlyph,
  person: UserGlyph,
  profile: UserGlyph,
  money: CoinsGlyph,
  budget: CoinsGlyph,
  finance: CoinsGlyph,
  cost: CoinsGlyph,
  code: CodeGlyph,
  image: ImageGlyph,
  goal: TargetGlyph,
  target: TargetGlyph,
  bug: BugGlyph,
  idea: WandSparklesGlyph,
  star: StarGlyph,
  flag: FlagGlyph,
  book: BookOpenGlyph,
  guide: BookOpenGlyph,
  settings: Settings2Glyph,
  database: DatabaseGlyph,
  data: DatabaseGlyph,
  clock: ClockGlyph,
  time: ClockGlyph,
  folder: FolderGlyph,
  package: PackageGlyph,
  health: GaugeGlyph,
  gauge: GaugeGlyph,
  activity: ActivityGlyph,
  security: ShieldGlyph,
};

/** Every word an icon may be, for a hint or a picker. */
export const ARTIFACT_ICON_WORDS: readonly string[] = Object.freeze(Object.keys(WORDS).sort());

/** The glyph an icon word names, or null for a word outside the vocabulary (or none). */
export function artifactIconGlyph(word: string | undefined | null): Glyph | null {
  const key = word?.trim().toLowerCase() ?? '';
  return Object.hasOwn(WORDS, key) ? WORDS[key]! : null;
}

export interface ArtifactIconProps {
  /** The artifact's icon word, as its author typed it. */
  icon?: string | undefined | null;
  /** The kind, whose glyph is drawn when the word names nothing. */
  kind: ArtifactKind;
  size?: GlyphSize | undefined;
}

/** An artifact's icon word as a glyph, or its kind's glyph. Decorative: the title names the artifact. */
export function ArtifactIcon({ icon, kind, size = 'md' }: ArtifactIconProps) {
  const Drawn = artifactIconGlyph(icon);
  return Drawn ? <Drawn size={size} /> : <ArtifactKindGlyph kind={kind} size={size} />;
}
