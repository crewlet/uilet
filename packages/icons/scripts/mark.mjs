/**
 * Reading the Crewlet mark's own drawing: its paths, the box they occupy, and
 * where its body has its centre of area.
 *
 * Two readers need them. The build emits them for the characters, which draw
 * the original Crewlet from the mark itself rather than from a copy, and the
 * brand suite measures the icon-slot files against them. One reader keeps the
 * two from disagreeing about what the mark is.
 */

/** Every path's geometry, in document order, which is the drawing itself. */
export const markPaths = (source) => [...source.matchAll(/<path\b[^>]*\sd="([^"]+)"/g)].map((match) => match[1]);

/*
 * Every segment of one path, in absolute units, by subpath: a line is its end
 * point, a cubic its two control points and its end point, and each segment
 * carries the point it starts from.
 *
 * The mark is traced artwork and uses five commands. Anything else is a
 * re-export this reader has never been run against, so it throws: a parser
 * that skips a command it does not know measures part of a drawing and calls
 * it the whole one.
 */
function subpaths(d) {
  if (!/^[MmLlCcZz\d.,\s-]+$/.test(d)) throw new Error('the mark uses a path command this reader does not know');
  const tokens = d.match(/[MmLlCcZz]|-?\d*\.?\d+(?:[eE][-+]?\d+)?/g) ?? [];
  const out = [];
  let segments = null;
  let command = null;
  let index = 0;
  let x = 0;
  let y = 0;
  let startX = 0;
  let startY = 0;
  const next = () => Number(tokens[index++]);
  while (index < tokens.length) {
    if (/^[A-Za-z]$/.test(tokens[index])) {
      command = tokens[index++];
      if (command === 'Z' || command === 'z') {
        x = startX;
        y = startY;
        continue;
      }
    }
    const relative = command === command.toLowerCase();
    if (command === 'M' || command === 'm') {
      x = relative ? x + next() : next();
      y = relative ? y + next() : next();
      startX = x;
      startY = y;
      segments = [];
      out.push({ start: [x, y], segments });
      // Extra pairs after a move are line segments, in the same case.
      command = relative ? 'l' : 'L';
    } else if (command === 'L' || command === 'l') {
      const from = [x, y];
      x = relative ? x + next() : next();
      y = relative ? y + next() : next();
      segments.push({ from, points: [[x, y]] });
    } else if (command === 'C' || command === 'c') {
      // The control points travel from the same current point, so x and y
      // move only once the segment has been read.
      const from = [x, y];
      const points = [];
      for (let point = 0; point < 3; point += 1) {
        points.push([relative ? x + next() : next(), relative ? y + next() : next()]);
      }
      [x, y] = points[2];
      segments.push({ from, points });
    } else {
      throw new Error(`unhandled path command ${command}`);
    }
  }
  return out;
}

/*
 * What the drawing actually occupies, as the hull of every point its paths
 * name. A cubic segment stays inside the hull of its own control points, so
 * this over-states the mark rather than under-stating it, which is the safe
 * direction for a frame that has to contain it.
 */
export function extent(paths) {
  const box = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity };
  const see = ([x, y]) => {
    box.left = Math.min(box.left, x);
    box.right = Math.max(box.right, x);
    box.top = Math.min(box.top, y);
    box.bottom = Math.max(box.bottom, y);
  };
  for (const d of paths) {
    for (const { start, segments } of subpaths(d)) {
      see(start);
      for (const { points } of segments) points.forEach(see);
    }
  }
  return box;
}

/*
 * Where the mark's body has its centre of area: the region its outline
 * encloses, the window round the visor counted in, which is the silhouette a
 * drawn character's parts make and what every character's frame is pulled
 * toward. The body is the second path and its outline that path's first
 * subpath. A cubic is walked in 32 steps, which puts the centroid within a
 * hundredth of a unit of the curve's own.
 */
export function bodyCentroid(paths) {
  const [outline] = subpaths(paths[1]);
  const ring = [outline.start];
  for (const { from, points } of outline.segments) {
    if (points.length === 1) {
      ring.push(points[0]);
      continue;
    }
    const [a, b, c] = points;
    for (let step = 1; step <= 32; step += 1) {
      const t = step / 32;
      const u = 1 - t;
      ring.push([
        u * u * u * from[0] + 3 * u * u * t * a[0] + 3 * u * t * t * b[0] + t * t * t * c[0],
        u * u * u * from[1] + 3 * u * u * t * a[1] + 3 * u * t * t * b[1] + t * t * t * c[1],
      ]);
    }
  }
  let area = 0;
  let x = 0;
  let y = 0;
  ring.forEach((p, i) => {
    const q = ring[(i + 1) % ring.length];
    const cross = p[0] * q[1] - q[0] * p[1];
    area += cross;
    x += (p[0] + q[0]) * cross;
    y += (p[1] + q[1]) * cross;
  });
  return { x: x / (3 * area), y: y / (3 * area) };
}
