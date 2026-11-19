'use strict';
/* Bundles src/hero/hero.src.js with three.js into src/hero/hero.js (one minified ES module, three's MIT notice kept).
   Needs `npm install --prefix tools` once. The output is committed, so the normal build and CI do not need three.
   Usage: node tools/build-hero.js */
const path = require('path');
const root = path.join(__dirname, '..');
const esbuild = require('esbuild');
esbuild.build({
  entryPoints: [path.join(root, 'src', 'hero', 'hero.src.js')],
  outfile: path.join(root, 'src', 'hero', 'hero.js'),
  bundle: true, nodePaths: [path.join(__dirname, 'node_modules')], minify: true, format: 'esm', target: 'es2020', legalComments: 'inline', logLevel: 'info'
}).catch(() => process.exit(1));
