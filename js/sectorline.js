/*
 * The line of the last page. Three screens follow one another (the "stops": a title in the right half, a description in the left half)
 * and one thin line goes through all of them, straight down, drawn by the scroll: forwards when you scroll down, backwards when you
 * scroll up. It never turns: it only runs vertically.
 *
 *   Desktop: the line runs down the seam between the two halves (the seam the page rose along).
 *   Phone:   the line runs down the left margin (the halves are stacked there).
 *
 * The tip of the line stays at a fixed height of the window (TIP of its height), so the line is as long as the page has scrolled
 * past that height: scroll down and it grows, scroll up and it retracts. The line has no hard end: below the tip it goes on and slowly
 * fades until it is gone, as if it were entering the dark (a gradient on the stroke that moves with the tip; at the end of the page it
 * has faded out completely by the bottom of the black page). The title of a stop is lit when the tip reaches its label, the
 * description when the tip reaches its first line: the title always comes first, and a screen at rest has both. The positions are
 * measured from the page (so they follow the real texts at any size and in both languages) and measured again when the window, the
 * fonts or the language change. With "reduce motion" the whole line is simply drawn and everything is shown.
 */
(function () {
  'use strict';
  var section = document.getElementById('visione');
  var wrap = section && section.querySelector('.vs-wrap');
  var svg = wrap && wrap.querySelector('.vs__line');
  var path = svg && svg.querySelector('.vs__path');
  if (!wrap || !svg || !path) return;

  var params = new URLSearchParams(window.location.search);
  var reduced = params.get('motion') === 'reduced' ||
    (params.get('motion') !== 'full' && !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches));

  var NS = 'http://www.w3.org/2000/svg';
  var TIP = 0.8;          // the tip of the line is at this share of the window height, measured from the top of the window
  var HEAD = 0.08;        // the line starts to fade this far above the tip...
  var TAIL = 0.3;         // ...and is gone this far below it (shares of the window height)
  var sectors = Array.prototype.slice.call(wrap.querySelectorAll('.vs'));
  var stops = [], total = 0, wrapTop = 0, ready = false;

  // the fade: a vertical gradient on the stroke, from the line's colour (full) to nothing, moved along with the tip
  var grad = document.createElementNS(NS, 'linearGradient');
  grad.setAttribute('id', 'vs-fade');
  grad.setAttribute('gradientUnits', 'userSpaceOnUse');
  [[0, 0.62], [0.25, 0.4], [0.5, 0.22], [0.75, 0.08], [1, 0]].forEach(function (s) {   // an eased fall, not a straight one
    var stop = document.createElementNS(NS, 'stop');
    stop.setAttribute('offset', s[0]);
    stop.setAttribute('stop-color', 'rgb(242,240,235)');
    stop.setAttribute('stop-opacity', s[1]);
    grad.appendChild(stop);
  });
  var defs = document.createElementNS(NS, 'defs');
  defs.appendChild(grad);
  svg.insertBefore(defs, svg.firstChild);
  path.style.stroke = 'url(#vs-fade)';

  function px(v) { return Math.round(v) + 0.5; }       // a 1px line sits on a pixel row

  function measure() {
    var prev = section.style.getPropertyValue('--rise');
    section.style.setProperty('--rise', '0px');         // the blocks glide while the page rises: measure them in their place
    var wr = wrap.getBoundingClientRect();
    wrapTop = wr.top + window.pageYOffset;
    var phone = window.innerWidth < 768;
    var vh = window.innerHeight;
    var items = sectors.map(function (vs) {
      var r = vs.getBoundingClientRect(), e = vs.querySelector('.vs__eyebrow').getBoundingClientRect(), d = vs.querySelector('.vs__desc').getBoundingClientRect();
      var top = r.top - wr.top;
      return {
        top: top, xE: e.left - wr.left, yE: (e.top + e.bottom) / 2 - wr.top, yD: d.top - wr.top,
        title: vs.querySelector('.vs__title-block'), desc: vs.querySelector('.vs__desc')
      };
    });
    if (prev) section.style.setProperty('--rise', prev); else section.style.removeProperty('--rise');

    var x = px(phone ? Math.max(4, items[0].xE / 2) : wr.width / 2);
    total = Math.round(wr.height);
    path.setAttribute('d', 'M' + x + ' 0 L' + x + ' ' + total);   // the whole line is always there: the gradient decides how much of it is seen
    grad.setAttribute('x1', x); grad.setAttribute('x2', x);

    // where the tip must be to light each text; never further down than a screen at rest can reach, so a screen at rest is complete
    stops = items.map(function (it) {
      var reach = it.top + TIP * vh - 24;
      return { titleAt: Math.min(it.yE, reach), descAt: Math.min(it.yD + 22, reach), title: it.title, desc: it.desc };
    });
    ready = true;
  }

  function render() {
    if (!ready) return;
    var vh = window.innerHeight;
    // where the tip is on the line (before the page has arrived it is above the line: nothing is seen, then it fades in from the top)
    var L = reduced ? total - TAIL * vh : Math.min(window.pageYOffset + TIP * vh - wrapTop, total);
    var y2 = Math.min(L + TAIL * vh, total);                       // the fade is over by here (at the end of the line at the latest)
    var y1 = Math.min(L - HEAD * vh, y2 - 1);
    grad.setAttribute('y1', y1.toFixed(1)); grad.setAttribute('y2', y2.toFixed(1));
    if (reduced) return;
    stops.forEach(function (s) {
      s.title.classList.toggle('is-lit', L >= s.titleAt);
      s.desc.classList.toggle('is-lit', L >= s.descAt);
    });
  }

  var queued = false;
  function schedule() {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(function () { queued = false; render(); });
  }
  function remeasure() { measure(); render(); }

  if (!reduced) wrap.classList.add('vs-live');
  measure();
  render();

  if (!reduced) window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', remeasure);
  window.addEventListener('load', remeasure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);
  if (window.ResizeObserver) new ResizeObserver(remeasure).observe(wrap);
  // the language switch changes the texts (and how they wrap): measure again once it has settled
  window.addEventListener('bromaslog:languagechange', function () {
    window.requestAnimationFrame(function () { window.requestAnimationFrame(remeasure); });
  });
})();
