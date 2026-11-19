'use strict';
/* Checks the optimizer against an independent exhaustive search.
   For random scenarios (1-4 goals: Survive / KO / Speed, fixed nature or "Auto: every nature") the best result is
   (most weight met, then most goals met, then fewest points). The exhaustive search enumerates every (HP, Def, SpD)
   combination, and every subset of KO and Speed goals, for each nature.
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

function scenario(auto) {
  const me = pick(metas).n;
  const M = { name: me, ability: D[me].ab, item: '', nature: auto ? '*' : pick(['Bold', 'Calm', 'Adamant', 'Modest', 'Hardy', 'Jolly']), status: 'Healthy', fm: 'none', lock: { hp: null, at: null, df: null, sa: null, sd: null, sp: null } };
  const goals = [], ng = 1 + rnd.int(4);
  while (goals.length < ng) {
    const t = pick(['surv', 'surv', 'ko', 'spd']), o = pick(metas), g = S.newGoal(t);
    g.sp = o.n; g.ab = D[o.n].ab; g.it = ''; g.na = pick(['Adamant', 'Modest', 'Hardy']);
    if (t === 'surv') { const mv = rnd() < .2 ? 'Foul Play' : dmgMove(o); if (!mv) continue; g.mv = mv; g.spA = pick([0, 16, 32]); g.thr = pick(['1', '0.5']); }
    if (t === 'ko') { g.mv = pick(koMoves); g.pct = pick([100, 100, 60]); g.thr = pick(['1', '0.5']); g.hh = rnd() < .3; }
    if (t === 'spd') { g.spe = pick([0, 16, 32]); g.mode = pick(['over', 'over', 'under']); }
    g.w = pick(['1000', '10', '1']); g.f = { weather: '', terrain: '' };
    goals.push(g);
  }
  return { M, goals };
}

/* best (W, C, cost) over every way to meet a subset of goals, for one nature */
function bruteNature(M, goals, n) {
  const survs = goals.filter(g => g.t === 'surv'), kos = goals.filter(g => g.t === 'ko'), spds = goals.filter(g => g.t === 'spd');
  const tableFor = (g, atk) => {
    const mv = MV[g.mv], defK = (mv.category === 'Physical' || mv.dealsPhysicalDamage) ? 'df' : 'sd', att = { opp: S.oppCfg(g), move: g.mv, crit: false, hits: 0, g, fo: FIELD0 }, t = [];
    /* The damage rolls do not depend on the HP points (only the threshold does), so they are computed once per defensive
       value instead of once per (HP, defensive) pair: 33 engine calls instead of 1089. To keep the search exhaustive, every
       value is also computed at 0 and 32 HP points and the two must agree. */
    const spFor = (h, x) => { const sp = { hp: h }; sp[defK] = x; if (atk != null) sp.at = atk; return sp; };
    const lists = [];
    for (let x = 0; x <= 32; x++) {
      const a = S.sv(M, spFor(0, x), n, att).lists, b = S.sv(M, spFor(32, x), n, att).lists;
      if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`damage depends on HP points (${M.name} ${n} ${g.mv} ${defK}=${x})`);
      lists.push(a);
    }
    for (let h = 0; h <= 32; h++) { const hp = S.mkMe(M, { hp: h }, n).maxHP; t.push(lists.map(L => S.conv(L, hp, true) >= +g.thr - 1e-9)); }
    return { defK, t };
  };
  const costMap = tabs => {
    /* cheapest (HP + Def + SpD) for every set of Survive goals met; the mask of a Def goal depends on (HP, Def) and that of a SpD goal on (HP, SpD) */
    const best = new Int32Array(1 << tabs.length).fill(1e9), dm = new Int32Array(33), sm = new Int32Array(33);
    for (let h = 0; h <= 32; h++) {
      for (let v = 0; v <= 32; v++) { dm[v] = 0; sm[v] = 0; tabs.forEach((x, i) => { if (x.t[h][v]) (x.defK === 'df' ? dm : sm)[v] |= 1 << i; }); }
      for (let d = 0; d <= 32; d++) for (let s = 0; s <= 32; s++) { const mask = dm[d] | sm[s], c = h + d + s; if (c < best[mask]) best[mask] = c; }
    }
    const m = new Map(); best.forEach((c, mask) => { if (c < 1e9) m.set(mask, c); });
    return m;
  };
  const hasFP = survs.some(g => g.mv === 'Foul Play');
  const staticTabs = survs.map(g => g.mv === 'Foul Play' ? null : tableFor(g, null));
  const koNeed = kos.map(g => {
    const K = { g, fo: FIELD0, opp: S.oppCfg(g), move: g.mv, crit: false, hits: 0, mb: {}, hh: !!g.hh, thr: +g.thr, w: +g.w, pct: +g.pct }, key = MV[g.mv].category === 'Special' ? 'sa' : 'at';
    for (let a = 0; a <= 32; a++) { const sp = {}; sp[key] = a; if (S.ko(M, sp, n, K).p >= K.thr - 1e-9) return { key, m: a, g }; }
    return { key, m: 99, g };
  });
  /* Speed goals are not monotone together ("outspeed A" needs at least X points, "stay slower than B" at most Y):
     evaluate every Speed value and record which goals it meets */
  const spOk = []; /* spOk[sp] = bitmask of Speed goals met with sp points */
  for (let sp = 0; sp <= 32; sp++) {
    let m = 0;
    spds.forEach((g, i) => {
      A.mkField(FIELD0);
      const r = A.calc(S.mkMe(M, { sp }, n), A.mkPoke({ name: g.sp, ability: g.ab || 'None', item: g.it, nature: g.na, sp: { sp: g.spe }, boosts: {}, status: 'Healthy', moves: [] }));
      if (g.mode === 'under' ? r.mySpeed < r.oppSpeed : r.mySpeed > r.oppSpeed) m |= 1 << i;
    });
    spOk.push(m);
  }
  let best = null;
  const consider = (W, C, tot) => { if (tot <= 66 && (!best || W > best.W || (W === best.W && C > best.C) || (W === best.W && C === best.C && tot < best.tot))) best = { W, C, tot }; };
  const run = (maskCost, aFixed) => maskCost.forEach((cost, mask) => {
    let W0 = 0, C0 = 0; survs.forEach((g, i) => { if (mask >> i & 1) { W0 += +g.w; C0++; } });
    for (let km = 0; km < 1 << kos.length; km++) {
      let at = 0, sa = 0, W1 = W0, C1 = C0, bad = false;
      kos.forEach((g, i) => { if (km >> i & 1) { const x = koNeed[i]; if (x.m > 32) bad = true; if (x.key === 'at') at = Math.max(at, x.m); else sa = Math.max(sa, x.m); W1 += +g.w; C1++; } });
      if (bad) continue;
      if (aFixed !== null) { if (at > aFixed) continue; at = aFixed; } /* Foul Play: Atk is chosen explicitly */
      for (let sp = 0; sp <= 32; sp++) {
        let W = W1, C = C1; spds.forEach((g, i) => { if (spOk[sp] >> i & 1) { W += +g.w; C++; } });
        consider(W, C, cost + at + sa + sp);
      }
    }
  });
  if (!hasFP) run(costMap(staticTabs), null);
  else for (let a = 0; a <= 32; a++) run(costMap(survs.map((g, i) => g.mv === 'Foul Play' ? tableFor(g, a) : staticTabs[i])), a);
  return best;
}

(async () => {
  let ok = 0, bad = 0, infeasible = 0, auto = 0, done = 0;
  const total = NS + NA;
  for (let i = 0; i < total; i++) {
    const isAuto = i >= NS, { M, goals } = scenario(isAuto);
    if (i % SHARDS !== SHARD) continue;
    done++;
    const r = await S.solve(M, goals, {}, () => {});
    let best = null;
    for (const n of (isAuto ? S.NATS : [M.nature])) { const b = bruteNature(M, goals, n); if (b && (!best || b.W > best.W || (b.W === best.W && b.C > best.C) || (b.W === best.W && b.C === best.C && b.tot < best.tot))) best = b; }
    const got = r ? { W: r.top.W, C: r.top.C, tot: r.top.tot } : null;
    const same = got && best && got.W === best.W && got.C === best.C && got.tot === best.tot;
    if (!same && !(got === null && best === null)) {
      bad++; console.log('MISMATCH', M.name, M.nature, goals.map(g => `${g.t}:${g.sp}:${g.mv || g.mode}:w${g.w}`).join(' '), 'brute', JSON.stringify(best), 'solver', JSON.stringify(got));
    } else ok++;
    if (r && !r.goals.every(g => g.ok)) infeasible++;
    if (isAuto) auto++;
  }
  console.log(`optimizer vs exhaustive search: ${done} scenarios (seed ${seed}${SHARDS > 1 ? `, part ${SHARD + 1}/${SHARDS}` : ''}; ${auto} with every nature; ${infeasible} where not all goals can be met): ${ok} identical, ${bad} different`);
  process.exit(bad ? 1 : 0);
})();
