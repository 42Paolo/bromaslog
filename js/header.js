/*
 * Header behaviour while scrolling, ported from icomat.co.uk (their code, read from the live site):
 *   - scrolling DOWN: the brand and the navigation bar slide up out of the screen (here 0.65s, power2.inOut: gentler than icomat's 0.3s);
 *   - scrolling UP:   they slide back in (0.5s, power1.out).
 * A change of direction counts only after 50px of scrolling have accumulated since the last one, so small
 * movements or jitter never make it flicker. Same constants as icomat.
 */
(function () {
  'use strict';
  var gsap = window.gsap;
  var header = document.querySelector('.site-header');
  var brand = document.querySelector('.site-brand');
  var bar = document.getElementById('nav');
  if (!gsap || !header || !brand || !bar) return;

  var THRESHOLD = 50;                      // px of accumulated scroll before the direction is re-evaluated (icomat: 50)
  var targets = [brand, bar];
  var shown = true;
  var direction = 'up';
  var last = 0;
  var accumulated = 0;

  function distance() { return -(header.offsetHeight + 40); }   // far enough to clear the bar and its shadow

  function show() {
    if (shown) return;
    shown = true;
    gsap.killTweensOf(targets);
    gsap.to(targets, { y: 0, duration: 0.5, ease: 'power1.out', onComplete: function () { gsap.set(targets, { clearProps: 'transform' }); } });
  }

  function hide() {
    if (!shown) return;
    shown = false;
    gsap.killTweensOf(targets);
    gsap.to(targets, { y: distance, duration: 0.65, ease: 'power2.inOut' });   // icomat: 0.3s power1.out; softer here
  }

  function onScroll() {
    var y = window.pageYOffset;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    if (y < 0 || y > max) return;                              // rubber-band overscroll: ignore
    if (document.documentElement.classList.contains('is-loading') ||
        document.documentElement.classList.contains('is-contact-open')) return;   // locked page: the bar stays put
    var delta = y - last;
    accumulated += Math.abs(delta);
    if (accumulated < THRESHOLD) return;
    if (delta > 0 && direction === 'up') direction = 'down';
    else if (delta < 0 && direction === 'down') direction = 'up';
    last = y;
    accumulated = 0;
    if (direction === 'down') hide(); else show();
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  // keyboard users tabbing to a hidden link bring the bar back
  header.addEventListener('focusin', show);
  // a resize re-measures the distance of a hidden bar
  window.addEventListener('resize', function () { if (!shown) gsap.set(targets, { y: distance() }); });
})();
