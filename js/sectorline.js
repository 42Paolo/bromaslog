/*
 * The line of the last page. Three screens follow one another (the "stops": a title in the right half, a description in the left half)
 * and a thin line goes through all of them, drawn by the scroll: forwards when you scroll down, backwards when you scroll up.
 *
 *   Desktop: in each stop the line runs across the top of the screen from the left margin to the seam between the halves, goes down
 *            the seam (a short stub branches off to the title's label), turns left along the top of the description (that is the
 *            rule above its text) and ends at the margin, from where it goes down the margin to the next stop.
 *   Phone:   one line down the left margin, with a tick at each title and a rule above each description.
 *
 * The path is measured from the page (so it follows the real positions of the texts at any size and in both languages) and is
 * remeasured when the window, the fonts or the language change. Each stop has its own stretch of the line, drawn while that
 * screen crosses the window (from 0.9 of a screen before it until it reaches the top). The title is lit when the
 * line reaches its label, the description when the line is more than halfway along its rule: the title always comes first.
 * With "reduce motion" the whole line is simply drawn and everything is shown.
 */
(function () {
  'use strict';
  var section = document.getElementById('visione');
  var wrap = section && section.querySelector('.vs-wrap');
  var svg = wrap && wrap.querySelector('.vs__line');
  var path = svg && svg.querySelector('.vs__path');
  if (!wrap || !svg || !path) return;

  var NS = 'http://www.w3.org/2000/svg';
  var params = new URLSearchParams(window.location.search);
  var reduced = params.get('motion') === 'reduced' ||
    (params.get('motion') !== 'full' && !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches));

  var BEFORE = 0.9;       // a stop's stretch of the line starts this many screens before the stop reaches the top of the window...
  var AFTER = 0;          // ...and is finished when it gets there (so a screen at rest has its line and its texts complete)
  var RUN = 56;           // px above the title's label where the line runs across the top of a screen
  var sectors = Array.prototype.slice.call(wrap.querySelectorAll('.vs'));
  var stubEls = [];
  var stops = [], stubs = [], total = 0, ready = false;

  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function px(v) { return Math.round(v) + 0.5; }       // a 1px line sits on a pixel row

  function measure() {
    var prev = section.style.getPropertyValue('--rise');
    section.style.setProperty('--rise', '0px');         // the blocks glide while the page rises: measure them in their place
    var wr = wrap.getBoundingClientRect();
    var wrapTop = wr.top + window.pageYOffset;
    var W = wr.width;
    var phone = window.innerWidth < 768;
    var items = sectors.map(function (vs) {
      var r = vs.getBoundingClientRect(), e = vs.querySelector('.vs__eyebrow').getBoundingClientRect(), d = vs.querySelector('.vs__desc').getBoundingClientRect();
      return {
        top: r.top - wr.top, yE: (e.top + e.bottom) / 2 - wr.top, xE: e.left - wr.left, yD: d.top - wr.top, xD: d.left - wr.left, xD2: d.right - wr.left,
        title: vs.querySelector('.vs__title-block'), desc: vs.querySelector('.vs__desc')
      };
    });
    if (prev) section.style.setProperty('--rise', prev); else section.style.removeProperty('--rise');

    var d = [], cum = 0, last = null;
    function go(x, y) {                                   // the path only has horizontal and vertical stretches
      x = px(x); y = px(y);
      if (last) cum += Math.abs(x - last[0]) + Math.abs(y - last[1]);
      d.push((last ? 'L' : 'M') + x + ' ' + y);
      last = [x, y];
      return cum;
    }
    stops = []; stubs = [];
    var xm, seam;

    if (!phone) {
      seam = W / 2;
      xm = items[0].xD / 2;
      items.forEach(function (it) {
        var yRun = it.yE - RUN, start = last ? cum : 0;
        go(xm, yRun);                                     // (after the first stop this is the way down the margin)
        go(seam, yRun);
        var atSeam = cum;
        go(seam, it.yD);
        var ruleStart = cum;
        go(xm, it.yD);
        var stub = { at: atSeam + (it.yE - yRun), x1: seam, x2: it.xE - 8, y: it.yE };
        stubs.push(stub);
        stops.push({ top: it.top, start: start, end: cum, titleAt: stub.at + (stub.x2 - stub.x1), descAt: ruleStart + (cum - ruleStart) * 0.55, title: it.title, desc: it.desc });
      });
    } else {
      xm = Math.max(4, items[0].xE / 2);
      go(xm, items[0].yE - 18);
      items.forEach(function (it, i) {
        var start = i === 0 ? 0 : cum;
        var atE = go(xm, it.yE);
        var ruleStart = go(xm, it.yD);
        go(W - xm, it.yD);                                // the rule above the description...
        go(xm, it.yD);                                    // ...and back (the line goes over itself) to carry on down the margin
        var stub = { at: atE, x1: xm, x2: it.xE - 6, y: it.yE };
        stubs.push(stub);
        stops.push({ top: it.top, start: start, end: cum, titleAt: atE + (stub.x2 - stub.x1), descAt: ruleStart + (W - 2 * xm) * 0.5, title: it.title, desc: it.desc });
      });
    }
    total = cum;
    path.setAttribute('d', d.join(' '));
    path.style.strokeDasharray = total + ' ' + total;

    while (stubEls.length < stubs.length) {
      var el = document.createElementNS(NS, 'line');
      el.setAttribute('class', 'vs__stub');
      svg.appendChild(el);
      stubEls.push(el);
    }
    stubs.forEach(function (s, i) {
      var el = stubEls[i];
      s.len = Math.max(1, s.x2 - s.x1);
      el.setAttribute('x1', px(s.x1)); el.setAttribute('x2', px(s.x1) + s.len);
      el.setAttribute('y1', px(s.y)); el.setAttribute('y2', px(s.y));
      el.style.strokeDasharray = s.len + ' ' + s.len;
    });
    var vh = window.innerHeight;
    stops.forEach(function (s) {
      s.s0 = wrapTop + s.top - BEFORE * vh;
      s.s1 = wrapTop + s.top + AFTER * vh;
    });
    ready = true;
  }

  // how much of the line is drawn at this scroll position
  function drawnAt(y) {
    for (var i = 0; i < stops.length; i++) {
      var s = stops[i];
      if (y <= s.s1) return s.start + clamp((y - s.s0) / (s.s1 - s.s0)) * (s.end - s.start);
    }
    return total;
  }

  function render() {
    if (!ready) return;
    var L = reduced ? total : drawnAt(window.pageYOffset);
    path.style.strokeDashoffset = (total - L).toFixed(1);
    stubs.forEach(function (s, i) { stubEls[i].style.strokeDashoffset = (s.len * (1 - clamp((L - s.at) / s.len))).toFixed(1); });
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
