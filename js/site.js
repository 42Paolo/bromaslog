/* Placeholder homepage entrance, synced with the preloader (icomat reveals its hero as the wave fades). */
(function () {
  'use strict';
  window.addEventListener('preloader:reveal', function () {
    if (!window.gsap) return;
    // (not the header itself: an ancestor with opacity would stop the glass from seeing the page behind it)
    gsap.from('.site-brand, .glass-nav, .site-tagline, .site-eyebrow, .site-hero h1', {
      y: 28, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08, clearProps: 'transform,opacity'
    });
  });
})();

/* Scroll reveal for the sections below the hero. */
(function () {
  'use strict';
  var els = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));
  if (!els.length || !('IntersectionObserver' in window)) return;
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.05 });
  els.forEach(function (el, i) {
    el.style.setProperty('--rd', (i % 3) * 0.08 + 's');
    el.classList.add('will-reveal');
    io.observe(el);
  });
})();

/* The brand (top-left, fixed) turns dark while it is over the white second page. */
(function () {
  'use strict';
  var brand = document.querySelector('.site-brand');
  var page = document.getElementById('chi-siamo');
  var next = document.getElementById('portfolio') || document.getElementById('visione');   // the black page that slides over the white one
  if (!brand || !page) return;
  var queued = false;
  function schedule() {                                 // once per frame, however many scroll events came
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(function () { queued = false; update(); });
  }
  function update() {
    var b = brand.getBoundingClientRect();
    var mid = (b.top + b.bottom) / 2;
    var s = page.getBoundingClientRect();
    var covered = next ? next.getBoundingClientRect().top <= mid : false;
    brand.classList.toggle('on-light', s.top < mid && s.bottom > mid && !covered);
  }
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  update();
})();

/* Background video: with "reduce motion" or a data-saver / slow connection it is not played (the download is dropped):
   the still frame stays instead. */
(function () {
  'use strict';
  var video = document.querySelector('.bg-video');
  if (!video) return;
  var params = new URLSearchParams(window.location.search);
  var reduced = params.get('motion') === 'reduced' ||
    (params.get('motion') !== 'full' && !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches));
  var conn = navigator.connection;
  var saver = !!(conn && (conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '')));
  if (reduced || saver) {
    var holder = video.parentNode;
    holder.style.backgroundImage = 'url(' + video.getAttribute('poster') + ')';
    video.pause();
    video.removeAttribute('autoplay');
    while (video.firstChild) video.removeChild(video.firstChild);
    video.load();
    video.parentNode.removeChild(video);
    return;
  }
  // some browsers need a nudge when autoplay started before the page was visible
  var start = function () { var p = video.play(); if (p && p.catch) p.catch(function () {}); };
  var loaded = !document.documentElement.classList.contains('is-loading');
  window.addEventListener('preloader:complete', function () { loaded = true; start(); });
  window.addEventListener('pageshow', start);

  // Once the white page covers the first screen nothing of the video can be seen: stop decoding it and drop its layers
  // (it starts again as soon as the first screen is back in view).
  var bg = document.getElementById('site-bg');
  var hero = document.querySelector('.site-hero');
  if (bg && hero && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      var seen = entries[entries.length - 1].isIntersecting;
      bg.style.visibility = seen ? '' : 'hidden';
      if (!seen) video.pause(); else if (loaded) start();
    }, { threshold: 0, rootMargin: '-2px 0px -2px 0px' }).observe(hero);   // (the margin: a first screen that only touches the edge of the window does not count as seen)
  }
})();
