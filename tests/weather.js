'use strict';
/* Weather and abilities, one by one, against @smogon/calc (Gen 9, doubles). Zero differences are tolerated except the ones named below.
   1. Every weather (none, Sun, Rain, Sand, Snow) on moves of every type and on Rock / Ice / other defenders (offence AND defence boosts).
   2. Cloud Nine / Air Lock, weather set by abilities ("auto"), Weather Ball, Solar Beam, Sand Force, Solar Power, Mega Sol (by hand),
      the speed abilities (Swift Swim, Chlorophyll, Sand Rush, Slush Rush).
   3. Every damage ability the engine knows, as attacker and as defender, on random moves, and a check that each one really changes damage.
   Usage: node weather.js [seed] [cases per ability] */
const assert = require('assert');
const { loadApp, rng } = require('./lib/load');
const { calculate, Generations, Pokemon, Move, Field } = require('@smogon/calc');
const ctx = loadApp(), A = ctx.ENG, D = ctx.POKEDEX_CHAMPIONS, MV = ctx.MOVES_CHAMPIONS, gen = Generations.get(9);
const seed = +process.argv[2] || 1, PER = +process.argv[3] || 300, rnd = rng(seed), pick = rnd.pick;
const id = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const KEY = { hp: 'hp', at: 'atk', df: 'def', sa: 'spa', sd: 'spd', sp: 'spe' };
const DATA_DIFF_SKIP = new Set(['Grav Apple', 'Spirit Shackle', 'Psyshield Bash', 'Steel Roller', 'Snipe Shot', 'Meteor Assault', 'Trop Kick', 'Mountain Gale', 'Bone Rush', 'Poltergeist', 'Fire Lash', 'Apple Acid', 'Night Daze', 'Beak Blast', 'Snap Trap', 'Slash', 'Payback', 'First Impression']);
const SKIP = new Set(['Weather Ball', 'Terrain Pulse', 'Low Kick', 'Grass Knot', 'Heavy Slam', 'Heat Crash', 'Gyro Ball', 'Electro Ball', 'Stored Power', 'Power Trip', 'Facade', 'Hex', 'Infernal Parade', 'Venoshock', 'Barb Barrage', 'Knock Off', 'Acrobatics', 'Triple Axel', 'Triple Kick', 'Foul Play', 'Body Press', 'Shell Side Arm', 'Photon Geyser', 'Rising Voltage', 'Expanding Force', 'Misty Explosion', 'Raging Bull', 'Aura Wheel', 'Revelation Dance', 'Seismic Toss', 'Night Shade', 'Dragon Rage', 'Sonic Boom', 'Super Fang', "Nature's Madness", 'Ruination', 'Freeze-Dry', 'Thousand Arrows', 'Flying Press', 'Future Sight', 'Doom Desire', 'Electro Shot', 'Meteor Beam', 'Collision Course', 'Electro Drift', 'Bulldoze', 'Earthquake', 'Magnitude', 'Solar Beam', 'Solar Blade', 'Self-Destruct', 'Explosion', 'Mind Blown', 'Hydro Steam']);
const CHAMPIONS_FLAG_MOVES = new Set(['Crush Claw', 'Dire Claw', 'Dragon Claw', 'Shadow Claw', 'Double Shock']);
const BAD = new Set([...DATA_DIFF_SKIP, ...CHAMPIONS_FLAG_MOVES]);
const SKIPRE = /^(Solar Beam|Solar Blade|Hydro Steam|Eruption|Water Spout|Dragon Energy|Magnitude|Triple Axel|Triple Kick|Terrain Pulse|Weather Ball|Raging Bull|Aura Wheel)$/;
const species = Object.keys(D).filter(n => gen.species.get(id(n)) && !/^Mega /.test(n));
const moves = Object.keys(MV).filter(n => MV[n].category !== 'Status' && !MV[n].unsupported && MV[n].bp > 0 && gen.moves.get(id(n)) && !BAD.has(n) && !SKIP.has(n) && !SKIPRE.test(n) && !MV[n].hitRange);
const byType = {}; moves.forEach(m => { const k = MV[m].type + '/' + MV[m].category; (byType[k] = byType[k] || []).push(m); });
const mk = (name, ab, sp, extra) => {
  const e = {}; for (const k in KEY) e[KEY[k]] = 8 * (sp[k] || 0);
  return new Pokemon(gen, name, Object.assign({ level: 50, nature: 'Hardy', ability: ab || undefined, evs: e }, extra || {}));
};
const SC = { Healthy: undefined, Burned: 'brn', Poisoned: 'psn', Paralyzed: 'par' };
const SP_A = { hp: 0, at: 32, df: 0, sa: 32, sd: 0, sp: 0 }, SP_D = { hp: 20, at: 0, df: 12, sa: 0, sd: 12, sp: 0 };
const bk = b => { const m = { at: 'atk', df: 'def', sa: 'spa', sd: 'spd', sp: 'spe' }, r = {}; for (const k in (b || {})) r[m[k]] = b[k]; return r; };
let total = 0; const diffs = [];
/* one comparison; returns the EVSmith range [min, max] or null when @smogon/calc cannot take the case */
function cmp(tag, o) {
  const f = { weather: o.w || '', terrain: o.t || '' };
  A.mkField(f);
  const mv = { name: o.mv, crit: !!o.crit, hits: o.hits || 0 };
  const a = A.mkPoke({ name: o.an, ability: o.aab || 'None', item: '', nature: 'Hardy', sp: o.asp || SP_A, boosts: o.aboo || {}, status: o.ast || 'Healthy', abOn: !!o.abOn, moves: [mv] });
  const d = A.mkPoke({ name: o.dn, ability: o.dab || 'None', item: '', nature: 'Hardy', sp: o.dsp || SP_D, boosts: o.dboo || {}, status: o.dst || 'Healthy' });
  const mine = A.calc(a, d).mine[0].damage, mn = Math.min(...mine), mx = Math.max(...mine);
  let r2;
  try {
    const ap = mk(o.an, a.ab, o.asp || SP_A, { status: SC[o.ast || 'Healthy'], abilityOn: !!o.abOn, boosts: bk(o.aboo) });
    const dp = mk(o.dn, d.ab, o.dsp || SP_D, { status: SC[o.dst || 'Healthy'], boosts: bk(o.dboo) });
    r2 = calculate(gen, ap, dp, new Move(gen, o.mv, Object.assign({ isCrit: !!o.crit }, o.hits ? { hits: o.hits } : {})), new Field({ gameType: 'Doubles', weather: o.w || undefined, terrain: o.t || undefined })).range();
  } catch (e) { return null; }
  total++;
  if (mn !== r2[0] || mx !== r2[1]) diffs.push(`[${tag}] ${o.an} (${a.ab}) ${o.mv} vs ${o.dn} (${d.ab}) weather=${o.w || '-'} | EVSmith ${mn}-${mx} | smogon ${r2[0]}-${r2[1]}`);
  return [mn, mx];
}
const typed = (d, t) => d.t1 === t || d.t2 === t;
const withType = t => species.filter(n => typed(D[n], t));
const without = ts => species.filter(n => ts.every(t => !typed(D[n], t)));

/* ---- 1. weather x move type x defender type ---- */
const W = ['', 'Sun', 'Rain', 'Sand', 'Snow'];
const TYPES = ['Fire', 'Water', 'Grass', 'Ice', 'Rock', 'Ground', 'Steel', 'Normal', 'Electric'];
const defenders = { rock: withType('Rock').slice(0, 4), ice: withType('Ice').slice(0, 4), rockIce: species.filter(n => typed(D[n], 'Rock') && typed(D[n], 'Ice')).slice(0, 2), plain: without(['Rock', 'Ice', 'Fire', 'Water']).slice(0, 4) };
assert(defenders.rock.length && defenders.ice.length && defenders.plain.length, 'need Rock, Ice and plain defenders');
const attackers = species.filter(n => D[n].bs.at > 90 && D[n].bs.sa > 90).slice(0, 2).concat(species.slice(0, 1));
let weatherChanged = 0;
for (const t of TYPES) for (const cat of ['Physical', 'Special']) {
  const pool = (byType[t + '/' + cat] || []).slice(0, 5); if (!pool.length) continue;
  for (const mvn of pool) for (const dn of [].concat(...Object.values(defenders))) for (const an of attackers) {
    const none = cmp('weather ' + t, { an, mv: mvn, dn, w: '' });
    for (const w of W.slice(1)) {
      const r = cmp('weather ' + t, { an, mv: mvn, dn, w });
      if (r && none && (r[0] !== none[0] || r[1] !== none[1])) weatherChanged++;
    }
  }
}
assert(weatherChanged > 200, 'the weather matrix must exercise real changes (only ' + weatherChanged + ')');
/* explicit expectations, independent of @smogon/calc: Sun/Rain x1.5 and x0.5, Sand SpD x1.5 for Rock only, Snow Def x1.5 for Ice only */
const ratio = (mvn, dn, w, o) => { const a = cmp('ratio', Object.assign({ an: attackers[0], mv: mvn, dn, w: '' }, o)), b = cmp('ratio', Object.assign({ an: attackers[0], mv: mvn, dn, w }, o)); return b[1] / a[1]; };
const near = (x, y, tol) => Math.abs(x - y) <= (tol || 0.05);
const plain = defenders.plain[0], fireSp = byType['Fire/Special'][0], fireAt = byType['Fire/Physical'][0], watSp = byType['Water/Special'][0], norSp = byType['Normal/Special'][0], norAt = byType['Normal/Physical'][0];
assert(near(ratio(fireSp, plain, 'Sun'), 1.5) && near(ratio(fireAt, plain, 'Sun'), 1.5), 'Sun boosts Fire x1.5');
assert(near(ratio(watSp, plain, 'Sun'), 0.5), 'Sun halves Water');
assert(near(ratio(watSp, plain, 'Rain'), 1.5) && near(ratio(fireSp, plain, 'Rain'), 0.5), 'Rain boosts Water x1.5 and halves Fire');
assert(near(ratio(norSp, plain, 'Sun'), 1) && near(ratio(norAt, plain, 'Rain'), 1), 'Sun/Rain leave Normal moves alone');
const rock = defenders.rock.find(n => !typed(D[n], 'Ice')) || defenders.rock[0], ice = defenders.ice.find(n => !typed(D[n], 'Rock')) || defenders.ice[0];
assert(near(ratio(norSp, rock, 'Sand'), 2 / 3, 0.04), 'Sand: Rock-type SpD x1.5 (special damage x2/3)');
assert(near(ratio(norAt, rock, 'Sand'), 1), 'Sand does not raise a Rock-type\'s Def');
assert(near(ratio(norSp, plain, 'Sand'), 1) && near(ratio(norAt, plain, 'Sand'), 1), 'Sand does not help non-Rock types');
assert(near(ratio(norAt, ice, 'Snow'), 2 / 3, 0.04), 'Snow: Ice-type Def x1.5 (physical damage x2/3)');
assert(near(ratio(norSp, ice, 'Snow'), 1), 'Snow does not raise an Ice-type\'s SpD');
assert(near(ratio(norSp, plain, 'Snow'), 1) && near(ratio(norAt, plain, 'Snow'), 1), 'Snow does not help non-Ice types');
assert(near(ratio(norSp, ice, 'Sand'), 1) && near(ratio(norAt, rock, 'Snow'), 1), 'Sand does not help Ice, Snow does not help Rock');
console.log(`weather matrix: ${TYPES.length} types x ${W.length} weathers, offence and defence, ${weatherChanged} cases where weather changes damage; explicit x1.5 / x0.5 / Rock-in-Sand / Ice-in-Snow checks pass`);

/* ---- 2. Cloud Nine / Air Lock, weather set by abilities, special moves, speed ---- */
const SETTER = { Drought: 'Sun', Drizzle: 'Rain', 'Sand Stream': 'Sand', 'Snow Warning': 'Snow' };
let cnN = 0;
for (const [ab, w] of Object.entries(SETTER)) {
  const mvn = byType[{ Sun: 'Fire', Rain: 'Water', Sand: 'Rock', Snow: 'Ice' }[w] + '/Special'][0];
  for (const side of ['attacker', 'defender']) {
    A.mkField({ weather: 'auto', terrain: '' });
    const mkA = abil => A.mkPoke({ name: attackers[0], ability: side === 'attacker' ? abil : 'None', item: '', nature: 'Hardy', sp: SP_A, moves: [{ name: mvn }] });
    const mkD = abil => A.mkPoke({ name: plain, ability: side === 'defender' ? abil : 'None', item: '', nature: 'Hardy', sp: SP_D });
    const auto = A.calc(mkA(ab), mkD(ab)).mine[0].damage;
    const ref = cmp('auto ' + ab, { an: attackers[0], mv: mvn, dn: plain, w, aab: side === 'attacker' ? ab : '', dab: side === 'defender' ? ab : '' });
    assert.strictEqual(Math.max(...auto), ref[1], `${ab} on the ${side}'s side must set ${w}`);
    /* Cloud Nine / Air Lock on the other Pokémon cancels it */
    for (const cn of ['Cloud Nine', 'Air Lock']) {
      const a2 = A.mkPoke({ name: attackers[0], ability: side === 'attacker' ? ab : cn, item: '', nature: 'Hardy', sp: SP_A, moves: [{ name: mvn }] });
      const d2 = A.mkPoke({ name: plain, ability: side === 'attacker' ? cn : ab, item: '', nature: 'Hardy', sp: SP_D });
      A.mkField({ weather: 'auto', terrain: '' });
      const x = A.calc(a2, d2).mine[0].damage, base = cmp('cn base', { an: attackers[0], mv: mvn, dn: plain, w: '' });
      assert.strictEqual(Math.max(...x), base[1], `${cn} must cancel ${ab}`); cnN++;
    }
  }
}
/* Cloud Nine also cancels a weather chosen by hand */
{
  const mvn = byType['Fire/Special'][0];
  A.mkField({ weather: 'Sun', terrain: '' });
  const a = A.mkPoke({ name: attackers[0], ability: 'None', item: '', nature: 'Hardy', sp: SP_A, moves: [{ name: mvn }] }), d = A.mkPoke({ name: plain, ability: 'Cloud Nine', item: '', nature: 'Hardy', sp: SP_D });
  const base = cmp('cn hand', { an: attackers[0], mv: mvn, dn: plain, w: '' });
  assert.strictEqual(Math.max(...A.calc(a, d).mine[0].damage), base[1], 'Cloud Nine cancels Sun chosen by hand'); cnN++;
}
/* Weather Ball: type and power change with the weather (compared by hand with the Gen 9 rules: 50 -> 100, type of the weather) */
{
  const wb = (w, ab) => { A.mkField({ weather: w, terrain: '' }); const a = A.mkPoke({ name: attackers[0], ability: ab || 'None', item: '', nature: 'Hardy', sp: SP_A, moves: [{ name: 'Weather Ball' }] }), d = A.mkPoke({ name: plain, ability: 'None', item: '', nature: 'Hardy', sp: SP_D });
    return Math.max(...A.calc(a, d).mine[0].damage); };
  for (const w of W.slice(1)) {
    const t = { Sun: 'Fire', Rain: 'Water', Sand: 'Rock', Snow: 'Ice' }[w];
    const ref = cmp('weather ball', { an: attackers[0], mv: 'Weather Ball', dn: plain, w });
    if (ref) assert.strictEqual(wb(w), ref[1], 'Weather Ball in ' + w);
  }
  assert(wb('Sun') > wb('') * 1.5, 'Weather Ball doubles in power with weather'); cnN++;
}
/* Solar Beam: halved in Rain / Sand / Snow, full in Sun and with no weather */
{
  const sb = (w, an) => { A.mkField({ weather: w, terrain: '' }); const a = A.mkPoke({ name: an || attackers[0], ability: 'None', item: '', nature: 'Hardy', sp: SP_A, moves: [{ name: 'Solar Beam' }] }), d = A.mkPoke({ name: plain, ability: 'None', item: '', nature: 'Hardy', sp: SP_D });
    return Math.max(...A.calc(a, d).mine[0].damage); };
  const full = sb(''), sun = sb('Sun');
  for (const w of ['Rain', 'Sand', 'Snow']) assert(near(sb(w) / full, 0.5, 0.04), 'Solar Beam is halved in ' + w);
  assert(near(sun / full, 1, 0.01), 'Solar Beam is not boosted by Sun (it is Grass) and not halved');
}
console.log(`weather by ability / Cloud Nine / Air Lock / Weather Ball / Solar Beam: ${cnN} checks`);

/* ---- weather abilities that change damage ---- */
{
  /* Sand Force (x1.3 for Rock/Ground/Steel in Sand) and Solar Power (x1.5 special in Sun) vs @smogon/calc, and not outside their weather */
  let n = 0;
  for (const [ab, w, cat, types] of [['Sand Force', 'Sand', null, ['Rock', 'Ground', 'Steel', 'Normal', 'Fire']], ['Solar Power', 'Sun', 'Special', ['Fire', 'Normal', 'Grass']]]) {
    for (const t of types) for (const c of (cat ? [cat] : ['Physical', 'Special'])) for (const mvn of (byType[t + '/' + c] || []).slice(0, 4)) for (const ww of ['', w, 'Rain']) {
      const r = cmp(ab, { an: attackers[0], mv: mvn, dn: plain, w: ww, aab: ab }); if (r) n++;
    }
  }
  const sf = (ab, w) => Math.max(...(cmp('sf', { an: attackers[0], mv: byType['Ground/Physical'][0], dn: plain, w, aab: ab })));
  assert(near(sf('Sand Force', 'Sand') / sf('', 'Sand'), 1.3, 0.04) && near(sf('Sand Force', '') / sf('', ''), 1, 0.001), 'Sand Force only works in Sand');
  const sp = (ab, w) => Math.max(...(cmp('sp', { an: attackers[0], mv: byType['Normal/Special'][0], dn: plain, w, aab: ab })));
  assert(near(sp('Solar Power', 'Sun') / sp('', 'Sun'), 1.5, 0.04) && near(sp('Solar Power', 'Rain') / sp('', 'Rain'), 1, 0.001), 'Solar Power only works in Sun');
  const sa = (ab, w) => Math.max(...(cmp('sa', { an: attackers[0], mv: byType['Normal/Physical'][0], dn: plain, w, aab: ab })));
  assert(near(sa('Solar Power', 'Sun') / sa('', 'Sun'), 1, 0.001), 'Solar Power does not boost physical moves');
  console.log(`Sand Force / Solar Power: ${n} cases vs @smogon/calc, and only in their weather`);
}
{
  /* Mega Sol is not in @smogon/calc: compared with the same attack under a real Sun (its moves act as if the Sun shone) */
  let n = 0;
  for (const t of ['Fire', 'Water', 'Normal', 'Grass']) for (const c of ['Physical', 'Special']) for (const mvn of (byType[t + '/' + c] || []).slice(0, 4)) for (const w of ['', 'Rain', 'Sand', 'Snow']) {
    A.mkField({ weather: w, terrain: '' });
    const a = A.mkPoke({ name: attackers[0], ability: 'Mega Sol', item: '', nature: 'Hardy', sp: SP_A, moves: [{ name: mvn }] }), d = A.mkPoke({ name: plain, ability: 'None', item: '', nature: 'Hardy', sp: SP_D });
    const got = A.calc(a, d).mine[0].damage.join();
    A.mkField({ weather: 'Sun', terrain: '' });
    const a2 = A.mkPoke({ name: attackers[0], ability: 'None', item: '', nature: 'Hardy', sp: SP_A, moves: [{ name: mvn }] }), d2 = A.mkPoke({ name: plain, ability: 'None', item: '', nature: 'Hardy', sp: SP_D });
    /* Sun + Mega Sol vs plain: the defender's own Sand/Snow bonus does not apply in Sun, and 'plain' has no such bonus anyway */
    assert.strictEqual(got, A.calc(a2, d2).mine[0].damage.join(), `Mega Sol ${mvn} under ${w || 'no weather'} must equal a Sun attack`); n++;
  }
  console.log(`Mega Sol: ${n} cases equal to the same attack under Sun`);
}
{
  /* speed abilities double Speed only in their own weather (and not under Cloud Nine) */
  const spd = (ab, w, other) => { A.mkField({ weather: w, terrain: '' }); const a = A.mkPoke({ name: attackers[0], ability: ab, item: '', nature: 'Hardy', sp: { sp: 10 }, moves: [] }), d = A.mkPoke({ name: plain, ability: other || 'None', item: '', nature: 'Hardy', sp: {} }); return A.calc(a, d).mySpeed; };
  const SPDAB = [['Swift Swim', 'Rain'], ['Chlorophyll', 'Sun'], ['Sand Rush', 'Sand'], ['Slush Rush', 'Snow']];
  for (const [ab, w] of SPDAB) {
    const base = spd('None', w);
    assert.strictEqual(spd(ab, w), base * 2, `${ab} doubles Speed in ${w}`);
    for (const w2 of W.filter(x => x !== w)) assert.strictEqual(spd(ab, w2), spd('None', w2), `${ab} does nothing in ${w2 || 'no weather'}`);
    assert.strictEqual(spd(ab, w, 'Cloud Nine'), spd('None', w, 'Cloud Nine'), `${ab} does nothing under Cloud Nine`);
  }
  console.log('Swift Swim / Chlorophyll / Sand Rush / Slush Rush: x2 only in their weather');
}
{
  /* Forecast: Castform changes type with the weather (defensive effect), compared with @smogon/calc's Castform forms */
  let n = 0; const FORM = { Sun: 'Castform-Sunny', Rain: 'Castform-Rainy', Snow: 'Castform-Snowy' };
  if (D['Castform'] && gen.species.get('castformsunny')) for (const w of Object.keys(FORM)) for (const t of ['Fire', 'Water', 'Grass', 'Ice', 'Ground']) for (const c of ['Physical', 'Special']) for (const mvn of (byType[t + '/' + c] || []).slice(0, 3)) {
    A.mkField({ weather: w, terrain: '' });
    const a = A.mkPoke({ name: attackers[0], ability: 'None', item: '', nature: 'Hardy', sp: SP_A, moves: [{ name: mvn }] }), d = A.mkPoke({ name: 'Castform', ability: 'Forecast', item: '', nature: 'Hardy', sp: SP_D });
    const got = A.calc(a, d).mine[0].damage; let r2;
    try { r2 = calculate(gen, mk(attackers[0], '', SP_A), mk(FORM[w], 'Forecast', SP_D), new Move(gen, mvn), new Field({ gameType: 'Doubles', weather: w })).range(); } catch (e) { continue; }
    n++; total++;
    if (Math.min(...got) !== r2[0] || Math.max(...got) !== r2[1]) diffs.push(`[forecast ${w}] ${mvn} | EVSmith ${Math.min(...got)}-${Math.max(...got)} | smogon ${r2[0]}-${r2[1]}`);
  }
  console.log(`Forecast: ${n} cases vs @smogon/calc's Castform forms`);
}

/* ---- 3. every damage ability, as attacker and as defender ---- */
const OFF = ['Technician', 'Iron Fist', 'Strong Jaw', 'Tough Claws', 'Sheer Force', 'Huge Power', 'Pure Power', 'Guts', 'Hustle', 'Adaptability', 'Sharpness', 'Mega Launcher', 'Reckless', 'Steely Spirit', 'Punk Rock', 'Sniper', 'Water Bubble', 'Scrappy', 'Skill Link', 'Parental Bond', 'Mold Breaker', 'Liquid Voice', 'Protean', 'Libero', 'Fairy Aura', 'Infiltrator'];
const DEF = ['Thick Fat', 'Multiscale', 'Fluffy', 'Filter', 'Solid Rock', 'Fur Coat', 'Marvel Scale', 'Heatproof', 'Levitate', 'Flash Fire', 'Water Absorb', 'Dry Skin', 'Sap Sipper', 'Volt Absorb', 'Lightning Rod', 'Motor Drive', 'Earth Eater', 'Purifying Salt', 'Bulletproof', 'Soundproof', 'Battle Armor', 'Shell Armor', 'Unaware', 'Punk Rock', 'Water Bubble', 'Wonder Guard', 'Ice Scales', 'Storm Drain', 'Well-Baked Body', 'Fairy Aura'];
const CHAMP_AB = new Set(ctx.ABILITIES_CHAMPIONS), known = ab => ab && CHAMP_AB.has(ab) && gen.abilities.get(id(ab));
const rep = {}, mustChange = new Set(['Technician', 'Iron Fist', 'Strong Jaw', 'Tough Claws', 'Sheer Force', 'Huge Power', 'Pure Power', 'Guts', 'Hustle', 'Adaptability', 'Sharpness', 'Mega Launcher', 'Reckless', 'Steely Spirit', 'Punk Rock', 'Sniper', 'Water Bubble', 'Skill Link', 'Parental Bond', 'Thick Fat', 'Multiscale', 'Fluffy', 'Filter', 'Solid Rock', 'Fur Coat', 'Marvel Scale', 'Heatproof', 'Levitate', 'Flash Fire', 'Water Absorb', 'Dry Skin', 'Sap Sipper', 'Volt Absorb', 'Lightning Rod', 'Motor Drive', 'Earth Eater', 'Purifying Salt', 'Bulletproof', 'Soundproof', 'Battle Armor', 'Shell Armor', 'Unaware', 'Wonder Guard', 'Ice Scales', 'Storm Drain', 'Well-Baked Body']);
for (const role of ['attacker', 'defender']) for (const ab of (role === 'attacker' ? OFF : DEF)) {
  if (!known(ab)) continue;
  let n = 0, changed = 0;
  const key = role + ':' + ab;
  const status = pick(['Burned', 'Poisoned']);
  for (let i = 0; i < PER; i++) {
    const w = pick(['', '', 'Sun', 'Rain', 'Sand', 'Snow']);
    const o = { an: pick(species), dn: pick(species), mv: pick(moves), w, crit: rnd() < .2, asp: { hp: 0, at: rnd.int(33), df: 0, sa: rnd.int(33), sd: 0, sp: 0 }, dsp: { hp: rnd.int(33), at: 0, df: rnd.int(33), sa: 0, sd: rnd.int(33), sp: 0 } };
    if (role === 'attacker') { o.aab = ab; o.dab = 'Pressure'; if (ab === 'Guts') o.ast = status; }
    else { o.dab = ab; o.aab = 'Pressure'; if (ab === 'Marvel Scale') o.dst = status; }
    if (ab === 'Parental Bond' && new Move(gen, o.mv).dropsStats) continue; /* smogon lowers the user's stat between the two hits (Overheat, Leaf Storm...): not modelled in EVSmith */
    if (ab === 'Unaware') { if (role === 'defender') o.aboo = { at: 2, sa: 2 }; else o.dboo = { df: 2, sd: 2 }; }
    const base = Object.assign({}, o, role === 'attacker' ? { aab: 'Pressure' } : { dab: 'Pressure' });
    const r = cmp(key, o), r0 = cmp(key + ' (base)', Object.assign(base, { ast: base.ast, dst: base.dst }));
    if (r && r0) { n++; if (r[0] !== r0[0] || r[1] !== r0[1]) changed++; }
  }
  rep[key] = { n, changed };
  if (mustChange.has(ab) && ab !== 'Skill Link' && changed === 0) diffs.push(`[${key}] never changed damage in ${n} cases: the ability is not doing anything`);
}
/* Skill Link: multi-hit moves always hit the maximum number of times; plain multi-hit moves with an explicit number of hits */
{
  const multi = Object.keys(MV).filter(n => MV[n].hitRange && MV[n].hitRange.length === 2 && MV[n].category !== 'Status' && gen.moves.get(id(n)) && !BAD.has(n) && !SKIP.has(n) && !SKIPRE.test(n) && !new Move(gen, n).dropsStats);
  let n = 0, changed = 0;
  for (const mvn of multi) for (let i = 0; i < 6; i++) {
    const o = { an: pick(species), dn: pick(species), mv: mvn, asp: { hp: 0, at: rnd.int(33), df: 0, sa: rnd.int(33), sd: 0, sp: 0 } };
    const hi = MV[mvn].hitRange[1], lo = MV[mvn].hitRange[0];
    const withSL = cmp('skill link', Object.assign({}, o, { aab: 'Skill Link', dab: 'Pressure', hits: hi })), noSL = cmp('skill link base', Object.assign({}, o, { aab: 'Pressure', dab: 'Pressure', hits: lo }));
    /* EVSmith with Skill Link and no number of hits chosen must give the maximum-hits result */
    A.mkField({});
    const a = A.mkPoke({ name: o.an, ability: 'Skill Link', item: '', nature: 'Hardy', sp: o.asp, moves: [{ name: mvn }] }), d = A.mkPoke({ name: o.dn, ability: 'Pressure', item: '', nature: 'Hardy', sp: SP_D });
    const got = A.calc(a, d).mine[0].damage;
    if (withSL) { n++; if (Math.max(...got) !== withSL[1] || Math.min(...got) !== withSL[0]) diffs.push(`[Skill Link] ${o.an} ${mvn} | auto-max-hits EVSmith ${Math.min(...got)}-${Math.max(...got)} | smogon ${withSL[0]}-${withSL[1]}`); if (noSL && noSL[1] !== withSL[1]) changed++; }
  }
  console.log(`Skill Link and multi-hit moves: ${n} cases vs @smogon/calc, hits change damage in ${changed}`);
  if (!changed) diffs.push('[Skill Link] hits never changed damage');
}
const totChanged = Object.values(rep).reduce((t, x) => t + x.changed, 0);
console.log(`abilities: ${Object.keys(rep).length} ability/role pairs, ${PER} random cases each, ${totChanged} cases where the ability changes damage`);

if (diffs.length) diffs.slice(0, +process.env.SHOW || 20).forEach(d => console.log('  DIFF', d));
console.log(`weather and abilities vs @smogon/calc: compared ${total} cases (seed ${seed}); differences ${diffs.length}`);
process.exit(diffs.length ? 1 : 0);
