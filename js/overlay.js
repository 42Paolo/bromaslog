/*
 * Overlay transition between the second page (white) and the third page (black).
 * - The white page is sticky: when its bottom reaches the bottom of the screen it stops, and the black page slides over it.
 *   (If the white page is taller than the screen, it sticks with its bottom edge at the bottom of the screen: --stick-top.)
 * - While the black page covers it, the white page darkens and its content drifts up a little (--cover: 0 -> 1).
 * The sticky overlay itself is pure CSS and always on; the darkening/drift are skipped with "reduce motion".
 */
(function () {
  'use strict';
  var white = document.getElementById('chi-siamo');
  var black = document.getElementById('portfolio') || document.getElementById('visione');   // the first black page after the white one
  if (!white) return;              // the black page may be switched off: the white page still needs its sticky position

  var params = new URLSearchParams(window.location.search);
  var reduced = params.get('motion') === 'reduced' ||
    (params.get('motion') !== 'full' && !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches));

  function stick() {
    var top = Math.min(0, window.innerHeight - white.offsetHeight);   // 0, or negative when the page is taller than the screen
    white.style.setProperty('--stick-top', top + 'px');
    white.style.setProperty('--cover-shift', (-0.08 * window.innerHeight).toFixed(0) + 'px');
  }

  function cover() {
    if (reduced || !black) return;
    var h = window.innerHeight;
    var t = black.getBoundingClientRect().top;                          // distance of the black page from the top of the screen
    var base = Math.min(h, white.getBoundingClientRect().bottom);       // it starts covering when it reaches the white page's bottom edge
    var c = base <= 0 ? 1 : Math.min(1, Math.max(0, (base - t) / base));
    white.style.setProperty('--cover', c.toFixed(3));
  }

  function update() { cover(); }

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', function () { stick(); cover(); });
  window.addEventListener('bromaslog:languagechange', function () { window.requestAnimationFrame(function () { stick(); cover(); }); });
  if (window.ResizeObserver) new ResizeObserver(function () { stick(); cover(); }).observe(white);
  window.addEventListener('load', function () { stick(); cover(); });
  stick();
  cover();
})();
