/*
 * Last page, "La nostra visione": all black. The screen is held (a tall section with a sticky stage) and the scroll paints the words,
 * the way two26.studio paints its text: every letter in turn lights up (a soft glow, a hair of rise and tilt) and settles, and a wave
 * of that runs along the word as you scroll. It is tied to the scroll position (scrubbed), so it also runs backwards.
 *
 *   Direzione.   one word at a time, a rest between them
 *   Tensione.
 *   Spazio.
 *   -> all three are erased at the same moment, each from its right end to its left
 *   -> black for a beat, then the closing line (vision.line in js/i18n.js) is painted letter by letter
 *   -> a last rest, then the screen is let go.
 *
 * BEATS below is the whole script, in screens of scroll (vh): change a number to make a part longer or shorter.
 * The page is as tall as all the beats together plus one screen. Without JavaScript or with "reduce motion" nothing here runs and the
 * text is simply shown (css/site.css).
 */
(function () {
  'use strict';
  var section = document.getElementById('visione');
  var M = window.BromaslogMotion;
  if (!section || !M) return;
  var stage = section.querySelector('.vision-stage');
  var wordEls = Array.prototype.slice.call(section.querySelectorAll('.v-word'));
  var lineEl = section.querySelector('.v-line');
  var srEl = document.getElementById('vision-sr');
  if (!stage || !wordEls.length || !lineEl) return;

  var params = new URLSearchParams(window.location.search);
  var reduced = params.get('motion') === 'reduced' ||
    (params.get('motion') !== 'full' && !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches));
  if (reduced) return;

  /* ---------- the script (vh of scroll for each beat) ---------- */
  var BEATS = [
    ['hold', 30],     // all black
    ['w1', 60],       // Direzione.
    ['gap1', 30],
    ['w2', 60],       // Tensione.
    ['gap2', 30],
    ['w3', 60],       // Spazio.
    ['read', 60],     // the three words, at rest
    ['erase', 70],    // all three erased, right to left
    ['dark', 40],     // black
    ['line', 140],    // the closing line is painted
    ['end', 70]       // at rest, then the page moves on
  ];
  var WC = 0.45;      // part of a word's time one letter takes to light up (the rest is the wave running along)
  var WE = 0.4;       // same, for the erasing
  var WL = 0.14;      // same, for the closing line (a long text: a short wave)

  var total = 0, at = {};
  BEATS.forEach(function (b) { at[b[0]] = [total, total + b[1]]; total += b[1]; });
  section.style.setProperty('--vision-total', String(100 + total));

  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function smooth(v) { return v * v * (3 - 2 * v); }
  function seg(p, name) {
    var a = at[name][0] / total, b = at[name][1] / total;
    return p <= a ? 0 : p >= b ? 1 : (p - a) / (b - a);
  }

  /* ---------- letters ---------- */

  // text -> words (nowrap boxes) -> letters (inline boxes); returns the letters in reading order
  function split(el) {
    var text = (el.textContent || '').replace(/\s+/g, ' ').trim();
    el.textContent = '';
    var chars = [];
    var words = text.split(' ');
    words.forEach(function (w, wi) {
      var box = document.createElement('span');
      box.className = 'v-lw';
      Array.prototype.forEach.call(w, function (ch) {
        var c = document.createElement('span');
        c.className = 'v-c';
        c.textContent = ch;
        box.appendChild(c);
        chars.push(c);
      });
      el.appendChild(box);
      if (wi < words.length - 1) el.appendChild(document.createTextNode(' '));
    });
    return chars;
  }

  var words = [], lineChars = [];
  var triad = section.querySelector('.v-triad');
  var geo = { stacked: false, left: [], size: [], total: 0 };

  // where each of the three words sits inside the group (along the row, or down the column on phones), so the part that is painted can be kept centred
  function measureTriad() {
    var first = wordEls[0];
    geo.stacked = wordEls.length > 1 && wordEls[1].offsetTop > first.offsetTop + 2;
    geo.left = wordEls.map(function (e) { return geo.stacked ? e.offsetTop - first.offsetTop : e.offsetLeft - first.offsetLeft; });
    geo.size = wordEls.map(function (e) { return geo.stacked ? e.offsetHeight : e.offsetWidth; });
    var l = wordEls.length - 1;
    geo.total = geo.left[l] + geo.size[l];
  }

  function build() {
    words = wordEls.map(split);
    lineChars = split(lineEl);
    var n = 0;
    words.concat([lineChars]).forEach(function (list) {
      list.forEach(function (c) { c._r = ((n++ * 37) % 13 - 6) / 10; c._k = ''; });   // a fixed little tilt for each letter
    });
    if (srEl) srEl.textContent = wordEls.map(function (e) { return e.textContent; }).join(' ') + ' ' + lineEl.textContent;
    measureTriad();
  }

  // v: 0 -> 1 while the letter is painted in; e: 0 -> 1 while it is erased.
  function paint(c, v, e) {
    var key = v.toFixed(3) + '|' + e.toFixed(3);
    if (c._k === key) return;
    c._k = key;
    var st = c.style, a, glow, tx = 0, ty = 0, sc = 1, rot = 0, rgb = '242,240,235';
    if (e > 0) {                                     // erased: fades out with a last flicker, drifting a little to the left
      a = 1 - smooth(e);
      glow = Math.sin(Math.PI * e) * 0.5;
      tx = -0.05 * e;
    } else {                                         // painted in: lights up white with a glow, rises, settles into the paper colour
      var k = Math.sin(Math.PI * v);
      var s = smooth(clamp((v - 0.45) / 0.55));
      a = Math.min(1, v / 0.45);
      glow = k;
      ty = 0.08 * (1 - v);
      sc = 1 + 0.05 * k;
      rot = c._r * k;
      rgb = Math.round(255 - 13 * s) + ',' + Math.round(255 - 15 * s) + ',' + Math.round(255 - 20 * s);
    }
    if (a <= 0.002) { st.color = 'transparent'; st.textShadow = 'none'; st.transform = ''; return; }
    st.color = 'rgba(' + rgb + ',' + a.toFixed(3) + ')';
    st.textShadow = glow > 0.01 ? '0 0 ' + (0.3 * glow).toFixed(3) + 'em rgba(255,255,255,' + (0.85 * glow).toFixed(3) + ')' : 'none';
    st.transform = (tx === 0 && ty < 0.0005 && sc < 1.0005 && Math.abs(rot) < 0.005) ? '' :
      'translate(' + tx.toFixed(4) + 'em,' + ty.toFixed(4) + 'em) scale(' + sc.toFixed(4) + ') rotate(' + rot.toFixed(3) + 'deg)';
  }

  function render() {
    var p = cur, pe = seg(p, 'erase'), pl = seg(p, 'line');
    var vis = 0;                                      // how much of the group has been written so far (px), to keep it centred
    words.forEach(function (chars, wi) {
      var pw = smooth(seg(p, 'w' + (wi + 1)));
      var n = chars.length;
      if (pw > 0) {
        var reach = geo.stacked ? clamp(pw * 8) : clamp(pw / (1 - WC));      // a word's right edge runs along it while it is painted
        vis = Math.max(vis, geo.left[wi] * clamp(pw * 8) + reach * geo.size[wi]);
      }
      chars.forEach(function (c, j) {
        var x = n > 1 ? j / (n - 1) : 0;
        paint(c, clamp((pw - x * (1 - WC)) / WC), clamp((pe - (1 - x) * (1 - WE)) / WE));   // erased from the right end: the last letter goes first
      });
    });
    var off = (geo.total - vis) / 2;                  // what is written is always in the middle of the screen: the group slides as words are added
    var tf = off > 0.5 ? (geo.stacked ? 'translate3d(0,' + off.toFixed(1) + 'px,0)' : 'translate3d(' + off.toFixed(1) + 'px,0,0)') : '';
    if (triad._tf !== tf) { triad._tf = tf; triad.style.transform = tf; }
    var m = lineChars.length;
    lineChars.forEach(function (c, j) {
      var x = m > 1 ? j / (m - 1) : 0;
      paint(c, clamp((pl - x * (1 - WL)) / WL), 0);
    });
  }

  /* ---------- the scroll ---------- */

  var cur = 0, target = 0, raf = 0, last = 0;
  var start = 0, len = 1;

  function onScroll() {
    var t = clamp((window.pageYOffset - start) / len);
    if (t === target) return;
    target = t;
    kick();
  }
  function kick() {
    if (raf) return;
    last = performance.now();
    raf = window.requestAnimationFrame(loop);
  }
  // the painting follows the scroll position with the site's scroll smoothing, so it never jumps; it only runs while it has somewhere to go
  function loop(now) {
    var dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    var d = target - cur;
    if (Math.abs(d) < 0.00005) { cur = target; raf = 0; render(); return; }
    cur += d * Math.min(1, dt * M.follow);                  // the same smoothing as the wheel (Lenis lerp 0.1), see css/motion.css
    render();
    raf = window.requestAnimationFrame(loop);
  }

  function measure() {
    start = section.getBoundingClientRect().top + window.pageYOffset;      // where the section starts in the page (it is not sticky itself)
    len = Math.max(1, section.offsetHeight - stage.offsetHeight);           // how far the held screen travels
    measureTriad();
    kick();
    onScroll();
  }

  /* ---------- start ---------- */

  section.classList.add('vision-live');
  stage.setAttribute('aria-hidden', 'true');                                // the words are in the hidden paragraph for assistive tech
  build();
  measure();
  cur = target;
  render();

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', measure);
  window.addEventListener('load', measure);
  if (window.ResizeObserver) new ResizeObserver(measure).observe(document.getElementById('site') || document.body);
  // the language switch swaps the text (and wipes the letters): split it again
  window.addEventListener('bromaslog:languagechange', function () { build(); render(); });
})();
