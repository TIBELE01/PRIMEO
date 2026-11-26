/* Formulaire de contact du site légal : envoi à l'API Primeo (/api/website/contact).
   Le message est aiguillé vers la bonne boîte selon le sujet (juridique, données, litiges…). */
(function () {
  var form = document.getElementById('contact-form');
  var successEl = document.getElementById('form-success');
  var errorEl = document.getElementById('form-error');
  if (!form) return;

  var meta = document.querySelector('meta[name="api-url"]');
  var API = meta ? meta.content.replace(/\/$/, '') : 'https://api.primeo.ci';

  // Libellés envoyés à l'API : ils déterminent la boîte destinataire
  var SUBJECTS = {
    cgu: 'Question juridique — CGU',
    confidentialite: 'Protection des données personnelles',
    paiement: 'Litige de paiement',
    suppression: 'Suppression de compte et des données',
    signalement: 'Signalement de contenu',
    partenariat: 'Partenariat professionnel',
    autre: 'Autre demande',
  };
  var DEFAULT_ERROR = errorEl ? errorEl.innerHTML : '';

  function showError(html) {
    if (!errorEl) return;
    errorEl.innerHTML = html || DEFAULT_ERROR;
    errorEl.style.display = 'block';
    if (successEl) successEl.style.display = 'none';
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var v = function (n) { var el = form.querySelector('[name="' + n + '"]'); return el ? el.value.trim() : ''; };

    // Champ piège invisible : un robot le remplit, on simule le succès
    if (v('bot-field')) { form.reset(); if (successEl) successEl.style.display = 'block'; return; }

    if (!form.checkValidity()) { form.reportValidity(); return; }
    if (v('message').length < 10) { showError('Le message doit contenir au moins 10 caractères.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v('email'))) { showError("L'adresse email n'est pas valide."); return; }

    var submitBtn = form.querySelector('[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Envoi en cours…';
    if (errorEl) errorEl.style.display = 'none';

    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, 20000);

    fetch(API + '/api/website/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: ctrl.signal,
      body: JSON.stringify({
        name: v('name'),
        email: v('email'),
        phone: v('phone') || undefined,
        subject: SUBJECTS[v('subject')] || 'Autre demande',
        message: v('message'),
      }),
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (body) {
          if (!res.ok) { var err = new Error(body.message || 'Erreur'); err.status = res.status; err.body = body; throw err; }
          return body;
        });
      })
      .then(function () {
        form.reset();
        if (successEl) successEl.style.display = 'block';
        if (errorEl) errorEl.style.display = 'none';
        submitBtn.textContent = 'Message envoyé ✓';
      })
      .catch(function (err) {
        var msg = '';
        if (err.status === 429) msg = 'Trop de messages envoyés. Merci de réessayer dans une heure.';
        else if (err.status === 400 && err.body && err.body.errors) {
          var first = Object.keys(err.body.errors)[0];
          var val = first && err.body.errors[first];
          msg = Array.isArray(val) ? val[0] : (val || '');
        } else if (err.name === 'AbortError' || err instanceof TypeError) {
          msg = 'Impossible de joindre le serveur. Vérifiez votre connexion et réessayez, ou écrivez à <a href="mailto:contact@primeo.ci">contact@primeo.ci</a>.';
        }
        showError(msg);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Envoyer le message';
      })
      .finally(function () { clearTimeout(timer); });
  });
})();
