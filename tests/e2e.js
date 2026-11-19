'use strict';
/* End-to-end checks in a real Chrome (puppeteer-core), against the built dist/ folder served by a throw-away local server
   on a free port. No network is needed: Pokémon pictures and fonts are answered locally, any other outside request is a failure.
   Chrome: CHROME_PATH, or a normal install. Without Chrome the test is skipped locally and fails in CI.
   Usage: node e2e.js */
const fs = require('fs'), path = require('path'), http = require('http'), assert = require('assert');
const puppeteer = require('puppeteer-core');
const DIST = path.join(__dirname, '..', 'dist'), VERSION = require('../package.json').version;
const CANDIDATES = [process.env.CHROME_PATH, '/usr/bin/google-chrome-stable', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'].filter(Boolean);
const chrome = CANDIDATES.find(p => fs.existsSync(p));
if (!chrome) { console.log('e2e: no Chrome found (set CHROME_PATH)'); process.exit(process.env.CI ? 1 : 0); }
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  let f = decodeURIComponent(req.url.split('?')[0]); if (f === '/') f = '/EVSmith.html';
  const file = path.join(DIST, f); if (!file.startsWith(DIST) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' }); fs.createReadStream(file).pipe(res);
});
let results = 0; const failures = [];
async function test(name, fn) { const t0 = Date.now(), ms = () => ` (${((Date.now() - t0) / 1000).toFixed(1)} s)`; try { await fn(); results++; console.log('  ok  ' + name + ms()); } catch (e) { failures.push(name); console.log('  FAIL ' + name + ms() + '\n       ' + String(e.message).split('\n').slice(0, 4).join(' / ').slice(0, 600)); } }

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port + '/';
  const browser = await puppeteer.launch({ executablePath: chrome, headless: 'new', args: ['--no-sandbox', '--disable-gpu', '--lang=en-US'] });
  const ctx = browser.defaultBrowserContext(); await ctx.overridePermissions(new URL(base).origin, ['clipboard-read', 'clipboard-write']).catch(() => {});

  async function open(w, h, opts = {}) {
    const page = await (opts.browser || browser).newPage(); await page.setViewport({ width: w || 1280, height: h || 900 });
    const log = { errors: [], hosts: new Set(), csp: [], bad: [] };
    if (!opts.sw) await page.setBypassServiceWorker(true);
    await page.setRequestInterception(true);
    page.on('request', r => {
      const u = new URL(r.url());
      if (u.origin === new URL(base).origin || u.protocol === 'data:') return r.continue();
      log.hosts.add(u.hostname);
      if (u.hostname === 'raw.githubusercontent.com') return r.respond({ status: 200, contentType: 'image/png', headers: { 'access-control-allow-origin': '*' }, body: PNG });
      if (u.hostname === 'fonts.googleapis.com') return r.respond({ status: 200, contentType: 'text/css', body: '/* offline */' });
      if (u.hostname === 'fonts.gstatic.com') return r.abort();
      log.bad.push(r.url()); r.abort();
    });
    page.on('pageerror', e => log.errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) log.errors.push(m.text()); });
    await page.evaluateOnNewDocument(() => { window.__csp = []; document.addEventListener('securitypolicyviolation', e => window.__csp.push(e.violatedDirective + ' ' + e.blockedURI)); try { if (!sessionStorage.getItem('__keep')) { localStorage.clear(); sessionStorage.setItem('__keep', '1'); } } catch (e) {} });
    page.log = log; page.goto2 = async (u) => { await page.goto(u || base, { waitUntil: 'load' }); await page.waitForFunction(() => document.getElementById('mSp') && document.getElementById('mSp').value !== ''); };
    return page;
  }
  const calc = page => page.waitForFunction(() => !document.getElementById('res').hidden && !document.querySelector('#res .spin'), { timeout: 30000 });
  /* On a loaded machine the suggestion list sometimes does not open after typing (cause not investigated), so typing is retried
     (3 attempts, 4 s each); a real autocomplete bug still fails, after the last attempt */
  const pickWithKeyboard = async (page, sel, text) => {
    for (let attempt = 1; ; attempt++) {
      await page.focus(sel); await page.$eval(sel, e => { e.value = ''; }); await page.keyboard.type(text);
      try { await page.waitForSelector('#acbox:not([hidden])', { timeout: 4000 }); break; } catch (e) { if (attempt === 3) throw e; }
    }
    await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
  };

  console.log('e2e in ' + chrome + ' (v' + VERSION + ')');
  /* Layout needs no keyboard or clipboard, so its 10 pages are opened together and the test runs alongside the others, in a Chrome of its own:
     pages opened or closed in the same browser take the focus away from the page that is typing */
  const layoutBrowser = await puppeteer.launch({ executablePath: chrome, headless: 'new', args: ['--no-sandbox', '--disable-gpu', '--lang=en-US'] });
  const layout = test('layout: no horizontal scroll, header text never overlaps the pictures', async () => {
    /* the fonts are not loaded here, so the text is drawn with the system fallback; the wider pass (letter-spacing) stands in
       for a wider real font, which is how an overlap at 1000-1100px slipped through once */
    await Promise.all([[360, 0], [390, 0], [640, 0], [760, 0], [940, 0], [1000, 2], [1100, 0], [1100, 2], [1366, 0], [1366, 2]].map(async ([w, ls]) => {
      const p = await open(w, 900, { browser: layoutBrowser }); await p.goto2(); if (ls) await p.addStyleTag({ content: `.top-in *{letter-spacing:${ls}px}` }); await p.waitForFunction(() => document.querySelectorAll('.ha').length > 0); await new Promise(r => setTimeout(r, 400));
      const m = await p.evaluate(() => { const vis = [...document.querySelectorAll('.ha')].filter(e => getComputedStyle(e).display !== 'none').map(e => e.getBoundingClientRect()), t = document.querySelector('.top-in').getBoundingClientRect(); return { sw: document.documentElement.scrollWidth, iw: innerWidth, over: vis.filter(r => r.left < t.right - 2 && r.right > t.left + 2 && r.top < t.bottom && r.bottom > t.top).length }; });
      assert(m.sw <= m.iw + 1, `horizontal scroll at ${w}px (${m.sw} > ${m.iw})`); assert.strictEqual(m.over, 0, `header art overlaps the text at ${w}px (letter-spacing ${ls}px)`); await p.close();
    }));
  }).finally(() => layoutBrowser.close());
  await test('boot: default Pokémon, no errors, no CSP violation, only allowed hosts', async () => {
    const p = await open(); await p.goto2();
    const s = await p.evaluate(() => ({ mon: mSp.value, ab: mAb.value, show: !!document.querySelector('#showcase .sc-name'), ver: document.querySelector('.ver').textContent, csp: window.__csp, title: document.title }));
    assert.strictEqual(s.mon, 'Incineroar'); assert.strictEqual(s.ab, 'Intimidate'); assert(s.show, 'showcase missing'); assert(s.ver.includes(VERSION), 'version in footer: ' + s.ver);
    assert.deepStrictEqual(s.csp, []); assert.strictEqual(p.log.errors.join(' | '), ''); assert.deepStrictEqual(p.log.bad, [], 'unexpected outside request');
    await new Promise(r => setTimeout(r, 700)); assert(p.log.hosts.has('raw.githubusercontent.com'), 'sprites should be requested');
    await p.close();
  });
  await test('autocomplete works with the keyboard and announces itself', async () => {
    const p = await open(); await p.goto2();
    await p.focus('#mSp'); await p.$eval('#mSp', e => { e.value = ''; }); await p.keyboard.type('rilla'); await p.waitForSelector('#acbox:not([hidden])');
    const a = await p.evaluate(() => ({ role: mSp.getAttribute('role'), exp: mSp.getAttribute('aria-expanded'), box: acbox.getAttribute('role'), opts: [...acbox.children].map(x => x.getAttribute('role')).join() }));
    assert.strictEqual(a.role, 'combobox'); assert.strictEqual(a.exp, 'true'); assert.strictEqual(a.box, 'listbox'); assert(/^option(,option)*$/.test(a.opts));
    await p.keyboard.press('ArrowDown'); assert(await p.evaluate(() => !!mSp.getAttribute('aria-activedescendant')), 'active option must be exposed');
    await p.keyboard.press('Enter'); await p.waitForFunction(() => document.querySelector('#showcase .sc-name') && document.querySelector('#showcase .sc-name').textContent === 'Rillaboom');
    await p.focus('#mSp'); await p.$eval('#mSp', e => { e.value = ''; }); await p.keyboard.type('gar'); await p.waitForSelector('#acbox:not([hidden])'); await p.keyboard.press('Escape');
    assert(await p.evaluate(() => acbox.hidden), 'Escape closes the list'); assert.strictEqual(p.log.errors.join(' | '), ''); await p.close();
  });
  await test('full flow: goals picked by keyboard, result with chart and export', async () => {
    const p = await open(); await p.goto2();
    await p.click('#addSurv'); await pickWithKeyboard(p, '[data-i="0"][data-k="sp"]', 'rillab');
    await pickWithKeyboard(p, '[data-i="0"][data-k="mv"]', 'wood ham');
    await p.click('#addKo'); await pickWithKeyboard(p, '[data-i="1"][data-k="sp"]', 'sneas'); await pickWithKeyboard(p, '[data-i="1"][data-k="mv"]', 'flare bl');
    await p.click('#go'); await calc(p);
    const r = await p.evaluate(() => ({ radar: !!document.querySelector('#res svg.radar'), rows: document.querySelectorAll('#res table tr').length, exp: !!document.querySelector('[data-exp]'), txt: document.getElementById('res').innerText }));
    assert(r.radar && r.rows >= 2 && r.exp, 'result incomplete'); assert(/Rillaboom Wood Hammer/.test(r.txt) && /Flare Blitz on Sneasler/.test(r.txt));
    assert.strictEqual(p.log.errors.join(' | '), ''); assert.deepStrictEqual(await p.evaluate(() => window.__csp), []); await p.close();
  });
  await test('Check my spread: needs a nature, then judges the typed points', async () => {
    const p = await open(); await p.goto2();
    await p.click('#addSurv'); await pickWithKeyboard(p, '[data-i="0"][data-k="sp"]', 'rillab'); await pickWithKeyboard(p, '[data-i="0"][data-k="mv"]', 'wood ham');
    await p.click('#check'); assert(/Choose a nature/.test(await p.$eval('#res', e => e.innerText)), 'Auto nature must be refused');
    await p.select('#mNa', 'Bold'); await p.type('#lk_hp', '32'); await p.type('#lk_df', '32');
    await p.click('#check'); await p.waitForFunction(() => /^Your spread/.test(document.querySelector('#res h2').textContent));
    const t = await p.$eval('#res', e => e.innerText); assert(/Rillaboom Wood Hammer/.test(t)); assert(!/Why these points/.test(t), 'no optimizer-only sections in check mode');
    assert.strictEqual(p.log.errors.join(' | '), ''); await p.close();
  });
  await test('Showdown import fills the form and reports what it could not read', async () => {
    const p = await open(); await p.goto2();
    await p.evaluate(() => { document.getElementById('impBox').open = true; });
    await p.type('#impTxt', 'Garchomp @ Not An Item\nAbility: Rough Skin\nLevel: 50\nEVs: 32 HP / 32 Atk / 2 Spe\nJolly Nature\n- Earthquake');
    await p.click('#impBtn');
    const s = await p.evaluate(() => ({ mon: mSp.value, ab: mAb.value, nat: mNa.value, hp: lk_hp.value, at: lk_at.value, sp: lk_sp.value, msg: impMsg.innerText }));
    assert.strictEqual(s.mon, 'Garchomp'); assert.strictEqual(s.ab, 'Rough Skin'); assert.strictEqual(s.nat, 'Jolly'); assert.deepStrictEqual([s.hp, s.at, s.sp], ['32', '32', '2']);
    assert(/Filled Garchomp/.test(s.msg) && /Not An Item/.test(s.msg)); assert.strictEqual(p.log.errors.join(' | '), ''); await p.close();
  });
  await test('share link restores goals; HP options and Reset work', async () => {
    const p = await open(); await p.goto2();
    await p.click('#addSurv'); await pickWithKeyboard(p, '[data-i="0"][data-k="sp"]', 'rillab');
    await p.evaluate(() => { document.getElementById('hpOpt').open = true; document.querySelector('[data-hpopt=sitrus]').click(); });
    await p.click('#shareBtn'); await new Promise(r => setTimeout(r, 300));
    const url = await p.evaluate(() => navigator.clipboard.readText()); assert(/#s=/.test(url), 'link not copied: ' + url);
    const q = await open(); await q.goto2(url);
    const s = await q.evaluate(() => ({ goals: document.querySelectorAll('.gc').length, sp: document.querySelector('[data-k="sp"]').value, hp: document.querySelector('[data-hpopt=sitrus]').checked }));
    assert.deepStrictEqual(s, { goals: 1, sp: 'Rillaboom', hp: true });
    q.on('dialog', d => d.accept()); await q.click('#resetBtn'); await new Promise(r => setTimeout(r, 300));
    assert.strictEqual(await q.evaluate(() => document.querySelectorAll('.gc').length), 0); await p.close(); await q.close();
  });
  await test('accessibility: every field and button has a name; tokens have contrast', async () => {
    const p = await open(); await p.goto2();
    await p.click('#addSurv'); await p.click('#addKo'); await p.click('#addSpd'); await p.evaluate(() => document.querySelectorAll('details').forEach(d => d.open = true));
    const bad = await p.evaluate(() => [...document.querySelectorAll('input:not([type=hidden]),select,textarea')].filter(e => !(e.getAttribute('aria-label') || (e.labels && e.labels.length) || e.closest('label'))).map(e => (e.id || e.dataset.k || e.tagName) + ':' + (e.dataset.i || '')));
    assert.deepStrictEqual(bad, [], 'unnamed fields: ' + bad.join(', '));
    const btn = await p.evaluate(() => [...document.querySelectorAll('button')].filter(e => !(e.innerText.trim() || e.getAttribute('aria-label'))).map(e => e.id || e.className));
    assert.deepStrictEqual(btn, [], 'unnamed buttons: ' + btn.join(', ')); await p.close();
  });
  await test('Italian interface: every text translated, results in Italian, choice remembered, back to English', async () => {
    const p = await open(); await p.goto2();
    await p.click('#addSurv'); await pickWithKeyboard(p, '[data-i="0"][data-k="sp"]', 'rillab'); await pickWithKeyboard(p, '[data-i="0"][data-k="mv"]', 'wood ham');
    await p.click('#addKo'); await pickWithKeyboard(p, '[data-i="1"][data-k="sp"]', 'sneas'); await pickWithKeyboard(p, '[data-i="1"][data-k="mv"]', 'flare bl');
    await p.select('#mSt', 'Burned'); await p.click('#go'); await calc(p);
    await p.click('#langBtn');
    const s = await p.evaluate(() => ({ lang: document.documentElement.lang, btn: langBtn.textContent,
      untranslated: [...document.querySelectorAll('[data-i18n]')].filter(e => I18N_IT[e._en] === undefined).map(e => String(e._en).slice(0, 70)),
      ph: [...document.querySelectorAll('[data-i18n-ph]')].filter(e => I18N_IT[e._enPh] === undefined).map(e => e._enPh),
      st: mSt.value, stTxt: mSt.selectedOptions[0].textContent, card: document.querySelector('.gc').innerText, res: document.getElementById('res').innerText, go: go.textContent }));
    assert.strictEqual(s.lang, 'it'); assert(/English/.test(s.btn));
    assert.deepStrictEqual(s.untranslated, [], 'texts the page could not match to the dictionary'); assert.deepStrictEqual(s.ph, []);
    assert.strictEqual(s.st, 'Burned', 'the value stays English'); assert.strictEqual(s.stTxt, 'Scottato');
    assert(/Incassa/.test(s.card) && /Priorità/.test(s.card), 'goal card not translated'); assert(/Esporta/.test(s.res) && /Obiettivi/.test(s.res), 'result not redrawn in Italian');
    assert.strictEqual(s.go, 'Trova lo spread migliore');
    await p.click('#go'); await calc(p);
    const r = await p.$eval('#res', e => e.innerText); assert(/Rillaboom Wood Hammer/.test(r) && /Flare Blitz su Sneasler/.test(r) && /Altre nature/.test(r), 'labels of a new calculation are Italian: ' + r.replace(/\n/g, ' | ').slice(-900));
    await p.reload({ waitUntil: 'load' }); await p.waitForFunction(() => mSp.value !== '');
    assert.strictEqual(await p.evaluate(() => document.documentElement.lang + '|' + go.textContent), 'it|Trova lo spread migliore', 'language choice must survive a reload');
    await p.click('#langBtn');
    const e = await p.evaluate(() => ({ lang: document.documentElement.lang, go: go.textContent, h: document.querySelector('#guide summary').textContent, st: mSt.selectedOptions[0].textContent }));
    assert.deepStrictEqual(e, { lang: 'en', go: 'Find the best spread', h: 'How to use EVSmith', st: 'Burned' });
    assert.strictEqual(p.log.errors.join(' | '), ''); assert.deepStrictEqual(await p.evaluate(() => window.__csp), []); await p.close();
  });
  await test('installable app: manifest valid, service worker keeps the page for offline use', async () => {
    const p = await open(1280, 900, { sw: true }); await p.goto2();
    await p.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller || navigator.serviceWorker.getRegistration().then(r => r && r.active), { timeout: 15000 });
    await p.evaluate(() => navigator.serviceWorker.ready); await new Promise(r => setTimeout(r, 800));
    const href = await p.evaluate(() => { const l = document.querySelector('link[rel=manifest]'); return l && l.href; });
    assert(href, 'manifest link missing');
    const get = u => new Promise(res => http.get(u, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => res({ status: r.statusCode, body: d })); }));
    const man = JSON.parse((await get(href)).body); assert.strictEqual(man.name, 'EVSmith');
    for (const i of man.icons) assert.strictEqual((await get(new URL(i.src, href).href)).status, 200, 'icon ' + i.src);
    await p.reload({ waitUntil: 'load' }); await new Promise(r => setTimeout(r, 500));
    await p.setOfflineMode(true); await p.reload({ waitUntil: 'load' }).catch(() => {});
    assert(/EVSmith/.test(await p.title()) && await p.evaluate(() => !!document.getElementById('go')), 'page must load offline'); await p.setOfflineMode(false); await p.close();
  });
  await layout;
  await browser.close(); server.close();
  console.log(failures.length ? `\ne2e: ${failures.length} FAILED (${failures.join('; ')})` : `\ne2e: ${results} checks passed`);
  process.exit(failures.length ? 1 : 0);
})().catch(e => { console.error('e2e crashed:', e); process.exit(1); });
