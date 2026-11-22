/*
 * Text that "writes itself": every word goes from invisible to visible, one after the other (opacity only, nothing moves).
 * It starts when the second page (the white one, #chi-siamo) comes into view.
 * Marked with data-lines="0|1|2": 0 = label, 1 = headline, 2 = paragraphs (all paragraphs share one sequence).
 * The label comes first, then the headline, then the paragraphs.
 * Re-built when the language changes (i18n.js swaps the text).
 * With "reduce motion" (or ?motion=reduced) the text is simply shown.
 */
(function () {
  'use strict';
  var gsap = window.gsap;
  var section = document.getElementById('chi-siamo');
  if (!gsap || !section) return;

  var params = new URLSearchParams(window.location.search);
  var reduced = params.get('motion') === 'reduced' ||
    (params.get('motion') !== 'full' && !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches));
  if (reduced) return;

  var els = Array.prototype.slice.call(section.querySelectorAll('[data-lines]'));
  if (!els.length) return;

  var revealed = false;

  /* ---------- splitting into words ---------- */

  // Our own simple markup: text and <br>.
  function split(el) {
    var parts = [];                        // words, and null for a <br>
    Array.prototype.forEach.call(el.childNodes, function (n) {
      if (n.nodeType === 3) n.textContent.split(/\s+/).forEach(function (w) { if (w) parts.push(w); });
      else if (n.nodeName === 'BR') parts.push(null);
    });
    var label = parts.filter(Boolean).join(' ');
    el.textContent = '';
    var words = [];
    parts.forEach(function (w, i) {
      if (w === null) { el.appendChild(document.createElement('br')); return; }
      var s = document.createElement('span');
      s.className = 'tw-word';
      s.textContent = w;
      el.appendChild(s);
      if (i < parts.length - 1 && parts[i + 1] !== null) el.appendChild(document.createTextNode(' '));
      words.push(s);
    });
    el.setAttribute('aria-label', label);  // the words are decoration for assistive tech; the label carries the sentence
    el._words = words;
  }

  function wordsOf(group) {
    var all = [];
    els.forEach(function (el) { if (el.getAttribute('data-lines') === group && el._words) all = all.concat(el._words); });
    return all;
  }
  function allWords() {
    return els.reduce(function (a, el) { return a.concat(el._words || []); }, []);
  }

  function splitAll() { els.forEach(split); }
  function hideAll() { gsap.set(allWords(), { opacity: 0 }); }
  function showAll() { gsap.set(allWords(), { opacity: 1 }); }

  /* ---------- the reveal ---------- */

  function play() {
    if (revealed) return;
    revealed = true;
    var label = wordsOf('0'), title = wordsOf('1'), body = wordsOf('2');
    if (label.length) gsap.to(label, { opacity: 1, duration: 0.8, ease: 'power1.out', stagger: 0.08 });
    if (title.length) gsap.to(title, { opacity: 1, duration: 0.7, ease: 'power1.out', stagger: 0.09, delay: 0.15 });
    if (body.length) gsap.to(body, { opacity: 1, duration: 0.6, ease: 'power1.out', stagger: Math.min(0.03, 1.8 / body.length), delay: 0.7 });   // long texts are written faster, so it never drags
  }

  function rebuild() {
    gsap.killTweensOf(allWords());
    splitAll();
    if (revealed) showAll(); else hideAll();
  }

  /* ---------- start / language ---------- */

  function init() {
    splitAll();
    hideAll();
    if (!('IntersectionObserver' in window)) { play(); return; }
    // starts when the second page is about 35% into the screen
    var io = new IntersectionObserver(function (entries) {
      if (entries.some(function (e) { return e.isIntersecting; })) { io.disconnect(); play(); }
    }, { rootMargin: '0px 0px -35% 0px', threshold: 0 });
    io.observe(section);
  }

  window.addEventListener('bromaslog:languagechange', function () {
    if (els.some(function (el) { return !el._words; })) return;   // before the first split: init() will do it
    rebuild();
  });

  var ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  ready.then(init);
})();
