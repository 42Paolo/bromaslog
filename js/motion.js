/*
 * Motion tokens for the scripts. The numbers live in css/motion.css (one source for CSS and JS); this file reads them and hands them to
 * GSAP as plain numbers and easing functions: window.BromaslogMotion. If the stylesheet is missing, the same values below are used.
 *
 *   var M = window.BromaslogMotion;
 *   gsap.to(el, { y: 0, duration: M.dur.base, ease: M.ease.out, stagger: M.stagger.base });
 *   M.exit(M.dur.primary)         // what leaves is quicker (x 0.8)
 *   M.travel(px, M.dur.fast)      // a duration adjusted to how far the thing goes (x 0.8 ... x 1.25)
 *
 * See the table at the top of css/motion.css for what each tier is for.
 */
(function () {
  'use strict';
  var style = window.getComputedStyle ? window.getComputedStyle(document.documentElement) : null;

  function raw(name) { return style ? String(style.getPropertyValue(name) || '').trim() : ''; }
  function seconds(name, fallback) {
    var v = raw(name), n = parseFloat(v);
    if (!v || isNaN(n)) return fallback;
    return /ms$/.test(v) ? n / 1000 : n;
  }
  function number(name, fallback) {
    var n = parseFloat(raw(name));
    return isNaN(n) ? fallback : n;
  }

  // cubic-bezier(x1, y1, x2, y2) as a function of progress, the same curve a CSS transition draws
  function bezier(x1, y1, x2, y2) {
    var cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    var cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    function X(t) { return ((ax * t + bx) * t + cx) * t; }
    function Y(t) { return ((ay * t + by) * t + cy) * t; }
    function dX(t) { return (3 * ax * t + 2 * bx) * t + cx; }
    return function (p) {
      if (p <= 0) return 0;
      if (p >= 1) return 1;
      var t = p, i, x, d;
      for (i = 0; i < 8; i++) {                       // Newton
        x = X(t) - p;
        if (Math.abs(x) < 1e-5) return Y(t);
        d = dX(t);
        if (Math.abs(d) < 1e-6) break;
        t -= x / d;
      }
      var lo = 0, hi = 1;                             // bisection, when Newton does not settle
      t = p;
      for (i = 0; i < 24; i++) {
        x = X(t) - p;
        if (Math.abs(x) < 1e-5) break;
        if (x > 0) hi = t; else lo = t;
        t = (lo + hi) / 2;
      }
      return Y(t);
    };
  }
  function curve(name, fallback) {
    var m = /cubic-bezier\(([^)]+)\)/.exec(raw(name));
    var p = (m ? m[1] : fallback).split(',').map(function (s) { return parseFloat(s); });
    if (p.length !== 4 || p.some(isNaN)) p = fallback.split(',').map(function (s) { return parseFloat(s); });
    return bezier(p[0], p[1], p[2], p[3]);
  }

  var M = {
    dur: {
      micro: seconds('--dur-micro', 0.2),
      fast: seconds('--dur-fast', 0.35),
      base: seconds('--dur-base', 0.6),
      primary: seconds('--dur-primary', 1),
      scene: seconds('--dur-scene', 1.6)
    },
    ease: {
      out: curve('--ease-out', '0.2, 0.7, 0.2, 1'),
      in: curve('--ease-in', '0.45, 0, 0.8, 0.55'),
      move: curve('--ease-move', '0.65, 0, 0.25, 1'),
      soft: curve('--ease-soft', '0.45, 0, 0.55, 1'),
      linear: function (p) { return p; }
    },
    stagger: {
      tight: seconds('--stagger-tight', 0.03),
      base: seconds('--stagger-base', 0.06),
      loose: seconds('--stagger-loose', 0.09)
    },
    delay: {
      hair: seconds('--delay-hair', 0.05),
      short: seconds('--delay-short', 0.1),
      base: seconds('--delay-base', 0.2),
      mid: seconds('--delay-mid', 0.4),
      long: seconds('--delay-long', 0.6)
    },
    exitRatio: number('--exit-ratio', 0.8),
    travelRef: number('--travel-ref', 240),
    hold: seconds('--hold', 0.15),
    follow: number('--follow-rate', 6.3)
  };

  // what leaves is quicker than what arrives
  M.exit = function (duration) { return duration * M.exitRatio; };

  // perceived speed: a longer way takes a little longer, a shorter one a little less (never less than 80% or more than 125% of the tier)
  M.travel = function (px, duration) {
    var f = Math.pow(Math.max(Math.abs(px), 1) / M.travelRef, 0.3);
    return duration * Math.min(1.25, Math.max(0.8, f));
  };

  window.BromaslogMotion = M;
})();
