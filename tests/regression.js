'use strict';
/* Regression: "Perfect spread" must not stop at the fewest points.
   Mega Floette (Hardy) must survive Sneasler's Dire Claw (Adamant, 32 Atk points) and, at +1 with Helping Hand, KO a 32 HP / 32 SpD Careful
   Incineroar and Kingambit with Moonblast. The fewest points that do it are 10 HP / 29 Def / 21 SpA (60 points); with the same
   goals "Perfect spread" must spend all the points it usefully can, so Dire Claw does clearly less damage while every KO still works.
   Atk, SpD and Spe are fixed at 0 so that the exhaustive reference below (every HP / Def / SpA, engine called on each full spread) stays fast.
   Usage: node regression.js */
const assert = require('assert');
const { loadApp } = require('./lib/load');
const ctx = loadApp(), S = ctx.SOLVE, A = S.A, D = ctx.POKEDEX_CHAMPIONS;
const FIELD0 = { weather: '', terrain: '' };
const M = { name: 'Mega Floette', ability: 'Fairy Aura', item: '', nature: 'Hardy', status: 'Healthy', fm: 'none', hpOpt: [], lock: { hp: null, at: 0, df: null, sa: null, sd: 0, sp: 0 } };
const surv = S.newGoal('surv'); Object.assign(surv, { sp: 'Sneasler', ab: 'Unburden', na: 'Adamant', mv: 'Dire Claw', spA: 32, f: { weather: '', terrain: '' } });
const ko = (sp) => { const k = S.newGoal('ko'); Object.assign(k, { sp, ab: D[sp].abs[0], na: 'Careful', mv: 'Moonblast', hp: 32, sd: 32, mbo: 1, f: { weather: '', terrain: '', helpingHandL: true } }); return k; };
const goals = [surv, ko('Incineroar'), ko('Kingambit')];

/* score of a spread, straight from the engine: goals met in order, then every margin together, worst first (leximin) */
function vec(Sp) {
  const bg = S.buildGoals(goals), G = bg.groups[0], out = [];
  const p = S.gp(M, Sp, 'Hardy', G), x = S.sv(M, Sp, 'Hardy', G.atts[0]), taken = Math.ceil(x.rolls[x.rolls.length - 1] / x.hp * 100 - 1e-9);
  const ks = bg.kos.map(K => S.ko(M, Sp, 'Hardy', K));
  const el = [p * 100, 100 - taken, ...ks.flatMap(r => [r.p * 100, Math.min(100, Math.floor(r.rolls[0] / r.hp * 100 + 1e-9))])].sort((x, y) => x - y);
  out.push(p >= 1 - 1e-9 ? 1 : 0, ...ks.map((r, i) => r.p >= bg.kos[i].thr - 1e-9 ? 1 : 0), ...el);
  return out;
}
const cmp = (a, b) => { for (let i = 0; i < a.length; i++) { if (a[i] > b[i] + 1e-12) return 1; if (a[i] < b[i] - 1e-12) return -1; } return 0; };
(async () => {
  const min = await S.solve(M, goals, {}, () => {}, { mode: 'min' }), per = await S.solve(M, goals, {}, () => {}, { mode: 'perfect' });
  const pts = s => s.hp + s.at + s.df + s.sa + s.sd + s.sp;
  assert.deepStrictEqual(JSON.parse(JSON.stringify(min.base)), { hp: 10, at: 0, df: 29, sa: 21, sd: 0, sp: 0 }, 'Minimum points result changed');
  assert(min.goals.every(g => g.ok) && per.goals.every(g => g.ok), 'every goal must be met in both modes');
  assert(pts(per.base) > pts(min.base), 'Perfect spread must use more points than the minimum');
  const dmg = r => r.goals[0].hi;
  assert(dmg(per) < dmg(min) - 3, `Dire Claw must do less damage (${dmg(per).toFixed(1)}% vs ${dmg(min).toFixed(1)}%)`);
  /* exhaustive: no spread of HP / Def / SpA with at most 66 points beats the one found */
  let best = null, n = 0;
  for (let h = 0; h <= 32; h++) for (let d = 0; d <= 32; d++) for (let sa = 0; sa <= 32 && h + d + sa <= 66; sa++) {
    const Sp = { hp: h, at: 0, df: d, sa, sd: 0, sp: 0 }, v = vec(Sp), tot = h + d + sa; n++;
    if (!best || cmp(v, best.v) > 0 || (cmp(v, best.v) === 0 && tot < best.tot)) best = { v, tot, Sp };
  }
  assert.strictEqual(cmp(vec(per.base), best.v), 0, `Perfect spread is not the best one: found ${JSON.stringify(per.base)}, exhaustive ${JSON.stringify(best.Sp)}`);
  assert.strictEqual(pts(per.base), best.tot);
  /* the order of the goals only matters for which ones to give up, not for the margins: same goals, other order */
  const rev = await S.solve(M, [goals[1], goals[2], goals[0]], {}, () => {}, { mode: 'perfect' });
  assert(rev.goals.every(g => g.ok));
  console.log(`regression: Mega Floette minimum ${JSON.stringify(min.base)} (Dire Claw up to ${dmg(min).toFixed(1)}%) -> Perfect spread ${JSON.stringify(per.base)} (${dmg(per).toFixed(1)}%), confirmed best among ${n} HP/Def/SpA spreads; KO goals first: ${JSON.stringify(rev.base)}`);
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
