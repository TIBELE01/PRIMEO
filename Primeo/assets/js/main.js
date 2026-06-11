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
    : (window.PRIMEO_API_BASE_URL || 'https://primeo-api-sszr.onrender.com')).replace(/\/$/, '');

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
