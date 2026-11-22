/*
 * Header behaviour while scrolling (the logic is icomat.co.uk's, read from the live site; the rising speed is ours):
 *   - scrolling DOWN: the brand and the navigation bar rise out of the screen at 80% of the scroll speed
 *     (scroll 100px, the bar rises 80px), so the movement follows your hand and is as smooth as the scroll itself;
 *   - scrolling UP:   they slide back in (0.5s, power1.out, as on icomat).
 * A change of direction counts only after 50px of scrolling have accumulated since the last one, so small
 * movements or jitter never make it flicker (same constant as icomat).
 */
(function () {
  'use strict';
  var gsap = window.gsap;
  var header = document.querySelector('.site-header');
  var brand = document.querySelector('.site-brand');
  var bar = document.getElementById('nav');
  if (!gsap || !header || !brand || !bar) return;

  var THRESHOLD = 50;                      // px of accumulated scroll before the direction is re-evaluated (icomat: 50)
  var SPEED = 0.8;                         // the bar rises at 80% of the scroll speed
  var targets = [brand, bar];
  var root = document.documentElement;
  var direction = 'up';
  var last = 0;                            // scroll position at the last direction check
  var accumulated = 0;
  var anchor = 0;                          // scroll position the rise is measured from
  var offset = 0;                          // how far the bar has risen (px, >= 0)

  function maxOffset() { return header.offsetHeight + 40; }   // far enough to clear the bar and its shadow

  function follow(y) {
    var next = Math.min(maxOffset(), Math.max(offset, SPEED * (y - anchor)));   // never sinks back by itself
    if (next === offset) return;
    offset = next;
    // a short tween per update softens the 50px head start and any irregular wheel step
    gsap.to(targets, { y: -offset, duration: 0.35, ease: 'power3.out', overwrite: true });
  }

  function show() {
    if (offset === 0) return;
    offset = 0;
    gsap.to(targets, { y: 0, duration: 0.5, ease: 'power1.out', overwrite: true, onComplete: function () { gsap.set(targets, { clearProps: 'transform' }); } });
  }

  function onScroll() {
    var y = window.pageYOffset;
    var max = root.scrollHeight - window.innerHeight;
    if (y < 0 || y > max) return;                              // rubber-band overscroll: ignore
    if (root.classList.contains('is-loading') || root.classList.contains('is-contact-open')) return;   // locked page

    var delta = y - last;
    accumulated += Math.abs(delta);
    if (accumulated >= THRESHOLD) {
      if (delta > 0 && direction === 'up') { direction = 'down'; anchor = last; }   // the rise counts from where this scroll began
      else if (delta < 0 && direction === 'down') direction = 'up';
      last = y;
      accumulated = 0;
      if (direction === 'up') { show(); return; }
    }
    if (direction === 'down') follow(y);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  // keyboard users tabbing to a hidden link bring the bar back
  header.addEventListener('focusin', function () { direction = 'up'; last = window.pageYOffset; accumulated = 0; show(); });
  // a resize re-measures the distance of a hidden bar
  window.addEventListener('resize', function () { if (offset > 0) { offset = maxOffset(); gsap.set(targets, { y: -offset }); } });
})();
