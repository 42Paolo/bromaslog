/*
 * How the second page (white) rises over the first one, and how the third page (black) rises over the white one.
 * - The white page is sticky: when its bottom reaches the bottom of the screen it stops, and the black page slides over it.
 *   (If the white page is taller than the screen, it sticks with its bottom edge at the bottom of the screen: --stick-top.)
 * - While the black page covers it, the white page darkens and its content drifts up a little (--cover: 0 -> 1).
 * - Neither page rises as one straight edge. One half rises with the scroll; the other half starts a third of a screen lower and rises
 *   faster, so the two edges meet exactly when the page has covered the screen (the stepped rise of likova.space, measured on the live
 *   page: the lagging edge = 1.33 x the height of the leading edge above the bottom of the screen, linear in the scroll).
 *   The black page: right half first. The white page: left half first (the other way round).
 *   It is a clip-path on each page, updated from the scroll position, so it also runs backwards.
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

  var LAG = 0.33;                  // how much lower the lagging half starts, as a share of the distance the page still has to rise
  // t: distance of the page's top edge from the top of the screen. The leading half's edge is the page's own top edge; the lagging half's
  // edge is LAG x t below it, so it is at 1.33 x t from the top of the screen and meets the other one when t reaches 0.
  function stepRise(el, t, leftLeads) {
    var y = Math.min(Math.max(t, 0), window.innerHeight) * LAG;
    var a = y.toFixed(1) + 'px';
    var v = y <= 0.5 ? '' : leftLeads ?
      'polygon(0 0, 50% 0, 50% ' + a + ', 100% ' + a + ', 100% 100%, 0 100%)' :
      'polygon(0 ' + a + ', 50% ' + a + ', 50% 0, 100% 0, 100% 100%, 0 100%)';
    if (v !== el._clip) { el._clip = v; el.style.clipPath = v; }
  }

  function cover() {
    if (reduced) return;
    var h = window.innerHeight;
    stepRise(white, white.getBoundingClientRect().top, true);           // the white page rises over the first screen: left half first
    if (!black) return;
    var t = black.getBoundingClientRect().top;                          // distance of the black page from the top of the screen
    stepRise(black, t, false);                                          // the black page rises over the white one: right half first
    black.classList.add('is-rising');                                   // (the page is held for a moment once it has covered the screen)
    var rise = Math.min(Math.max(t, 0), h).toFixed(1) + 'px';           // how far it still has to rise: its blocks glide against it by this much
    if (rise !== black._rise) { black._rise = rise; black.style.setProperty('--rise', rise); }
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
