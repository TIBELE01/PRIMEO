/* Page Contact : formulaire (validation + envoi), copie d'adresse, état des horaires,
   carte interactive Geoapify (MapLibre GL) avec repli sur image statique puis OpenStreetMap. */
(function () {
  'use strict';

  var meta = document.querySelector('meta[name="api-url"]');
  var API = meta ? meta.content.replace(/\/$/, '') : 'https://api.primeo.ci';
  var LAT = 5.3615, LON = -3.98;
  var GMAPS = 'https://www.google.com/maps/dir/?api=1&destination=' + LAT + ',' + LON;

  function request(url, opts) {
    var ctrl = new AbortController(), timer = setTimeout(function () { ctrl.abort(); }, 8000);
    return fetch(url, Object.assign({ signal: ctrl.signal }, opts)).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (body) {
        if (!res.ok) { var e = new Error(body.message || body.error || res.statusText); e.status = res.status; e.body = body; throw e; }
        return body;
      });
    }).finally(function () { clearTimeout(timer); });
  }

  /* ── Copie de l'adresse ─────────────────────────────────────────────── */
  function initCopy() {
    document.querySelectorAll('[data-copy]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var toast = document.getElementById('copy-toast');
        (navigator.clipboard ? navigator.clipboard.writeText(btn.dataset.copy) : Promise.reject()).then(function () {
          if (!toast) return;
          toast.classList.add('visible');
          setTimeout(function () { toast.classList.remove('visible'); }, 2200);
        }).catch(function () {});
      });
    });
  }

  /* ── Horaires : jour courant + statut ouvert/fermé (heure d'Abidjan = UTC) ── */
  function initHours() {
    var live = document.getElementById('ct-hours-live');
    if (!live) return;
    var now = new Date(), day = now.getUTCDay(), mins = now.getUTCHours() * 60 + now.getUTCMinutes();
    var slots = { 1: [540, 1080], 2: [540, 1080], 3: [540, 1080], 4: [540, 1080], 5: [540, 1080], 6: [600, 960] };
    var s = slots[day], open = !!s && mins >= s[0] && mins < s[1];
    document.querySelectorAll('.ct-hours__row[data-days]').forEach(function (row) {
      if (row.dataset.days.split(',').indexOf(String(day)) !== -1) row.classList.add('is-today');
    });
    live.hidden = false;
    live.className = 'ct-hours__live ' + (open ? 'is-open' : 'is-closed');
    live.textContent = open ? 'Ouvert maintenant' : 'Fermé actuellement';
  }

  /* ── Formulaire ─────────────────────────────────────────────────────── */
  function initForm() {
    var form = document.getElementById('contact-form');
    if (!form) return;
    var btn = document.getElementById('submit-btn'), label = document.getElementById('submit-label'),
        spin = document.getElementById('submit-spinner'), errBox = document.getElementById('form-error'),
        msg = document.getElementById('ct-message'), counter = document.getElementById('char-count');

    function busy(on) { btn.disabled = on; label.style.display = on ? 'none' : ''; spin.style.display = on ? 'inline-block' : 'none'; }
    function fail(el, text) {
      var err = document.getElementById('err-' + el.id.replace('ct-', ''));
      el.classList.add('ct-input--error'); el.classList.remove('ct-input--valid');
      if (err) err.textContent = text; return false;
    }
    function ok(el) {
      var err = document.getElementById('err-' + el.id.replace('ct-', ''));
      el.classList.remove('ct-input--error'); el.classList.add('ct-input--valid');
      if (err) err.textContent = ''; return true;
    }
    function check(el) {
      var n = el.name, v = el.value.trim();
      if (n === 'name') { if (!v) return fail(el, 'Le nom est requis.'); if (v.length < 2) return fail(el, 'Le nom doit contenir au moins 2 caractères.'); }
      if (n === 'email') { if (!v) return fail(el, "L'e-mail est requis."); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return fail(el, "L'e-mail n'est pas valide."); }
      if (n === 'phone' && v && !/^[+\d][\d\s\-().]{7,}$/.test(v)) return fail(el, 'Numéro de téléphone invalide.');
      if (n === 'subject' && !v) return fail(el, 'Veuillez choisir un sujet.');
      if (n === 'message') {
        if (!v) return fail(el, 'Le message est requis.');
        if (v.length < 10) return fail(el, 'Le message doit contenir au moins 10 caractères.');
        if (v.length > 2000) return fail(el, 'Le message dépasse 2000 caractères.');
      }
      return ok(el);
    }

    if (msg && counter) msg.addEventListener('input', function () {
      var n = msg.value.length; counter.textContent = n + ' / 2000'; counter.style.color = n > 1900 ? '#ef4444' : '';
    });
    form.querySelectorAll('.ct-input').forEach(function (el) {
      el.addEventListener('blur', function () { check(el); });
      el.addEventListener('input', function () { if (el.classList.contains('ct-input--error')) check(el); });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var valid = true;
      form.querySelectorAll('.ct-input').forEach(function (el) { if (el.name !== 'email_confirm' && !check(el)) valid = false; });
      if (!valid) return;
      var trap = form.querySelector('[name="email_confirm"]');
      if (trap && trap.value) return;
      if (errBox) errBox.style.display = 'none';
      busy(true);
      var f = function (n) { return form.querySelector('[name="' + n + '"]').value.trim(); };
      request(API + '/api/website/contact', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: f('name'), email: f('email'), phone: f('phone') || undefined, subject: f('subject'), message: f('message'), email_confirm: trap ? trap.value : '' })
      }).then(function () { window.location.href = '/contact/merci.html'; }).catch(function (err) {
        var text = 'Une erreur est survenue. Veuillez réessayer ou écrire à contact@primeo.ci.';
        if (err.status === 429) text = 'Trop de messages envoyés. Merci de réessayer dans une heure.';
        else if (err.status === 400 && err.body) {
          var fields = err.body.errors || err.body.details;
          if (fields && typeof fields === 'object') {
            Object.keys(fields).forEach(function (k) {
              var er = document.getElementById('err-' + k), inp = form.querySelector('[name="' + k + '"]');
              if (er) er.textContent = Array.isArray(fields[k]) ? fields[k][0] : fields[k];
              if (inp) { inp.classList.add('ct-input--error'); inp.classList.remove('ct-input--valid'); }
            });
            text = 'Veuillez corriger les erreurs ci-dessus.';
          }
        } else if (err.body && err.body.message) text = err.body.message;
        if (errBox) { errBox.textContent = text; errBox.style.display = 'flex'; }
      }).finally(function () { busy(false); });
    });
  }

  /* ── Carte ──────────────────────────────────────────────────────────── */
  function fallbackMap(box, key) {
    box.innerHTML = '';
    if (key) {
      var img = document.createElement('img');
      img.src = 'https://maps.geoapify.com/v1/staticmap?style=osm-bright&width=1200&height=520&center=lonlat:' + LON + ',' + LAT +
        '&zoom=15&marker=lonlat:' + LON + ',' + LAT + ';type:awesome;color:%231056e0;size:large&apiKey=' + encodeURIComponent(key);
      img.alt = 'Carte — Cocody Saint Viateur, Abidjan'; img.loading = 'lazy';
      img.addEventListener('click', function () { window.open(GMAPS, '_blank', 'noopener'); });
      box.appendChild(img);
    } else {
      var f = document.createElement('iframe');
      f.src = 'https://www.openstreetmap.org/export/embed.html?bbox=' + (LON - 0.01) + ',' + (LAT - 0.01) + ',' + (LON + 0.01) + ',' + (LAT + 0.01) + '&layer=mapnik&marker=' + LAT + ',' + LON;
      f.title = 'Carte — Cocody Saint Viateur, Abidjan'; f.loading = 'lazy';
      box.appendChild(f);
    }
  }
  function whenMapLibre(cb, tries) {
    if (window.maplibregl) return cb(true);
    if ((tries || 0) > 40) return cb(false);
    setTimeout(function () { whenMapLibre(cb, (tries || 0) + 1); }, 150);
  }
  function initMap() {
    var box = document.getElementById('ct-map');
    if (!box) return;
    var link = document.getElementById('open-map-btn'); if (link) link.href = GMAPS;
    request(API + '/api/website/public-config').then(function (c) { return c.geoapifyKey || ''; }).catch(function () { return ''; }).then(function (key) {
      if (!key) return fallbackMap(box, '');
      whenMapLibre(function (loaded) {
        if (!loaded) return fallbackMap(box, key);
        try {
          box.innerHTML = '';
          var map = new maplibregl.Map({
            container: box,
            style: 'https://maps.geoapify.com/v1/styles/osm-bright/style.json?apiKey=' + encodeURIComponent(key),
            center: [LON, LAT], zoom: 14.6, cooperativeGestures: true, attributionControl: { compact: true }
          });
          map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
          var pin = document.createElement('div'); pin.className = 'ct-pin';
          new maplibregl.Marker({ element: pin, anchor: 'bottom' }).setLngLat([LON, LAT]).addTo(map);
          map.on('error', function (ev) { if (ev && ev.error && /40[13]|Failed|NetworkError/i.test(String(ev.error.message || ev.error.status))) { map.remove(); fallbackMap(box, key); } });
        } catch (e) { fallbackMap(box, key); }
      });
    });
  }

  function init() { initCopy(); initHours(); initForm(); initMap(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
