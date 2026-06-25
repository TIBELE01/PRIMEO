/**
 * generate-sitemap.js — Build sitemap.xml from the actual page tree.
 *
 * Pure Node (no deps). Scans every directory containing an index.html, the
 * documentation guides, and the blog articles via la base (API publique
 * /api/website/blog/posts), then emits a sitemap with per-section
 * <priority>/<changefreq>. Run via build.js or:
 *   node scripts/generate-sitemap.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BASE = 'https://primeo.ci';
const TODAY = new Date().toISOString().slice(0, 10);

// Per-path SEO weighting. Key = URL path ('' is the homepage).
const RULES = {
  '': { priority: '1.0', changefreq: 'weekly' },
  'solutions': { priority: '0.9', changefreq: 'monthly' },
  'produits': { priority: '0.9', changefreq: 'monthly' },
  'professionnels': { priority: '0.9', changefreq: 'monthly' },
  'devenir-partenaire': { priority: '0.8', changefreq: 'monthly' },
  'telechargement': { priority: '0.8', changefreq: 'monthly' },
  'blog': { priority: '0.8', changefreq: 'weekly' },
  'carrieres': { priority: '0.7', changefreq: 'weekly' },
  'a-propos': { priority: '0.7', changefreq: 'monthly' },
  'aide': { priority: '0.7', changefreq: 'monthly' },
  'documentation': { priority: '0.7', changefreq: 'monthly' },
  'communaute': { priority: '0.6', changefreq: 'monthly' },
  'engagement': { priority: '0.6', changefreq: 'monthly' },
  'espace-presse': { priority: '0.6', changefreq: 'monthly' },
  'contact': { priority: '0.5', changefreq: 'yearly' },
};
const DEFAULT_RULE = { priority: '0.5', changefreq: 'monthly' };

// Directories/files never indexed.
const SKIP_DIRS = new Set(['node_modules', 'assets', 'data', 'templates', 'scripts', '.git']);

function urlEntry(loc, { priority, changefreq }, lastmod = TODAY) {
  return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

async function build() {
  const entries = [];

  // Homepage
  entries.push(urlEntry(`${BASE}/`, RULES['']));

  // One entry per top-level directory holding an index.html
  for (const name of fs.readdirSync(ROOT)) {
    if (SKIP_DIRS.has(name) || name.startsWith('.')) continue;
    const dir = path.join(ROOT, name);
    if (!fs.statSync(dir).isDirectory()) continue;
    if (!fs.existsSync(path.join(dir, 'index.html'))) continue;
    entries.push(urlEntry(`${BASE}/${name}/`, RULES[name] || DEFAULT_RULE));
  }

  // Documentation guides (standalone .html content pages)
  const docDir = path.join(ROOT, 'documentation');
  if (fs.existsSync(docDir)) {
    for (const f of fs.readdirSync(docDir)) {
      if (f.startsWith('guide-') && f.endsWith('.html')) {
        entries.push(urlEntry(`${BASE}/documentation/${f}`, { priority: '0.5', changefreq: 'yearly' }));
      }
    }
  }

  // Blog articles — source de vérité : table blog_posts (via l'API publique).
  // Échec réseau au build → on saute simplement les URLs d'articles.
  try {
    const apiBase = (process.env.PRIMEO_API_URL || 'https://primeo-api-xhef.onrender.com').replace(/\/$/, '');
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(`${apiBase}/api/website/blog/posts?limit=100`, { signal: ctrl.signal });
    clearTimeout(timer);
    const json = await res.json();
    // Tolère { data: { posts } }, { posts }, { data: [...] } ou [...]
    const payload = json && json.data !== undefined ? json.data : json;
    const posts = Array.isArray(payload) ? payload : (payload && payload.posts) || [];
    for (const post of posts) {
      if (!post || !post.slug) continue;
      const lastmod = (post.publishedAt || TODAY).slice(0, 10);
      entries.push(
        urlEntry(`${BASE}/blog/article.html?slug=${encodeURIComponent(post.slug)}`, { priority: '0.6', changefreq: 'monthly' }, lastmod),
      );
    }
  } catch {
    /* API blog indisponible au build — articles couverts au prochain build */
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>
`;

  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), xml);
  console.log(`  ✓ sitemap.xml — ${entries.length} URLs`);
}

if (require.main === module) {
  build().catch((err) => { console.error('sitemap build failed:', err); process.exit(1); });
}
module.exports = { build };
