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
let html = tpl
  .replace(/@@(src\/[\w.-]+)@@/g, (_, f) => fs.readFileSync(path.join(root, f), 'utf8'))
  .replace(/\{\{(version|build)\}\}/g, (_, k) => vars[k]);
/* Content-Security-Policy: only this page's own scripts (by hash), the Google Fonts and the PokéAPI sprites may load */
const crypto = require('crypto');
const hashes = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => `'sha256-${crypto.createHash('sha256').update(m[1], 'utf8').digest('base64')}'`);
const csp = ["default-src 'none'", `script-src ${hashes.join(' ')}`, "style-src 'unsafe-inline' https://fonts.googleapis.com", 'font-src https://fonts.gstatic.com', "img-src 'self' data: https://raw.githubusercontent.com", "connect-src 'none'", "manifest-src 'self'", "worker-src 'self'", "base-uri 'none'", "form-action 'none'"].join('; ');
html = html.replace('{{csp}}', csp);
if (/@@src\/|\{\{csp\}\}|\{\{(version|build)\}\}/.test(html)) throw new Error('unresolved marker');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
/* files that go next to the page when it is served (GitHub Pages): service worker, manifest, icons */
const dir = path.dirname(out);
fs.writeFileSync(path.join(dir, 'sw.js'), fs.readFileSync(path.join(root, 'src', 'sw.js'), 'utf8').replace(/\{\{version\}\}/g, version));
fs.copyFileSync(path.join(root, 'src', 'manifest.webmanifest'), path.join(dir, 'manifest.webmanifest'));
fs.mkdirSync(path.join(dir, 'icons'), { recursive: true });
fs.readdirSync(path.join(root, 'src', 'icons')).forEach(f => fs.copyFileSync(path.join(root, 'src', 'icons', f), path.join(dir, 'icons', f)));
console.log(`built ${out} (${html.length} bytes)`);
