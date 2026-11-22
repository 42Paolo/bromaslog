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
