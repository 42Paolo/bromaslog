/*
 * The end of the last page: a hangar (css/hangar.css has the picture of it).
 * Below the third stop the stage is held on screen while the page scrolls on, and the scroll does three things, in this order:
 *   1. The line of the stops goes on down the seam where two black doors meet, to the bottom edge of the window. Its tip is the tip of
 *      the line of the stops (js/sectorline.js: it goes from 0.8 of the window height to the bottom edge just before the last stop is at rest),
 *      so the two are one line without a break, and when the stage is held the line is complete.
 *      The sentence across the doors is lit when the line reaches its top edge (class is-lit), like the titles of the stops, and unfolds
 *      from the seam outwards (css/hangar.css).
 *   2. After a beat (HOLD) the doors slide apart along the line, over OPENED of the held scroll: the line splits in two, one half on
 *      each door and the halves of the sentence go with the doors, and the video behind comes up from dark and settles (a scale from
 *      1.16 to 1, light from .35 to 1).
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

  var M = window.BromaslogMotion;
  var easeMove = M && M.ease ? M.ease.move : function (p) { return p * p * (3 - 2 * p); };
  var HOLD = 0.10;           // share of the held scroll the doors stay shut (a beat, with the line complete)
  var OPENED = 0.70;         // share of the held scroll at which they are fully open
  var LOAD_AHEAD = 3;        // screens before the stage at which the video starts to be fetched

  var texts = stage.querySelectorAll('.hangar__text');
  var top = 0, span = 1, vh = 0, textTop = 0, loaded = false, last = {};

  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function set(name, v) { if (last[name] !== v) { last[name] = v; stage.style.setProperty(name, v); } }

  video.muted = true; video.defaultMuted = true;         // (the attribute is not enough for every browser to let it play by itself)
  hangar.classList.add('hangar--live');

  function measure() {
    var r = hangar.getBoundingClientRect();
    top = r.top + window.pageYOffset;
    vh = window.innerHeight;
    span = Math.max(1, r.height - vh);                    // the scroll during which the stage is held
    var tallest = 0;                                      // the sentence is in the middle of the stage: where its top edge is
    Array.prototype.forEach.call(texts, function (t) { tallest = Math.max(tallest, t.offsetHeight); });
    textTop = Math.max(0, (vh - tallest) / 2);
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

    var p = clamp((y - top) / span);                        // how much of the held scroll has gone by

    // 1. the line: the tip of the line of the stops (js/sectorline.js: it goes down to the bottom edge of the window as the stage comes in)
    var tipInWindow = vh * (window.BromaslogLine ? window.BromaslogLine.tipShare(y) : 1);
    var stageTop = Math.max(0, top - y);                    // where the top edge of the stage is in the window
    var lineLength = Math.min(vh, Math.max(0, tipInWindow - stageTop));
    set('--hg-a', lineLength.toFixed(1) + 'px');
    stage.classList.toggle('is-lit', lineLength >= textTop);   // the sentence is lit when the line reaches it (as the titles of the stops are)

    // 2. the doors
    var o = clamp((p - HOLD) / (OPENED - HOLD));
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
