import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// tsup emits hashed CSS chunks that the compiled JS imports via side-effect.
// We additionally publish a single dist/styles.css containing the same rules,
// so consumers can do either:
//   (1) import { Button } from '@crewlethq/ui'      // CSS auto-loads via side-effect
//   (2) import '@crewlethq/ui/styles.css'           // single bundle (SSR / non-tree-shaking consumers)
const __dirname = dirname(fileURLToPath(import.meta.url));
const dist = resolve(__dirname, '..', 'dist');

const all = await readdir(dist);
const chunks = all.filter((f) => f.endsWith('.css') && f !== 'styles.css').sort();

const parts = await Promise.all(
  chunks.map(async (f) => `/* ${f} */\n${await readFile(resolve(dist, f), 'utf8')}`),
);

await writeFile(
  resolve(dist, 'styles.css'),
  parts.length === 0 ? '/* empty */\n' : parts.join('\n\n'),
);

console.warn(`[ui] bundled ${chunks.length} css chunk(s) into styles.css`);
