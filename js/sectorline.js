/*
 * The line of the last page. Three screens follow one another (the "stops": a title in the right half, a description in the left half)
 * and one thin line goes through all of them, straight down, drawn by the scroll: forwards when you scroll down, backwards when you
 * scroll up. It never turns: it only runs vertically. At the end of the last stop it goes on in the hangar (js/hangar.js), down the seam
 * of the doors, to the end of the page.
 *
 *   Desktop: the line runs down the seam between the two halves (the seam the page rose along).
 *   Phone:   the line runs down the left margin (the halves are stacked there).
 *
 * How it is drawn. The line is as long as the black page, and each stretch of it is drawn while the page scrolls past it. The stretch of
 * a stop is drawn while the stop climbs from WIN of the window height (its top edge) to its place at rest: the tip starts at the top
 * edge of the stop and runs down through it, faster than the page climbs, so it is seen going down the screen; when the stop is at rest
 * the line is drawn to its bottom edge. Then, while the next stop climbs towards the window, the end of the line goes up with the page
 * (nothing is drawn), and when that stop reaches WIN the tip runs down through it in turn. After the last stop the hangar draws the line in
 * the same way, and the end of this one stops being soft as the hangar's starts. It is a function of the scroll position, so scrolling
 * back up draws it backwards, retracting from the tip.
 * The tip is soft: a little above it the line starts to fade and a little below it it is gone, as if it were entering the dark (a gradient on
 * the stroke that moves with the tip). When the line is complete it is complete: the gradient has gone past the end.
 * The title of a stop is lit when the tip reaches its label, the description when the tip reaches its first line: the title always comes
 * first, and a stop at rest has both. The positions are measured from the page (so they follow the real texts at any size and in both
 * languages) and measured again when the window, the fonts or the language change. With "reduce motion" the whole line is simply drawn
 * and everything is shown.
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
  var WIN = 0.6;          // a stop's stretch of the line is drawn while the stop climbs from this share of the window height to the top
  var HEAD = 0.08;        // the line starts to fade this far above the tip...
  var TAIL = 0.3;         // ...and is gone this far below it (shares of the window height)
  window.BromaslogLine = { WIN: WIN, HEAD: HEAD, TAIL: TAIL };   // js/hangar.js draws the end of the line with the same numbers
  var sectors = Array.prototype.slice.call(wrap.querySelectorAll('.vs'));
  var segs = [], stops = [], total = 0, ready = false;

  // the soft tip: a vertical gradient on the stroke, from the line's colour (full) to nothing, moved along with the tip
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
    var wrapTop = wr.top + window.pageYOffset;
    var phone = window.innerWidth < 768;
    var vh = window.innerHeight;
    var items = sectors.map(function (vs) {
      var r = vs.getBoundingClientRect(), e = vs.querySelector('.vs__eyebrow').getBoundingClientRect(), d = vs.querySelector('.vs__desc').getBoundingClientRect();
      return {
        top: r.top - wr.top, bottom: r.bottom - wr.top, xE: e.left - wr.left, yE: (e.top + e.bottom) / 2 - wr.top, yD: d.top - wr.top,
        title: vs.querySelector('.vs__title-block'), desc: vs.querySelector('.vs__desc')
      };
    });
    if (prev) section.style.setProperty('--rise', prev); else section.style.removeProperty('--rise');

    var x = px(phone ? Math.max(4, items[0].xE / 2) : wr.width / 2);
    total = Math.round(wr.height);
    path.setAttribute('d', 'M' + x + ' 0 L' + x + ' ' + total);   // the whole line is always there: the gradient decides how much of it is seen
    grad.setAttribute('x1', x); grad.setAttribute('x2', x);

    // where the tip has to be to light each text
    stops = items.map(function (it) {
      return { titleAt: it.yE, descAt: it.yD + 22, title: it.title, desc: it.desc };
    });

    // The stretches: while the scroll goes from s0 to s1 the tip goes from l0 to l1 (positions on the line). The first one starts above the
    // line (l0 < 0) so the line comes out of nothing; the last one ends below the end of the line, so when you reach the end of the page
    // the line is complete and no longer fading.
    segs = items.map(function (it, i) {
      return {
        s0: wrapTop + it.top - (i === 0 ? WIN + TAIL : WIN) * vh, s1: wrapTop + it.top,
        l0: i === 0 ? -TAIL * vh : items[i - 1].bottom, l1: it.bottom
      };
    });
    var last = items[items.length - 1];
    // The line goes on below the last stop, in the hangar (js/hangar.js draws it there, from the top edge of the hangar's stage). Here the
    // end of the line stops being soft as that one starts to come out: the same stretch of scroll in which the hangar's line reaches full.
    var hangar = document.getElementById('hangar');
    var hangarTop = hangar ? hangar.getBoundingClientRect().top + window.pageYOffset : wrapTop + last.bottom;
    var rs0 = hangarTop - (WIN + TAIL) * vh;
    segs.push({ s0: rs0, s1: rs0 + (HEAD + TAIL) / (1 + 2 * TAIL) * (WIN + TAIL) * vh, l0: last.bottom, l1: total + TAIL * vh });
    ready = true;
  }

  // where the tip of the line is at this scroll position (backwards when scrolling back)
  function tipAt(y) {
    for (var i = 0; i < segs.length; i++) {
      var g = segs[i];
      if (y <= g.s0) return g.l0;
      if (y < g.s1) return g.l0 + (y - g.s0) / (g.s1 - g.s0) * (g.l1 - g.l0);
    }
    return segs[segs.length - 1].l1;
  }

  function render() {
    if (!ready) return;
    var vh = window.innerHeight;
    var L = tipAt(window.pageYOffset);
    var y1 = L - HEAD * vh, y2 = L + TAIL * vh;
    if (reduced) { y1 = total + 20; y2 = total + 21; }             // reduced motion: no tip, the whole line is there
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
