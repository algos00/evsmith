'use strict';
/* Situational abilities (switched on by hand in the app) vs @smogon/calc: Blaze/Torrent/Overgrow/Swarm at 1/3 HP,
   Flash Fire, Stakeout, Electromorphosis, Supreme Overlord (1-5 fainted allies) and Merciless. Usage: node situational.js [seed] [cases] */
const { loadApp, rng } = require('./lib/load');
const { calculate, Generations, Pokemon, Move, Field } = require('@smogon/calc');
const ctx = loadApp(), A = ctx.ENG, D = ctx.POKEDEX_CHAMPIONS, MV = ctx.MOVES_CHAMPIONS, gen = Generations.get(9);
const seed = +process.argv[2] || 1, N = +process.argv[3] || 6000, rnd = rng(seed), pick = rnd.pick;
const id = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const KEY = { hp: 'hp', at: 'atk', df: 'def', sa: 'spa', sd: 'spd', sp: 'spe' };
const TYPE_OF = { Blaze: 'Fire', 'Flash Fire': 'Fire', Torrent: 'Water', Overgrow: 'Grass', Swarm: 'Bug', Electromorphosis: 'Electric' };
const ABS = ['Blaze', 'Torrent', 'Overgrow', 'Swarm', 'Flash Fire', 'Stakeout', 'Electromorphosis', 'Supreme Overlord', 'Merciless'];
const BAD = new Set(['Grav Apple', 'Spirit Shackle', 'Psyshield Bash', 'Steel Roller', 'Snipe Shot', 'Meteor Assault', 'Trop Kick', 'Mountain Gale', 'Bone Rush', 'Poltergeist', 'Fire Lash', 'Apple Acid', 'Night Daze', 'Beak Blast', 'Snap Trap', 'Slash', 'Payback', 'First Impression', 'Crush Claw', 'Dire Claw', 'Dragon Claw', 'Shadow Claw', 'Double Shock']);
const SKIP = /^(Weather Ball|Terrain Pulse|Low Kick|Grass Knot|Heavy Slam|Heat Crash|Gyro Ball|Electro Ball|Stored Power|Power Trip|Facade|Hex|Infernal Parade|Venoshock|Barb Barrage|Knock Off|Acrobatics|Triple Axel|Triple Kick|Foul Play|Body Press|Shell Side Arm|Photon Geyser|Rising Voltage|Expanding Force|Misty Explosion|Raging Bull|Aura Wheel|Revelation Dance|Seismic Toss|Night Shade|Dragon Rage|Sonic Boom|Super Fang|Nature's Madness|Ruination|Freeze-Dry|Thousand Arrows|Flying Press|Future Sight|Doom Desire|Electro Shot|Meteor Beam|Collision Course|Electro Drift|Bulldoze|Earthquake|Magnitude|Solar Beam|Solar Blade|Self-Destruct|Explosion|Mind Blown|Hydro Steam)$/;
const species = Object.keys(D).filter(n => gen.species.get(id(n)) && !/^Mega /.test(n));
const moves = Object.keys(MV).filter(n => MV[n].category !== 'Status' && !MV[n].unsupported && MV[n].bp > 0 && gen.moves.get(id(n)) && !BAD.has(n) && !SKIP.test(n) && !MV[n].hitRange);
const byType = {}; moves.forEach(m => (byType[MV[m].type] = byType[MV[m].type] || []).push(m));
const mk = (name, ab, sp, extra) => {
  const e = {}; for (const k in KEY) e[KEY[k]] = 8 * sp[k];
  return new Pokemon(gen, name, Object.assign({ level: 50, nature: 'Hardy', ability: ab || undefined, evs: e }, extra || {}));
};
let n = 0; const diffs = [], seen = {};
for (let i = 0; i < N; i++) {
  const ab = pick(ABS), an = pick(species), dn = pick(species);
  const mvn = TYPE_OF[ab] && rnd() < .7 ? pick(byType[TYPE_OF[ab]]) : pick(moves);
  const on = ab === 'Supreme Overlord' ? false : rnd() < .6, fa = ab === 'Supreme Overlord' ? 1 + rnd.int(5) : 0;
  const psn = ab === 'Merciless' ? rnd() < .7 : rnd() < .1, st = psn ? 'Poisoned' : 'Healthy';
  const asp = { hp: rnd.int(33), at: rnd.int(33), df: 0, sa: rnd.int(33), sd: 0, sp: 0 }, dsp = { hp: rnd.int(33), at: 0, df: rnd.int(33), sa: 0, sd: rnd.int(33), sp: 0 };
  A.mkField({});
  const a1 = A.mkPoke({ name: an, ability: ab, item: '', nature: 'Hardy', sp: asp, status: 'Healthy', abOn: on, fainted: fa, moves: [{ name: mvn }] });
  const d1 = A.mkPoke({ name: dn, ability: 'None', item: '', nature: 'Hardy', sp: dsp, status: st });
  const mine = A.calc(a1, d1).mine[0].damage;
  let r2;
  try {
    const ap = mk(an, ab, asp, { abilityOn: on, alliesFainted: fa });
    if (on && TYPE_OF[ab] && ab !== 'Flash Fire' && ab !== 'Electromorphosis') ap.originalCurHP = Math.floor(ap.maxHP() / 3);
    const dp = mk(dn, 'Pressure', dsp, { status: psn ? 'psn' : undefined });
    r2 = calculate(gen, ap, dp, new Move(gen, mvn), new Field({ gameType: 'Doubles' })).range();
  } catch (e) { continue; }
  n++;
  const mn = Math.min(...mine), mx = Math.max(...mine);
  if (mn !== r2[0] || mx !== r2[1]) { seen[ab] = (seen[ab] || 0) + 1; diffs.push(`${an} (${ab}, on=${on}, fainted=${fa}) ${mvn} vs ${dn} (${st}) | EVSmith ${mn}-${mx} | smogon ${r2[0]}-${r2[1]}`); }
}
const tolerated = Math.ceil(n * 0.0005);
console.log(`situational abilities vs @smogon/calc: compared ${n} cases (seed ${seed}); differences ${diffs.length} (tolerated up to ${tolerated})${diffs.length ? ' ' + JSON.stringify(seen) : ''}`);
diffs.slice(0, 10).forEach(d => console.log('  DIFF', d));
process.exit(diffs.length > tolerated ? 1 : 0);
