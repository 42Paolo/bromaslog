/*
 * About page (#chi-siamo): when the visitor tries to scroll past it, the headline rearranges itself
 * from three lines at the top left into ONE line, centred, spanning almost the whole width.
 *
 * - It is a one-shot animation fired by the scroll attempt, NOT scrubbed: it always runs at its own speed.
 * - Until it has finished the page cannot move on (Lenis is stopped, the position is held on the white page).
 * - Words are moved with transforms (FLIP): each word goes from where it is now to where it sits in the one-line layout,
 *   growing to the final font size. Nothing else on the page changes layout, the text stays real text.
 * - Desktop only (>= 768px: on a phone the sentence would become tiny) and not with "reduce motion".
 * - Scrolling back up above the page resets it, so it plays again the next time.
 */
(function () {
  'use strict';
  var gsap = window.gsap;
  var section = document.getElementById('chi-siamo');
  var hero = document.querySelector('.site-hero');
  var title = section && section.querySelector('.sec-title');
  if (!gsap || !section || !hero || !title) return;

  var params = new URLSearchParams(window.location.search);
  var reduced = params.get('motion') === 'reduced' ||
    (params.get('motion') !== 'full' && !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches));
  if (reduced) return;

  var desktop = window.matchMedia ? window.matchMedia('(min-width: 768px)') : { matches: true };
  var lenis = window.bromaslogLenis || null;

  var DURATION = 1.25;          // seconds, per word
  var STAGGER = 0.05;           // seconds between words
  var EASE = 'power3.inOut';
  var HOLD = 350;               // ms the page rests on arrival before a scroll attempt counts
  var FRESH_GAP = 100;          // ms of silence that make a wheel event a new gesture (not the tail of a trackpad flick)

  var played = false;           // the headline is in its one-line state
  var running = false;          // the animation is in progress
  var arrived = false;          // the page is held on the white page, waiting for a scroll attempt
  var holdUntil = 0;
  var lastWheel = 0;
  var tl = null;
  var touchY = null;

  /* ---------- geometry ---------- */

  function gateY() { return hero.offsetHeight; }                      // scroll position at which the white page fills the screen
  function wordsOf() { return Array.prototype.slice.call(title.querySelectorAll('.tw-word')); }

  // Left edge of the site (the logo and the bar start there): the one-line headline spans from it to the same distance on the right.
  function outerMargin() {
    var brand = document.querySelector('.site-brand');
    var m = brand ? brand.getBoundingClientRect().left : 56;
    return Math.max(16, Math.min(m, window.innerWidth * 0.1));
  }

  // Where every word sits in the one-line layout: measured on an invisible copy of the headline.
  function targets() {
    var words = wordsOf();
    if (!words.length) return null;
    var sRect = section.getBoundingClientRect();
    var tRect = title.getBoundingClientRect();
    var avail = window.innerWidth - 2 * outerMargin();
    var fsA = parseFloat(getComputedStyle(title).fontSize);

    var probe = title.cloneNode(true);
    probe.removeAttribute('id');
    probe.setAttribute('aria-hidden', 'true');
    probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;margin:0;max-width:none;white-space:nowrap;' +
      'text-align:center;transform:none;width:max-content;left:' + (outerMargin() - sRect.left) + 'px;top:' + (tRect.top - sRect.top) + 'px;';
    Array.prototype.forEach.call(probe.querySelectorAll('br'), function (b) { b.parentNode.replaceChild(document.createTextNode(' '), b); });
    Array.prototype.forEach.call(probe.querySelectorAll('.tw-word'), function (w) { w.style.transform = 'none'; w.style.opacity = '1'; });
    section.appendChild(probe);

    // natural width of the whole sentence at the current size -> the size that makes it fill the available width
    var first = probe.querySelectorAll('.tw-word')[0].getBoundingClientRect().left;
    var pw = probe.querySelectorAll('.tw-word');
    var natural = pw[pw.length - 1].getBoundingClientRect().right - first;
    var fsB = fsA * avail / natural;
    probe.style.fontSize = fsB + 'px';
    probe.style.width = avail + 'px';

    var out = words.map(function (w, i) {
      // the word as it is laid out right now (without our own transform)
      var prev = w.style.transform;
      gsap.set(w, { x: 0, y: 0, scale: 1 });
      var a = w.getBoundingClientRect();
      var b = pw[i].getBoundingClientRect();
      return { el: w, x: b.left - a.left, y: b.top - a.top, scale: fsB / fsA };
    });
    section.removeChild(probe);
    return out;
  }

  /* ---------- the animation ---------- */

  function setFinal() {
    var t = targets();
    if (t) t.forEach(function (d) { gsap.set(d.el, { x: d.x, y: d.y, scale: d.scale, transformOrigin: '0 0' }); });
  }

  function clearWords() {
    wordsOf().forEach(function (w) { gsap.set(w, { clearProps: 'transform' }); });
  }

  var root = document.documentElement;
  function lock(on) {
    root.classList.toggle('is-about-hold', on);       // scroll.js keeps Lenis stopped while this class is on
    if (lenis) { if (on) lenis.stop(); else lenis.start(); }
  }

  function release() {
    running = false;
    arrived = false;
    lock(false);
  }

  function play() {
    if (running || played) return;
    var t = targets();
    if (!t) return;
    running = true;
    tl = gsap.timeline({
      onComplete: function () { played = true; release(); }
    });
    t.forEach(function (d, i) {
      gsap.set(d.el, { transformOrigin: '0 0', x: 0, y: 0, scale: 1 });
      tl.to(d.el, { x: d.x, y: d.y, scale: d.scale, duration: DURATION, ease: EASE }, i * STAGGER);
    });
  }

  function reset() {
    if (tl) { tl.kill(); tl = null; }
    clearWords();
    played = false;
    if (running || arrived) release();
    running = false;
    arrived = false;
  }

  // jump straight to the end (a link to a page further down was used: nothing should hold it)
  function finishNow() {
    if (played) return;
    if (tl) { tl.kill(); tl = null; }
    setFinal();
    played = true;
    release();
  }

  /* ---------- the hold on the white page ---------- */

  function hold() {
    if (!arrived) {
      arrived = true;
      holdUntil = Date.now() + HOLD;
      lock(true);
    }
    if (lenis) lenis.scrollTo(gateY(), { immediate: true, force: true });
    else window.scrollTo(0, gateY());
  }

  function onScroll() {
    if (!desktop.matches) return;
    var y = window.pageYOffset;
    var g = gateY();
    if (!played && y >= g - 0.5) hold();                                   // arrived at (or went past) the white page
    else if (y < g - 0.85 * window.innerHeight && (played || arrived)) reset();   // back up in the first screen: starts over
  }

  function attempt(down, event) {
    if (!desktop.matches || played) return;
    if (!arrived && !running) return;
    if (!down) {                                  // going back up: let the page move again
      if (!running) lock(false);
      arrived = false;
      return;
    }
    if (event && event.cancelable) event.preventDefault();
    if (running) return;
    var now = Date.now();
    if (now >= holdUntil) play();
  }

  window.addEventListener('wheel', function (e) {
    if (!desktop.matches || played || (!arrived && !running)) return;
    var now = Date.now();
    var fresh = now - lastWheel > FRESH_GAP;
    lastWheel = now;
    if (Math.abs(e.deltaY) < 4) { if (e.deltaY > 0 && e.cancelable) e.preventDefault(); return; }
    if (e.deltaY > 0 && !fresh) { if (e.cancelable) e.preventDefault(); return; }   // tail of the flick that brought us here
    attempt(e.deltaY > 0, e);
  }, { passive: false, capture: true });

  window.addEventListener('keydown', function (e) {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
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
    var dy = touchY - e.touches[0].clientY;                    // positive: finger moving up = scrolling down
    if (Math.abs(dy) < 12) return;
    touchY = e.touches[0].clientY;
    attempt(dy > 0, e);
  }, { passive: false, capture: true });

  // A link to something below the white page (the "Portfolio" link): no hold, the headline just takes its final shape.
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || !desktop.matches) return;
    var id = a.getAttribute('href').slice(1);
    var target = id && document.getElementById(id);
    if (target && target !== section && target.getBoundingClientRect().top + window.pageYOffset > section.offsetTop) finishNow();
  }, true);

  /* ---------- upkeep ---------- */

  function refresh() {
    if (!desktop.matches) { reset(); clearWords(); lock(false); return; }
    if (running) return;
    if (played) setFinal();
  }
  window.addEventListener('resize', refresh);
  if (desktop.addEventListener) desktop.addEventListener('change', refresh);
  // the language switch re-splits the headline (textreveal.js runs first): put the new words where they belong
  window.addEventListener('bromaslog:languagechange', function () {
    window.requestAnimationFrame(function () { window.requestAnimationFrame(function () { if (played && desktop.matches) setFinal(); }); });
  });
  window.addEventListener('scroll', onScroll, { passive: true });

  // Opened (or reloaded) already below the white page: nothing to hold, the headline just takes its final shape.
  var ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  ready.then(function () {
    window.setTimeout(function () {
      if (desktop.matches && window.pageYOffset > gateY() + 5) finishNow();
      else onScroll();
    }, 300);
  });
})();
