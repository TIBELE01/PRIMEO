/* Page Espace professionnel : témoignages réels (gérés depuis l'admin), 4 au plus — section masquée s'il n'y en a pas. */
(function () {
  'use strict';
  var meta = document.querySelector('meta[name="api-url"]');
  var API = meta ? meta.content.replace(/\/$/, '') : 'https://api.primeo.ci';
  var section = document.getElementById('temoignages');
  var grid = document.getElementById('pro-testimonials');
  if (!section || !grid) return;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function card(t) {
    var rating = Math.max(0, Math.min(5, Math.round(Number(t.rating) || 5)));
    var stars = '★★★★★'.slice(0, rating) + '<span style="color:#e5e7eb">' + '★★★★★'.slice(rating) + '</span>';
    var avatar = t.photoUrl
      ? '<img src="' + esc(t.photoUrl) + '" alt="" loading="lazy">'
      : esc((t.name || '?').charAt(0).toUpperCase());
    return '<article class="pro-testimonial">' +
      '<div class="pro-testimonial__stars" aria-label="Note : ' + rating + ' sur 5">' + stars + '</div>' +
      '<p class="pro-testimonial__text">« ' + esc(t.text) + ' »</p>' +
      '<div class="pro-testimonial__who"><div class="pro-testimonial__avatar">' + avatar + '</div><div>' +
      '<div class="pro-testimonial__name">' + esc(t.name) + '</div>' +
      (t.role ? '<div class="pro-testimonial__role">' + esc(t.role) + '</div>' : '') +
      '</div></div></article>';
  }

  fetch(API + '/api/website/home/testimonials', { headers: { Accept: 'application/json' } })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (d) {
      d = d && typeof d === 'object' && !Array.isArray(d) && d.data !== undefined ? d.data : d;
      var items = (Array.isArray(d) ? d : (d && (d.testimonials || d.items)) || [])
        .filter(function (t) { return t && t.text && t.active !== false; })
        .slice(0, 4);
      if (!items.length) return;
      grid.innerHTML = items.map(card).join('');
      section.hidden = false;
    })
    .catch(function () { /* pas de témoignages : section laissée masquée */ });
})();
