/*
 * Bromaslog preloader — one GSAP timeline.
 *
 *   0.0 – 0.4  charcoal only, nothing else visible
 *   0.4 – 1.3  logo revealed by a soft-edged SVG mask sweep
 *   1.2 – 2.1  charcoal veil lifts → carbon fibre emerges (opacity only)
 *   2.1 – 2.8  fabric comes alive (video if available, otherwise a slow drift of the still)
 *   2.8 – 3.5  whole preloader slides up (power3.inOut, 0.7s) once the page is ready
 *
 * The timeline pauses at 2.8s until the homepage is ready, and holds a polished static state
 * meanwhile. It never waits for the video.
 */
(function () {
  'use strict';

  var CONFIG = {
    storageKey: 'bromaslog:preloader',
    maxWaitMs: 6000,        // failsafe: never hold the visitor longer than this for "ready"
    posterGateMs: 1500,     // max time to wait for the poster to decode before lifting the veil
    maskEndX: -300,         // sweep rect x when the logo is fully revealed (see #pl-sweep in index.html)
    t: { logoIn: 0.4, logoDur: 0.9, fabricIn: 1.2, fabricDur: 0.9, material: 2.1, exit: 2.8, exitDur: 0.7 }
  };

  var root = document.documentElement;
  var el = document.getElementById('preloader');
  if (!el) return;

  var site = document.getElementById('site');
  var poster = el.querySelector('.pl-poster');
  var video = el.querySelector('.pl-video');
  var overlay = el.querySelector('.pl-overlay');
  var sweep = document.getElementById('pl-sweep');

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finished = false;

  function markSeen() {
    try { sessionStorage.setItem(CONFIG.storageKey, '1'); } catch (e) {}
  }

  function finish() {
    if (finished) return;
    finished = true;
    markSeen();
    if (video) { video.pause(); video.removeAttribute('src'); video.load(); }
    if (el.parentNode) el.parentNode.removeChild(el);
    root.classList.remove('is-loading');
    root.classList.add('no-preloader');
    if (site) site.removeAttribute('inert');
    window.dispatchEvent(new CustomEvent('preloader:complete'));
  }

  // Without GSAP we must never trap the visitor behind the preloader.
  if (!window.gsap) { finish(); return; }

  if (site) site.setAttribute('inert', '');

  /* ---------- readiness ---------- */

  function once(target, type) {
    return new Promise(function (resolve) { target.addEventListener(type, resolve, { once: true }); });
  }

  var pageReady = Promise.race([
    Promise.all([
      document.readyState === 'loading' ? once(document, 'DOMContentLoaded') : Promise.resolve(),
      document.fonts && document.fonts.ready ? document.fonts.ready.catch(function () {}) : Promise.resolve(),
      document.readyState === 'complete' ? Promise.resolve() : once(window, 'load')
    ]),
    new Promise(function (resolve) { setTimeout(resolve, CONFIG.maxWaitMs); })
  ]);

  var posterReady = Promise.race([
    poster && poster.decode ? poster.decode().catch(function () {}) : Promise.resolve(),
    new Promise(function (resolve) { setTimeout(resolve, CONFIG.posterGateMs); })
  ]);

  /* ---------- reduced motion: static logo on the fabric, plain fade out ---------- */

  if (reduced) {
    gsap.set(sweep, { attr: { x: CONFIG.maskEndX } });
    gsap.set(overlay, { opacity: 0 });
    pageReady.then(function () {
      markSeen();
      gsap.to(el, { opacity: 0, duration: 0.4, ease: 'none', onComplete: finish });
    });
    return;
  }

  /* ---------- optional video (never blocks anything) ---------- */

  var videoState = 'idle';     // idle → loading → ready → shown | failed
  var wantVideo = false;       // set once the "material" phase begins

  function dropVideo() {
    videoState = 'failed';
    if (video && video.parentNode) video.parentNode.removeChild(video);
  }

  function showVideo() {
    if (finished || videoState !== 'ready') return;
    videoState = 'shown';
    var p = video.play();
    if (p && p.catch) p.catch(dropVideo);
    // Poster stays underneath; the video starts on its own frame 0, which is the poster frame.
    gsap.to(video, { opacity: 1, duration: 0.8, ease: 'sine.inOut' });
  }

  function loadVideo() {
    if (!video || videoState !== 'idle') return;
    var conn = navigator.connection;
    if (conn && (conn.saveData || /(^|-)2g$/.test(conn.effectiveType || ''))) { dropVideo(); return; }
    videoState = 'loading';

    function attach(type, src) {
      if (!src || !video.canPlayType(type)) return;
      var s = document.createElement('source');
      s.src = src;
      s.type = type;
      s.addEventListener('error', function () {
        // a failing last <source> means the whole resource failed
        if (video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) dropVideo();
      });
      video.appendChild(s);
    }
    attach('video/webm; codecs="vp9"', video.dataset.srcWebm);
    attach('video/mp4', video.dataset.srcMp4);
    if (!video.firstChild) { dropVideo(); return; }

    video.addEventListener('error', dropVideo, { once: true });
    video.addEventListener('loadeddata', function () {
      if (videoState !== 'loading') return;
      videoState = 'ready';
      if (wantVideo) showVideo();
    }, { once: true });
    video.preload = 'auto';
    video.load();
  }

  // Start fetching only when the browser is idle after the poster is in.
  posterReady.then(function () {
    (window.requestIdleCallback || function (fn) { return setTimeout(fn, 200); })(loadVideo, { timeout: 1200 });
  });

  /* ---------- the timeline ---------- */

  var T = CONFIG.t;
  var drift = gsap.fromTo(poster,
    { scale: 1.02 },
    { scale: 1.07, duration: 16, ease: 'sine.inOut', yoyo: true, repeat: -1, paused: true });

  var tl = gsap.timeline({ defaults: { overwrite: 'auto' } });

  tl
    // Phase 2 — logo revealed by the mask sweep
    .to(sweep, { attr: { x: CONFIG.maskEndX }, duration: T.logoDur, ease: 'power2.inOut' }, T.logoIn)

    // Phase 3 — veil lifts. Hold here (static, polished) only if the poster is not decoded yet.
    .addPause(T.fabricIn, function () { posterReady.then(function () { tl.resume(); }); })
    .to(overlay, { opacity: 0, duration: T.fabricDur, ease: 'sine.inOut' }, T.fabricIn)
    .add(function () { drift.play(); }, T.fabricIn)

    // Phase 4 — material comes alive
    .add(function () { wantVideo = true; showVideo(); }, T.material)

    // Phase 5 — hold until the homepage is ready, then slide the whole preloader up
    .addPause(T.exit, function () { pageReady.then(function () { tl.resume(); }); })
    .add(function () { markSeen(); }, T.exit)
    .to(el, { yPercent: -100, duration: T.exitDur, ease: 'power3.inOut' }, T.exit)
    .add(function () { drift.kill(); finish(); });
})();
