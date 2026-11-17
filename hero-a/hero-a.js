/* ==========================================================================
   ClickERP · Hero «المدار» · Phase 6 animation (GSAP 3.13.0 + ScrollTrigger)

   Modes (gsap.matchMedia):
   - cinema  : ≥1024px wide, ≥700px tall, motion allowed.
               One pinned stage, one scrubbed (reversible) master timeline.
               The sculpted mark is a single "actor" that travels between the
               scenes; in Scene 5 only its arrow remains and clicks the CTA.
   - simple  : smaller screens. Stacked scenes, one light reveal each.
   - reduce  : prefers-reduced-motion. No motion at all (static storyboard).

   Rules kept: text animates by whole lines/blocks only (never letters);
   content is readable without JS; every scene has a static end state.
   Review aid: ?at=s1…s5 (or a timeline time, e.g. ?at=2.9) jumps there.
   ========================================================================== */
(function () {
  'use strict';
  var gsap = window.gsap, ScrollTrigger = window.ScrollTrigger;
  if (!gsap || !ScrollTrigger) return; // CDN unavailable: static storyboard stays
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  var hero = document.getElementById('hero');
  var header = document.querySelector('.ad-header');
  var scenes = gsap.utils.toArray('.sc', hero);
  var S = scenes.map(function (sc) { return function (sel) { return sc.querySelectorAll(sel); }; });
  var DIR = document.documentElement.dir === 'rtl' ? -1 : 1; // sign for horizontal travel

  var mm = gsap.matchMedia();
  mm.add({
    cinema: '(min-width: 1024px) and (min-height: 700px) and (prefers-reduced-motion: no-preference)',
    small: '(max-width: 1023.98px), (max-height: 699.98px)',
    reduce: '(prefers-reduced-motion: reduce)'
  }, function (ctx) {
    var c = ctx.conditions;
    if (c.reduce) return;
    if (c.cinema) return cinema();
    if (c.small) return simple();
  });

  /* ------------------------------------------------------------------------
     CINEMA
     ------------------------------------------------------------------------ */
  function cinema() {
    var actor = hero.querySelector('.actor');
    var boxes = scenes.map(function (sc) { return sc.querySelector('.mark-box'); });
    var marks = scenes.map(function (sc) { return sc.querySelector('.mark'); });
    var anchor = hero.querySelector('.s5__anchor');
    var s5arrow = hero.querySelector('.s5__arrow');
    var hub = hero.querySelector('.s3__hub');
    var geo = [], tip = { x: 0, y: 0 };

    hero.classList.add('is-pinned');
    header.classList.add('is-fixed');
    scenes[0].classList.add('is-current');

    // Where the mark sits in each scene, relative to the pinned stage.
    function measure() {
      var h = hero.getBoundingClientRect();
      geo = boxes.map(function (b) {
        if (!b) return null;
        var r = b.getBoundingClientRect();
        return { x: r.left - h.left, y: r.top - h.top, s: r.width / 1000, w: r.width };
      });
      var a = anchor.getBoundingClientRect();
      var k = parseFloat(getComputedStyle(s5arrow).width) / 290; // CSS width (unaffected by GSAP scale); viewBox is 290 units
      tip = { x: a.left - h.left - 16 + 20 * k, y: a.top - h.top - 16 + 20 * k, k: k };
    }
    measure();
    ScrollTrigger.addEventListener('refreshInit', measure);

    var G = function (i, key) { return function () { return geo[i][key]; }; };

    // ---- initial states (only in cinema mode; reverted by matchMedia) ----
    // Centred chips/cards: hand the -50% centring to GSAP so x/y tweens keep it.
    gsap.set(hero.querySelectorAll('.s1__visual .chip, .s2__panel .chip, .s4__land .chip, .dept'), { xPercent: -50, yPercent: -50, x: 0, y: 0 });
    gsap.set(scenes.slice(1), { opacity: 0 });
    gsap.set(marks.slice(1).filter(Boolean), { opacity: 0 }); // each scene's mark appears only when the actor lands
    gsap.set(actor, { x: G(0, 'x'), y: G(0, 'y'), scale: G(0, 's'), opacity: 0 });
    gsap.set(S[2]('.ring'), { strokeDasharray: 1, strokeDashoffset: 1 });

    var bounds = [1.5, 3.4, 5.1, 6.4]; // timeline times where the current scene changes
    var current = 0;
    var tl = gsap.timeline({
      defaults: { ease: 'none', duration: 0.5 },
      scrollTrigger: {
        trigger: hero, pin: true, scrub: 1, start: 'top top',
        end: function () { return '+=' + Math.round(window.innerHeight * 6); },
        invalidateOnRefresh: true
      },
      onUpdate: function () { setCurrent(tl.time()); } // fires as the smoothed timeline renders, not just on scroll
    });

    function out(els, at, opts) { tl.to(els, Object.assign({ opacity: 0, y: -24, stagger: 0.05, duration: 0.4 }, opts || {}), at); }
    function into(els, at, opts) { tl.fromTo(els, { opacity: 0, y: 28 }, Object.assign({ opacity: 1, y: 0, stagger: 0.07, duration: 0.45, ease: 'power1.out' }, opts || {}), at); }
    function copy(i) { return S[i]('.eyebrow, .title > span, .lead'); }
    function handoff(from, to, t0, t1) {
      tl.set(marks[from], { opacity: 0 }, t0)
        .set(actor, { opacity: 1, x: G(from, 'x'), y: G(from, 'y'), scale: G(from, 's') }, t0)
        .to(actor, { x: G(to, 'x'), y: G(to, 'y'), scale: G(to, 's'), duration: t1 - t0, ease: 'power2.inOut' }, t0)
        .set(marks[to], { opacity: 1 }, t1)
        .set(actor, { opacity: 0 }, t1);
    }
    function layers(from, to, t) {
      tl.to(scenes[to], { opacity: 1, duration: 0.5 }, t + 0.1)
        .to(scenes[from], { opacity: 0, duration: 0.5 }, t + 0.45);
    }

    tl.addLabel('s1', 0);

    /* ---- S1 → S2 : the orbits tangle, the work scatters, then resolves ---- */
    var t = 0.5;
    out(copy(0), t);
    out(S[0]('.ctas'), t);
    tl.to(S[0]('.chip'), {
      opacity: 0, rotation: function (i) { return (i % 2 ? 1 : -1) * (8 + i * 2); },
      x: function (i) { return DIR * (i % 2 ? 1 : -1) * (60 + i * 18); },
      y: function (i) { return (i % 3 - 1) * 70; }, duration: 0.6, stagger: 0.03
    }, t);
    tl.to(S[0]('.ob'), { rotation: function (i) { return [38, -52, 64][i % 3]; }, svgOrigin: '500 500', opacity: 0, duration: 0.8 }, t);
    tl.to(S[0]('.proof, .s1-pulse'), { opacity: 0, y: 30, duration: 0.4 }, t);
    layers(0, 1, t);
    handoff(0, 1, t, t + 1);
    into(copy(1), t + 0.4);
    tl.fromTo(S[1]('.chaos'), { opacity: 0, rotation: -30, scale: 0.7, svgOrigin: '320 220' },
      { opacity: 1, rotation: 0, scale: 1, svgOrigin: '320 220', duration: 0.6 }, t + 0.4);
    tl.fromTo(S[1]('.chip--warn'), { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, stagger: 0.05, duration: 0.4 }, t + 0.55);
    tl.fromTo(S[1]('.s2__label'), { opacity: 0 }, { opacity: 1, duration: 0.3 }, t + 0.5);
    // the resolve: seam, then calm rings radiate from the settled mark
    var r = 1.5;
    tl.fromTo(S[1]('.s2__seam'), { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.3 }, r);
    tl.fromTo(S[1]('.calm-rings circle'), { opacity: 0, scale: 0.4, svgOrigin: '320 220' }, { opacity: 1, scale: 1, svgOrigin: '320 220', stagger: 0.08, duration: 0.45 }, r + 0.1);
    tl.fromTo(S[1]('.chip--live, .calm-dots'), { opacity: 0, x: DIR * -20 }, { opacity: 1, x: 0, stagger: 0.07, duration: 0.35 }, r + 0.3);
    tl.to(S[1]('.chip--warn, .chaos, .chaos-dots'), { opacity: 0.35, duration: 0.4 }, r + 0.2);
    tl.addLabel('s2', 2.25);

    /* ---- S2 → S3 : calm rings expand into the department ring ---- */
    t = 2.6;
    out(copy(1), t);
    tl.to(S[1]('.s2__label, .s2__seam, .chip, .chaos, .chaos-dots, .calm-dots'), { opacity: 0, duration: 0.35 }, t);
    tl.to(S[1]('.calm-rings circle'), { scale: 1.9, opacity: 0, svgOrigin: '320 220', stagger: 0.05, duration: 0.6 }, t);
    layers(1, 2, t);
    handoff(1, 2, t, t + 1);
    into(copy(2), t + 0.4);
    tl.to(S[2]('.ring'), { strokeDashoffset: 0, duration: 0.6 }, t + 0.45);
    tl.fromTo(S[2]('.s3-inner'), { opacity: 0, scale: 0.6, svgOrigin: '500 270' }, { opacity: 1, scale: 1, svgOrigin: '500 270', duration: 0.5 }, t + 0.5);
    tl.fromTo(S[2]('.spokes'), { opacity: 0, scale: 0.2, svgOrigin: '500 270' }, { opacity: 1, scale: 1, svgOrigin: '500 270', duration: 0.5 }, t + 0.8);
    tl.fromTo(S[2]('.dept'), { opacity: 0, scale: 0.7 }, { opacity: function (i, el) { return el.classList.contains('dept--back') ? 0.72 : 1; }, scale: 1, stagger: 0.06, duration: 0.4 }, t + 0.85);
    tl.fromTo(S[2]('.s3-pulses'), { opacity: 0 }, { opacity: function (i) { return i ? 0.2 : 1; }, duration: 0.3 }, t + 1.2);
    tl.addLabel('s3', 3.95);

    /* ---- S3 → S4 : the ring flattens into the ground, dawn rises ---- */
    t = 4.25;
    out(copy(2), t);
    tl.to(S[2]('.dept'), {
      opacity: 0, scale: 0.5, duration: 0.5,
      x: function (i, el) { return hub.clientWidth * (0.5 - parseFloat(el.style.left) / 100) * 0.8; },
      y: function (i, el) { return hub.clientHeight * (0.5 - parseFloat(el.style.top) / 100) * 0.8; }
    }, t);
    tl.to(S[2]('.ring, .s3-inner, .spokes, .s3-pulses'), { scaleY: 0.12, opacity: 0, svgOrigin: '500 300', duration: 0.6 }, t);
    layers(2, 3, t);
    handoff(2, 3, t, t + 1);
    into(copy(3), t + 0.45);
    tl.fromTo(S[3]('.horizon'), { scaleX: 0, opacity: 0, svgOrigin: '720 109' }, { scaleX: 1, opacity: function (i) { return i ? 0.12 : 1; }, svgOrigin: '720 109', duration: 0.6 }, t + 0.35);
    tl.fromTo(S[3]('.ground ellipse'), { scale: 0.3, opacity: 0, svgOrigin: '440 214' }, { scale: 1, opacity: 1, svgOrigin: '440 214', stagger: 0.05, duration: 0.5 }, t + 0.5);
    tl.fromTo(S[3]('.reflect'), { opacity: 0 }, { opacity: 0.35, duration: 0.3 }, t + 1);
    tl.fromTo(S[3]('.s4__land .chip, .pins'), { opacity: 0, y: 26 }, { opacity: function (i, el) { return parseFloat(el.getAttribute('opacity')) || 1; }, y: 0, stagger: 0.06, duration: 0.4, ease: 'power1.out' }, t + 0.8);
    tl.fromTo(S[3]('.s4__note'), { opacity: 0 }, { opacity: 1, duration: 0.3 }, t + 1.1);
    tl.addLabel('s4', 5.6);

    /* ---- S4 → S5 : the mark dissolves; its arrow clicks the CTA ---- */
    t = 5.9;
    out(copy(3), t);
    tl.to(S[3]('.s4__land .chip, .pins, .s4__note'), { opacity: 0, y: 20, duration: 0.35 }, t);
    tl.to(S[3]('.ground, .horizon, .reflect'), { opacity: 0, duration: 0.4 }, t + 0.1);
    tl.set(marks[3], { opacity: 0 }, t)
      .set(actor, { opacity: 1, x: G(3, 'x'), y: G(3, 'y'), scale: G(3, 's') }, t)
      .to(actor, { opacity: 0, scale: function () { return geo[3].s * 1.12; }, duration: 0.22 }, t); // dissolve fast: the arrow takes over
    tl.to(scenes[4], { opacity: 1, duration: 0.3 }, t);
    tl.to(scenes[3], { opacity: 0, duration: 0.4 }, t + 0.3);
    tl.fromTo(s5arrow, {
      x: function () { return geo[3].x + 0.508 * geo[3].w - tip.x; },
      y: function () { return geo[3].y + 0.508 * geo[3].w - tip.y; },
      scale: function () { return (0.24 * geo[3].w) / (240 * tip.k); },
      opacity: 1, transformOrigin: function () { return (20 * tip.k) + 'px ' + (20 * tip.k) + 'px'; }
    }, { x: 0, y: 0, scale: 1, opacity: 1, duration: 0.8, ease: 'power2.inOut' }, t + 0.05);
    into(copy(4), t + 0.35);
    // Fade the buttons, not .ctas: the flying arrow lives inside .ctas. Opacity only, so the arrow anchor stays measurable.
    tl.fromTo(S[4]('.ctas .ad-btn'), { opacity: 0 }, { opacity: 1, stagger: 0.08, duration: 0.35 }, t + 0.55);
    tl.fromTo(S[4]('.s5__ripples circle'), { opacity: 0, scale: 0.15, svgOrigin: '0 0' }, { opacity: 1, scale: 1, svgOrigin: '0 0', stagger: 0.04, duration: 0.5, ease: 'power1.out' }, t + 0.8);
    tl.fromTo(S[4]('.s5__assure'), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.3 }, t + 1.05);
    tl.addLabel('s5', 7.25).set({}, {}, 7.4);

    /* ---- current scene: pointer events, focus, rail ---- */
    function setCurrent(time) {
      var i = 0; while (i < bounds.length && time >= bounds[i]) i++;
      if (i === current) return;
      scenes[current].classList.remove('is-current');
      scenes[i].classList.add('is-current');
      current = i;
    }
    function go(i, smooth) {
      var y = tl.scrollTrigger.labelToScroll('s' + (i + 1));
      window.scrollTo({ top: y, behavior: smooth ? 'smooth' : 'auto' });
    }
    // Keyboard: focusing something in a hidden scene brings that scene forward.
    function onFocus(e) {
      var sc = e.target.closest && e.target.closest('.sc');
      var i = scenes.indexOf(sc);
      if (i > -1 && i !== current) go(i, false);
    }
    // Rail chapters and in-hero anchors jump to their scene.
    function onClick(e) {
      var item = e.target.closest('.rail__item');
      if (item) { go(Array.prototype.indexOf.call(item.parentNode.querySelectorAll('.rail__item'), item), true); return; }
      var a = e.target.closest('a[href^="#scene-"]');
      if (a) { e.preventDefault(); go(parseInt(a.getAttribute('href').slice(7), 10) - 1, true); }
    }
    hero.addEventListener('focusin', onFocus);
    document.addEventListener('click', onClick);

    /* ---- header turns solid once the hero has played out ---- */
    var headerST = ScrollTrigger.create({
      start: function () { return tl.scrollTrigger.end - 1; },
      onEnter: function () { header.classList.add('is-solid'); },
      onLeaveBack: function () { header.classList.remove('is-solid'); }
    });

    /* ---- load intro (time-based, ≤1.2 s; headline is visible from frame 0) ---- */
    if (window.scrollY < 10) {
      var paths = S[0]('.ob path');
      gsap.set(paths, { strokeDasharray: 1 });
      gsap.from(paths, { strokeDashoffset: 1, duration: 1.2, ease: 'power2.out', stagger: 0.08 });
      gsap.from(S[0]('.chip'), { scale: 0.6, duration: 0.8, ease: 'back.out(1.6)', stagger: 0.06, delay: 0.2 });
      gsap.from(S[0]('.proof'), { yPercent: 40, duration: 0.9, ease: 'power2.out', delay: 0.5 });
    }

    reviewJump(tl);

    return function cleanup() {
      ScrollTrigger.removeEventListener('refreshInit', measure);
      hero.removeEventListener('focusin', onFocus);
      document.removeEventListener('click', onClick);
      headerST.kill();
      hero.classList.remove('is-pinned');
      header.classList.remove('is-fixed', 'is-solid');
      scenes.forEach(function (sc) { sc.classList.remove('is-current'); });
    };
  }

  /* ------------------------------------------------------------------------
     SIMPLE (small screens): one light reveal per scene, no pin, no scrub
     ------------------------------------------------------------------------ */
  function simple() {
    scenes.slice(1).forEach(function (sc) {
      var items = sc.querySelectorAll('.eyebrow, .title > span, .lead, .ctas, .s2__panel, .s2__seam, .s3__hub, .s4__list, .s4__land, .s5__assure');
      gsap.from(items, {
        opacity: 0, y: 12, duration: 0.6, ease: 'power1.out', stagger: 0.06,
        scrollTrigger: { trigger: sc, start: 'top 80%', once: true }
      });
    });
  }

  /* ------------------------------------------------------------------------
     Review aid: ?at=s3 or ?at=2.9 scrolls the pinned timeline there.
     ------------------------------------------------------------------------ */
  function reviewJump(tl) {
    var q = new URLSearchParams(location.search), at = q.get('at');
    if (!at) return;
    var time = /^s[1-5]$/.test(at) ? tl.labels[at] : parseFloat(at);
    if (isNaN(time)) return;
    var jump = function () {
      var st = tl.scrollTrigger;
      window.scrollTo(0, st.start + (st.end - st.start) * (time / tl.duration()));
      ScrollTrigger.update();
      var sc = st.getTween && st.getTween(); if (sc) sc.progress(1); // skip the scrub smoothing for review links
    };
    setTimeout(jump, 50); // jump now, and again after load (ScrollTrigger re-measures on load)
    if (document.readyState !== 'complete') window.addEventListener('load', function () { setTimeout(jump, 50); });
  }
})();
