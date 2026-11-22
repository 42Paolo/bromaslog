/*
 * Text that "writes itself": every letter goes from invisible to visible, one after the other (opacity only, nothing moves).
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
    var chars = [];
    parts.forEach(function (w, i) {
      if (w === null) { el.appendChild(document.createElement('br')); return; }
      var word = document.createElement('span');          // a word never breaks across two lines
      word.style.display = 'inline-block';
      word.style.whiteSpace = 'nowrap';
      Array.prototype.forEach.call(w, function (ch) {
        var c = document.createElement('span');
        c.textContent = ch;
        word.appendChild(c);
        chars.push(c);
      });
      el.appendChild(word);
      if (i < parts.length - 1 && parts[i + 1] !== null) el.appendChild(document.createTextNode(' '));
    });
    el.setAttribute('aria-label', label);  // the letters are decoration for assistive tech; the label carries the sentence
    el._words = chars;
  }

  function charsOf(group) {
    var all = [];
    els.forEach(function (el) { if (el.getAttribute('data-lines') === group && el._words) all = all.concat(el._words); });
    return all;
  }
  function allChars() {
    return els.reduce(function (a, el) { return a.concat(el._words || []); }, []);
  }

  function splitAll() { els.forEach(split); }
  function hideAll() { gsap.set(allChars(), { opacity: 0 }); }
  function showAll() { gsap.set(allChars(), { opacity: 1 }); }

  /* ---------- the reveal ---------- */

  function play() {
    if (revealed) return;
    revealed = true;
    var label = charsOf('0'), title = charsOf('1'), body = charsOf('2');
    // one letter every few hundredths of a second; the headline is written first, then the paragraphs
    var t = 0;
    if (label.length) { gsap.to(label, { opacity: 1, duration: 0.3, ease: 'none', stagger: 0.04 }); t = label.length * 0.04 + 0.1; }
    if (title.length) { gsap.to(title, { opacity: 1, duration: 0.3, ease: 'none', stagger: 0.025, delay: t }); t += title.length * 0.025 + 0.15; }
    if (body.length) gsap.to(body, { opacity: 1, duration: 0.3, ease: 'none', stagger: 0.009, delay: t });
  }

  function rebuild() {
    gsap.killTweensOf(allChars());
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
