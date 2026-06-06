/**
 * build.js — Minify CSS and JS assets for production.
 * Run via: npm run build
 * Overwrites files in-place; assets/ dir is served with 1-year immutable cache.
 */
'use strict';

const fs   = require('fs');
const path = require('path');

let totalSaved = 0;

/* ── CSS ─────────────────────────────────────────────────────────────────── */
function minifyCSS() {
  const CleanCSS = require('clean-css');
  const css = new CleanCSS({ level: 2, returnPromise: false });
  const dir  = path.join(__dirname, 'assets', 'css');

  fs.readdirSync(dir).filter(f => f.endsWith('.css')).forEach(file => {
    const fp   = path.join(dir, file);
    const src  = fs.readFileSync(fp, 'utf8');
    const out  = css.minify(src);
    if (out.errors && out.errors.length) {
      console.error('CSS error in', file, out.errors);
      return;
    }
    const saved = src.length - out.styles.length;
    totalSaved += saved;
    fs.writeFileSync(fp, out.styles);
    console.log('CSS', file, `${(src.length/1024).toFixed(1)}KB → ${(out.styles.length/1024).toFixed(1)}KB (-${saved} bytes)`);
  });
}

/* ── JS ──────────────────────────────────────────────────────────────────── */
async function minifyJS() {
  const { minify } = require('terser');
  const dir = path.join(__dirname, 'assets', 'js');

  for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) {
    const fp  = path.join(dir, file);
    const src = fs.readFileSync(fp, 'utf8');
    let result;
    try {
      result = await minify(src, {
        compress: { drop_console: false, passes: 2 },
        mangle: true,
        format: { comments: false }
      });
    } catch (err) {
      console.error('JS error in', file, err.message);
      continue;
    }
    if (!result.code) continue;
    const saved = src.length - result.code.length;
    totalSaved += saved;
    fs.writeFileSync(fp, result.code);
    console.log('JS ', file, `${(src.length/1024).toFixed(1)}KB → ${(result.code.length/1024).toFixed(1)}KB (-${saved} bytes)`);
  }
}

/* ── Main ────────────────────────────────────────────────────────────────── */
(async () => {
  console.log('Building Primeo Vitrine…\n');
  try {
    minifyCSS();
    await minifyJS();
    console.log(`\nDone. Total saved: ${(totalSaved / 1024).toFixed(1)} KB`);
  } catch (err) {
    console.error('Build failed:', err);
    process.exit(1);
  }
})();
