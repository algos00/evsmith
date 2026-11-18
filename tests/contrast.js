'use strict';
/* WCAG contrast of the colour tokens in src/style.css, light and dark, for the text/background pairs the page uses.
   Normal text needs 4.5:1, large or bold text 3:1. Card backgrounds are semi-transparent in the page; the solid token is used here. */
const fs = require('fs'), path = require('path');
const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'style.css'), 'utf8');
const grab = block => { const o = {}; for (const m of block.matchAll(/--([a-z0-9]+):\s*(#[0-9a-fA-F]{6})/g)) o[m[1]] = m[2]; return o; };
const light = grab(css.match(/:root\{[^}]*\}/)[0]);
const dark = grab(css.match(/:root:not\(\[data-theme="light"\]\)\{[^}]*\}/)[0]);
const lum = h => { const n = parseInt(h.slice(1), 16), c = [n >> 16, n >> 8 & 255, n & 255].map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
const PAIRS = [['tx', 'bg', 4.5], ['tx', 'card', 4.5], ['tx', 'card2', 4.5], ['mu', 'bg', 4.5], ['mu', 'card', 4.5], ['mu', 'card2', 4.5], ['ac', 'card', 4.5], ['ok', 'card', 4.5], ['bad', 'card', 4.5], ['bad', 'card2', 4.5], ['act', 'ac', 4.5]];
let fail = 0;
[['light', light], ['dark', dark]].forEach(([name, t]) => PAIRS.forEach(([f, b, min]) => {
  if (!t[f] || !t[b]) { console.log(`${name}: missing token ${f}/${b}`); fail++; return; }
  const r = ratio(t[f], t[b]), ok = r >= min;
  if (!ok) fail++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name.padEnd(5)} ${f}/${b} ${r.toFixed(2)} (min ${min})`);
}));
console.log(fail ? `${fail} contrast pair(s) below the minimum` : 'all token pairs meet the minimum contrast');
process.exit(fail ? 1 : 0);
