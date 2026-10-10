/**
 * Reading the Crewlet mark's own drawing: its paths, and the box they occupy.
 *
 * Two readers need both. The build emits them for the characters, which draw
 * the original Crewlet from the mark itself rather than from a copy, and the
 * brand suite measures the icon-slot files against them. One reader keeps the
 * two from disagreeing about what the mark is.
 */

/** Every path's geometry, in document order, which is the drawing itself. */
export const markPaths = (source) => [...source.matchAll(/<path\b[^>]*\sd="([^"]+)"/g)].map((match) => match[1]);

/*
 * What the drawing actually occupies, as the hull of every point its paths
 * name. A cubic segment stays inside the hull of its own control points, so
 * this over-states the mark rather than under-stating it, which is the safe
 * direction for a frame that has to contain it.
 *
 * The mark is traced artwork and uses five commands. Anything else is a
 * re-export this reader has never been run against, so it throws: a parser
 * that skips a command it does not know measures part of a drawing and calls
 * it the whole one.
 */
export function extent(paths) {
  const box = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity };
  const see = (x, y) => {
    box.left = Math.min(box.left, x);
    box.right = Math.max(box.right, x);
    box.top = Math.min(box.top, y);
    box.bottom = Math.max(box.bottom, y);
  };
  for (const d of paths) {
    if (!/^[MmLlCcZz\d.,\s-]+$/.test(d)) throw new Error('the mark uses a path command this reader does not know');
    const tokens = d.match(/[MmLlCcZz]|-?\d*\.?\d+(?:[eE][-+]?\d+)?/g) ?? [];
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
        // Extra pairs after a move are line segments, in the same case.
        command = relative ? 'l' : 'L';
      } else if (command === 'L' || command === 'l') {
        x = relative ? x + next() : next();
        y = relative ? y + next() : next();
      } else if (command === 'C' || command === 'c') {
        // The control points travel from the same current point, so x and y
        // move only once the segment has been read.
        const points = [];
        for (let point = 0; point < 3; point += 1) {
          points.push([relative ? x + next() : next(), relative ? y + next() : next()]);
        }
        for (const [px, py] of points) see(px, py);
        [x, y] = points[2];
      } else {
        throw new Error(`unhandled path command ${command}`);
      }
      see(x, y);
    }
  }
  return box;
}
