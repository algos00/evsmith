'use strict';
/* npm test: runs every check against ../EVSmith.html (or EVSMITH_HTML=path). Exit code 0 only if all pass. */
const { spawnSync } = require('child_process');
const steps = [
  ['engine vs @smogon/calc', ['compare-smogon.js', '1', '20000']],
  ['engine vs @smogon/calc (second seed)', ['compare-smogon.js', '2', '20000']],
  ['optimizer vs exhaustive search', ['optimizer-bruteforce.js', '1', '60', '6']],
  ['optimizer vs exhaustive search (second seed)', ['optimizer-bruteforce.js', '2', '60', '6']],
  ['situational abilities vs @smogon/calc', ['situational.js', '1', '12000']],
  ['features (Resistance mode, why-pins, Foul Play, Sand Spit)', ['features.js', '1', '25']],
  ['app logic (state, share link, export)', ['app-logic.js']]
];
let failed = 0;
for (const [name, args] of steps) {
  const r = spawnSync(process.execPath, args, { cwd: __dirname, encoding: 'utf8' });
  process.stdout.write(`\n== ${name}\n${r.stdout}${r.stderr}`);
  if (r.status !== 0) failed++;
}
console.log(failed ? `\n${failed} check(s) FAILED` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
