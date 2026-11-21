/* Placeholder homepage entrance, synced with the preloader (icomat reveals its hero as the wave fades). */
(function () {
  'use strict';
  window.addEventListener('preloader:reveal', function () {
    if (!window.gsap) return;
    gsap.from('.site-header, .site-eyebrow, .site-hero h1', {
      y: 28, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08, clearProps: 'transform,opacity'
    });
  });
})();
