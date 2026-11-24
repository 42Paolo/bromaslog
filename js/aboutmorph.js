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
 * A second step works the same way: one more scroll attempt slides machine 1 out to the left while machine 2 (EQU 8 creel) comes in from
 * the right, like a carousel; scrolling back up reverses it.
 *
 * Phones (< 768px) and "reduce motion": no sequence and no scroll lock, the machine blocks simply follow the text (photo above its description).
 */
(function () {
  'use strict';
  var gsap = window.gsap;
  var root = document.documentElement;
  var section = document.getElementById('chi-siamo');
  var hero = document.querySelector('.site-hero');
  var title = section && section.querySelector('.sec-title');
  var cols = section && section.querySelector('.sec-cols');
  var machine = section && section.querySelector('.about-machine:not(.am-second)');
  var media = machine && machine.querySelector('.am-media');
  var copy = machine && machine.querySelector('.am-copy');
  var machine2 = section && section.querySelector('.about-machine.am-second');
  var media2 = machine2 && machine2.querySelector('.am-media');
  var copy2 = machine2 && machine2.querySelector('.am-copy');
  if (!gsap || !section || !hero || !title || !cols || !machine || !media || !copy || !machine2 || !media2 || !copy2) return;
  var img = media.querySelector('.am-img'), img2 = media2.querySelector('.am-img');

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

  // INITIAL (company text) -> FWD -> FINAL (machine 1) -> FWD2 -> SECOND (machine 2), and the same way back (REV2, REV).
  var state = 'INITIAL';        // INITIAL | FWD | FINAL | REV | FWD2 | SECOND | REV2
  var arrived = null;           // 'down' | 'up': the page is held on the white page waiting for a scroll attempt
  var holdUntil = 0;
  var lastWheel = 0;
  var swallowTail = false;      // right after a release: ignore the rest of the gesture that was going on
  var lastY = window.pageYOffset;
  var touchY = null;
  var tl = null, tl2 = null;
  var dirty = false;            // a resize / language change came while the sequence was running
  var fx = { old: 0, neu: 0, slide: 0 };  // progress of the square transitions, and of the slide from machine 1 to machine 2

  function running() { return state === 'FWD' || state === 'REV' || state === 'FWD2' || state === 'REV2'; }
  var STATES = ['INITIAL', 'FINAL', 'SECOND'];
  function stepOf() { return Math.max(0, STATES.indexOf(state)); }
  // where one more scroll attempt in this direction leads (null: nothing, the page just moves on)
  function nextState(down) {
    if (state === 'INITIAL') return down ? 'FWD' : null;
    if (state === 'FINAL') return down ? 'FWD2' : 'REV';
    if (state === 'SECOND') return down ? null : 'REV2';
    return null;
  }
  function active() { return desktop.matches && !reduced; }
  // Scroll position at which the page rests: the white page is fully in view. When it is a little taller than the screen that is
  // where its bottom edge meets the bottom of the screen (the point where the black footer starts to slide over it), not where its top does.
  function gateY() {
    var extra = Math.max(0, Math.min(section.offsetHeight - window.innerHeight, 120));
    return hero.offsetHeight + extra;
  }
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

  // Top of the machine blocks, room for them in the page, and where the photo waits.
  // The machine description sits at exactly the height of the original paragraph; only the machine name is added, just above it.
  // (Machine 2 has the same photo slot; its text is shifted so that its description is at that same height too.)
  function layout(info) {
    var firstText = cols.querySelector('.sec-text');
    var textTop = cols.offsetTop + (firstText.getBoundingClientRect().top - cols.getBoundingClientRect().top);   // from the top of the page, whatever transform is on
    machine.style.setProperty('--am-top', '0px');
    var offset = machine.querySelector('.am-text').offsetTop;       // from the top of the block (the machine name) to the description
    var minTop = info.top + info.lineH + 40;                        // never closer than 40px to the one-line headline
    var top = Math.max(textTop - offset, minTop);
    machine.style.setProperty('--am-top', top.toFixed(1) + 'px');
    machine2.style.setProperty('--am-top', top.toFixed(1) + 'px');
    copy2.style.marginTop = '0px';
    var offset2 = machine2.querySelector('.am-text').offsetTop;
    var shift = (top + offset) - (top + offset2);                   // = offset - offset2 (a longer name moves up, a shorter one down)
    copy2.style.marginTop = shift.toFixed(1) + 'px';
    var h2 = Math.max(machine2.offsetHeight, copy2.offsetHeight + shift);
    var need = top + Math.max(machine.offsetHeight, h2) + Math.max(56, window.innerWidth * 0.06);
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
    copy.style.visibility = (n >= 0.98 && fx.slide < 1) ? 'visible' : 'hidden';
    copy2.style.visibility = fx.slide > 0 ? 'visible' : 'hidden';
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
    if (tl2) { tl2.kill(); tl2 = null; }
  }

  function build() {
    killTl();
    var info = targets();
    if (!info) return false;
    var dy = layout(info);
    var kids1 = Array.prototype.slice.call(copy.children), kids2 = Array.prototype.slice.call(copy2.children);
    gsap.set(media, { x: 0, y: dy });
    gsap.set(img, { x: 0 }); gsap.set(kids1, { x: 0, opacity: 1 });
    // machine 2 waits beyond the right edge of the page
    var left = machine.offsetLeft + media.offsetLeft;
    gsap.set(media2, { x: section.clientWidth - left, y: 0 });
    gsap.set(img2, { x: 140 }); gsap.set(kids2, { x: 70, opacity: 0 });

    tl = gsap.timeline({ paused: true, onUpdate: render, onComplete: onForwardDone, onReverseComplete: onReverseDone });
    info.list.forEach(function (d, i) {                                              // headline: three lines -> one line
      tl.to(d.el, { x: d.x, y: d.y, scale: d.scale, duration: 2.1, ease: 'power3.inOut' }, i * 0.06);
    });
    tl.to(media, { y: 0, duration: 2.6, ease: 'power3.inOut' }, 0.2);                // photo rises
    tl.to(fx, { old: 1, duration: 0.85, ease: 'power1.inOut' }, 1.2);                // old text dissolves
    tl.to(fx, { neu: 1, duration: 0.9, ease: 'power1.inOut' }, 1.95);                // machine text assembles
    tl.to({}, { duration: 0.1 }, 2.85);                                              // settle

    // Carousel: machine 1 slides out to the left, machine 2 comes in from the right (photos with a little depth between them,
    // the text lines follow one after the other).
    var out = left + media.offsetWidth + 60;
    tl2 = gsap.timeline({ paused: true, onUpdate: render, onComplete: onForward2Done, onReverseComplete: onReverse2Done });
    tl2.to(media, { x: -out, duration: 1.6, ease: 'power3.inOut' }, 0);
    tl2.to(img, { x: -110, duration: 1.6, ease: 'power3.inOut' }, 0);
    tl2.to(media2, { x: 0, duration: 1.6, ease: 'power3.inOut' }, 0.1);
    tl2.to(img2, { x: 0, duration: 1.6, ease: 'power3.inOut' }, 0.1);
    tl2.to(kids1, { x: -60, opacity: 0, duration: 0.6, ease: 'power2.in', stagger: 0.05 }, 0);
    tl2.to(kids2, { x: 0, opacity: 1, duration: 0.9, ease: 'power3.out', stagger: 0.08 }, 0.7);
    tl2.to(fx, { slide: 1, duration: 1.7, ease: 'none' }, 0);
    return true;
  }

  function showState() {
    var s1 = state === 'FINAL', s2 = state === 'SECOND', final = s1 || s2 || state === 'FWD2' || state === 'REV2';
    if (s1) machine.removeAttribute('aria-hidden'); else machine.setAttribute('aria-hidden', 'true');
    if (s2) machine2.removeAttribute('aria-hidden'); else machine2.setAttribute('aria-hidden', 'true');
    machine.classList.toggle('am-on', s1);
    machine2.classList.toggle('am-on', s2);
    if (final) cols.setAttribute('aria-hidden', 'true'); else cols.removeAttribute('aria-hidden');
  }

  // puts the timelines on the frames that match the current (resting) state
  function applyState() {
    var step = stepOf();
    fx.old = fx.neu = step >= 1 ? 1 : 0;
    fx.slide = step >= 2 ? 1 : 0;
    tl.progress(step >= 1 ? 1 : 0, true);
    tl2.progress(step >= 2 ? 1 : 0, true);
    render();
    showState();
  }

  // (Re)builds the timelines and applies the current state.
  function rebuild() {
    if (!build()) return;
    applyState();
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

  // a step has ended: if there is more in the direction the visitor was going the page keeps resting here, otherwise it lets go
  function afterStep(down) {
    showState();
    if (nextState(down)) { arrived = down ? 'down' : 'up'; holdUntil = Date.now() + HOLD; swallowTail = true; }
    else release();
    if (dirty) { dirty = false; rebuild(); }
  }
  function onForwardDone() { state = 'FINAL'; afterStep(true); }
  function onForward2Done() { state = 'SECOND'; afterStep(true); }
  function onReverse2Done() { state = 'FINAL'; afterStep(false); }
  function onReverseDone() { state = 'INITIAL'; afterStep(false); }

  function start(next) {
    if (!tl || running()) return;
    if (dirty) { dirty = false; rebuild(); }
    arrived = null;
    if (next === 'FWD' || next === 'REV') prepareFx();
    state = next;
    if (next === 'FWD') tl.timeScale(1).play(0);
    else if (next === 'REV') tl.timeScale(REVERSE_SPEED).reverse(tl.duration());
    else if (next === 'FWD2') tl2.timeScale(1).play(0);
    else if (next === 'REV2') tl2.timeScale(1.3).reverse(tl2.duration());
  }

  // straight to a state, no sequence and no hold
  function jump(step) {
    if (!tl) return;
    state = STATES[step];
    applyState();
    if (arrived || root.classList.contains('is-about-hold')) release();
    swallowTail = false;
  }

  function onScroll() {
    if (!active() || !tl) return;
    var y = window.pageYOffset, g = gateY();
    if (running() || arrived) clampToGate();
    else if (state !== 'SECOND' && lastY < g - 0.5 && y >= g - 0.5) arrive('down');           // reached the white page going down
    else if (state !== 'INITIAL' && lastY > g + 0.5 && y <= g + 0.5) arrive('up');            // came back up to it
    if (!running() && !arrived && state !== 'INITIAL' && y < lastY && y < g - 0.85 * window.innerHeight) jump(0);   // far back up (link): starts over
    lastY = window.pageYOffset;
  }

  // down: the visitor tries to go further down; otherwise up.
  function attempt(down, e) {
    if (!active() || !tl) return;
    if (running()) { if (e && e.cancelable) e.preventDefault(); return; }
    if (!arrived) return;
    var next = nextState(down);
    if (!next) { arrived = null; lock(false); return; }            // nothing more that way: let the page move
    if (e && e.cancelable) e.preventDefault();
    if (Date.now() >= holdUntil) start(next);
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
    var next = nextState(down);
    if (!next) { attempt(down, e); return; }                                // nothing more that way: the page is let go
    if (e.cancelable) e.preventDefault();
    if (abs < 6) return;
    if (now < holdUntil) {                                                  // a real new swipe during the rest is not lost: it starts when the rest is over
      if ((fresh || rising) && !pending) {
        var from = state;
        pending = window.setTimeout(function () {
          pending = 0;
          if (arrived && state === from && !running()) start(next);
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
    if (below && state !== 'SECOND') jump(2);
    else if (!below && state !== 'INITIAL') jump(0);
  }, true);

  /* ======================================================================
     Phones, reduced motion, resize, language
     ====================================================================== */

  // Phones (and "reduce motion"): no sequence. Everything is simply laid out one after the other.
  var io = null;
  function flat() { return !desktop.matches || reduced; }
  function toFlat() {
    killTl();
    wordsOf().forEach(function (w) { gsap.set(w, { clearProps: 'transform' }); });
    section.classList.add('am-flat');
    [machine, machine2].forEach(function (m) {
      gsap.set(m.querySelector('.am-media'), { clearProps: 'transform' });
      gsap.set(m.querySelector('.am-img'), { clearProps: 'transform' });
      gsap.set(m.querySelector('.am-copy').children, { clearProps: 'transform,opacity' });
      m.querySelector('.am-copy').style.visibility = ''; m.querySelector('.am-copy').style.marginTop = '';
      m.style.removeProperty('--am-top');
      m.removeAttribute('aria-hidden'); m.classList.remove('am-on');
    });
    cols.style.visibility = '';
    cols.removeAttribute('aria-hidden');
    section.style.minHeight = '';
    clearFx();
    state = 'INITIAL'; arrived = null;
    lock(false);
    // simple fade-up when they scroll into view (nothing at all with reduced motion)
    if (io) { io.disconnect(); io = null; }
    if (reduced || !('IntersectionObserver' in window)) { machine.classList.remove('am-pre'); machine2.classList.remove('am-pre'); return; }
    machine.classList.add('am-pre'); machine2.classList.add('am-pre');
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.remove('am-pre'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -12% 0px' });
    io.observe(machine); io.observe(machine2);
  }

  function toDesktop() {
    if (io) { io.disconnect(); io = null; }
    section.classList.remove('am-flat');
    machine.classList.remove('am-pre'); machine2.classList.remove('am-pre');
    rebuild();
  }

  var raf = 0;
  function refresh() {
    if (raf) return;
    raf = window.requestAnimationFrame(function () {
      raf = 0;
      if (flat()) { toFlat(); return; }
      if (running()) { dirty = true; return; }
      toDesktop();
    });
  }
  window.addEventListener('resize', refresh);
  if (desktop.addEventListener) desktop.addEventListener('change', refresh);
  // the language switch swaps the texts (and re-splits the headline: textreveal.js runs first)
  window.addEventListener('bromaslog:languagechange', function () {
    window.requestAnimationFrame(function () { window.requestAnimationFrame(function () {
      if (flat()) return;
      if (running()) { dirty = true; return; }
      rebuild();
    }); });
  });
  window.addEventListener('scroll', onScroll, { passive: true });

  var ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  ready.then(function () {
    window.setTimeout(function () {
      if (flat()) { toFlat(); return; }
      if (window.pageYOffset > gateY() + 5) state = 'SECOND';              // opened (or reloaded) already below the white page
      rebuild();
      lastY = window.pageYOffset;
      onScroll();
    }, 300);
  });
})();
