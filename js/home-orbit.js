/* ==========================================================================
   ClickERP · Homepage after hero «المدار» · Direction A «المسار الأخضر» · behaviour
   Source: prototype/post-hero/a-green-route/a.js (kept as the comparison record).
   Runs after hero-a/hero-a.js, which it never touches. Added here:
   - B.handoff: in scene 5 the 3D arrow clicks the demo CTA; the green line is born at
     the arrow's tip, drops through the night (stepping around the assurance row and the
     chapter rail when they are in the way), crosses the arc into paper and becomes the spine.
   - Paths are rebuilt on every ScrollTrigger refreshInit (after the hero re-measures).
   - The ?go= review aid only completes this page's own tweens, never the hero's.
   - Builds every green path from the live layout (so it fits any width).
   - GSAP 3.15.1 + ScrollTrigger + DrawSVG (+ MorphSVG for the knot).
   - No pins. Short scrubs only where the motion explains something.
   - Reduced motion: everything is drawn and final, no movement.
   - No GSAP: paths are still drawn statically. No JS: content only.
   ========================================================================== */
(function () {
  'use strict';
  document.documentElement.classList.add('js');

  var gsap = window.gsap, ST = window.ScrollTrigger;
  var G = !!(gsap && ST);
  if (G) {
    gsap.registerPlugin(ST);
    if (window.DrawSVGPlugin) gsap.registerPlugin(window.DrawSVGPlugin);
    if (window.MorphSVGPlugin) gsap.registerPlugin(window.MorphSVGPlugin);
  }
  var DRAW = G && !!window.DrawSVGPlugin;
  var REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var MOTION = G && !REDUCE;
  var NS = 'http://www.w3.org/2000/svg';
  var R = 22; // corner radius of the line

  var spine = document.querySelector('.spine');
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- geometry helpers ---------- */
  function rel(el, box) {
    var a = el.getBoundingClientRect(), b = box.getBoundingClientRect();
    return { x: a.left - b.left, y: a.top - b.top, w: a.width, h: a.height, r: a.right - b.left, b: a.bottom - b.top, cx: a.left - b.left + a.width / 2, cy: a.top - b.top + a.height / 2 };
  }
  function sx(sec) { return spine.getBoundingClientRect().left - sec.getBoundingClientRect().left; }
  function fit(svg, box) { svg.setAttribute('viewBox', '0 0 ' + box.clientWidth + ' ' + box.clientHeight); }
  // down the spine, then turn horizontally toward x2 with a rounded corner
  function downThenAcross(x, y0, y, x2) {
    var dir = x2 < x ? -1 : 1, r = Math.min(R, Math.abs(y - y0), Math.abs(x2 - x));
    return 'M' + x + ' ' + y0 + ' V' + (y - r) + ' Q' + x + ' ' + y + ' ' + (x + dir * r) + ' ' + y + ' H' + x2;
  }
  function path(svg, cls) { var p = document.createElementNS(NS, 'path'); p.setAttribute('class', cls); svg.appendChild(p); return p; }
  function dot(svg, x, y, r) { var c = document.createElementNS(NS, 'circle'); c.setAttribute('class', 'route__dot'); c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', r || 6); svg.appendChild(c); return c; }
  function clear(svg, sel) { $$(sel, svg).forEach(function (n) { n.remove(); }); }

  /* ---------- section path builders (re-run on resize) ---------- */
  var B = {}, handoffEnd = 0;

  // Measured relative to #hero: once its pin has ended (or with no pin at all) the hero's bottom
  // meets the top of .pg, so hero-local y maps to .pg-local y as (y - hero.top - hero.height).
  B.handoff = function () {
    var pg = $('.pg'), p = $('.handoff__p', pg);
    var hero = document.getElementById('hero'), s5 = hero && $('.s5', hero);
    var anchor = s5 && $('.s5__anchor', s5), arrow = s5 && $('.s5__arrow', s5);
    handoffEnd = 0;
    if (!anchor || !arrow) { p.setAttribute('d', ''); return; }
    var h = hero.getBoundingClientRect(), base = pg.getBoundingClientRect();
    var Y = function (v) { return v - h.top - h.height; }, X = function (v) { return v - base.left; };
    // the arrow's tip (same maths as hero-a.js: the tip sits 20 viewBox units inside the 290-unit arrow box)
    var a = anchor.getBoundingClientRect(), cs = getComputedStyle(arrow), k = parseFloat(cs.width) / 290;
    var x = X(a.left) + parseFloat(cs.left) + 20 * k, y = Y(a.top) + parseFloat(cs.top) + 20 * k;
    // what the line must not cross on its way down: the assurance row, the rail, the second CTA
    var els = $$('.s5__assure span, .rail__item, .rail__cue', s5).concat($$('.ctas .ad-btn', s5).filter(function (el) { return !el.closest('.s5__primary'); }));
    var obs = els.map(function (el) { var r = el.getBoundingClientRect(); return { l: X(r.left), r: X(r.right), t: Y(r.top), w: r.width }; })
      .filter(function (o) { return o.w > 0 && o.t > y + 4; });
    var M = 14, hit = function (cx, o) { return cx > o.l - M && cx < o.r + M; };
    var d = 'M' + x + ' ' + y, cx = x;
    var col = obs.filter(function (o) { return hit(x, o); }).sort(function (m, n) { return m.t - n.t; });
    if (col.length) {
      var cands = [];
      col.forEach(function (o) { cands.push(o.l - M - 4, o.r + M + 4); });
      cands = cands.filter(function (c) { return !obs.some(function (o) { return hit(c, o); }); })
        .sort(function (m, n) { return Math.abs(m - x) - Math.abs(n - x); });
      if (cands.length && Math.abs(cands[0] - x) <= 72) { // step aside just above the first obstacle
        var L = Math.max(28, Math.abs(cands[0] - x) * 0.9), yj = Math.max(y + 8, col[0].t - L - 14);
        d += ' V' + yj + ' C' + x + ' ' + (yj + L / 2) + ' ' + cands[0] + ' ' + (yj + L / 2) + ' ' + cands[0] + ' ' + (yj + L);
        cx = cands[0];
      } else { // no clean gap (narrow screens): the line starts where the night ends, under the click
        d = 'M' + x + ' 0';
      }
    }
    // across the arc into paper, then turn to the spine
    var arcH = $('.arc', pg).offsetHeight, yt = arcH + 34, xs = sx(pg), dir = xs > cx ? 1 : -1;
    if (Math.abs(xs - cx) > 2 * R + 4) {
      d += ' V' + (yt - R) + ' Q' + cx + ' ' + yt + ' ' + (cx + dir * R) + ' ' + yt +
           ' H' + (xs - dir * R) + ' Q' + xs + ' ' + yt + ' ' + xs + ' ' + (yt + R);
      handoffEnd = yt + R;
    } else {
      d += ' V' + yt + ' C' + cx + ' ' + (yt + 36) + ' ' + xs + ' ' + (yt + 36) + ' ' + xs + ' ' + (yt + 72);
      handoffEnd = yt + 72;
    }
    p.setAttribute('d', d);
  };

  B.trust = function () {
    var sec = $('#trust'), svg = $('.route', sec); fit(svg, sec);
    var nums = $$('.fig b', sec), figs = $('.figs', sec);
    var yb = Math.max.apply(null, nums.map(function (n) { return rel(n, sec).b; })) - 8;
    var y0 = Math.max(0, handoffEnd - (sec.getBoundingClientRect().top - $('.pg').getBoundingClientRect().top));
    $('.route__p', svg).setAttribute('d', downThenAcross(sx(sec), y0, yb, rel(figs, sec).x - 8));
  };

  B.change = function () {
    var sec = $('#change'), svg = $('.route', sec); fit(svg, sec);
    var x = sx(sec), last = $$('.flip', sec).pop(), end = rel(last, sec).b + 20;
    sec.dataset.end = end;
    $('.route__p', svg).setAttribute('d', 'M' + x + ' 0 V' + end);
  };

  B.modules = function () {
    var sec = $('#modules'), svg = $('.route', sec); fit(svg, sec);
    var st = $$('.station', sec), list = $('.stations', sec), x = sx(sec);
    var g = $('.route__branches', svg); g.innerHTML = '';
    var r = st.map(function (s) { return rel(s, sec); });
    var oneCol = Math.abs(r[0].x - r[1].x) < 4;
    var d;
    if (oneCol) {
      d = 'M' + x + ' 0 V' + (r[r.length - 1].y + 22);
      r.forEach(function (q, i) { var p = path(g, 'route__branch'); p.setAttribute('d', 'M' + x + ' ' + (q.y + 22) + ' H' + (q.r + 6)); p.dataset.i = i; });
    } else {
      var row1 = Math.max(r[0].b, r[1].b, r[2].b), row2 = Math.min(r[3].y, r[4].y, r[5].y);
      var yt = (row1 + row2) / 2;
      d = downThenAcross(x, 0, yt, rel(list, sec).x - 10);
      r.forEach(function (q, i) {
        var bx = q.r + 12, p = path(g, 'route__branch');
        p.setAttribute('d', 'M' + bx + ' ' + yt + ' V' + (q.y + 22)); p.dataset.i = i;
        var c = dot(g, bx, yt, 5); c.dataset.i = i;
      });
    }
    $('.route__p', svg).setAttribute('d', d);
  };

  B.tour = function () {
    var sec = $('#tour'), svg = $('.route', sec); fit(svg, sec);
    $('.route__p', svg).setAttribute('d', 'M' + sx(sec) + ' 0 V' + rel($('.ask', sec), sec).cy);
  };

  B.channels = function () {
    var sec = $('#channels'), svg = $('.route', sec); fit(svg, sec);
    var x = sx(sec), web = rel($('.dev--web', sec), sec), cl = rel($('.dev--client', sec), sec), dr = rel($('.dev--driver', sec), sec);
    var top = Math.min(48, web.y - 24), wx = web.r - 40;
    var d = downThenAcross(x, 0, top, wx) + ' Q' + (wx - R) + ' ' + top + ' ' + (wx - R) + ' ' + (top + R) +
      ' V' + web.cy + ' C' + (wx - R) + ' ' + (web.cy + 120) + ' ' + cl.cx + ' ' + (cl.y - 60) + ' ' + cl.cx + ' ' + cl.cy +
      ' C' + cl.cx + ' ' + (cl.b + 40) + ' ' + dr.cx + ' ' + (dr.b + 40) + ' ' + dr.cx + ' ' + dr.cy;
    if (window.innerWidth <= 1100) d = 'M' + x + ' 0 V' + rel($('.devices', sec), sec).y;
    $('.route__p', svg).setAttribute('d', d);
  };

  B.safety = function () {
    var sec = $('#safety'), svg = $('.route', sec); fit(svg, sec); clear(svg, '.route__dot');
    var x = sx(sec), stops = $$('.onboard li', sec).map(function (l) { return rel(l, sec).y + 14; });
    $('.route__p', svg).setAttribute('d', 'M' + x + ' 0 V' + stops[stops.length - 1]);
    stops.forEach(function (y) { dot(svg, x, y, 7); });
  };

  B.start = function () {
    var sec = $('#start'), svg = $('.route', sec); fit(svg, sec);
    var ps = $$('.route__p', svg); while (ps.length < 4) ps.push(path(svg, 'route__p'));
    var x = sx(sec), head = rel($('.tracks__head', sec), sec), rows = $$('.tr', sec), last = rel(rows[rows.length - 1], sec);
    var ks = rel($('.tk--s', sec), sec), kb = rel($('.tk--b', sec), sec);
    var xs = ks.r - 12, xb = kb.r - 12, yh = head.b, yl = last.b, mx = (xs + xb) / 2, my = yl + 56;
    var form = rel($('.demo__f', sec), sec), btn = rel($('.demo__f .btn', sec), sec);
    ps[0].setAttribute('d', downThenAcross(x, 0, yh, xb));
    ps[1].setAttribute('d', 'M' + xs + ' ' + yh + ' V' + yl + ' C' + xs + ' ' + (yl + 40) + ' ' + mx + ' ' + (my - 20) + ' ' + mx + ' ' + my);
    ps[2].setAttribute('d', 'M' + xb + ' ' + yh + ' V' + yl + ' C' + xb + ' ' + (yl + 40) + ' ' + mx + ' ' + (my - 20) + ' ' + mx + ' ' + my);
    var stacked = form.y > yh + 40; // form below the table on small screens
    ps[3].setAttribute('d', stacked
      ? 'M' + mx + ' ' + my + ' V' + (form.y - 10)
      : 'M' + mx + ' ' + my + ' H' + (form.r + 40) + ' V' + btn.cy + ' H' + form.r);
  };

  function buildAll() { Object.keys(B).forEach(function (k) { try { B[k](); } catch (e) { /* layout not ready */ } }); }

  /* ---------- role tour ---------- */
  var ROLES = {
    mgmt: { want: 'أداء كل الفروع في شاشة واحدة', c: [
      ['مقارنة الفروع', 'إيرادات كل فرع ونصيبه من الشهر.'],
      ['المستحقات المتأخرة أولًا', '14 مطالبة تحتاج متابعة قبل أن تتراكم.'],
      ['عبء العمل على كل فريق', 'من يحتاج دعمًا اليوم، ومن أنجز أسبوعه.']] },
    ops: { want: 'كل عقد ومرحلته، وما تأخر منها', c: [
      ['مراحل الاستقدام', 'عدد العقود في كل مرحلة، من الطلب حتى الضمان.'],
      ['تنبيه قبل التأخير', 'العقد #1024 تأخر حجز تذكرته يومين.'],
      ['المتأخر بضغطة', 'فرز العقود المتأخرة والمستحقة اليوم.']] },
    fin: { want: 'الفواتير والتحصيل والمطالبات', c: [
      ['رمز QR على كل فاتورة', 'فاتورة تُنشأ من العقد مباشرة.'],
      ['المطالبات المستحقة', 'المتأخر منها يظهر أولًا.'],
      ['نسبة التحصيل', '88% من المفوتر هذا الشهر.']] },
    cs: { want: 'كل عميل وكل شكوى وكل رسالة', c: [
      ['سجل العميل', 'عقوده وآخر تواصل معه في ملف واحد.'],
      ['الشكاوى حسب حالتها', 'من الاستلام حتى الحل.'],
      ['حملات الرسائل', 'تذكير جماعي بموعد الوصول ونسبة الوصول.']] }
  };
  var tour = $('#tour'), stage = $('.stage', tour), frame = $('.frame', tour), leaders = $('.leaders', tour);
  var cStart = $('.callouts--start', tour), cEnd = $('.callouts--end', tour), cursor = $('.cursor', tour);
  var radios = $$('[role="radio"]', tour), want = $('.ask__want', tour), current = 'mgmt', cursorTl = null;
  function shot(role) { return $('.shot[data-role="' + role + '"]', frame); }

  function layoutCallouts(role, animate) {
    var s = shot(role), fr = frame.getBoundingClientRect(), mid = fr.left + fr.width / 2;
    var pins = $$('.pin', s).sort(function (x, y) { return (+x.textContent) - (+y.textContent); }); // numbered order, not DOM order
    cStart.innerHTML = ''; cEnd.innerHTML = ''; leaders.innerHTML = '';
    var made = ROLES[role].c.map(function (c, i) {
      var el = document.createElement('div'); el.className = 'callout';
      el.innerHTML = '<b><i>' + (i + 1) + '</i>' + c[0] + '</b><p>' + c[1] + '</p>';
      var pr = pins[i] ? pins[i].getBoundingClientRect() : fr;
      var px = pr.left + pr.width / 2;
      return { el: el, pin: pins[i], px: px, start: px > mid }; // RTL: the start column is on the right
    });
    // keep both sides in use: if every pin sits on one half, send the one nearest the centre across
    if (made.every(function (m) { return m.start; }) || made.every(function (m) { return !m.start; })) {
      var near = made.slice().sort(function (a, b) { return Math.abs(a.px - mid) - Math.abs(b.px - mid); })[0];
      near.start = !near.start;
    }
    made.forEach(function (m) { (m.start ? cStart : cEnd).appendChild(m.el); });
    if (getComputedStyle(leaders).display === 'none') return made;
    fit(leaders, stage);
    made.forEach(function (m) {
      if (!m.pin) return;
      var a = rel(m.el, stage), t = rel(m.pin.parentElement, stage);
      var px = m.start ? t.r - 10 : t.x + 10, py = t.y + Math.min(18, t.h / 2);
      m.pt = { x: px, y: py };
      var ax = m.start ? a.x : a.r, ay = a.cy, k = (px - ax) * 0.5;
      var pa = document.createElementNS(NS, 'path');
      pa.setAttribute('d', 'M' + ax + ' ' + ay + ' C' + (ax + k) + ' ' + ay + ' ' + (px - k) + ' ' + py + ' ' + px + ' ' + py);
      leaders.appendChild(pa);
      var c = document.createElementNS(NS, 'circle'); c.setAttribute('cx', px); c.setAttribute('cy', py); c.setAttribute('r', 5); leaders.appendChild(c);
      m.path = pa; m.dot = c;
    });
    if (animate && MOTION) {
      var tl = gsap.timeline();
      made.forEach(function (m, i) {
        tl.from(m.el, { opacity: 0, y: 12, duration: 0.35, ease: 'power2.out' }, 0.15 + i * 0.12);
        if (m.path && DRAW) tl.from(m.path, { drawSVG: 0, duration: 0.45, ease: 'power1.inOut' }, 0.3 + i * 0.12);
        if (m.dot) tl.from(m.dot, { scale: 0, transformOrigin: '50% 50%', duration: 0.2 }, 0.7 + i * 0.12);
      });
    }
    lastMade = made;
    return made;
  }

  var lastMade = [];
  function runCursor(role) {
    if (!MOTION || getComputedStyle(cursor).display === 'none') return;
    if (cursorTl) cursorTl.kill();
    var fr = rel(frame, stage);
    var pts = lastMade.filter(function (m) { return m.pt; }).map(function (m) { return { x: m.pt.x - fr.x - 2, y: m.pt.y - fr.y - 2 }; });
    cursorTl = gsap.timeline();
    cursorTl.set(cursor, { x: fr.width * 0.55, y: fr.height * 0.6, opacity: 0 })
      .to(cursor, { opacity: 1, duration: 0.2 });
    pts.forEach(function (p) { cursorTl.to(cursor, { x: p.x, y: p.y, duration: 0.6, ease: 'power2.inOut' }).to(cursor, { scale: 0.85, duration: 0.08, yoyo: true, repeat: 1 }).to({}, { duration: 0.35 }); });
    cursorTl.to(cursor, { opacity: 0, duration: 0.3 });
  }

  function selectRole(role, focus) {
    if (role === current && !focus) return;
    var from = shot(current), to = shot(role);
    radios.forEach(function (b) { var on = b.dataset.role === role; b.setAttribute('aria-checked', on); b.tabIndex = on ? 0 : -1; if (on && focus) b.focus(); });
    want.textContent = ROLES[role].want;
    current = role;
    if (MOTION && from !== to) {
      to.classList.add('is-on');
      gsap.fromTo(to, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: 'power1.out' });
      gsap.to(from, { opacity: 0, duration: 0.25, onComplete: function () { from.classList.remove('is-on'); gsap.set(from, { clearProps: 'opacity' }); } });
      gsap.fromTo(want, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.3 });
    } else { from.classList.remove('is-on'); to.classList.add('is-on'); }
    layoutCallouts(role, true);
    runCursor(role);
  }
  radios.forEach(function (b, i) {
    b.addEventListener('click', function () { selectRole(b.dataset.role, false); });
    b.addEventListener('keydown', function (e) {
      var n = radios.length, j = null, rtl = getComputedStyle(b).direction === 'rtl';
      if (e.key === (rtl ? 'ArrowLeft' : 'ArrowRight') || e.key === 'ArrowDown') j = (i + 1) % n;
      if (e.key === (rtl ? 'ArrowRight' : 'ArrowLeft') || e.key === 'ArrowUp') j = (i - 1 + n) % n;
      if (j !== null) { e.preventDefault(); selectRole(radios[j].dataset.role, true); }
    });
  });

  /* ---------- modules: hover/focus lights a branch ---------- */
  $$('.station').forEach(function (s, i) {
    function on(v) { s.classList.toggle('is-on', v); $$('.route__branch[data-i="' + i + '"]').forEach(function (b) { b.classList.toggle('is-on', v); }); }
    s.addEventListener('mouseenter', function () { on(true); }); s.addEventListener('mouseleave', function () { on(false); });
    s.addEventListener('focus', function () { on(true); }); s.addEventListener('blur', function () { on(false); });
  });

  /* ---------- demo form (UI only) ---------- */
  var form = $('.demo__f');
  if (form) form.addEventListener('submit', function (e) {
    e.preventDefault();
    var bad = $$('[required]', form).filter(function (f) { return !f.value.trim(); });
    $$('[required]', form).forEach(function (f) { f.setAttribute('aria-invalid', !f.value.trim()); });
    if (bad.length) { bad[0].focus(); return; }
    $('.demo__ok', form).hidden = false;
  });

  /* ---------- scroll animations ---------- */
  function counters() {
    $$('[data-count]').forEach(function (el) {
      var n = +el.dataset.count, pre = el.dataset.prefix || '', suf = el.dataset.suffix || '', o = { v: 0 };
      ST.create({ trigger: el, start: 'top 85%', once: true, onEnter: function () {
        gsap.to(o, { v: n, duration: 1.2, ease: 'power2.out', onUpdate: function () { el.textContent = pre + Math.round(o.v) + suf; } });
      } });
    });
    var w = $('.warranty b'), o2 = { v: 0 };
    if (w) ST.create({ trigger: w, start: 'top 85%', once: true, onEnter: function () { gsap.to(o2, { v: 365, duration: 1.4, ease: 'power2.out', onUpdate: function () { w.textContent = Math.round(o2.v); } }); } });
  }

  function drawOn(sec, targets, opts) {
    if (!DRAW) return;
    gsap.fromTo(targets, { drawSVG: 0 }, Object.assign({ drawSVG: '100%', ease: 'none', stagger: 0.15,
      scrollTrigger: { trigger: sec, start: 'top 75%', end: 'top 15%', scrub: 0.6, invalidateOnRefresh: true } }, opts || {}));
  }

  function animate() {
    counters();
    // the line leaves the click as the hero scrolls away (after its pin has ended), then the trust line takes over
    var ho = gsap.timeline({ scrollTrigger: { id: 'a-handoff', trigger: '.pg', start: 'top 95%', end: 'top 40%', scrub: 0.6, invalidateOnRefresh: true } })
      .fromTo('.handoff', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.04, ease: 'none' }, 0);
    if (DRAW) ho.fromTo('.handoff__p', { drawSVG: 0 }, { drawSVG: '100%', duration: 1, ease: 'none' }, 0);
    drawOn('#trust', '#trust .route__p');
    gsap.from('#trust .fig', { y: 24, opacity: 0, stagger: 0.1, duration: 0.6, ease: 'power2.out', scrollTrigger: { trigger: '#trust .figs', start: 'top 85%', once: true } });

    // before/after: the line runs down beside the rows; each row flips as the line reaches it,
    // and the knot is pulled straight by the same scroll progress
    var chg = $('#change'), knot = $('.knot__p', chg), straight = $('.knot__straight', chg), tags = $('.knot__tags', chg);
    var morph = window.MorphSVGPlugin ? gsap.to(knot, { morphSVG: straight, ease: 'none', paused: true }) : null;
    var rows = $$('.flip', chg);
    ST.create({ trigger: chg, start: 'top 55%', end: 'bottom 75%', scrub: 0.4, invalidateOnRefresh: true,
      onUpdate: function (self) {
        var p = self.progress;
        if (DRAW) gsap.set('#change .route__p', { drawSVG: '0% ' + (p * 100) + '%' });
        if (morph) morph.progress(gsap.utils.clamp(0, 1, (p - 0.1) / 0.75));
        knot.classList.toggle('is-straight', p > 0.82);
        gsap.set(tags, { opacity: 1 - Math.min(1, p * 1.4) });
        var lineY = p * (+chg.dataset.end || chg.clientHeight);
        rows.forEach(function (r) { r.classList.toggle('is-on', lineY >= rel(r, chg).y + r.offsetHeight * 0.45); });
      } });
    if (DRAW) gsap.set('#change .route__p', { drawSVG: 0 });

    drawOn('#modules', '#modules .route__p');
    if (DRAW) gsap.fromTo('#modules .route__branch', { drawSVG: 0 }, { drawSVG: '100%', stagger: 0.08, duration: 0.5, ease: 'power1.out', scrollTrigger: { trigger: '#modules .stations', start: 'top 70%', once: true } });
    gsap.from('#modules .station', { y: 20, opacity: 0, stagger: 0.08, duration: 0.5, ease: 'power2.out', scrollTrigger: { trigger: '#modules .stations', start: 'top 80%', once: true } });

    drawOn('#tour', '#tour .route__p');
    gsap.from('#tour .frame', { y: 40, opacity: 0, duration: 0.8, ease: 'power2.out', scrollTrigger: { trigger: '#tour .stage', start: 'top 85%', once: true, onEnter: function () { runCursor(current); } } });

    drawOn('#channels', '#channels .route__p');
    gsap.from('#channels .dev', { y: 60, opacity: 0, stagger: 0.12, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: '#channels .devices', start: 'top 80%', once: true } });
    if (DRAW) gsap.from('#channels .map__route', { drawSVG: 0, duration: 1, ease: 'power1.inOut', scrollTrigger: { trigger: '#channels .dev--driver', start: 'top 75%', once: true } });

    drawOn('#safety', '#safety .route__p');
    if (DRAW) gsap.fromTo('#safety .rings__g circle', { drawSVG: 0 }, { drawSVG: '100%', ease: 'none', stagger: 0.12,
      scrollTrigger: { trigger: '#safety .rings', start: 'top 80%', end: 'center 45%', scrub: 0.5 } });
    gsap.from('#safety .rings__n', { opacity: 0, scale: 0.6, transformOrigin: '50% 50%', stagger: 0.1, scrollTrigger: { trigger: '#safety .rings', start: 'top 80%', end: 'center 45%', scrub: 0.5 } });

    if (DRAW) gsap.fromTo('#start .route__p', { drawSVG: 0 }, { drawSVG: '100%', ease: 'none', stagger: 0.25,
      scrollTrigger: { trigger: '#start .tracks', start: 'top 70%', end: 'bottom 55%', scrub: 0.6, invalidateOnRefresh: true } });
  }

  /* ---------- boot ---------- */
  function boot() {
    var first = $('.shot', frame); if (first) first.classList.add('is-on');
    buildAll();
    layoutCallouts(current, false);
    if (MOTION) animate();
    else if (G) { $$('.flip').forEach(function (r) { r.classList.add('is-on'); }); if (window.MorphSVGPlugin) gsap.set('.knot__p', { morphSVG: '.knot__straight' }); $('.knot__p').classList.add('is-straight'); }
    else { $$('.flip').forEach(function (r) { r.classList.add('is-on'); }); }
    var t;
    window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(function () { buildAll(); layoutCallouts(current, false); if (G) ST.refresh(); }, 160); });
    review();
  }
  // Review aid: ?go=<section id> scrolls there after boot; ?role=ops picks a role.
  function review() {
    var q = new URLSearchParams(location.search), go = q.get('go'), role = q.get('role');
    if (role && ROLES[role]) selectRole(role, false);
    if (go && document.getElementById(go)) {
      var el = document.getElementById(go);
      document.documentElement.style.scrollBehavior = 'auto';
      window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - (+q.get('off') || 0));
      if (G) {
        var pg = $('.pg');
        ST.update();
        ST.getAll().forEach(function (s) {
          if (!(s.vars.id === 'a-handoff' || (s.trigger && pg.contains(s.trigger)))) return; // never touch the hero's timelines
          var tw = s.getTween && s.getTween(); if (tw) tw.progress(1); else if (s.animation) s.animation.progress(1);
        });
      }
    }
  }
  // Boot now (scripts are deferred, so the DOM is ready); re-measure once web fonts settle.
  // The hero re-measures on refreshInit; rebuild ours right after it, before tweens re-measure.
  if (G) ST.addEventListener('refreshInit', buildAll);
  boot();
  function relayout() { buildAll(); layoutCallouts(current, false); if (G) ST.refresh(); review(); }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);
  window.addEventListener('load', relayout);
})();
