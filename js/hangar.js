/*
 * The end of the last page: a hangar (css/hangar.css has the picture of it).
 * Below the third stop the stage is held on screen while the page scrolls on, and the scroll does three things, in this order:
 *   1. The line of the stops goes on down the seam where two black doors meet. It is drawn while the stage climbs (the same way as the
 *      stretches of the stops: the tip comes down the screen, soft, from the top edge of the stage), so when the stage is held the line
 *      is complete.
 *   2. After a beat (HOLD) the doors slide apart along the line, over OPENED of the held scroll: the line splits in two, one half on
 *      each door, and the video behind comes up from dark and settles (a scale from 1.16 to 1, light from .35 to 1).
 *   3. The video plays while the doors are open, and stays there until the page ends.
 * Everything is a function of the scroll position, so it runs backwards too: scroll up and the doors close, the line comes back
 * together; when they are shut again the video stops and rewinds, so each time they open it starts from the beginning. The file is the
 * original footage from second 3 (assets/video/hangar-1280.mp4), so the beginning is second 3.
 * The video is only fetched when the stage is LOAD_AHEAD screens away. With "reduce motion" none of this runs: the hangar is just the
 * first picture of the video, open.
 */
(function () {
  'use strict';
  var hangar = document.getElementById('hangar');
  var stage = hangar && hangar.querySelector('.hangar__stage');
  var video = stage && stage.querySelector('.hangar__video');
  if (!hangar || !stage || !video) return;

  var params = new URLSearchParams(window.location.search);
  var reduced = params.get('motion') === 'reduced' ||
    (params.get('motion') !== 'full' && !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches));
  if (reduced) return;

  var L = window.BromaslogLine || {};                    // the line of the stops (js/sectorline.js): the tip has to look the same here
  var WIN = L.WIN || 0.6, HEAD = L.HEAD || 0.08, TAIL = L.TAIL || 0.3;
  var M = window.BromaslogMotion;
  var easeMove = M && M.ease ? M.ease.move : function (p) { return p * p * (3 - 2 * p); };
  var HOLD = 0.10;           // share of the held scroll the doors stay shut (after the line is complete)
  var OPENED = 0.70;         // share of the held scroll at which they are fully open
  var LOAD_AHEAD = 3;        // screens before the stage at which the video starts to be fetched

  var top = 0, span = 1, vh = 0, loaded = false, last = {};

  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function set(name, v) { if (last[name] !== v) { last[name] = v; stage.style.setProperty(name, v); } }

  video.muted = true; video.defaultMuted = true;         // (the attribute is not enough for every browser to let it play by itself)
  hangar.classList.add('hangar--live');

  function measure() {
    var r = hangar.getBoundingClientRect();
    top = r.top + window.pageYOffset;
    vh = window.innerHeight;
    span = Math.max(1, r.height - vh);                    // the scroll during which the stage is held
    var eyebrow = document.querySelector('.vs__eyebrow'); // the line of the stops on a phone: halfway between the edge and the texts
    var mx = Math.max(4, eyebrow ? eyebrow.getBoundingClientRect().left / 2 : 8);
    set('--hg-mx', (Math.round(mx) + 0.5) + 'px');
  }

  function load() {
    if (loaded) return;
    loaded = true;
    video.src = video.getAttribute('data-src');
    video.preload = 'auto';
    video.load();
  }

  function render() {
    var y = window.pageYOffset;
    if (y > top - LOAD_AHEAD * vh) load();

    // 1. the line: drawn while the stage climbs (its top edge from WIN + TAIL of the window height to the top)
    var lead = (WIN + TAIL) * vh;
    var tip = -TAIL * vh + clamp((y - (top - lead)) / lead) * (1 + 2 * TAIL) * vh;
    set('--hg-a', (tip - HEAD * vh).toFixed(1) + 'px');
    set('--hg-b', (tip + TAIL * vh).toFixed(1) + 'px');

    // 2. the doors
    var o = clamp((clamp((y - top) / span) - HOLD) / (OPENED - HOLD));
    var e = easeMove(o);
    set('--hg-open', e.toFixed(4));
    set('--hg-edge', clamp(o / 0.12).toFixed(3));
    set('--hg-zoom', (1 + 0.16 * (1 - e)).toFixed(4));
    set('--hg-light', (0.35 + 0.65 * e).toFixed(3));
    stage.classList.toggle('is-open', e > 0);              // (while the doors are shut the picture is not drawn: no edge of it shows between them)

    // 3. the video: plays once the doors are apart, rewinds when they are shut again
    if (e > 0.02) {
      if (video.paused) { var p = video.play(); if (p && p.catch) p.catch(function () {}); }
    } else if (o <= 0) {
      if (!video.paused) video.pause();
      if (video.readyState > 0 && video.currentTime > 0.05) video.currentTime = 0;
    }
  }

  var queued = false;
  function schedule() {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(function () { queued = false; render(); });
  }
  function remeasure() { measure(); render(); }

  measure();
  render();

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', remeasure);
  window.addEventListener('load', remeasure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);
  if (window.ResizeObserver) new ResizeObserver(remeasure).observe(document.documentElement);
  window.addEventListener('bromaslog:languagechange', function () {
    window.requestAnimationFrame(function () { window.requestAnimationFrame(remeasure); });
  });
})();
