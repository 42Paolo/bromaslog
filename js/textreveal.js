/*
 * Text that "writes itself" line by line, the way icomat.co.uk does it (GSAP SplitText on lines, with masks):
 *   - the text is split into lines; every line sits in a mask (overflow: clip), so nothing shows outside it;
 *   - the lines start 110% lower (hidden under their mask) and rise to their place, one after the other.
 * It starts when the second page (the white one, #chi-siamo) comes into view.
 * Marked with data-lines="0|1|2": 0 = label, 1 = headline, 2 = paragraphs (paragraphs share one stagger).
 *
 * Timings follow icomat's: headline 1.2s power3.out, stagger .05s; body 1s power2.out, stagger .06s.
 * Lines are re-measured when the window is resized and re-built when the language changes.
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
  var hiddenY = 110;                       // percent, as on icomat

  /* ---------- splitting into lines ---------- */

  // Words of an element, in order, with forced breaks for <br>. Works on our own simple markup (text and <br>).
  function tokens(el) {
    var out = [];
    (function walk(node) {
      Array.prototype.forEach.call(node.childNodes, function (n) {
        if (n.nodeType === 3) {
          n.textContent.split(/\s+/).forEach(function (w) { if (w) out.push(w); });
        } else if (n.nodeName === 'BR') {
          out.push(null);                  // forced line break
        } else {
          walk(n);
        }
      });
    })(el);
    return out;
  }

  function unsplit(el) {
    if (el._source === undefined) return;
    el.innerHTML = el._source;
  }

  function split(el) {
    unsplit(el);
    el._source = el.innerHTML;             // current (already translated) markup
    var words = tokens(el);
    var label = words.filter(Boolean).join(' ');   // the sentence, with a space where a <br> was
    el.textContent = '';
    // 1. put every word in an inline span so its position can be measured
    var spans = [];
    words.forEach(function (w, i) {
      if (w === null) { spans.push(null); return; }
      var s = document.createElement('span');
      s.style.display = 'inline-block';
      s.textContent = w;
      el.appendChild(s);
      el.appendChild(document.createTextNode(' '));
      spans.push(s);
    });
    // 2. group by vertical position (new line when the top changes) or at a <br>
    var groups = [], current = [], lastTop = null;
    spans.forEach(function (s) {
      if (s === null) { if (current.length) groups.push(current); current = []; lastTop = null; return; }
      var top = s.offsetTop;
      if (lastTop !== null && Math.abs(top - lastTop) > 2) { groups.push(current); current = []; }
      current.push(s.textContent);
      lastTop = top;
    });
    if (current.length) groups.push(current);
    // 3. rebuild: one mask + one line per group
    el.textContent = '';
    var lines = groups.map(function (g) {
      var mask = document.createElement('span');
      mask.className = 'tl-mask';
      var line = document.createElement('span');
      line.className = 'tl-line';
      line.textContent = g.join(' ');
      mask.appendChild(line);
      el.appendChild(mask);
      return line;
    });
    el.setAttribute('aria-label', label);  // the lines are decoration for assistive tech; the label carries the sentence
    el._lines = lines;
    return lines;
  }

  function splitAll() {
    els.forEach(split);
  }

  function linesOf(group) {
    var all = [];
    els.forEach(function (el) { if (el.getAttribute('data-lines') === group && el._lines) all = all.concat(el._lines); });
    return all;
  }

  /* ---------- states ---------- */

  function hideAll() {
    els.forEach(function (el) { if (el._lines) gsap.set(el._lines, { yPercent: hiddenY }); });
  }
  function showAll() {
    els.forEach(function (el) { if (el._lines) gsap.set(el._lines, { yPercent: 0 }); });
  }

  function play() {
    if (revealed) return;
    revealed = true;
    var label = linesOf('0'), title = linesOf('1'), body = linesOf('2');
    if (label.length) gsap.to(label, { yPercent: 0, duration: 1, ease: 'power3.out' });
    if (title.length) gsap.to(title, { yPercent: 0, duration: 1.2, ease: 'power3.out', stagger: 0.05, delay: 0.1 });
    if (body.length) gsap.to(body, { yPercent: 0, duration: 1, ease: 'power2.out', stagger: 0.06, delay: 0.45 });
  }

  function rebuild() {
    gsap.killTweensOf(els.map(function (el) { return el._lines || []; }).reduce(function (a, b) { return a.concat(b); }, []));
    splitAll();
    if (revealed) showAll(); else hideAll();
  }

  /* ---------- start / resize / language ---------- */

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

  var resizeTimer = null, lastWidth = window.innerWidth;
  window.addEventListener('resize', function () {
    if (window.innerWidth === lastWidth) return;          // only width changes re-wrap the text
    lastWidth = window.innerWidth;
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(rebuild, 200);
  });
  window.addEventListener('bromaslog:languagechange', function () {
    // i18n.js has just replaced the text: the old lines are gone, split the new text
    els.forEach(function (el) { el._source = undefined; });
    rebuild();
  });

  var ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  ready.then(init);
})();
