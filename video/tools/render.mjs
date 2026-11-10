// Renders every tutorial (or one) to out/<id>.mp4.  npm run render [tutorial-id]
import { readdir, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const only = process.argv[2];
for (const f of (await readdir('tutorials')).filter((x) => x.endsWith('.json'))) {
  const { id } = JSON.parse(await readFile(`tutorials/${f}`, 'utf8'));
  if (only && id !== only) continue;
  const r = spawnSync('npx', ['remotion', 'render', 'src/index.ts', id, `out/${id}.mp4`], { stdio: 'inherit' });
  if (r.status) process.exit(r.status);
}
