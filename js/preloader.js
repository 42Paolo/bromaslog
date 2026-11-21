/*
 * Bromaslog preloader.
 *
 * Sequence (timings measured on a screen recording of the reference loader):
 *   1. the screen is plain white;
 *   2. in the middle, the logo builds up one part at a time — BRO, MAS, LOG, 0.2s apart — each part
 *      sliding in a little and widening from its centre;
 *   3. shortly after the logo completes, two dark shapes start from the left and right sides and grow
 *      toward the middle until the screen is black (the soft, arch-shaped edge is drawn by a small
 *      WebGL fragment shader);
 *   4. the black fades to transparent and the carbon-fibre site background is revealed.
 *
 * Pacing is calm (about 3.8s from white to the site; see CONFIG). By default the dark fill comes
 * from the TOP and the logo parts slide in from above (CONFIG.direction); set it to 'bottom' for the
 * original orientation. All timings live in CONFIG. A slow page load simply holds the finished logo:
 * the exit never starts before the page is ready.
 */
(function () {
  'use strict';

  var CONFIG = {
    direction: 'top',        // 'top' = fill comes from the top, parts slide in from above · 'bottom' = the opposite
    // Calm pacing, a little faster than the first slow version. Lower = slower; every duration is divided by these.
    // (The reference's own speeds are 1.8 and 2: set logoSpeed 1.8, waveSpeed 2, exitOffset -0.25, partsExitDelay 0.5 for that.)
    logoSpeed: 1.6,          // timeScale of the logo parts: each part takes ~0.75s to build
    waveSpeed: 1.1,          // timeScale of the dark fill: ~1.1s to cover the screen, ~0.9s to fade out
    exitOffset: 0.4,         // the fill starts this long after the logo is complete (negative = it starts just before, overlapping the end)
    partsExitDelay: 0.8,     // after the fill starts, the parts start leaving this late (s): the fill covers them first
    respectReducedMotion: true,   // false = always play the full animation, even if the visitor's system asks for less motion
    maxWaitMs: 6000,         // failsafe: never hold the visitor longer than this waiting for "ready"
    logo: {
      vbW: 327.13, vbH: 225.25,   // logo viewBox
      pad: 60,                    // canvas padding above/below the logo (units), must match CSS aspect-ratio
      shift: 40,                  // how far a part slides while entering/leaving (units)
      start: 0.1,                 // delay before the first part
      stagger: 0.2,               // seconds between BRO → MAS → LOG, on the way in and on the way out (reference: ~0.1)
      ink: '8, 8, 8'              // #080808
    },
    fill: {
      levelFrom: -0.55, levelTo: 3.0,   // how far the dark has advanced (-0.55: a faint hint at the corners, 3.0: everything)
      depthFrom: 1.3, depthTo: 0.3,     // how much later the middle is covered than the sides (arch depth)
      rampIn: 0.2,                      // seconds to fade the first hint in, so it never "pops"
      color: [8 / 255, 8 / 255, 8 / 255]
    }
  };

  // Logo split by row. Coordinates are in the 327.13 × 225.25 viewBox.
  var PATHS = [
    'M14.4 73.9 L91.8 73.9 L105.1 60.4 L105.2 32.6 L90.9 19.1 L14.2 19.2 L13.1 18.4 L13.1 0.6 L12.5 0.0 L0.4 0.1 L0.0 0.7 L0.0 60.7 L13.1 73.6ZM120.6 73.9 L126.1 73.9 L126.6 73.2 L126.6 37.2 L131.2 32.4 L215.7 32.3 L216.2 31.5 L216.3 19.7 L215.8 19.2 L127.1 19.4 L113.5 32.8 L113.6 73.2 L115.0 73.9ZM276.2 73.9 L313.8 73.8 L326.6 61.0 L327.0 60.2 L327.0 32.8 L314.3 19.5 L313.6 19.2 L239.1 19.2 L238.0 19.8 L225.0 32.1 L224.6 33.2 L224.7 60.6 L237.9 73.5ZM87.5 60.9 L17.2 60.9 L16.3 60.5 L13.1 56.6 L13.1 35.5 L15.4 32.6 L16.1 32.4 L88.4 32.4 L92.6 37.1 L92.6 55.8 L92.4 56.7ZM276.0 60.9 L241.5 60.8 L237.6 56.3 L237.9 36.4 L242.5 32.4 L309.6 32.3 L310.3 32.7 L314.3 37.4 L314.4 55.7 L314.2 56.6 L310.4 60.4 L309.7 60.9Z',
    'M58.4 150.0 L59.5 149.2 L59.6 108.1 L60.2 106.7 L63.6 103.0 L64.6 102.6 L88.5 102.6 L92.7 106.3 L93.3 107.2 L93.2 149.4 L93.6 149.8 L105.6 149.7 L106.0 148.9 L105.9 102.4 L105.4 101.7 L92.3 89.2 L60.4 89.3 L53.5 95.7 L52.6 95.8 L44.8 89.3 L12.5 89.7 L0.0 102.2 L0.0 149.4 L0.5 149.8 L12.9 149.6 L13.0 107.1 L14.8 104.6 L16.5 102.9 L17.5 102.6 L41.9 102.6 L42.8 102.9 L46.6 107.1 L46.8 149.5ZM120.6 149.9 L126.1 149.9 L126.9 149.1 L127.1 136.0 L127.8 135.3 L203.4 135.3 L204.0 136.1 L204.0 149.3 L204.6 149.8 L216.4 149.9 L216.9 149.5 L216.9 102.2 L203.3 89.3 L128.0 89.1 L126.8 89.7 L114.1 102.3 L114.0 149.1 L115.1 149.8ZM269.4 149.9 L314.2 149.6 L326.2 137.2 L326.2 124.3 L314.1 112.9 L241.5 112.8 L238.2 109.9 L238.1 105.9 L238.5 105.1 L240.7 102.9 L242.1 102.7 L325.9 102.6 L326.4 102.1 L326.4 89.8 L325.9 89.2 L238.5 89.4 L225.8 101.0 L225.4 101.6 L225.4 114.1 L238.7 126.2 L310.1 126.0 L313.8 128.8 L314.3 129.5 L314.2 132.7 L310.6 136.9 L225.5 137.0 L225.1 148.3 L225.5 149.9ZM171.1 121.5 L127.7 121.3 L127.0 120.2 L127.1 107.2 L131.9 102.6 L199.5 102.6 L200.4 103.0 L204.1 107.0 L203.8 121.1Z',
    'M46.5 225.2 L104.5 225.1 L105.0 224.7 L105.1 212.6 L104.5 212.1 L16.7 212.2 L15.6 211.6 L13.0 208.3 L12.9 169.3 L12.4 168.7 L0.5 168.8 L0.0 169.2 L0.4 213.3 L11.6 224.7 L12.7 225.2ZM166.1 225.2 L204.7 224.8 L217.2 211.8 L217.0 181.9 L203.8 168.6 L128.1 168.7 L127.4 169.1 L119.8 176.2 L114.0 182.6 L114.1 211.8 L114.5 212.4 L127.4 225.0ZM310.2 225.2 L313.6 225.2 L314.6 224.8 L326.5 212.5 L326.9 197.3 L326.1 196.4 L314.5 196.5 L314.3 207.6 L309.4 212.2 L243.1 212.2 L238.8 208.2 L238.6 186.4 L243.1 181.8 L326.1 181.7 L326.8 181.1 L326.8 169.2 L326.2 168.7 L239.1 168.8 L226.3 181.1 L225.7 182.2 L225.9 212.2 L239.1 225.1ZM165.9 212.2 L131.0 212.0 L127.0 208.0 L127.0 186.6 L131.2 182.0 L200.2 181.7 L204.5 185.7 L204.8 207.3 L200.7 211.9Z'
  ];

  var root = document.documentElement;
  var el = document.getElementById('preloader');
  if (!el) return;

  var site = document.getElementById('site');
  var logoCanvas = document.getElementById('pl-logo');
  // Visitors whose system has "Reduce motion" on get a calm version (static logo, plain fade). To preview the
  // full animation on such a system, open the site with ?motion=full (and ?motion=reduced to force the calm one).
  var motionParam = new URLSearchParams(window.location.search).get('motion');
  var reduced = motionParam === 'full' ? false
    : motionParam === 'reduced' ? true
    : !!(CONFIG.respectReducedMotion && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var finished = false;
  var waveApi = null;

  /* ---------- background GIF (loaded after the page is ready, never blocks anything) ---------- */

  function initBackgroundGif() {
    var img = document.querySelector('.bg-gif');
    if (!img) return;
    var conn = navigator.connection;
    // The still poster stays for reduced motion, data saver and slow connections.
    if (reduced || (conn && (conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '')))) { img.remove(); return; }

    var src = img.getAttribute('data-src');
    var pre = new Image();
    pre.onload = function () {
      (pre.decode ? pre.decode() : Promise.resolve()).catch(function () {}).then(function () {
        img.src = src;                 // already cached: starts playing from its first frame
        img.classList.add('is-on');    // fades in over the poster, which is the same frame
      });
    };
    pre.onerror = function () { img.remove(); };   // missing file: the poster simply stays
    pre.src = src;
  }

  function finish() {
    if (finished) return;
    finished = true;
    if (waveApi) waveApi.destroy();
    if (el.parentNode) el.parentNode.removeChild(el);
    root.classList.remove('is-loading');
    root.classList.add('no-preloader');
    if (site) site.removeAttribute('inert');
    window.dispatchEvent(new CustomEvent('preloader:complete'));
  }

  // Without GSAP we must never trap the visitor behind the preloader.
  if (!window.gsap) { finish(); initBackgroundGif(); return; }

  if (site) site.setAttribute('inert', '');

  /* ---------- readiness (the video is NOT part of it) ---------- */

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

  pageReady.then(initBackgroundGif);   // fetch the GIF during the animation: usually in place by the reveal

  /* ---------- logo: three parts drawn on a 2D canvas (like icomat's arcs) ---------- */

  var L = CONFIG.logo;
  var ctx = logoCanvas.getContext('2d');
  var parts = PATHS.map(function (d) {
    // y: vertical offset · gl/gr: left/right stops of the alpha gradient · a: opacity
    return { path: new Path2D(d), y: -L.shift, gl: 0.5, gr: 0.5, a: 0 };
  });
  var scale = 1;

  function sizeLogo() {
    var cssW = logoCanvas.getBoundingClientRect().width || logoCanvas.clientWidth || 240;
    var dpr = Math.min(window.devicePixelRatio || 1, 3);
    logoCanvas.width = Math.round(cssW * dpr);
    logoCanvas.height = Math.round(cssW * dpr * (L.vbH + 2 * L.pad) / L.vbW);
    scale = logoCanvas.width / L.vbW;
    drawLogo();
  }

  function drawLogo() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, logoCanvas.width, logoCanvas.height);
    ctx.setTransform(scale, 0, 0, scale, 0, L.pad * scale);
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (p.a <= 0.001) continue;
      ctx.save();
      ctx.translate(0, p.y);
      var g = ctx.createLinearGradient(0, 0, L.vbW, 0);
      g.addColorStop(0, 'rgba(' + L.ink + ', 0)');
      g.addColorStop(p.gl, 'rgba(' + L.ink + ', ' + p.a + ')');
      g.addColorStop(p.gr, 'rgba(' + L.ink + ', ' + p.a + ')');
      g.addColorStop(1, 'rgba(' + L.ink + ', 0)');
      ctx.fillStyle = g;
      ctx.fill(p.path, 'evenodd');
      ctx.restore();
    }
  }

  sizeLogo();
  window.addEventListener('resize', sizeLogo);

  /* ---------- reduced motion: static logo, plain fade out ---------- */

  if (reduced) {
    parts.forEach(function (p) { p.y = 0; p.gl = 0; p.gr = 1; p.a = 1; });
    drawLogo();
    pageReady.then(function () {
      gsap.to(el, { opacity: 0, duration: 0.4, ease: 'none', onComplete: finish });
    });
    return;
  }

  /* ---------- the dark fill: soft arch-shaped edge, drawn by a fragment shader ---------- */

  var VERT = 'attribute vec2 aPos;varying vec2 vUv;void main(){vUv=aPos*0.5+0.5;gl_Position=vec4(aPos,0.0,1.0);}';
  var FRAG = [
    'precision highp float;',
    'varying vec2 vUv;',
    'uniform float uLevel,uDepth,uAlpha,uFromTop;',
    'uniform vec3 uColor;',
    'float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}',
    'void main(){',
    '  float y = mix(vUv.y, 1.0 - vUv.y, uFromTop);',              // 0 = the edge the fill starts from
    '  float arch = sin(vUv.x * 3.14159265);',                      // 0 at the left/right sides, 1 in the middle
    '  float h = uLevel - 1.3 * y - uDepth * arch;',                // the sides are covered first, the middle last
    '  float a = smoothstep(-1.0, 1.5, h) * uAlpha;',               // very wide soft edge
    '  a = clamp(a + (hash(gl_FragCoord.xy) - 0.5) / 255.0 * step(0.002, a), 0.0, 1.0);',   // dither: no banding
    '  gl_FragColor = vec4(uColor * a, a);',                        // premultiplied alpha
    '}'
  ].join('\n');

  var F = CONFIG.fill;
  var FROM_TOP = CONFIG.direction === 'top';
  // Shared mutable state tweened by GSAP.
  var fill = { level: F.levelFrom, depth: F.depthFrom, alpha: 0 };

  function createFill() {
    var canvas = document.createElement('canvas');
    canvas.id = 'pl-wave';
    canvas.setAttribute('aria-hidden', 'true');
    var gl = null;
    try {
      gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false });
    } catch (e) {}

    var api;
    if (gl) {
      var prog = gl.createProgram();
      [[gl.VERTEX_SHADER, VERT], [gl.FRAGMENT_SHADER, FRAG]].forEach(function (s) {
        var sh = gl.createShader(s[0]);
        gl.shaderSource(sh, s[1]);
        gl.compileShader(sh);
        gl.attachShader(prog, sh);
      });
      gl.linkProgram(prog);
      if (gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        gl.useProgram(prog);
        var buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
        var loc = gl.getAttribLocation(prog, 'aPos');
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
        var U = {};
        ['uLevel', 'uDepth', 'uAlpha', 'uFromTop', 'uColor'].forEach(function (n) {
          U[n] = gl.getUniformLocation(prog, n);
        });
        gl.uniform1f(U.uFromTop, FROM_TOP ? 1 : 0);
        gl.uniform3f(U.uColor, F.color[0], F.color[1], F.color[2]);

        // The edge is a very soft gradient, so half resolution is plenty (and cheap).
        var size = function () {
          canvas.width = Math.max(2, Math.round(window.innerWidth * 0.5));
          canvas.height = Math.max(2, Math.round(window.innerHeight * 0.5));
          gl.viewport(0, 0, canvas.width, canvas.height);
        };
        size();
        window.addEventListener('resize', size);

        api = {
          el: canvas,
          render: function () {
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.uniform1f(U.uLevel, fill.level);
            gl.uniform1f(U.uDepth, fill.depth);
            gl.uniform1f(U.uAlpha, fill.alpha);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
          },
          destroy: function () {
            window.removeEventListener('resize', size);
            var ext = gl.getExtension('WEBGL_lose_context');
            if (ext) ext.loseContext();
          }
        };
      }
    }

    if (!api) {
      // No WebGL: a plain black curtain sliding in from the same edge, then fading — same timing, no soft edge.
      canvas = document.createElement('div');
      canvas.id = 'pl-wave';
      canvas.className = 'is-fallback';
      canvas.setAttribute('aria-hidden', 'true');
      api = {
        el: canvas,
        render: function () {
          var p = Math.max(0, Math.min(1, (fill.level - F.levelFrom) / (F.levelTo - F.levelFrom)));
          var from = FROM_TOP ? -100 : 100;
          canvas.style.transform = 'translate3d(0,' + (from - from * p) + '%,0)';
          canvas.style.opacity = fill.alpha;
        },
        destroy: function () {}
      };
      api.render();
    }

    document.body.appendChild(api.el);
    var inner = api.destroy;
    api.destroy = function () {
      gsap.ticker.remove(api.render);
      inner();
      if (api.el.parentNode) api.el.parentNode.removeChild(api.el);
    };
    return api;
  }

  /* ---------- the timeline ---------- */

  try {
    waveApi = createFill();
  } catch (e) {
    finish();
    return;
  }

  var LS = CONFIG.logoSpeed;
  var WS = CONFIG.waveSpeed;
  var DIR = FROM_TOP ? 1 : -1;   // +1: parts travel downward, -1: upward
  var introEnd = [];             // when (s, on the intro timeline) each part has finished entering

  // 1–2. BRO, MAS, LOG appear one after another, each sliding in a little and widening from its centre.
  var intro = gsap.timeline({ onUpdate: drawLogo });
  parts.forEach(function (p, i) {
    var at = L.start + i * L.stagger;
    p.y = -DIR * L.shift;
    intro.fromTo(p, { y: -DIR * L.shift }, { y: 0, duration: 1 / LS, ease: 'power1.out' }, at)
      .fromTo(p, { gl: 0.5, a: 0 }, { gl: 0, a: 1, duration: 1.2 / LS, ease: 'power2.out' }, at)
      .fromTo(p, { gr: 0.5 }, { gr: 1, duration: 1.2 / LS, ease: 'power2.out' }, at);
    introEnd.push(at + 1.2 / LS);
  });

  // 3–4. The dark fill grows from the sides toward the middle, then fades out to reveal the site.
  function startExit() {
    if (finished) return;
    waveApi.el.style.visibility = 'visible';
    waveApi.render();
    gsap.ticker.add(waveApi.render);

    var ex = gsap.timeline({ onUpdate: drawLogo });

    // The parts are covered by the fill; they only start leaving once it is about to reach the middle.
    parts.forEach(function (p, i) {
      var at = CONFIG.partsExitDelay + i * L.stagger;
      ex.to(p, { gl: 0.5, gr: 0.5, a: 0, duration: 1.2 / LS, ease: 'power2.inOut' }, at)
        .to(p, { y: DIR * L.shift, duration: 1.2 / LS, ease: 'power2.inOut' }, at);
    });

    ex.to(fill, { alpha: 1, duration: F.rampIn, ease: 'none' }, 0)
      .to(fill, { level: F.levelTo, duration: 1.2 / WS, ease: 'power1.in' }, 0)
      .to(fill, { depth: F.depthTo, duration: 1.4 / WS, ease: 'power1.in' }, 0)
      .to(fill, {
        alpha: 0, duration: 1 / WS, ease: 'power1.in',
        onStart: function () {
          // The fill is now 100% opaque: drop the white + logo underneath, then fade the fill out.
          el.classList.add('is-hidden');
          window.dispatchEvent(new CustomEvent('preloader:reveal'));
        },
        onComplete: function () { ex.kill(); intro.kill(); finish(); }
      }, 1.4 / WS);
  }

  // The exit starts `exitOffset` seconds after the logo is complete, and never before the page is ready.
  var introTotal = Math.max.apply(null, introEnd);
  var exitDelay = new Promise(function (resolve) { gsap.delayedCall(Math.max(0, introTotal + CONFIG.exitOffset), resolve); });
  Promise.all([pageReady, exitDelay]).then(startExit);
})();
