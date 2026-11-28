/*
 * The end of the last page: a hangar with the three sectors of the company, one after the other (css/hangar.css has the picture of it).
 * Below the third stop the stage is held on screen while the page scrolls on, and the scroll does these things, in this order
 * (lengths in screens of scroll once the stage is held; every one is a function of the scroll position, so all of it runs backwards too):
 *   1. The line of the stops goes on down the seam where two black doors meet, to the bottom edge of the window. Its tip is the tip of
 *      the line of the stops (js/sectorline.js: it goes from 0.8 of the window height to the bottom edge just before the last stop is at
 *      rest), so the two are one line without a break, and when the stage is held the line is complete.
 *      The sentence across the doors is lit when the line reaches its top edge (class is-lit), like the titles of the stops, and unfolds
 *      from the seam outwards (css/hangar.css).
 *   2. After a beat (HOLD_VH) the doors slide apart along the line, until OPEN_VH: the line splits in two, one half on each door; the halves
 *      of the sentence go with the doors and grow more transparent as they open; the first picture (AEROSPACE, its word already behind
 *      the doors) comes up from dark and settles (a scale from 1.16 to 1, a black veil that goes away).
 *   3. The first video plays while the doors are open.
 *   4. From B_FROM_VH to B_TO_VH the second picture (AUTOMOTIVE) rises over the first one in two halves, the way the black page rose over the
 *      white one, but the second picture is mirrored: its LEFT half leads and the right one starts a third of the distance behind; the third one
 *      rises the way the black page does, right half first); the first picture drifts up a little and darkens
 *      under it. The second video plays once it is rising, and the first one stops when it is covered.
 *   5. From C_FROM_VH to C_TO_VH the third picture (NAUTIC) rises over the second one in the same way (the second drifts up and darkens under it);
 *      its video plays once it is rising and the second one stops when it is covered. It stays there until the end.
 * Scroll back up and everything is undone: the third picture goes down, then the second, the doors close, the line comes back together. A video
 * that is hidden again stops and rewinds, so each time a picture comes in its video starts from the beginning: the files are the original footage
 * from second 3 (assets/video/aerospace-1280.mp4, automotive-1280.mp4, nautic-1280.mp4), so the beginning is second 3.
 * A video is only fetched when its picture is close (LOAD_AHEAD screens for the first, once the doors are half open for the second, once the
 * second picture starts to rise for the third).
 * With "reduce motion" none of this runs: the three pictures are simply one under the other, with their words.
 */
(function () {
  'use strict';
  var hangar = document.getElementById('hangar');
  var stage = hangar && hangar.querySelector('.hangar__stage');
  var videoA = stage && stage.querySelector('.hangar__scene--a .hangar__video');
  var videoB = stage && stage.querySelector('.hangar__scene--b .hangar__video');
  var videoC = stage && stage.querySelector('.hangar__scene--c .hangar__video');
  if (!hangar || !stage || !videoA || !videoB || !videoC) return;

  var params = new URLSearchParams(window.location.search);
  var reduced = params.get('motion') === 'reduced' ||
    (params.get('motion') !== 'full' && !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches));
  if (reduced) return;

  var M = window.BromaslogMotion;
  var easeMove = M && M.ease ? M.ease.move : function (p) { return p * p * (3 - 2 * p); };
  var LAG = 0.33;            // the half of a picture that follows starts this share of its distance behind the half that leads (as in js/overlay.js); the second picture: left leads; the third: right leads
  // the held scroll, in screens (the hangar is 540svh: 100svh held + 440svh of these)
  var HOLD_VH = 0.16;        // the doors stay shut for a beat, with the line complete
  var OPEN_VH = 1.12;        // the doors are fully open
  var B_FROM_VH = 1.70;      // the second picture starts to rise (the first one has been there for a while)
  var B_TO_VH = 2.50;        // ...and is in place
  var C_FROM_VH = 3.10;      // the third picture starts to rise (as long a pause after the second as there was after the first)
  var C_TO_VH = 3.90;        // ...and is in place (it stays there until the end)
  var LOAD_AHEAD = 3;        // screens before the stage at which the first video starts to be fetched
  var LOAD_B_VH = 0.6;       // held screens after which the second video starts to be fetched
  var LOAD_C_VH = 1.7;       // ...and the third one (when the second picture starts to rise)

  var texts = stage.querySelectorAll('.hangar__text');
  var top = 0, vh = 0, textTop = 0, last = {}, loaded = [false, false, false];

  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function set(name, v) { if (last[name] !== v) { last[name] = v; stage.style.setProperty(name, v); } }

  [videoA, videoB, videoC].forEach(function (v) { v.muted = true; v.defaultMuted = true; });   // (the attribute is not enough for every browser to let it play by itself)
  hangar.classList.add('hangar--live');

  function measure() {
    var r = hangar.getBoundingClientRect();
    top = r.top + window.pageYOffset;
    vh = window.innerHeight;
    var tallest = 0;                                      // the sentence is in the middle of the stage: where its top edge is
    Array.prototype.forEach.call(texts, function (t) { tallest = Math.max(tallest, t.offsetHeight); });
    textTop = Math.max(0, (vh - tallest) / 2);
    var eyebrow = document.querySelector('.vs__eyebrow'); // the line of the stops on a phone: halfway between the edge and the texts
    var mx = Math.max(4, eyebrow ? eyebrow.getBoundingClientRect().left / 2 : 8);
    set('--hg-mx', (Math.round(mx) + 0.5) + 'px');
  }

  function load(i) {
    if (loaded[i]) return;
    loaded[i] = true;
    var v = [videoA, videoB, videoC][i];
    v.src = v.getAttribute('data-src');
    v.preload = 'auto';
    v.load();
  }

  // a video plays while its picture is in view and stops (and, if the picture went away completely, rewinds) when it is not
  function drive(v, play, rewind) {
    if (play) {
      if (v.paused) { var pr = v.play(); if (pr && pr.catch) pr.catch(function () {}); }
      return;
    }
    if (!v.paused) v.pause();
    if (rewind && v.readyState > 0 && v.currentTime > 0.05) v.currentTime = 0;
  }

  function render() {
    var y = window.pageYOffset;
    if (y > top - LOAD_AHEAD * vh) load(0);
    var held = (y - top) / vh;                               // screens of held scroll gone by (negative before the stage is held)
    if (held > LOAD_B_VH) load(1);
    if (held > LOAD_C_VH) load(2);

    // 1. the line: the tip of the line of the stops (js/sectorline.js: it goes down to the bottom edge of the window as the stage comes in)
    var tipInWindow = vh * (window.BromaslogLine ? window.BromaslogLine.tipShare(y) : 1);
    var stageTop = Math.max(0, top - y);                    // where the top edge of the stage is in the window
    var lineLength = Math.min(vh, Math.max(0, tipInWindow - stageTop));
    set('--hg-a', lineLength.toFixed(1) + 'px');
    stage.classList.toggle('is-lit', lineLength >= textTop);   // the sentence is lit when the line reaches it (as the titles of the stops are)

    // 2. the doors, and the first picture
    var o = clamp((held - HOLD_VH) / (OPEN_VH - HOLD_VH));
    var e = easeMove(o);
    set('--hg-open', e.toFixed(4));
    set('--hg-edge', clamp(o / 0.12).toFixed(3));
    set('--hg-text', (1 - o).toFixed(3));                 // the sentence grows more transparent, evenly with the scroll, as the doors open (gone when open)
    set('--hg-zoom', (1 + 0.16 * (1 - e)).toFixed(4));
    set('--hg-light', (0.35 + 0.65 * e).toFixed(3));
    stage.classList.toggle('is-open', e > 0);              // (while the doors are shut the picture is not drawn: no edge of it shows between them)

    // 4. the second picture rises over the first one
    var rise = easeMove(clamp((held - B_FROM_VH) / (B_TO_VH - B_FROM_VH)));
    set('--hg-b', (1 - rise).toFixed(4));
    set('--hg-lag', (LAG * (1 - rise) * vh).toFixed(1) + 'px');
    set('--hg-cover', rise.toFixed(4));
    stage.classList.toggle('is-b', rise > 0);

    // 5. the third picture rises over the second one
    var riseC = easeMove(clamp((held - C_FROM_VH) / (C_TO_VH - C_FROM_VH)));
    set('--hg-c', (1 - riseC).toFixed(4));
    set('--hg-lagc', (LAG * (1 - riseC) * vh).toFixed(1) + 'px');
    set('--hg-coverc', riseC.toFixed(4));
    stage.classList.toggle('is-c', riseC > 0);

    // 3., 4. and 5. the videos: each plays while its picture is in view (not once it is covered); each rewinds when its picture is gone
    drive(videoA, e > 0.02 && rise < 0.98, o <= 0);
    drive(videoB, rise > 0.02 && riseC < 0.98, rise <= 0);
    drive(videoC, riseC > 0.02, riseC <= 0);
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
