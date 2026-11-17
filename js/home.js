/* ==========================================================================
   ClickERP prototype · Homepage sections after the final hero (V4)
   - Runs after js/hero-v4.js (read-only); uses the same GSAP 3.15.1 + plugins
   - No pinning, no scrubbing: each section has ONE one-time, meaningful motion
   - Content is complete without JS and under reduced motion (final values in HTML)
   - Arabic text is never split or animated by letters
   QA (prototype only): ?qa=<section>[&p=0..1][&ctx=<px>] renders one section alone
   ========================================================================== */
(function () {
  'use strict';

  var params = new URLSearchParams(location.search);
  var doc = document.documentElement;
  var RTL = doc.dir === 'rtl';
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var hasGsap = !!(window.gsap && window.ScrollTrigger);
  if (hasGsap) gsap.registerPlugin(ScrollTrigger, window.DrawSVGPlugin);

  /* ======================================================================
     §1 TRUST · the thread (green line from scene 5) becomes the measuring line
     ====================================================================== */
  var trust = $('[data-section="trust"]');
  var T = trust && {
    sec: trust,
    path: $('.h-thread__path', trust),
    end: $('.h-thread__end', trust),
    ring: $('.h-thread__ring', trust),
    fig: $('[data-trust-hero]', trust),
    base: $('.h-fig__base', trust),
    num: $('.h-fig__num', trust),
    ticks: $$('.h-fig__ticks i', trust),
    rules: $$('.h-ledger__rule', trust),
    counts: $$('.h-ledger [data-count]', trust),
    geo: null, played: false, tl: null
  };

  /* Measure the cradle: drop at the figure's inline-start edge, turn, run under the numeral */
  function layoutThread() {
    if (!T || !T.fig.getClientRects().length) return; // not rendered (hidden): nothing to measure
    var sr = T.sec.getBoundingClientRect(), fr = T.fig.getBoundingClientRect(), br = T.base.getBoundingClientRect();
    var wide = window.matchMedia('(min-width: 1024px)').matches;
    var dir = RTL ? -1 : 1;
    var xs = (RTL ? fr.right : fr.left) - sr.left;           // vertical drop
    var xe = (RTL ? br.left : br.right) - sr.left;           // end of the baseline
    var yb = br.top - sr.top + 1.25;                          // baseline centre
    var y0 = wide ? 0 : Math.max(0, fr.top - sr.top - 28);    // desktop: continues from scene 5 above
    var r = Math.min(28, (yb - y0) / 2);
    T.path.setAttribute('d', 'M' + xs + ' ' + y0 + ' V' + (yb - r) + ' Q' + xs + ' ' + yb + ' ' + (xs + dir * r) + ' ' + yb + ' H' + xe);
    [T.end, T.ring].forEach(function (c) { c.setAttribute('cx', xe); c.setAttribute('cy', yb); });
    var fade = T.sec.querySelector('#h-thread-fade');
    if (fade) { fade.setAttribute('y1', y0); fade.setAttribute('y2', y0 + Math.min(180, (yb - y0) * .4)); }
    var vLen = (yb - r - y0) + r * 1.57, hLen = Math.abs(xs + dir * r - xe);
    T.geo = { vFrac: vLen / (vLen + hLen), hStart: xs + dir * r, hLen: hLen, dir: dir,
      tickAt: T.ticks.map(function (t) { var tr = t.getBoundingClientRect(); var x = tr.left + tr.width / 2 - sr.left; return Math.min(1, Math.max(0, (x - (xs + dir * r)) * dir / hLen)); }) };
    T.len = T.path.getTotalLength();
    T.sec.classList.add('has-thread');
  }

  /* Own dash drawing (not DrawSVG): the gap is longer than the path, so no sliver can appear at the far end mid-draw */
  function drawTo(f) { T.drawn = f; T.path.style.strokeDasharray = (T.len * f).toFixed(2) + 'px ' + (T.len + 40).toFixed(2) + 'px'; T.path.style.strokeDashoffset = '0'; }

  function setTrustStart() {
    drawTo(0);
    gsap.set([T.end, T.ring], { scale: 0, transformOrigin: '50% 50%' });
    gsap.set(T.ticks, { scaleY: 0 });
    gsap.set(T.rules, { scaleX: 0 });
    T.num.textContent = '0';
    T.counts.forEach(function (el) { el.textContent = '0' + (el.dataset.suffix || ''); });
  }

  /* One timeline: drop (0.7 s) → run under the figure (1.1 s): each tick = one company, the numeral counts with the ticks */
  function buildTrust() {
    var g = T.geo, total = parseInt(T.num.dataset.count, 10), n = T.ticks.length;
    var DROP = .7, RUN = 1.1;
    var d = { f: 0 }, upd = function () { drawTo(d.f); };
    var tl = gsap.timeline({ paused: true, onComplete: function () { T.path.style.strokeDasharray = ''; T.path.style.strokeDashoffset = ''; } });
    tl.fromTo(d, { f: 0 }, { f: g.vFrac, duration: DROP, ease: 'power1.in', onUpdate: upd, immediateRender: false }, 0)
      .to(d, { f: 1, duration: RUN, ease: 'none', onUpdate: upd }, DROP);
    T.ticks.forEach(function (tick, i) {
      var at = DROP + g.tickAt[i] * RUN;
      tl.to(tick, { scaleY: 1, duration: .22, ease: 'back.out(3)' }, at)
        .call(function () { T.num.textContent = String(Math.round((i + 1) / n * total)); }, null, at);
    });
    tl.call(function () { T.num.textContent = String(total); }, null, DROP + RUN)
      .to([T.end, T.ring], { scale: 1, duration: .35, ease: 'back.out(2)', stagger: .08 }, DROP + RUN - .05);
    /* Ledger: rules draw from the inline start, figures count once */
    T.rules.forEach(function (rule, i) {
      var el = T.counts[i], to = parseInt(el.dataset.count, 10), sfx = el.dataset.suffix || '', o = { v: 0 };
      var at = .35 + i * .2;
      tl.to(rule, { scaleX: 1, duration: .7, ease: 'power2.out' }, at)
        .to(o, { v: to, duration: 1.1, ease: 'power1.out', onUpdate: function () { el.textContent = Math.round(o.v) + sfx; } }, at + .1);
    });
    return tl;
  }

  if (T) {
    layoutThread(); // static thread is drawn even without GSAP / with reduced motion
    /* Re-measure whenever the section or the figure changes size (fonts, scrollbar, resize) */
    var raf = 0;
    var relayout = function () { cancelAnimationFrame(raf); raf = requestAnimationFrame(function () {
      layoutThread();
      if (T.motion && !T.played) drawTo(0);
    }); };
    if (window.ResizeObserver) { var ro = new ResizeObserver(relayout); ro.observe(T.sec); ro.observe(T.fig); }
    else window.addEventListener('resize', relayout);
  }

  /* ======================================================================
     §2 BEFORE / AFTER · the spine passes each row: the old way is struck
     through and linked to the new one. Scrubbed to reading pace, never pinned.
     Text is never hidden: only strikes, links, dots and checks move.
     ====================================================================== */
  var baSec = $('[data-section="before-after"]');
  var B = baSec && {
    sec: baSec, board: $('.h-ba__board', baSec), spine: $('.h-ba__spine', baSec),
    gLinks: $('.h-ba__links', baSec), gDots: $('.h-ba__dots', baSec),
    rows: $$('.h-ba__row', baSec), links: [], dots: [], p: 1, geo: null
  };
  var SVGNS = 'http://www.w3.org/2000/svg';
  var dash = function (el, len, f) { el.style.strokeDasharray = (len * f).toFixed(2) + 'px ' + (len + 40).toFixed(2) + 'px'; el.style.strokeDashoffset = '0'; };
  var undash = function (el) { el.style.strokeDasharray = ''; el.style.strokeDashoffset = ''; };

  function layoutBA() {
    if (!B || !B.board.getClientRects().length) return; // not rendered (hidden): nothing to measure
    var br = B.board.getBoundingClientRect();
    var wide = window.matchMedia('(min-width: 768px)').matches;
    var r0 = B.rows[0];
    var xs;
    if (wide) { // centre of the gap between the two columns
      var a0 = $('.h-ba__after', r0).getBoundingClientRect(), b0 = $('.h-ba__before', r0).getBoundingClientRect();
      xs = (RTL ? (a0.right + b0.left) / 2 : (a0.left + b0.right) / 2) - br.left;
    } else {    // inside the rows' inline-start padding
      var rr0 = r0.getBoundingClientRect();
      xs = (RTL ? rr0.right - 9 : rr0.left + 9) - br.left;
    }
    var rows = B.rows.map(function (row) {
      var rr = row.getBoundingClientRect(), aft = $('.h-ba__after', row).getBoundingClientRect();
      var rects = $('.h-ba__was', row).getClientRects(), lr = rects[rects.length - 1];
      return {
        y: (wide ? rr.top + rr.height / 2 : aft.top + aft.height / 2) - br.top,
        xb: (RTL ? lr.left - 14 : lr.right + 14) - br.left,   // just after the struck text
        xa: (RTL ? aft.right + 8 : aft.left - 8) - br.left    // just before the new way
      };
    });
    var y0 = (wide ? $('.h-ba__rows', B.board).getBoundingClientRect().top : r0.getBoundingClientRect().top) - br.top;
    var y1 = rows[rows.length - 1].y;
    B.spine.setAttribute('d', 'M' + xs + ' ' + y0 + ' V' + y1);
    rows.forEach(function (r, i) {
      if (!B.links[i]) {
        B.links[i] = document.createElementNS(SVGNS, 'path'); B.links[i].setAttribute('class', 'h-ba__link'); B.gLinks.appendChild(B.links[i]);
        B.dots[i] = document.createElementNS(SVGNS, 'circle'); B.dots[i].setAttribute('class', 'h-ba__dot'); B.dots[i].setAttribute('r', '5'); B.gDots.appendChild(B.dots[i]);
        B.dots[i].style.transformBox = 'fill-box'; B.dots[i].style.transformOrigin = '50% 50%';
      }
      B.links[i].setAttribute('d', wide ? 'M' + r.xb + ' ' + r.y + ' H' + r.xa : 'M0 0');
      B.links[i].style.display = wide ? '' : 'none';
      B.dots[i].setAttribute('cx', xs); B.dots[i].setAttribute('cy', r.y);
      r.len = wide ? Math.abs(r.xb - r.xa) : 0;
    });
    B.geo = { y0: y0, y1: y1, rows: rows, spineLen: Math.max(1, y1 - y0) };
    B.sec.classList.add('has-spine');
  }

  /* p 0..1 → the spine tip moves down; each row converts as the tip reaches it */
  var mixAfter = hasGsap ? gsap.utils.interpolate('#6D788C', '#1B2740') : null;
  function renderBA(p) {
    if (!B || !B.geo) return;
    B.p = p;
    var g = B.geo, tip = g.y0 + (g.y1 - g.y0 + 48) * p;
    if (p >= 1) undash(B.spine); else dash(B.spine, g.spineLen, Math.min(1, Math.max(0, (tip - g.y0) / g.spineLen)));
    g.rows.forEach(function (r, i) {
      var q = Math.min(1, Math.max(0, (tip - r.y + 8) / 44));
      var row = B.rows[i];
      $('.h-ba__was', row).style.setProperty('--s', q.toFixed(3));
      if (r.len) { if (q >= 1) undash(B.links[i]); else dash(B.links[i], r.len, q); }
      B.dots[i].style.transform = q >= 1 ? '' : 'scale(' + Math.max(.0001, q) + ')';
      $('.h-ba__check', row).style.transform = q >= 1 ? '' : 'scale(' + (.0001 + q) + ')';
      $('.h-ba__after', row).style.color = (q >= 1 || !mixAfter) ? '' : mixAfter(q);
    });
  }

  if (B) {
    layoutBA(); renderBA(1); // static final state without GSAP / with reduced motion
    var rafB = 0;
    var relayoutB = function () { cancelAnimationFrame(rafB); rafB = requestAnimationFrame(function () { layoutBA(); renderBA(B.p); }); };
    if (window.ResizeObserver) new ResizeObserver(relayoutB).observe(B.board);
    else window.addEventListener('resize', relayoutB);
  }

  /* ======================================================================
     §3 MODULES · «مبنى شركتك»: six floors, one window per module
     Build (once, on enter): floors stack from the ground up → the green riser
     climbs and each floor's windows light as it passes → the lift stops at the
     open floor and a line connects it to the building directory.
     Choosing a floor (click / Enter / ↑ ↓): the floor slides out like a drawer,
     the lift travels to it, the directory shows its modules.
     ====================================================================== */
  var modSec = $('[data-section="modules"]');
  var BL = modSec && {
    sec: modSec, tower: $('.h-tower', modSec), list: $('.h-bld__floors', modSec), riser: $('.h-tower__riser', modSec),
    link: $('.h-tower__link', modSec), car: $('.h-tower__car', modSec), floors: $$('.h-floor', modSec),
    dirs: $$('.h-dir__floor', modSec), dirWrap: $('.h-dir__floors', modSec), cur: 1, geo: null, motion: false, tl: null, built: true, linkLen: 0
  };
  var towerWide = function () { return window.matchMedia('(min-width: 1024px)').matches; };

  function layoutTower() {
    if (!BL || !BL.tower.getClientRects().length) return;
    var tr = BL.tower.getBoundingClientRect(), lr = BL.list.getBoundingClientRect();
    var lobby = $('.h-bld__lobby', modSec).getBoundingClientRect(), roof = $('.h-bld__roof', modSec).getBoundingClientRect();
    var xr = (RTL ? lr.right + 22 : lr.left - 22) - tr.left;
    var y0 = lobby.top + lobby.height / 2 - tr.top, y1 = roof.top - tr.top;
    BL.riser.setAttribute('d', 'M' + xr + ' ' + y0 + ' V' + y1);
    var fy = BL.floors.map(function (f) { var li = f.parentNode, op = li.offsetParent; return (op ? op.getBoundingClientRect().top : lr.top) - tr.top + li.offsetTop + li.offsetHeight / 2; }); // transform-free (the build animates the buttons, not the <li>)
    BL.geo = { tr: tr, xr: xr, y0: y0, y1: y1, len: Math.max(1, y0 - y1), fy: fy,
      f: fy.map(function (y) { return (y0 - y) / Math.max(1, y0 - y1); }) };
    BL.car.setAttribute('cx', xr);
    if (!(BL.motion && hasGsap && gsap.isTweening(BL.car))) BL.car.setAttribute('cy', fy[BL.cur - 1]);
    drawLink(false);
    BL.tower.classList.add('is-ready');
  }
  function drawLink(animate) {
    if (!BL || !BL.geo) return;
    if (!towerWide()) { BL.link.setAttribute('d', ''); return; }
    var g = BL.geo, tr = BL.tower.getBoundingClientRect(), dw = BL.dirWrap.getBoundingClientRect();
    var title = $('.h-dir__title', BL.dirs[BL.cur - 1]); if (!title || !title.getClientRects().length) return;
    var t = title.getBoundingClientRect(), y = g.fy[BL.cur - 1], ty = t.top + t.height / 2 - tr.top;
    var xd = (RTL ? dw.left - 18 : dw.right + 18) - tr.left, xm = (g.xr + xd) / 2, r = Math.min(12, Math.abs(ty - y) / 2), sy = ty > y ? 1 : -1, sx = xd > g.xr ? 1 : -1;
    var d = Math.abs(ty - y) < 2 ? 'M' + g.xr + ' ' + y + ' H' + xd
      : 'M' + g.xr + ' ' + y + ' H' + (xm - sx * r) + ' Q' + xm + ' ' + y + ' ' + xm + ' ' + (y + sy * r) + ' V' + (ty - sy * r) + ' Q' + xm + ' ' + ty + ' ' + (xm + sx * r) + ' ' + ty + ' H' + xd;
    BL.link.setAttribute('d', d);
    BL.linkLen = BL.link.getTotalLength();
    if (animate && hasGsap && BL.motion) {
      var o = { f: 0 }; dash(BL.link, BL.linkLen, 0);
      gsap.to(o, { f: 1, duration: .45, ease: 'power2.out', onUpdate: function () { dash(BL.link, BL.linkLen, o.f); }, onComplete: function () { undash(BL.link); } });
    } else undash(BL.link);
  }
  function litUpTo(f) { BL.floors.forEach(function (fl, k) { fl.classList.toggle('is-dark', f < BL.geo.f[k] - .02); }); }
  function setFloor(n, animate) {
    if (!BL || n < 1 || n > BL.floors.length) return;
    if (BL.tl && BL.tl.progress() < 1) BL.tl.progress(1);
    var changed = n !== BL.cur; BL.cur = n;
    BL.floors.forEach(function (f, k) { f.setAttribute('aria-pressed', String(k === n - 1)); });
    BL.dirs.forEach(function (d) { d.hidden = +d.getAttribute('data-floor') !== n; });
    var dir = BL.dirs[n - 1], y = BL.geo ? BL.geo.fy[n - 1] : 0;
    if (animate && hasGsap && BL.motion && changed) {
      gsap.fromTo(dir.children, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .35, ease: 'power2.out', stagger: .05, clearProps: 'opacity,transform' });
      BL.link.setAttribute('d', '');
      gsap.to(BL.car, { attr: { cy: y }, duration: .55, ease: 'power2.inOut', onComplete: function () { drawLink(true); } });
    } else { BL.car.setAttribute('cy', y); drawLink(false); }
    if (animate && !towerWide()) { // phones: bring the directory into view if it is below the fold
      var r = BL.dirWrap.getBoundingClientRect();
      if (r.top > window.innerHeight * .75) BL.dirWrap.scrollIntoView({ block: 'nearest', behavior: BL.motion ? 'smooth' : 'auto' });
    }
  }
  function buildTower() {
    if (!BL.geo) layoutTower();
    var g = BL.geo, o = { f: 0 }, fl = BL.floors, n = fl.length, dir = BL.dirs[BL.cur - 1];
    BL.built = false; litUpTo(0); dash(BL.riser, g.len, 0); BL.link.setAttribute('d', '');
    return gsap.timeline({ paused: true, onComplete: function () { BL.built = true; undash(BL.riser); litUpTo(1); } })
      .fromTo($('.h-bld__lobby', modSec), { opacity: 0 }, { opacity: 1, duration: .3 }, 0)
      .fromTo(fl, { opacity: 0, y: -42 }, { opacity: 1, y: 0, duration: .45, ease: 'power3.out', stagger: .12, clearProps: 'transform,opacity' }, .1)
      .fromTo([$('.h-bld__roof', modSec), $('.h-bld__sign', modSec)], { opacity: 0, y: -28 }, { opacity: 1, y: 0, duration: .45, ease: 'power3.out', stagger: .1, clearProps: 'transform,opacity' }, .1 + n * .12)
      .fromTo(o, { f: 0 }, { f: 1, duration: 1, ease: 'none', onUpdate: function () { dash(BL.riser, g.len, o.f); litUpTo(o.f); } }, 1.1)
      .fromTo(BL.car, { attr: { r: 0 } }, { attr: { r: 7 }, duration: .3, ease: 'back.out(3)' }, 2.1)
      .add(function () { drawLink(true); }, 2.2)
      .fromTo(dir.children, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .4, ease: 'power2.out', stagger: .06, clearProps: 'opacity,transform' }, 2.25);
  }
  function finalTower() {
    if (!BL) return;
    BL.built = true; litUpTo(1); undash(BL.riser);
    if (hasGsap) gsap.set(BL.car, { attr: { r: 7 } });
    layoutTower();
  }

  if (BL) {
    BL.dirs.forEach(function (d) { d.hidden = +d.getAttribute('data-floor') !== BL.cur; });
    layoutTower();
    BL.floors.forEach(function (f, k) {
      f.addEventListener('click', function () { setFloor(k + 1, true); });
      f.addEventListener('keydown', function (e) { // ↑ goes up a floor, ↓ goes down (floors are stacked bottom → top)
        var to = e.key === 'ArrowUp' ? k + 2 : e.key === 'ArrowDown' ? k : 0;
        if (to >= 1 && to <= BL.floors.length) { e.preventDefault(); BL.floors[to - 1].focus(); setFloor(to, true); }
      });
    });
    var rafB2 = 0;
    if (window.ResizeObserver) new ResizeObserver(function () { cancelAnimationFrame(rafB2); rafB2 = requestAnimationFrame(layoutTower); }).observe(BL.tower);
    else window.addEventListener('resize', layoutTower);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layoutTower);
  }

  /* ======================================================================
     §4 TOUR · guided discovery in one shared product frame
     User-triggered changes (≤ 0.45 s); no pin; text content lives in the guide
     ====================================================================== */
  var ROLES = {
    owner:   { name: 'مالك المكتب', title: 'لوحة الإدارة', line: 'صورة كاملة عن أداء الشركة وفروعها، دون انتظار التقارير.',
               pts: ['مؤشرات الشهر: الإيرادات والعقود ومدة الإنجاز', 'مقارنة أداء الفروع في شاشة واحدة', 'تنبيهات بما يحتاج قرارك اليوم'] },
    ops:     { name: 'موظف العمليات', title: 'العقود', line: 'كل عقد في مرحلته، وما يجب إنجازه اليوم أولًا.',
               pts: ['مراحل العقد من الطلب حتى الوصول', 'العقود المتأخرة تظهر في الأعلى', 'مهام اليوم لكل موظف'] },
    finance: { name: 'المحاسب', title: 'المالية', line: 'الفواتير والمطالبات والمستحقات في مكان واحد.',
               pts: ['ملخص فواتير الشهر والمحصّل', 'فواتير العقود وحالة كل فاتورة', 'الفوترة الإلكترونية من داخل النظام'] },
    cs:      { name: 'خدمة العملاء', title: 'العملاء', line: 'ملف كل عميل وطلباته ورسائله، فلا يضيع طلب.',
               pts: ['ملف العميل وطلباته ومرحلة كل طلب', 'الشكاوى ومتابعتها حتى الإغلاق', 'رسائل وتنبيهات للعميل'] }
  };
  var ORDER = ['owner', 'ops', 'finance', 'cs'];
  var tourSec = $('[data-section="tour"]');
  var TR = tourSec && {
    sec: tourSec, scaler: $('.h-frame__scaler', tourSec), app: $('.h-app', tourSec), main: $('.h-app__main', tourSec),
    hl: $('.h-app__hl', tourSec), chips: $$('.h-guide__chip', tourSec), marks: $$('.h-mark', tourSec),
    card: $('.h-guide__card', tourSec), role: 'owner', s: 1, motion: false
  };
  var tq = function (k) { return $('[data-tour="' + k + '"]', tourSec); };

  function scaleTour() {
    if (!TR || !TR.scaler.getClientRects().length) return;
    var W = parseFloat(getComputedStyle(TR.app).getPropertyValue('--W')) || 1040; // 850 on phones (no sidebar)
    TR.s = Math.min(1, TR.scaler.clientWidth / W);
    TR.scaler.style.setProperty('--s', TR.s.toFixed(4));
    placeMarks(false); placeHl(false);
  }
  function currentView() { return $('.h-view[data-view="' + TR.role + '"]', TR.app); }
  function placeMarks(animate) {
    var view = currentView(); if (!view || !TR.s) return;
    var mr = TR.main.getBoundingClientRect();
    TR.marks.forEach(function (m, i) {
      var t = $('[data-mark-at="' + (i + 1) + '"]', view); if (!t) return;
      var r = t.getBoundingClientRect();
      var x = ((RTL ? r.right : r.left) - mr.left) / TR.s - 15, y = (r.top - mr.top) / TR.s - 15;
      if (animate && hasGsap && TR.motion) gsap.to(m, { x: x, y: y, duration: .42, ease: 'power3.out', delay: i * .05 });
      else if (hasGsap) gsap.set(m, { x: x, y: y }); else m.style.transform = 'translate(' + x + 'px,' + y + 'px)';
    });
  }
  function placeHl(animate) {
    var li = $('.h-app__menu li[data-menu="' + TR.role + '"]', TR.app); if (!li) return;
    $$('.h-app__menu li', TR.app).forEach(function (n) { n.classList.toggle('is-on', n === li); });
    var y = li.offsetTop + (li.offsetParent && li.offsetParent !== TR.hl.offsetParent ? li.offsetParent.offsetTop : 0); // li sits in the positioned menu
    if (animate && hasGsap && TR.motion) gsap.to(TR.hl, { y: y, duration: .42, ease: 'power3.out' });
    else if (hasGsap) gsap.set(TR.hl, { y: y }); else TR.hl.style.transform = 'translateY(' + y + 'px)';
  }
  function fillGuide(role) {
    var d = ROLES[role], i = ORDER.indexOf(role), nx = ROLES[ORDER[(i + 1) % ORDER.length]];
    tq('step').textContent = '0' + (i + 1);
    tq('role').textContent = d.name;
    tq('line').textContent = d.line;
    tq('next-name').textContent = nx.name;
    $$('li', tq('points')).forEach(function (li, k) { li.lastChild.textContent = d.pts[k]; });
    $('[data-app="title"]', TR.app).textContent = d.title;
    $('[data-app="user"]', TR.app).textContent = d.name;
    TR.chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c.dataset.role === role)); });
  }
  function setRole(role, animate) {
    if (!TR || role === TR.role && animate) return;
    if (TR.tl) { TR.tl.progress(1); TR.tl = null; } // finish any switch in progress first (no double views)
    var from = currentView();
    TR.role = role;
    var to = currentView();
    fillGuide(role);
    var swap = function () { $$('.h-view', TR.app).forEach(function (v) { v.hidden = v.dataset.view !== TR.role; }); placeMarks(animate); };
    placeHl(animate);
    if (animate && hasGsap && TR.motion && from && from !== to) {
      TR.tl = gsap.timeline({ onComplete: function () { TR.tl = null; } })
        .to(from, { autoAlpha: 0, y: -6, duration: .16, ease: 'power1.in' })
        .add(function () { gsap.set(from, { clearProps: 'all' }); swap(); })
        .fromTo(to.children, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: .3, ease: 'power2.out', stagger: .04, clearProps: 'all' })
        .fromTo(TR.card, { autoAlpha: .2 }, { autoAlpha: 1, duration: .25 }, .1);
    } else swap();
  }
  function hot(k, on) {
    var view = currentView(), t = view && $('[data-mark-at="' + k + '"]', view);
    var li = $('[data-point="' + k + '"]', tourSec), m = TR.marks[k - 1];
    if (li) li.classList.toggle('is-hot', on); if (m) m.classList.toggle('is-hot', on); if (t) t.classList.toggle('is-target', on);
  }

  if (TR) {
    TR.chips.forEach(function (c) { c.addEventListener('click', function () { setRole(c.dataset.role, true); }); });
    tq('next').addEventListener('click', function () { setRole(ORDER[(ORDER.indexOf(TR.role) + 1) % ORDER.length], true); });
    $$('[data-point]', tourSec).forEach(function (li) {
      var k = +li.dataset.point;
      li.addEventListener('mouseenter', function () { hot(k, true); }); li.addEventListener('mouseleave', function () { hot(k, false); });
    });
    TR.marks.forEach(function (m, i) {
      m.addEventListener('mouseenter', function () { hot(i + 1, true); }); m.addEventListener('mouseleave', function () { hot(i + 1, false); });
    });
    scaleTour(); TR.sec.classList.add('is-ready');
    var rafT = 0;
    if (window.ResizeObserver) new ResizeObserver(function () { cancelAnimationFrame(rafT); rafT = requestAnimationFrame(scaleTour); }).observe(TR.scaler);
    else window.addEventListener('resize', scaleTour);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(scaleTour);
  }

  /* ======================================================================
     §5 CHANNELS · layered device reveal; the drivers' route is the thread
     ====================================================================== */
  var chSec = $('[data-section="channels"]');
  var CH = chSec && { sec: chSec, stage: $('.h-ch__stage', chSec), devs: $$('[data-dev]', chSec), nums: $$('.h-dev__n', chSec),
    route: $('.h-route', chSec), van: $('.h-van', chSec), tl: null };
  var VAN_AT = .72; // final state: the van is on its way
  function scaleCh() {
    if (!CH || !CH.stage.getClientRects().length) return;
    CH.stage.style.setProperty('--s', Math.min(1, CH.stage.clientWidth / 760).toFixed(4));
  }
  function routeAt(f) {
    var len = CH.route.getTotalLength(), pt = CH.route.getPointAtLength(len * Math.min(f, VAN_AT));
    dash(CH.route, len, f); if (f >= 1) undash(CH.route);
    CH.van.setAttribute('cx', pt.x.toFixed(2)); CH.van.setAttribute('cy', pt.y.toFixed(2));
  }
  function buildCh() {
    var o = { f: 0 };
    return gsap.timeline({ paused: true })
      .fromTo(CH.devs[0], { y: 36, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .7, ease: 'power3.out' }, 0)
      .fromTo(CH.devs[1], { y: 60, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .7, ease: 'power3.out' }, .14)
      .fromTo(CH.devs[2], { y: 60, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .7, ease: 'power3.out' }, .28)
      .fromTo(CH.nums, { scale: 0 }, { scale: 1, duration: .3, ease: 'back.out(2.4)', stagger: .1 }, .8)
      .fromTo(o, { f: 0 }, { f: 1, duration: 1.5, ease: 'power1.inOut', onUpdate: function () { routeAt(o.f); } }, .75);
  }
  if (CH) {
    scaleCh(); routeAt(1);
    if (window.ResizeObserver) new ResizeObserver(scaleCh).observe(CH.stage); else window.addEventListener('resize', scaleCh);
  }

  /* ======================================================================
     §5b WORKS · showroom stage: choosing a project shuffles the 3D deck and
     the stage takes that client's colours. User-driven only (no autoplay):
     list, arrows, ← → keys, a click on a card, or a swipe on the deck.
     ====================================================================== */
  var wkSec = $('[data-section="works"]');
  var WK = wkSec && { sec: wkSec, stage: $('[data-works]', wkSec), btns: $$('.h-work', wkSec), cards: $$('.h-deck__card', wkSec), deck: $('.h-deck', wkSec), cur: 0, motion: false, intro: null };
  var SLOTS = [{ x: 0, y: 0, s: 1, r: 0, b: 1 }, { x: 56, y: -26, s: .9, r: 4, b: .78 }, { x: 104, y: -48, s: .8, r: 8, b: .6 }, { x: 146, y: -68, s: .7, r: 12, b: .45 }];
  function slotVars(k) {
    var S = SLOTS[Math.min(k, SLOTS.length - 1)], m = window.matchMedia('(min-width: 1024px)').matches ? 1 : .62, sx = RTL ? -1 : 1;
    return { xPercent: -50, yPercent: -50, x: S.x * sx * m, y: S.y * m, scale: S.s, rotation: S.r * sx, zIndex: 10 - k, filter: 'brightness(' + S.b + ')' };
  }
  function setCard(c, v) {
    if (hasGsap) { gsap.set(c, v); return; }
    c.style.transform = 'translate(-50%,-50%) translate(' + v.x + 'px,' + v.y + 'px) scale(' + v.scale + ') rotate(' + v.rotation + 'deg)';
    c.style.zIndex = v.zIndex; c.style.filter = v.filter;
  }
  function applyDeck(animate, prevFront) {
    var n = WK.cards.length;
    WK.cards.forEach(function (c, j) {
      var k = (j - WK.cur + n) % n, v = slotVars(k);
      if (!(animate && hasGsap && WK.motion)) { setCard(c, v); return; }
      gsap.killTweensOf(c);
      if (j === prevFront && k === n - 1) { // the old front card is thrown toward the index, then tucks in at the back
        var out = window.matchMedia('(min-width: 1024px)').matches ? 130 : 80;
        gsap.timeline()
          .to(c, { x: (RTL ? 1 : -1) * out, y: -12, rotation: (RTL ? 1 : -1) * 9, scale: .96, duration: .3, ease: 'power2.in' })
          .set(c, { zIndex: v.zIndex })
          .to(c, Object.assign({}, v, { duration: .5, ease: 'power3.out' }));
      } else gsap.to(c, Object.assign({}, v, { duration: .6, ease: 'power3.out', delay: .1 }));
    });
  }
  function selectWork(i, animate) {
    var n = WK.cards.length; i = ((i % n) + n) % n;
    var prev = WK.cur; if (i === prev && animate) return;
    WK.cur = i;
    var b = WK.btns[i], desc = $('[data-works-desc]', WK.sec);
    WK.btns.forEach(function (x, k) { x.setAttribute('aria-pressed', String(k === i)); });
    $('[data-works-n]', WK.sec).textContent = (i + 1 < 10 ? '0' : '') + (i + 1);
    var colors = { '--w-bg': b.getAttribute('data-bg'), '--w-hi': b.getAttribute('data-hi'), '--w-ac': b.getAttribute('data-ac') };
    desc.textContent = b.getAttribute('data-desc');
    if (animate && hasGsap && WK.motion) {
      gsap.to(WK.stage, Object.assign({ duration: .7, ease: 'power2.inOut' }, colors));
      gsap.fromTo(desc, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: .35, delay: .15, clearProps: 'opacity,transform' });
    } else Object.keys(colors).forEach(function (k) { WK.stage.style.setProperty(k, colors[k]); });
    applyDeck(animate, prev);
  }
  function buildWorksIntro() {
    var front = WK.cards[WK.cur], rest = WK.cards.filter(function (c) { return c !== front; });
    return gsap.timeline({ paused: true })
      .fromTo(WK.stage, { clipPath: 'inset(10% 6% 10% 6% round 32px)', opacity: 0 }, { clipPath: 'inset(0% 0% 0% 0% round 32px)', opacity: 1, duration: .9, ease: 'power3.out', clearProps: 'clipPath,opacity' }, 0)
      .fromTo(front, Object.assign({}, slotVars(0), { y: 40, opacity: 0 }), Object.assign({}, slotVars(0), { opacity: 1, duration: .7, ease: 'power3.out' }), .35)
      .fromTo(rest, Object.assign({}, slotVars(0), { opacity: 0 }), { opacity: 1, duration: .6, ease: 'power3.out', stagger: .1,
        x: function (k, el) { return slotVars((WK.cards.indexOf(el) - WK.cur + WK.cards.length) % WK.cards.length).x; },
        y: function (k, el) { return slotVars((WK.cards.indexOf(el) - WK.cur + WK.cards.length) % WK.cards.length).y; },
        scale: function (k, el) { return slotVars((WK.cards.indexOf(el) - WK.cur + WK.cards.length) % WK.cards.length).scale; },
        rotation: function (k, el) { return slotVars((WK.cards.indexOf(el) - WK.cur + WK.cards.length) % WK.cards.length).rotation; },
        filter: function (k, el) { return slotVars((WK.cards.indexOf(el) - WK.cur + WK.cards.length) % WK.cards.length).filter; },
        zIndex: function (k, el) { return slotVars((WK.cards.indexOf(el) - WK.cur + WK.cards.length) % WK.cards.length).zIndex; } }, .7)
      .fromTo(WK.btns, { opacity: 0, x: 18 * (RTL ? 1 : -1) }, { opacity: 1, x: 0, duration: .45, stagger: .07, clearProps: 'opacity,transform' }, .45)
      .fromTo([$('.h-stage__count', WK.sec), $('.h-stage__desc', WK.sec), $('.h-stage__nav', WK.sec)], { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .45, stagger: .08, clearProps: 'opacity,transform' }, .6);
  }

  if (WK) {
    WK.stage.classList.add('is-ready');
    selectWork(0, false);
    WK.btns.forEach(function (b, k) {
      b.addEventListener('click', function () { selectWork(k, true); });
      b.addEventListener('keydown', function (e) { // ← / → move through the list (mirrored for RTL)
        var d = e.key === 'ArrowLeft' ? (RTL ? 1 : -1) : e.key === 'ArrowRight' ? (RTL ? -1 : 1) : 0;
        if (!d) return; e.preventDefault(); var to = (k + d + WK.btns.length) % WK.btns.length; WK.btns[to].focus(); selectWork(to, true);
      });
    });
    WK.cards.forEach(function (c, j) { c.addEventListener('click', function () { if (j !== WK.cur) selectWork(j, true); }); });
    $('[data-works-prev]', WK.sec).addEventListener('click', function () { selectWork(WK.cur - 1, true); });
    $('[data-works-next]', WK.sec).addEventListener('click', function () { selectWork(WK.cur + 1, true); });
    var x0 = null; // swipe: throw the front card toward the index side to go next
    WK.deck.addEventListener('pointerdown', function (e) { x0 = e.clientX; });
    WK.deck.addEventListener('pointerup', function (e) {
      if (x0 === null) return; var dx = e.clientX - x0; x0 = null;
      if (Math.abs(dx) > 40) selectWork(WK.cur + ((dx > 0) === RTL ? 1 : -1), true);
    });
    window.matchMedia('(min-width: 1024px)').addEventListener('change', function () { applyDeck(false); });
    $$('[data-open-work]').forEach(function (a) { // from the trust register: open that client's site in «أعمالنا»
      a.addEventListener('click', function () {
        if (WK.intro && WK.intro.progress() < 1) WK.intro.progress(1);
        selectWork(+a.getAttribute('data-open-work'), false);
      });
    });
  }

  /* ======================================================================
     §6 SAFE START · the thread runs through the four onboarding stops
     ====================================================================== */
  var sfSec = $('[data-section="safe"]');
  var SF = sfSec && { sec: sfSec, wrap: $('.h-trackwrap', sfSec), line: $('.h-track__line', sfSec), nodes: $$('.h-stop__node', sfSec), p: 1, geo: null };
  function layoutTrack() {
    if (!SF || !SF.wrap.getClientRects().length) return;
    var wr = SF.wrap.getBoundingClientRect();
    var pts = SF.nodes.map(function (n) { var r = n.getBoundingClientRect(); return { x: r.left + r.width / 2 - wr.left, y: r.top + r.height / 2 - wr.top }; });
    var a = pts[0], b = pts[pts.length - 1], vertical = Math.abs(b.y - a.y) > Math.abs(b.x - a.x);
    var end = vertical ? { x: a.x, y: b.y } : { x: b.x, y: a.y };
    SF.line.setAttribute('d', 'M' + a.x + ' ' + a.y + ' L' + end.x + ' ' + end.y);
    var len = Math.max(1, vertical ? end.y - a.y : Math.abs(end.x - a.x));
    SF.geo = { len: len, f: pts.map(function (p) { return (vertical ? p.y - a.y : Math.abs(p.x - a.x)) / len; }) };
    SF.sec.classList.add('has-track');
  }
  function renderTrack(p) {
    if (!SF || !SF.geo) return;
    SF.p = p;
    if (p >= 1) undash(SF.line); else dash(SF.line, SF.geo.len, p);
    SF.nodes.forEach(function (n, i) {
      var off = p < 1 && p < SF.geo.f[i] - .001; n.classList.toggle('is-off', off);
      var stop = n.parentNode;
      if (SF.anim && hasGsap && !off && p > 0 && !stop.getAttribute('data-lit')) {
        stop.setAttribute('data-lit', '1');
        gsap.to($$(':scope > :not(.h-stop__node)', stop), { opacity: 1, y: 0, duration: .45, ease: 'power2.out', stagger: .08 });
      }
    });
  }
  if (SF) {
    layoutTrack(); renderTrack(1);
    var rafS = 0;
    if (window.ResizeObserver) new ResizeObserver(function () { cancelAnimationFrame(rafS); rafS = requestAnimationFrame(function () { layoutTrack(); renderTrack(SF.p); }); }).observe(SF.wrap);
  }

  /* ======================================================================
     §7b DEMO FORM · UI-only (no network, nothing logged, nothing in the URL)
     The green line closes the page as it closed the hero: into the submit.
     ====================================================================== */
  var form = $('[data-demo-form]');
  var card = form && form.closest('.h-form-card');
  var FL = card && { card: card, path: $('.h-form-card__line path', card), submit: $('.h-form__submit', card), len: 0, p: 1 };
  function layoutFormLine() {
    if (!FL || !FL.card.getClientRects().length || !FL.submit.getClientRects().length) return;
    var cr = FL.card.getBoundingClientRect(), sr = FL.submit.getBoundingClientRect(), dir = RTL ? -1 : 1;
    var x = (RTL ? cr.right - 16 : cr.left + 16) - cr.left, xe = (RTL ? sr.right : sr.left) - cr.left;
    var y1 = sr.top + sr.height / 2 - cr.top, r = Math.min(14, Math.abs(xe - x));
    FL.path.setAttribute('d', 'M' + x + ' 34 V' + (y1 - r) + ' Q' + x + ' ' + y1 + ' ' + (x + dir * r) + ' ' + y1 + ' H' + xe);
    FL.len = FL.path.getTotalLength();
    FL.card.classList.add('has-line');
    if (FL.p < 1) dash(FL.path, FL.len, FL.p);
  }
  if (FL) {
    layoutFormLine();
    if (window.ResizeObserver) new ResizeObserver(layoutFormLine).observe(FL.card);
  }
  if (form) {
    var errBox = $('.h-form__error', form), done = $('.h-form__done', form);
    $$('[data-package]').forEach(function (a) {
      a.addEventListener('click', function () { var sel = form.elements.package; if (sel) sel.value = a.dataset.package; });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var bad = [];
      ['fname', 'lname', 'email', 'phone', 'org', 'consent'].forEach(function (n) {
        var el = form.elements[n], ok;
        if (n === 'consent') ok = el.checked;
        else if (n === 'email') ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim());
        else if (n === 'phone') ok = /^[0-9+\s-]{9,20}$/.test(el.value.trim());
        else ok = el.value.trim().length > 0;
        var field = el.closest('.h-field, .h-check');
        if (field) field.classList.toggle('is-invalid', !ok);
        el.setAttribute('aria-invalid', String(!ok));
        if (!ok) bad.push(el);
      });
      errBox.hidden = !bad.length;
      if (bad.length) { bad[0].focus(); return; }
      // Backend contract (Phase C): service = organisation · branches · package (max 255)
      form.elements.service.value = [form.elements.org.value.trim(), form.elements.branches.value, form.elements.package.value].join(' · ').slice(0, 255);
      $$('.h-field, .h-check, .h-form__two, .h-form__submit, .h-form__meta', form).forEach(function (n) { n.hidden = true; });
      done.hidden = false; done.setAttribute('tabindex', '-1'); done.focus();
      layoutFormLine();
    });
  }

  /* ======================================================================
     Mobile sticky CTA: after the hero, hidden while the demo form is visible
     ====================================================================== */
  var sticky = $('[data-sticky]');
  if (sticky) {
    var s5el = document.getElementById('v4-s5'), demoEl = document.getElementById('demo');
    var updSticky = function () {
      var past = s5el ? s5el.getBoundingClientRect().bottom < 0 : window.scrollY > window.innerHeight;
      var dr = demoEl ? demoEl.getBoundingClientRect() : null;
      var atDemo = dr ? dr.top < window.innerHeight * .85 : false;
      var on = past && !atDemo;
      if (on === sticky.classList.contains('is-on')) return;
      sticky.classList.toggle('is-on', on);
      sticky.setAttribute('aria-hidden', String(!on));
      $$('a', sticky).forEach(function (a) { a.tabIndex = on ? 0 : -1; });
    };
    window.addEventListener('scroll', updSticky, { passive: true }); // two rect reads; early-out when unchanged
    window.addEventListener('resize', updSticky);
    updSticky();
  }


  /* ======================================================================
     CONTENT REVEALS (owner request: "animation in the content of each section")
     Each section's content enters with its own small motion: word masks for
     titles (whole words, never letters), slides from the inline start, pops,
     counts and fills. Motion-allowed only; the HTML already holds the final
     state, so no-JS and reduced motion show everything immediately.
     ====================================================================== */
  var FROM_START = RTL ? 1 : -1; // x sign for "coming from the inline start"
  function splitWords(el) {
    if (el.getAttribute('data-split')) return $$('.h-w__i', el);
    el.setAttribute('data-split', '1');
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          if (!n.textContent.trim()) return;
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var w = document.createElement('span'), i = document.createElement('span');
            w.className = 'h-w'; i.className = 'h-w__i'; i.textContent = part; w.appendChild(i); frag.appendChild(w);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1 && !n.classList.contains('u-visually-hidden')) walk(n);
      });
    })(el);
    return $$('.h-w__i', el);
  }
  var st = function (trigger, start) { return { trigger: trigger, start: start || 'top 86%', once: true }; };
  function countFrom0(el, opts) {
    var to = parseFloat(el.getAttribute('data-count') || el.textContent.replace(/[^\d.]/g, '')) || 0, sfx = (opts && opts.sfx) || '', o = { v: 0 };
    el.setAttribute('data-final', to + sfx); el.textContent = '0' + sfx;
    return gsap.to(o, { v: to, duration: (opts && opts.d) || 1.2, delay: (opts && opts.delay) || 0, ease: 'power2.out',
      onUpdate: function () { el.textContent = Math.round(o.v) + sfx; }, onComplete: function () { el.textContent = to + sfx; },
      scrollTrigger: st((opts && opts.trigger) || el) });
  }

  function setupReveals() {
    var made = [], counted = [];
    var add = function (t) { if (t) made.push(t); return t; };
    var sec = function (k) { return $('[data-section="' + k + '"]'); };

    /* shared: titles (word masks), eyebrows (slide from start), leads (rise) */
    $$('[data-section] .h-title, [data-section] .h-form-card__title').forEach(function (t) {
      var words = splitWords(t);
      add(gsap.fromTo(words, { yPercent: 118 }, { yPercent: 0, duration: .9, ease: 'power3.out', stagger: .045, scrollTrigger: st(t),
        onComplete: function () { $$('.h-w', t).forEach(function (w) { w.classList.add('is-done'); }); } }));
    });
    $$('[data-section] .h-eyebrow').forEach(function (e) {
      add(gsap.fromTo(e, { opacity: 0, x: 20 * FROM_START }, { opacity: 1, x: 0, duration: .6, ease: 'power2.out', scrollTrigger: st(e) }));
    });
    $$('.h-trust__lead, .h-ba__lead, .h-mod__lead, .h-tour__lead, .h-ch__lead, .h-works__lead, .h-works__stat, .h-safe__lead, .h-pk__lead, .h-form-card__sub').forEach(function (l) {
      add(gsap.fromTo(l, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: .7, delay: .2, ease: 'power2.out', scrollTrigger: st(l) }));
    });

    /* §1 trust: caption rises; client slots drop into the register one by one */
    var s1 = sec('trust');
    if (s1) {
      add(gsap.fromTo($('.h-fig__cap', s1), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .6, delay: .9, scrollTrigger: st($('.h-fig', s1), 'top 85%') }));
      $$('.h-register__group', s1).forEach(function (g) {
        add(gsap.fromTo($('.h-register__label', g), { opacity: 0, x: 16 * FROM_START }, { opacity: 1, x: 0, duration: .5, scrollTrigger: st(g, 'top 90%') }));
        add(gsap.fromTo($$('li', g), { opacity: 0, scale: .82, y: -10 }, { opacity: 1, scale: 1, y: 0, duration: .45, ease: 'back.out(2)', stagger: .06, scrollTrigger: st(g, 'top 90%') }));
      });
    }

    /* §3 modules: the «20» rises across the seam (the building has its own build sequence) */
    var s3 = sec('modules');
    if (s3) {
      add(gsap.fromTo($('.h-mod__big', s3), { opacity: 0, y: 70 }, { opacity: 1, y: 0, duration: 1, ease: 'power3.out', scrollTrigger: st(s3, 'top 90%') }));
      add(gsap.fromTo($('.h-mod__foot', s3), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: .6, scrollTrigger: st($('.h-mod__foot', s3), 'top 95%') }));
    }

    /* §4 tour: the cast slides in from the start, the points follow, the screen's panels settle */
    var s4 = sec('tour');
    if (s4) {
      add(gsap.fromTo($$('.h-guide__chip', s4), { opacity: 0, x: 24 * FROM_START }, { opacity: 1, x: 0, duration: .55, ease: 'power2.out', stagger: .08, scrollTrigger: st($('.h-guide', s4)) }));
      add(gsap.fromTo($$('.h-guide__step, .h-guide__role, .h-guide__line', s4), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: .55, stagger: .08, delay: .25, scrollTrigger: st($('.h-guide', s4)) }));
      add(gsap.fromTo($$('.h-guide__points li', s4), { opacity: 0, x: 18 * FROM_START }, { opacity: 1, x: 0, duration: .5, stagger: .1, delay: .45, scrollTrigger: st($('.h-guide', s4)) }));
      add(gsap.fromTo($$('.h-view[data-view="owner"] > *', s4), { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: .6, stagger: .12, delay: .35, ease: 'power2.out', scrollTrigger: st($('.h-frame', s4), 'top 80%') }));
    }

    /* §5 channels: each channel slides in from the start; its tag pops */
    var s5s = sec('channels');
    if (s5s) {
      add(gsap.fromTo($$('.h-ch__list li', s5s), { opacity: 0, x: 28 * FROM_START }, { opacity: 1, x: 0, duration: .6, ease: 'power2.out', stagger: .14, scrollTrigger: st($('.h-ch__list', s5s)) }));
      add(gsap.fromTo($$('.h-ch__list .h-tag', s5s), { scale: .6, opacity: 0 }, { scale: 1, opacity: 1, duration: .4, ease: 'back.out(2.2)', stagger: .14, delay: .45, scrollTrigger: st($('.h-ch__list', s5s)) }));
    }

    /* §6 safe start: stop texts arrive as the thread reaches them (renderTrack hook); specs list in; 365 counts */
    var s6 = sec('safe');
    if (s6) {
      if (SF) { SF.anim = true; gsap.set($$('.h-stop > :not(.h-stop__node)', s6), { opacity: 0, y: 12 }); $$('.h-stop', s6).forEach(function (s) { s.removeAttribute('data-lit'); }); }
      $$('.h-spec', s6).forEach(function (l) {
        add(gsap.fromTo($$('li', l), { opacity: 0, x: 22 * FROM_START }, { opacity: 1, x: 0, duration: .5, stagger: .09, scrollTrigger: st(l, 'top 88%') }));
      });
      var big = $('.h-safe__big b', s6);
      add(gsap.fromTo($('.h-safe__big', s6), { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: .8, ease: 'power3.out', scrollTrigger: st($('.h-safe__big', s6), 'top 88%') }));
      add(countFrom0(big, { d: 1.6, trigger: $('.h-safe__big', s6) })); counted.push(big);
    }

    /* §7a packages: cards rise; people appear one by one (one icon = one user); figures count; storage fills; features tick in */
    var s7 = sec('packages');
    if (s7) {
      var plans = $$('.h-pkg', s7);
      add(gsap.fromTo(plans, { opacity: 0, y: 46 }, { opacity: 1, y: 0, duration: .9, ease: 'power3.out', stagger: .16, scrollTrigger: st($('.h-plans', s7), 'top 82%'), clearProps: 'transform' }));
      plans.forEach(function (p, k) {
        var d = .35 + k * .16, trig = st($('.h-plans', s7), 'top 82%');
        add(gsap.fromTo($$('.h-pkg__people i', p), { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: .3, ease: 'back.out(2.4)', stagger: { each: .025 }, delay: d + .2, scrollTrigger: trig }));
        add(gsap.fromTo($$('.h-pkg__sites i', p), { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: .45, ease: 'back.out(2)', stagger: .12, delay: d + .3, scrollTrigger: trig }));
        add(gsap.fromTo($('.h-pkg__bar i', p), { scaleX: 0 }, { scaleX: 1, duration: 1, ease: 'power2.inOut', delay: d + .5, scrollTrigger: trig }));
        $$('.h-pkg__keys b', p).forEach(function (b) { add(countFrom0(b, { d: 1.1, delay: d + .3, trigger: $('.h-plans', s7) })); counted.push(b); });
        add(gsap.fromTo($$('.h-pkg__list li', p), { opacity: 0, x: 16 * FROM_START }, { opacity: 1, x: 0, duration: .4, stagger: .06, delay: d + .55, scrollTrigger: trig }));
      });
      add(gsap.fromTo($$('.h-plans__inc li', s7), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .45, stagger: .07, scrollTrigger: st($('.h-plans__all', s7), 'top 85%') }));
      add(gsap.fromTo($$('.h-plans__chips li', s7), { opacity: 0, scale: .8 }, { opacity: 1, scale: 1, duration: .35, ease: 'back.out(2)', stagger: .05, delay: .4, scrollTrigger: st($('.h-plans__all', s7), 'top 85%') }));
    }

    /* §7b demo: questions rise in turn; the form card lifts in */
    var s8 = sec('demo');
    if (s8) {
      add(gsap.fromTo($$('.h-faq__item', s8), { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: .5, stagger: .1, scrollTrigger: st($('.h-faq', s8)) }));
      add(gsap.fromTo($('.h-form-card', s8), { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: .9, ease: 'power3.out', scrollTrigger: st($('.h-form-card', s8), 'top 90%'), clearProps: 'transform' }));
    }

    /* footer: columns settle */
    var ft = sec('footer');
    if (ft) add(gsap.fromTo($$('.h-foot__brand, .h-foot__nav > div', ft), { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: .6, stagger: .1, scrollTrigger: st(ft, 'top 92%') }));

    window.__homeReveals = made; // QA: ?qa=<section>&reveal=<s> freezes these at a given time
    return function revert() { // switched to reduced motion: final state, no inline leftovers
      made.forEach(function (t) {
        if (t.scrollTrigger) t.scrollTrigger.kill();
        t.progress(1); var tg = t.targets().filter(function (x) { return x && x.nodeType === 1; });
        t.kill(); if (tg.length) gsap.set(tg, { clearProps: 'opacity,visibility,transform' });
      });
      counted.forEach(function (b) { b.textContent = b.getAttribute('data-final') || b.textContent; });
      $$('.h-w').forEach(function (w) { w.classList.add('is-done'); });
      if (SF) { SF.anim = false; gsap.set($$('.h-stop > *'), { clearProps: 'opacity,visibility,transform' }); }
    };
  }

  /* ======================================================================
     Media branches: motion only when the user allows it (any width; no pin)
     ====================================================================== */
  if (hasGsap) {
    ScrollTrigger.addEventListener('refreshInit', function () {
      layoutThread();
      if (T && !T.played && T.motion) drawTo(0); // keep it hidden at the new length
      if (B) { layoutBA(); renderBA(B.p); }
      if (BL) layoutTower();
      if (TR) scaleTour();
      if (CH) scaleCh();
      if (SF) { layoutTrack(); renderTrack(SF.p); }
      if (FL) layoutFormLine();
    });

    var mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', function () {
      if (T && !params.get('qa')) {
        T.motion = true;
        setTrustStart();
        ScrollTrigger.create({
          trigger: T.fig, start: 'top 85%', once: true,
          onEnter: function () { layoutThread(); T.played = true; T.tl = buildTrust(); T.tl.play(); }
        });
      }
      if (B && !params.get('qa')) {
        var proxy = { p: 0 };
        renderBA(0);
        B.tw = gsap.to(proxy, { p: 1, ease: 'none', onUpdate: function () { renderBA(proxy.p); },
          scrollTrigger: { trigger: B.board, start: 'top 72%', end: 'clamp(bottom 58%)', scrub: .6 } });
      }
      if (BL && !params.get('qa')) {
        BL.motion = true; BL.tl = buildTower();
        ScrollTrigger.create({ trigger: BL.tower, start: 'top 72%', once: true, onEnter: function () { BL.tl.play(); } });
      }
      if (TR) {
        TR.motion = true;
        if (!params.get('qa')) ScrollTrigger.create({ trigger: TR.scaler, start: 'top 80%', once: true, onEnter: function () {
          gsap.fromTo(TR.scaler, { y: 28 }, { y: 0, duration: .8, ease: 'power3.out', clearProps: 'transform' });
          gsap.fromTo(TR.marks, { scale: 0 }, { scale: 1, duration: .35, ease: 'back.out(2.4)', stagger: .12, delay: .45 });
        } });
      }
      if (CH && !params.get('qa')) {
        CH.tl = buildCh(); routeAt(0);
        ScrollTrigger.create({ trigger: CH.stage, start: 'top 78%', once: true, onEnter: function () { CH.tl.play(); } });
      }
      if (WK && !params.get('qa')) {
        WK.motion = true; WK.intro = buildWorksIntro();
        ScrollTrigger.create({ trigger: WK.stage, start: 'top 78%', once: true, onEnter: function () { WK.intro.play(); } });
      }
      if (SF && !params.get('qa')) {
        renderTrack(0);
        ScrollTrigger.create({ trigger: SF.wrap, start: 'top 78%', once: true, onEnter: function () {
          var o = { p: 0 }; SF.tw = gsap.to(o, { p: 1, duration: 1.6, ease: 'power1.inOut', onUpdate: function () { renderTrack(o.p); } });
        } });
      }
      if (FL && !params.get('qa')) {
        FL.p = 0; dash(FL.path, FL.len || 1, 0);
        ScrollTrigger.create({ trigger: FL.card, start: 'top 70%', once: true, onEnter: function () {
          var o = { p: 0 }; FL.tw = gsap.to(o, { p: 1, duration: 1.2, ease: 'power2.inOut', onUpdate: function () { FL.p = o.p; if (o.p >= 1) undash(FL.path); else dash(FL.path, FL.len, o.p); } });
        } });
      }
      var revertReveals = params.get('qa') ? null : setupReveals();
      return function () { // switched to reduced motion: show final state
        if (revertReveals) revertReveals();
        if (TR) TR.motion = false;
        if (CH && CH.tl) { CH.tl.progress(1).kill(); CH.tl = null; gsap.set(CH.devs.concat(CH.nums), { clearProps: 'all' }); routeAt(1); }
        if (SF) { if (SF.tw) SF.tw.kill(); renderTrack(1); }
        if (WK) { WK.motion = false; if (WK.intro) { WK.intro.progress(1).kill(); WK.intro = null; } gsap.set(WK.stage, { clearProps: 'clipPath,opacity' }); applyDeck(false); }
        if (FL) { if (FL.tw) FL.tw.kill(); FL.p = 1; undash(FL.path); }
        if (BL) { BL.motion = false; if (BL.tl) { BL.tl.progress(1).kill(); BL.tl = null; } finalTower(); }
        if (B) { if (B.tw) { if (B.tw.scrollTrigger) B.tw.scrollTrigger.kill(); B.tw.kill(); B.tw = null; } renderBA(1); }
        if (!T) return;
        T.motion = false;
        if (T.tl) T.tl.progress(1);
        T.path.style.strokeDasharray = ''; T.path.style.strokeDashoffset = '';
        gsap.set([T.end, T.ring, T.ticks, T.rules], { clearProps: 'all' });
        T.num.textContent = T.num.dataset.count;
        T.counts.forEach(function (el) { el.textContent = el.dataset.count + (el.dataset.suffix || ''); });
        layoutThread();
      };
    });
  }


  /* Prototype QA: ?selftest=1 → exercises the interactive parts and writes body[data-selftest] (no network) */
  if (params.get('selftest') === '1') {
    if (hasGsap) gsap.ticker.lagSmoothing(0); // QA only: follow the wall clock in headless
    window.addEventListener('load', function () { setTimeout(function () {
      var out = {}, wait = function (ms, fn) { setTimeout(fn, ms); };
      try {
        // trust register → «أعمالنا»: open Platinum Eastern from its logo
        $('[data-open-work="2"]').click(); out.openWork = WK && WK.cur;
        // works: next arrow, then a click on the card at the back
        $('[data-works-next]').click();
        out.works = { cur: WK && WK.cur, pressed: $$('.h-work').map(function (b) { return b.getAttribute('aria-pressed'); }).indexOf('true'), bg: WK && WK.stage.style.getPropertyValue('--w-bg') || getComputedStyle(WK.stage).getPropertyValue('--w-bg').trim(), n: $('[data-works-n]').textContent };
        $$('.h-deck__card')[3].click(); out.worksCard = WK && WK.cur;
        // building: click floor 5, then ↑ to floor 6
        var f5 = $('.h-floor[data-floor="5"]'); f5.click();
        out.bld = { pressed: f5.getAttribute('aria-pressed'), visibleDirs: $$('.h-dir__floor').filter(function (d) { return !d.hidden; }).map(function (d) { return d.id; }) };
        f5.focus(); f5.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
        out.bldKey = { cur: BL && BL.cur, focused: document.activeElement && document.activeElement.getAttribute('data-floor'), visibleDirs: $$('.h-dir__floor').filter(function (d) { return !d.hidden; }).map(function (d) { return d.id; }) };
        setTimeout(function () { out.bldCar = BL && BL.geo ? { cy: Math.round(+BL.car.getAttribute('cy')), floor6: Math.round(BL.geo.fy[5]) } : null; }, 1400);
        var chip = $('.h-guide__chip[data-role="ops"]'); chip.click();
        wait(1500, function () {
          out.tourOps = { pressed: chip.getAttribute('aria-pressed'), viewShown: !$('.h-view[data-view="ops"]').hidden,
            ownerHidden: $('.h-view[data-view="owner"]').hidden, title: $('[data-app="title"]').textContent, next: $('[data-tour="next-name"]').textContent,
            hlY: Math.round(new DOMMatrix(getComputedStyle($('.h-app__hl')).transform).m42) };
          $('[data-tour="next"]').click(); $('.h-guide__chip[data-role="cs"]').click(); // rapid double switch
          wait(1500, function () {
            out.tourNext = { role: $('[data-tour="role"]').textContent, step: $('[data-tour="step"]').textContent,
              visibleViews: $$('.h-view', $('.h-app')).filter(function (v) { return !v.hidden; }).map(function (v) { return v.dataset.view; }) };
            var f = $('[data-demo-form]');
            f.requestSubmit();
            out.formEmpty = { errorShown: !$('.h-form__error', f).hidden, invalid: $$('[aria-invalid="true"]', f).length, focused: document.activeElement && document.activeElement.name };
            f.elements.fname.value = 'تجربة'; f.elements.lname.value = 'آلية'; f.elements.email.value = 'qa@example.com';
            f.elements.phone.value = '0500000000'; f.elements.org.value = 'مؤسسة تجريبية'; f.elements.consent.checked = true;
            $('[data-package="باقة الأعمال"]').dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            out.packagePreselect = f.elements.package.value;
            f.requestSubmit();
            out.formOk = { doneShown: !$('.h-form__done', f).hidden, service: f.elements.service.value, urlHasPII: /qa%40|qa@|0500000000/.test(location.href) };
            window.scrollTo(0, document.getElementById('modules').offsetTop); window.dispatchEvent(new Event('scroll'));
            wait(1200, function () {
              out.stickyMid = $('[data-sticky]').classList.contains('is-on');
              window.scrollTo(0, 0); window.dispatchEvent(new Event('scroll'));
              wait(1200, function () {
                out.yTop = Math.round(window.scrollY); out.s5Bottom = Math.round(document.getElementById('v4-s5').getBoundingClientRect().bottom);
                out.stickyTop = $('[data-sticky]').classList.contains('is-on');
                document.body.setAttribute('data-selftest', JSON.stringify(out));
              });
            });
          });
        });
      } catch (e) { document.body.setAttribute('data-selftest', JSON.stringify({ error: String(e) })); }
    }, 1500); });
  }

  /* Prototype QA: ?goto=<section>[&off=px] → real native scroll to a section after load */
  var go = params.get('goto');
  if (go) window.addEventListener('load', function () { setTimeout(function () {
    var el = $('[data-section="' + go + '"]'); if (!el) return;
    window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY + (parseInt(params.get('off'), 10) || 0));
    if (hasGsap) ScrollTrigger.update();
  }, 500); });

  /* Prototype QA: ?debug=1 → trigger measurements in body[data-home-debug] */
  if (params.get('debug') === '1' && hasGsap) {
    gsap.ticker.lagSmoothing(0); // QA only: headless renders few frames; follow the wall clock so the check is deterministic
    window.addEventListener('load', function () { setTimeout(function () {
      var mine = ScrollTrigger.getAll().filter(function (t) { return t.trigger === (T && T.fig); })[0];
      document.body.setAttribute('data-home-debug', JSON.stringify({ scrollY: Math.round(scrollY), maxY: document.documentElement.scrollHeight - innerHeight,
        trust: mine ? [Math.round(mine.start), Math.round(mine.end), +mine.progress.toFixed(2), mine.isActive] : null, played: T && T.played,
        figTop: T && Math.round(T.fig.getBoundingClientRect().top), num: T && T.num.textContent,
        bld: BL ? { built: BL.built, floor: BL.cur, tl: BL.tl ? +BL.tl.progress().toFixed(2) : null, lit: $$('.h-floor:not(.is-dark)').length } : null,
        stuck: (function () { var lim = window.scrollY + innerHeight * .8, n = [];
          document.querySelectorAll('[data-section] *').forEach(function (el) { var r = el.getBoundingClientRect(); if (!r.width || r.top + window.scrollY > lim || el.closest('[hidden], .h-view[hidden], .h-form__done, details:not([open]) > :not(summary)')) return;
            var cs = getComputedStyle(el); if (+cs.opacity < .05 || cs.visibility === 'hidden') n.push((el.className && el.className.baseVal === undefined ? el.className : el.tagName).toString().slice(0, 30)); });
          return n.slice(0, 6).concat(n.length > 6 ? ['+' + (n.length - 6)] : []); })(),
        split: document.querySelectorAll('.h-w').length,
        reveals: (function () { var lim = window.scrollY + innerHeight, all = window.__homeReveals || [], bad = [];
          all.forEach(function (t) { var el = t.targets().filter(function (x) { return x && x.nodeType === 1; })[0] || (t.scrollTrigger && t.scrollTrigger.trigger); if (!el) return;
            var top = el.getBoundingClientRect().top + window.scrollY; if (top < lim && t.paused() && t.progress() === 0) bad.push((el.className || el.tagName).toString().slice(0, 24)); });
          return { total: all.length, untriggered: bad.length, sample: bad.slice(0, 4) }; })(),
        hooks: { stopsLit: document.querySelectorAll('.h-stop[data-lit]').length, trackTw: SF && SF.tw ? +SF.tw.progress().toFixed(2) : null },
        rest: { ch: CH && CH.tl ? +CH.tl.progress().toFixed(2) : null, safe: SF ? +SF.p.toFixed(2) : null, formLine: FL ? +FL.p.toFixed(2) : null },
        ba: B && B.tw ? [Math.round(B.tw.scrollTrigger.start), Math.round(B.tw.scrollTrigger.end), +B.tw.scrollTrigger.progress.toFixed(2), +B.p.toFixed(2)] : null, tlp: T && T.tl ? +T.tl.progress().toFixed(2) : null, tlt: T && T.tl ? +T.tl.time().toFixed(2) : null, frame: gsap.ticker.frame, t: +gsap.ticker.time.toFixed(2), triggers: ScrollTrigger.getAll().length }));
    }, 9000); });
  }

  /* ======================================================================
     Prototype QA: ?qa=<data-section>[&p=0..1][&role=…][&ctx=360] → one section alone, exact state
     ====================================================================== */
  var qa = params.get('qa');
  if (qa) {
    var target = $('[data-section="' + qa + '"]');
    doc.classList.add('qa-only');
    if (params.get('ctx')) doc.classList.add('qa-ctx');
    if (target) target.classList.add('is-qa-target');
    if (target && params.get('ctx') && target.previousElementSibling) target.previousElementSibling.classList.add('is-qa-prev');
    window.addEventListener('load', function () {
      setTimeout(function () {
        var st = document.createElement('style'); st.textContent = '*,*::before,*::after{transition:none!important}'; document.head.appendChild(st);
        var v4 = window.__v4;
        if (v4 && v4.s5tl) { v4.s5tl.scrollTrigger && v4.s5tl.scrollTrigger.disable(); v4.s5tl.progress(1); }
        $('.c-header') && $('.c-header').classList.add('is-solid');
        if (hasGsap) ScrollTrigger.refresh();
        var p = params.has('p') ? parseFloat(params.get('p')) : 1;
        if (qa === 'trust' && T) {
          layoutThread();
          if (hasGsap && p < 1) { setTrustStart(); var tl = buildTrust(); tl.progress(p); }
        }
        if (qa === 'before-after' && B) { layoutBA(); renderBA(p); }
        if (qa === 'modules' && BL) { layoutTower(); if (params.get('floor')) setFloor(+params.get('floor'), false); if (hasGsap && p < 1) { BL.tl = buildTower(); BL.tl.progress(p); } }
        if (qa === 'tour' && TR) { scaleTour(); if (params.get('role') && ROLES[params.get('role')]) setRole(params.get('role'), false); placeMarks(false); }
        if (qa === 'channels' && CH) { scaleCh(); if (hasGsap && p < 1) { buildCh().progress(p); } }
        if (qa === 'safe' && SF) { layoutTrack(); renderTrack(p); }
        if (qa === 'works' && WK) { if (params.get('work')) selectWork(+params.get('work'), false); if (hasGsap && p < 1) { WK.intro = buildWorksIntro(); WK.intro.progress(p); } }
        if (qa === 'demo' && FL) { layoutFormLine(); }
        if (params.has('reveal') && hasGsap) { // QA only: content reveals frozen T seconds after their trigger
          var RT = parseFloat(params.get('reveal')) || 0; setupReveals();
          (window.__homeReveals || []).forEach(function (tw) {
            if (tw.scrollTrigger) tw.scrollTrigger.kill(); tw.pause();
            var d = tw.duration() || 1; tw.progress(Math.min(1, Math.max(0, (RT - tw.delay()) / d)));
          });
        }
        var ctx = parseInt(params.get('ctx'), 10);
        var prev = target && target.previousElementSibling;
        if (ctx && prev) document.querySelector('main').style.transform = 'translateY(' + (-(prev.offsetTop + prev.offsetHeight - ctx)) + 'px)';
        window.scrollTo(0, 0);
        document.body.setAttribute('data-qa', qa + '@' + p);
        if (T) { var R = function (el) { var r = el.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; };
          document.body.setAttribute('data-qa-geo', JSON.stringify({ sec: R(T.sec), fig: R(T.fig), base: R(T.base), grid: R($('.h-trust__grid', T.sec)), vw: innerWidth, d: T.path.getAttribute('d') })); }
      }, 900);
    });
  }
})();
