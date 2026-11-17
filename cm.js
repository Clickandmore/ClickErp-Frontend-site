/* ==========================================================================
   ClickERP · Connected Motion · Experiment 01 (hero → before / after)
   One sticky stage. Every visual state is a pure function render(p) of the
   scroll progress p ∈ [0, 1]: scrolling down advances it, scrolling up reverses
   it, and when the scroll stops the motion stops (after a 0.4 s ease).
   The ClickERP mark changes role: brand (hero) → system hub (before/after);
   its cursor leaves the mark, "clicks" each problem into the system and docks again.
   Native scroll only (CSS sticky, no pin, no snap). Reduced motion / short
   screens / no JS / no GSAP → the static stacked layout in cm.css.
   QA: ?p=0.42 (freeze) · ?scrolltest=1 · ?debug=1 · ?static=1
   ========================================================================== */
(function () {
  'use strict';

  var params = new URLSearchParams(location.search);
  var doc = document.documentElement, body = document.body;
  var root = document.getElementById('cm'); if (!root) return;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  var stage = $('.cm-stage', root), sceneA = $('.cm-a', root), paper = $('.cm-paper', root), aura = $('.cm-aura', root), ringsBg = $('.cm-rings', root);
  var mark = $('.cm-mark', root), arc = $('.cm-mark .arc', root), rings = $('.cm-mark .rings', root);
  var cursor = $('.cm-cursor', root), clickEl = $('.cm-click', root), svg = $('.cm-wires', root);
  var lines = $$('[data-ln]', sceneA), hint = $('.cm-hint', root);
  var headB = $('.cm-b__head', root), beforeT = $('.cm-before .cm-col-t', root), afterBox = $('.cm-after', root);
  var cards = $$('.cm-card', root), badges = cards.map(function (c) { return $('.x', c); }), rows = $$('.cm-row', root), rowText = rows.map(function (r) { return $('span', r); }), rowIcon = rows.map(function (r) { return $('i', r); }), hubLabel = $('.cm-hub__label', root);
  var slotHero = $('[data-slot="hero"]', root), slotHub = $('[data-slot="hub"]', root);
  var head = $('.cm-head'), logoW = $('.cm-head .logo-w'), logoC = $('.cm-head .logo-c');
  var N = cards.length, NS = 'http://www.w3.org/2000/svg';
  var narrow = window.matchMedia('(max-width: 899px)');

  /* ---------- the score (all values are scroll progress 0…1) ---------- */
  var CLICK0 = .48, STEP = .1;                // four clicks: .48 → .88; inside each click, local time u ∈ [0, 1]:
  var U = { travel: [0, .42], ripple: [.38, .62], done: [.4, .5], wIn: [.42, .66], dotIn: [.46, .7], pulse: [.62, .84], wOut: [.66, .86], dotOut: [.7, .9], row: [.76, .98] };
  var SCATTER = [[.14, -.22, -14], [.22, .03, 12], [.12, .16, -9], [.06, .26, 15]]; // where each "before" card comes from (× stage w/h, rotation): always from the outer side, never across the hub
  var SCATTER_N = [[.5, -.08, -12], [-.5, -.05, 10], [.5, -.03, -8], [-.5, -.02, 12]]; // narrow: from the sides and above, never across the hub below

  /* ---------- helpers ---------- */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function seg(p, a, b) { return clamp((p - a) / (b - a), 0, 1); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function r1(v) { return Math.round(v * 10) / 10; }
  function r3(v) { return Math.round(v * 1000) / 1000; }
  var E = {
    inOut: function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
    out: function (t) { return 1 - Math.pow(1 - t, 3); },
    in: function (t) { return t * t; }
  };
  var PAPER = [251, 250, 247], NAVY = [27, 39, 64];
  function mix(a, b, t) { return 'rgb(' + a.map(function (v, i) { return Math.round(v + (b[i] - v) * t); }).join(',') + ')'; }
  function arcPt(a, b, t) { // quadratic arc that always bows upwards
    var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, lift = Math.min(120, Math.hypot(b.x - a.x, b.y - a.y) * .3);
    var cx = mx, cy = my - lift, u = 1 - t;
    return { x: u * u * a.x + 2 * u * t * cx + t * t * b.x, y: u * u * a.y + 2 * u * t * cy + t * t * b.y };
  }

  /* ---------- wires (created once) ---------- */
  var W = { inP: [], outP: [], dot: [], port: [], inLen: [], outLen: [] };
  for (var w = 0; w < N; w++) {
    var a = document.createElementNS(NS, 'path'); a.setAttribute('class', 'w-in');
    var b = document.createElementNS(NS, 'path'); b.setAttribute('class', 'w-out');
    var pt = document.createElementNS(NS, 'circle'); pt.setAttribute('class', 'w-port'); pt.setAttribute('r', '3.5');
    var d = document.createElementNS(NS, 'circle'); d.setAttribute('class', 'w-dot'); d.setAttribute('r', '4.5');
    svg.appendChild(a); svg.appendChild(b); svg.appendChild(pt); svg.appendChild(d);
    W.inP.push(a); W.outP.push(b); W.port.push(pt); W.dot.push(d);
  }

  /* ---------- measure the two layouts (FLIP-style slots) ---------- */
  var G = null;
  function box(el, s) { var r = el.getBoundingClientRect(), x = r.left - s.left, y = r.top - s.top; return { x: x, y: y, w: r.width, h: r.height, cx: x + r.width / 2, cy: y + r.height / 2 }; }
  function faceEdge(c, tx, ty) { // the side of a card that faces a point (left/right unless the point is right above/below it)
    if (tx < c.x || tx > c.x + c.w) return { x: tx < c.x ? c.x : c.x + c.w, y: c.cy, nx: tx < c.x ? -1 : 1, ny: 0 };
    return { x: c.cx, y: ty < c.cy ? c.y : c.y + c.h, nx: 0, ny: ty < c.cy ? -1 : 1 };
  }
  function fan(H, r, base, i, spread) { // wires meet the hub on an even fan around the direction of their column
    var a = (base + spread * (N > 1 ? (i / (N - 1)) * 2 - 1 : 0)) * Math.PI / 180;
    return { x: H.cx + Math.cos(a) * r, y: H.cy + Math.sin(a) * r, nx: Math.cos(a), ny: Math.sin(a) };
  }
  function fanAll(H, r, anchors, base, spread) { // fan slots assigned in the order the anchors sit around the hub → wires never cross
    var ang = anchors.map(function (a) { var t = Math.atan2(a.y - H.cy, a.x - H.cx) * 180 / Math.PI - base; while (t > 180) t -= 360; while (t < -180) t += 360; return t; });
    var order = anchors.map(function (_, i) { return i; }).sort(function (a, b) { return ang[a] - ang[b]; }), out = [];
    order.forEach(function (idx, k) { out[idx] = fan(H, r, base, k, spread); });
    return out;
  }
  function angleTo(H, boxes) { var x = 0, y = 0; boxes.forEach(function (b) { x += b.cx; y += b.cy; }); x /= boxes.length; y /= boxes.length; return Math.atan2(y - H.cy, x - H.cx) * 180 / Math.PI; }
  function portPath(a, b) {
    var L = Math.hypot(b.x - a.x, b.y - a.y), k = Math.min(150, L * .45);
    return 'M' + r1(a.x) + ' ' + r1(a.y) + ' C' + r1(a.x + a.nx * k) + ' ' + r1(a.y + a.ny * k) + ' ' + r1(b.x + b.nx * k) + ' ' + r1(b.y + b.ny * k) + ' ' + r1(b.x) + ' ' + r1(b.y);
  }
  function measure() {
    root.classList.add('cm-measuring');
    var s = stage.getBoundingClientRect();
    var A = box(slotHero, s), H = box(slotHub, s), K = box(afterBox, s);
    var C = cards.map(function (c) { return box($('.cm-card__in', c), s); }), R = rows.map(function (r) { return box(r, s); });
    root.classList.remove('cm-measuring');
    var g = { w: s.width, h: s.height, A: { cx: A.cx, cy: A.cy, s: Math.min(A.w, A.h) }, H: { cx: H.cx, cy: H.cy, s: Math.min(H.w, H.h) }, C: C, R: R };
    var hr = g.H.s * .5 * .94, right = g.H.cx >= K.cx - 1;
    g.angIn = angleTo(g.H, C); g.angOut = angleTo(g.H, R);
    g.cPt = C.map(function (c) { return { x: c.x + c.w - Math.min(40, c.w * .2), y: c.cy + 4 }; }); // cursor tip: on the card's icon side
    g.scatter = C.map(function (c, i) {
      var set = narrow.matches ? SCATTER_N : SCATTER, S = set[i % set.length], dx = S[0] * g.w, dy = S[1] * g.h;
      dx = clamp(dx, 12 - c.x, g.w - 12 - c.x - c.w); dy = clamp(dy, 90 - c.y, g.h - 16 - c.y - c.h);
      return { x: dx, y: dy, r: S[2] };
    });
    svg.setAttribute('viewBox', '0 0 ' + r1(g.w) + ' ' + r1(g.h));
    var inA = C.map(function (c) { return faceEdge(c, g.H.cx, g.H.cy); });
    var outA = R.map(function (r) { return { x: right ? K.x + K.w : K.x, y: r.cy, nx: right ? 1 : -1, ny: 0 }; });
    var inH = fanAll(g.H, hr, inA, g.angIn, 30), outH = fanAll(g.H, hr, outA, g.angOut, 30);
    for (var i = 0; i < N; i++) {
      var ca = inA[i], ro = outA[i];
      W.inP[i].setAttribute('d', portPath(ca, inH[i])); W.inLen[i] = W.inP[i].getTotalLength();
      W.outP[i].setAttribute('d', portPath(outH[i], ro)); W.outLen[i] = W.outP[i].getTotalLength();
      W.port[i].setAttribute('cx', r1(ro.x)); W.port[i].setAttribute('cy', r1(ro.y));
      W.inP[i].style.strokeDasharray = W.inLen[i]; W.outP[i].style.strokeDasharray = W.outLen[i];
    }
    ringsBg.style.setProperty('--hx', r1(g.H.cx) + 'px'); ringsBg.style.setProperty('--hy', r1(g.H.cy) + 'px');
    G = g;
  }

  /* ---------- the render: state = f(p) ---------- */
  var lastInert = null;
  function ck(p, i, key) { var w0 = CLICK0 + i * STEP, r = U[key]; return seg(p, w0 + r[0] * STEP, w0 + r[1] * STEP); } // local progress of one click phase
  function hubPulse(p) { var m = 0; for (var i = 0; i < N; i++) m = Math.max(m, Math.sin(Math.PI * ck(p, i, 'pulse'))); return m; }
  function cursorTip(p, dock) {
    if (p <= CLICK0) return dock;
    var prev = dock;
    for (var i = 0; i < N; i++) {
      var w0 = CLICK0 + i * STEP;
      if (p < w0 + U.travel[1] * STEP) return arcPt(prev, G.cPt[i], E.inOut(ck(p, i, 'travel')));
      if (p < w0 + STEP) return G.cPt[i];
      prev = G.cPt[i];
    }
    return arcPt(prev, dock, E.inOut(seg(p, CLICK0 + N * STEP, CLICK0 + N * STEP + .05)));
  }
  function render(p) {
    if (!G) return;
    // 1 · the hero copy leaves, line by line (it is gone before the mark crosses its column)
    lines.forEach(function (el, i) {
      var t = E.in(seg(p, .03 + i * .018, .13 + i * .018));
      el.style.transform = t ? 'translate3d(0,' + r1(-34 * t) + 'px,0)' : ''; el.style.opacity = t ? r3(1 - t) : '';
    });
    var gone = p > .1; if (gone !== lastInert) { lastInert = gone; if (gone) sceneA.setAttribute('inert', ''); else sceneA.removeAttribute('inert'); }
    hint.style.opacity = r3(1 - seg(p, 0, .05));

    // 2 · the mark travels from the hero slot to the hub on a slight arc, and its C turns its opening toward the problems
    var tm = E.inOut(seg(p, .06, .36));
    var size = lerp(G.A.s, G.H.s, tm), sc = size / 200;
    var cx = lerp(G.A.cx, G.H.cx, tm), cy = lerp(G.A.cy, G.H.cy, tm) - Math.sin(tm * Math.PI) * G.h * .06;
    mark.style.transform = 'translate3d(' + r1(cx - size / 2) + 'px,' + r1(cy - size / 2) + 'px,0) scale(' + sc.toFixed(4) + ')';
    var open = E.inOut(seg(p, .08, .34)) * (1 - E.inOut(seg(p, .9, .97)));
    var dash = 292 - 72 * open, gapAt = G.angIn * open;          // C: 292° → 220°, opening rotates from east to the "before" column
    arc.setAttribute('stroke-dasharray', r1(dash) + ' ' + r1(360 - dash));
    arc.setAttribute('transform', 'rotate(' + r1(gapAt - 180 - dash / 2) + ' 100 100)');
    var hp = hubPulse(p);
    rings.setAttribute('transform', hp > .001 ? 'translate(104 100) scale(' + (1 + .22 * hp).toFixed(3) + ') translate(-104 -100)' : '');
    var D = size * 3.4; aura.style.transform = 'translate3d(' + r1(cx - D / 2) + 'px,' + r1(cy - D / 2) + 'px,0) scale(' + (D / 1000).toFixed(4) + ')';
    aura.style.opacity = r3(1 - seg(p, .04, .24));

    // 3 · the click opens the paper world from the mark (the only mask on the page); the mark is navy as soon as paper is under it
    var far = Math.max(Math.hypot(cx, cy), Math.hypot(G.w - cx, cy), Math.hypot(cx, G.h - cy), Math.hypot(G.w - cx, G.h - cy)) + 4;
    var R = E.inOut(seg(p, .14, .4)) * far;
    paper.style.clipPath = 'circle(' + r1(R) + 'px at ' + r1(cx) + 'px ' + r1(cy) + 'px)';
    mark.style.color = mix(PAPER, NAVY, seg(R, size * .25, size * .62));
    ringsBg.style.opacity = r3(seg(p, .34, .5));
    var k = seg(p, .26, .34); logoW.style.opacity = r3(1 - k); logoC.style.opacity = r3(k); head.classList.toggle('on-paper', k > .5);

    // 4 · section B: the problems arrive scattered and settle; then their column title; the "after" card opens with 4 empty slots
    var th = E.out(seg(p, .36, .48)); headB.style.opacity = r3(th); headB.style.transform = th < 1 ? 'translate3d(0,' + r1(22 * (1 - th)) + 'px,0)' : '';
    cards.forEach(function (c, i) {
      var t = E.out(seg(p, .28 + i * .025, .42 + i * .025)), o = G.scatter[i];
      c.style.opacity = r3(Math.min(1, t * 1.6));
      c.style.transform = t < 1 ? 'translate3d(' + r1(o.x * (1 - t)) + 'px,' + r1(o.y * (1 - t)) + 'px,0) rotate(' + r1(o.r * (1 - t)) + 'deg) scale(' + r3(.9 + .1 * t) + ')' : '';
    });
    beforeT.style.opacity = r3(seg(p, .44, .5));
    var ta = E.out(seg(p, .42, .5)); afterBox.style.opacity = r3(ta); afterBox.style.transform = ta < 1 ? 'translate3d(0,' + r1(18 * (1 - ta)) + 'px,0)' : '';

    // 5 · four clicks: problem → wire → system → wire → result
    var ripple = null;
    for (var i = 0; i < N; i++) {
      var rt = ck(p, i, 'ripple'); if (rt > 0 && rt < 1) ripple = { t: rt, x: G.cPt[i].x, y: G.cPt[i].y };
      var done = ck(p, i, 'done'); cards[i].classList.toggle('is-done', done >= .5);
      badges[i].style.transform = done > 0 && done < 1 ? 'scale(' + r3(1 + .5 * Math.sin(Math.PI * done)) + ')' : '';
      var din = E.inOut(ck(p, i, 'wIn')), dout = E.inOut(ck(p, i, 'wOut'));
      W.inP[i].style.strokeDashoffset = r1(W.inLen[i] * (1 - din)); W.inP[i].style.opacity = din > 0 ? 1 : 0;
      W.outP[i].style.strokeDashoffset = r1(W.outLen[i] * (1 - dout)); W.outP[i].style.opacity = dout > 0 ? 1 : 0;
      W.port[i].style.opacity = dout >= 1 ? 1 : 0;
      var t1 = ck(p, i, 'dotIn'), t2 = ck(p, i, 'dotOut'), dot = W.dot[i], q = null;
      if (t1 > 0 && t1 < 1) q = W.inP[i].getPointAtLength(W.inLen[i] * E.inOut(t1)); else if (t2 > 0 && t2 < 1) q = W.outP[i].getPointAtLength(W.outLen[i] * E.inOut(t2));
      if (q) { dot.setAttribute('cx', r1(q.x)); dot.setAttribute('cy', r1(q.y)); dot.style.opacity = 1; } else dot.style.opacity = 0;
      var tr = E.out(ck(p, i, 'row'));
      rowText[i].style.opacity = r3(tr); rowText[i].style.transform = tr < 1 ? 'translate3d(' + r1(22 * (1 - tr)) + 'px,0,0)' : '';
      rowIcon[i].style.opacity = r3(.22 + .78 * tr); rowIcon[i].style.transform = tr > 0 && tr < 1 ? 'scale(' + r3(1 + .35 * Math.sin(Math.PI * tr)) + ')' : '';
    }
    if (ripple) { clickEl.style.opacity = r3(1 - ripple.t); clickEl.style.transform = 'translate3d(' + r1(ripple.x) + 'px,' + r1(ripple.y) + 'px,0) scale(' + r3(.3 + 1.3 * ripple.t) + ')'; }
    else clickEl.style.opacity = 0;

    // 6 · the cursor: part of the mark → clicks → back home; the C closes = the logo is whole again
    var dock = { x: cx - size / 2 + 104 * sc, y: cy - size / 2 + 100 * sc };
    var tip = cursorTip(p, dock);
    cursor.style.transform = 'translate3d(' + r1(tip.x) + 'px,' + r1(tip.y) + 'px,0) scale(' + sc.toFixed(4) + ')';
    hubLabel.style.opacity = r3(seg(p, .93, .99));
    state.p = p;
    if (dbg) dbg.textContent = 'p ' + p.toFixed(3);
  }
  function clearAll() {
    [mark, cursor, clickEl, aura, paper, ringsBg, hint, headB, beforeT, afterBox, hubLabel, logoW, logoC].concat(lines, cards, rows, badges, rowText, rowIcon).forEach(function (el) { el.removeAttribute('style'); });
    W.inP.concat(W.outP, W.dot, W.port).forEach(function (el) { el.removeAttribute('style'); });
    arc.setAttribute('stroke-dasharray', '292 68'); arc.setAttribute('transform', 'rotate(34 100 100)'); rings.removeAttribute('transform');
    cards.forEach(function (c) { c.classList.remove('is-done'); }); sceneA.removeAttribute('inert'); head.classList.remove('on-paper'); lastInert = null;
  }

  var state = { p: 0, st: null };
  var dbg = null;
  if (params.get('debug') === '1') { dbg = document.createElement('div'); dbg.style.cssText = 'position:fixed;z-index:99;bottom:8px;left:8px;padding:4px 8px;border-radius:6px;background:#000c;color:#fff;font:12px monospace'; body.appendChild(dbg); }

  if (!window.gsap || !window.ScrollTrigger || params.get('static') === '1') return; // static layout stays
  gsap.registerPlugin(ScrollTrigger);
  var SCRUB = params.get('scrolltest') === '1' ? true : .4;
  var proxy = { p: 0 };

  gsap.matchMedia().add('(prefers-reduced-motion: no-preference) and (min-height: 560px)', function () {
    doc.classList.add('cm-live');
    measure(); render(0);
    var tween = gsap.to(proxy, { p: 1, ease: 'none', onUpdate: function () { render(proxy.p); } });
    state.st = ScrollTrigger.create({ trigger: root, start: 'top top', end: 'bottom bottom', scrub: SCRUB, animation: tween, invalidateOnRefresh: true });
    var onRefresh = function () { measure(); render(proxy.p); };
    ScrollTrigger.addEventListener('refresh', onRefresh);
    return function () { ScrollTrigger.removeEventListener('refresh', onRefresh); doc.classList.remove('cm-live'); clearAll(); G = null; state.st = null; };
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });

  /* ---------------- QA (prototype only) ---------------- */
  window.__cm = { render: render, measure: measure, state: state, proxy: proxy, get G() { return G; } };
  var freeze = params.get('p');
  if (freeze !== null) window.addEventListener('load', function () { setTimeout(function () {
    if (!state.st) return; state.st.disable(false); window.scrollTo(0, 0); measure(); render(clamp(parseFloat(freeze) || 0, 0, 1));
    body.setAttribute('data-frozen', freeze);
  }, 500); });
})();
