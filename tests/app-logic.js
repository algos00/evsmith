'use strict';
/* Tests the pure interface functions of EVSmith.html: share-link encoding/validation, Showdown export,
   and that Stat Points map 1:1 to Showdown's Champions "EVs" line. */
const assert = require('assert'), fs = require('fs'), vm = require('vm'), path = require('path');
const { loadApp } = require('./lib/load');
const htmlPath = process.env.EVSMITH_HTML || path.join(__dirname, '..', 'dist', 'EVSmith.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const ctx = loadApp(htmlPath);
const ui = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).find(x => x.includes('var A=ENG;'));

function stmt(startMarker) { /* a one-line `var ...;` statement of the UI script */
  const i = ui.indexOf(startMarker); if (i < 0) throw new Error('missing ' + startMarker);
  return ui.slice(i, ui.indexOf('\n', i));
}
function fn(name) {
  const i = ui.indexOf('function ' + name + '('); let d = 0, j = ui.indexOf('{', i);
  for (let k = j; ; k++) { if (ui[k] === '{') d++; else if (ui[k] === '}' && --d === 0) return ui.slice(i, k + 1); }
}
const dispStart = ui.indexOf('/* ---------- display helpers (pure'), dispEnd = ui.indexOf('/* ---------- end display helpers ---------- */');
assert(dispStart > 0 && dispEnd > dispStart, 'display helper markers not found');
const pureStart = ui.indexOf('/* ---------- share & export (pure'), pureEnd = ui.indexOf('/* ---------- end share & export ---------- */');
assert(pureStart > 0 && pureEnd > pureStart, 'pure block markers not found');
const code = `
var DEX=POKEDEX_CHAMPIONS,MV=MOVES_CHAMPIONS,ABL=ABILITIES_CHAMPIONS,ITL=ITEMS_CHAMPIONS;
${stmt('var STA=')}
${stmt('var WE=')}
${stmt('var CK=')}
${stmt('var SIT=')}
${stmt('var HPOPT=')}
var THR=[];for(var q=16;q>=1;q--)THR.push([String(q/16),q===16?'100% (always)':(q*6.25)+'%']);
${fn('newGoal')}
${ui.slice(dispStart, dispEnd)}
${ui.slice(pureStart, pureEnd)}
globalThis.T={spriteUrls:spriteUrls,typeChips:typeChips,spriteImg:spriteImg,radar:radar,TYC:TYC,tyInk:tyInk,SPRITE_HOST:SPRITE_HOST,cleanState:cleanState,cleanGoal:cleanGoal,encodeShare:encodeShare,decodeShare:decodeShare,showdownSet:showdownSet,newGoal:newGoal};`;
ctx.btoa = btoa; ctx.atob = atob; ctx.escape = escape; ctx.unescape = unescape; ctx.encodeURIComponent = encodeURIComponent; ctx.decodeURIComponent = decodeURIComponent;
vm.runInContext(code, ctx);
const T = ctx.T;
let n = 0; const ok = (name, f) => { f(); n++; };

const sample = () => {
  const g1 = T.newGoal('surv'); Object.assign(g1, { sp: 'Rillaboom', mv: 'Wood Hammer', spA: 32, ab: 'Grassy Surge', it: 'Miracle Seed', na: 'Adamant', thr: '0.5', w: '1000', f: { weather: 'Sun', terrain: 'Grassy', tailwindR: true } });
  const g2 = T.newGoal('ko'); Object.assign(g2, { sp: 'Archaludon', mv: 'Flare Blitz', pct: 50, hh: true, crit: true, bo: -2, mbo: 1 });
  const g3 = T.newGoal('spd'); Object.assign(g3, { sp: 'Sneasler', spe: 20, mode: 'under' });
  return { v: 1, m: { sp: 'Incineroar', ab: 'Intimidate', it: 'Sitrus Berry', na: '*', st: 'Healthy', fm: 'bulk', lk: { hp: '', at: 10, df: '', sa: '', sd: '', sp: 0 } },
    t: { on: true, spd: false, n: '12', m: '2', nat: 'off', we: 'auto', te: '', b: '24' }, g: [g1, g2, g3] };
};

ok('round trip', () => {
  const st = ctx.T.cleanState(sample()), back = T.decodeShare(T.encodeShare(st));
  assert.deepStrictEqual(JSON.parse(JSON.stringify(back)), JSON.parse(JSON.stringify(st)));
  assert.strictEqual(back.g.length, 3); assert.strictEqual(back.g[0].f.tailwindR, true); assert.strictEqual(back.g[1].pct, 50);
});
ok('unicode and size', () => {
  const s = sample(); for (let i = 0; i < 10; i++) s.g.push(Object.assign(T.newGoal('surv'), { sp: 'Garchomp', mv: 'Earthquake' }));
  const link = T.encodeShare(T.cleanState(s)); assert(link.length < 8000, 'link too long: ' + link.length); assert(/^[A-Za-z0-9_-]+$/.test(link));
});
ok('hostile input is neutralised', () => {
  const bad = sample();
  bad.m.sp = '"><img src=x onerror=alert(1)>'; bad.m.it = '<script>'; bad.m.lk.hp = '"><b>'; bad.t.n = '"><x>';
  bad.g = [Object.assign(T.newGoal('surv'), { sp: '"><svg onload=1>', mv: '"><i>', spA: '"><u>', thr: '"><s>', w: '"><s>', ab: '<b>', it: '<i>', na: '<x>', f: { weather: '<x>', terrain: '"', 'evil"key': true } }), { t: 'nope' }, null, 5];
  const c = T.cleanState(bad), out = JSON.stringify(c);
  assert(!/[<>]/.test(out), 'markup survived: ' + out);
  assert.strictEqual(c.g.length, 1); assert.strictEqual(c.g[0].sp, ''); assert.strictEqual(typeof c.g[0].spA, 'number'); assert.strictEqual(c.g[0].f.weather, 'auto'); assert(!('evil"key' in c.g[0].f));
  assert.strictEqual(c.m.sp, 'Incineroar'); assert.strictEqual(c.m.lk.hp, '');
});
ok('HP optimizations list is validated', () => {
  const s = sample(); s.m.ho = ['recovery', 'recovery', 'evil"><b>', 'maxhp', 'minhp', 'lifeorb', 7];
  const c = T.cleanState(s); assert.strictEqual(JSON.stringify(c.m.ho), JSON.stringify(['recovery', 'maxhp', 'lifeorb']));
  assert.strictEqual(JSON.stringify(T.decodeShare(T.encodeShare(c)).m.ho), JSON.stringify(['recovery', 'maxhp', 'lifeorb']));
  s.m.ho = 'nope'; assert.strictEqual(JSON.stringify(T.cleanState(s).m.ho), '[]');
});
ok('numbers are clamped', () => {
  const s = sample(); s.g[0].spA = 999; s.g[0].bo = -50; s.g[1].pct = -5; s.m.lk.at = 77;
  const c = T.cleanState(s); assert.strictEqual(c.g[0].spA, 32); assert.strictEqual(c.g[0].bo, -6); assert.strictEqual(c.g[1].pct, 0); assert.strictEqual(c.m.lk.at, 32);
});
ok('garbage links are rejected', () => {
  ['', 'not base64!!', 'e30', Buffer.from('{"v":2}').toString('base64url'), Buffer.from('[1,2').toString('base64url')].forEach(t => assert.strictEqual(T.decodeShare(t), null, t));
});
ok('Showdown set text', () => {
  const S = { hp: 32, at: 32, df: 2, sa: 0, sd: 0, sp: 0 };
  assert.strictEqual(T.showdownSet({ name: 'Incineroar', item: 'Sitrus Berry', ability: 'Intimidate', nature: 'Adamant', S, moves: ['Flare Blitz', 'Knock Off'] }),
    'Incineroar @ Sitrus Berry\nAbility: Intimidate\nLevel: 50\nEVs: 32 HP / 32 Atk / 2 Def\nAdamant Nature\n- Flare Blitz\n- Knock Off');
  assert.strictEqual(T.showdownSet({ name: 'Mega Charizard X', item: 'Charizardite X', ability: 'Tough Claws', nature: 'Jolly', S: { hp: 0, at: 0, df: 0, sa: 0, sd: 0, sp: 0 }, moves: [] }),
    'Charizard-Mega-X @ Charizardite X\nAbility: Tough Claws\nLevel: 50\nJolly Nature');
  assert.strictEqual(T.showdownSet({ name: 'Mega Venusaur', item: '', ability: 'Thick Fat', nature: '', S, moves: [] }).split('\n')[0], 'Venusaur-Mega');
});
ok('Stat Points equal Showdown Champions EVs', () => {
  /* Showdown (mods/champions/scripts.ts, level-clause branch): trunc((2*base+31+max(2*ev-1,0))*level/100)+5, then nature */
  const A = ctx.ENG, D = ctx.POKEDEX_CHAMPIONS, bases = new Set();
  Object.values(D).forEach(d => Object.values(d.bs).forEach(b => bases.add(b)));
  bases.forEach(b => { for (let sp = 0; sp <= 32; sp++) {
    const core = Math.trunc((2 * b + 31 + Math.max(2 * sp - 1, 0)) * 50 / 100);
    assert.strictEqual(A.statOf(b, sp, 'Hardy', 'at'), core + 5, `stat b=${b} sp=${sp}`);
    assert.strictEqual(A.statOf(b, sp, 'Adamant', 'at'), Math.trunc((core + 5) * 110 / 100), `+nature b=${b} sp=${sp}`);
    if (b > 1) assert.strictEqual(A.hpOf(b, sp), core + 60, `hp b=${b} sp=${sp}`);
  } });
});
ok('sprites: every Pokémon has pictures, only from the PokéAPI host', () => {
  const D = ctx.POKEDEX_CHAMPIONS;
  Object.keys(D).forEach(n => {
    ['big', 'small'].forEach(k => { const u = T.spriteUrls(n, k); assert(u.length >= 2, 'no sprite urls for ' + n); u.forEach(x => assert(x.startsWith(T.SPRITE_HOST) && /^[A-Za-z0-9\/:._-]+\.png$/.test(x), 'unexpected url ' + x)); });
    assert(T.spriteImg(n, 'big', 'x').includes('referrerpolicy="no-referrer"'));
    [D[n].t1, D[n].t2].filter(Boolean).forEach(t => assert(T.TYC[t], 'no colour for type ' + t));
  });
  assert.strictEqual(T.spriteUrls('Nope', 'big').length, 0); assert.strictEqual(T.spriteImg('Nope', 'big', ''), '');
  /* forms fall back to the base species picture */
  assert(T.spriteUrls('Mega Charizard Y', 'big').some(x => x.endsWith('/other/official-artwork/6.png')));
});
ok('type chips and radar chart are well formed', () => {
  assert(!/[<>"]/.test(T.tyInk('#F7D02C') + T.tyInk('#6F35FC')) && T.tyInk('#F7D02C') !== T.tyInk('#6F35FC'));
  assert.strictEqual((T.typeChips('Incineroar').match(/class="ty"/g) || []).length, 2);
  assert.strictEqual(T.typeChips('"><b>'), '');
  const S = { hp: 0, at: 32, df: 5, sa: 0, sd: 12, sp: 17 }, svg = T.radar(S, { hp: 0, at: 32, df: 5, sa: 0, sd: 12, sp: 32 }, { hp: 'HP', at: 'Atk', df: 'Def', sa: 'SpA', sd: 'SpD', sp: 'Spe' });
  assert(svg.startsWith('<svg') && svg.endsWith('</svg>') && !/NaN|undefined/.test(svg), 'radar must not contain NaN/undefined');
  assert.strictEqual((svg.match(/<circle/g) || []).length, 6); assert(svg.includes('17→32'));
});
console.log(`app logic: ${n} checks passed`);
