'use strict';
/* Runs the checks in parallel, one process each, against ../dist/EVSmith.html (or EVSMITH_HTML=path).
   node run-all.js          quick set for development (a few seconds)
   node run-all.js --full   everything, as before a release and in CI: more random cases, two seeds, and the
                            end-to-end checks in Chrome
   Exit code 0 only if every check passes. A failing check prints its full output; rerun that file alone with the
   same arguments to reproduce it. */
const { spawn } = require('child_process'), os = require('os');
const full = process.argv.includes('--full');
const SHARDS = Math.max(2, Math.min(12, os.cpus().length - 1));
const shard = (name, args) => Array.from({ length: SHARDS }, (_, k) => [`${name} [${k + 1}/${SHARDS}]`, [...args, `${k}/${SHARDS}`]]);
const steps = full ? [
  ['engine vs @smogon/calc (seed 1)', ['compare-smogon.js', '1', '20000']],
  ['engine vs @smogon/calc (seed 2)', ['compare-smogon.js', '2', '20000']],
  ...shard('optimizer vs exhaustive search (seed 1)', ['optimizer-bruteforce.js', '1', '60', '6']),
  ...shard('optimizer vs exhaustive search (seed 2)', ['optimizer-bruteforce.js', '2', '60', '6']),
  ['situational abilities vs @smogon/calc', ['situational.js', '1', '12000']],
  ['features', ['features.js', '1', '25']],
  ['app logic', ['app-logic.js']],
  ['colour contrast (WCAG)', ['contrast.js']],
  ['Italian translation coverage', ['i18n.js']]
] : [
  ['engine vs @smogon/calc', ['compare-smogon.js', '1', '3000']],
  ...shard('optimizer vs exhaustive search', ['optimizer-bruteforce.js', '1', '16', '0']),
  ['situational abilities vs @smogon/calc', ['situational.js', '1', '2000']],
  ['features', ['features.js', '1', '6']],
  ['app logic', ['app-logic.js']],
  ['colour contrast (WCAG)', ['contrast.js']],
  ['Italian translation coverage', ['i18n.js']]
];
const t0 = Date.now();
const run = ([name, args]) => new Promise(res => {
  const t = Date.now(), p = spawn(process.execPath, args, { cwd: __dirname });
  let out = ''; p.stdout.on('data', d => out += d); p.stderr.on('data', d => out += d);
  p.on('close', code => res({ name, args, code, out, ms: Date.now() - t }));
});
/* the end-to-end checks run after the others: with every core busy, page timings get slow enough to fail at random */
const after = full ? [['end-to-end in Chrome', ['e2e.js']]] : [];
Promise.all(steps.map(run)).then(async rs => {
  for (const s of after) rs.push(await run(s));
  for (const r of rs) {
    const last = r.out.trim().split('\n').filter(l => /^\S/.test(l)).pop() || '';
    console.log(`${r.code === 0 ? ' ok ' : 'FAIL'}  ${r.name}  (${(r.ms / 1000).toFixed(1)} s)  ${r.code === 0 ? last : ''}`);
    if (r.code !== 0) console.log(`      node ${r.args.join(' ')}\n` + r.out.replace(/^/gm, '      '));
  }
  const failed = rs.filter(r => r.code !== 0).length;
  console.log(`\n${full ? 'full' : 'quick'} run, ${((Date.now() - t0) / 1000).toFixed(1)} s: ` + (failed ? `${failed} check(s) FAILED` : 'all checks passed'));
  process.exit(failed ? 1 : 0);
});
