/*
 * About page (#chi-siamo): two states of the same white page.
 *   A  company introduction: the headline on three lines (top left), the two paragraphs and the link on the right, the lower left empty.
 *   B  the TEXY TRJ W machine: the headline on ONE line across the page, the photo rising into the lower left, the machine text on the right.
 *
 * It is a one-shot sequence started by a scroll attempt, NOT scrubbed: once started it runs at its own speed, and the page cannot move
 * on until it has finished. A small state machine drives it: INITIAL -> FWD -> FINAL -> REV -> INITIAL.
 *   - Scrolling DOWN past the page while in INITIAL plays the sequence forward (about 3 s).
 *   - Scrolling back UP past the page while in FINAL plays it backwards (half the time).
 *   - Arriving on the page never starts anything by itself: the page rests there (~0.5 s) and a new scroll gesture is needed.
 *
 * One GSAP timeline holds everything, so reversing it is simply timeline.reverse():
 *   - headline: FLIP, every word travels from its place in the three lines to its place in the one-line layout and grows to the final size;
 *   - photo: rises from below the page (clipped by the page itself);
 *   - text swap: the old paragraphs dissolve into small squares and the new text re-assembles from squares. Both are drawn on one small
 *     canvas laid over the text (a few thousand squares, no extra DOM); the real text stays in the HTML and is only shown when it is "on".
 *
 * Phones (< 768px): no sequence and no scroll lock, the machine block simply follows the text (photo above its description).
 * "Reduce motion": the page shows state B straight away (no sequence, no lock).
 */
(function () {
  'use strict';
  var gsap = window.gsap;
  var root = document.documentElement;
  var section = document.getElementById('chi-siamo');
  var hero = document.querySelector('.site-hero');
  var title = section && section.querySelector('.sec-title');
  var cols = section && section.querySelector('.sec-cols');
  var machine = section && section.querySelector('.about-machine');
  var media = machine && machine.querySelector('.am-media');
  var copy = machine && machine.querySelector('.am-copy');
  if (!gsap || !section || !hero || !title || !cols || !machine || !media || !copy) return;

  var params = new URLSearchParams(window.location.search);
  var reduced = params.get('motion') === 'reduced' ||
    (params.get('motion') !== 'full' && !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches));

  var desktop = window.matchMedia ? window.matchMedia('(min-width: 768px)') : { matches: true };
  var lenis = window.bromaslogLenis || null;

  var HOLD = 500;               // ms the page rests on arrival before a scroll attempt counts
  var FRESH_GAP = 100;          // ms of silence that make a wheel event a new gesture (not the tail of a trackpad flick)
  var REVERSE_SPEED = 2;        // the way back runs twice as fast
  var CELL = 3;                 // size of the dissolve squares, in CSS px
  var DRIFT = 7;                // how far a square wanders, in CSS px

  var state = 'INITIAL';        // INITIAL | FWD | FINAL | REV
  var arrived = null;           // 'down' | 'up': the page is held on the white page waiting for a scroll attempt
  var holdUntil = 0;
  var lastWheel = 0;
  var swallowTail = false;      // right after a release: ignore the rest of the gesture that was going on
  var lastY = window.pageYOffset;
  var touchY = null;
  var tl = null;
  var dirty = false;            // a resize / language change came while the sequence was running
  var fx = { old: 0, neu: 0 };  // progress of the two square transitions

  function running() { return state === 'FWD' || state === 'REV'; }
  function active() { return desktop.matches && !reduced; }
  function gateY() { return hero.offsetHeight; }                      // scroll position at which the white page fills the screen
  // textreveal.js splits the headline into words; with "reduce motion" it does not run, so do it here (same markup, nothing hidden).
  function ensureWords() {
    if (title.querySelector('.tw-word')) return;
    var parts = [];
    Array.prototype.forEach.call(title.childNodes, function (n) {
      if (n.nodeType === 3) n.textContent.split(/\s+/).forEach(function (w) { if (w) parts.push(w); });
      else if (n.nodeName === 'BR') parts.push(null);
    });
    var label = parts.filter(Boolean).join(' ');
    title.textContent = '';
    parts.forEach(function (w, i) {
      if (w === null) { title.appendChild(document.createElement('br')); return; }
      var s = document.createElement('span');
      s.className = 'tw-word';
      s.textContent = w;
      title.appendChild(s);
      if (i < parts.length - 1 && parts[i + 1] !== null) title.appendChild(document.createTextNode(' '));
    });
    title.setAttribute('aria-label', label);
  }
  function wordsOf() { ensureWords(); return Array.prototype.slice.call(title.querySelectorAll('.tw-word')); }

  /* ======================================================================
     Geometry: where the headline words go, and where the machine block sits
     ====================================================================== */

  function frame() {
    var cs = getComputedStyle(section);
    var left = parseFloat(cs.paddingLeft) || 0;
    return { left: left, width: section.clientWidth - left - (parseFloat(cs.paddingRight) || 0) };
  }

  // Each word's travel from the three-line layout to the one-line layout (measured on an invisible copy of the headline).
  function targets() {
    var words = wordsOf();
    if (!words.length) return null;
    var f = frame();
    words.forEach(function (w) { gsap.set(w, { x: 0, y: 0, scale: 1, transformOrigin: '0 0' }); });
    var sRect = section.getBoundingClientRect();
    var tRect = title.getBoundingClientRect();
    var fsA = parseFloat(getComputedStyle(title).fontSize);

    var probe = title.cloneNode(true);
    probe.removeAttribute('id');
    probe.setAttribute('aria-hidden', 'true');
    probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;margin:0;max-width:none;white-space:nowrap;' +
      'text-align:center;transform:none;width:max-content;left:' + f.left + 'px;top:' + (tRect.top - sRect.top) + 'px;';
    Array.prototype.forEach.call(probe.querySelectorAll('br'), function (b) { b.parentNode.replaceChild(document.createTextNode(' '), b); });
    Array.prototype.forEach.call(probe.querySelectorAll('.tw-word'), function (w) { w.style.transform = 'none'; w.style.opacity = '1'; });
    section.appendChild(probe);

    // natural width of the sentence at the current size -> the size at which it fills the content width
    var pw = probe.querySelectorAll('.tw-word');
    var natural = pw[pw.length - 1].getBoundingClientRect().right - pw[0].getBoundingClientRect().left;
    var fsB = fsA * f.width / natural;
    probe.style.fontSize = fsB + 'px';
    probe.style.width = f.width + 'px';

    var list = words.map(function (w, i) {
      var a = w.getBoundingClientRect();
      var b = pw[i].getBoundingClientRect();
      return { el: w, x: b.left - a.left, y: b.top - a.top, scale: fsB / fsA };
    });
    var lineH = probe.getBoundingClientRect().height;
    section.removeChild(probe);
    return { list: list, top: tRect.top - sRect.top, lineH: lineH };
  }

  // Top of the machine block (under the one-line headline), room for it in the page, and where the photo waits.
  function layout(info) {
    var gap = Math.max(56, Math.min(96, window.innerWidth * 0.06));
    var top = info.top + info.lineH + gap;
    machine.style.setProperty('--am-top', top.toFixed(1) + 'px');
    var need = top + machine.offsetHeight + Math.max(56, window.innerWidth * 0.06);
    section.style.minHeight = need > window.innerHeight ? Math.ceil(need) + 'px' : '';
    return section.offsetHeight - top + 24;                      // how far below its place the photo starts: outside the page
  }

  /* ======================================================================
     Square transitions (canvas)
     ====================================================================== */

  var canvas = null, ctx = null;
  var fxOld = null, fxNew = null, fxBox = null;

  // Every word of these elements as the page shows it now: text, position, font, colour.
  function collectWords(roots) {
    var out = [];
    roots.forEach(function (el) {
      var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      var node;
      while ((node = walker.nextNode())) {
        var cs = getComputedStyle(node.parentElement);
        var text = node.nodeValue, re = /\S+/g, m;
        while ((m = re.exec(text))) {
          var r = document.createRange();
          r.setStart(node, m.index);
          r.setEnd(node, m.index + m[0].length);
          var b = r.getClientRects()[0];
          if (!b || !b.width) continue;
          out.push({
            t: cs.textTransform === 'uppercase' ? m[0].toUpperCase() : m[0],
            x: b.left, y: b.top, w: b.width, h: b.height,
            font: cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily,
            size: parseFloat(cs.fontSize) || 16,
            color: cs.color, ls: cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing
          });
        }
      }
    });
    return out;
  }

  function bounds(words) {
    var l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
    words.forEach(function (w) {
      l = Math.min(l, w.x); t = Math.min(t, w.y);
      r = Math.max(r, w.x + w.w); b = Math.max(b, w.y + w.h);
    });
    return { l: Math.floor(l) - 2, t: Math.floor(t) - 2, r: Math.ceil(r) + 2, b: Math.ceil(b) + 2 };
  }

  // Draws the words on an offscreen canvas and cuts them into small squares (only the ones that hold ink).
  function makeSquares(words, box, dpr) {
    var wd = Math.ceil((box.r - box.l) * dpr), hd = Math.ceil((box.b - box.t) * dpr);
    var src = document.createElement('canvas');
    src.width = wd; src.height = hd;
    var c = src.getContext('2d', { willReadFrequently: true });
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.textBaseline = 'alphabetic';
    words.forEach(function (w) {
      c.font = w.font;
      c.fillStyle = w.color;
      if ('letterSpacing' in c) c.letterSpacing = w.ls;
      var asc = c.measureText(w.t).fontBoundingBoxAscent;
      if (!asc) asc = w.size * 0.8;
      c.fillText(w.t, w.x - box.l, w.y - box.t + asc);
    });
    var cs = Math.max(1, Math.round(CELL * dpr));
    var nx = Math.ceil(wd / cs), ny = Math.ceil(hd / cs);
    var data = c.getImageData(0, 0, wd, hd).data;
    var sx = [], sy = [], t = [], vx = [], vy = [];
    for (var j = 0; j < ny; j++) {
      for (var i = 0; i < nx; i++) {
        var ink = false;
        for (var y = j * cs; y < Math.min(hd, (j + 1) * cs) && !ink; y++) {
          for (var x = i * cs; x < Math.min(wd, (i + 1) * cs); x++) {
            if (data[(y * wd + x) * 4 + 3] > 24) { ink = true; break; }
          }
        }
        if (!ink) continue;
        sx.push(i * cs); sy.push(j * cs);
        t.push(0.6 * Math.random() + 0.4 * ((i / nx + j / ny) / 2));     // order of the dissolve: random, with a slow sweep from the top left
        vx.push(Math.random() * 2 - 1); vy.push(Math.random() * 2 - 1);
      }
    }
    return { src: src, cs: cs, n: sx.length, sx: sx, sy: sy, t: t, vx: vx, vy: vy, left: box.l, top: box.t, dpr: dpr };
  }

  function prepareFx() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var oldWords = collectWords(Array.prototype.slice.call(cols.querySelectorAll('.sec-text, .sec-textlink')));
    var newWords = collectWords([copy.querySelector('.am-title'), copy.querySelector('.am-text'), copy.querySelector('.sec-textlink')]);
    if (!oldWords.length || !newWords.length) { fxOld = fxNew = null; return; }
    var bo = bounds(oldWords), bn = bounds(newWords);
    fxOld = makeSquares(oldWords, bo, dpr);
    fxNew = makeSquares(newWords, bn, dpr);
    var m = DRIFT + 4;
    fxBox = { l: Math.min(bo.l, bn.l) - m, t: Math.min(bo.t, bn.t) - m, r: Math.max(bo.r, bn.r) + m, b: Math.max(bo.b, bn.b) + m };
    var sRect = section.getBoundingClientRect();
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.className = 'am-fx';
      canvas.setAttribute('aria-hidden', 'true');
      section.appendChild(canvas);
      ctx = canvas.getContext('2d');
    }
    canvas.width = Math.ceil((fxBox.r - fxBox.l) * dpr);
    canvas.height = Math.ceil((fxBox.b - fxBox.t) * dpr);
    canvas.style.left = (fxBox.l - sRect.left) + 'px';
    canvas.style.top = (fxBox.t - sRect.top) + 'px';
    canvas.style.width = (fxBox.r - fxBox.l) + 'px';
    canvas.style.height = (fxBox.b - fxBox.t) + 'px';
  }

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  // p: 0..1. gone = true: squares leave (dissolve); false: squares arrive (re-assembly).
  function drawSquares(s, p, gone) {
    var css = s.cs / s.dpr;
    var ox = s.left - fxBox.l, oy = s.top - fxBox.t;
    for (var k = 0; k < s.n; k++) {
      var u = clamp01((p - s.t[k] * 0.7) / 0.3);
      var a = gone ? 1 - u : u;
      if (a <= 0) continue;
      var move = gone ? u : 1 - u;
      ctx.globalAlpha = a;
      ctx.drawImage(s.src, s.sx[k], s.sy[k], s.cs, s.cs,
        ox + s.sx[k] / s.dpr + s.vx[k] * move * DRIFT, oy + s.sy[k] / s.dpr + s.vy[k] * move * DRIFT, css, css);
    }
    ctx.globalAlpha = 1;
  }

  function clearFx() {
    if (canvas) canvas.style.display = 'none';
  }

  // Everything that depends on the two progress values: which real text is "on", and the squares in between.
  function render() {
    var o = fx.old, n = fx.neu;
    cols.style.visibility = o <= 0 ? '' : 'hidden';
    copy.style.visibility = n >= 0.98 ? 'visible' : 'hidden';
    var drawing = canvas && fxOld && fxNew && ((o > 0 && o < 1) || (n > 0 && n < 1));
    if (!drawing) { clearFx(); return; }
    canvas.style.display = 'block';
    ctx.setTransform(fxOld.dpr, 0, 0, fxOld.dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.width / fxOld.dpr, canvas.height / fxOld.dpr);
    if (o > 0 && o < 1) drawSquares(fxOld, o, true);
    if (n > 0 && n < 1) drawSquares(fxNew, n, false);
  }

  /* ======================================================================
     The timeline
     ====================================================================== */

  function killTl() {
    if (tl) { tl.kill(); tl = null; }
  }

  function build() {
    killTl();
    var info = targets();
    if (!info) return false;
    var dy = layout(info);
    gsap.set(media, { y: dy });
    tl = gsap.timeline({ paused: true, onUpdate: render, onComplete: onForwardDone, onReverseComplete: onReverseDone });
    info.list.forEach(function (d, i) {                                              // headline: three lines -> one line
      tl.to(d.el, { x: d.x, y: d.y, scale: d.scale, duration: 2.1, ease: 'power3.inOut' }, i * 0.06);
    });
    tl.to(media, { y: 0, duration: 2.6, ease: 'power3.inOut' }, 0.2);                // photo rises
    tl.to(fx, { old: 1, duration: 0.85, ease: 'power1.inOut' }, 1.2);                // old text dissolves
    tl.to(fx, { neu: 1, duration: 0.9, ease: 'power1.inOut' }, 1.95);                // machine text assembles
    tl.to({}, { duration: 0.1 }, 2.85);                                              // settle
    return true;
  }

  function showState() {
    var final = state === 'FINAL';
    if (final) { machine.removeAttribute('aria-hidden'); machine.removeAttribute('inert'); }
    else { machine.setAttribute('aria-hidden', 'true'); machine.setAttribute('inert', ''); }
    if (final) cols.setAttribute('aria-hidden', 'true'); else cols.removeAttribute('aria-hidden');
  }

  // (Re)builds the timeline and puts it on the frame that matches the current state.
  function rebuild() {
    if (!build()) return;
    var final = state === 'FINAL';
    fx.old = fx.neu = final ? 1 : 0;
    tl.progress(final ? 1 : 0, true);
    render();
    showState();
  }

  /* ======================================================================
     Holding the page, and the scroll attempt
     ====================================================================== */

  function lock(on) {
    root.classList.toggle('is-about-hold', on);       // scroll.js keeps Lenis stopped while this class is on
    if (lenis) { if (on) lenis.stop(); else lenis.start(); }
  }

  function clampToGate() {
    if (Math.abs(window.pageYOffset - gateY()) < 0.5) return;
    if (lenis) lenis.scrollTo(gateY(), { immediate: true, force: true });
    else window.scrollTo(0, gateY());
  }

  function arrive(dir) {
    arrived = dir;
    holdUntil = Date.now() + HOLD;
    lock(true);
    clampToGate();
  }

  function release() {
    arrived = null;
    swallowTail = true;
    lock(false);
  }

  function start(dir) {
    if (!tl || running()) return;
    if (dirty) { dirty = false; rebuild(); }
    arrived = null;
    prepareFx();
    state = dir;
    if (dir === 'FWD') tl.timeScale(1).play(0);
    else tl.timeScale(REVERSE_SPEED).reverse(tl.duration());
  }

  function onForwardDone() { state = 'FINAL'; showState(); release(); if (dirty) { dirty = false; rebuild(); } }
  function onReverseDone() { state = 'INITIAL'; showState(); release(); if (dirty) { dirty = false; rebuild(); } }

  // straight to a state, no sequence and no hold
  function jump(final) {
    if (!tl) return;
    state = final ? 'FINAL' : 'INITIAL';
    fx.old = fx.neu = final ? 1 : 0;
    tl.progress(final ? 1 : 0, true);
    render();
    showState();
    if (arrived || root.classList.contains('is-about-hold')) release();
    swallowTail = false;
  }

  function onScroll() {
    if (!active() || !tl) return;
    var y = window.pageYOffset, g = gateY();
    if (running() || arrived) clampToGate();
    else if (state === 'INITIAL' && lastY < g - 0.5 && y >= g - 0.5) arrive('down');          // reached the white page going down
    else if (state === 'FINAL' && lastY > g + 0.5 && y <= g + 0.5) arrive('up');              // came back up to it
    if (!running() && !arrived && state === 'FINAL' && y < lastY && y < g - 0.85 * window.innerHeight) jump(false);   // far back up (link): starts over
    lastY = window.pageYOffset;
  }

  // down: the visitor tries to go further down; otherwise up.
  function attempt(down, e) {
    if (!active() || !tl) return;
    if (running()) { if (e && e.cancelable) e.preventDefault(); return; }
    if (!arrived) return;
    var toward = (arrived === 'down') === down;
    if (!toward) { arrived = null; lock(false); return; }          // the other way: let the page move again
    if (e && e.cancelable) e.preventDefault();
    if (Date.now() >= holdUntil) start(arrived === 'down' ? 'FWD' : 'REV');
  }

  // Trackpads keep sending small wheel events for a second or more after the fingers have left (inertia), and a visitor often starts the
  // next swipe before that has died down. So a scroll attempt is: after the rest, a wheel event of some size that is either a new gesture
  // (a gap before it), a swipe that picks up speed, or simply comes well after the rest.
  var prevAbs = 0, pending = 0;
  window.addEventListener('wheel', function (e) {
    if (!active() || !tl) return;
    var now = Date.now();
    var fresh = now - lastWheel > FRESH_GAP;
    var abs = Math.abs(e.deltaY);
    var rising = abs > prevAbs + 3;
    lastWheel = now;
    prevAbs = abs;
    if (running()) { if (e.cancelable) e.preventDefault(); e.stopPropagation(); return; }
    if (swallowTail) {                                                      // the sequence has just ended: the rest of that gesture does nothing
      if (!fresh && !rising) { if (e.cancelable) e.preventDefault(); e.stopPropagation(); return; }
      swallowTail = false;
    }
    if (!arrived) return;
    var down = e.deltaY > 0;
    if ((arrived === 'down') !== down) { attempt(down, e); return; }        // the other way: the page is let go
    if (e.cancelable) e.preventDefault();
    if (abs < 6) return;
    if (now < holdUntil) {                                                  // a real new swipe during the rest is not lost: it starts when the rest is over
      if ((fresh || rising) && !pending) {
        var dir = arrived;
        pending = window.setTimeout(function () {
          pending = 0;
          if (arrived === dir && !running()) start(dir === 'down' ? 'FWD' : 'REV');
        }, holdUntil - now + 20);
      }
      return;
    }
    if (fresh || rising || now >= holdUntil + 500) attempt(down, e);
  }, { passive: false, capture: true });

  window.addEventListener('keydown', function (e) {
    if (!active() || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    var t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    var down = e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === 'End' || (e.key === ' ' && !e.shiftKey);
    var up = e.key === 'ArrowUp' || e.key === 'PageUp' || e.key === 'Home' || (e.key === ' ' && e.shiftKey);
    if (down) attempt(true, e);
    else if (up) attempt(false, e);
  }, true);

  window.addEventListener('touchstart', function (e) { touchY = e.touches.length ? e.touches[0].clientY : null; }, { passive: true, capture: true });
  window.addEventListener('touchmove', function (e) {
    if (touchY === null || !e.touches.length) return;
    var dy = touchY - e.touches[0].clientY;                              // positive: finger moving up = scrolling down
    if (Math.abs(dy) < 12) return;
    touchY = e.touches[0].clientY;
    attempt(dy > 0, e);
  }, { passive: false, capture: true });

  // Links: one to something below the white page takes the page to its final state at once (nothing should hold it);
  // one to the top of the site starts it over.
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || !active() || !tl || running()) return;
    var id = a.getAttribute('href').slice(1);
    var target = id === 'top' ? hero : (id && document.getElementById(id));
    if (!target || target === section) return;
    var below = target.getBoundingClientRect().top + window.pageYOffset > section.offsetTop;
    if (below && state === 'INITIAL') jump(true);
    else if (!below && state === 'FINAL') jump(false);
  }, true);

  /* ======================================================================
     Phones, reduced motion, resize, language
     ====================================================================== */

  var io = null;
  function toPhone() {
    killTl();
    wordsOf().forEach(function (w) { gsap.set(w, { clearProps: 'transform' }); });
    gsap.set(media, { clearProps: 'transform' });
    cols.style.visibility = ''; copy.style.visibility = '';
    cols.removeAttribute('aria-hidden');
    machine.style.removeProperty('--am-top');
    section.style.minHeight = '';
    clearFx();
    state = 'INITIAL'; arrived = null;
    lock(false);
    machine.removeAttribute('aria-hidden'); machine.removeAttribute('inert');
    // simple fade-up when it scrolls into view (nothing at all with reduced motion)
    if (reduced || !('IntersectionObserver' in window)) { machine.classList.remove('am-pre'); return; }
    if (io) io.disconnect();
    machine.classList.add('am-pre');
    io = new IntersectionObserver(function (entries) {
      if (entries.some(function (e) { return e.isIntersecting; })) { machine.classList.remove('am-pre'); io.disconnect(); }
    }, { rootMargin: '0px 0px -12% 0px' });
    io.observe(machine);
  }

  function toDesktop() {
    if (io) { io.disconnect(); io = null; }
    machine.classList.remove('am-pre');
    if (reduced) state = 'FINAL';
    rebuild();
  }

  var raf = 0;
  function refresh() {
    if (raf) return;
    raf = window.requestAnimationFrame(function () {
      raf = 0;
      if (!desktop.matches) { toPhone(); return; }
      if (running()) { dirty = true; return; }
      toDesktop();
    });
  }
  window.addEventListener('resize', refresh);
  if (desktop.addEventListener) desktop.addEventListener('change', refresh);
  // the language switch swaps the texts (and re-splits the headline: textreveal.js runs first)
  window.addEventListener('bromaslog:languagechange', function () {
    window.requestAnimationFrame(function () { window.requestAnimationFrame(function () {
      if (!desktop.matches) return;
      if (running()) { dirty = true; return; }
      rebuild();
    }); });
  });
  window.addEventListener('scroll', onScroll, { passive: true });

  var ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  ready.then(function () {
    window.setTimeout(function () {
      if (!desktop.matches) { toPhone(); return; }
      var deep = window.pageYOffset > gateY() + 5;                       // opened (or reloaded) already below the white page
      if (reduced || deep) state = 'FINAL';
      rebuild();
      lastY = window.pageYOffset;
      onScroll();
    }, 300);
  });
})();
