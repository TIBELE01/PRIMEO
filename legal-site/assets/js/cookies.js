(function () {
  var COOKIE_KEY = 'primeo_cookie_consent';
  var banner = document.getElementById('cookie-banner');

  function getCookie(name) {
    var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
  }

  function setCookie(name, value, days) {
    var expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = name + '=' + value + '; expires=' + expires + '; path=/; SameSite=Lax; Secure';
  }

  /* Google Analytics 4 : chargé UNIQUEMENT après acceptation des cookies et si un ID de
     mesure est configuré côté API (variable GA4_MEASUREMENT_ID, lue via
     /api/website/public-config). Sans ID ou sans consentement : aucun traceur. */
  var gaStarted = false;
  function startAnalytics() {
    if (gaStarted || getCookie(COOKIE_KEY) !== 'accepted' || !window.fetch) return;
    gaStarted = true;
    fetch('https://api.primeo.ci/api/website/public-config')
      .then(function (r) { return r.ok ? r.json() : {}; })
      .then(function (c) {
        var id = c && (c.data || c).ga4MeasurementId;
        if (!id || !/^G-[A-Z0-9]+$/.test(id) || window.gtag) return;
        var s = document.createElement('script');
        s.async = true;
        s.src = 'https://www.googletagmanager.com/gtag/js?id=' + id;
        document.head.appendChild(s);
        window.dataLayer = window.dataLayer || [];
        window.gtag = function () { window.dataLayer.push(arguments); };
        window.gtag('js', new Date());
        window.gtag('config', id, { anonymize_ip: true, allow_google_signals: false, allow_ad_personalization_signals: false });
      })
      .catch(function () { /* API injoignable : pas de mesure */ });
  }

  window.hideCookieBanner = function (accepted) {
    setCookie(COOKIE_KEY, accepted ? 'accepted' : 'declined', 365);
    if (banner) banner.style.display = 'none';
    if (accepted) startAnalytics();
  };

  // Alias utilisés par les boutons du footer commun.
  window.acceptCookies  = function () { window.hideCookieBanner(true); };
  window.declineCookies = function () { window.hideCookieBanner(false); };

  // Réinitialise le consentement et réaffiche le bandeau (page /cookies/).
  window.resetCookieConsent = function () {
    document.cookie = COOKIE_KEY + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    if (banner) banner.style.display = 'flex';
  };

  startAnalytics();

  if (banner) {
    var consent = getCookie(COOKIE_KEY);
    if (consent) {
      banner.style.display = 'none';
    } else {
      banner.style.display = 'flex';
    }
  }
})();
