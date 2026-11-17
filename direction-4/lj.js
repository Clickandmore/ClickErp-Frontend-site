/* ==========================================================================
   ClickERP · Experiment 02 «رحلة الشاشة» (laptop journey)
   The ClickChat principle, extended: one sticky stage; every state is a pure
   function render(p) of scroll progress p ∈ [0, 3] (one viewport per step).
   A real laptop render travels left → centre → right → centre-low and changes
   its ANGLE (four photos) as it moves; the ClickERP UI is projected onto each
   photo's screen with a homography (matrix3d). The environment is five restrained layers
   (base, ambient light, grid, journey paths, grounding) driven by the same p.
   Native scroll only. Static stacked layout for reduced motion / narrow / short
   screens / no GSAP. QA: ?p=1.5 · ?scrolltest=1 · ?static=1
   ========================================================================== */
(function () {
  'use strict';
  var params = new URLSearchParams(location.search), doc = document.documentElement, body = document.body;
  var root = document.getElementById('lj'); if (!root) return;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  var stage = $('.lj-stage', root), chs = $$('.lj-ch', root), shots = chs.map(function (c) { return $('.lj-shot', c); });
  var copies = chs.map(function (c) { return $$('.lj-copy, .lj-points', c); });
  var chips = $('.lj-chips', root), ambA = $('.lj-amb--a', root), ambB = $('.lj-amb--b', root), grid = $('.lj-grid', root), pathsEl = $('.lj-paths', root), pool = $('.lj-pool', root), shadow = $('.lj-shadow', root);
  var SEG = []; // the laptop's journey as drawable path segments (built in measure)
  var rail = $$('.lj-rail button', root), hint = $('.lj-hint', root);
  var track = $('[data-track]', root), stageLis = $$('.ui-track li', root), statusEl = $('[data-status]', root), bars = $('[data-bars]', root);
  var STAGES = ['طلب جديد', 'مساند', 'التفويض', 'التأشيرة', 'التذكرة', 'الوصول', 'الضمان', 'مكتمل'];
  var N = chs.length, SW = 720, SH = 450, IMG_W = 1536;
  // where the laptop rests in each chapter (fractions of the stage) — RTL: chapter 0 text sits on the right
  var POSE = [{ cx: .285, cy: .57, s: 1.12 }, { cx: .5, cy: .56, s: .95 }, { cx: .71, cy: .57, s: 1.15 }, { cx: .5, cy: .78, s: 1.22 }];

  // how the device turns between two photos (degrees of 3D rotation shared by the outgoing and incoming photo)
  var TURN = [{ axis: 'y', a: -24 }, { axis: 'y', a: -24 }, { axis: 'x', a: 22 }];
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smooth(t) { return t * t * (3 - 2 * t); }
  function r1(v) { return Math.round(v * 10) / 10; }
  function r3(v) { return Math.round(v * 1000) / 1000; }

  /* ---------- screen projection: 720 × 450 UI → the photo's screen quad ---------- */
  function homography(w, h, q) { // q = [[x,y] × 4] for TL, TR, BR, BL
    var src = [[0, 0], [w, 0], [w, h], [0, h]], M = [], i, j, k;
    for (i = 0; i < 4; i++) { var x = src[i][0], y = src[i][1], X = q[i][0], Y = q[i][1];
      M.push([x, y, 1, 0, 0, 0, -x * X, -y * X, X]); M.push([0, 0, 0, x, y, 1, -x * Y, -y * Y, Y]); }
    for (i = 0; i < 8; i++) {
      var m = i; for (j = i + 1; j < 8; j++) if (Math.abs(M[j][i]) > Math.abs(M[m][i])) m = j;
      var t = M[i]; M[i] = M[m]; M[m] = t; var d = M[i][i];
      for (k = i; k < 9; k++) M[i][k] /= d;
      for (j = 0; j < 8; j++) if (j !== i) { var f = M[j][i]; for (k = i; k < 9; k++) M[j][k] -= f * M[i][k]; }
    }
    var v = M.map(function (r) { return r[8]; }); // a b c d e f g h
    return 'matrix3d(' + [v[0], v[3], 0, v[6], v[1], v[4], 0, v[7], 0, 0, 1, 0, v[2], v[5], 0, 1].map(function (n) { return +n.toFixed(8); }).join(',') + ')';
  }
  function project(fig) {
    var w = fig.offsetWidth; if (!w) return;
    var k = w / IMG_W, q = fig.getAttribute('data-quad').split(' ').map(function (p) { var a = p.split(','); return [a[0] * k, a[1] * k]; });
    var cx = (q[0][0] + q[1][0] + q[2][0] + q[3][0]) / 4, cy = (q[0][1] + q[1][1] + q[2][1] + q[3][1]) / 4;
    q = q.map(function (p) { var dx = p[0] - cx, dy = p[1] - cy, L = Math.hypot(dx, dy) || 1; return [p[0] + dx / L * 1.6, p[1] + dy / L * 1.6]; }); // cover the white fringe
    $('.lj-screen', fig).style.transform = homography(SW, SH, q);
  }
  function projectAll() { shots.forEach(project); doc.classList.add('lj-ready'); }
  projectAll();
  if ('ResizeObserver' in window) { var ro = new ResizeObserver(projectAll); shots.forEach(function (s) { ro.observe(s); }); } else window.addEventListener('resize', projectAll);

  /* ---------- screen content driven by position ---------- */
  function setT(t) {
    track.style.setProperty('--t', t.toFixed(3));
    var cur = Math.min(7, Math.floor(t + .001));
    stageLis.forEach(function (li, i) { li.classList.toggle('is-done', t >= 7 || i < t - .01); li.classList.toggle('is-cur', t < 7 && i === cur); });
    statusEl.textContent = STAGES[cur]; statusEl.classList.toggle('done', t >= 7);
  }
  setT(7);

  /* ---------- the render: state = f(p) ---------- */
  var G = null, lastCur = -1;
  function measure() { var r = stage.getBoundingClientRect(); G = { w: r.width, h: r.height, wd: Math.min(r.width * .64, r.height * 1.08) }; root.style.setProperty('--wd', r1(G.wd) + 'px');
    var short = r.height < 760; POSE[3].cy = short ? .93 : .78; POSE[3].s = short ? 1.02 : 1.22; // short screens: keep the laptop clear of the closing CTAs
    buildPaths(); projectAll(); }
  // Layer 4: the journey itself. A smooth curve through the laptop's four resting points (Catmull-Rom → cubic), plus two
  // quiet parallel echoes. Each segment is drawn exactly as the laptop travels it, so the lines can never drift from it.
  function buildPaths() {
    var NSV = 'http://www.w3.org/2000/svg', P = POSE.map(function (q) { return [q.cx * G.w, q.cy * G.h]; });
    SEG.forEach(function (sg) { sg.els.forEach(function (e) { e.remove(); }); }); SEG = [];
    pathsEl.setAttribute('viewBox', '0 0 ' + r1(G.w) + ' ' + r1(G.h));
    for (var i = 0; i < P.length - 1; i++) {
      var p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
      var c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      var dx = p2[0] - p1[0], dy = p2[1] - p1[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, sg = { els: [], paths: [], dots: [] };
      [0, 64, -64].forEach(function (off, k) {
        var o = function (q) { return r1(q[0] + nx * off) + ' ' + r1(q[1] + ny * off); };
        var el = document.createElementNS(NSV, 'path'); el.setAttribute('d', 'M' + o(p1) + ' C' + o(c1) + ' ' + o(c2) + ' ' + o(p2));
        el.setAttribute('class', k ? 'echo' : 'main'); el.setAttribute('pathLength', '1'); el.style.strokeDasharray = '1'; el.style.strokeDashoffset = '1';
        pathsEl.appendChild(el); sg.els.push(el); sg.paths.push(el);
        if (k) { var dot = document.createElementNS(NSV, 'circle'); dot.setAttribute('r', '2.6'); pathsEl.appendChild(dot); sg.els.push(dot); sg.dots.push({ el: dot, path: el, len: el.getTotalLength() }); }
      });
      SEG.push(sg);
    }
  }
  function render(p) {
    if (!G) return;
    var i0 = Math.min(N - 2, Math.floor(p)), f = p - i0, t = smooth(clamp((f - .12) / .76, 0, 1));
    var A = POSE[i0], B = POSE[i0 + 1], cx = lerp(A.cx, B.cx, t) * G.w, cy = lerp(A.cy, B.cy, t) * G.h, sc = lerp(A.s, B.s, t);
    // depth: the laptop lifts and pulls back slightly while it travels
    var arc = Math.sin(t * Math.PI), rot = arc * (i0 % 2 ? 2 : -2), sc2 = sc * (1 - .07 * arc), blur = 2.2 * Math.max(0, 1 - Math.abs(f - .5) / .08);
    var base = 'perspective(1500px) translate3d(' + r1(cx - G.wd / 2) + 'px,' + r1(cy - G.wd / 3 - arc * G.h * .035) + 'px,0) rotate(' + r1(rot) + 'deg) ';
    var tf = base + 'scale(' + sc2.toFixed(4) + ')';
    // the turn: each photo rotates in 3D toward the next angle as it leaves, and the next one finishes that same rotation as it arrives
    shots.forEach(function (s, i) {
      var d = p - i, ad = Math.abs(d), o = 1 - clamp((ad - .47) / .06, 0, 1);
      s.style.opacity = r3(o); s.style.visibility = o > 0 ? 'visible' : 'hidden';
      if (o <= 0) return;
      var w = smooth(clamp((ad - .2) / .32, 0, 1)), seg = d > 0 ? i : i - 1, turn = TURN[clamp(seg, 0, TURN.length - 1)];
      var ang = (d > 0 ? 1 : -1) * w * turn.a;
      s.style.transform = base + (turn.axis === 'x' ? 'rotateX(' : 'rotateY(') + r1(ang) + 'deg) scale(' + (sc2 * (1 - .05 * w)).toFixed(4) + ')';
      s.style.filter = (blur > .05 ? 'blur(' + r1(blur) + 'px) ' : '') + (w > .01 ? 'brightness(' + r3(1 + .12 * w) + ')' : '');
    });
    chips.style.transform = tf; chips.style.opacity = r3(i0 === 0 ? 1 - clamp(t / .3, 0, 1) : 0);
    // text leaves and arrives WITH the laptop's movement (t), not before it
    var dirX = B.cx > A.cx ? 1 : B.cx < A.cx ? -1 : 0;
    copies.forEach(function (els, i) {
      var o = i === i0 ? 1 - clamp(t / .42, 0, 1) : i === i0 + 1 ? clamp((t - .58) / .42, 0, 1) : 0, out = i === i0;
      var e = out ? 1 - o : -(1 - o);
      els.forEach(function (el, k) {
        el.style.opacity = r3(o);
        el.style.transform = o < 1 ? 'translate3d(' + r1(dirX * 70 * e * (1 + k * .3)) + 'px,' + r1((dirX ? 0 : -40) * e) + 'px,0)' : '';
        el.style.filter = o < 1 && o > 0 ? 'blur(' + r1(5 * (1 - o)) + 'px)' : '';
        var on = o > .6; if (el._on !== on) { el._on = on; el.classList.toggle('is-on', on); if (on) el.removeAttribute('inert'); else el.setAttribute('inert', ''); }
      });
    });
    // background follows the laptop
    // ---- environment, all from the same p / t / pose as the laptop ----
    var last = i0 === N - 2 ? t : 0, k = G.wd * sc2 / 920, baseY = cy + G.wd * sc2 * lerp(.205, .13, last);
    var centre = 1 - Math.min(1, Math.abs(cx / G.w - .5) / .2);                 // 1 when the laptop is centre stage (showcase)
    var dissolve = 1 - clamp((p - (N - 1 - .22)) / .22, 0, 1);                  // stage 5: geometry fades as the story ends
    // 2 · ambient light sits behind the laptop's visual centre; it widens and brightens for the centre showcase
    ambA.style.transform = 'translate3d(' + r1(cx) + 'px,' + r1(cy - G.h * .04) + 'px,0) scale(' + (k * (1 + .22 * centre)).toFixed(3) + ')';
    ambA.style.opacity = r3(.82 + .18 * centre);
    ambB.style.transform = 'translate3d(' + r1(cx + (G.w / 2 - cx) * .9 + G.w * .16) + 'px,' + r1(cy - G.h * .26) + 'px,0) scale(' + k.toFixed(3) + ')';
    // 3 · the grid is only revealed around the laptop; it drifts with a little parallax and grows with the laptop's scale
    grid.style.setProperty('--gx', r1(cx + 120) + 'px'); grid.style.setProperty('--gy', r1(cy + 120) + 'px');
    grid.style.backgroundPosition = r1((.5 - cx / G.w) * 46) + 'px ' + r1(p * -18) + 'px';
    grid.style.backgroundSize = r1(88 * (.94 + .12 * sc2)) + 'px ' + r1(88 * (.94 + .12 * sc2)) + 'px';
    grid.style.opacity = r3(.9 * dissolve);
    // 4 · the journey: each segment draws while the laptop travels it, then rests at low opacity; two small signals run ahead
    SEG.forEach(function (sg, i) {
      var ts = i < i0 ? 1 : i === i0 ? t : 0;
      sg.paths.forEach(function (el) { el.style.strokeDashoffset = r3(1 - ts); });
      sg.dots.forEach(function (dt, j) {
        var u = clamp(ts * 1.12 + .04 * j, 0, 1), on = i === i0 && ts > .02 && u < 1;
        if (on) { var q = dt.path.getPointAtLength(dt.len * u); dt.el.setAttribute('cx', r1(q.x)); dt.el.setAttribute('cy', r1(q.y)); }
        dt.el.style.opacity = on ? r3(.75 * Math.sin(Math.PI * u)) : 0;
      });
    });
    pathsEl.style.opacity = r3(dissolve);
    // 5 · grounding: a contact shadow and a little reflected light under the base (softer and wider when seen from above)
    shadow.style.transform = 'translate3d(' + r1(cx) + 'px,' + r1(baseY) + 'px,0) scale(' + (k * lerp(1, 1.15, last)).toFixed(3) + ',' + (k * lerp(1, 2.1, last)).toFixed(3) + ')';
    shadow.style.opacity = r3(lerp(.95, .6, last) * (1 - .35 * arc));
    pool.style.transform = 'translate3d(' + r1(cx) + 'px,' + r1(baseY + 26 * k) + 'px,0) scale(' + k.toFixed(3) + ',' + (k * lerp(1, 1.5, last)).toFixed(3) + ')';
    // screens
    setT(clamp((p - .62) / .68, 0, 1) * 7);
    bars.style.setProperty('--g', r3(smooth(clamp((p - 1.55) / .4, 0, 1))));
    hint.style.opacity = r3(i0 === 0 ? 1 - clamp(t / .2, 0, 1) : 0);
    var cur = Math.round(p); if (cur !== lastCur) { lastCur = cur; rail.forEach(function (b, i) { b.setAttribute('aria-current', i === cur ? 'step' : 'false'); }); }
    state.p = p;
  }
  function clearAll() {
    shots.concat([chips, ambA, ambB, grid, pathsEl, pool, shadow, hint]).forEach(function (el) { el.removeAttribute('style'); });
    copies.forEach(function (els) { els.forEach(function (el) { el.removeAttribute('style'); el.removeAttribute('inert'); el.classList.remove('is-on'); el._on = undefined; }); });
    root.style.removeProperty('--wd'); setT(7); bars.style.setProperty('--g', 1); lastCur = -1; projectAll();
  }

  var state = { p: 0, st: null };
  window.__lj = { render: render, state: state, proxy: null };
  if (!window.gsap || !window.ScrollTrigger || params.get('static') === '1') return;
  gsap.registerPlugin(ScrollTrigger);
  var proxy = { p: 0 }; window.__lj.proxy = proxy;
  gsap.matchMedia().add('(prefers-reduced-motion: no-preference) and (min-width: 900px) and (min-height: 600px)', function () {
    doc.classList.add('lj-live'); measure(); render(0);
    var tween = gsap.to(proxy, { p: N - 1, ease: 'none', onUpdate: function () { render(proxy.p); } });
    state.st = ScrollTrigger.create({ trigger: root, start: 'top top', end: 'bottom bottom', scrub: params.get('scrolltest') === '1' ? true : .5, animation: tween, invalidateOnRefresh: true });
    var onRefresh = function () { measure(); render(proxy.p); };
    ScrollTrigger.addEventListener('refresh', onRefresh);
    return function () { ScrollTrigger.removeEventListener('refresh', onRefresh); doc.classList.remove('lj-live'); G = null; state.st = null; clearAll(); };
  });
  rail.forEach(function (b) { b.addEventListener('click', function () {
    if (!state.st) return; var i = +b.getAttribute('data-go');
    window.scrollTo({ top: state.st.start + (i / (N - 1)) * (state.st.end - state.st.start), behavior: 'smooth' });
  }); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });

  var freeze = params.get('p');
  if (freeze !== null) window.addEventListener('load', function () { setTimeout(function () {
    if (!state.st) return; state.st.disable(false); window.scrollTo(0, 0); measure(); render(clamp(parseFloat(freeze) || 0, 0, N - 1)); body.setAttribute('data-frozen', freeze);
  }, 500); });
})();
