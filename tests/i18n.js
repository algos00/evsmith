'use strict';
/* Italian interface: every translatable text in src/template.html (data-i18n, data-i18n-ph, data-i18n-title) and
   src/ui.js, src/teamlogic.js and src/teamui.js (tr('...') and N_('...') literals, type names) has an entry in src/i18n.it.js, no entry is unused,
   and each translation keeps the same {n} placeholders and the same HTML tags as its English key. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const tpl = fs.readFileSync(path.join(root, 'src', 'template.html'), 'utf8');
const read = f => fs.readFileSync(path.join(root, 'src', f), 'utf8');
const ui = ['ui.js', 'teamlogic.js', 'teamui.js'].map(read).join('\n');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'src', 'i18n.it.js'), 'utf8') + '\nthis.D=I18N_IT;', ctx);
const IT = ctx.D;

const keys = new Set();
const unq = s => s.replace(/\\(.)/g, '$1');
for (const m of tpl.matchAll(/<(\w+)([^>]*\sdata-i18n(?:\s[^>]*)?)>([\s\S]*?)<\/\1>/g)) keys.add(m[3].trim());
for (const m of tpl.matchAll(/placeholder="([^"]*)"[^>]*data-i18n-ph|data-i18n-ph[^>]*placeholder="([^"]*)"/g)) keys.add(m[1] || m[2]);
for (const m of tpl.matchAll(/data-i18n-title[^>]*title="([^"]*)"|title="([^"]*)"[^>]*data-i18n-title/g)) keys.add(m[1] || m[2]);
for (const m of ui.matchAll(/(?<![\w$.])(?:tr|N_)\('((?:[^'\\]|\\.)*)'/g)) keys.add(unq(m[1]));
for (const m of /var TYC=\{([^}]*)\}/.exec(ui)[1].matchAll(/(\w+):'/g)) keys.add(m[1]);

const problems = [];
for (const k of keys) {
  if (!(k in IT)) { problems.push('missing: ' + JSON.stringify(k)); continue; }
  const ph = s => (s.match(/\{\d+\}/g) || []).sort().join(), tags = s => (s.match(/<\/?[a-z]+/g) || []).sort().join();
  if (ph(k) !== ph(IT[k])) problems.push('placeholders differ: ' + JSON.stringify(k));
  if (tags(k) !== tags(IT[k])) problems.push('HTML tags differ: ' + JSON.stringify(k));
  if (!String(IT[k]).trim()) problems.push('empty translation: ' + JSON.stringify(k));
}
for (const k of Object.keys(IT)) if (!keys.has(k)) problems.push('unused: ' + JSON.stringify(k));
/* a literal passed to tr() that is not a plain string (e.g. tr(a?'x':'y')) would be missed above: forbid it */
for (const m of ui.matchAll(/(?<![\w$.])tr\(([^)'\s][^,)]*\?\s*')/g)) problems.push('tr() with a bare ternary of literals (wrap them in N_): ' + m[0].slice(0, 60));

problems.forEach(p => console.log('  ' + p));
console.log(`i18n: ${keys.size} texts, ${Object.keys(IT).length} Italian entries, ${problems.length} problem(s)`);
process.exit(problems.length ? 1 : 0);
