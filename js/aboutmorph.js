/*
 * About page (#chi-siamo): one white page that is HELD on screen while the scroll plays everything, the same way js/vision.js paints
 * "Direzione. Tensione. Spazio." on the page that follows: the scroll position IS the animation (scrubbed, forwards and backwards), nothing
 * is started by a gesture, nothing blocks the visitor. The three machines are those three words: TEXY (direction), EQU 8 (tension),
 * DENSITRAX (space).
 *
 * How it is held: the white page is sticky (css/site.css), and an empty "runway" (.about-runway) after it gives the scroll its length.
 * While the runway goes by the white page stays put, then the black page rises over it (js/overlay.js).
 *
 * The script, in screens of scroll (BEATS below):
 *   - the company text rests;
 *   - intro: the headline goes from three lines to ONE line across the page, the TEXY TRJ W photo rises from below, the company text
 *     dissolves into small squares and the machine text re-assembles from squares;
 *   - TEXY rests; then machine 1 slides out to the left while EQU 8 comes in from the right (a carousel); EQU 8 rests;
 *   - the same once more for DENSITRAX; it rests; the black page rises.
 *
 * Two GSAP timelines hold the movement (paused, set to the frame that matches the scroll): `tl` the intro, `tlS` the carousel (SLIDE seconds
 * per step). The squares are drawn on one small canvas laid over the text (a few thousand squares, no extra DOM); the real text stays in the
 * HTML and is only shown when it is "on".
 *
 * Phones (< 768px) and "reduce motion": no sequence and no holding, the machine blocks simply follow the text (photo above its description).
 */
(function () {
  'use strict';
  var gsap = window.gsap;
  var section = document.getElementById('chi-siamo');
  var hero = document.querySelector('.site-hero');
  var runway = document.querySelector('.about-runway');
  var title = section && section.querySelector('.sec-title');
  var cols = section && section.querySelector('.sec-cols');
  var machine = section && section.querySelector('.about-machine:not(.am-second):not(.am-third)');
  var media = machine && machine.querySelector('.am-media');
  var copy = machine && machine.querySelector('.am-copy');
  var machine2 = section && section.querySelector('.about-machine.am-second');
  var media2 = machine2 && machine2.querySelector('.am-media');
  var copy2 = machine2 && machine2.querySelector('.am-copy');
  var machine3 = section && section.querySelector('.about-machine.am-third');
  var media3 = machine3 && machine3.querySelector('.am-media');
  var copy3 = machine3 && machine3.querySelector('.am-copy');
  if (!gsap || !section || !hero || !runway || !title || !cols || !machine || !media || !copy || !machine2 || !media2 || !copy2 || !machine3 || !media3 || !copy3) return;
  var machines = [machine, machine2, machine3], medias = [media, media2, media3], copies = [copy, copy2, copy3];
  var imgs = medias.map(function (m) { return m.querySelector('.am-img'); });

  var params = new URLSearchParams(window.location.search);
  var reduced = params.get('motion') === 'reduced' ||
    (params.get('motion') !== 'full' && !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches));

  var desktop = window.matchMedia ? window.matchMedia('(min-width: 768px)') : { matches: true };

  var CELL = 3;                 // size of the dissolve squares, in CSS px
  var DRIFT = 7;                // how far a square wanders, in CSS px
  var SLIDE = 2.6;              // seconds of the carousel timeline per step

  // The script: vh of scroll for each beat. Change a number to make a part longer or shorter.
  var BEATS = [
    ['rest0', 25],              // the company text
    ['intro', 120],             // headline -> one line, photo rises, text dissolves and re-assembles
    ['rest1', 50],              // TEXY TRJ W
    ['slide1', 100],            // TEXY out, EQU 8 in
    ['rest2', 50],              // EQU 8
    ['slide2', 100],            // EQU 8 out, DENSITRAX in
    ['rest3', 60]               // DENSITRAX, then the black page
  ];
  var total = 0, at = {};
  BEATS.forEach(function (b) { at[b[0]] = [total, total + b[1]]; total += b[1]; });
  runway.style.setProperty('--about-run', String(total));
  function seg(p, name) {
    var a = at[name][0] / total, b = at[name][1] / total;
    return p <= a ? 0 : p >= b ? 1 : (p - a) / (b - a);
  }

  var tl = null, tlS = null;    // tl: the intro; tlS: the carousel (one timeline, SLIDE seconds per step)
  var fx = { old: 0, neu: 0, s2: 0, s3: 0 };  // progress of the square transitions, and of the two carousel steps

  function active() { return desktop.matches && !reduced; }

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
    var h = 0;
    [[machine2, copy2], [machine3, copy3]].forEach(function (pair) {   // the other machines: same photo slot, text shifted so that the description is at that same height
      var m = pair[0], c = pair[1];
      m.style.setProperty('--am-top', top.toFixed(1) + 'px');
      c.style.marginTop = '0px';
      var shift = offset - m.querySelector('.am-text').offsetTop;       // a longer name moves up, a shorter one down
      c.style.marginTop = shift.toFixed(1) + 'px';
      h = Math.max(h, m.offsetHeight, c.offsetHeight + shift);
    });
    var need = top + Math.max(machine.offsetHeight, h) + Math.max(56, window.innerWidth * 0.06);
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

  var fxReady = false;
  // Cutting the text into squares takes a few tens of ms: it is done once, when the page is idle (or just before it is first needed).
  // The text must be measured in its neutral state (before anything has moved), wherever the scroll is: the timelines are put on their
  // first frame for that, then back where they were.
  function ensureFx() {
    if (fxReady || !tl || !tlS) return;
    var t1 = tl.time(), t2 = tlS.time();
    tl.time(0, true); tlS.time(0, true);
    prepareFx();
    tl.time(t1, true); tlS.time(t2, true);
    fxReady = true;
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
    copy.style.visibility = (n >= 0.98 && fx.s2 < 1) ? 'visible' : 'hidden';
    copy2.style.visibility = (fx.s2 > 0 && fx.s3 < 1) ? 'visible' : 'hidden';
    copy3.style.visibility = fx.s3 > 0 ? 'visible' : 'hidden';
    var drawing = canvas && fxOld && fxNew && ((o > 0 && o < 1) || (n > 0 && n < 1));
    if (!drawing) { clearFx(); return; }
    canvas.style.display = 'block';
    ctx.setTransform(fxOld.dpr, 0, 0, fxOld.dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.width / fxOld.dpr, canvas.height / fxOld.dpr);
    if (o > 0 && o < 1) drawSquares(fxOld, o, true);
    if (n > 0 && n < 1) drawSquares(fxNew, n, false);
  }

  /* ======================================================================
     The timelines
     ====================================================================== */

  function killTl() {
    if (tl) { tl.kill(); tl = null; }
    if (tlS) { tlS.kill(); tlS = null; }
  }

  function build() {
    killTl();
    fxReady = false;
    shownKey = '';
    fx.old = fx.neu = fx.s2 = fx.s3 = 0;               // a tween that is "to" a value starts from whatever the value is when it is first drawn: these must be 0 here, not what the last build left
    var info = targets();
    if (!info) return false;
    var dy = layout(info);
    var kids = copies.map(function (c) { return Array.prototype.slice.call(c.children); });
    var left = machine.offsetLeft + media.offsetLeft;
    gsap.set(media, { x: 0, y: dy });
    gsap.set(imgs[0], { x: 0 }); gsap.set(kids[0], { x: 0, opacity: 1 });
    for (var k = 1; k < 3; k++) {                                                    // the other machines wait beyond the right edge of the page
      gsap.set(medias[k], { x: section.clientWidth - left, y: 0 });
      gsap.set(imgs[k], { x: 140 }); gsap.set(kids[k], { x: 70, opacity: 0 });
    }

    // Eases are gentle (power2 / sine / none): the timelines follow the scroll, and a sharp ease would leave the start and the end of every
    // movement almost still and rush through the middle.
    var EM = 'power2.inOut';
    // Every start value is written out (fromTo), never read from the page: the timeline is scrubbed back and forth, and after a rebuild the
    // page may be in any state.
    var NO = { immediateRender: false };
    tl = gsap.timeline({ paused: true });
    info.list.forEach(function (d, i) {                                              // headline: three lines -> one line
      tl.fromTo(d.el, { x: 0, y: 0, scale: 1 }, Object.assign({ x: d.x, y: d.y, scale: d.scale, duration: 2.1, ease: EM }, NO), i * 0.06);
    });
    tl.fromTo(media, { y: dy }, Object.assign({ y: 0, duration: 2.6, ease: EM }, NO), 0.2);          // photo rises
    tl.fromTo(fx, { old: 0 }, Object.assign({ old: 1, duration: 0.85, ease: 'none' }, NO), 1.2);     // old text dissolves
    tl.fromTo(fx, { neu: 0 }, Object.assign({ neu: 1, duration: 0.9, ease: 'none' }, NO), 1.95);     // machine text assembles
    tl.to({}, { duration: 0.1 }, 2.85);                                              // settle

    // Carousel, one timeline for both steps (SLIDE seconds each): the current machine slides out to the left, the next comes in from the
    // right (photos with a little depth between them, the text lines follow one after the other). The text of the machine that leaves
    // is gone before the next photo reaches its column, and the new text only appears once that photo has cleared its column.
    var out = left + media.offsetWidth + 60;
    var NI = { immediateRender: false };
    tlS = gsap.timeline({ paused: true });
    function step(t0, a, b, key) {
      tlS.fromTo(medias[a], { x: 0 }, Object.assign({ x: -out, duration: 1.6, ease: EM }, NI), t0);
      tlS.fromTo(imgs[a], { x: 0 }, Object.assign({ x: -110, duration: 1.6, ease: EM }, NI), t0);
      tlS.fromTo(medias[b], { x: section.clientWidth - left }, Object.assign({ x: 0, duration: 1.6, ease: EM }, NI), t0 + 0.1);
      tlS.fromTo(imgs[b], { x: 140 }, Object.assign({ x: 0, duration: 1.6, ease: EM }, NI), t0 + 0.1);
      tlS.fromTo(kids[a], { x: 0, opacity: 1 }, Object.assign({ x: -60, opacity: 0, duration: 0.35, ease: 'power2.in', stagger: 0.03 }, NI), t0);
      tlS.fromTo(kids[b], { x: 70, opacity: 0 }, Object.assign({ x: 0, opacity: 1, duration: 0.8, ease: 'power2.out', stagger: 0.06 }, NI), t0 + 1.45);
      var from = {}; from[key] = 0;
      var to = { duration: 1.7, ease: 'none' }; to[key] = 1;
      tlS.fromTo(fx, from, Object.assign(to, NI), t0);
    }
    step(0, 0, 1, 's2');
    step(SLIDE, 1, 2, 's3');
    tlS.to({}, { duration: 0.05 }, 2 * SLIDE);                                      // settle (the timeline reaches the end of step 2)
    return true;
  }

  // which machine is at rest on the page (for assistive tech and for the mouse: only that one can be clicked)
  var shownKey = '';
  function aria(pi, s1, s2) {
    var shown = pi < 1 ? -1 : s1 < 0.5 ? 0 : s2 < 0.5 ? 1 : 2;
    var colsHidden = pi > 0.5;
    var key = shown + '|' + colsHidden;
    if (key === shownKey) return;
    shownKey = key;
    machines.forEach(function (m, i) {
      if (i === shown) m.removeAttribute('aria-hidden'); else m.setAttribute('aria-hidden', 'true');
      m.classList.toggle('am-on', i === shown);
    });
    if (colsHidden) cols.setAttribute('aria-hidden', 'true'); else cols.removeAttribute('aria-hidden');
  }

  // puts the timelines on the frame that matches the scroll (p: 0..1 over the whole script)
  function apply(p) {
    if (!tl || !tlS) return;
    var pi = seg(p, 'intro'), s1 = seg(p, 'slide1'), s2 = seg(p, 'slide2');
    if (!fxReady && pi > 0) ensureFx();                       // normally done while idle; this is only in case the scroll got here first
    tl.time(pi * tl.duration(), true);
    tlS.time(SLIDE * (s1 + s2), true);
    render();
    aria(pi, s1, s2);
  }

  /* ======================================================================
     The scroll
     ====================================================================== */

  var cur = 0, target = 0, raf = 0, last = 0;
  var start = 0, len = 1;

  function onScroll() {
    if (!tl) return;
    var t = (window.pageYOffset - start) / len;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    if (t === target) return;
    target = t;
    kick();
  }
  function kick() {
    if (raf) return;
    last = performance.now();
    raf = window.requestAnimationFrame(loop);
  }
  // the page follows the scroll position with a short ease, so it never jumps; it only runs while it has somewhere to go
  function loop(now) {
    var dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    var d = target - cur;
    if (Math.abs(d) < 0.00005) { cur = target; raf = 0; apply(cur); return; }
    cur += d * Math.min(1, dt * 7);
    apply(cur);
    raf = window.requestAnimationFrame(loop);
  }

  // The white page is held from the moment its bottom edge meets the bottom of the screen (where the runway starts to come into view)
  // for as long as the runway is. (measured when the layout changes, not on every scroll event)
  function measure() {
    if (!tl) return;
    start = Math.max(runway.getBoundingClientRect().top + window.pageYOffset - window.innerHeight, hero.offsetHeight);
    len = Math.max(1, runway.offsetHeight);
    onScroll();
    kick();
  }

  // idle time: cut the text into squares now, so the first dissolve does not have to
  function whenIdle(fn) {
    if (window.requestIdleCallback) window.requestIdleCallback(fn, { timeout: 1200 });
    else window.setTimeout(fn, 200);
  }
  function prepareLater() {
    whenIdle(function () { if (tl && active()) { ensureFx(); apply(cur); } });
  }

  // (Re)builds the timelines for the current size and puts them on the frame of the current scroll position.
  function rebuild() {
    if (!build()) return;
    measure();
    cur = target;
    apply(cur);
    prepareLater();
  }

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
    runway.classList.remove('is-live');
    machines.forEach(function (m) {
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
    cur = target = 0;
    // simple fade-up when they scroll into view (nothing at all with reduced motion)
    if (io) { io.disconnect(); io = null; }
    if (reduced || !('IntersectionObserver' in window)) { machines.forEach(function (m) { m.classList.remove('am-pre'); }); return; }
    machines.forEach(function (m) { m.classList.add('am-pre'); });
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.remove('am-pre'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -12% 0px' });
    machines.forEach(function (m) { io.observe(m); });
  }

  function toDesktop() {
    if (io) { io.disconnect(); io = null; }
    section.classList.remove('am-flat');
    runway.classList.add('is-live');
    machines.forEach(function (m) { m.classList.remove('am-pre'); });
    rebuild();
  }

  var rz = 0;
  function refresh() {
    if (rz) return;
    rz = window.requestAnimationFrame(function () {
      rz = 0;
      if (flat()) { toFlat(); return; }
      toDesktop();
    });
  }
  window.addEventListener('resize', refresh);
  if (desktop.addEventListener) desktop.addEventListener('change', refresh);
  // the language switch swaps the texts (and re-splits the headline: textreveal.js runs first)
  window.addEventListener('bromaslog:languagechange', function () {
    window.requestAnimationFrame(function () { window.requestAnimationFrame(function () {
      if (flat()) return;
      rebuild();
    }); });
  });
  window.addEventListener('scroll', onScroll, { passive: true });
  // the page above or below changes height (fonts, images): the runway moves
  if (window.ResizeObserver) new ResizeObserver(function () { measure(); }).observe(document.getElementById('site') || document.body);

  var ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  ready.then(function () {
    window.setTimeout(function () {
      if (flat()) { toFlat(); return; }
      toDesktop();
    }, 300);
  });
})();
