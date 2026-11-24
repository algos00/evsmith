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
var LANG='en';
${fn('N_')}
${fn('tr')}
${stmt('var STA=')}
${stmt('var WE=')}
${stmt('var CK=')}
${stmt('var SIT=')}
${stmt('var HPOPT=')}
var THR=[];for(var q=16;q>=1;q--)THR.push([String(q/16),q===16?'100% (always)':(q*6.25)+'%']);
${fn('newGoal')}
${ui.slice(dispStart, dispEnd)}
${ui.slice(pureStart, pureEnd)}
${stmt('var META_BY=')}
${stmt('var META_MAX=')}
${stmt('var TOP=')}
${fn('itemLocked')}
${fn('soleAb')}
${fn('metaSet')}
${fn('dmgMoves')}
var goals=[],UIV={};var $i=function(id){return UIV[id]||{checked:false,value:''}};
${fn('metaGoals')}
globalThis.T={metaGoals:metaGoals,setUi:function(o){UIV={};Object.keys(o).forEach(function(k){UIV[k]=typeof o[k]==='boolean'?{checked:o[k],value:''}:{checked:false,value:o[k]}})},setGoals:function(g){goals=g},parseShowdownSet:parseShowdownSet,btnColors:btnColors,contrastOf:contrastOf,spriteUrls:spriteUrls,typeChips:typeChips,spriteImg:spriteImg,radar:radar,TYC:TYC,tyInk:tyInk,SPRITE_HOST:SPRITE_HOST,cleanState:cleanState,blocksOf:blocksOf,moveBlock:moveBlock,blockIndex:blockIndex,ranked:ranked,cleanGoal:cleanGoal,encodeShare:encodeShare,decodeShare:decodeShare,showdownSet:showdownSet,newGoal:newGoal};`;
ctx.btoa = btoa; ctx.atob = atob; ctx.escape = escape; ctx.unescape = unescape; ctx.encodeURIComponent = encodeURIComponent; ctx.decodeURIComponent = decodeURIComponent;
vm.runInContext(code, ctx);
const T = ctx.T;
let n = 0; const pending = []; const ok = (name, f) => { const r = f(); if (r && r.then) pending.push(r.then(() => { n++; })); else n++; };

const sample = () => {
  const g1 = T.newGoal('surv'); Object.assign(g1, { sp: 'Rillaboom', mv: 'Wood Hammer', spA: 32, ab: 'Grassy Surge', it: 'Miracle Seed', na: 'Adamant', thr: '0.5', w: '1000', f: { weather: 'Sun', terrain: 'Grassy', tailwindR: true } });
  const g2 = T.newGoal('ko'); Object.assign(g2, { sp: 'Archaludon', mv: 'Flare Blitz', pct: 50, crit: true, bo: -2, mbo: 1 });
  const g3 = T.newGoal('spd'); Object.assign(g3, { sp: 'Sneasler', spe: 20, mode: 'under' });
  return { v: 1, m: { sp: 'Incineroar', ab: 'Intimidate', it: 'Sitrus Berry', na: '*', st: 'Healthy', fm: 'bulk', lk: { hp: '', at: 10, df: '', sa: '', sd: '', sp: 0 } },
    t: { on: true, spd: false, n: '12', m: '2', nat: 'off', we: 'auto', te: '', b: '24' }, g: [g1, g2, g3] };
};

ok('round trip', () => {
  const st = ctx.T.cleanState(sample()), back = T.decodeShare(T.encodeShare(st));
  assert.deepStrictEqual(JSON.parse(JSON.stringify(back)), JSON.parse(JSON.stringify(st)));
  assert.strictEqual(back.g.length, 3); assert.strictEqual(back.g[0].f.tailwindR, true); assert.strictEqual(back.g[1].pct, 50);
});
ok('defence boosts survive a round trip and are clamped', () => {
  const g = T.newGoal('surv'); Object.assign(g, { sp: 'Sneasler', mv: 'Dire Claw', db: 2, sb: -1 });
  const st = ctx.T.cleanState({ v: 1, m: {}, t: {}, g: [g] }), back = T.decodeShare(T.encodeShare(st));
  assert.strictEqual(back.g[0].db, 2); assert.strictEqual(back.g[0].sb, -1);
  g.db = 99; assert.strictEqual(ctx.T.cleanState({ v: 1, m: {}, t: {}, g: [g] }).g[0].db, 6);
});
ok('old KO goals with hh:true become Helping Hand in the field', () => {
  const g = T.newGoal('ko'); Object.assign(g, { sp: 'Archaludon', mv: 'Flare Blitz', hh: true });
  const c = ctx.T.cleanState({ v: 1, m: {}, t: {}, g: [g] }).g[0];
  assert.strictEqual(c.f.helpingHandL, true); assert.strictEqual(c.hh, undefined);
});
ok('goal order: blocks, moves and old saves', () => {
  const mk = (t, join, w, tag) => Object.assign(T.newGoal(t), { sp: 'Garchomp', mv: 'Earthquake', join, w, tag });
  const g = [mk('surv', false, '1', 'a'), mk('surv', true, '1', 'a2'), mk('ko', false, '1000', 'b'), mk('spd', false, '10', 'c')];
  assert.strictEqual(T.blocksOf(g).length, 3); assert.strictEqual(T.blockIndex(g, 1), 0); assert.strictEqual(T.blockIndex(g, 2), 1);
  const tags = a => a.map(x => x.tag).join();
  assert.strictEqual(tags(T.moveBlock(g.slice(), 0, 1)), 'b,a,a2,c', 'a joined pair moves as one');
  assert.strictEqual(tags(T.moveBlock(g.slice(), 3, 0)), 'c,a,a2,b'); assert.strictEqual(tags(T.moveBlock(g.slice(), 2, -5)), 'b,a,a2,c');
  assert.strictEqual(tags(T.moveBlock(g.slice(), 0, 99)), 'b,c,a,a2');
  const old = ctx.T.cleanState({ v: 1, m: {}, t: {}, g: g.map(x => Object.assign({}, x)) });
  assert.strictEqual(old.g.map(x => x.sp).length, 4); assert.strictEqual(old.o, 2);
  assert.strictEqual(old.g.map(x => x.t).join(), 'ko,spd,surv,surv', 'old saves: Required first, then Important, then Nice to have');
  const cur = ctx.T.cleanState({ v: 1, o: 2, m: {}, t: {}, g: g.map(x => Object.assign({}, x)) });
  assert.strictEqual(cur.g.map(x => x.t).join(), 'surv,surv,ko,spd', 'new saves keep their order');
  assert.strictEqual(T.ranked(g).map(x => x.w).join(), '4,3,2,1');
});
ok('tournament meta KO goals (the real metaGoals code)', () => {
  const ko = (mv) => Object.assign(T.newGoal('ko'), { sp: 'Incineroar', mv });
  T.setGoals([ko('Moonblast'), ko('Psyshock'), ko('Moonblast'), ko('Light of Ruin'), ko('Dazzling Gleam')]);
  T.setUi({ tmOn: false, tmSpd: false, tmKo: true, tmN: '5', tmM: '2', tmNat: 'off', tmWe: 'auto', tmTe: 'auto', tmKb: '16', tmKt: '0.5', tmKp: '75' });
  const g = T.metaGoals(), mvs = [...new Set(g.map(x => x.mv))];
  assert.strictEqual(mvs.join(), 'Moonblast,Psyshock,Light of Ruin', 'distinct moves of the KO goals, at most three');
  assert.strictEqual(g.length, 15); assert(g.every(x => x.t === 'ko' && x.meta && x.hp === 32 && x.pct === 75 && x.thr === '0.5' && !x.f.helpingHandL && x.mbo === 0));
  const sd = g.filter(x => x.mv === 'Moonblast'), df = g.filter(x => x.mv === 'Psyshock');
  assert(sd.every(x => x.sd === 16 && x.df === 0), 'special move: bulk goes to SpD'); assert(df.every(x => x.df === 16 && x.sd === 0), 'Psyshock hits Def: bulk goes to Def');
  T.setGoals([]); assert.strictEqual(T.metaGoals().length, 0, 'no KO goal, no KO meta');
  T.setUi({ tmOn: false, tmSpd: true, tmKo: false, tmN: '5', tmM: '2', tmNat: 'off', tmWe: 'auto', tmTe: 'auto', tmKb: '16', tmKt: '1', tmKp: '50' });
  assert(T.metaGoals().every(x => x.t === 'spd'), 'other options still work');
});
ok('the Mega Floette link from the issue: Perfect spread keeps Recovery and beats the old spreads', () => {
  const tok = 'eyJ2IjoxLCJtIjp7InNwIjoiTWVnYSBGbG9ldHRlIiwiYWIiOiJGYWlyeSBBdXJhIiwiaXQiOiIiLCJuYSI6Ik1vZGVzdCIsInN0IjoiSGVhbHRoeSIsImZtIjoib2ZmZW5zZSIsImFiT24iOmZhbHNlLCJmYWludGVkIjowLCJobyI6WyJyZWNvdmVyeSJdLCJsayI6eyJocCI6IiIsImF0IjoiIiwiZGYiOiIiLCJzYSI6IiIsInNkIjoiIiwic3AiOiIifX0sInQiOnsib24iOmZhbHNlLCJzcGQiOmZhbHNlLCJuIjoiMTIiLCJtIjoiMiIsIm5hdCI6Im9mZiIsIndlIjoiYXV0byIsInRlIjoiYXV0byIsImIiOiIyNCJ9LCJnIjpbeyJmIjp7IndlYXRoZXIiOiJhdXRvIiwidGVycmFpbiI6ImF1dG8ifSwidCI6InN1cnYiLCJzcCI6IlNuZWFzbGVyIiwiYWIiOiJVbmJ1cmRlbiIsIml0IjoiV2hpdGUgSGVyYiIsIm5hIjoiQWRhbWFudCIsInN0IjoiSGVhbHRoeSIsIm12IjoiRGlyZSBDbGF3Iiwic3BBIjozMiwiaHAiOjAsImRmIjowLCJzZCI6MCwic3BlIjowLCJibyI6MCwibWJvIjowLCJ0aHIiOiIxIiwidyI6IjEwIiwiam9pbiI6ZmFsc2UsIm1vZGUiOiJvdmVyIiwicGN0IjoxMDAsInNldCI6IiIsImNyaXQiOmZhbHNlLCJoaXRzIjowLCJoaCI6ZmFsc2UsImFiT24iOmZhbHNlLCJmYWludGVkIjowfSx7ImYiOnsid2VhdGhlciI6ImF1dG8iLCJ0ZXJyYWluIjoiYXV0byIsImhlbHBpbmdIYW5kTCI6dHJ1ZX0sInQiOiJrbyIsInNwIjoiSW5jaW5lcm9hciIsImFiIjoiSW50aW1pZGF0ZSIsIml0IjoiU2l0cnVzIEJlcnJ5IiwibmEiOiJDYXJlZnVsIiwic3QiOiJIZWFsdGh5IiwibXYiOiJNb29uYmxhc3QiLCJzcEEiOjMyLCJocCI6MzIsImRmIjowLCJzZCI6MjAsInNwZSI6MCwiYm8iOjAsIm1ibyI6MSwidGhyIjoiMSIsInciOiIxMCIsImpvaW4iOmZhbHNlLCJtb2RlIjoib3ZlciIsInBjdCI6MTAwLCJzZXQiOiIiLCJjcml0IjpmYWxzZSwiaGl0cyI6MCwiaGgiOmZhbHNlLCJhYk9uIjpmYWxzZSwiZmFpbnRlZCI6MH0seyJmIjp7IndlYXRoZXIiOiJhdXRvIiwidGVycmFpbiI6ImF1dG8iLCJoZWxwaW5nSGFuZEwiOnRydWV9LCJ0Ijoia28iLCJzcCI6IktpbmdhbWJpdCIsImFiIjoiRGVmaWFudCIsIml0IjoiQ2hvcGxlIEJlcnJ5IiwibmEiOiJIYXJkeSIsInN0IjoiSGVhbHRoeSIsIm12IjoiTW9vbmJsYXN0Iiwic3BBIjozMiwiaHAiOjMyLCJkZiI6MCwic2QiOjE5LCJzcGUiOjAsImJvIjowLCJtYm8iOjEsInRociI6IjEiLCJ3IjoiMTAiLCJqb2luIjpmYWxzZSwibW9kZSI6Im92ZXIiLCJwY3QiOjEwMCwic2V0IjoiIiwiY3JpdCI6ZmFsc2UsImhpdHMiOjAsImhoIjpmYWxzZSwiYWJPbiI6ZmFsc2UsImZhaW50ZWQiOjB9XX0';
  const st = T.decodeShare(tok), S = ctx.SOLVE, A = S.A, bs = ctx.POKEDEX_CHAMPIONS['Mega Floette'].bs;
  assert(st && st.g.length === 3 && st.o === 2, 'old link decodes; the goal order stays as saved when all weights are equal');
  const M = { name: st.m.sp, ability: st.m.ab, item: st.m.it, nature: st.m.na, status: 'Healthy', fm: st.m.fm, hpOpt: st.m.ho, lock: { hp: null, at: null, df: null, sa: null, sd: null, sp: null } };
  const run = (mode) => S.solve(Object.assign({ pm: mode }, M), st.g, {}, () => {}, { mode });
  return Promise.all([run('min'), run('perfect')]).then(([min, per]) => {
    const dmg = sp => S.checkSpread(M, st.g, sp, 'Modest').goals[0].hi, hpStat = r => A.hpOf(bs.hp, r.base.hp);
    assert.deepStrictEqual(JSON.parse(JSON.stringify(min.base)), { hp: 10, at: 0, df: 29, sa: 0, sd: 0, sp: 0 });
    assert(per.goals.every(g => g.ok), 'every goal met'); assert.strictEqual(hpStat(per) % 16, 0, 'Recovery: the HP stat is a multiple of 16');
    assert.strictEqual(per.base.hp, 27);
    const spent = per.S1; assert(spent.hp + spent.at + spent.df + spent.sa + spent.sd + spent.sp <= 66);
    assert(dmg(per.base) < dmg({ hp: 11, at: 0, df: 29, sa: 26, sd: 0, sp: 0 }) - 5, 'much less damage than the old 11/29/26');
    assert(dmg(per.base) < dmg({ hp: 27, at: 0, df: 22, sa: 17, sd: 0, sp: 0 }), 'less damage than 27/22/17');
    assert([0, 5, 15, 25].includes(per.S1.sa), 'the final SpA sits on a bump of the Modest nature: ' + per.S1.sa);
  });
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
ok('Showdown import', () => {
  const S = { hp: 32, at: 32, df: 2, sa: 0, sd: 0, sp: 0 };
  const txt = T.showdownSet({ name: 'Incineroar', item: 'Sitrus Berry', ability: 'Intimidate', nature: 'Adamant', S, moves: ['Flare Blitz', 'Knock Off'] });
  const o = T.parseShowdownSet(txt);
  assert.strictEqual(o.name, 'Incineroar'); assert.strictEqual(o.item, 'Sitrus Berry'); assert.strictEqual(o.ability, 'Intimidate'); assert.strictEqual(o.nature, 'Adamant');
  assert.strictEqual(JSON.stringify(o.ev), JSON.stringify({ hp: 32, at: 32, df: 2, sa: 0, sd: 0, sp: 0 })); assert.strictEqual(o.moves.length, 2); assert.strictEqual(o.warn.length, 0);
  /* nickname, gender, Mega naming, locked item */
  const m = T.parseShowdownSet('Zard (Charizard-Mega-X) (M) @ Charizardite X\nAbility: Tough Claws\nJolly Nature\nEVs: 4 HP / 252 Atk / 252 Spe\n- Flare Blitz');
  assert.strictEqual(m.name, 'Mega Charizard X'); assert.strictEqual(m.item, ''); assert(m.warn.some(w => /classic EVs/.test(w)), 'classic EVs must be converted');
  const sum = Object.values(m.ev).reduce((a, b) => a + b, 0); assert(sum <= 66 && Math.max(...Object.values(m.ev)) <= 32);
  /* unknown and hostile input */
  const h = T.parseShowdownSet('<img src=x onerror=1> @ <b>x</b>\nAbility: <i>\n- <script>');
  assert.strictEqual(h.name, ''); assert(h.warn.length >= 1);
  assert.strictEqual(T.parseShowdownSet('').warn.length, 1);
  const u = T.parseShowdownSet('Garchomp @ Nonexistent Item\nAbility: Bogus\nSilly Nature\n- Fake Move'); assert.strictEqual(u.name, 'Garchomp'); assert(u.warn.length >= 4);
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
ok('button colours keep 4.5:1 contrast for every type pair', () => {
  const types = Object.keys(T.TYC);
  types.forEach(a => types.forEach(b => { const c = T.btnColors(T.TYC[a], T.TYC[b]); assert(T.contrastOf(c.a, c.ink) >= 4.5 && T.contrastOf(c.b, c.ink) >= 4.5, `low contrast for ${a}/${b}`); }));
  types.forEach(a => assert(T.contrastOf(T.TYC[a], T.tyInk(T.TYC[a])) >= 3, 'type chip contrast ' + a));
});
ok('type chips and radar chart are well formed', () => {
  assert(!/[<>"]/.test(T.tyInk('#F7D02C') + T.tyInk('#6F35FC')) && T.tyInk('#F7D02C') !== T.tyInk('#6F35FC'));
  assert.strictEqual((T.typeChips('Incineroar').match(/class="ty"/g) || []).length, 2);
  assert.strictEqual(T.typeChips('"><b>'), '');
  const S = { hp: 0, at: 32, df: 5, sa: 0, sd: 12, sp: 17 }, svg = T.radar(S, { hp: 0, at: 32, df: 5, sa: 0, sd: 12, sp: 32 }, { hp: 'HP', at: 'Atk', df: 'Def', sa: 'SpA', sd: 'SpD', sp: 'Spe' });
  assert(svg.startsWith('<svg') && svg.endsWith('</svg>') && !/NaN|undefined/.test(svg), 'radar must not contain NaN/undefined');
  assert.strictEqual((svg.match(/<circle/g) || []).length, 6); assert(svg.includes('17→32'));
});
Promise.all(pending).then(() => console.log(`app logic: ${n} checks passed`)).catch(e => { console.error('FAIL', e.stack || e.message); process.exit(1); });
