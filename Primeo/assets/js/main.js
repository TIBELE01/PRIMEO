!function(){"use strict";const e=document.currentScript,t=e&&e.getAttribute("data-base")||".";function n(e,n,a){const o=document.getElementById(e);o&&fetch(n).then(function(e){if(!e.ok)throw new Error("Template introuvable : "+n);return e.text()}).then(function(e){o.innerHTML=e,"function"==typeof a&&a()}).catch(function(n){console.warn("[Primeo] "+n.message),"header-placeholder"===e&&(o.innerHTML='<header class="site-header"><div class="header-inner"><a href="'+t+'/index.html" class="nav-logo">PRIM<span>EO</span></a></div></header>')})}function a(){n("header-placeholder",t+"/templates/header.html",function(){!function(){var e=document.getElementById("burger"),t=document.getElementById("mobile-nav"),n=document.getElementById("mobile-nav-close");if(e&&t){var a=document.createElement("div");a.className="mobile-nav-overlay",a.setAttribute("aria-hidden","true"),document.body.appendChild(a),e.addEventListener("click",function(){t.classList.contains("open")?o():(t.classList.add("open"),a.classList.add("open"),t.setAttribute("aria-hidden","false"),e.setAttribute("aria-expanded","true"),document.body.classList.add("menu-open"))}),n&&n.addEventListener("click",o),a.addEventListener("click",o),t.addEventListener("click",function(e){e.target.closest(".mobile-nav__link, .mobile-nav__sub-link")&&o()}),t.addEventListener("click",function(e){var n=e.target.closest(".mobile-nav__group-btn");if(n){var a=n.closest(".mobile-nav__group"),o=a&&a.querySelector(".mobile-nav__sub");if(a&&o){var i=a.classList.contains("is-open");t.querySelectorAll(".mobile-nav__group.is-open").forEach(function(e){if(e!==a){e.classList.remove("is-open");var t=e.querySelector(".mobile-nav__sub");t&&(t.style.maxHeight="0"),e.querySelector(".mobile-nav__group-btn").setAttribute("aria-expanded","false");var n=e.querySelector(".mobile-nav__sub");n&&n.setAttribute("aria-hidden","true")}}),i?(a.classList.remove("is-open"),o.style.maxHeight="0",n.setAttribute("aria-expanded","false"),o.setAttribute("aria-hidden","true")):(a.classList.add("is-open"),o.style.maxHeight=o.scrollHeight+"px",n.setAttribute("aria-expanded","true"),o.setAttribute("aria-hidden","false"))}}}),document.addEventListener("keydown",function(e){"Escape"===e.key&&o()})}function o(){t.classList.remove("open"),a.classList.remove("open"),t.setAttribute("aria-hidden","true"),e.setAttribute("aria-expanded","false"),document.body.classList.remove("menu-open")}}(),function(){var e=document.querySelectorAll(".nav-item--dropdown");function t(){e.forEach(function(e){e.classList.remove("is-open");var t=e.querySelector(".nav-item__btn");t&&t.setAttribute("aria-expanded","false")})}e.length&&(e.forEach(function(e){var n=e.querySelector(".nav-item__btn");n&&n.addEventListener("click",function(a){a.stopPropagation();var o=e.classList.contains("is-open");t(),o||(e.classList.add("is-open"),n.setAttribute("aria-expanded","true"))})}),document.addEventListener("click",function(e){e.target.closest(".nav-item--dropdown")||t()}),window.addEventListener("scroll",t,{passive:!0}),document.addEventListener("keydown",function(e){"Escape"===e.key&&t()}))}(),function(){var e=window.location.pathname;e=e.replace(/\/index\.html$/,"/").replace(/\/+$/,"")||"/";var t=[".nav-item--link[data-page]",".nav-dd-item[data-page]",".mobile-nav__link[data-page]",".mobile-nav__sub-link[data-page]"].join(", ");document.querySelectorAll(t).forEach(function(t){var n=t.getAttribute("data-page");t.classList.remove("active"),t.removeAttribute("aria-current");var a="home"===n||"accueil"===n;if(a&&(""===e||"/"===e||e.endsWith("/Primeo"))||!a&&e.includes("/"+n)){t.classList.add("active"),t.setAttribute("aria-current","page");var o=t.closest(".nav-item--dropdown");o&&o.classList.add("is-active");var i=t.closest(".mobile-nav__group");if(i){var r=i.querySelector(".mobile-nav__sub");if(r){i.classList.add("is-open"),r.style.maxHeight=r.scrollHeight+"px";var c=i.querySelector(".mobile-nav__group-btn");c&&c.setAttribute("aria-expanded","true"),r.setAttribute("aria-hidden","false")}}}})}(),function(){var e=document.querySelector(".site-header");function t(){window.scrollY>20?e.classList.add("scrolled"):e.classList.remove("scrolled")}e&&(window.addEventListener("scroll",t,{passive:!0}),t())}()}),n("footer-placeholder",t+"/templates/footer.html")}var o="primeo_cookie_consent";function i(e,t,n){var a=new Date(Date.now()+864e5*n).toUTCString();document.cookie=e+"="+t+"; expires="+a+"; path=/; SameSite=Lax"}function r(){var e;a(),function(){var e=document.getElementById("cookie-banner");if(e)if(t=o,(n=document.cookie.match(new RegExp("(^| )"+t+"=([^;]+)")))&&n[2])e.style.display="none";else{var t,n;e.style.display="flex";var a=e.querySelector("#cookie-accept, .cookie-accept"),r=e.querySelector("#cookie-decline, .cookie-decline");a&&a.addEventListener("click",function(){i(o,"accepted",365),e.style.display="none"}),r&&r.addEventListener("click",function(){i(o,"declined",365),e.style.display="none"})}}(),function(){if("IntersectionObserver"in window){var e=new IntersectionObserver(function(t){t.forEach(function(t){t.isIntersecting&&(t.target.classList.add("revealed"),e.unobserve(t.target))})},{threshold:.12});document.querySelectorAll(".reveal").forEach(function(t){e.observe(t)}),"MutationObserver"in window&&new MutationObserver(function(e){var t=[];e.forEach(function(e){e.addedNodes.forEach(function(e){1===e.nodeType&&(e.classList&&e.classList.contains("reveal")&&!e.classList.contains("revealed")&&t.push(e),(e.querySelectorAll?e.querySelectorAll(".reveal:not(.revealed)"):[]).forEach(function(e){t.push(e)}))})}),t.length&&requestAnimationFrame(function(){t.forEach(function(e){e.classList.add("revealed")})})}).observe(document.body,{childList:!0,subtree:!0})}else document.querySelectorAll(".reveal").forEach(function(e){e.classList.add("revealed")})}(),function(){if("IntersectionObserver"in window){var e=new IntersectionObserver(function(t){t.forEach(function(t){if(t.isIntersecting){var n=t.target,a=parseInt(n.getAttribute("data-count"),10);if(!isNaN(a)){var o=null;requestAnimationFrame(function e(t){o||(o=t);var i=Math.min((t-o)/1400,1),r=1-Math.pow(1-i,3);n.textContent=Math.round(0+(a-0)*r).toLocaleString("fr-FR"),i<1&&requestAnimationFrame(e)}),e.unobserve(n)}}})},{threshold:.5});document.querySelectorAll("[data-count]").forEach(function(t){e.observe(t)})}}(),document.addEventListener("click",function(e){var t=e.target.closest(".accordion-trigger");if(t){var n=t.closest(".accordion-item"),a=n&&n.querySelector(".accordion-body"),o=n&&n.classList.contains("open"),i=n&&n.closest(".accordion-group");i&&i.querySelectorAll(".accordion-item.open").forEach(function(e){e.classList.remove("open");var t=e.querySelector(".accordion-body");t&&(t.style.maxHeight="0"),e.querySelector(".accordion-trigger").setAttribute("aria-expanded","false")}),!o&&a&&(n.classList.add("open"),a.style.maxHeight=a.scrollHeight+"px",t.setAttribute("aria-expanded","true"))}}),(e=document.querySelector(".doc-accordion-group"))&&(e.addEventListener("click",function(t){var n=t.target.closest(".doc-accordion-btn");if(n){var a=n.closest(".doc-accordion-item"),o=a&&a.querySelector(".doc-accordion-body");if(a&&o){var i=a.classList.contains("open");e.querySelectorAll(".doc-accordion-item.open").forEach(function(e){if(e!==a){e.classList.remove("open");var t=e.querySelector(".doc-accordion-body");t&&(t.style.maxHeight="0");var n=e.querySelector(".doc-accordion-btn");n&&n.setAttribute("aria-expanded","false")}}),i?(a.classList.remove("open"),o.style.maxHeight="0",n.setAttribute("aria-expanded","false")):(a.classList.add("open"),o.style.maxHeight=o.scrollHeight+"px",n.setAttribute("aria-expanded","true"))}}}),e.querySelectorAll(".doc-accordion-item.open .doc-accordion-body").forEach(function(e){e.style.maxHeight=e.scrollHeight+"px"})),function(){function e(){var e=window.innerWidth;return e<640?1:e<1024?2:3}document.querySelectorAll(".carousel-wrapper:not([data-managed])").forEach(function(t){var n=t.querySelector(".carousel-track"),a=t.querySelector(".carousel-viewport"),o=t.querySelector(".carousel-btn.carousel-prev"),i=t.querySelector(".carousel-btn.carousel-next");if(n&&a){var r=t.parentNode.querySelector(".carousel-dots"),c=Array.from(n.querySelectorAll(".testimonial-card-new"));if(c.length){var s={index:0,perView:e()};if(r){r.innerHTML="";for(var d=Math.max(1,c.length-s.perView+1),l=0;l<d;l++)(function(e){var t=document.createElement("button");t.className="carousel-dot"+(0===e?" active":""),t.setAttribute("aria-label","Témoignage "+(e+1)),t.addEventListener("click",function(){f(e)}),r.appendChild(t)})(l)}o&&o.addEventListener("click",function(){f(s.index-1)}),i&&i.addEventListener("click",function(){f(s.index+1)});var u=0;n.addEventListener("touchstart",function(e){u=e.touches[0].clientX},{passive:!0}),n.addEventListener("touchend",function(e){var t=u-e.changedTouches[0].clientX;Math.abs(t)>50&&f(s.index+(t>0?1:-1))}),window.addEventListener("resize",function(){var t=e();t!==s.perView&&(s.perView=t,s.index=0),v(!1)}),v(!1)}}function v(e){var t=c[0].offsetWidth,a=-s.index*(t+20);n.style.transition=e?"transform .4s cubic-bezier(.25,.8,.25,1)":"none",n.style.transform="translateX("+a+"px)";var d=Math.max(0,c.length-s.perView);o&&(o.disabled=s.index<=0),i&&(i.disabled=s.index>=d),r&&r.querySelectorAll(".carousel-dot").forEach(function(e,t){e.classList.toggle("active",t===s.index)})}function f(e){var t=Math.max(0,c.length-s.perView);s.index=Math.max(0,Math.min(e,t)),v(!0)}})}()}window.copyToClipboard=function(e,t){navigator.clipboard.writeText(e).then(function(){var e=t?t.textContent:"";t&&(t.textContent="Copié ✓",setTimeout(function(){t.textContent=e},2e3))}).catch(function(){var t=document.createElement("textarea");t.value=e,t.style.position="fixed",t.style.opacity="0",document.body.appendChild(t),t.focus(),t.select(),document.execCommand("copy"),document.body.removeChild(t)})},"loading"===document.readyState?document.addEventListener("DOMContentLoaded",r):r()}();
/* ── Maintenance & analytics (vitrine) ──────────────────────────────────────
   Bloc ajouté en clair (non minifié) pour rester lisible et auditable.
   1. Maintenance : interroge GET /api/maintenance ; si le mode est actif,
      redirige vers /maintenance/ (la page re-vérifie et revient toute seule).
   2. Analytics : strictement conditionné au cookie de consentement
      primeo_cookie_consent=accepted (bandeau géré plus haut dans ce fichier).
      - Google Analytics 4 chargé UNIQUEMENT si l'ID est fourni via
        <meta name="ga-measurement-id" content="G-XXXXXXXXXX"> (IP anonymisée,
        signaux publicitaires désactivés).
      - Événement first-party page_view envoyé à l'API Primeo (aucune donnée
        personnelle : pas de cookie tiers, pas d'IP stockée). */
(function () {
  'use strict';

  var apiMeta = document.querySelector('meta[name="api-url"]');
  var API = (apiMeta && apiMeta.content
    ? apiMeta.content
    : (window.PRIMEO_API_BASE_URL || 'https://api-primeo.onrender.com')).replace(/\/$/, '');

  /* ── 1. Redirection si maintenance active ── */
  var onMaintenancePage = window.location.pathname.indexOf('/maintenance') === 0;
  if (!onMaintenancePage) {
    fetch(API + '/api/maintenance', { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (s) {
        if (s && s.enabled) {
          var from = encodeURIComponent(window.location.pathname + window.location.search);
          window.location.replace('/maintenance/?from=' + from);
        }
      })
      .catch(function () { /* API injoignable : le site statique reste servi */ });
  }

  /* ── 2. Analytics avec consentement ── */
  function hasConsent() {
    return /(^| )primeo_cookie_consent=accepted(;|$)/.test(document.cookie);
  }

  var analyticsStarted = false;

  function startAnalytics() {
    if (analyticsStarted || !hasConsent()) return;
    analyticsStarted = true;

    /* Google Analytics 4 — uniquement si un ID de mesure est configuré */
    var gaMeta = document.querySelector('meta[name="ga-measurement-id"]');
    var gaId = gaMeta && gaMeta.content;
    if (gaId && /^G-[A-Z0-9]+$/.test(gaId)) {
      var s = document.createElement('script');
      s.async = true;
      s.src = 'https://www.googletagmanager.com/gtag/js?id=' + gaId;
      document.head.appendChild(s);
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag('js', new Date());
      window.gtag('config', gaId, {
        anonymize_ip: true,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
      });
    }

    /* Événement first-party anonyme (tableau de bord admin Primeo) */
    var sessionId;
    try {
      sessionId = localStorage.getItem('primeo_analytics_session');
      if (!sessionId) {
        sessionId = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
        localStorage.setItem('primeo_analytics_session', sessionId);
      }
    } catch (e) { sessionId = undefined; }

    try {
      fetch(API + '/api/analytics/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          events: [{
            name: 'page_view',
            platform: 'web',
            sessionId: sessionId,
            metadata: { path: window.location.pathname },
          }],
        }),
        keepalive: true,
      }).catch(function () { /* silencieux */ });
    } catch (e) { /* silencieux */ }
  }

  /* Démarre si le consentement existe déjà, ou dès que l'utilisateur accepte */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startAnalytics);
  } else {
    startAnalytics();
  }
  document.addEventListener('click', function (e) {
    if (e.target && e.target.closest && e.target.closest('#cookie-accept, .cookie-accept')) {
      setTimeout(startAnalytics, 50);
    }
  });
})();


/* Sobriété visuelle : les emojis servant d'icônes (contenu venant de l'API ou des scripts de page)
   sont remplacés par des icônes vectorielles ; les autres sont retirés des textes.
   ⚠ 💡 ★ ✓ sont conservés (encadrés, notes, confirmations). */
!function(){"use strict";
var P={"award": "<circle cx=\"12\" cy=\"8\" r=\"6\"/><path d=\"M15.5 13.5 17 22l-5-3-5 3 1.5-8.5\"/>", "bell": "<path d=\"M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0\"/>", "book": "<path d=\"M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2zM22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z\"/>", "briefcase": "<rect x=\"2\" y=\"7\" width=\"20\" height=\"14\" rx=\"2\"/><path d=\"M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16\"/>", "building": "<rect x=\"4\" y=\"2\" width=\"16\" height=\"20\" rx=\"2\"/><path d=\"M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01\"/>", "calendar": "<rect x=\"3\" y=\"4\" width=\"18\" height=\"18\" rx=\"2\"/><path d=\"M16 2v4M8 2v4M3 10h18\"/>", "camera": "<path d=\"M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z\"/><circle cx=\"12\" cy=\"13\" r=\"4\"/>", "card": "<rect x=\"2\" y=\"5\" width=\"20\" height=\"14\" rx=\"2\"/><path d=\"M2 10h20\"/>", "chart": "<path d=\"M3 3v18h18\"/><path d=\"M7 15v3M12 10v8M17 6v12\"/>", "chat": "<path d=\"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z\"/>", "check": "<path d=\"m5 12 5 5L20 7\"/>", "circlecheck": "<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"m8 12 3 3 5-6\"/>", "clipboard": "<rect x=\"8\" y=\"2\" width=\"8\" height=\"4\" rx=\"1\"/><path d=\"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2\"/><path d=\"m9 14 2 2 4-4\"/>", "cube": "<path d=\"M21 16V8l-9-5-9 5v8l9 5 9-5z\"/><path d=\"m3.3 7 8.7 5 8.7-5M12 22V12\"/>", "file": "<path d=\"M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5z\"/><path d=\"M14 2v6h6M8 13h8M8 17h8\"/>", "flag": "<path d=\"M4 22V4M4 4h14l-2 4 2 4H4\"/>", "gift": "<path d=\"M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z\"/>", "globe": "<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z\"/>", "graduation": "<path d=\"M22 10 12 5 2 10l10 5z\"/><path d=\"M6 12v5c3 3 9 3 12 0v-5\"/>", "heart": "<path d=\"M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z\"/>", "home": "<path d=\"m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z\"/><path d=\"M9 22V12h6v10\"/>", "landmark": "<path d=\"M3 22h18M6 18v-7M10 18v-7M14 18v-7M18 18v-7M12 2 3 7h18z\"/>", "laptop": "<rect x=\"3\" y=\"4\" width=\"18\" height=\"12\" rx=\"2\"/><path d=\"M2 20h20\"/>", "leaf": "<path d=\"M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10z\"/><path d=\"M2 21c0-3 1.9-5.5 5-7\"/>", "lock": "<rect x=\"3\" y=\"11\" width=\"18\" height=\"11\" rx=\"2\"/><path d=\"M7 11V7a5 5 0 0 1 10 0v4\"/>", "mail": "<rect x=\"2\" y=\"4\" width=\"20\" height=\"16\" rx=\"2\"/><path d=\"m22 7-10 6L2 7\"/>", "megaphone": "<path d=\"m3 11 18-5v12L3 14z\"/><path d=\"M11.6 16.8a3 3 0 1 1-5.8-1.6\"/>", "news": "<path d=\"M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2\"/><path d=\"M18 14h-8M15 18h-5M10 6h8v4h-8z\"/>", "palette": "<circle cx=\"13.5\" cy=\"6.5\" r=\".6\"/><circle cx=\"17.5\" cy=\"10.5\" r=\".6\"/><circle cx=\"8.5\" cy=\"7.5\" r=\".6\"/><circle cx=\"6.5\" cy=\"12.5\" r=\".6\"/><path d=\"M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.7-.7 1.7-1.6 0-.4-.2-.8-.5-1.1-.3-.3-.5-.7-.5-1.1 0-.9.7-1.7 1.7-1.7H16c3.3 0 6-2.7 6-6 0-4.9-4.5-8.5-10-8.5z\"/>", "pen": "<path d=\"M12 20h9\"/><path d=\"M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z\"/>", "phone": "<rect x=\"7\" y=\"2\" width=\"10\" height=\"20\" rx=\"2\"/><path d=\"M11 18h2\"/>", "phonecall": "<path d=\"M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z\"/>", "pin": "<path d=\"M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z\"/><circle cx=\"12\" cy=\"10\" r=\"3\"/>", "plane": "<path d=\"M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z\"/>", "radio": "<circle cx=\"12\" cy=\"12\" r=\"2\"/><path d=\"M16.2 7.8a6 6 0 0 1 0 8.4M7.8 16.2a6 6 0 0 1 0-8.4M19.1 4.9a10 10 0 0 1 0 14.2M4.9 19.1a10 10 0 0 1 0-14.2\"/>", "refresh": "<path d=\"M21 12a9 9 0 0 0-15-6.7L3 8M3 3v5h5M3 12a9 9 0 0 0 15 6.7L21 16M21 21v-5h-5\"/>", "rocket": "<path d=\"M4.5 16.5c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.8.7-2.1-.1-2.9a2.2 2.2 0 0 0-2.9-.1z\"/><path d=\"m12 15-3-3a22 22 0 0 1 2-4 12.9 12.9 0 0 1 11-6c0 2.7-.8 7.5-6 11a22 22 0 0 1-4 2z\"/><path d=\"M9 12H4s.6-3 2-4c1.6-1.1 5 0 5 0M12 15v5s3-.6 4-2c1.1-1.6 0-5 0-5\"/>", "search": "<circle cx=\"11\" cy=\"11\" r=\"7\"/><path d=\"m21 21-4.3-4.3\"/>", "shield": "<path d=\"M12 2 4 5v6c0 5 3.4 8.7 8 11 4.6-2.3 8-6 8-11V5z\"/><path d=\"m9 12 2 2 4-4\"/>", "star": "<path d=\"m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.3L5.8 21 7 14.2 2 9.3l6.9-1z\"/>", "target": "<circle cx=\"12\" cy=\"12\" r=\"10\"/><circle cx=\"12\" cy=\"12\" r=\"6\"/><circle cx=\"12\" cy=\"12\" r=\"2\"/>", "tool": "<path d=\"M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z\"/>", "trophy": "<path d=\"M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.7V17c0 .6-.5 1-1.1 1.2C7.8 18.7 7 20.2 7 22M14 14.7V17c0 .6.5 1 1.1 1.2 1.1.5 1.9 2 1.9 3.8M18 2H6v7a6 6 0 0 0 12 0z\"/>", "user": "<circle cx=\"12\" cy=\"8\" r=\"4\"/><path d=\"M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1\"/>", "users": "<path d=\"M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2\"/><circle cx=\"9\" cy=\"7\" r=\"4\"/><path d=\"M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75\"/>", "utensils": "<path d=\"M3 2v7a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V2M6 2v20M21 15V2a5 5 0 0 0-5 5v6a2 2 0 0 0 2 2zM18 15v7\"/>", "wallet": "<path d=\"M20 12V8H6a2 2 0 0 1 0-4h12v4M4 6v12a2 2 0 0 0 2 2h14v-4\"/><path d=\"M18 12a2 2 0 0 0 0 4h4v-4z\"/>", "zap": "<path d=\"M13 2 3 14h9l-1 8 10-12h-9z\"/>"},E={"✈": "plane", "🏨": "building", "🏢": "building", "🍽": "utensils", "🍴": "utensils", "🏠": "home", "🏡": "home", "🏗": "home", "🔍": "search", "🏅": "award", "💳": "card", "🔭": "cube", "🥽": "cube", "📱": "phone", "🛡": "shield", "🔰": "shield", "📋": "clipboard", "📅": "calendar", "🗓": "calendar", "📊": "chart", "💬": "chat", "🎉": "gift", "🎁": "gift", "⭐": "star", "📍": "pin", "📷": "camera", "👥": "users", "🤝": "users", "🧳": "briefcase", "💼": "briefcase", "📝": "pen", "🌍": "globe", "🌐": "globe", "🎯": "target", "🚀": "rocket", "🔒": "lock", "🔐": "lock", "🌿": "leaf", "🌱": "leaf", "🎓": "graduation", "💻": "laptop", "📢": "megaphone", "📣": "megaphone", "🏛": "landmark", "⚡": "zap", "📄": "file", "🔔": "bell", "✉": "mail", "📬": "mail", "📞": "phonecall", "💰": "wallet", "💵": "wallet", "📚": "book", "🏥": "heart", "❤": "heart", "📡": "radio", "🎨": "palette", "📰": "news", "🏆": "trophy", "🤵": "user", "👩": "user", "🔄": "refresh", "💱": "refresh", "🛠": "tool", "🚩": "flag", "✅": "circlecheck", "🎥": "camera", "📈": "chart", "💡": "check"};
var RE=/(?:[\u{1F300}-\u{1FAFF}\u{1F000}-\u{1F2FF}\u{2600}-\u{2604}\u{2606}-\u{27BF}\u{2B50}\u{2934}\u{2935}\u{23E9}-\u{23FA}])[\uFE0F\u200D\u{1F300}-\u{1FAFF}]*/gu;
var KEEP={"⚠":1,"💡":1,"✓":1,"✔":1,"✗":1,"✘":1,"★":1,"☆":1};
var SKIP={SCRIPT:1,STYLE:1,TEXTAREA:1,NOSCRIPT:1,TITLE:1,OPTION:1,CODE:1,PRE:1};
function first(s){return Array.from(s.replace(/\uFE0F/g,""))[0]||""}
function icon(n){var s=document.createElementNS("http://www.w3.org/2000/svg","svg");s.setAttribute("class","ico");s.setAttribute("viewBox","0 0 24 24");s.setAttribute("width","1em");s.setAttribute("height","1em");s.setAttribute("fill","none");s.setAttribute("stroke","currentColor");s.setAttribute("stroke-width","1.9");s.setAttribute("stroke-linecap","round");s.setAttribute("stroke-linejoin","round");s.setAttribute("aria-hidden","true");s.innerHTML=P[n];return s}
function fix(t){
  var d=t.data;if(!RE.test(d)){RE.lastIndex=0;return}RE.lastIndex=0;
  var p=t.parentNode;if(!p||SKIP[p.nodeName])return;
  var trimmed=d.trim(),m=trimmed.match(RE);
  if(m&&m.length===1&&m[0]===trimmed&&!KEEP[first(trimmed)]){
    var n=E[first(trimmed)];
    if(n&&P[n]&&p.nodeName!=="BODY"){p.insertBefore(icon(n),t)}
    p.removeChild(t);return}
  var out=d.replace(RE,function(x){return KEEP[first(x)]?x:""}).replace(/^[\s\u00A0]+(?=\S)/,function(s){return d.charAt(0)===" "||d.charAt(0)==="\u00A0"?"":s}).replace(/[ \u00A0]{2,}/g," ");
  if(out!==d)t.data=out}
function run(root){
  var w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,null),a=[],n;
  while(n=w.nextNode())a.push(n);
  a.forEach(fix)}
var q=false,todo=[];
function later(nodes){todo=todo.concat(nodes);if(q)return;q=true;requestAnimationFrame(function(){q=false;var l=todo;todo=[];l.forEach(function(x){if(x.isConnected)run(x)})})}
function start(){run(document.body);if("MutationObserver"in window)new MutationObserver(function(ms){var l=[];ms.forEach(function(m){m.addedNodes.forEach(function(x){if(x.nodeType===1)l.push(x);else if(x.nodeType===3&&x.parentNode)l.push(x.parentNode)})});if(l.length)later(l)}).observe(document.body,{childList:true,subtree:true})}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start()
}();

/* Contenu éditable depuis l'administration : les éléments portant data-cms / data-cms-href / data-cms-src
   reçoivent la valeur enregistrée dans le back-office (API /website/content). Sans valeur enregistrée,
   le texte d'origine de la page reste affiché. Dernière réponse conservée en cache local pour un
   affichage immédiat, puis rafraîchie à chaque visite. */
!function(){"use strict";
var meta=document.querySelector('meta[name="api-url"]');
var API=(meta&&meta.content?meta.content:"https://api-primeo.onrender.com").replace(/\/+$/,"");
var ALLOWED={A:1,BR:1,STRONG:1,B:1,EM:1,I:1,U:1,SPAN:1,SMALL:1,MARK:1,SUP:1,SUB:1,CODE:1};
var SAFE=/^(\/(?!\/)|#|https?:\/\/|mailto:|tel:)/i;
var blocks={};
function clean(html){
  var t=document.createElement("template");t.innerHTML=html;
  (function walk(n){Array.from(n.childNodes).forEach(function(c){
    if(c.nodeType===1){
      if(!ALLOWED[c.tagName]){c.replaceWith.apply(c,Array.from(c.childNodes));return}
      Array.from(c.attributes).forEach(function(a){
        if(!(c.tagName==="A"&&(a.name==="href"||a.name==="target"||a.name==="rel")))c.removeAttribute(a.name);
      });
      if(c.tagName==="A"&&!SAFE.test(c.getAttribute("href")||""))c.removeAttribute("href");
      walk(c);
    }else if(c.nodeType!==3){c.remove()}
  })})(t.content);
  return t.innerHTML;
}
function setText(el,v){
  if(el.tagName==="TITLE"){document.title=v;return}
  if(!el.children.length){el.textContent=v;return}
  // élément contenant une icône : on remplace uniquement le texte propre
  var nodes=Array.from(el.childNodes).filter(function(n){return n.nodeType===3&&n.data.trim()});
  if(nodes.length){var lead=/^\s/.test(nodes[0].data)?" ":"",tail=/\s$/.test(nodes[0].data)?" ":"";nodes[0].data=lead+v+tail;for(var i=1;i<nodes.length;i++)nodes[i].data=""}
  else el.appendChild(document.createTextNode(" "+v));
}
function applyIn(root){
  if(!root||!root.querySelectorAll)return;
  var all=root.matches&&root.matches("[data-cms],[data-cms-href],[data-cms-src]")?[root]:[];
  all=all.concat(Array.from(root.querySelectorAll("[data-cms],[data-cms-href],[data-cms-src]")));
  all.forEach(function(el){
    var k=el.getAttribute("data-cms"),v=k!=null?blocks[k]:undefined;
    if(v!=null){
      var type=el.getAttribute("data-cms-type");
      if(type==="html")el.innerHTML=clean(v);
      else if(type==="number"){
        var suffix=el.getAttribute("data-suffix")||"";
        el.setAttribute(el.hasAttribute("data-target")?"data-target":"data-count",v);
        el.textContent=Number(v).toLocaleString("fr-FR")+suffix;
      }else setText(el,v);
    }
    var hk=el.getAttribute("data-cms-href");if(hk&&blocks[hk]!=null&&SAFE.test(blocks[hk]))el.setAttribute("href",blocks[hk]);
    var sk=el.getAttribute("data-cms-src");if(sk&&blocks[sk]!=null){el.setAttribute("src",blocks[sk]);el.removeAttribute("srcset")}
  });
}
function start(){
  var page=document.body&&document.body.getAttribute("data-cms-page")||"global";
  var ck="primeo_cms_"+page;
  try{var c=JSON.parse(localStorage.getItem(ck)||"null");if(c&&c.blocks){blocks=c.blocks;applyIn(document.body)}}catch(e){}
  var ctrl=typeof AbortController!=="undefined"?new AbortController():null;if(ctrl)setTimeout(function(){ctrl.abort()},6000);
  fetch(API+"/api/website/content?page="+encodeURIComponent(page),{headers:{Accept:"application/json"},signal:ctrl?ctrl.signal:undefined})
    .then(function(r){return r.ok?r.json():null}).then(function(d){
      if(!d||!d.blocks)return;
      blocks=d.blocks;applyIn(document.body);
      try{localStorage.setItem(ck,JSON.stringify({t:Date.now(),blocks:blocks}))}catch(e){}
    }).catch(function(){});
  // en-tête / pied de page injectés après coup
  if("MutationObserver"in window)new MutationObserver(function(ms){ms.forEach(function(m){m.addedNodes.forEach(function(n){if(n.nodeType===1)applyIn(n)})})}).observe(document.body,{childList:true,subtree:true});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start()
}();
