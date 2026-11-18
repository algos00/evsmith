'use strict';
/* Property tests of the extra features: Resistance mode (exhaustive check of its split), "why these points" pins,
   Foul Play handling, and that Sand Spit / Seed Sower no longer start weather or terrain by themselves.
   Usage: node features.js [seed] [scenarios] */
const assert = require('assert');
const { loadApp, rng } = require('./lib/load');
const ctx = loadApp(), S = ctx.SOLVE, A = S.A, D = ctx.POKEDEX_CHAMPIONS, MV = ctx.MOVES_CHAMPIONS;
const seed = +process.argv[2] || 1, NSC = +process.argv[3] || 25, rnd = rng(seed), pick = rnd.pick;
const metas = ctx.META.filter(m => D[m.n] && !/^Mega /.test(m.n));
const DYN = /^(Shell Side Arm|Photon Geyser|Body Press|Gyro Ball|Electro Ball|Low Kick|Grass Knot|Heavy Slam|Heat Crash|Stored Power|Power Trip)$/;
const okMove = k => MV[k].category !== 'Status' && !MV[k].unsupported && !DYN.test(k);
const FIELD0 = { weather: '', terrain: '' }, NOLOCK = { hp: null, at: null, df: null, sa: null, sd: null, sp: null };
function survGoal(w) {
  const o = pick(metas), g = S.newGoal('surv'); g.sp = o.n; g.ab = D[o.n].ab; g.it = ''; g.na = pick(['Adamant', 'Modest', 'Hardy']);
  g.mv = o.mv.find(okMove) || 'Close Combat'; g.spA = pick([16, 32]); g.thr = pick(['1', '0.5']); g.w = w || pick(['1000', '10', '1']); g.f = { weather: '', terrain: '' }; return g;
}
const attOf = g => ({ opp: S.oppCfg(g), move: g.mv, crit: false, hits: 0, g, fo: FIELD0 });
/* independent score: priority-weighted mean of the capped HP margin left after the strongest rolls */
function score(M, sp, nat, goals) {
  let v = 0, ws = 0;
  goals.forEach(g => { const x = S.sv(M, sp, nat, attOf(g)), top = x.rolls[x.rolls.length - 1]; v += +g.w * Math.max(-1, Math.min(1, (x.hp - top) / x.hp)); ws += +g.w; });
  return v / ws;
}
let checks = 0;

/* 1. Resistance mode */
const scenarios = [];
while (scenarios.length < NSC) {
  const me = pick(metas).n; if (/^Mega/.test(me)) continue;
  const M = { name: me, ability: D[me].ab, item: '', nature: pick(['Bold', 'Calm', 'Hardy']), status: 'Healthy', fm: 'resist', lock: Object.assign({}, NOLOCK) };
  if (rnd() < .3) M.lock.hp = rnd.int(10);
  const goals = []; for (let k = 1 + rnd.int(2); k > 0; k--) goals.push(survGoal());
  scenarios.push({ M, goals });
}
(async () => {
  for (let i = 0; i < NSC; i++) {
    const { M, goals } = scenarios[i];
    const r = await S.solve(M, goals, {}, () => {}); if (!r) continue;
    const base = r.S, s1 = r.S1, K = ['hp', 'at', 'df', 'sa', 'sd', 'sp'];
    assert(K.reduce((t, k) => t + s1[k], 0) <= 66, 'budget exceeded');
    K.forEach(k => { assert(s1[k] >= base[k] && s1[k] <= 32, 'points removed or cap broken: ' + k); if (M.lock[k] != null) assert.strictEqual(s1[k], base[k], 'locked stat changed: ' + k); });
    ['at', 'sa', 'sp'].forEach(k => assert.strictEqual(s1[k], base[k], k + ' must not change in Resistance mode'));
    /* exhaustive: no other split of the same number of points scores higher */
    const used = ['hp', 'df', 'sd'].reduce((t, k) => t + s1[k] - base[k], 0), rm = k => M.lock[k] == null ? 32 - base[k] : 0, got = score(M, s1, r.nat, goals);
    for (let a = 0; a <= Math.min(rm('hp'), used); a++) for (let b = 0; b <= Math.min(rm('df'), used - a); b++) { const c = used - a - b; if (c < 0 || c > rm('sd')) continue;
      const v = score(M, Object.assign({}, base, { hp: base.hp + a, df: base.df + b, sd: base.sd + c }), r.nat, goals);
      assert(v <= got + 1e-9, `a better split exists for ${M.name}: ${a}/${b}/${c} scores ${v} > ${got}`); }
    /* every goal that was met stays met */
    goals.forEach(g => { if (S.gp(M, base, r.nat, { atts: [attOf(g)] }) >= +g.thr - 1e-9) assert(S.gp(M, s1, r.nat, { atts: [attOf(g)] }) >= +g.thr - 1e-9, 'a met goal was broken by leftover points'); });
    checks++;
  }
  console.log(`Resistance mode: ${checks} scenarios, split is optimal for the stated score, goals preserved`);

  /* 2. "Why these points": a stat is pinned by a goal exactly when removing one point breaks it */
  let pinChecks = 0;
  for (let i = 0; i < NSC; i++) {
    const me = pick(metas).n; if (/^Mega/.test(me)) { i--; continue; }
    const M = { name: me, ability: D[me].ab, item: '', nature: 'Bold', status: 'Healthy', fm: 'none', lock: Object.assign({}, NOLOCK) }, g = survGoal('10');
    const r = await S.solve(M, [g], {}, () => {}); if (!r) continue;
    ['hp', 'df', 'sd'].forEach(k => {
      if (!r.base[k]) return;
      const T = Object.assign({}, r.base); T[k]--;
      const ok = x => S.gp(M, x, r.nat, { atts: [attOf(g)] }) >= +g.thr - 1e-9;
      const expected = ok(r.base) && !ok(T);
      assert.strictEqual(r.pins[k].length > 0, expected, `pins mismatch for ${M.name} ${k}`);
    });
    pinChecks++;
  }
  console.log(`why-these-points: ${pinChecks} scenarios, pins agree with a direct one-point-less check`);

  /* 2b. Extra HP optimizations: best reachable HP stat, goals never weakened, only leftover points used */
  const PRED = { recovery: x => x % 16 === 0, poisonheal: x => x % 8 === 0, sitrus: x => x % 4 === 0, residual: x => x % 16 === 15, poison: x => x % 8 === 7, lifeorb: x => x % 10 === 9, substitute: x => x % 4 === 1 };
  const keys = Object.keys(PRED); let hpChecks = 0;
  for (let i = 0; i < 400; i++) {
    const base = pick([45, 60, 78, 80, 95, 108, 120, 150]), hp0 = rnd.int(33), room = rnd.int(33 - hp0), sel = keys.filter(() => rnd() < .35);
    if (rnd() < .3) sel.push(pick(['maxhp', 'minhp']));
    const t = S.tuneHp(base, hp0, room, sel), conds = sel.filter(k => PRED[k]);
    let bestCount = -1; for (let a = 0; a <= room; a++) bestCount = Math.max(bestCount, conds.filter(k => PRED[k](A.hpOf(base, hp0 + a))).length);
    assert.strictEqual(t.best.ok.length, bestCount, 'HP tuning must reach the most conditions possible');
    const cands = []; for (let a = 0; a <= room; a++) if (conds.filter(k => PRED[k](A.hpOf(base, hp0 + a))).length === bestCount) cands.push(a);
    assert.strictEqual(t.best.add, sel.includes('maxhp') && !sel.includes('minhp') ? Math.max(...cands) : Math.min(...cands), 'tie-break (Max HP / Min HP)');
    hpChecks++;
  }
  for (let i = 0; i < Math.min(12, scenarios.length); i++) {
    const sc = scenarios[i], M = Object.assign({}, sc.M, { fm: 'none', hpOpt: ['sitrus', 'lifeorb'] }), r = await S.solve(M, sc.goals, {}, () => {});
    if (!r) continue;
    assert(r.S1.hp >= r.S.hp && r.S1.hp - r.S.hp <= r.free, 'HP tuning may only use leftover points');
    ['at', 'df', 'sa', 'sd', 'sp'].forEach(k => assert.strictEqual(r.S1[k], r.S[k]));
    sc.goals.forEach(g => { if (S.gp(M, r.S, r.nat, { atts: [attOf(g)] }) >= +g.thr - 1e-9) assert(S.gp(M, r.S1, r.nat, { atts: [attOf(g)] }) >= +g.thr - 1e-9, 'HP tuning broke a goal'); });
    if (M.lock.hp != null) assert.strictEqual(r.S1.hp, r.S.hp, 'locked HP changed');
  }
  console.log(`Extra HP optimizations: ${hpChecks} random cases + 12 solves: best reachable HP stat, goals preserved, only leftover points used`);

  /* 3. Foul Play uses the defender's Atk: the optimizer must keep the goal met when it also needs Atk for a KO */
  const M = { name: 'Incineroar', ability: 'Intimidate', item: '', nature: 'Adamant', status: 'Healthy', fm: 'none', lock: Object.assign({}, NOLOCK) };
  const fp = S.newGoal('surv'); Object.assign(fp, { sp: 'Sableye', ab: 'Prankster', mv: 'Foul Play', spA: 0, thr: '1', w: '1000', na: 'Hardy', f: { weather: '', terrain: '' } });
  const ko = S.newGoal('ko'); Object.assign(ko, { sp: 'Rillaboom', ab: 'Grassy Surge', mv: 'Flare Blitz', thr: '1', w: '10', pct: 100, f: { weather: '', terrain: '' } });
  const rr = await S.solve(M, [fp, ko], {}, () => {});
  const fpOk = S.gp(M, rr.S, rr.nat, { atts: [attOf(fp)] }) >= 1 - 1e-9;
  assert(rr.goals.find(g => /Foul Play/.test(g.label)).ok === fpOk, 'reported result must match a direct check');
  console.log(`Foul Play: result consistent with a direct check (goal met: ${fpOk}, Atk ${rr.S.at})`);

  /* 3b. "Check my spread": same verdicts as the optimizer's own final check, and no optimization */
  let chk = 0;
  for (let i = 0; i < Math.min(15, scenarios.length); i++) {
    const sc = scenarios[i], M = Object.assign({}, sc.M, { fm: 'none' }), r = await S.solve(M, sc.goals, {}, () => {}); if (!r) continue;
    const c = S.checkSpread(M, sc.goals, r.S, r.nat);
    assert(c.check === true && c.goals.length === r.goals.length, 'check result shape');
    c.goals.forEach((g, k) => { assert.strictEqual(g.ok, r.goals[k].ok, 'verdict differs for ' + g.label); assert.strictEqual(g.label, r.goals[k].label); assert(Math.abs(g.p - r.goals[k].p) < 1e-12); });
    const empty = S.checkSpread(M, sc.goals, { hp: 0, at: 0, df: 0, sa: 0, sd: 0, sp: 0 }, r.nat);
    assert.strictEqual(empty.free, 66);
    chk++;
  }
  console.log(`Check my spread: ${chk} scenarios, verdicts identical to the optimizer's final check`);

  /* 4. Sand Spit / Seed Sower do not set weather or terrain in "auto" */
  A.mkField({ weather: 'auto', terrain: 'auto' });
  const sand = A.mkPoke({ name: 'Sandaconda', ability: 'Sand Spit', nature: 'Hardy', sp: {}, moves: [] }), fo = A.mkPoke({ name: 'Rillaboom', ability: 'None', nature: 'Hardy', sp: {}, moves: ['Wood Hammer'] });
  const dmgSpit = A.calc(fo, sand).mine[0].damage;
  A.mkField({ weather: '', terrain: '' });
  const sand2 = A.mkPoke({ name: 'Sandaconda', ability: 'Sand Spit', nature: 'Hardy', sp: {}, moves: [] }), fo2 = A.mkPoke({ name: 'Rillaboom', ability: 'None', nature: 'Hardy', sp: {}, moves: ['Wood Hammer'] });
  assert.deepStrictEqual(dmgSpit, A.calc(fo2, sand2).mine[0].damage, 'Sand Spit must not start sand by itself');
  console.log('Sand Spit / Seed Sower: no automatic weather or terrain');
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
