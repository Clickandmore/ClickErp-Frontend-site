/* ==========================================================================
   ClickERP prototype · Hero D + A «لحظات حقيقية» · scroll engine (GSAP 3.15.1)
   - ONE pinned, scrubbed, reversible timeline (labels s1–s5)
   - Direction D: real photos in a single morphing frame
     (lens → card → full bleed → cross-fades), light page opens from the ring
   - Direction A: the green ribbon is DRAWN BY THE CURSOR (the logo arrowhead)
     and connects every chapter; ribbon geometry is measured from the DOM
   - Native scrolling only. gsap.matchMedia: pinned (≥1024×640 + motion) ·
     reveal (smaller screens + motion) · reduced motion = static stacked page
   - Arabic is never split into letters: words / lines only
   ========================================================================== */
(() => {
  'use strict';

  const params = new URLSearchParams(location.search);
  const body = document.body;
  const stage = document.getElementById('hd-stage');
  const header = document.querySelector('.c-header');
  const SCRUB = params.get('scrolltest') === '1' ? true : 1; // QA: deterministic scrub

  if (!window.gsap || !window.ScrollTrigger) { body.classList.add('no-gsap'); return; } // stays stacked & readable
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const NS = 'http://www.w3.org/2000/svg';
  const S = [1, 2, 3, 4, 5].map((n) => $('.hd-s' + n, stage));
  const L = {
    bg: $('.hd-bg', stage), shade: $('.hd-shade', stage), frame: $('.hd-frame', stage),
    imgs: $$('.hd-frame img', stage), scrim3: $('.hd-scrim--3', stage), scrim4: $('.hd-scrim--4', stage),
    light: $('.hd-light', stage), lens: $('.hd-slot--lens', stage), card: $('.hd-slot--card', stage),
    svg: $('.hd-lines', stage), cursor: $('.hd-cursor', stage), hint: $('.hd-scrollhint', stage),
  };
  const NAVY = '#1B2740';
  const GREEN = '#87BF4E';
  let current = null; // the pinned timeline

  /* ---------------- helpers ---------------- */
  function splitWords() {
    $$('.hd-title .hd-line', stage).forEach((line) => {
      if (line.dataset.split) return;
      line.dataset.split = '1';
      Array.from(line.childNodes).forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((t) => {
            if (!t) return;
            if (/^\s+$/.test(t)) { frag.appendChild(document.createTextNode(t)); return; }
            const w = document.createElement('span'); w.className = 'hd-w'; w.textContent = t; frag.appendChild(w);
          });
          line.replaceChild(frag, n);
        } else if (n.nodeType === 1) {
          n.classList.add('hd-w'); // the highlight chip moves as one unit
        }
      });
    });
  }

  function rel(el) {
    const r = el.getBoundingClientRect(), s = stage.getBoundingClientRect();
    const x = r.left - s.left, y = r.top - s.top;
    return { x, y, w: r.width, h: r.height, cx: x + r.width / 2, cy: y + r.height / 2, r: x + r.width, b: y + r.height };
  }

  // Catmull-Rom → cubic Bézier through points
  function spline(pts) {
    let d = `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
      const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
      d += ` C${c1.x.toFixed(1)} ${c1.y.toFixed(1)} ${c2.x.toFixed(1)} ${c2.y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return d;
  }

  function mk(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    Object.keys(attrs).forEach((k) => e.setAttribute(k, attrs[k]));
    (parent || L.svg).appendChild(e);
    return e;
  }

  function stroke(el) { // prepare a path/circle for dash drawing
    const len = el.getTotalLength();
    el.style.strokeDasharray = `${len} ${len}`;
    el.style.strokeDashoffset = len;
    return { el, len };
  }

  function syncUI(t) {
    setActive(t < 1.3 ? 0 : t < 3.7 ? 1 : t < 5.8 ? 2 : t < 8.2 ? 3 : 4);
    const paper = t >= 8.5; // only once the light page has fully opened
    header.classList.toggle('is-solid', paper);
    stage.classList.toggle('on-paper', paper);
  }

  function setActive(i) {
    $$('.hd-progress [data-goto]', stage).forEach((b, k) => {
      if (k === i) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    });
  }

  /* ======================================================================
     PINNED MODE
     ====================================================================== */
  function buildPinned(allowIntro) {
    stage.classList.add('is-pinned');
    body.classList.add('is-motion');
    splitWords();

    /* ---- measure the resting layout (before any transform) ---- */
    const W = stage.clientWidth, H = stage.clientHeight;
    const lens = rel(L.lens), card = rel(L.card);
    const stepEls = $$('.hd-s2 .hd-step', stage);
    const dotEls = $$('.hd-s2 .hd-step__dot', stage);
    const dots = dotEls.map(rel);
    const kpiEls = $$('.hd-s3 .hd-kpi', stage);
    const kpis = kpiEls.map((el) => ({ el, ...rel(el) })).sort((a, b) => b.cy - a.cy); // bottom → top
    const ctaR = rel($('.hd-s5 .c-btn--primary', stage));
    const orbitEls = $$('.hd-s4 .hd-orbit li', stage);
    const s5Fig = $('.hd-s5 .hd-media', stage);
    const marks = S.map((s) => $('.hd-mark', s));
    const copies = S.map((s) => $('.hd-copy', s));

    // Riyadh tower centre inside the cover-fitted d4 photo (1536×864, tower ≈ 58.5% / 40%)
    const sc = Math.max(W / 1536, H / 864);
    const cx = W / 2 + (0.585 - 0.5) * 1536 * sc;
    const cy = H / 2 + (0.40 - 0.5) * 864 * sc;
    const R = [0.11, 0.2, 0.3].map((f) => f * H);

    // stakeholder chips on the orbits (kept clear of the S4 copy at the bottom)
    const ang = [-60, 205, -8, 160, -122], rad = [R[2], R[2], R[1], R[1], R[2]];
    orbitEls.forEach((li, k) => {
      const a = ang[k] * Math.PI / 180;
      const x = Math.min(W - 110, Math.max(110, cx + Math.cos(a) * rad[k]));
      const y = Math.min(H - 330, Math.max(120, cy + Math.sin(a) * rad[k]));
      li.style.left = `${x.toFixed(1)}px`; li.style.top = `${y.toFixed(1)}px`;
    });

    /* ---- build the ribbon & rings (CSS-pixel coordinates) ---- */
    L.svg.textContent = '';
    // no viewBox: the drawing stays in CSS pixels even if the stage height changes later (no rescaling)
    L.svg.removeAttribute('viewBox');
    L.svg.setAttribute('width', W); L.svg.setAttribute('height', H);
    const lc = { x: lens.cx, y: lens.cy }, lr = lens.w / 2;
    const g1 = mk('g', {});
    const ringMain = stroke(mk('circle', { class: 'hd-ring', cx: lc.x, cy: lc.y, r: lr + 2, 'stroke-width': 3 }, g1));
    const ringEcho = [mk('circle', { class: 'hd-ring', cx: lc.x, cy: lc.y, r: lr * 1.14, 'stroke-width': 1.5, opacity: .35 }, g1),
      mk('circle', { class: 'hd-ring', cx: lc.x, cy: lc.y, r: lr * 1.3, 'stroke-width': 1.2, opacity: .16 }, g1)];
    const a0 = -35 * Math.PI / 180;
    const p0 = { x: lc.x + Math.cos(a0) * (lr + 3), y: lc.y + Math.sin(a0) * (lr + 3) };
    const pulse = mk('circle', { class: 'hd-pulse', cx: p0.x, cy: p0.y, r: 4, opacity: 0 });

    const d1 = { x: dots[0].cx, y: dots[0].cy }, d5 = { x: dots[dots.length - 1].cx, y: dots[dots.length - 1].cy };
    // route through the gutter between the card and the copy, then enter the first dot from the side
    const copy2 = rel(copies[1]);
    const gx = (card.r + copy2.x) / 2;
    const seg1 = stroke(mk('path', { class: 'hd-ribbon', d: spline([p0, { x: gx, y: Math.max(p0.y + 40, card.y + 60) }, { x: gx, y: d1.y - 36 }, { x: (gx + d1.x) / 2, y: d1.y - 4 }, d1]) }));
    const seg2 = stroke(mk('path', { class: 'hd-ribbon', d: `M${d1.x} ${d1.y} L${d5.x} ${d5.y}` }));

    const A = kpis.map((k) => ({ x: k.x - 22, y: k.cy }));
    const top = kpis[kpis.length - 1];
    const E3 = { x: top.r + 20, y: top.y - 22 };
    const seg3 = stroke(mk('path', { class: 'hd-ribbon', d: spline([d5, { x: (d5.x + A[0].x) / 2, y: d5.y + 24 }, ...A, { x: top.cx, y: top.y - 40 }, E3]) }));

    const g4 = mk('g', {});
    const rings4 = R.map((r, k) => stroke(mk('circle', { class: 'hd-ring', cx, cy, r, 'stroke-width': k === 0 ? 2.5 : 1.5, opacity: [0.95, 0.55, 0.3][k] }, g4)));
    const outer = mk('circle', { class: 'hd-ring', cx, cy, r: R[2], 'stroke-width': 2, opacity: 0 });
    const rs = { x: cx + R[1], y: cy };
    const seg4 = stroke(mk('path', { class: 'hd-ribbon', d: spline([E3, { x: (E3.x + rs.x) / 2 + 30, y: (E3.y + rs.y) / 2 - 30 }, rs]) +
      ` A${R[1]} ${R[1]} 0 1 1 ${cx - R[1]} ${cy} A${R[1]} ${R[1]} 0 1 1 ${rs.x} ${rs.y}` }));

    const cp = { x: ctaR.r + 12, y: ctaR.cy };
    const fig5 = rel(s5Fig);
    const s5p = { x: Math.min(W - 48, cp.x + 380), y: fig5.y - 22 };
    const seg5 = stroke(mk('path', { class: 'hd-ribbon', d: spline([s5p, { x: cp.x + 170, y: cp.y + 44 }, { x: cp.x + 46, y: cp.y + 8 }, cp]) })); // sweeps in from the right, lands on the CTA
    const ctaPulse = mk('circle', { class: 'hd-pulse', cx: cp.x, cy: cp.y, r: 6, opacity: 0, style: `stroke:${GREEN}` });

    /* ---- cursor follows whatever ribbon is being drawn ---- */
    const tip = (L.cursor.offsetWidth || 44) * (10 / 120);
    const place = (pt) => gsap.set(L.cursor, { x: pt.x - tip, y: pt.y - tip });
    function draw(tl, sg, dur, at) {
      const o = { p: 0 };
      tl.to(o, {
        p: 1, duration: dur, ease: 'none',
        onUpdate() { const l = sg.len * o.p; sg.el.style.strokeDashoffset = sg.len - l; place(sg.el.getPointAtLength(l)); },
      }, at);
    }

    /* ---- initial pinned state ---- */
    const intro = allowIntro && window.scrollY < 40 && !params.get('at') && !params.get('frame');
    gsap.set(L.frame, { left: lens.x, top: lens.y, width: lens.w, height: lens.h, borderRadius: lens.w / 2, clipPath: intro ? 'circle(0% at 50% 50%)' : 'circle(50% at 50% 50%)' });
    gsap.set(L.imgs.slice(1), { autoAlpha: 0 });
    gsap.set([L.scrim3, L.scrim4], { autoAlpha: 0 });
    gsap.set(L.light, { clipPath: `circle(0px at ${cx}px ${cy}px)` });
    gsap.set(S.slice(1), { autoAlpha: 0 });
    gsap.set(stepEls, { opacity: .4 });
    gsap.set(dotEls, { scale: .75, backgroundColor: 'rgba(255,255,255,.35)' });
    gsap.set(kpiEls, { autoAlpha: 0, scale: .86 });
    gsap.set(orbitEls, { xPercent: -50, yPercent: -50, autoAlpha: 0, scale: .85 });
    gsap.set(marks.slice(1, 4), { '--mk': 0, color: '#FFFFFF' });
    gsap.set(marks[4], { '--mk': 0 });
    gsap.set(s5Fig, { y: 80, autoAlpha: 0 });
    if (!intro) { ringMain.el.style.strokeDashoffset = 0; place(p0); }
    setActive(0);

    /* ---- intro (time-based, at the top only; the headline stays readable) ---- */
    if (intro) {
      gsap.set(L.cursor, { x: p0.x + 160 - tip, y: p0.y + 200 - tip, autoAlpha: 0 });
      gsap.set(marks[0], { '--mk': 0, color: '#FFFFFF' });
      gsap.timeline({ delay: .2, defaults: { ease: 'power2.out' } })
        .to(ringMain.el, { strokeDashoffset: 0, duration: 1.1, ease: 'power2.inOut' }, 0)
        .from(ringEcho, { opacity: 0, duration: 1 }, .2)
        .from($$('.hd-w', S[0]), { yPercent: 35, opacity: .3, duration: .7, stagger: .06 }, .2)
        .from([$('.hd-eyebrow', S[0]), $('.hd-lead', S[0]), $('.hd-ctas', S[0]), $('.hd-proof', S[0])].filter(Boolean), { y: 16, autoAlpha: 0, duration: .6, stagger: .1 }, .5)
        .to(L.cursor, { x: p0.x - tip, y: p0.y - tip, autoAlpha: 1, duration: .9, ease: 'power3.out' }, .4)
        .to(L.cursor, { scale: .82, duration: .12, yoyo: true, repeat: 1, ease: 'power1.inOut' }, 1.3)
        .fromTo(pulse, { attr: { r: 4 }, opacity: .9 }, { attr: { r: 40 }, opacity: 0, duration: .7 }, 1.35)
        .to(L.frame, { clipPath: 'circle(50% at 50% 50%)', duration: 1.1, ease: 'power3.out' }, 1.35)
        .to(marks[0], { '--mk': 1, color: NAVY, duration: .6 }, 1.6);
    }

    /* ---- the scrubbed story ---- */
    const tl = gsap.timeline({
      defaults: { ease: 'power2.inOut' },
      // UI (progress + header) follows the timeline itself, so it stays correct while the
      // scrub keeps easing after the scroll has stopped (ScrollTrigger.onUpdate only fires on scroll)
      onUpdate() { syncUI(this.time()); },
      scrollTrigger: {
        trigger: stage, start: 'top top', end: '+=480%', pin: true, scrub: SCRUB, anticipatePin: 1,
      },
    });
    current = tl;
    tl.addLabel('s1', 0);
    tl.to(L.hint, { autoAlpha: 0, duration: .3 }, .05);

    // 1 → 2 · the lens becomes the contract card; the cursor draws to the journey
    tl.fromTo(L.frame, { clipPath: 'circle(50% at 50% 50%)' }, { clipPath: 'circle(75% at 50% 50%)', duration: .01, immediateRender: false }, .5)
      .to(copies[0], { autoAlpha: 0, y: -40, duration: .5 }, .5)
      .to(g1, { autoAlpha: 0, duration: .4 }, .5)
      .to(L.frame, { left: card.x, top: card.y, width: card.w, height: card.h, borderRadius: 28, duration: 1 }, .5)
      .to(L.imgs[1], { autoAlpha: 1, duration: .6 }, .8)
      .to([L.bg, L.shade], { autoAlpha: 0, duration: .8 }, .6)
      .set(S[0], { autoAlpha: 0 }, 1.0)
      .set(S[1], { autoAlpha: 1 }, 1.0)
      .fromTo(copies[1], { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: .6 }, 1.0);
    draw(tl, seg1, 1, .5);
    tl.addLabel('s2', 1.6);
    draw(tl, seg2, 1.2, 1.6);
    stepEls.forEach((st, k) => {
      const t = 1.6 + 1.2 * k / (stepEls.length - 1);
      tl.to(st, { opacity: 1, duration: .15 }, t).to(dotEls[k], { scale: 1, backgroundColor: GREEN, duration: .15 }, t);
    });
    tl.to(marks[1], { '--mk': 1, color: NAVY, duration: .4 }, 2.7);

    // 2 → 3 · the card opens to full bleed; the ribbon loops through the KPIs
    tl.to(copies[1], { autoAlpha: 0, y: -40, duration: .5 }, 3.3)
      .to([seg1.el, seg2.el], { opacity: 0, duration: .5 }, 3.4)
      .to(L.frame, { left: 0, top: 0, width: W, height: H, borderRadius: 0, duration: 1 }, 3.3)
      .to(L.imgs[2], { autoAlpha: 1, duration: .6 }, 3.55)
      .to(L.scrim3, { autoAlpha: 1, duration: .6 }, 3.8)
      .set(S[1], { autoAlpha: 0 }, 3.8)
      .set(S[2], { autoAlpha: 1 }, 3.8)
      .fromTo(copies[2], { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: .6 }, 4.0);
    draw(tl, seg3, 1.1, 3.9);
    kpis.forEach((k, i) => tl.to(k.el, { autoAlpha: 1, scale: 1, duration: .25, ease: 'back.out(2)' }, 3.9 + 1.1 * (i + 1) / (kpis.length + 1.5)));
    tl.to(marks[2], { '--mk': 1, color: NAVY, duration: .4 }, 4.6);
    tl.addLabel('s3', 5.0);

    // 3 → 4 · Riyadh; the ribbon wraps the skyline and the rings become orbits
    tl.to(copies[2], { autoAlpha: 0, y: -40, duration: .5 }, 5.4)
      .to(kpiEls, { autoAlpha: 0, scale: .9, duration: .4, stagger: .05 }, 5.4)
      .to(seg3.el, { opacity: 0, duration: .5 }, 5.6)
      .to(L.imgs[3], { autoAlpha: 1, duration: .8 }, 5.4)
      .to(L.scrim3, { autoAlpha: 0, duration: .6 }, 5.5)
      .to(L.scrim4, { autoAlpha: 1, duration: .6 }, 5.5)
      .set(S[2], { autoAlpha: 0 }, 5.9)
      .set(S[3], { autoAlpha: 1 }, 5.9);
    rings4.forEach((rg, k) => tl.to(rg.el, { strokeDashoffset: 0, duration: .8, ease: 'power2.out' }, 5.7 + k * .12));
    draw(tl, seg4, 1.3, 5.6);
    tl.to(orbitEls, { autoAlpha: 1, scale: 1, duration: .35, stagger: .12, ease: 'back.out(1.8)' }, 6.1)
      .fromTo(copies[3], { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: .6 }, 6.3)
      .to(marks[3], { '--mk': 1, color: NAVY, duration: .4 }, 6.7);
    tl.addLabel('s4', 7.0);

    // 4 → 5 · the ring opens into the light page; the cursor clicks the CTA
    const far = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)) * 1.12 + 24;
    tl.to(copies[3], { autoAlpha: 0, y: -30, duration: .4 }, 7.4)
      .fromTo(L.light, { clipPath: `circle(0px at ${cx}px ${cy}px)` }, { clipPath: `circle(${far}px at ${cx}px ${cy}px)`, duration: 1.2, ease: 'power2.in', immediateRender: false }, 7.4) // explicit ends: computed clip-path comes back in %
      .fromTo(outer, { attr: { r: R[2] }, opacity: .8 }, { attr: { r: far }, opacity: .8, duration: 1.2, ease: 'power2.in', immediateRender: false }, 7.4)
      .to(outer, { opacity: 0, duration: .3 }, 8.6)
      .to([g4, seg4.el], { autoAlpha: 0, duration: .5 }, 7.8)
      .to(orbitEls, { autoAlpha: 0, duration: .4 }, 7.8)
      .set(S[3], { autoAlpha: 0 }, 8.1)
      .set(S[4], { autoAlpha: 1 }, 8.1)
      .fromTo(copies[4], { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: .6 }, 8.1)
      .to(s5Fig, { y: 0, autoAlpha: 1, duration: .7 }, 8.3);
    tl.to(L.cursor, { autoAlpha: 0, duration: .3 }, 7.5)
      .set(L.cursor, { x: s5p.x - tip, y: s5p.y - tip }, 8.35)
      .to(L.cursor, { autoAlpha: 1, duration: .2 }, 8.35);
    draw(tl, seg5, .8, 8.4);
    tl.to(marks[4], { '--mk': 1, duration: .4 }, 8.7)
      .to(L.cursor, { scale: .82, duration: .1, yoyo: true, repeat: 1 }, 9.2)
      .fromTo(ctaPulse, { attr: { r: 6 }, opacity: .9 }, { attr: { r: 48 }, opacity: 0, duration: .5, ease: 'power1.out', immediateRender: false }, 9.25);
    tl.addLabel('s5', 9.8);
    tl.to({}, { duration: .3 }, 9.8); // short hold before the page continues

    return tl;
  }

  function cleanupPinned() {
    stage.classList.remove('is-pinned', 'on-paper');
    body.classList.remove('is-motion');
    header.classList.remove('is-solid');
    L.svg.textContent = '';
    $$('.hd-s4 .hd-orbit li', stage).forEach((li) => { li.style.left = ''; li.style.top = ''; });
    current = null;
  }

  function goTo(label, smooth) {
    if (!current || !current.scrollTrigger) return;
    const y = current.scrollTrigger.labelToScroll(label);
    window.scrollTo({ top: y, behavior: smooth ? 'smooth' : 'auto' });
  }

  /* ======================================================================
     MODES
     ====================================================================== */
  const mm = gsap.matchMedia();

  mm.add('(min-width: 1024px) and (min-height: 640px) and (prefers-reduced-motion: no-preference)', () => {
    let inner = gsap.context(() => buildPinned(true));
    const at = params.get('at');
    const frame = params.get('frame');
    if (frame && current) {
      // QA: render one scene at the top of the page without scrolling (for headless screenshots).
      // Re-applied after every ScrollTrigger refresh (homepage sections below can trigger one on load).
      const pinFrame = () => {
        if (!current || !current.scrollTrigger) return;
        current.scrollTrigger.disable(false);
        current.seek(/^[\d.]+$/.test(frame) ? parseFloat(frame) : frame, false); // label (s1–s5) or a time
        syncUI(current.time());
      };
      pinFrame();
      ScrollTrigger.addEventListener('refresh', pinFrame);
    } else if (at) {
      requestAnimationFrame(() => goTo(at, false));
    }

    let w = innerWidth, h = innerHeight, tid = 0;
    const onResize = () => {
      if (Math.abs(innerWidth - w) < 2 && Math.abs(innerHeight - h) < 80) return;
      w = innerWidth; h = innerHeight;
      clearTimeout(tid);
      tid = setTimeout(() => {
        const st = current && current.scrollTrigger;
        const prog = st ? st.progress : 0;
        inner.revert();
        inner = gsap.context(() => buildPinned(false));
        ScrollTrigger.refresh();
        const st2 = current && current.scrollTrigger;
        if (st2 && prog > 0) window.scrollTo(0, st2.start + prog * (st2.end - st2.start));
      }, 220);
    };
    window.addEventListener('resize', onResize);

    const onClick = (e) => {
      const b = e.target.closest('[data-goto]');
      if (b) goTo(b.getAttribute('data-goto'), true);
    };
    stage.addEventListener('click', onClick);

    return () => {
      window.removeEventListener('resize', onResize);
      stage.removeEventListener('click', onClick);
      clearTimeout(tid);
      inner.revert();
      cleanupPinned();
    };
  });

  // Smaller screens with motion: simple one-time reveals; content is visible without JS
  mm.add('(max-width: 1023px) and (prefers-reduced-motion: no-preference), (max-height: 639px) and (prefers-reduced-motion: no-preference)', () => {
    $$('.hd-scene .hd-copy > *, .hd-scene .hd-media, .hd-kpi, .hd-orbit li', stage).forEach((el) => {
      gsap.from(el, { autoAlpha: 0, y: 24, duration: .6, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
    });
  });
})();
