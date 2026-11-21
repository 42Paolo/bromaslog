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
