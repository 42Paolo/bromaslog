/*
 * Overlay transition between the second page (white) and the third page (black).
 * - The white page is sticky: when its bottom reaches the bottom of the screen it stops, and the black page slides over it.
 *   (If the white page is taller than the screen, it sticks with its bottom edge at the bottom of the screen: --stick-top.)
 * - While the black page covers it, the white page darkens and its content drifts up a little (--cover: 0 -> 1).
 * - The black page does not rise as one straight edge: its right half rises with the scroll, and its left half starts a third of a screen
 *   lower and rises faster, so the two edges meet exactly when the page has covered the screen (the stepped rise of likova.space,
 *   measured on the live page: left edge = 1.33 x the height of the right edge above the bottom of the screen, linear in the scroll).
 *   It is a clip-path on the black page, updated from the scroll position.
 * The sticky overlay itself is pure CSS and always on; the darkening/drift and the stepped rise are skipped with "reduce motion".
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

  var LAG = 0.33;                  // how much lower the left half starts, as a share of the distance the page still has to rise
  var clip = '';
  function split(t) {              // t: distance of the black page's top edge from the top of the screen
    var y = Math.min(Math.max(t, 0), window.innerHeight) * LAG;   // the left half's top edge, below the page's own top edge (px)
    var v = y > 0.5 ? 'polygon(0 ' + y.toFixed(1) + 'px, 50% ' + y.toFixed(1) + 'px, 50% 0, 100% 0, 100% 100%, 0 100%)' : '';
    if (v !== clip) { clip = v; black.style.clipPath = v; }
  }

  function cover() {
    if (reduced || !black) return;
    var h = window.innerHeight;
    var t = black.getBoundingClientRect().top;                          // distance of the black page from the top of the screen
    split(t);
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
