/*
 * About page (#chi-siamo): two states of the same white page.
 *   A  company introduction: the headline on three lines (top left), the two paragraphs and the link on the right, the lower left empty.
 *   B  the TEXY TRJ W machine: the headline on ONE line across the page, the photo rising into the lower left, the machine text on the right.
 *
 * It is a one-shot sequence started by a scroll attempt, NOT scrubbed: once started it runs at its own speed, and the page cannot move
 * on until it has finished. A small state machine drives it: INITIAL -> FWD -> FINAL -> REV -> INITIAL.
 *   - Scrolling DOWN past the page while in INITIAL plays the sequence forward (one scene: the scene token).
 *   - Scrolling back UP past the page while in FINAL plays it backwards (quicker, like every exit: x 0.8 of the time).
 *   All times, curves and staggers come from the motion tokens (css/motion.css, js/motion.js).
 *   - Arriving on the page never starts anything by itself: the page rests there for a moment (the hold token) and a new scroll gesture is needed.
 *
 * One GSAP timeline holds everything, so reversing it is simply timeline.reverse():
 *   - headline: FLIP, every word travels from its place in the three lines to its place in the one-line layout and grows to the final size;
 *   - photo: rises from below the page (clipped by the page itself);
 *   - text swap: the old paragraphs go (quickly, a little to the left, one after the other) and the machine text comes in from the right, line
 *     after line (every block over TEXT_IN, one after the other). The real text stays in the HTML; it is only shown when it is "on".
 *
 * A second step: one more scroll attempt slides machine 1 out to the left while machine 2 (EQU 8 creel) comes in from the right, like a
 * carousel; a third one does the same with machine 3; scrolling back up reverses them. The text of every machine comes in the same way
 * (the same movement, the same time): in the first scene, in the second step and in the third.
 *
 * Phones (< 768px) and "reduce motion": no sequence and no scroll lock, the machine blocks simply follow the text (photo above its description).
 */
(function () {
  'use strict';
  var gsap = window.gsap;
  var M = window.BromaslogMotion;
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
  var machine3 = section && section.querySelector('.about-machine.am-third');
  var media3 = machine3 && machine3.querySelector('.am-media');
  var copy3 = machine3 && machine3.querySelector('.am-copy');
  if (!gsap || !M || !section || !hero || !title || !cols || !machine || !media || !copy || !machine2 || !media2 || !copy2 || !machine3 || !media3 || !copy3) return;
  var machines = [machine, machine2, machine3], medias = [media, media2, media3], copies = [copy, copy2, copy3];
  var imgs = medias.map(function (m) { return m.querySelector('.am-img'); });

  var params = new URLSearchParams(window.location.search);
  var reduced = params.get('motion') === 'reduced' ||
    (params.get('motion') !== 'full' && !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches));

  var desktop = window.matchMedia ? window.matchMedia('(min-width: 768px)') : { matches: true };
  var lenis = window.bromaslogLenis || null;

  var HOLD = Math.round(M.hold * 1000);   // ms the page rests after a step before a scroll attempt counts
  var ARRIVE_REST = Math.round(M.delay.mid * 1000);   // ms the page rests when the visitor has just come onto it: long enough to be seen
  var FRESH_GAP = 100;          // ms of silence that make a wheel event a new gesture (not the tail of a trackpad flick)
  var RETURN_PATIENCE = 500;    // ms: coming back onto the page, a scroll that keeps going is only held this long
  var NEW_SWIPE_RISE = 30;      // how far (wheel delta) a new swipe has to climb above the slowest point of the one that is fading
  var REVERSE_SPEED = 1 / M.exitRatio;    // the way back is quicker, like every exit (x 0.8 of the time)

  // INITIAL (company text) -> FWD -> FINAL (machine 1) -> FWD2 -> SECOND (machine 2) -> FWD3 -> THIRD (machine 3), and the same way back (REV3, REV2, REV).
  var state = 'INITIAL';        // INITIAL | FWD | FINAL | REV | FWD2 | SECOND | REV2 | FWD3 | THIRD | REV3
  var arrived = null;           // 'down' | 'up': the page is held on the white page waiting for a scroll attempt
  var holdUntil = 0;
  var lastWheel = 0;
  var swallowTail = false;      // right after a release: ignore the rest of the gesture that was going on
  var needFresh = false;        // the visitor has just ARRIVED on the page (from above or below): the scroll that brought them does not start a step,
                                // only a new gesture can: a pause in the wheel, a new swipe on top of the old one (the wheel speeds up again), a new press of
                                // a key, a new touch
  var strictArrival = false;    // true for the very first arrival (from the top of the site onto the company text): the old scroll can never start anything.
                                // Coming back (from the black page, or between machines) it only has to wait RETURN_PATIENCE: after that the visitor goes on
  var arrivedAt = 0, touchStartAt = 0;
  var trough = Infinity;        // the lowest wheel speed seen since arriving: a new swipe is a clear rise above it
  var lastY = window.pageYOffset;
  var touchY = null;
  var tl = null, tlS = null, slideTw = null;     // tl: the first sequence; tlS: the carousel (one timeline, SLIDE seconds per step)
  var SCENE = M.dur.scene;       // the first sequence (headline, photo, text change) is one scene
  var SLIDE = M.dur.primary;     // the change from one machine to the next is the main movement of the page: the photos' step of the carousel
  var TEXT_IN = M.dur.fast * 2;  // the text of a machine comes in block after block, each over this time (twice the fast tier: 0.7 s)
  var STEP = SLIDE;              // the length of one carousel step: SLIDE, or longer if the text needs more time to come in (set in build)
  var dirty = false;            // a resize / language change came while the sequence was running
  // Markers that the timelines carry, only to decide which text is shown (see render): old = the company text is gone, neu = machine 1's text is
  // coming in, s2 / s3 = the progress of the two carousel steps' photos
  var fx = { old: 0, neu: 0, s2: 0, s3: 0 };

  function running() { return /^(FWD|REV)[23]?$/.test(state); }
  var STATES = ['INITIAL', 'FINAL', 'SECOND', 'THIRD'];
  function stepOf() { return Math.max(0, STATES.indexOf(state)); }
  // where one more scroll attempt in this direction leads (null: nothing, the page just moves on)
  function nextState(down) {
    if (state === 'INITIAL') return down ? 'FWD' : null;
    if (state === 'FINAL') return down ? 'FWD2' : 'REV';
    if (state === 'SECOND') return down ? 'FWD3' : 'REV2';
    if (state === 'THIRD') return down ? null : 'REV3';
    return null;
  }
  function active() { return desktop.matches && !reduced; }
  // Scroll position at which the page rests: the white page is fully in view. When it is a little taller than the screen that is
  // where its bottom edge meets the bottom of the screen (the point where the black footer starts to slide over it), not where its top does.
  // (measured when the layout changes, not on every scroll event: reading sizes there would force a reflow each time)
  var gate = hero.offsetHeight;
  function computeGate() {
    gate = hero.offsetHeight + Math.max(0, Math.min(section.offsetHeight - window.innerHeight, 120));
  }
  function gateY() { return gate; }
  if (window.ResizeObserver) { var gro = new ResizeObserver(computeGate); gro.observe(hero); gro.observe(section); }
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
     Which text is shown
     ====================================================================== */

  // The texts are real HTML, moved and faded by the timelines. Here is only which of them is shown at all (the others are hidden from
  // sight, from the pointer and from assistive tech), decided from the markers the timelines carry.
  function render() {
    cols.style.visibility = fx.old >= 1 ? 'hidden' : '';
    copy.style.visibility = (fx.neu > 0 && fx.s2 < 1) ? 'visible' : 'hidden';
    copy2.style.visibility = (fx.s2 > 0 && fx.s3 < 1) ? 'visible' : 'hidden';
    copy3.style.visibility = fx.s3 > 0 ? 'visible' : 'hidden';
  }

  /* ======================================================================
     The timeline
     ====================================================================== */

  function killTl() {
    if (tl) { tl.kill(); tl = null; }
    if (slideTw) { slideTw.kill(); slideTw = null; }
    if (tlS) { tlS.kill(); tlS = null; }
  }

  function build() {
    killTl();
    var info = targets();
    if (!info) return false;
    var dy = layout(info);
    computeGate();
    var kids = copies.map(function (c) { return Array.prototype.slice.call(c.children); });
    var colsText = Array.prototype.slice.call(cols.querySelectorAll('.sec-text, .sec-link'));   // the company text: the blocks that leave
    colsText.forEach(function (el) { el.style.transition = 'none'; });                         // (the link has a reveal transition of its own)
    var left = machine.offsetLeft + media.offsetLeft;
    gsap.set(media, { x: 0, y: dy });
    gsap.set(imgs[0], { x: 0 }); gsap.set(colsText, { x: 0, opacity: 1 });
    for (var k = 0; k < 3; k++) {                                                    // the text of every machine waits to come in from the right...
      gsap.set(kids[k], { x: 70, opacity: 0 });
      if (k === 0) continue;
      gsap.set(medias[k], { x: section.clientWidth - left, y: 0 });                  // ...and the other machines wait beyond the right edge of the page
      gsap.set(imgs[k], { x: 140 });
    }

    // (every tween has its start value written out, so a rebuild never starts from what the previous timeline left behind)
    var N0 = { immediateRender: false };
    tl = gsap.timeline({ paused: true, onUpdate: render, onComplete: onForwardDone, onReverseComplete: onReverseDone });
    // The scene lasts SCENE seconds; its parts are shares of it (they keep the proportions of the first version, which ran 3 s).
    // Headline and photo move with the same curve; the two dissolves overlap in the middle, so the text changes while they travel.
    info.list.forEach(function (d, i) {                                              // headline: three lines -> one line
      tl.fromTo(d.el, { x: 0, y: 0, scale: 1 }, Object.assign({ x: d.x, y: d.y, scale: d.scale, duration: SCENE * 0.7, ease: M.ease.move }, N0), i * M.stagger.base);
    });
    tl.fromTo(media, { y: dy }, Object.assign({ y: 0, duration: SCENE * 0.88, ease: M.ease.move }, N0), SCENE * 0.07);   // photo rises
    // The text change is the same movement as in the carousel steps: the old text goes (quick, a little to the left, block after block), and the
    // machine text comes in from the right, block after block, so that it arrives exactly when the scene ends.
    var enterSpan = TEXT_IN + M.stagger.base * (kids[0].length - 1), leaveSpan = M.dur.micro + M.stagger.tight * (colsText.length - 1);
    tl.fromTo(colsText, { x: 0, opacity: 1 }, Object.assign({ x: -60, opacity: 0, duration: M.dur.micro, ease: M.ease.in, stagger: M.stagger.tight }, N0), SCENE * 0.4);
    tl.fromTo(fx, { old: 0 }, Object.assign({ old: 1, duration: leaveSpan, ease: M.ease.linear }, N0), SCENE * 0.4);          // (marks when the old text is gone)
    tl.fromTo(kids[0], { x: 70, opacity: 0 }, Object.assign({ x: 0, opacity: 1, duration: TEXT_IN, ease: M.ease.out, stagger: M.stagger.base }, N0), SCENE - enterSpan);
    tl.fromTo(fx, { neu: 0 }, Object.assign({ neu: 1, duration: enterSpan, ease: M.ease.linear }, N0), SCENE - enterSpan);    // (marks that the machine text is coming in)
    tl.to({}, { duration: 0.1 }, SCENE - 0.1);                                       // settle: the scene ends exactly at SCENE

    // Carousel, one timeline for both steps (STEP seconds each): the current machine slides out to the left, the next comes in from the right
    // (photos with a little depth between them), and the text of the next machine comes in block after block, the same way as in the first scene
    // (TEXT_IN each). The text of the machine that leaves is gone before the next photo reaches its column, and the new text only appears once that
    // photo has cleared its column. Photos, their text and the markers all move in the same step; the way back is the same step played quicker (exit).
    // The step lasts SLIDE, or as long as the text needs to come in.
    var out = left + media.offsetWidth + 60;
    var E = M.ease.move, NI = { immediateRender: false };
    var travel = SLIDE * 0.65;                                                       // a photo crosses the page in this time
    var textStart = SLIDE * 0.56;                                                    // the new text starts once that photo has cleared its column
    STEP = Math.max(SLIDE, textStart + TEXT_IN + M.stagger.base * (Math.max(kids[1].length, kids[2].length) - 1));
    tlS = gsap.timeline({ paused: true, onUpdate: render });
    function step(t0, a, b, key) {
      tlS.fromTo(medias[a], { x: 0 }, Object.assign({ x: -out, duration: travel, ease: E }, NI), t0);
      tlS.fromTo(imgs[a], { x: 0 }, Object.assign({ x: -110, duration: travel, ease: E }, NI), t0);
      tlS.fromTo(medias[b], { x: section.clientWidth - left }, Object.assign({ x: 0, duration: travel, ease: E }, NI), t0 + M.delay.hair);
      tlS.fromTo(imgs[b], { x: 140 }, Object.assign({ x: 0, duration: travel, ease: E }, NI), t0 + M.delay.hair);
      tlS.fromTo(kids[a], { x: 0, opacity: 1 }, Object.assign({ x: -60, opacity: 0, duration: M.dur.micro, ease: M.ease.in, stagger: M.stagger.tight }, NI), t0);
      tlS.fromTo(kids[b], { x: 70, opacity: 0 }, Object.assign({ x: 0, opacity: 1, duration: TEXT_IN, ease: M.ease.out, stagger: M.stagger.base }, NI), t0 + textStart);
      var from = {}; from[key] = 0;
      var to = { duration: travel, ease: M.ease.linear }; to[key] = 1;
      tlS.fromTo(fx, from, Object.assign(to, NI), t0);
    }
    step(0, 0, 1, 's2');
    step(STEP, 1, 2, 's3');
    tlS.to({}, { duration: 0.02 }, 2 * STEP);                                       // settle (the timeline reaches the end of step 2)
    return true;
  }

  function showState() {
    var shown = STATES.indexOf(state) - 1;                       // which machine is at rest on the page (-1: none)
    machines.forEach(function (m, i) {
      if (i === shown) m.removeAttribute('aria-hidden'); else m.setAttribute('aria-hidden', 'true');
      m.classList.toggle('am-on', i === shown);
    });
    if (shown >= 0 || /^(FWD|REV)[23]$/.test(state)) cols.setAttribute('aria-hidden', 'true'); else cols.removeAttribute('aria-hidden');
  }

  // puts the timelines on the frames that match the current (resting) state
  function applyState() {
    var step = stepOf();
    // The fade values are not written here: the timelines carry them. They go back to the start first and then to the frame of this state,
    // so each tween starts from 0 (a tween that first sees a value of 1 would never fade it again) and always draws, even when already there.
    fx.old = fx.neu = fx.s2 = fx.s3 = 0;
    tl.time(0, true);
    tlS.time(0, true);
    tl.progress(step >= 1 ? 1 : 0, true);
    tlS.time(step <= 1 ? 0 : (step - 1) * STEP, true);
    // The text of every machine: where it rests in this state. (A tween that has not started leaves its target as it was, and the blocks of a
    // text come in one after the other, so each one has to wait where its tween will start from.)
    copies.forEach(function (c, k) {
      gsap.set(c.children, k === step - 1 ? { x: 0, opacity: 1 } : k > step - 1 ? { x: 70, opacity: 0 } : { x: -60, opacity: 0 });
    });
    gsap.set(cols.querySelectorAll('.sec-text, .sec-link'), step >= 1 ? { x: -60, opacity: 0 } : { x: 0, opacity: 1 });
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
    needFresh = true;
    strictArrival = dir === 'down' && state === 'INITIAL';       // the first time on the page: it has to be seen
    trough = Infinity;
    arrivedAt = Date.now();
    holdUntil = arrivedAt + (strictArrival ? ARRIVE_REST : HOLD);
    lock(true);
    clampToGate();
  }

  function release() {
    arrived = null;
    needFresh = false;
    swallowTail = true;
    lock(false);
  }

  // A step has ended: the page keeps resting here, whichever way the visitor is going. The next gesture either starts the next step
  // or, when there is none that way (the first text going up, the last machine going down), lets the page move on.
  // So the visitor can never skip over a step, in either direction.
  function afterStep(down) {
    showState();
    arrived = down ? 'down' : 'up';
    needFresh = false;                       // (between two steps a new swipe may follow at once: it only has to be a new one)
    holdUntil = Date.now() + HOLD;
    if (dirty) { dirty = false; rebuild(); }
  }
  function onForwardDone() { state = 'FINAL'; afterStep(true); }
  function onForward2Done() { state = 'SECOND'; afterStep(true); }
  function onForward3Done() { state = 'THIRD'; afterStep(true); }
  function onReverse3Done() { state = 'SECOND'; afterStep(false); }
  function onReverse2Done() { state = 'FINAL'; afterStep(false); }
  function onReverseDone() { state = 'INITIAL'; afterStep(false); }

  function start(next) {
    if (!tl || running()) return;
    if (dirty) { dirty = false; rebuild(); }
    arrived = null;
    needFresh = false;
    state = next;
    if (next === 'FWD') tl.timeScale(1).play(0);
    else if (next === 'REV') tl.timeScale(REVERSE_SPEED).reverse(tl.duration());
    else {                                                           // a carousel step: the playhead of the carousel timeline travels between the two times
      var back = M.exit(STEP);
      var go = { FWD2: [0, STEP, onForward2Done, STEP], REV2: [STEP, 0, onReverse2Done, back], FWD3: [STEP, 2 * STEP, onForward3Done, STEP], REV3: [2 * STEP, STEP, onReverse3Done, back] }[next];
      slideTw = tlS.tweenFromTo(go[0], go[1], { duration: go[3], ease: 'none', onComplete: go[2] });
    }
  }

  // straight to a state, no sequence and no hold
  function jump(step) {
    if (!tl) return;
    state = STATES[step];
    applyState();
    if (arrived || root.classList.contains('is-about-hold')) release();
    needFresh = false;
    swallowTail = false;
  }

  function onScroll() {
    if (!active() || !tl) return;
    var y = window.pageYOffset, g = gateY();
    if (running() || arrived) clampToGate();
    // The page rests on the gate whenever there is a step in the direction the visitor goes: arriving at it, or leaving it from where it
    // stopped (the step before may have ended right here), either way one scroll attempt has to be made to go on.
    else if (state !== 'THIRD' && lastY <= g + 0.5 && y > lastY && y >= g - 0.5) arrive('down');   // going down through the gate
    else if (state !== 'INITIAL' && lastY >= g - 0.5 && y < lastY && y <= g + 0.5) arrive('up');    // going up through the gate
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
    if (needFresh) {                                                        // just arrived with the scroll still going (a big flick, its inertia):
      var age = now - arrivedAt;
      if (!fresh && (strictArrival || age < RETURN_PATIENCE)) {             // nothing of that scroll counts; it ends with a pause in the wheel,
        var restOver = age >= (strictArrival ? ARRIVE_REST : HOLD);         // or, once the page has rested, with a new swipe: the speed climbs
        var newSwipe = restOver && abs >= trough + NEW_SWIPE_RISE && abs >= trough * 1.8;   // well above the lowest point of the old one
        if (!newSwipe) {                                                    // (a coasting trackpad only ever slows down)
          trough = restOver ? Math.min(trough, abs) : abs;
          if (e.cancelable) e.preventDefault();
          e.stopPropagation();
          return;
        }
      }
      needFresh = false;
    }
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
    if (arrived && needFresh && e.repeat && (down || up) && (strictArrival || Date.now() - arrivedAt < RETURN_PATIENCE)) { e.preventDefault(); return; }   // a key held down while arriving does not count: a new press does
    if (down) attempt(true, e);
    else if (up) attempt(false, e);
  }, true);

  window.addEventListener('touchstart', function (e) { touchY = e.touches.length ? e.touches[0].clientY : null; touchStartAt = Date.now(); }, { passive: true, capture: true });
  window.addEventListener('touchmove', function (e) {
    if (touchY === null || !e.touches.length) return;
    if (arrived && needFresh && touchStartAt < arrivedAt && (strictArrival || Date.now() - arrivedAt < RETURN_PATIENCE)) { if (e.cancelable) e.preventDefault(); return; }   // the touch that brought the visitor here is over: a new one is needed
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
    if (below && state !== 'THIRD') jump(3);
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
    gsap.set(cols.querySelectorAll('.sec-text, .sec-link'), { clearProps: 'transform,opacity,transition' });
    section.style.minHeight = '';
    state = 'INITIAL'; arrived = null;
    lock(false);
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
    machines.forEach(function (m) { m.classList.remove('am-pre'); });
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
      if (window.pageYOffset > gateY() + 5) state = 'THIRD';              // opened (or reloaded) already below the white page
      rebuild();
      lastY = window.pageYOffset;
      onScroll();
    }, 300);
  });
})();
