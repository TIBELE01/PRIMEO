/* Page « Nos solutions » : récupère les blocs depuis l'API (repli : data/solutions.json)
   et les affiche en bandeaux alternés image / contenu. Les icônes fournies par l'API
   (emojis) sont remplacées par des icônes vectorielles. */
(function () {
  'use strict';

  var ICONS = {
    plane: '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',
    building: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/>',
    utensils: '<path d="M3 2v7a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V2M6 2v20M21 15V2a5 5 0 0 0-5 5v6a2 2 0 0 0 2 2zM18 15v7"/>',
    home: '<path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    award: '<circle cx="12" cy="8" r="6"/><path d="M15.5 13.5 17 22l-5-3-5 3 1.5-8.5"/>',
    card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
    cube: '<path d="M21 16V8l-9-5-9 5v8l9 5 9-5z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/>',
    phone: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
    shield: '<path d="M12 2 4 5v6c0 5 3.4 8.7 8 11 4.6-2.3 8-6 8-11V5z"/><path d="m9 12 2 2 4-4"/>',
    clipboard: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    chart: '<path d="M3 3v18h18"/><path d="M7 15v3M12 10v8M17 6v12"/>',
    chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    gift: '<path d="M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>',
    star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.3L5.8 21 7 14.2 2 9.3l6.9-1z"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
    camera: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z"/>',
    check: '<path d="m5 12 5 5L20 7"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>'
  };
  var EMOJI = {
    '✈️': 'plane', '🏨': 'building', '🍽️': 'utensils', '🏗️': 'home', '🏠': 'home', '🔍': 'search', '🏅': 'award',
    '💳': 'card', '🔭': 'cube', '📱': 'phone', '🛡️': 'shield', '📋': 'clipboard', '📅': 'calendar', '📊': 'chart',
    '💬': 'chat', '🍴': 'utensils', '🎉': 'gift', '⭐': 'star', '📍': 'pin', '📷': 'camera', '👥': 'users',
    '📝': 'pen', '🌍': 'globe'
  };
  var IMAGES = [
    'https://res.cloudinary.com/dlnnxvepd/image/upload/c_fill,g_auto,w_960,h_740,q_auto,f_auto/primeo/properties/Hotels/18275d68-1ce7-4b00-83f3-788d6e973ee9/images/jfgeh2amzxbd6ozokgch.jpg',
    'https://res.cloudinary.com/dlnnxvepd/image/upload/c_fill,g_auto,w_960,h_740,q_auto,f_auto/primeo/properties/Hotels/83f33a22-8f38-409e-b349-9fd0029b5187/images/jkzrie6ilpgecrvtzmse.jpg',
    'https://res.cloudinary.com/dlnnxvepd/image/upload/c_fill,g_auto,w_960,h_740,q_auto,f_auto/primeo/properties/Restaurants/0f3cb52b-5c95-4cbb-831f-7d2f08468a1e/images/efvtvyojt5hd0ttycmei.jpg',
    'https://res.cloudinary.com/dlnnxvepd/image/upload/c_fill,g_auto,w_960,h_740,q_auto,f_auto/primeo/properties/RealEstates/a47be29b-39f9-4699-9f28-3f442922657c/images/bbc7hwpqnaapt5a2s4g5.jpg'
  ];
  var TAB_LABELS = ['Voyageurs', 'Hôteliers', 'Restaurateurs', 'Immobilier'];

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function svg(name) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[name] || ICONS.check) + '</svg>';
  }
  function iconFor(emoji, fallback) {
    var key = String(emoji || '').replace(/️/g, '');
    for (var e in EMOJI) { if (e.replace(/️/g, '') === key) return EMOJI[e]; }
    return fallback || 'check';
  }
  function blocIcon(b) { return iconFor(b.icon, 'building'); }
  function safeUrl(u) { return /^(\/|https?:\/\/|#)/.test(u || '') ? u : '#'; }

  function tabsHtml(blocs) {
    return '<div class="container"><nav class="sol-tabs" aria-label="Profils">' + blocs.map(function (b, i) {
      return '<a class="sol-tab" href="#sol-' + i + '"><span class="sol-tab__ico">' + svg(blocIcon(b)) + '</span>' +
        esc(TAB_LABELS[i] || b.title) + '</a>';
    }).join('') + '</nav></div>';
  }

  function blocHtml(b, i) {
    var feats = (Array.isArray(b.features) ? b.features : []).map(function (f) {
      return '<li class="sol-feat"><span class="sol-feat__ico">' + svg(iconFor(f.icon)) + '</span><span>' + esc(f.text) + '</span></li>';
    }).join('');
    var num = (i + 1 < 10 ? '0' : '') + (i + 1);
    return '<div class="sol-band"><div class="container"><article class="sol-row' + (i % 2 ? ' is-reverse' : '') + ' reveal" id="sol-' + i + '">' +
      '<div class="sol-media"><img src="' + IMAGES[i % IMAGES.length] + '" alt="' + esc(b.title) + '" loading="' + (i === 0 ? 'eager' : 'lazy') + '" width="960" height="740">' +
      '<div class="sol-chip"><span class="sol-chip__ico">' + svg(blocIcon(b)) + '</span><span class="sol-chip__txt">' + esc(b.subtitle || '') + '</span></div></div>' +
      '<div class="sol-content"><span class="sol-num">' + num + '</span><h3>' + esc(b.title) + '</h3>' +
      '<p class="sol-desc">' + esc(b.description || '') + '</p>' +
      (feats ? '<ul class="sol-feats">' + feats + '</ul>' : '') +
      (b.ctaLabel ? '<a href="' + esc(safeUrl(b.ctaUrl)) + '" class="btn btn-primary sol-cta-link">' + esc(b.ctaLabel) + svg('arrow') + '</a>' : '') +
      '</div></article></div></div>';
  }

  function unwrap(r) { return r && typeof r === 'object' && !Array.isArray(r) && r.data !== undefined ? r.data : r; }
  function get(url) {
    var o = { headers: { Accept: 'application/json' } };
    if (typeof AbortController !== 'undefined') { var c = new AbortController(); setTimeout(function () { c.abort(); }, 5000); o.signal = c.signal; }
    return fetch(url, o).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(unwrap);
  }

  function render(data) {
    var intro = data.intro || {}, blocs = data.blocs || [];
    var h = document.getElementById('solutions-page-headline'), p = document.getElementById('solutions-page-intro'),
        s = document.getElementById('solutions-page-subtext');
    if (h && intro.headline) h.textContent = intro.headline;
    if (s && intro.subtext) s.textContent = intro.subtext;
    if (p && intro.subtext) p.textContent = intro.subtext;
    var list = document.getElementById('solutions-list'), tabs = document.getElementById('solutions-tabs');
    if (!list || !blocs.length) return;
    list.innerHTML = blocs.map(blocHtml).join('');
    if (tabs) tabs.innerHTML = tabsHtml(blocs);
  }

  if (typeof module !== 'undefined' && module.exports) { module.exports = { blocHtml: blocHtml, tabsHtml: tabsHtml }; return; }

  function init() {
    var m = document.querySelector('meta[name="api-url"]');
    var api = m ? m.content.replace(/\/$/, '') : 'https://api.primeo.ci';
    Promise.all([
      get(api + '/api/website/solutions/intro').catch(function () { return null; }),
      get(api + '/api/website/solutions/blocs').catch(function () { return null; })
    ]).then(function (r) {
      if (r[0] && r[1]) return { intro: r[0], blocs: r[1] };
      return fetch('../data/solutions.json', { headers: { Accept: 'application/json' } }).then(function (x) { if (!x.ok) throw new Error(x.status); return x.json(); });
    }).then(render).catch(function (e) { console.warn('[solutions.js]', e); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
