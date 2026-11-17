/* ==========================================================================
   ClickERP prototype · Hero V4 · Phase 6 scroll engine (GSAP 3.15.1)
   - ONE pinned, scrubbed, reversible timeline for scenes 1–4 (labels s1–s4)
   - Scene 5 is NOT pinned: a scrubbed "lights on" veil + the green line drawn
     into the primary CTA
   - Native scrolling only (no ScrollSmoother / no hijacking)
   - gsap.matchMedia: pinned (≥1024×640 + motion) · stacked · reduced motion
   - Arabic text is never split into letters; copy moves as whole lines/blocks
   ========================================================================== */
(function () {
  'use strict';

  var params = new URLSearchParams(location.search);
  var doc = document.documentElement;
  var body = document.body;
  var stage = document.getElementById('v4-stage');
  var s5 = document.getElementById('v4-s5');
  var header = document.querySelector('.c-header');
  var RTL = doc.dir === 'rtl';
  var SCRUB = params.get('scrolltest') === '1' ? true : 1;   // QA: immediate scrub so headless tests are deterministic

  if (!window.gsap || !window.ScrollTrigger) { body.classList.add('no-gsap'); return; } // stays stacked & readable
  gsap.registerPlugin(ScrollTrigger, window.DrawSVGPlugin);

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var S = { s1: $('.v3-s1', stage), s2: $('.v2-s2', stage), s3: $('.v2-s3', stage), s4: $('.v2-s4', stage) };

  /* ---------------- Art canvas scaling (per scene) ---------------- */
  function sizeCanvases() {
    var pinned = stage.classList.contains('is-pinned');
    Object.keys(S).forEach(function (k) {
      var el = S[k], box = pinned ? stage : el;
      var w = box.clientWidth, h = box.clientHeight || window.innerHeight;
      var s = (k === 's1')
        ? Math.max(0.5, Math.min(w / 1440, h / 900))            // V3 scene 1: contain (never clipped)
        : Math.min(1.4, Math.max(w / 1440, h / 900));           // V2 scenes: cover
      el.style.setProperty('--s', s.toFixed(4));
    });
  }

  /* ---------------- Scene 5: route the green line into the CTA ---------------- */
  function routeFinale() {
    var svg = $('.v2-s5-line', s5), path = $('path', svg);
    var dot = $('.v2-terminal', svg), ring = $('.v2-terminal-ring', svg);
    var cta = $('.v2-card__cta', s5), card = $('.v2-card', s5), copy = $('.v2-copy--s5', s5), dawn = $('.v2-dawn', s5);
    var base = s5.getBoundingClientRect(), b = cta.getBoundingClientRect(), c = card.getBoundingClientRect(), t = copy.getBoundingClientRect(), d = dawn.getBoundingClientRect();
    if (!b.width) return;
    var ex = (RTL ? b.right : b.left) - base.left, ey = b.top + b.height / 2 - base.top;
    var wide = window.innerWidth >= 768;
    var gx = wide ? (RTL ? (c.right + t.left) / 2 : (c.left + t.right) / 2) : (RTL ? c.right + (window.innerWidth - c.right) / 2 : c.left / 2);
    var sx = gx - base.left, sy = d.bottom - base.top - 42;
    var dir = RTL ? -1 : 1, r = 60;
    path.setAttribute('d', 'M' + sx.toFixed(1) + ' ' + sy.toFixed(1) + ' L' + sx.toFixed(1) + ' ' + (ey - r).toFixed(1) +
      ' Q' + sx.toFixed(1) + ' ' + ey.toFixed(1) + ' ' + (sx + dir * r).toFixed(1) + ' ' + ey.toFixed(1) + ' L' + ex.toFixed(1) + ' ' + ey.toFixed(1));
    [dot, ring].forEach(function (el) { el.setAttribute('cx', ex.toFixed(1)); el.setAttribute('cy', ey.toFixed(1)); });
  }

  /* ---------------- Header: overlay on the night, solid on paper ---------------- */
  function headerTrigger() {
    return ScrollTrigger.create({
      trigger: $('.v2-dawn', s5), start: 'bottom top+=72', refreshPriority: -1, // measured after the pin spacer exists
      onEnter: function () { header.classList.add('is-solid'); },
      onLeaveBack: function () { header.classList.remove('is-solid'); },
      onRefresh: function (self) { header.classList.toggle('is-solid', self.progress > 0 || window.scrollY > self.start); }
    });
  }

  /* ---------------- Helpers ---------------- */
  function centred(els, extra) { gsap.set(els, Object.assign({ x: 0, y: 0, xPercent: -50, yPercent: -50 }, extra || {})); }
  function px(el, prop) { return parseFloat(el.style[prop]) || 0; }
  function setActive(name) {
    Object.keys(S).forEach(function (k) { S[k].classList.toggle('is-active', k === name); });
    $$('.v4-progress [data-goto]').forEach(function (b) {
      if (b.getAttribute('data-goto') === name) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    });
  }
  function counter(el, to, suffix, prefix) {
    var o = { v: 0 };
    return gsap.to(o, { v: to, duration: .9, ease: 'none', onUpdate: function () { el.textContent = (prefix || '') + Math.round(o.v) + (suffix || ''); } });
  }

  /* ======================================================================
     PINNED MODE
     ====================================================================== */
  function buildPinned() {
    stage.classList.add('is-pinned');
    body.classList.add('is-motion');
    sizeCanvases();

    var s1 = S.s1, s2 = S.s2, s3 = S.s3, s4 = S.s4;

    /* --- normalise transforms the approved CSS expresses as translate(-50%,…) --- */
    centred($$('.v3-node, .v3-core, .v3-core-label', s1));
    centred($$('.v2-core, .v2-hub-label, .v2-plate-label, .v2-cluster, .v2-demo--canvas', s4));
    centred($$('.v2-node--cap', s4), { scale: 1 });
    gsap.set($$('.v2-stage', s2), { x: 0, y: -30, xPercent: -50, yPercent: 0, scale: 1, transformOrigin: '50% 30px' });
    gsap.set($$('.v2-stage--s', s2), { scale: .92 }); gsap.set($$('.v2-stage--xs', s2), { scale: .84 });
    gsap.set($('.v2-ticket', s2), { x: 0, y: 0, xPercent: -50, yPercent: -100 });
    gsap.set($$('.v2-divider-label', s2), { x: 0, y: 0, xPercent: -50, yPercent: 0 });
    gsap.set($('.v2-callout--end', s3), { x: 0, y: 0, xPercent: 0, yPercent: -50 });
    gsap.set($('.v2-demo--canvas', s3), { x: 0, y: 0, xPercent: -50, yPercent: -50 });
    gsap.set($$('.v2-brackets', stage), { x: 0, y: 0, xPercent: -50, yPercent: -50 });

    /* --- initial pinned state: only scene 1 visible --- */
    gsap.set([s2, s3, s4], { autoAlpha: 0 });
    gsap.set(s1, { autoAlpha: 1 });
    setActive('s1');

    /* --- intro (time-based, on load at the top only; never hides the headline) --- */
    var intro = null;
    if (window.scrollY < 40 && !params.get('at') && !params.get('frame')) {
      intro = gsap.timeline({ defaults: { ease: 'power2.out' } });
      intro.from($$('.v3-ring:not(.v3-ring--outer)', s1), { drawSVG: '0%', duration: 1.1 }, 0)
           .from($('.v3-ring--outer', s1), { autoAlpha: 0, duration: 1.1 }, .1)
           .from($('.v3-core', s1), { scale: .82, autoAlpha: 0, duration: .9 }, .1)
           .from($$('.v3-routes path', s1), { drawSVG: '0%', duration: .7, stagger: .08 }, .45)
           .from($$('.v3-node', s1), { autoAlpha: 0, y: 14, duration: .6, stagger: .08 }, .55)
           .from($('.v3-s1 .v3-spine'), { drawSVG: '0%', duration: 1.1, ease: 'power1.inOut' }, .9)
           .from($('.v3-core-label', s1), { autoAlpha: 0, duration: .5 }, 1.1);
      window.addEventListener('scroll', function () { intro.progress(1); }, { once: true, passive: true });
    }

    /* --- master timeline (scrubbed) --- */
    var tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: stage, start: 'top top', end: '+=450%', pin: true, scrub: SCRUB, anticipatePin: 1, invalidateOnRefresh: true,
        onUpdate: function (self) {
          var t = tl.time(), name = t < 1.5 ? 's1' : t < 3.75 ? 's2' : t < 6.0 ? 's3' : 's4';
          if (stage.getAttribute('data-active') !== name) { stage.setAttribute('data-active', name); setActive(name); }
        }
      }
    });

    var core = { x: 430, y: 470 };
    tl.addLabel('s1', 0);

    /* S1 → S2: departments collapse into the core; the core hands its line to the journey */
    tl.to('.v4-scrollhint', { autoAlpha: 0, duration: .3 }, .2)
      .fromTo($$('.v3-copy--s1 > *', s1), { y: 0, autoAlpha: 1 }, { immediateRender: false, y: -36, autoAlpha: 0, duration: .55, stagger: .06 }, .6)
      .fromTo($$('.v3-node', s1), { x: 0, y: 0, scale: 1, autoAlpha: 1 }, {
        immediateRender: false, x: function (i, el) { return core.x - px(el, 'left'); }, y: function (i, el) { return core.y - px(el, 'top'); },
        scale: .3, autoAlpha: 0, duration: .7, stagger: .05
      }, .6)
      .fromTo($$('.v3-routes path', s1), { drawSVG: '0% 100%' }, { immediateRender: false, drawSVG: '100% 100%', duration: .5 }, .6)
      .fromTo($$('.v3-ring', s1), { scale: 1, autoAlpha: 1 }, { immediateRender: false, scale: .6, svgOrigin: '430 470', autoAlpha: 0, duration: .7 }, .7)
      .fromTo($('.v3-core', s1), { scale: 1, autoAlpha: 1 }, { immediateRender: false, scale: .45, autoAlpha: 0, duration: .6 }, 1.05)
      .fromTo($('.v3-core-label', s1), { autoAlpha: 1 }, { immediateRender: false, autoAlpha: 0, duration: .3 }, .7)
      .fromTo($('.v3-s1 .v3-spine'), { drawSVG: '0% 100%' }, { immediateRender: false, drawSVG: '100% 100%', duration: .6 }, 1.0)
      .to(stage, { '--key-x': '100%', '--key-y': '34%', '--key-a': .45, '--horizon': '70%', '--floor-a': 1, duration: 1 }, .8)
      .set(s1, { autoAlpha: 0 }, 1.6)

      /* S2 in: the rail draws right → left, milestones arrive along it */
      .to(s2, { autoAlpha: 1, duration: .25 }, 1.2)
      .from($$('.v2-copy--s2 .v2-band > div > *, .v2-copy--s2 .v2-lead', s2), { y: 28, autoAlpha: 0, duration: .5, stagger: .07 }, 1.3)
      .fromTo($('.v2-s2 .v2-spine:not(.v2-spine--todo)'), { drawSVG: '0%' }, { drawSVG: '100%', duration: .9 }, 1.35)
      .from($$('.v2-stage', s2), { autoAlpha: 0, y: '+=18', duration: .35, stagger: .1 }, 1.45)
      .from($('.v2-s2 .v2-spine--todo'), { autoAlpha: 0, duration: .4 }, 2.0)
      .from($$('.v2-divider, .v2-divider-label', s2), { autoAlpha: 0, duration: .3 }, 2.05)
      .from($('.v2-ticket', s2), { autoAlpha: 0, yPercent: -130, duration: .4 }, 2.2)
      .from($('.v2-s2 .v2-leader'), { drawSVG: '0%', duration: .3 }, 2.45)
      .from($$('.v2-facts li', s2), { autoAlpha: 0, y: 12, duration: .3, stagger: .06 }, 2.35)
      .addLabel('s2', 2.75)

      /* S2 → S3: stages give way; columns rise from the floor (right → left) */
      .to($$('.v2-copy--s2 > *', s2), { y: -30, autoAlpha: 0, duration: .45, stagger: .05 }, 3.2)
      .to($$('.v2-stage, .v2-ticket, .v2-divider, .v2-divider-label', s2), { autoAlpha: 0, y: '-=24', duration: .45, stagger: .02 }, 3.2)
      .to($$('.v2-s2 .v2-spine, .v2-s2 .v2-leader'), { autoAlpha: 0, duration: .4 }, 3.4)
      .to(stage, { '--key-x': '62%', '--key-y': '10%', '--key-a': .5, '--horizon': '82%', '--floor-a': 0, duration: 1 }, 3.3)
      .set(s2, { autoAlpha: 0 }, 3.9)
      .to(s3, { autoAlpha: 1, duration: .25 }, 3.55)
      .from($$('.v2-col', s3), { scaleY: 0, transformOrigin: '50% 100%', duration: .5, stagger: .08 }, 3.6)
      .from($$('.v2-col__v', s3), { autoAlpha: 0, duration: .25, stagger: .08 }, 3.85)
      .fromTo($('.v2-s3 .v2-spine'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 1 }, 4.0)
      .from($$('.v2-s3 .v2-callout, .v2-s3 .v2-brackets, .v2-s3 .v2-demo--canvas, .v2-s3 .v2-pulses'), { autoAlpha: 0, duration: .3, stagger: .08 }, 4.5)
      .from($('.v2-s3 .v2-leader'), { drawSVG: '0%', duration: .3 }, 4.5)
      .from($$('.v2-copy--s3 > *:not(.v2-kpis), .v2-kpis > div', s3), { y: 26, autoAlpha: 0, duration: .45, stagger: .07 }, 3.75)
      .add(counter($$('.v2-kpis dd bdi', s3)[0], 38), 3.85)
      .add(counter($$('.v2-kpis dd bdi', s3)[1], 82, '%'), 3.95)
      .add(counter($$('.v2-kpis dd bdi', s3)[2], 12, '%', '+'), 4.05)
      .addLabel('s3', 5.05)

      /* S3 → S4: the skyline condenses into the hub; capabilities connect */
      .to($$('.v2-copy--s3 > *', s3), { y: -30, autoAlpha: 0, duration: .45, stagger: .05 }, 5.5)
      .to($$('.v2-col', s3), { scaleY: 0, transformOrigin: '50% 100%', autoAlpha: 0, duration: .5, stagger: .03 }, 5.5)
      .to($$('.v2-s3 .v2-spine, .v2-s3 .v2-leader, .v2-s3 .v2-callout, .v2-s3 .v2-brackets, .v2-s3 .v2-demo--canvas, .v2-s3 .v2-pulses'), { autoAlpha: 0, duration: .35 }, 5.5)
      .to(stage, { '--key-x': '50%', '--key-y': '-20%', '--key-a': .55, '--horizon': '100%', duration: 1 }, 5.6)
      .set(s3, { autoAlpha: 0 }, 6.2)
      .to(s4, { autoAlpha: 1, duration: .25 }, 5.85)
      .from($('.v2-core--hub', s4), { scale: .35, autoAlpha: 0, duration: .55, ease: 'power2.out' }, 5.9)
      .from($$('.v2-s4 .v2-plate, .v2-s4 .v2-plate-label, .v2-s4 .v2-hub-label, .v2-s4 .v2-brackets'), { autoAlpha: 0, duration: .35, stagger: .05 }, 6.2)
      .from($$('.v2-s4 .v2-routes path'), { drawSVG: '0%', duration: .5, stagger: .05 }, 6.3)
      .from($$('.v2-node--cap', s4), {
        x: function (i, el) { return 720 - px(el, 'left'); }, y: function (i, el) { return 470 - px(el, 'top'); },
        scale: .4, autoAlpha: 0, duration: .55, stagger: .06
      }, 6.35)
      .from($$('.v2-cluster', s4), { autoAlpha: 0, duration: .3, stagger: .05 }, 6.8)
      .fromTo($('.v2-s4 .v2-spine'), { drawSVG: '0%' }, { drawSVG: '100%', duration: .9 }, 6.5)
      .from($('.v2-s4 .v2-pulses'), { autoAlpha: 0, duration: .3 }, 7.1)
      .from($$('.v2-copy--s4 > *, .v2-s4 .v2-disclaimer'), { y: 24, autoAlpha: 0, duration: .45, stagger: .07 }, 6.0)
      .addLabel('s4', 7.4)
      .to({}, { duration: .8 }); // hold at the end of the pin

    /* --- progress nav: native scroll to label positions --- */
    $$('.v4-progress [data-goto]').forEach(function (b) {
      b.addEventListener('click', function () {
        var y = tl.scrollTrigger.labelToScroll(b.getAttribute('data-goto'));
        window.scrollTo({ top: y + 2, behavior: 'smooth' });
      });
    });

    /* --- keyboard focus inside a not-yet-visible scene scrolls it into view --- */
    stage.addEventListener('focusin', function (e) {
      var scene = e.target.closest('.v2-scene, .v3-scene');
      if (!scene || scene.classList.contains('is-active')) return;
      var key = Object.keys(S).filter(function (k) { return S[k] === scene; })[0];
      if (key) window.scrollTo({ top: tl.scrollTrigger.labelToScroll(key) + 2 });
    });

    /* --- scene 5: lights on, content rises, line resolves at the CTA --- */
    var veil = $('.v4-s5__veil', s5);
    var s5tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: s5, start: 'top bottom', end: 'top top', scrub: SCRUB, invalidateOnRefresh: true }
    });
    s5tl.fromTo(veil, { clipPath: 'ellipse(150% 160% at 50% 0%)' }, { clipPath: 'ellipse(62% 31% at 50% 0%)', duration: 1 }, 0)
        .to(veil, { autoAlpha: 0, duration: .25 }, .9)
        .from($$('.v2-copy--s5 > *', s5), { y: 40, autoAlpha: 0, duration: .45, stagger: .06 }, .45)
        .from($('.v2-card', s5), { y: 60, autoAlpha: 0, duration: .5 }, .5)
        .fromTo($('.v2-s5-line path', s5), { drawSVG: '0%' }, { drawSVG: '100%', duration: .45 }, .75)
        .from($$('.v2-s5-line circle', s5), { autoAlpha: 0, scale: 0, transformOrigin: '50% 50%', duration: .15 }, 1.15);

    window.__v4 = { tl: tl, s5tl: s5tl, intro: intro };
    return tl;
  }

  /* ======================================================================
     STACKED MODE (small screens / short screens) with gentle reveals
     ====================================================================== */
  function buildStacked(motion) {
    stage.classList.remove('is-pinned');
    body.classList.toggle('is-motion', false);
    sizeCanvases();
    if (!motion) return;
    /* Scene 1 is never revealed: its headline and CTAs must be visible from the first frame (LCP) */
    $$('.v2-scene', stage).concat([s5]).forEach(function (scene) {
      var items = $$('.v2-copy > *, .v3-copy > *, .v2-s5-grid > *, .v2-m, .v3-m', scene);
      gsap.from(items, { y: 14, autoAlpha: 0, duration: .45, ease: 'power1.out', stagger: .06,
        scrollTrigger: { trigger: scene, start: 'top 82%', once: true } });
    });
  }

  /* ======================================================================
     Media branches
     ====================================================================== */
  var mm = gsap.matchMedia();
  mm.add({
    pinned: '(min-width: 1024px) and (min-height: 640px) and (prefers-reduced-motion: no-preference)',
    stackedMotion: '(max-width: 1023px) and (prefers-reduced-motion: no-preference), (max-height: 639px) and (prefers-reduced-motion: no-preference)',
    reduced: '(prefers-reduced-motion: reduce)'
  }, function (ctx) {
    var c = ctx.conditions;
    if (c.pinned) buildPinned(); else buildStacked(c.stackedMotion && !c.reduced);
    var hdr = headerTrigger(); // after the pin so its start includes the pin's scroll length
    return function () { stage.classList.remove('is-pinned'); body.classList.remove('is-motion'); hdr.kill(); };
  });

  /* Keep geometry right before every refresh (resize, fonts) */
  ScrollTrigger.addEventListener('refreshInit', function () { sizeCanvases(); routeFinale(); });
  routeFinale();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });

  /* ---------------- Prototype QA: ?frame= renders an exact timeline state WITHOUT scrolling ---------------- */
  var frame = params.get('frame');
  if (frame) {
    window.addEventListener('load', function () {
      setTimeout(function () {
        var v = window.__v4; if (!v) return;
        var tl = v.tl, s5tl = v.s5tl;
        var st = document.createElement('style'); st.textContent = '*,*::before,*::after{transition:none!important}'; document.head.appendChild(st); // QA only
        if (v.intro) v.intro.progress(1);
        tl.scrollTrigger.disable(); s5tl.scrollTrigger.disable();       // un-pin; stage sits at the top
        tl.paused(true); s5tl.paused(true);
        if (frame === 's5' || frame === 'next') {
          stage.style.display = 'none'; s5tl.progress(1);
          if (frame === 'next') { s5.style.display = 'none'; }
          header.classList.toggle('is-solid', frame === 'next');
        } else {
          var t = /^s[1-4]$/.test(frame) ? tl.labels[frame] : parseFloat(frame);
          tl.time(t);
          var nm = t < 1.5 ? 's1' : t < 3.75 ? 's2' : t < 6.0 ? 's3' : 's4'; setActive(nm);
        }
        window.scrollTo(0, 0);
        body.setAttribute('data-frame', frame + '@' + tl.time().toFixed(2));
      }, 600);
    });
  }

  /* ---------------- Prototype QA: ?scrolltest=1 scrolls for real and records state (no network) ---------------- */
  if (params.get('scrolltest') === '1') {
    window.addEventListener('load', function () {
      var st = ScrollTrigger.getAll().filter(function (t) { return t.pin === stage; })[0];
      if (!st) { body.setAttribute('data-scrolltest', '{"error":"not pinned"}'); return; }
      var op = function (el) { return el ? +parseFloat(getComputedStyle(el).opacity).toFixed(2) : null; };
      var span = st.end - st.start;
      var stops = [['s1', st.start], ['mid12', st.start + span * .2], ['s2', st.start + span * .4], ['s3', st.start + span * .65],
                   ['s4', st.start + span * .95], ['afterPin', st.end + 200], ['s5', s5.offsetTop + 10],
                   ['next', document.getElementById('after-hero').offsetTop - 60], ['back-to-top', 0]];
      var out = [], i = 0;
      (function step() {
        if (i >= stops.length) { body.setAttribute('data-scrolltest', JSON.stringify(out)); return; }
        var name = stops[i][0], y = Math.round(stops[i][1]);
        window.scrollTo(0, y); ScrollTrigger.update();
        setTimeout(function () {
          var r = stage.getBoundingClientRect();
          out.push({ at: name, y: y, scrollY: Math.round(window.scrollY), stageTop: Math.round(r.top), active: stage.getAttribute('data-active'),
            op: { s1: op(S.s1), s2: op(S.s2), s3: op(S.s3), s4: op(S.s4), node1: op($('.v3-node', S.s1)), h1: op($('.v3-copy--s1 h1', S.s1)) },
            tl: +window.__v4.tl.time().toFixed(2), veil: op($('.v4-s5__veil', s5)), headerSolid: header.classList.contains('is-solid') });
          i++; step();
        }, 1600);
      })();
    });
  }

  /* ---------------- Prototype QA: ?debug=1 writes measurements into data-debug ---------------- */
  if (params.get('debug') === '1') {
    window.addEventListener('load', function () {
      setTimeout(function () {
        var st = ScrollTrigger.getAll().filter(function (t) { return t.pin === stage; })[0];
        var r = stage.getBoundingClientRect();
        var probe = document.createElement('div'); probe.style.cssText = 'position:fixed;top:0;height:100svh;width:1px;visibility:hidden';
        document.body.appendChild(probe);
        body.setAttribute('data-debug', JSON.stringify({
          inner: [innerWidth, innerHeight], client: [doc.clientWidth, doc.clientHeight], svh: probe.offsetHeight,
          scrollH: doc.scrollHeight, pinned: stage.classList.contains('is-pinned'),
          stage: [Math.round(r.top), Math.round(r.height)], st: st ? [Math.round(st.start), Math.round(st.end)] : null,
          triggers: ScrollTrigger.getAll().length, gsap: gsap.version
        }));
      }, 900);
    });
  }

  /* ---------------- Prototype QA: ?at=s1..s4 | s5 | next | 0–1 (fraction of pin) ---------------- */
  var at = params.get('at');
  if (at) {
    window.addEventListener('load', function () {
      setTimeout(function () {
        var st = ScrollTrigger.getAll().filter(function (t) { return t.pin === stage; })[0];
        var y;
        if (/^s[1-4]$/.test(at) && st) y = st.animation.scrollTrigger.labelToScroll(at) + 2;
        else if (at === 's5') y = s5.getBoundingClientRect().top + window.scrollY;
        else if (at === 'next') y = document.getElementById('after-hero').getBoundingClientRect().top + window.scrollY - 72;
        else if (!isNaN(parseFloat(at)) && st) y = st.start + (st.end - st.start) * parseFloat(at);
        if (y != null) { window.scrollTo(0, y); ScrollTrigger.update(); }
      }, 400);
    });
  }
})();
