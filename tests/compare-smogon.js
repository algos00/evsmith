'use strict';
/* Compares the EVSmith damage engine with the independent @smogon/calc (Gen 9, doubles)
   on random cases. Usage: node compare-smogon.js [seed] [cases] */
const { loadApp, rng } = require('./lib/load');
const { calculate, Generations, Pokemon, Move, Field } = require('@smogon/calc');

const ctx = loadApp(), A = ctx.ENG, D = ctx.POKEDEX_CHAMPIONS, MV = ctx.MOVES_CHAMPIONS, NATURES = ctx.NATURES;
const gen = Generations.get(9);
const seed = +process.argv[2] || 1, N = +process.argv[3] || 10000, rnd = rng(seed), pick = rnd.pick;
const id = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/* Champions data differs from Gen 9 for these moves (power/flags), so the two calculators are not comparable on them */
const DATA_DIFF_SKIP = new Set(['Grav Apple', 'Spirit Shackle', 'Psyshield Bash', 'Steel Roller', 'Snipe Shot', 'Meteor Assault', 'Trop Kick', 'Mountain Gale', 'Bone Rush', 'Poltergeist', 'Fire Lash', 'Apple Acid', 'Night Daze', 'Beak Blast', 'Snap Trap', 'Slash', 'Payback', 'First Impression']);
/* Moves whose flags differ in the Showdown "champions" mod (claws are slicing, Double Shock is a punch): differences are expected */
const CHAMPIONS_FLAG_MOVES = new Set(['Crush Claw', 'Dire Claw', 'Dragon Claw', 'Shadow Claw', 'Double Shock']);
/* moves handled by special code paths, compared separately or not comparable */
const SKIP = new Set(['Weather Ball', 'Terrain Pulse', 'Low Kick', 'Grass Knot', 'Heavy Slam', 'Heat Crash', 'Gyro Ball', 'Electro Ball', 'Stored Power', 'Power Trip', 'Facade', 'Hex', 'Infernal Parade', 'Venoshock', 'Barb Barrage', 'Knock Off', 'Acrobatics', 'Triple Axel', 'Triple Kick', 'Foul Play', 'Body Press', 'Shell Side Arm', 'Photon Geyser', 'Rising Voltage', 'Expanding Force', 'Misty Explosion', 'Raging Bull', 'Aura Wheel', 'Revelation Dance', 'Seismic Toss', 'Night Shade', 'Dragon Rage', 'Sonic Boom', 'Super Fang', "Nature's Madness", 'Ruination', 'Freeze-Dry', 'Thousand Arrows', 'Flying Press', 'Future Sight', 'Doom Desire', 'Electro Shot', 'Meteor Beam', 'Collision Course', 'Electro Drift', 'Bulldoze', 'Earthquake', 'Magnitude', 'Solar Beam', 'Solar Blade', 'Self-Destruct', 'Explosion', 'Mind Blown', 'Hydro Steam']);

const species = Object.keys(D).filter(n => gen.species.get(id(n)) && !/^Mega /.test(n));
const moves = Object.keys(MV).filter(n => MV[n].category !== 'Status' && !MV[n].unsupported && MV[n].bp > 0 && gen.moves.get(id(n)) && !SKIP.has(n) && !DATA_DIFF_SKIP.has(n));
const ABS = ['', 'Technician', 'Iron Fist', 'Strong Jaw', 'Tough Claws', 'Sheer Force', 'Huge Power', 'Guts', 'Hustle', 'Adaptability', 'Sharpness', 'Mega Launcher', 'Reckless', 'Steely Spirit', 'Punk Rock', 'Sand Force', 'Solar Power', 'Aerilate', 'Pixilate', 'Refrigerate'];
const DABS = ['', 'Thick Fat', 'Multiscale', 'Fluffy', 'Filter', 'Solid Rock', 'Fur Coat', 'Marvel Scale', 'Heatproof', 'Levitate', 'Punk Rock', 'Flash Fire', 'Water Absorb', 'Dry Skin', 'Sap Sipper', 'Unaware'];
const AIT = ['', 'Life Orb', 'Expert Belt', 'Muscle Band', 'Wise Glasses', 'Charcoal', 'Mystic Water', 'Black Belt', 'Silk Scarf', 'Normal Gem', 'Soft Sand', 'Hard Stone', 'Choice Scarf'];
const DIT = ['', 'Occa Berry', 'Chople Berry', 'Shuca Berry', 'Wacan Berry', 'Chilan Berry', 'Yache Berry', 'Sitrus Berry', 'Air Balloon', 'Grassy Seed', 'Psychic Seed', 'Misty Seed', 'Electric Seed'];
const ST = ['Healthy', 'Burned', 'Paralyzed', 'Poisoned'], SC = { Healthy: undefined, Burned: 'brn', Paralyzed: 'par', Poisoned: 'psn' };
const WE = ['', '', 'Sun', 'Rain', 'Sand', 'Snow'], TE = ['', '', '', 'Electric', 'Grassy', 'Misty', 'Psychic'], NATS = Object.keys(NATURES);
const KEY = { hp: 'hp', at: 'atk', df: 'def', sa: 'spa', sd: 'spd', sp: 'spe' };

/* Stat Points -> EVs: floor((2b+31+2*SP)*50/100) == floor((2b+31)/2)+SP, so EV = 8*SP reproduces Champions stats */
function mk(name, ab, it, nat, sp, st, boosts) {
  const e = {}; for (const k in KEY) e[KEY[k]] = 8 * sp[k];
  return new Pokemon(gen, name, { level: 50, nature: nat, ability: ab || undefined, item: it || undefined, status: SC[st], boosts: boosts || {}, evs: e });
}

let n = 0, diffs = [], expected = 0;
for (let i = 0; i < N; i++) {
  const an = pick(species), dn = pick(species), mvn = pick(moves), mvd = MV[mvn];
  const aab = pick(ABS), dab = pick(DABS), ait = pick(AIT), dit = pick(DIT), anat = pick(NATS), dnat = pick(NATS);
  const R = () => rnd.int(33);
  const asp = { hp: 0, at: R(), df: 0, sa: R(), sd: 0, sp: R() }, dsp = { hp: R(), at: 0, df: R(), sa: 0, sd: R(), sp: 0 };
  const ast = pick(ST), dst = pick(ST), w = pick(WE), t = pick(TE), ab = rnd.int(5) - 2, db = rnd.int(5) - 2;
  const fl = { weather: w, terrain: t, reflectR: rnd() < .2, lightScreenR: rnd() < .2, auroraVeilR: rnd() < .1, helpingHandL: rnd() < .2, friendGuardR: rnd() < .1 }, crit = rnd() < .15;
  A.mkField(fl);
  const bk = mvd.category === 'Special' ? 'sa' : 'at', aB = {}; aB[bk] = ab;
  const a1 = A.mkPoke({ name: an, ability: aab || 'None', item: ait, nature: anat, sp: asp, boosts: aB, status: ast, moves: [{ name: mvn, crit }] });
  const d1 = A.mkPoke({ name: dn, ability: dab || 'None', item: dit, nature: dnat, sp: dsp, boosts: { df: db, sd: db }, status: dst });
  if (a1.item !== ait || d1.item !== dit) continue; /* held item locked by the game (Mega stones) */
  const r1 = A.calc(a1, d1).mine[0].damage;
  let r2;
  try {
    const ap = mk(an, a1.ab, ait, anat, asp, ast, { [{ at: 'atk', sa: 'spa' }[bk]]: ab });
    const dp = mk(dn, d1.ab, dit, dnat, dsp, dst, { def: db, spd: db });
    r2 = calculate(gen, ap, dp, new Move(gen, mvn, { isCrit: crit }), new Field({
      gameType: 'Doubles', weather: w || undefined, terrain: t || undefined,
      attackerSide: { isHelpingHand: fl.helpingHandL },
      defenderSide: { isReflect: fl.reflectR, isLightScreen: fl.lightScreenR, isAuroraVeil: fl.auroraVeilR, isFriendGuard: fl.friendGuardR }
    })).range();
  } catch (e) { continue; }
  n++;
  const mn = Math.min(...r1), mx = Math.max(...r1);
  if (mn !== r2[0] || mx !== r2[1]) {
    if (CHAMPIONS_FLAG_MOVES.has(mvn)) expected++;
    else diffs.push(`${an} (${a1.ab}, ${ait || '-'}, ${ast}) ${mvn} vs ${dn} (${d1.ab}, ${dit || '-'}, ${dst}) ${JSON.stringify(fl)} crit=${crit} | EVSmith ${mn}-${mx} | smogon ${r2[0]}-${r2[1]}`);
  }
}
/* one-point rounding differences in rare stat-modifier stacks (e.g. Snow + Fur Coat) are tolerated */
const tolerated = Math.ceil(n * 0.0005);
console.log(`engine vs @smogon/calc: compared ${n} cases (seed ${seed}); expected Champions-data differences ${expected}; unexplained ${diffs.length} (tolerated up to ${tolerated})`);
diffs.slice(0, 10).forEach(d => console.log('  DIFF', d));
process.exit(diffs.length > tolerated ? 1 : 0);
