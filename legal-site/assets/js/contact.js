(function () {
  var form = document.getElementById('contact-form');
  var successEl = document.getElementById('form-success');
  var errorEl = document.getElementById('form-error');

  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var submitBtn = form.querySelector('[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Envoi en cours…';

    var formData = new FormData(form);

    fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(formData).toString(),
    })
      .then(function (res) {
        if (res.ok) {
          form.reset();
          successEl.style.display = 'block';
          errorEl.style.display = 'none';
          submitBtn.textContent = 'Message envoyé ✓';
        } else {
          throw new Error('Network response was not ok');
        }
      })
      .catch(function () {
        errorEl.style.display = 'block';
        successEl.style.display = 'none';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Envoyer le message';
      });
  });
})();
