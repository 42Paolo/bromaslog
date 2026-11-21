/*
 * Contact panel: the glass navbar grows into a contact panel.
 *
 *  Click "Contact" →
 *    1. the three labels slide up out of the bar and disappear;
 *    2. at the same time the bar grows (a third of the page wide, almost the full page tall) while the page
 *       behind it is darkened and heavily blurred (the "scrim", brand and hero text included);
 *    3. the form frames, the contact details and their rules appear, then the texts are "typed": all the texts of a
 *       section (intro, form, details) are written together, and the three sections start almost at once.
 *
 *  Close (X button, Esc, click outside): the content fades, the bar shrinks back, the labels slide back in.
 *
 *  Built with GSAP timelines only (core, no plugins). The panel is a real dialog: focus moves into it and is
 *  trapped there, Esc closes it, the page behind is inert, and focus returns to "Contact" on close.
 *  Visitors who asked for reduced motion get the same panel with no sliding and no typing
 *  (?motion=full previews the full animation anyway, ?motion=reduced forces the calm one).
 */
(function () {
  'use strict';

  var gsap = window.gsap;
  var nav = document.getElementById('nav');
  var panel = document.getElementById('contact-panel');
  var trigger = document.getElementById('contact-trigger');
  var scrim = document.getElementById('nav-scrim');
  if (!gsap || !nav || !panel || !trigger || !scrim) return;

  var CFG = {
    widthRatio: 1 / 3,                  // the panel is a third of the page wide...
    minWidth: 440, maxWidth: 720,       // ...but never narrower / wider than this (px)
    mobileBreakpoint: 640,              // at or below this page width the panel spans the whole width
    sectionDuration: 0.9,               // every section (intro, form, details) writes all its texts together in this time (s)...
    maxPerChar: 0.05,                   // ...but a short text never types slower than this (s per character)
    sectionStagger: 0.14,               // the sections start almost together: this much after one another (s)
    panelBg: 'rgba(11, 12, 14, 0.94)',  // bar colour once it has become the panel
    barBg: 'rgba(14, 15, 17, 0.84)'     // must match .glass-nav in css/site.css
  };

  var root = document.documentElement;
  var linksNav = nav.querySelector('.nav-links');
  var linkEls = gsap.utils.toArray(linksNav.children);
  var closeBtn = panel.querySelector('.panel-close');
  var form = document.getElementById('contact-form');
  var status = form.querySelector('.form-status');
  var sendBtn = form.querySelector('.btn-send');
  var fields = gsap.utils.toArray(panel.querySelectorAll('.field'));
  var listItems = gsap.utils.toArray(panel.querySelectorAll('.contact-list li'));
  var rules = gsap.utils.toArray(panel.querySelectorAll('.panel-rule, .contact-list .rule'));
  var hero = document.querySelector('.site-hero');
  var brand = document.querySelector('.site-brand');
  var boxes = [closeBtn].concat(fields, listItems);      // the frames that fade / slide in

  /* ------------------------------------------------------------------ */
  /* typing: split every [data-type] text into characters, reveal them on a schedule */
  /* ------------------------------------------------------------------ */

  function prepare(el) {
    var text = (el.textContent || '').replace(/\s+/g, ' ').trim();
    var spoken = el.getAttribute('data-sr') || text;             // what screen readers read (no "*")
    el.textContent = '';

    var sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = spoken;

    var vis = document.createElement('span');
    vis.className = 'typed';
    vis.setAttribute('aria-hidden', 'true');

    var chars = [];
    var words = text.split(' ');
    words.forEach(function (word, wi) {
      var w = document.createElement('span');
      w.className = 'tw';                                         // a word never breaks across lines
      Array.from(word).forEach(function (ch, ci) {
        var c = document.createElement('span');
        c.className = 'tc';
        c.textContent = ch;
        if (ci === 0 && wi > 0) c.setAttribute('data-ws', '');    // first letter of a word: a small pause
        w.appendChild(c);
        chars.push(c);
      });
      vis.appendChild(w);
      if (wi < words.length - 1) vis.appendChild(document.createTextNode(' '));
    });

    el.appendChild(sr);
    el.appendChild(vis);
    return { chars: chars, group: el.getAttribute('data-group') || '' };
  }

  var segments = [];
  var typingTotal = 0;
  (function schedule() {
    var items = gsap.utils.toArray(panel.querySelectorAll('[data-type]')).map(prepare);
    var order = [];                                   // section names, in order of first appearance
    items.forEach(function (it) { if (order.indexOf(it.group) < 0) order.push(it.group); });
    var seed = 7;
    function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }   // repeatable "human" jitter

    items.forEach(function (item) {
      var start = order.indexOf(item.group) * CFG.sectionStagger;
      var n = item.chars.length;
      var duration = Math.min(CFG.sectionDuration, n * CFG.maxPerChar);
      // Irregular rhythm: every character gets a random weight (a little longer at word starts and after punctuation),
      // and the weights are scaled so that the whole text is finished exactly after `duration`.
      var carry = 0;
      var weights = item.chars.map(function (c) {
        var w = 0.6 + 0.9 * rnd();
        if (c.hasAttribute('data-ws')) w *= 1.8;
        w += carry;
        carry = /[.,;:!?]/.test(c.textContent) ? 1.5 : 0;   // a pause after punctuation: the next character comes later
        return w;
      });
      var total = 0;
      var times = weights.map(function (w) { total += w; return total; });
      times = times.map(function (t) { return start + duration * t / total; });
      segments.push({ chars: item.chars, times: times, shown: 0 });
      typingTotal = Math.max(typingTotal, start + duration);
    });
  })();

  // Show exactly the characters whose time has come.
  function renderTyping(t) {
    for (var i = 0; i < segments.length; i++) {
      var s = segments[i];
      var k = s.shown;
      while (k < s.times.length && s.times[k] <= t) k++;
      while (k > 0 && s.times[k - 1] > t) k--;
      if (k !== s.shown) {
        var lo = Math.min(k, s.shown);
        var hi = Math.max(k, s.shown);
        for (var j = lo; j < hi; j++) s.chars[j].classList.toggle('on', j < k);
        s.shown = k;
      }
    }
  }

  function resetTyping() {
    segments.forEach(function (s) {
      s.shown = 0;
      s.chars.forEach(function (c) { c.classList.remove('on'); });
    });
  }

  function showAllText() {
    segments.forEach(function (s) {
      s.shown = s.times.length;
      s.chars.forEach(function (c) { c.classList.add('on'); });
    });
  }

  function typingTween() {
    var proxy = { t: 0 };
    return gsap.to(proxy, {
      t: typingTotal,
      duration: typingTotal,
      ease: 'none',
      onUpdate: function () { renderTyping(proxy.t); },
      onComplete: function () { renderTyping(typingTotal + 1); }
    });
  }

  /* ------------------------------------------------------------------ */
  /* geometry */
  /* ------------------------------------------------------------------ */

  // Size of the closed bar: its labels + padding + border (works even while the labels are pinned/absolute).
  function naturalSize() {
    var cs = getComputedStyle(nav);
    var r = linksNav.getBoundingClientRect();
    var ex = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) + parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth);
    var ey = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) + parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
    return { w: r.width + ex, h: r.height + ey };
  }

  // Size of the open panel: a third of the page wide, almost the whole page tall.
  function targetSize() {
    var cs = getComputedStyle(nav);
    var top = parseFloat(cs.top) || 0;
    var right = parseFloat(cs.right) || 0;
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var maxW = vw - 2 * right;
    var w = vw <= CFG.mobileBreakpoint
      ? maxW
      : Math.min(Math.max(vw * CFG.widthRatio, CFG.minWidth), CFG.maxWidth, maxW);
    return { w: Math.round(w), h: Math.round(vh - 2 * top) };
  }

  // The panel keeps its final size at all times; the bar just reveals it while it grows.
  function setPanelSize(s) {
    panel.style.setProperty('--panel-w', (s.w - 2) + 'px');
    panel.style.setProperty('--panel-h', (s.h - 2) + 'px');
  }

  /* ------------------------------------------------------------------ */
  /* open / close */
  /* ------------------------------------------------------------------ */

  var state = 'closed';            // closed → opening → open → closing → closed
  var openTl = null;

  function motionReduced() {
    var p = new URLSearchParams(window.location.search).get('motion');
    if (p === 'full') return false;
    if (p === 'reduced') return true;
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function setBackgroundInert(on) {
    [hero, brand].forEach(function (el) { if (el) el.inert = on; });
  }

  function open() {
    if (state !== 'closed') return;
    state = 'opening';

    var from = naturalSize();
    var to = targetSize();
    setPanelSize(to);

    nav.classList.add('is-expanding');                    // pins the labels to the corner
    gsap.set(nav, { width: from.w, height: from.h });     // explicit size = the current one: no jump
    root.classList.add('is-contact-open');
    setBackgroundInert(true);
    trigger.setAttribute('aria-expanded', 'true');
    panel.removeAttribute('inert');
    resetTyping();
    status.textContent = '';
    status.removeAttribute('data-state');

    if (motionReduced()) {
      gsap.set(nav, { width: to.w, height: to.h, backgroundColor: CFG.panelBg });
      gsap.set(linkEls, { autoAlpha: 0 });
      gsap.set(scrim, { autoAlpha: 1 });
      showAllText();
      gsap.fromTo(panel, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25, onComplete: finishOpen });
      return;
    }

    gsap.set(boxes, { autoAlpha: 0, y: 14 });
    gsap.set(sendBtn, { clipPath: 'inset(0 100% 0 0 round 6px)' });
    gsap.set(rules, { scaleX: 0 });

    openTl = gsap.timeline({ onComplete: finishOpen });
    openTl
      // page behind: darker + blurred
      .to(scrim, { autoAlpha: 1, duration: 0.8, ease: 'power2.out' }, 0)
      // the labels slide up and out (the bar's top edge clips them) ...
      .to(linkEls, { yPercent: -160, autoAlpha: 0, duration: 0.5, ease: 'power3.in', stagger: 0.055 }, 0)
      // ... while the bar grows: wider and taller at the same time, anchored top-right
      .to(nav, { width: to.w, duration: 1.0, ease: 'expo.inOut' }, 0.06)
      .to(nav, { height: to.h, duration: 1.1, ease: 'expo.inOut' }, 0.1)
      .to(nav, { backgroundColor: CFG.panelBg, duration: 0.7, ease: 'power2.out' }, 0.2)
      // content
      .set(panel, { autoAlpha: 1 }, 0.5)
      .call(function () { panel.focus({ preventScroll: true }); }, null, 0.52)
      .to(boxes, { autoAlpha: 1, y: 0, duration: 0.75, ease: 'power3.out', stagger: 0.06 }, 0.6)
      .to(rules, { scaleX: 1, duration: 0.9, ease: 'expo.out', stagger: 0.09 }, 0.75)
      .to(sendBtn, { clipPath: 'inset(0 0% 0 0 round 6px)', duration: 0.8, ease: 'power3.inOut' }, 0.95)
      // the writing
      .add(typingTween(), 0.85);
  }

  function finishOpen() {
    state = 'open';
    openTl = null;
    gsap.set(boxes.concat(rules), { clearProps: 'transform' });
    gsap.set(sendBtn, { clearProps: 'clipPath' });
    if (!panel.contains(document.activeElement)) panel.focus({ preventScroll: true });
  }

  function close() {
    if (state === 'closed' || state === 'closing') return;
    if (openTl) { openTl.kill(); openTl = null; }
    state = 'closing';

    var from = naturalSize();

    if (motionReduced()) {
      gsap.set(panel, { autoAlpha: 0 });
      gsap.set(scrim, { autoAlpha: 0 });
      gsap.set(nav, { width: from.w, height: from.h, backgroundColor: CFG.barBg });
      gsap.set(linkEls, { autoAlpha: 1, yPercent: 0 });
      finishClose();
      return;
    }

    gsap.timeline({ onComplete: finishClose })
      .to(panel, { autoAlpha: 0, duration: 0.22, ease: 'power2.in' }, 0)
      .to(nav, { width: from.w, height: from.h, duration: 0.85, ease: 'expo.inOut' }, 0.1)
      .to(nav, { backgroundColor: CFG.barBg, duration: 0.5, ease: 'power2.inOut' }, 0.2)
      .to(scrim, { autoAlpha: 0, duration: 0.7, ease: 'power2.inOut' }, 0.15)
      .to(linkEls, { yPercent: 0, autoAlpha: 1, duration: 0.55, ease: 'power3.out', stagger: 0.055 }, 0.7);
  }

  function finishClose() {
    nav.classList.remove('is-expanding');
    gsap.set(nav, { clearProps: 'width,height,backgroundColor' });
    gsap.set(linkEls, { clearProps: 'transform,opacity,visibility' });
    gsap.set([scrim, panel], { clearProps: 'opacity,visibility' });
    gsap.set(boxes.concat(rules, sendBtn), { clearProps: 'all' });
    panel.setAttribute('inert', '');
    resetTyping();
    root.classList.remove('is-contact-open');
    setBackgroundInert(false);
    trigger.setAttribute('aria-expanded', 'false');
    state = 'closed';
    // Focus goes back to the button that opened the panel (next frame: GSAP has applied the cleared styles by then).
    requestAnimationFrame(function () { trigger.focus({ preventScroll: true }); });
  }

  /* ------------------------------------------------------------------ */
  /* wiring */
  /* ------------------------------------------------------------------ */

  trigger.addEventListener('click', function (e) { e.preventDefault(); open(); });
  closeBtn.addEventListener('click', close);
  scrim.addEventListener('click', close);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && (state === 'open' || state === 'opening')) {
      e.preventDefault();
      close();
    }
  });

  // Touching the panel while it is still writing itself fast-forwards the animation.
  function speedUp() { if (state === 'opening' && openTl) openTl.timeScale(6); }
  panel.addEventListener('pointerdown', speedUp);
  panel.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab' && e.key !== 'Escape') speedUp();
  });

  // Keep Tab inside the dialog.
  panel.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab') return;
    var f = Array.prototype.filter.call(
      panel.querySelectorAll('a[href], button, input, textarea, select'),
      function (el) { return el.tabIndex >= 0 && !el.disabled && el.getClientRects().length > 0; }
    );
    if (!f.length) return;
    var first = f[0];
    var last = f[f.length - 1];
    var cur = document.activeElement;
    if (e.shiftKey && (cur === first || cur === panel)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && cur === last) { e.preventDefault(); first.focus(); }
  });

  window.addEventListener('resize', function () {
    if (state !== 'open') return;
    var s = targetSize();
    setPanelSize(s);
    gsap.set(nav, { width: s.w, height: s.h });
  });

  /* ------------------------------------------------------------------ */
  /* form */
  /* ------------------------------------------------------------------ */

  function setStatus(msg, kind) {
    status.textContent = msg;
    if (kind) status.setAttribute('data-state', kind); else status.removeAttribute('data-state');
    gsap.fromTo(status, { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power2.out', clearProps: 'transform' });
  }

  var SUBJECT = 'Nuova richiesta dal sito Bromaslog';

  form.addEventListener('submit', function (e) {
    e.preventDefault();                                           // (native validation has already passed)
    if (form.elements.website && form.elements.website.value) return;   // honeypot: only bots fill it in

    var data = new FormData(form);
    data.delete('website');                                       // the honeypot is not part of the message
    var accessKey = form.getAttribute('data-access-key');         // Web3Forms
    var endpoint = form.getAttribute('data-endpoint') || (accessKey ? 'https://api.web3forms.com/submit' : '');
    var mailto = form.getAttribute('data-mailto');
    setStatus('Invio in corso…');
    sendBtn.disabled = true;

    if (endpoint) {
      if (accessKey) {
        data.append('access_key', accessKey);
        data.append('subject', SUBJECT);
        data.append('from_name', 'Sito Bromaslog');
      } else if (/formspree\.io/.test(endpoint)) {
        data.append('_subject', SUBJECT);                         // Formspree's name for the email subject
      }
      fetch(endpoint, { method: 'POST', body: data, headers: { Accept: 'application/json' } })
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (body) {
            // Web3Forms answers { success }, Formspree { ok }: either one can say "no" even with a 2xx status.
            if (!res.ok || body.success === false || body.ok === false) throw new Error(body.message || String(res.status));
          });
        })
        .then(function () {
          form.reset();
          setStatus('Grazie! Abbiamo ricevuto la tua richiesta: ti ricontatteremo al più presto.', 'ok');
        })
        .catch(function () {
          setStatus('Invio non riuscito. Riprova tra poco o scrivici a ' + mailto + '.', 'error');
        })
        .then(function () { sendBtn.disabled = false; });
      return;
    }

    // No form service configured yet: open the visitor's email app with the message ready to send.
    var lines = [
      'Nome: ' + (data.get('name') || ''),
      'Azienda: ' + (data.get('company') || ''),
      'Email: ' + (data.get('email') || ''),
      'Telefono: ' + (data.get('phone') || ''),
      '',
      data.get('message') || ''
    ];
    window.location.href = 'mailto:' + mailto +
      '?subject=' + encodeURIComponent(SUBJECT) +
      '&body=' + encodeURIComponent(lines.join('\n'));
    setStatus('Si apre la tua app di posta: premi invia per completare la richiesta.', 'ok');
    sendBtn.disabled = false;
  });
})();
