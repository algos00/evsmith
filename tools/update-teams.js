'use strict';
/* Regenerates src/teamdata.js (which Pokémon are used together, overall and by team type) from full tournament team lists:
   Limitless TCG's public tournament API and, optionally, Pokedata standings of official events.
   Usage: node tools/update-teams.js [options]
     --format M-C          Limitless format id
     --days 30             how far back to look
     --players 25          smallest tournament to count
     --delay 2             seconds between requests
     --max 300             most Limitless tournaments to read
     --pokedata ID,ID      Pokedata event ids to add (you choose them: their regulation is not checked)
     --pokedata-file A,B   Pokedata standings JSON files already downloaded
     --no-limitless        use Pokedata only
     --cached              rebuild from tools/.cache without any request
     --min-teams 200       refuse to write the file with fewer teams
     --out src/teamdata.js
   Set LIMITLESS_API_KEY to send an API key (not needed for tournament data).
   Only counts are written: no player names. Names that are not in the app's game data are listed at the end. */
const fs = require('fs'), path = require('path'), vm = require('vm');

const TAGS = ['all', 'tr', 'tw', 'rain', 'sun', 'sand', 'snow'];
const WEATHER = {
  rain: { ab: ['Drizzle'], mv: ['Rain Dance'] }, sun: { ab: ['Drought'], mv: ['Sunny Day'] },
  sand: { ab: ['Sand Stream'], mv: ['Sandstorm'] }, snow: { ab: ['Snow Warning'], mv: ['Snowscape', 'Chilly Reception'] }
};
/* limits that keep the generated file small */
const LIMITS = { mons: 150, minMon: 10, minPair: 3, partnersAll: 40, partnersTag: 20, moves: 10, abilities: 3, items: 4 };

const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

function loadGame() {
  const ctx = {}; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src', 'data.js'), 'utf8'), ctx);
  return ctx;
}

/* ---------- names ---------- */
const WORDS = { alolan: 'alola', hisuian: 'hisui', galarian: 'galar', paldean: 'paldea', female: 'f' };
const DROP = ['male', 'm', 'form', 'forme', 'flower', 'breed', 'style', 'mask', 'of', 'the', 'kind', 'variety', 'size', 'average', 'family'];
/* species whose other forms are only cosmetic or appear during battle: extra words can be ignored */
const COSMETIC = ['aegislash', 'palafin', 'vivillon', 'maushold', 'sinistcha', 'polteageist', 'tatsugiri', 'squawkabilly', 'alcremie', 'florges', 'furfrou', 'gastrodon', 'gourgeist', 'mimikyu', 'morpeko'];

/* forms that only appear during battle */
const FORMS = { 'Aegislash-Blade': 'Aegislash', 'Palafin-Hero': 'Palafin' };

function makeResolver(game) {
  const DEX = game.POKEDEX_CHAMPIONS, LOCK = game.LOCK_ITEM_LOOKUP, MV = game.MOVES_CHAMPIONS;
  const tokens = s => {
    const t = String(s || '').toLowerCase().replace(/♀/g, ' female ').replace(/♂/g, ' male ').replace(/[’'.]/g, '').split(/[^a-z0-9]+/).filter(Boolean).map(w => WORDS[w] || w);
    return [...new Set(t)];
  };
  const key = t => t.slice().sort().join(' ');
  const dex = new Map(); Object.keys(DEX).forEach(n => dex.set(key(n.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)), n));
  const stones = new Map(); Object.keys(LOCK).forEach(n => { if (!DEX[n]) return; const k = norm(LOCK[n]); if (!stones.has(k)) stones.set(k, []); stones.get(k).push(n); });
  const moves = new Map(Object.keys(MV).map(m => [norm(m), m]));
  const abilities = new Map(game.ABILITIES_CHAMPIONS.map(a => [norm(a), a]));
  const items = new Map(game.ITEMS_CHAMPIONS.map(a => [norm(a), a]));
  Object.keys(LOCK).forEach(n => items.set(norm(LOCK[n]), LOCK[n]));

  function lookup(text) {
    let t = tokens(text); if (!t.length) return null;
    if (dex.has(key(t))) return dex.get(key(t));
    t = t.filter(w => !DROP.includes(w));
    if (dex.has(key(t))) return dex.get(key(t));
    if (t.includes('rotom')) t = t.filter((w, i) => w !== 'rotom' || i === t.indexOf('rotom'));
    if (t.includes('tauros') && t.includes('paldea')) {
      const breed = ['blaze', 'aqua'].find(b => t.includes(b)) || 'combat';
      return dex.get(key(['tauros', 'paldea', breed])) || null;
    }
    const base = t.find(w => COSMETIC.includes(w));
    if (base) return dex.get(base) || null;
    return null;
  }
  const baseOf = mega => mega.replace(/^Mega /, '').replace(/ [XYZ]$/, '');
  /* species name as the app writes it; a Mega Stone turns the species into its Mega form */
  function species(id, name, item) {
    /* the id and the name can differ in detail ("rotom" / "Wash Rotom"): keep the more precise one */
    const a = lookup(id), b = lookup(name);
    let n = b && (!a || b.startsWith(a + '-')) ? b : a;
    const megas = stones.get(norm(item)) || [];
    /* some lists write the Eternal Flower Floette as plain Floette */
    if (!n && norm(id || name) === 'floette' && megas.includes('Mega Floette')) n = 'Floette-Eternal';
    if (!n) return null;
    if (FORMS[n]) n = FORMS[n];
    for (const m of megas) {
      const b = baseOf(m);
      if (n === b || (m === 'Mega Floette' && n === 'Floette-Eternal')) return m;
      if (/^Meowstic/.test(b) && /^Meowstic/.test(n)) return n === 'Meowstic-F' ? 'Mega Meowstic-F' : 'Mega Meowstic-M';
    }
    return n;
  }
  return { species, lookup, move: m => moves.get(norm(m)) || null, ability: a => abilities.get(norm(a)) || null, item: i => items.get(norm(i)) || null, DEX };
}

/* ---------- one team list ---------- */
/* decklist: Limitless {id,name,item,ability,attacks[]} or Pokedata {name,item,ability,badges[]} */
function readTeam(decklist, R, unknown) {
  if (typeof decklist === 'string') { try { decklist = JSON.parse(decklist); } catch (e) { return null; } }
  if (!Array.isArray(decklist)) return null;
  const team = [], seen = new Set();
  for (const raw of decklist.slice(0, 6)) {
    if (!raw || typeof raw !== 'object') continue;
    const item = R.item(raw.item), n = R.species(raw.id, raw.name, raw.item);
    if (unknown) unknown.slots++;
    if (!n) { if (unknown) { unknown.missed++; const label = String(raw.name || raw.id || '?'); unknown.species.set(label, (unknown.species.get(label) || 0) + 1); } continue; }
    if (seen.has(n)) continue; seen.add(n);
    const listed = raw.attacks || raw.badges || raw.moves;
    const mv = [...new Set((Array.isArray(listed) ? listed : []).map(R.move).filter(Boolean))].slice(0, 4);
    team.push({ n, ab: R.ability(raw.ability), it: item, mv });
  }
  return team.length >= 4 ? team : null;
}

function tagsOf(team, DEX) {
  const mv = new Set(), ab = new Set();
  team.forEach(p => { p.mv.forEach(m => mv.add(m)); if (p.ab) ab.add(p.ab); if (/^Mega /.test(p.n) && DEX[p.n]) ab.add(DEX[p.n].ab); });
  const t = ['all'];
  if (mv.has('Trick Room')) t.push('tr');
  if (mv.has('Tailwind')) t.push('tw');
  Object.keys(WEATHER).forEach(w => { if (WEATHER[w].ab.some(a => ab.has(a)) || WEATHER[w].mv.some(m => mv.has(m))) t.push(w); });
  return t;
}

/* ---------- counts ---------- */
function aggregate(teams, DEX, limits) {
  const L = Object.assign({}, LIMITS, limits || {});
  const total = new Map();
  teams.forEach(t => t.forEach(p => total.set(p.n, (total.get(p.n) || 0) + 1)));
  const mons = [...total.entries()].filter(e => e[1] >= L.minMon).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, L.mons).map(e => e[0]);
  const ix = new Map(mons.map((n, i) => [n, i]));
  const n = {}, solo = {}, pairs = {};
  TAGS.forEach(g => { n[g] = 0; solo[g] = {}; pairs[g] = new Map(); });
  const sets = mons.map(() => ({ c: 0, mv: new Map(), ab: new Map(), it: new Map() }));
  const add = (m, k) => { if (k) m.set(k, (m.get(k) || 0) + 1); };
  for (const team of teams) {
    const ids = team.map(p => ix.get(p.n)).filter(i => i !== undefined);
    for (const g of tagsOf(team, DEX)) {
      n[g]++;
      for (const a of ids) {
        solo[g][a] = (solo[g][a] || 0) + 1;
        for (const b of ids) if (a !== b) { if (!pairs[g].has(a)) pairs[g].set(a, new Map()); add(pairs[g].get(a), b); }
      }
    }
    team.forEach(p => { const i = ix.get(p.n); if (i === undefined) return; const s = sets[i]; s.c++; p.mv.forEach(m => add(s.mv, m)); add(s.ab, p.ab); add(s.it, p.it); });
  }
  const pair = {};
  TAGS.forEach(g => {
    pair[g] = {};
    pairs[g].forEach((m, a) => {
      const list = [...m.entries()].filter(e => e[1] >= L.minPair).sort((x, y) => y[1] - x[1] || x[0] - y[0]).slice(0, g === 'all' ? L.partnersAll : L.partnersTag);
      if (list.length) pair[g][a] = list;
    });
  });
  const top = (m, c, k) => { const o = {}; [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, k).forEach(([name, v]) => { o[name] = Math.round(v / c * 1000) / 10; }); return o; };
  const outSets = {};
  sets.forEach((s, i) => { outSets[i] = { mv: top(s.mv, s.c, L.moves), ab: top(s.ab, s.c, L.abilities), it: top(s.it, s.c, L.items) }; });
  return { mons, n, solo, pair, sets: outSets };
}

function render(info, data) {
  const head = info
    ? `/* Team lists, Pokémon Champions VGC. GENERATED by tools/update-teams.js on ${info.date}: do not edit by hand.
   Sources: ${info.source}. ${info.teams} teams. Counts only. */`
    : `/* Team lists, Pokémon Champions VGC. GENERATED by tools/update-teams.js: do not edit by hand.
   No data has been collected yet: the Teambuilding suggestions work without teammate data until the script is run. */`;
  return `${head}\nvar TEAMDATA=${info ? JSON.stringify(Object.assign({ info }, data)) : 'null'};\n`;
}

module.exports = { TAGS, loadGame, makeResolver, readTeam, tagsOf, aggregate, render };

/* ---------- download ---------- */
async function main() {
  const arg = (name, def) => { const i = process.argv.indexOf('--' + name); return i < 0 ? def : (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true); };
  const list = v => (typeof v === 'string' ? v.split(',').map(x => x.trim()).filter(Boolean) : []);
  const FORMAT = arg('format', 'M-C'), DAYS = +arg('days', 30), PLAYERS = +arg('players', 25), DELAY = Math.max(0.5, +arg('delay', 2)) * 1000;
  const MAX = +arg('max', 300), CACHED = !!arg('cached', false), MIN = +arg('min-teams', 200);
  const OUT = path.resolve(arg('out', path.join(__dirname, '..', 'src', 'teamdata.js')));
  const CACHE = path.join(__dirname, '.cache'); fs.mkdirSync(CACHE, { recursive: true });
  const API = 'https://play.limitlesstcg.com/api', UA = 'EVSmith-team-updater/1.0 (open-source hobby tool)';
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  let last = 0;
  /* keep: how long a cached answer stays valid (Infinity: for ever) */
  async function get(url, file, keep, headers) {
    const f = path.join(CACHE, file);
    if (fs.existsSync(f) && (CACHED || Date.now() - fs.statSync(f).mtimeMs < keep)) return JSON.parse(fs.readFileSync(f, 'utf8'));
    if (CACHED) throw new Error('no cached answer for ' + url);
    for (let attempt = 1; ; attempt++) {
      const wait = last + DELAY - Date.now(); if (wait > 0) await sleep(wait);
      last = Date.now();
      const res = await fetch(url, { headers: Object.assign({ 'User-Agent': UA, Accept: 'application/json' }, headers) });
      if (res.status === 429 && attempt <= 3) { const s = Math.min(300, +res.headers.get('retry-after') || 60); process.stderr.write(`rate limited: waiting ${s} s\n`); await sleep(s * 1000); continue; }
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      const j = await res.json(); fs.writeFileSync(f, JSON.stringify(j)); return j;
    }
  }

  const game = loadGame(), R = makeResolver(game);
  const unknown = { slots: 0, missed: 0, species: new Map() }, teams = [];
  const counts = { limitless: { tournaments: 0, teams: 0 }, pokedata: { tournaments: 0, teams: 0 } };
  function addStandings(players, source) {
    let k = 0;
    for (const p of players) { const t = readTeam(p && p.decklist, R, unknown); if (t) { teams.push(t); k++; } }
    if (k) { counts[source].tournaments++; counts[source].teams += k; }
  }

  if (!arg('no-limitless', false)) {
    const auth = process.env.LIMITLESS_API_KEY ? { 'X-Access-Key': process.env.LIMITLESS_API_KEY } : {};
    const since = Date.now() - DAYS * 86400e3, found = [], seen = new Set();
    /* pages go from the newest back; the server may return fewer rows than asked, so only an empty, repeated or too old page ends the search */
    for (let page = 1; page <= 50 && found.length < MAX; page++) {
      const rows = await get(`${API}/tournaments?game=VGC&format=${encodeURIComponent(FORMAT)}&limit=100&page=${page}`, `limitless_list_${norm(FORMAT)}_${page}.json`, 6 * 3600e3, auth);
      if (!Array.isArray(rows)) throw new Error('unexpected tournament list');
      const fresh = rows.filter(t => !seen.has(t.id));
      fresh.forEach(t => { seen.add(t.id); if (t.format === FORMAT && +t.players >= PLAYERS && Date.parse(t.date) >= since && found.length < MAX) found.push(t); });
      if (!fresh.length || rows.every(t => Date.parse(t.date) < since)) break;
    }
    process.stderr.write(`Limitless: ${found.length} tournaments\n`);
    for (let i = 0; i < found.length; i++) {
      const t = found[i], id = String(t.id).replace(/[^A-Za-z0-9_-]/g, '');
      process.stderr.write(`${i + 1}/${found.length} ${id}\n`);
      /* a tournament of the last two days may still change */
      const keep = Date.now() - Date.parse(t.date) > 2 * 86400e3 ? Infinity : 3600e3;
      try { const s = await get(`${API}/tournaments/${id}/standings`, `limitless_${id}.json`, keep, auth); if (Array.isArray(s)) addStandings(s, 'limitless'); }
      catch (e) { process.stderr.write(`skipped ${id}: ${e.message}\n`); }
    }
  }
  const players = j => (Array.isArray(j) ? j : (j && j.standings && j.standings.players) || (j && j.players) || []);
  for (const raw of list(arg('pokedata', ''))) {
    const id = raw.replace(/[^A-Za-z0-9_-]/g, '');
    addStandings(players(await get(`https://www.pokedata.ovh/standings2/standings/${id}_Masters.json`, `pokedata_${id}.json`, 6 * 3600e3)), 'pokedata');
  }
  for (const f of list(arg('pokedata-file', ''))) addStandings(players(JSON.parse(fs.readFileSync(f, 'utf8'))), 'pokedata');

  const lost = unknown.slots ? unknown.missed / unknown.slots : 0;
  if (unknown.missed) console.log(`names not in the app's data (${(lost * 100).toFixed(1)}% of slots): ${[...unknown.species].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, v]) => `${k} ×${v}`).join(', ')}`);
  if (teams.length < MIN) throw new Error(`only ${teams.length} teams read (minimum ${MIN}): ${path.basename(OUT)} was not changed`);
  if (lost > 0.05) throw new Error(`too many unknown Pokémon: ${path.basename(OUT)} was not changed`);

  const data = aggregate(teams, game.POKEDEX_CHAMPIONS);
  const names = [counts.limitless.teams && 'Limitless TCG (online tournaments)', counts.pokedata.teams && 'Pokedata (official events)'].filter(Boolean);
  const info = { date: new Date().toISOString().slice(0, 10), format: FORMAT, days: DAYS, minPlayers: PLAYERS, teams: teams.length, source: names.join(' + '), limitless: counts.limitless, pokedata: counts.pokedata };
  const out = render(info, data);
  fs.writeFileSync(OUT, out);
  console.log(`wrote ${OUT}: ${teams.length} teams, ${data.mons.length} Pokémon, ${(out.length / 1024).toFixed(0)} KB, ${info.date}`);
  console.log('teams by type: ' + TAGS.map(t => `${t} ${data.n[t]}`).join(', '));
}

if (require.main === module) main().catch(e => { console.error('update-teams failed:', e.message); process.exit(1); });
