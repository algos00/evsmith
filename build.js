'use strict';
/* Builds the single-file app: src/template.html with every @@src/file@@ marker replaced by that file's content.
   Usage: node build.js [outFile]   (default: dist/EVSmith.html). The version comes from package.json; BUILD_DATE (YYYYMMDD) and GITHUB_SHA are optional. */
const fs = require('fs'), path = require('path');
const root = __dirname, out = process.argv[2] || path.join(root, 'dist', 'EVSmith.html');
const tpl = fs.readFileSync(path.join(root, 'src', 'template.html'), 'utf8');
const version = require('./package.json').version;
const now = new Date(), pad = n => String(n).padStart(2, '0');
const date = process.env.BUILD_DATE || `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}`;
const sha = (process.env.GITHUB_SHA || '').slice(0, 7);
const vars = { version, build: sha ? `${date} · ${sha}` : date };
const html = tpl
  .replace(/@@(src\/[\w.-]+)@@/g, (_, f) => fs.readFileSync(path.join(root, f), 'utf8'))
  .replace(/\{\{(version|build)\}\}/g, (_, k) => vars[k]);
if (/@@src\/|\{\{(version|build)\}\}/.test(html)) throw new Error('unresolved marker');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log(`built ${out} (${html.length} bytes)`);
