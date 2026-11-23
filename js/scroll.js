/*
 * Scroll feel + hero parallax, modelled on icomat.co.uk (measured on the live site).
 *
 * 1) Smooth scrolling: icomat uses Lenis 1.3.3 with its default options (wheel is smoothed with lerp 0.1, touch
 *    stays native). Same library, same version, same options here.
 * 2) Parallax of the two side texts, only on screens >= 768px wide (on phones icomat does not move them):
 *    while you scroll through the first screen they rise more slowly than the page and drift sideways towards the
 *    centre, linearly, then stop when the first screen has gone by.
 *        headline (left) : rises at 66.7% of the page speed, moves right by 9.7% of the page width
 *        claim   (right) : rises at 59.1% of the page speed, moves left  by 2.7% of the page width
 *    The second page (opaque) slides over them.
 *
 * With "reduce motion" on (or ?motion=reduced) the page keeps the browser's own scrolling and no parallax.
 */
(function () {
  'use strict';

  var root = document.documentElement;
  var params = new URLSearchParams(window.location.search);
  var reduced = params.get('motion') === 'reduced' ||
    (params.get('motion') !== 'full' && !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches));
  if (reduced) return;

  /* ---------- Lenis ---------- */
  var lenis = null;
  if (typeof window.Lenis === 'function') {
    lenis = new window.Lenis({ autoRaf: true });          // = icomat: defaults, driven by its own requestAnimationFrame
    window.bromaslogLenis = lenis;

    // No scrolling while the preloader is up, the contact panel is open, or the About page holds the visitor (js/aboutmorph.js).
    var syncLock = function () {
      if (root.classList.contains('is-loading') || root.classList.contains('is-contact-open') || root.classList.contains('is-about-hold')) lenis.stop();
      else lenis.start();
    };
    new MutationObserver(syncLock).observe(root, { attributes: true, attributeFilter: ['class'] });
    syncLock();

    // In-page links (Chi siamo, Portfolio, Torna su) glide with the same smoothing.
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a || a.id === 'contact-trigger' || e.defaultPrevented) return;
      var hash = a.getAttribute('href');
      var target = hash === '#top' ? 0 : document.getElementById(hash.slice(1));
      if (target === null || target === undefined) return;
      e.preventDefault();
      lenis.scrollTo(target);
    });
  }

  /* ---------- parallax ---------- */
  var HERO = document.querySelector('.site-hero');
  var CONFIG = {
    title: { rise: 1 - 0.667, dx: +0.097 },   // rise: fraction of the scroll that is added back (page speed * (1 - rise) = text speed)
    claim: { rise: 1 - 0.591, dx: -0.027 }
  };
  var items = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));
  var desktop = window.matchMedia ? window.matchMedia('(min-width: 768px)') : { matches: true };
  if (!HERO || !items.length) return;

  function update() {
    if (!desktop.matches) {
      items.forEach(function (el) { el.style.transform = ''; });
      return;
    }
    var heroH = HERO.offsetHeight || window.innerHeight;
    var y = Math.min(Math.max(window.pageYOffset, 0), heroH);       // everything stops once the first screen has passed
    var p = y / heroH;
    items.forEach(function (el) {
      var c = CONFIG[el.getAttribute('data-parallax')];
      if (!c) return;
      el.style.transform = 'translate3d(' + (p * c.dx * window.innerWidth).toFixed(2) + 'px,' + (y * c.rise).toFixed(2) + 'px,0)';
    });
  }

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  if (desktop.addEventListener) desktop.addEventListener('change', update);
  update();
})();
