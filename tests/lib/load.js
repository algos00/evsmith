'use strict';
/* Loads EVSmith.html into a Node vm sandbox without a browser:
   data tables, the damage engine and the optimizer core (everything before the UI section). */
const fs = require('fs'), vm = require('vm'), path = require('path');

function braceBlock(src, start) {
  let i = src.indexOf('{', start), d = 0, j = i;
  for (; j < src.length; j++) {
    if (src[j] === '{') d++;
    else if (src[j] === '}' && --d === 0) break;
  }
  return src.slice(start, j + 1);
}

function loadApp(htmlPath) {
  htmlPath = htmlPath || process.env.EVSMITH_HTML || path.join(__dirname, '..', '..', 'dist', 'EVSmith.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  const find = marker => {
    const s = scripts.find(x => x.includes(marker));
    if (!s) throw new Error('script block not found: ' + marker);
    return s;
  };
  const sprites = find('var SPRITES='), data = find('POKEDEX_CHAMPIONS='), tdata = find('var TDATA='), engine = find('EVSmith damage engine'), ui = find('var A=ENG;');
  const a = ui.indexOf('var A=ENG;'), b = ui.indexOf('/* ---------- UI ---------- */');
  let core = ui.slice(a, b);
  const extra = ['newField', 'flatField', 'oppCfg', 'newGoal'].map(n => braceBlock(ui, ui.indexOf('function ' + n + '('))).join('\n');
  const tail = `var NM={hp:'HP',at:'Atk',df:'Def',sa:'SpA',sd:'SpD',sp:'Spe'};
globalThis.SOLVE={solve:solve,mkMe:mkMe,sv:sv,gp:gp,ko:ko,koNeed:koNeed,spdOk:spdOk,tuneHp:tuneHp,HPOPT:HPOPT,spendFree:spendFree,oppCfg:oppCfg,newGoal:newGoal,NATS:NATS,A:A,FOG:function(){return FOG}};`;
  const ctx = { console, setTimeout };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(data, ctx);
  vm.runInContext(tdata, ctx);
  vm.runInContext(sprites, ctx);
  vm.runInContext(engine, ctx);
  vm.runInContext("(function(){'use strict';\n" + core + '\n' + extra + '\n' + tail + '\n})();', ctx);
  return ctx;
}

/* small deterministic PRNG so failures can be reproduced with the same seed */
function rng(seed) {
  let s = seed >>> 0;
  const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  r.pick = a => a[Math.floor(r() * a.length)];
  r.int = n => Math.floor(r() * n);
  return r;
}

module.exports = { loadApp, rng };
