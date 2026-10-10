/**
 * The Crewlet characters: thirty silhouettes an agent can be drawn as, cut
 * from the mark's own rules so every one of them reads as a Crewlet.
 *
 * FOUR RULES, carried from the mark and never varied by a character:
 *
 * - THE 45 DEGREE CUT. Every outer corner is chamfered along both of its
 *   edges, as the mark's crown and shoulders are, so the family has no curve
 *   in it. `cut` is that rule as a function.
 * - THE KEYLINE. An outline floats off the body with a transparent gap, as the
 *   mark is drawn: a line of KEYLINE_LINE at KEYLINE_GAP, the mark's own
 *   proportions. It is drawn at full detail only (see CrewletCharacter).
 * - THE VISOR. One band with two upright slits, each slit's size and place
 *   measured from the band itself (EYE), so every face matches the mark's at
 *   whatever body it sits on.
 * - THE CROWN AND STANCE. A V notch cut into every flat crown, and block legs
 *   under every flat base that stands on them.
 *
 * THIS FILE IS THE GEOMETRY'S ONE SOURCE. Nothing regenerates it, so an edit
 * here is the edit. Every outline is a polygon on a stage 100 units wide whose
 * ground is at GROUND, written clockwise with the chamfer each corner takes;
 * the paths are computed once, when the module loads. The original Crewlet
 * is the exception: it IS the mark, so it is drawn from the mark's own paths
 * (generated from svg/crewlet-icon.svg at build) placed on the same stage.
 *
 * Every outline of one character is drawn as ONE union: the parts overlap and
 * share a winding, so a leg under a body fills as part of it, and the keyline
 * goes round the whole figure rather than round each part.
 */

import { CREWLET_MARK } from './generated/crewletMark.js';

/** The characters, in the order a picker offers them. The first is the mark. */
export const CREWLET_CHARACTERS = [
  'crewlet',
  'hexlet',
  'peaklet',
  'prismlet',
  'towerlet',
  'bricklet',
  'gemlet',
  'coglet',
  'pluslet',
  'shieldlet',
  'stacklet',
  'sparklet',
  'cloudlet',
  'foxlet',
  'rocketlet',
  'crownlet',
  'cactlet',
  'wisplet',
  'heartlet',
  'flasklet',
  'chiplet',
  'duolet',
  'chatlet',
  'pagelet',
  'archlet',
  'dashlet',
  'octlet',
  'conelet',
  'hivelet',
  'folderlet',
] as const;

/** One character's id, which is what a configuration stores. */
export type CrewletCharacterId = (typeof CREWLET_CHARACTERS)[number];

/** Whether a value read off the wire names a character this build draws. */
export const isCrewletCharacter = (value: unknown): value is CrewletCharacterId =>
  typeof value === 'string' && (CREWLET_CHARACTERS as readonly string[]).includes(value);

/** A box on the character stage, in its units. */
export interface CharacterBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

interface Described {
  /** The character's name, for a label: `Hexlet`. */
  readonly name: string;
  /** What its outline is, in a few words, for a description: `Hexagon with pointed flanks`. */
  readonly shape: string;
  /** Everything it draws, keyline included, which is what a frame centres on. */
  readonly bounds: CharacterBox;
}

/** A character drawn from polygons on the stage. */
export interface DrawnCharacter extends Described {
  readonly kind: 'drawn';
  /** Its outlines, one path each, every one clockwise so the overlaps fill as one union. */
  readonly shapes: readonly string[];
  /** What is cut out of its body besides the face: a fold, wheel wells, a mark. */
  readonly holes: readonly string[];
  /** The visor band the eyes are measured from. */
  readonly visor: CharacterBox;
  /** Where the crown's V notch is cut, or null for a crown with no flat top. */
  readonly notch: readonly [number, number] | null;
}

/** The original Crewlet, drawn from the mark's own paths. */
export interface MarkCharacter extends Described {
  readonly kind: 'mark';
  /** Places the mark's own units on the stage. */
  readonly transform: string;
  /** The keyline ring, drawn at full detail only. */
  readonly keyline: string;
  /** The body and the visor, with the face already cut through them. */
  readonly body: readonly string[];
}

export type CrewletCharacterGeometry = DrawnCharacter | MarkCharacter;

/** Where the stage's ground is: every character that stands, stands on it. */
export const GROUND = 96;

/** The keyline's line and the gap it floats at, in stage units: the mark's own proportions. */
export const KEYLINE_LINE = 1.35;
export const KEYLINE_GAP = 0.9;

/** The gap round the visor band, in stage units, as the mark cuts it. */
export const VISOR_GAP = 1.3;

/**
 * A slit's width and height as shares of its visor, and how far either slit's
 * centre sits from the visor's, measured on the mark. A compact face, drawn
 * where the keyline and the visor gap would be too fine to see, opens the
 * slits a little so they still read.
 */
export const EYE = {
  full: { width: 0.164, height: 0.62 },
  compact: { width: 0.19, height: 0.68 },
  offset: 0.312,
} as const;

/** The crown notch: half its width, and how far it cuts below the crown. */
export const NOTCH = { half: 3.2, depth: 2.6 } as const;

type Point = readonly [number, number];

const round = (n: number) => Math.round(n * 100) / 100;

/*
 * A polygon with each corner cut along its two edges by its own amount, which
 * on a right angle is a 45 degree cut. A cut is held to under half of each
 * edge, so two cuts on one short edge never cross.
 */
function cut(points: readonly Point[], chamfer: number | readonly number[]): Point[] {
  const out: Point[] = [];
  points.forEach((vertex, i) => {
    const size = typeof chamfer === 'number' ? chamfer : (chamfer[i] ?? 0);
    if (!size) {
      out.push(vertex);
      return;
    }
    const along = (to: Point): Point => {
      const dx = to[0] - vertex[0];
      const dy = to[1] - vertex[1];
      const t = Math.min(size / Math.hypot(dx, dy), 0.45);
      return [vertex[0] + dx * t, vertex[1] + dy * t];
    };
    out.push(along(points[(i - 1 + points.length) % points.length]!), along(points[(i + 1) % points.length]!));
  });
  return out;
}

const pathOf = (points: readonly Point[]) => `M${points.map(([x, y]) => `${round(x)} ${round(y)}`).join('L')}Z`;

/** Twice the signed area: positive for an outline written clockwise on screen. */
const area = (points: readonly Point[]) =>
  points.reduce((sum, p, i) => {
    const q = points[(i + 1) % points.length]!;
    return sum + p[0] * q[1] - q[0] * p[1];
  }, 0);

/*
 * A chamfered polygon, turned clockwise first if it was written the other way,
 * because every part of a character must share one winding to fill as a union.
 */
function poly(points: readonly Point[], chamfer: number | readonly number[] = 0): string {
  const chamfers = typeof chamfer === 'number' ? points.map(() => chamfer) : chamfer;
  return area(points) < 0 ? pathOf(cut([...points].reverse(), [...chamfers].reverse())) : pathOf(cut(points, chamfers));
}

const rect = (x: number, y: number, width: number, height: number, chamfer: number | readonly number[] = 0) =>
  poly(
    [
      [x, y],
      [x + width, y],
      [x + width, y + height],
      [x, y + height],
    ],
    chamfer,
  );

/** Two block legs from `top` to the ground. */
const legs = (left: number, right: number, top: number, width = 10) => [
  rect(left, top, width, GROUND - top),
  rect(right, top, width, GROUND - top),
];

/** A gear: `teeth` trapezoid teeth between two radii, the first pointing up. */
function gear(cx: number, cy: number, outer: number, inner: number, teeth: number): string {
  const points: Point[] = [];
  for (let k = 0; k < teeth; k += 1) {
    const angle = ((k * 360) / teeth - 90) * (Math.PI / 180);
    for (const [radius, degrees] of [
      [inner, -15],
      [outer, -8.5],
      [outer, 8.5],
      [inner, 15],
    ] as const) {
      const a = angle + degrees * (Math.PI / 180);
      points.push([cx + radius * Math.cos(a), cy + radius * Math.sin(a)]);
    }
  }
  return poly(points);
}

/** The box every point of some paths falls in. They are polygons, so the points are the drawing. */
function boxOf(paths: readonly string[], grow: number): CharacterBox {
  const numbers = paths.join(' ').match(/-?\d*\.?\d+/g)!.map(Number);
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (let i = 0; i < numbers.length; i += 2) {
    left = Math.min(left, numbers[i]!);
    right = Math.max(right, numbers[i]!);
    top = Math.min(top, numbers[i + 1]!);
    bottom = Math.max(bottom, numbers[i + 1]!);
  }
  return { x: left - grow, y: top - grow, width: right - left + 2 * grow, height: bottom - top + 2 * grow };
}

interface Spec {
  readonly name: string;
  readonly shape: string;
  readonly shapes: readonly string[];
  readonly holes?: readonly string[];
  readonly visor: readonly [number, number, number, number];
  /** The crown's height, where it has a flat top to notch; its centre is the stage's unless `notchX` says. */
  readonly notch?: number;
  readonly notchX?: number;
}

const box = ([x, y, width, height]: readonly [number, number, number, number]): CharacterBox => ({ x, y, width, height });

function drawn(spec: Spec): DrawnCharacter {
  return {
    kind: 'drawn',
    name: spec.name,
    shape: spec.shape,
    shapes: spec.shapes,
    holes: spec.holes ?? [],
    visor: box(spec.visor),
    notch: spec.notch === undefined ? null : [spec.notchX ?? 50, spec.notch],
    // The keyline reaches its gap plus its line past the outline.
    bounds: boxOf(spec.shapes, KEYLINE_GAP + KEYLINE_LINE),
  };
}

/*
 * The mark on the stage: its body as wide as the drawn characters' bodies run,
 * its feet on the ground. The scale and the two anchors are the stage's
 * decision; the box comes from the drawing.
 */
const MARK_SCALE = 0.095;
const MARK_CENTRE = 760;
const MARK_FEET = 869;

function mark(): MarkCharacter {
  const { paths, box: own } = CREWLET_MARK;
  const onStage = (x: number, y: number): Point => [
    50 + (x - MARK_CENTRE) * MARK_SCALE,
    GROUND + (y - MARK_FEET) * MARK_SCALE,
  ];
  const [left, top] = onStage(own.left, own.top);
  const [right, bottom] = onStage(own.right, own.bottom);
  return {
    kind: 'mark',
    name: 'Crewlet',
    shape: 'The original mark, arms raised',
    transform: `translate(50 ${GROUND}) scale(${MARK_SCALE}) translate(${-MARK_CENTRE} ${-MARK_FEET})`,
    keyline: paths[0],
    body: [paths[1], paths[2]],
    bounds: { x: left, y: top, width: right - left, height: bottom - top },
  };
}

export const CREWLET_CHARACTER_GEOMETRY: Readonly<Record<CrewletCharacterId, CrewletCharacterGeometry>> = {
  crewlet: mark(),
  hexlet: drawn({
    name: 'Hexlet',
    shape: 'Hexagon with pointed flanks',
    shapes: [
      poly(
        [
          [30, 22],
          [70, 22],
          [86, 54],
          [70, 86],
          [30, 86],
          [14, 54],
        ],
        [5, 5, 4, 4, 4, 4],
      ),
      ...legs(34, 56, 84),
    ],
    visor: [28, 38, 44, 20],
    notch: 22,
  }),
  peaklet: drawn({
    name: 'Peaklet',
    shape: 'Pentagon with a peaked roof',
    shapes: [
      poly(
        [
          [50, 12],
          [82, 36],
          [82, 86],
          [18, 86],
          [18, 36],
        ],
        [6, 5, 4, 4, 5],
      ),
      ...legs(28, 62, 84),
    ],
    visor: [26, 44, 48, 20],
  }),
  prismlet: drawn({
    name: 'Prismlet',
    shape: 'Triangle with cut tips',
    shapes: [
      poly(
        [
          [50, 10],
          [90, 86],
          [10, 86],
        ],
        [9, 8, 8],
      ),
      ...legs(28, 62, 84),
    ],
    visor: [31, 54, 38, 18],
  }),
  towerlet: drawn({
    name: 'Towerlet',
    shape: 'Tall pillar, narrow stance',
    shapes: [rect(32, 12, 36, 74, [8, 8, 4, 4]), ...legs(35, 55, 84)],
    visor: [36, 24, 28, 16],
    notch: 12,
  }),
  bricklet: drawn({
    name: 'Bricklet',
    shape: 'Wide, low slab',
    shapes: [rect(10, 42, 80, 44, [9, 9, 6, 6]), ...legs(22, 68, 84)],
    visor: [21, 50, 58, 19],
    notch: 42,
  }),
  gemlet: drawn({
    name: 'Gemlet',
    shape: 'Diamond on its point',
    shapes: [
      poly(
        [
          [50, 6],
          [90, 48],
          [50, 90],
          [10, 48],
        ],
        [7, 7, 16, 7],
      ),
      ...legs(40, 52, 76, 8),
    ],
    visor: [27, 38, 46, 20],
  }),
  coglet: drawn({
    name: 'Coglet',
    shape: 'Eight-tooth gear',
    shapes: [gear(50, 52, 37, 31, 8), ...legs(36, 54, 78)],
    visor: [30, 40, 40, 18],
  }),
  pluslet: drawn({
    name: 'Pluslet',
    shape: 'Cross with squared arms',
    shapes: [rect(34, 14, 32, 72, [7, 7, 0, 0]), rect(10, 34, 80, 30, 7), ...legs(37, 53, 84)],
    visor: [20, 40, 60, 18],
    notch: 14,
  }),
  shieldlet: drawn({
    name: 'Shieldlet',
    shape: 'Flat crown, pointed base',
    shapes: [
      poly(
        [
          [16, 16],
          [84, 16],
          [84, 54],
          [50, 92],
          [16, 54],
        ],
        [9, 9, 5, 14, 5],
      ),
      ...legs(41, 51, 79, 8),
    ],
    visor: [26, 28, 48, 20],
    notch: 16,
  }),
  stacklet: drawn({
    name: 'Stacklet',
    shape: 'Stepped crown, square base',
    shapes: [
      poly(
        [
          [34, 12],
          [66, 12],
          [66, 26],
          [82, 26],
          [82, 86],
          [18, 86],
          [18, 26],
          [34, 26],
        ],
        [4, 4, 0, 5, 4, 4, 5, 0],
      ),
      ...legs(28, 62, 84),
    ],
    visor: [26, 40, 48, 20],
    notch: 12,
  }),
  sparklet: drawn({
    name: 'Sparklet',
    shape: 'Faceted drop',
    shapes: [
      poly(
        [
          [50, 8],
          [80, 48],
          [78, 74],
          [64, 86],
          [36, 86],
          [22, 74],
          [20, 48],
        ],
        [6, 4, 2, 2, 2, 2, 4],
      ),
      ...legs(36, 54, 84),
    ],
    visor: [30, 48, 40, 18],
  }),
  cloudlet: drawn({
    name: 'Cloudlet',
    shape: 'Three-lobed cloud',
    shapes: [
      rect(14, 44, 72, 42, [0, 0, 8, 8]),
      rect(16, 30, 32, 32, 9),
      rect(33, 18, 34, 34, 10),
      rect(56, 32, 30, 30, 9),
      ...legs(30, 60, 84),
    ],
    visor: [24, 48, 52, 18],
    notch: 18,
  }),
  foxlet: drawn({
    name: 'Foxlet',
    shape: 'Square body, pointed ears',
    shapes: [
      rect(18, 34, 64, 52, 6),
      poly(
        [
          [20, 36],
          [26, 12],
          [44, 36],
        ],
        [0, 4, 0],
      ),
      poly(
        [
          [56, 36],
          [74, 12],
          [80, 36],
        ],
        [0, 4, 0],
      ),
      ...legs(28, 62, 84),
    ],
    visor: [26, 46, 48, 20],
  }),
  rocketlet: drawn({
    name: 'Rocketlet',
    shape: 'Nose cone and swept fins',
    shapes: [
      poly(
        [
          [50, 6],
          [66, 26],
          [66, 80],
          [34, 80],
          [34, 26],
        ],
        [5, 3, 3, 3, 3],
      ),
      poly(
        [
          [34, 54],
          [34, 80],
          [18, 90],
          [18, 70],
        ],
        [0, 0, 3, 3],
      ),
      poly(
        [
          [66, 54],
          [82, 70],
          [82, 90],
          [66, 80],
        ],
        [0, 3, 3, 0],
      ),
      ...legs(37, 55, 80, 8),
    ],
    visor: [37, 32, 26, 16],
  }),
  crownlet: drawn({
    name: 'Crownlet',
    shape: 'Three-point crown',
    shapes: [
      rect(18, 40, 64, 46, [0, 0, 6, 6]),
      poly(
        [
          [18, 44],
          [18, 18],
          [34, 32],
          [50, 12],
          [66, 32],
          [82, 18],
          [82, 44],
        ],
        [0, 3, 0, 3, 0, 3, 0],
      ),
      ...legs(28, 62, 84),
    ],
    visor: [27, 48, 46, 20],
  }),
  cactlet: drawn({
    name: 'Cactlet',
    shape: 'Trunk with two raised arms',
    shapes: [
      rect(32, 12, 36, 74, [10, 10, 0, 0]),
      rect(16, 50, 18, 9, [0, 0, 0, 3]),
      rect(16, 28, 9, 31, [4.5, 4.5, 0, 3]),
      rect(66, 58, 18, 9, [0, 0, 3, 0]),
      rect(75, 38, 9, 29, [4.5, 4.5, 3, 0]),
      ...legs(36, 54, 84),
    ],
    visor: [37, 26, 26, 16],
    notch: 12,
  }),
  wisplet: drawn({
    name: 'Wisplet',
    shape: 'Tall ghost with a zigzag hem',
    shapes: [
      poly(
        [
          [16, 10],
          [84, 10],
          [84, 92],
          [72.5, 82],
          [61, 92],
          [50, 82],
          [39, 92],
          [27.5, 82],
          [16, 92],
        ],
        [14, 14, 2, 0, 2, 0, 2, 0, 2],
      ),
    ],
    visor: [26, 28, 48, 20],
    notch: 10,
  }),
  heartlet: drawn({
    name: 'Heartlet',
    shape: 'Faceted heart',
    shapes: [
      poly(
        [
          [50, 26],
          [62, 14],
          [78, 14],
          [90, 26],
          [90, 44],
          [50, 84],
          [10, 44],
          [10, 26],
          [22, 14],
          [38, 14],
        ],
        [0, 3, 3, 3, 4, 6, 4, 3, 3, 3],
      ),
      ...legs(41, 51, 74, 8),
    ],
    visor: [23, 30, 54, 18],
  }),
  flasklet: drawn({
    name: 'Flasklet',
    shape: 'Lab flask with a narrow neck',
    shapes: [
      rect(35, 6, 30, 7, 2),
      rect(40, 10, 20, 22),
      poly(
        [
          [40, 28],
          [60, 28],
          [86, 80],
          [86, 86],
          [14, 86],
          [14, 80],
        ],
        [0, 0, 6, 3, 3, 6],
      ),
      ...legs(26, 64, 84),
    ],
    visor: [33, 54, 34, 14],
    notch: 6,
  }),
  chiplet: drawn({
    name: 'Chiplet',
    shape: 'Square chip with pins',
    shapes: [
      rect(24, 20, 52, 60, 6),
      ...[31, 47, 63].map((x) => rect(x, 11, 6, 10)),
      ...[32, 47, 62].map((y) => rect(15, y, 10, 6)),
      ...[32, 47, 62].map((y) => rect(75, y, 10, 6)),
      ...[31, 47, 63].map((x) => rect(x, 78, 6, 18)),
    ],
    holes: [rect(29, 70, 5, 5)],
    visor: [31, 34, 38, 18],
  }),
  duolet: drawn({
    name: 'Duolet',
    shape: 'Small head on a wide body',
    shapes: [rect(30, 10, 40, 34, 8), rect(18, 40, 64, 46, 6), ...legs(28, 62, 84)],
    visor: [36, 19, 28, 15],
    notch: 10,
  }),
  chatlet: drawn({
    name: 'Chatlet',
    shape: 'Speech bubble with a tail',
    shapes: [
      rect(14, 22, 72, 54, 8),
      poly(
        [
          [26, 72],
          [46, 72],
          [22, 94],
        ],
        [0, 0, 2],
      ),
    ],
    visor: [24, 34, 52, 22],
    notch: 22,
  }),
  pagelet: drawn({
    name: 'Pagelet',
    shape: 'Page with a folded corner',
    shapes: [
      poly(
        [
          [20, 10],
          [64, 10],
          [80, 26],
          [80, 86],
          [20, 86],
        ],
        [4, 0, 0, 4, 4],
      ),
      ...legs(28, 62, 84),
    ],
    // The fold: two hairline cuts that set the folded corner off the page.
    holes: [rect(63.3, 10, 1.4, 17.4), rect(63.3, 25.3, 17, 1.4)],
    visor: [27, 36, 46, 20],
    notch: 10,
  }),
  archlet: drawn({
    name: 'Archlet',
    shape: 'Gate with built-in legs',
    shapes: [
      poly(
        [
          [16, 18],
          [84, 18],
          [84, 96],
          [64, 96],
          [64, 74],
          [36, 74],
          [36, 96],
          [16, 96],
        ],
        [8, 8, 0, 0, 4, 4, 0, 0],
      ),
    ],
    visor: [25, 30, 50, 22],
    notch: 18,
  }),
  dashlet: drawn({
    name: 'Dashlet',
    shape: 'Body leaning forward',
    shapes: [
      poly(
        [
          [29, 14],
          [87, 14],
          [71, 86],
          [13, 86],
        ],
        6,
      ),
      ...legs(20, 48, 84),
    ],
    visor: [31.5, 28, 42, 20],
    // A leaning crown's middle is not the stage's.
    notch: 14,
    notchX: 58,
  }),
  octlet: drawn({
    name: 'Octlet',
    shape: 'Regular octagon',
    shapes: [rect(16, 16, 68, 68, 20), ...legs(35, 55, 81)],
    visor: [26, 36, 48, 22],
    notch: 16,
  }),
  conelet: drawn({
    name: 'Conelet',
    shape: 'Narrow crown, wide base',
    shapes: [
      poly(
        [
          [30, 12],
          [70, 12],
          [88, 84],
          [12, 84],
        ],
        [6, 6, 5, 5],
      ),
      ...legs(26, 64, 82),
    ],
    visor: [28, 40, 44, 20],
    notch: 12,
  }),
  hivelet: drawn({
    name: 'Hivelet',
    shape: 'Upright honeycomb cell',
    shapes: [
      poly(
        [
          [50, 6],
          [84, 24],
          [84, 72],
          [50, 90],
          [16, 72],
          [16, 24],
        ],
        [6, 4, 4, 6, 4, 4],
      ),
      ...legs(40, 52, 80, 8),
    ],
    visor: [25, 36, 50, 20],
  }),
  folderlet: drawn({
    name: 'Folderlet',
    shape: 'Folder with a tab',
    shapes: [
      poly(
        [
          [12, 14],
          [38, 14],
          [50, 26],
          [88, 26],
          [88, 84],
          [12, 84],
        ],
        [4, 0, 0, 6, 5, 5],
      ),
      ...legs(26, 64, 82),
    ],
    visor: [24, 40, 52, 22],
  }),
};
