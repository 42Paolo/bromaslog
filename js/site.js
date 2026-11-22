/* Placeholder homepage entrance, synced with the preloader (icomat reveals its hero as the wave fades). */
(function () {
  'use strict';
  window.addEventListener('preloader:reveal', function () {
    if (!window.gsap) return;
    // (not the header itself: an ancestor with opacity would stop the glass from seeing the page behind it)
    gsap.from('.site-brand, .glass-nav, .site-tagline, .site-eyebrow, .site-hero h1', {
      y: 28, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08, clearProps: 'transform,opacity'
    });
  });
})();

/* Scroll reveal for the sections below the hero. */
(function () {
  'use strict';
  var els = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));
  if (!els.length || !('IntersectionObserver' in window)) return;
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.05 });
  els.forEach(function (el, i) {
    el.style.setProperty('--rd', (i % 3) * 0.08 + 's');
    el.classList.add('will-reveal');
    io.observe(el);
  });
})();

/* Parallax of the two hero texts (the headline on the left, the claim on the right).
 * They live on a lower layer: while you scroll they sink down the screen, a little faster than the page rises
 * would suggest, and drift towards the centre, until the second page has slid over them. */
(function () {
  'use strict';
  var DOWN = 1.3;      // 1 = stays put on screen, > 1 = slides down the screen (1.3 → 0.3px down per px scrolled)
  var TOWARDS_CENTRE = 0.11;   // horizontal px per px scrolled, towards the middle of the page

  var items = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));
  if (!items.length) return;
  var reduced = new URLSearchParams(window.location.search).get('motion') === 'reduced' ||
    (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
     new URLSearchParams(window.location.search).get('motion') !== 'full');
  if (reduced) return;

  // data-parallax="1": the text is on the left, so it drifts right; "-1": it is on the right, so it drifts left.
  var side = items.map(function (el) { return el.getAttribute('data-parallax') === '-1' ? -1 : 1; });
  var ticking = false;

  function measure() { update(); }
  var phone = window.matchMedia ? window.matchMedia('(max-width: 767px)') : { matches: false };   // on phones both texts are on the left

  function update() {
    ticking = false;
    var y = Math.min(window.pageYOffset, window.innerHeight * 1.5);        // nothing to move once the hero is covered
    items.forEach(function (el, i) {
      el.style.transform = 'translate3d(' + ((phone.matches ? 1 : side[i]) * y * TOWARDS_CENTRE).toFixed(1) + 'px,' + (y * DOWN).toFixed(1) + 'px,0)';
    });
  }

  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
  }, { passive: true });
  window.addEventListener('resize', measure);
  measure();
})();
