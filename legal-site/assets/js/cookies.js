(function () {
  var COOKIE_KEY = 'primeo_cookie_consent';
  var banner = document.getElementById('cookie-banner');

  function getCookie(name) {
    var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
  }

  function setCookie(name, value, days) {
    var expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = name + '=' + value + '; expires=' + expires + '; path=/; SameSite=Lax';
  }

  window.hideCookieBanner = function (accepted) {
    setCookie(COOKIE_KEY, accepted ? 'accepted' : 'declined', 365);
    if (banner) banner.style.display = 'none';
  };

  if (banner) {
    var consent = getCookie(COOKIE_KEY);
    if (consent) {
      banner.style.display = 'none';
    } else {
      banner.style.display = 'flex';
    }
  }
})();
