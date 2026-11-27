'use strict';
/* Teambuilding: reading tournament team lists (tools/update-teams.js) and the partner suggestions (src/teamlogic.js).
   The team lists used here are made up. */
const assert = require('assert'), fs = require('fs'), vm = require('vm'), path = require('path');
const U = require('../tools/update-teams.js');
const htmlPath = process.env.EVSMITH_HTML || path.join(__dirname, '..', 'dist', 'EVSmith.html');
const scripts = [...fs.readFileSync(htmlPath, 'utf8').matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const ctx = {}; ctx.globalThis = ctx; ctx.window = ctx; vm.createContext(ctx);
['POKEDEX_CHAMPIONS=', 'var TDATA=', 'EVSmith damage engine', 'G.TEAM='].forEach(marker => {
  const s = scripts.find(x => x.includes(marker)); assert(s, 'script block not found: ' + marker); vm.runInContext(s, ctx);
});
const T = ctx.TEAM, game = U.loadGame(), R = U.makeResolver(game);
let n = 0; const ok = (name, f) => { try { f(); n++; } catch (e) { console.log('FAIL ' + name + ': ' + e.stack); process.exit(1); } };
const mon = (name, o) => Object.assign({ sp: name, it: '', ab: '', na: '', mv: ['', '', '', ''], pts: {} }, o);
const team = (type, slots) => ({ type, slots });

ok('species names from Limitless and Pokedata', () => {
  const cases = [
    ['charizard', 'Charizard', 'Charizardite Y', 'Mega Charizard Y'], ['garchomp', 'Garchomp', 'Garchompite Z', 'Mega Garchomp Z'],
    ['floette', 'Floette', 'Floettite', 'Mega Floette'], [null, 'Floette [Eternal Flower]', '', 'Floette-Eternal'],
    [null, 'Indeedee [Female]', '', 'Indeedee-F'], [null, 'Basculegion [Male]', '', 'Basculegion'], ['basculegion', 'Basculegion ♀', '', 'Basculegion-F'],
    [null, 'Rotom [Wash Rotom]', '', 'Rotom-Wash'], [null, 'Ninetales [Alolan Form]', '', 'Ninetales-Alola'], [null, 'Hisuian Arcanine', '', 'Arcanine-Hisui'],
    [null, 'Paldean Tauros Aqua Breed', '', 'Tauros-Paldea-Aqua'], ['aegislash-blade', 'Aegislash', '', 'Aegislash'], ['meowstic-f', 'Meowstic-F', 'Meowsticite', 'Mega Meowstic-F'],
    ['kommo-o', 'Kommo-o', '', 'Kommo-o'], ['incineroar', 'Incineroar', 'Charizardite Y', 'Incineroar'], ['notamon', 'Notamon', '', null],
    ['rotom', 'Wash Rotom', '', 'Rotom-Wash'], ['indeedee', 'Indeedee ♀', '', 'Indeedee-F']];
  cases.forEach(([id, name, item, want]) => assert.strictEqual(R.species(id, name, item), want, `${name} + ${item}`));
});

ok('team lists: both formats, unknown names and short teams', () => {
  const unknown = { slots: 0, missed: 0, species: new Map() };
  const six = ['Incineroar', 'Rillaboom', 'Sneasler', 'Pelipper', 'Archaludon'].map(name => ({ id: name.toLowerCase(), name, item: 'Sitrus Berry', ability: 'x', attacks: ['Protect', 'protect', 'Nope'] }));
  const a = U.readTeam(six.concat([{ id: 'zzz', name: 'Zzz' }]), R, unknown);
  assert.strictEqual(a.length, 5); assert.deepStrictEqual([...a[0].mv], ['Protect']); assert.strictEqual(unknown.missed, 1);
  const b = U.readTeam(JSON.stringify(six.map(p => ({ name: p.name, badges: ['Fake Out'] }))), R);
  assert.deepStrictEqual([...b[1].mv], ['Fake Out']);
  assert.strictEqual(U.readTeam(six.slice(0, 3), R), null); assert.strictEqual(U.readTeam(null, R), null); assert.strictEqual(U.readTeam('{oops', R), null);
});

const P = (name, mv, ab, item) => ({ n: name, ab: ab || null, it: item || null, mv: mv || [] });
const fake = () => {
  const teams = [];
  for (let i = 0; i < 30; i++) teams.push([P('Pelipper', ['Tailwind'], 'Drizzle'), P('Archaludon'), P('Incineroar', ['Fake Out']), P('Sinistcha')]);
  for (let i = 0; i < 20; i++) teams.push([P('Farigiraf', ['Trick Room']), P('Mega Camerupt'), P('Incineroar', ['Fake Out']), P('Sneasler')]);
  for (let i = 0; i < 12; i++) teams.push([P('Mega Charizard Y', [], 'Blaze'), P('Venusaur'), P('Garchomp'), P('Sneasler')]);
  return teams;
};

ok('counts by team type', () => {
  const d = U.aggregate(fake(), game.POKEDEX_CHAMPIONS), ix = m => d.mons.indexOf(m);
  assert.strictEqual(d.n.all, 62); assert.strictEqual(d.n.rain, 30); assert.strictEqual(d.n.tw, 30); assert.strictEqual(d.n.tr, 20);
  assert.strictEqual(d.n.sun, 12, 'the Mega ability sets the weather');
  assert.strictEqual(d.solo.all[ix('Incineroar')], 50);
  const pair = d.pair.all[ix('Pelipper')].find(e => e[0] === ix('Archaludon')); assert.strictEqual(pair[1], 30);
  assert.strictEqual(d.sets[ix('Pelipper')].mv.Tailwind, 100);
  const c = {}; vm.createContext(c); vm.runInContext(U.render({ date: '2000-01-01', source: 'test', teams: 62 }, d), c);
  assert.strictEqual(c.TEAMDATA.mons.length, d.mons.length);
  vm.runInContext(U.render(null), c); assert.strictEqual(c.TEAMDATA, null);
});

const names = list => list.map(s => s.name);
const plain = x => JSON.parse(JSON.stringify(x));
const check = list => list.forEach(s => {
  assert(s.score >= 0 && s.score <= 100, 'score ' + s.score); assert(s.reasons.length >= 1 && s.reasons.length <= 4, s.name + ' reasons');
  s.reasons.forEach(r => { assert(r.k && typeof r.k === 'string'); const used = (r.k.match(/\{\d+\}/g) || []).length; assert(r.a.length >= used, r.k); });
});

ok('suggestions without teammate data', () => {
  T.setData(null);
  const empty = T.suggest(team('none', []), 8); assert.strictEqual(empty.length, 8); check(empty);
  const s = T.suggest(team('none', [mon('Incineroar', { mv: ['Fake Out', '', '', ''] }), mon('Mega Floette')]), 400); check(s);
  assert(!names(s).includes('Incineroar') && !names(s).includes('Floette-Eternal') && !names(s).includes('Mega Floette'), 'species clause');
  const keys = names(s).map(x => T.baseKey(x)); assert.strictEqual(new Set(keys).size, keys.length, 'one form per species');
  assert(!s.some(x => x.reasons.some(r => r.a[0] === 'Fake Out' && /does not have/.test(r.k))), 'Fake Out is already on the team');
});

ok('team type changes the suggestions', () => {
  T.setData(null);
  const top = type => names(T.suggest(team(type, [mon('Incineroar')]), 8));
  assert(top('rain').some(x => ['Pelipper', 'Politoed'].includes(x)), 'a rain setter: ' + top('rain'));
  assert(top('sun').some(x => ['Torkoal', 'Mega Charizard Y'].includes(x)), 'a sun setter: ' + top('sun'));
  assert(top('tr').some(x => ['Farigiraf', 'Hatterene', 'Sinistcha', 'Armarouge'].includes(x) || /Indeedee/.test(x)), 'a Trick Room setter: ' + top('tr'));
  const rain = T.suggest(team('rain', [mon('Pelipper', { ab: 'Drizzle' })]), 400);
  const sun = rain.find(x => x.name === 'Torkoal'); assert(sun.reasons.some(r => r.warn && r.a[0] === 'Drought'), 'other weather is flagged');
});

ok('shared weaknesses and immunities', () => {
  T.setData(null);
  const t = [mon('Incineroar'), mon('Archaludon'), mon('Mega Camerupt')], a = T.analyse(T.members(t));
  assert(a.need.Ground >= 2, 'Ground need ' + a.need.Ground);
  assert.strictEqual(T.mult('Ground', ['Electric'], 'Levitate'), 0);
  const all = T.suggest(team('none', t), 400), flyer = all.find(x => x.name === 'Corviknight');
  assert(flyer.reasons.some(r => /^Immune to/.test(r.k) && r.a[0].types.includes('Ground')) || flyer.parts.type > .5);
});

ok('teammate data raises the usual partners and explains it', () => {
  T.setData(null);
  const t = team('none', [mon('Pelipper')]), before = T.suggest(t, 400).find(x => x.name === 'Archaludon').parts.meta;
  T.setData(plain(U.aggregate(fake(), game.POKEDEX_CHAMPIONS)));
  const after = T.suggest(t, 400).find(x => x.name === 'Archaludon');
  assert(after.parts.meta > before, `${after.parts.meta} > ${before}`);
  const r = after.reasons.find(x => /tournament teams with/.test(x.k)); assert(r && r.a[0] === 100 && r.a[1] === 'Pelipper');
  const tr = T.suggest(team('tr', [mon('Incineroar')]), 8); check(tr); assert(names(tr).includes('Farigiraf'), String(names(tr)));
  T.setData(null);
});

ok('Mega forms and rule checks', () => {
  assert.strictEqual(T.effName('Charizard', 'Charizardite Y'), 'Mega Charizard Y');
  assert.strictEqual(T.effName('Charizard', 'Sitrus Berry'), 'Charizard');
  const p = T.problems([mon('Incineroar', { it: 'Sitrus Berry', mv: ['Fake Out', 'Fake Out', 'Spore', ''], pts: { hp: 32, at: 32, df: 32 } }), mon('Incineroar', { it: 'Sitrus Berry' })]).map(x => x.k);
  ['{0} is on the team twice.', 'Two Pokémon hold {0}.', '{0} has {1} twice.', '{0} cannot learn {1}.', '{0} uses {1} Stat Points (the limit is 66).'].forEach(k => assert(p.includes(k), k));
  assert.deepStrictEqual(plain(T.problems([mon('Incineroar', { mv: ['Fake Out', 'Flare Blitz', '', ''] }), mon('')])), []);
  const two = team('none', [mon('Mega Floette'), mon('Mega Camerupt')]);
  assert(T.suggest(two, 400).find(x => x.name === 'Mega Staraptor').reasons.some(r => r.warn && /Mega/.test(r.k)));
});

ok('odd input and weak claims', () => {
  T.setData(null);
  ['toString', 'constructor', 'bogus'].forEach(type => {
    const slots = [mon('constructor'), mon('__proto__'), mon('Incineroar', { mv: ['constructor', 'toString', '', ''] })];
    check(T.suggest(team(type, slots), 8)); T.problems(slots);
  });
  T.suggest(team('sun', [mon('Incineroar')]), 400).forEach(s => s.reasons.forEach(r => assert(!(s.name === 'Whimsicott' && /^Sets up/.test(r.k)), 'a rarely used move is not a setter')));
});

console.log(`team: ${n} checks passed`);
