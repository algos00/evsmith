'use strict';
/* Checks the optimizer against an independent exhaustive search that calls the engine on every full spread (no tables, no
   split into blocks). Random scenarios: 1-4 goals (Survive / KO / Speed; list order = priority), fixed nature or "Auto: every
   nature", random locked stats, a random point limit, HP Optimizations ticked or not, in both modes.
   The reference ranks a spread by this vector, compared lexicographically (the spec the optimizer must follow):
     1. for every goal in list order: 1 if met;
     2. "Perfect spread" only: every ticked HP Optimization (Recovery, Life Orb...) in its list order, 1 if the HP stat fits;
     3. "Perfect spread" only: the margins of all Survive / KO goals that are met, as one list sorted from the worst up (leximin; every goal weighs the same):
        per goal its chance in % and its margin in whole % (Survive: HP left after the strongest rolls, rounded down; KO: weakest roll / target HP, rounded down, at most 100); a goal that is not met counts 100 twice;
     4. "Perfect spread" only: 1 if the stat the nature raises sits on a bump (its last point gave +2) or at 0 points;
     5. "Perfect spread" only: the Max HP / Min HP preference;
     6. fewer points.
   To stay exhaustive and fast, either the point limit is 10 (every spread of the six stats) or three or four stats are locked
   (the others take every value), so a scenario has at most about 40,000 spreads.
   Usage: node optimizer-bruteforce.js [seed] [scenarios] [autoNatureScenarios] [shard/shards]
   With shard k/n only every n-th scenario starting at k is solved (the scenarios themselves are the same), so
   run-all.js can spread one seed over several processes. */
const { loadApp, rng } = require('./lib/load');
const ctx = loadApp(), S = ctx.SOLVE, A = S.A, D = ctx.POKEDEX_CHAMPIONS, MV = ctx.MOVES_CHAMPIONS;
const seed = +process.argv[2] || 1, NS = +process.argv[3] || 40, NA = process.argv[4] !== undefined ? +process.argv[4] : 4;
const [SHARD, SHARDS] = (process.argv[5] || '0/1').split('/').map(Number);
const rnd = rng(seed), pick = rnd.pick;
const metas = ctx.META.filter(m => D[m.n] && !/^Mega /.test(m.n));
const DYN = /^(Shell Side Arm|Photon Geyser|Body Press|Foul Play|Gyro Ball|Electro Ball|Low Kick|Grass Knot|Heavy Slam|Heat Crash|Stored Power|Power Trip)$/;
const okMove = k => MV[k].category !== 'Status' && !MV[k].unsupported && !DYN.test(k);
const koMoves = Object.keys(MV).filter(k => okMove(k) && MV[k].bp >= 80 && !MV[k].hitRange && !MV[k].isSpread);
const dmgMove = m => m.mv.find(v => MV[v] && okMove(v));
const FIELD0 = { weather: '', terrain: '' };

const K6 = ['hp', 'at', 'df', 'sa', 'sd', 'sp'];
function scenario(auto) {
  const me = pick(metas).n;
  const M = { name: me, ability: D[me].ab, item: '', nature: auto ? '*' : pick(['Bold', 'Calm', 'Adamant', 'Modest', 'Hardy', 'Jolly']), status: 'Healthy', fm: 'none', lock: { hp: null, at: null, df: null, sa: null, sd: null, sp: null }, hpOpt: [] };
  const small = auto ? false : rnd() < .4, limit = small ? 10 : 66;
  if (!small) { /* lock three or four stats at random values; the optimizer must work around them */
    const free = K6.slice().sort(() => rnd() - .5).slice(0, auto ? 2 : 2 + rnd.int(2));
    K6.forEach(k => { if (!free.includes(k)) M.lock[k] = pick([0, 4, 8, 12, 16, 20, 24, 32]); });
    let sum = 0; K6.forEach(k => { sum += M.lock[k] || 0; }); if (sum > 40) K6.forEach(k => { if (M.lock[k] != null) M.lock[k] = Math.floor(M.lock[k] / 2); });
  }
  if (rnd() < .5) M.hpOpt = ['recovery', 'lifeorb', 'sitrus', 'maxhp', 'substitute'].filter(() => rnd() < .5);
  const goals = [], ng = 1 + rnd.int(4);
  while (goals.length < ng) {
    const t = pick(['surv', 'surv', 'ko', 'spd']), o = pick(metas), g = S.newGoal(t);
    g.sp = o.n; g.ab = D[o.n].ab; g.it = ''; g.na = pick(['Adamant', 'Modest', 'Hardy']);
    if (t === 'surv') { const mv = rnd() < .2 ? 'Foul Play' : dmgMove(o); if (!mv) continue; g.mv = mv; g.spA = pick([0, 16, 32]); g.thr = pick(['1', '0.5']); if (rnd() < .2) g.db = pick([1, 2]); }
    if (t === 'ko') { g.mv = pick(koMoves); g.pct = pick([100, 100, 60]); g.thr = pick(['1', '0.5']); g.hhOn = rnd() < .3; }
    if (t === 'spd') { g.spe = pick([0, 16, 32]); g.mode = pick(['over', 'over', 'under']); }
    g.f = { weather: '', terrain: '' }; if (g.hhOn) g.f.helpingHandL = true;
    if (t === 'surv' && goals.length && goals[goals.length - 1].t === 'surv' && rnd() < .2) g.join = true;
    goals.push(g);
  }
  return { M, goals, limit };
}

/* the score vector of one full spread, from direct engine calls */
function refVector(M, goals, Sp, n, perfect) {
  const bg = S.buildGoals(goals), items = [];
  bg.groups.forEach(G => items.push({ ix: G.ix, f: () => {
    const fp = G.atts.some(a => a.move === 'Foul Play'); G.myAt = fp ? Sp.at : null; const p = S.gp(M, Sp, n, G); G.myAt = null;
    let tot = 0, hp = 1; G.atts.forEach(a => { const x = S.sv(M, fp ? Object.assign({}, Sp, { at: Sp.at }) : Sp, n, a); hp = x.hp; tot += x.rolls[x.rolls.length - 1]; });
    return [p >= G.thr - 1e-9, p, 100 - Math.ceil(tot / hp * 100 - 1e-9), true]; } }));
  bg.kos.forEach(K => items.push({ ix: K.ix, f: () => { const x = S.ko(M, Sp, n, K); return [x.p >= K.thr - 1e-9, x.p, Math.min(100, Math.floor(x.rolls[0] / x.hp * 100 + 1e-9)), true]; } }));
  bg.spds.forEach(Sg => items.push({ ix: Sg.ix, f: () => { A.mkField(Sg.fo || FIELD0); const r = A.calc(S.mkMe(M, Sp, n), A.mkPoke({ name: Sg.opp.name, ability: Sg.opp.ability, item: Sg.opp.item, nature: Sg.opp.nature, sp: Sg.opp.sp, boosts: Sg.opp.boosts, status: 'Healthy', moves: [] })); return [Sg.mode === 'under' ? r.mySpeed < r.oppSpeed : r.mySpeed > r.oppSpeed, 0, 0]; } }));
  items.sort((a, b) => a.ix - b.ix);
  const out = items.map(it => it.f()), v = out.map(o => o[0] ? 1 : 0);
  if (perfect) {
    const stat = A.hpOf(D[M.name].bs.hp, Sp.hp), sel = M.hpOpt || [];
    S.HPOPT.forEach(r => { if (r[3] && sel.includes(r[0])) v.push(r[3](stat) ? 1 : 0); });
    const el = []; out.forEach(o => { if (o[3]) el.push(o[0] ? o[1] * 100 : 100, o[0] ? o[2] : 100); }); el.sort((a, b) => a - b); v.push(...el);
    const nat = ctx.NATURES[n] || ['', ''], bk = nat[0] && nat[0] !== nat[1] && nat[0] !== 'hp' ? nat[0] : null, bs = D[M.name].bs;
    v.push(bk && (!Sp[bk] || A.statOf(bs[bk], Sp[bk], n, bk) - A.statOf(bs[bk], Sp[bk] - 1, n, bk) === 2) ? 1 : 0);
    const hi = sel.includes('maxhp'), lo = sel.includes('minhp'); v.push(hi && !lo ? stat : (lo && !hi ? -stat : 0));
  }
  return v;
}
const cmpV = (a, b) => { for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; if (d > 1e-12) return 1; if (d < -1e-12) return -1; } return 0; };
function bruteNature(M, goals, n, limit, perfect) {
  let best = null; const Sp = { hp: 0, at: 0, df: 0, sa: 0, sd: 0, sp: 0 };
  const rec = (i, left) => {
    if (i === 6) {
      const v = refVector(M, goals, Sp, n, perfect), tot = limit - left;
      if (!best || cmpV(v, best.v) > 0 || (cmpV(v, best.v) === 0 && tot < best.tot)) best = { v, tot, S: Object.assign({}, Sp) };
      return;
    }
    const k = K6[i], lk = M.lock[k];
    if (lk != null) { if (lk > left) return; Sp[k] = lk; rec(i + 1, left - lk); return; }
    for (let x = 0; x <= Math.min(32, left); x++) { Sp[k] = x; rec(i + 1, left - x); }
  };
  rec(0, limit);
  return best;
}

(async () => {
  let ok = 0, bad = 0, infeasible = 0, auto = 0, done = 0, perfectN = 0;
  const total = NS + NA;
  for (let i = 0; i < total; i++) {
    const isAuto = i >= NS, { M, goals, limit } = scenario(isAuto), perfect = rnd() < .5;
    if (i % SHARDS !== SHARD) continue;
    done++; if (perfect) perfectN++; const t0 = Date.now();
    const r = await S.solve(M, goals, {}, () => {}, { limit, mode: perfect ? 'perfect' : 'min' });
    let best = null;
    for (const n of (isAuto ? S.NATS : [M.nature])) { const b = bruteNature(M, goals, n, limit, perfect); if (b && (!best || cmpV(b.v, best.v) > 0 || (cmpV(b.v, best.v) === 0 && b.tot < best.tot))) best = Object.assign(b, { n }); }
    let same = (r === null && best === null);
    if (r && best) {
      const sum = K6.reduce((t, k) => t + r.base[k], 0), v = refVector(M, goals, r.base, r.nat, perfect);
      same = cmpV(v, best.v) === 0 && sum === best.tot && sum <= limit && K6.every(k => M.lock[k] == null || r.base[k] === M.lock[k]);
      if (!same) console.log('  solver spread', JSON.stringify(r.base), r.nat, JSON.stringify(v), '| exhaustive', JSON.stringify(best.S), best.n, JSON.stringify(best.v), 'tot', best.tot, 'vs', sum);
    }
    if (!same) {
      bad++; console.log('MISMATCH', perfect ? 'perfect' : 'min', 'limit', limit, M.name, M.nature, JSON.stringify(M.lock), JSON.stringify(M.hpOpt), goals.map(g => `${g.t}:${g.sp}:${g.mv || g.mode}${g.join ? '+' : ''}`).join(' '));
    } else ok++;
    if (process.env.TIMING) console.log("  scenario", i, isAuto ? "auto" : "", limit, JSON.stringify(M.lock), Date.now() - t0, "ms");
    if (r && !r.goals.every(g => g.ok)) infeasible++;
    if (isAuto) auto++;
  }
  console.log(`optimizer vs exhaustive search: ${done} scenarios (seed ${seed}${SHARDS > 1 ? `, part ${SHARD + 1}/${SHARDS}` : ''}; ${perfectN} "Perfect spread"; ${auto} with every nature; ${infeasible} where not all goals can be met): ${ok} identical, ${bad} different`);
  process.exit(bad ? 1 : 0);
})();
