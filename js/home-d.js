/* ==========================================================================
   ClickERP prototype · Homepage sections (Direction D + A)
   Works without GSAP (tabs, compare, form). With GSAP + motion it adds:
   - A: the green spine drawn by the cursor down the page (≥1024 px), lighting
     a node per section and ending on the demo submit button
   - highlight-chip grow, stat count-ups, one-time reveals, a before/after sweep
   The form is UI-only: nothing is sent. It logs a PII-masked payload that maps
   onto the existing backend contract (fname, lname, email, phone, service, msg).
   ========================================================================== */
(() => {
  'use strict';

  const root = document.getElementById('hm');
  if (!root) return;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const params = new URLSearchParams(location.search);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);

  /* ---------------- Header: solid once the (non-pinned) hero is behind us ---------------- */
  const header = document.querySelector('.c-header');
  const stage = document.getElementById('hd-stage');
  const syncHeader = () => {
    if (!header || !stage) return;
    const pinned = stage.classList.contains('is-pinned');
    const box = pinned && stage.parentElement.classList.contains('pin-spacer') ? stage.parentElement : stage;
    const past = box.getBoundingClientRect().bottom <= header.offsetHeight + 1;
    if (pinned) { if (past) header.classList.add('is-solid'); } // while pinned, the hero timeline drives the header
    else header.classList.toggle('is-solid', past);
  };
  window.addEventListener('scroll', syncHeader, { passive: true });
  syncHeader();

  /* ---------------- §2 Before/after compare ---------------- */
  const compare = $('.hm-compare', root);
  const range = $('.hm-compare__range', root);
  // In RTL the range's minimum sits on the right: value v → thumb at (100 − v)% from the left.
  const setPos = (v) => { if (compare) compare.style.setProperty('--pos', `${100 - v}%`); };
  if (range) { range.addEventListener('input', () => setPos(+range.value)); setPos(+range.value); }

  /* ---------------- §4 Tabs (WAI-ARIA, RTL-aware arrows) ---------------- */
  const tabs = $$('.hm-tab', root);
  function select(tab, focus) {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', on);
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) tab.focus();
    if (hasGsap && !reduce) gsap.fromTo(document.getElementById(tab.getAttribute('aria-controls')), { autoAlpha: 0 }, { autoAlpha: 1, duration: .2 });
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t, false));
    t.addEventListener('keydown', (e) => {
      const n = tabs.length;
      let k = null;
      if (e.key === 'ArrowLeft') k = (i + 1) % n;          // RTL: left = next
      else if (e.key === 'ArrowRight') k = (i - 1 + n) % n;
      else if (e.key === 'Home') k = 0;
      else if (e.key === 'End') k = n - 1;
      if (k !== null) { e.preventDefault(); select(tabs[k], true); }
    });
  });

  /* ---------------- §7 Compact demo form (UI only) ---------------- */
  const form = $('#hm-form', root);
  const success = $('.hm-success', root);

  /* ---------------- Packages page: mobile tier toggle ---------------- */
  const tierWrap = $('.pg-table-wrap');
  $$('.pg-tier-toggle [data-tier]').forEach((btn, i, all) => btn.addEventListener('click', () => {
    all.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    if (tierWrap) tierWrap.dataset.show = btn.dataset.tier;
  }));

  /* ---------------- Selected package -> demo form interest (?package= or an in-page package button) ---------------- */
  const PKG = { starter: 'باقة البداية', business: 'باقة الأعمال' };
  let interest = PKG[params.get('package')] || 'النظام كاملًا';
  let pkgNote = null;
  function showPkg() {
    if (!form) return;
    if (!pkgNote) { pkgNote = document.createElement('p'); pkgNote.className = 'hm-form__pkg'; form.prepend(pkgNote); }
    pkgNote.hidden = interest === 'النظام كاملًا';
    pkgNote.innerHTML = `<i class="ph ph-package" aria-hidden="true"></i><span>الباقة المختارة: <b>${interest}</b></span>`;
  }
  $$('a[data-package]').forEach((a) => a.addEventListener('click', () => { interest = PKG[a.dataset.package] || interest; showPkg(); }));
  showPkg();

  if (form) { // ---- form block (homepage / demo page only)
  const summary = $('.hm-form__summary', form);
  const toWestern = (s) => s.replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  const PHONE = /^(05\d{8}|\+9665\d{8}|009665\d{8})$/;
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function check(input) {
    let ok;
    if (input.type === 'checkbox') ok = input.checked;
    else if (input.name === 'phone') { input.value = toWestern(input.value); ok = PHONE.test(input.value.replace(/\s+/g, '')); }
    else if (input.type === 'email') ok = EMAIL.test(input.value.trim());
    else ok = input.value.trim().length > 0;
    const err = document.getElementById('e-' + input.id.replace('f-', ''));
    input.setAttribute('aria-invalid', String(!ok));
    if (ok) { err.hidden = true; err.textContent = ''; input.removeAttribute('aria-describedby'); }
    else { err.hidden = false; err.textContent = input.dataset.msg; input.setAttribute('aria-describedby', err.id); }
    return ok;
  }
  const fields = $$('input[required]', form);
  fields.forEach((f) => f.addEventListener('blur', () => { if (f.value || f.type === 'checkbox') check(f); }));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const bad = fields.filter((f) => !check(f));
    if (params.get('simulate') === 'error' && !bad.length) {
      summary.innerHTML = '<p>تعذر إرسال الطلب الآن. حاول مرة أخرى أو تواصل معنا عبر واتساب.</p>';
      summary.hidden = false; summary.focus();
      return;
    }
    if (bad.length) {
      summary.innerHTML = `<p>يرجى تصحيح ${bad.length === 1 ? 'الحقل التالي' : 'الحقول التالية'}:</p><ul>${bad.map((f) => `<li><a href="#${f.id}">${f.dataset.msg}</a></li>`).join('')}</ul>`;
      summary.hidden = false; summary.focus();
      return;
    }
    summary.hidden = true;
    const v = (n) => form.elements[n].value.trim();
    const payload = {
      fname: v('fname'), lname: v('lname'), email: v('email'), phone: v('phone').replace(/\s+/g, ''),
      service: `عرض توضيحي | المنشأة: ${v('org')} | الفروع: غير محدد | الاهتمام: ${interest}`.slice(0, 255),
      msg: 'طلب عرض توضيحي من الصفحة الرئيسية',
    };
    const mask = (s) => '•'.repeat(Math.min(8, s.length));
    console.info('[prototype] demo payload (PII masked, not sent):', { ...payload, fname: mask(payload.fname), lname: mask(payload.lname), email: mask(payload.email), phone: mask(payload.phone), service: payload.service.replace(v('org'), mask(v('org'))) });
    form.hidden = true; success.hidden = false; success.setAttribute('tabindex', '-1'); success.focus();
  });
  summary.addEventListener('click', (e) => {
    const a = e.target.closest('a'); if (!a) return;
    e.preventDefault(); const t = document.querySelector(a.getAttribute('href')); if (t) t.focus();
  });
  } // ---- end form block

  /* ---------------- Inner pages: sticky sub-nav scroll-spy ---------------- */
  const subLinks = $$('.pg-subnav a[href^="#"]');
  if (subLinks.length) {
    // active = the last section whose top has passed just under the sticky header + sub-nav
    const bar = $('.pg-subnav');
    const secs = subLinks.map((a) => document.getElementById(a.getAttribute('href').slice(1)));
    let ticking = false;
    const spy = () => {
      ticking = false;
      const line = (header ? header.offsetHeight : 72) + bar.offsetHeight + 24;
      let cur = -1;
      secs.forEach((sec, i) => { if (sec && sec.getBoundingClientRect().top <= line) cur = i; });
      subLinks.forEach((a, i) => { if (i === cur) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
      if (cur !== last && cur >= 0) { // keep the active chip visible inside the horizontally scrolling bar
        last = cur;
        const list = bar.querySelector('ul'), a = subLinks[cur];
        const lr = list.getBoundingClientRect(), ar = a.getBoundingClientRect();
        if (ar.left < lr.left || ar.right > lr.right) list.scrollBy({ left: (ar.left + ar.width / 2) - (lr.left + lr.width / 2), behavior: 'smooth' });
      }
    };
    let last = -1;
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(spy); } }, { passive: true });
    window.addEventListener('load', spy);
    spy();
  }

  /* ---------------- §3b Works reel «النقرة تفتح عالمهم» (desktop + motion; no GSAP needed) ---------------- */
  const wk = $('.wk', root);
  if (wk && !reduce) {
    const items = $$('.wk-item', wk);
    const sec = wk.closest('.hm-works');
    const mqR = matchMedia('(min-width: 1024px) and (min-height: 640px)');
    let stage = null, io = null;
    const activate = (i) => {
      if (!stage || i < 0) return;
      items.forEach((it, k) => it.classList.toggle('is-active', k === i));
      $$('img', stage).forEach((im, k) => im.classList.toggle('is-on', k === i));
      sec.style.setProperty('--wk', items[i].style.getPropertyValue('--c'));
      $('.wk-stage__count b', stage).textContent = String(i + 1).padStart(2, '0');
      stage.classList.remove('is-click'); void stage.offsetWidth; stage.classList.add('is-click'); // the cursor "clicks" each project
    };
    const reelOn = () => {
      if (stage) return;
      wk.classList.add('is-reel');
      stage = document.createElement('div');
      stage.className = 'wk-stage';
      stage.setAttribute('aria-hidden', 'true');
      stage.innerHTML = items.map((it) => `<img src="${it.querySelector('img').getAttribute('src')}" alt="">`).join('') +
        '<span class="wk-stage__ring"></span><svg class="wk-stage__cursor" viewBox="0 0 120 120"><path d="M10 10 L112 48 L68 62 L50 110 Z"/></svg>' +
        `<p class="wk-stage__count" dir="ltr"><b>01</b> / ${String(items.length).padStart(2, '0')}</p>`;
      wk.appendChild(stage);
      // active = the last item whose top has passed the middle of the viewport (robust to fast scrolls and jumps)
      let cur = -1, ticking = false;
      const pick = () => {
        ticking = false;
        const mid = innerHeight / 2;
        let i = 0;
        items.forEach((it, k) => { if (it.getBoundingClientRect().top <= mid) i = k; });
        if (i !== cur) { cur = i; activate(i); }
      };
      io = () => { if (!ticking) { ticking = true; requestAnimationFrame(pick); } };
      window.addEventListener('scroll', io, { passive: true });
      window.addEventListener('resize', io);
      pick();
    };
    const reelOff = () => {
      if (!stage) return;
      window.removeEventListener('scroll', io); window.removeEventListener('resize', io); io = null;
      stage.parentNode.removeChild(stage); stage = null;
      wk.classList.remove('is-reel');
      items.forEach((it) => it.classList.remove('is-active'));
      sec.style.removeProperty('--wk');
    };
    const applyReel = () => (mqR.matches ? reelOn() : reelOff());
    mqR.addEventListener('change', applyReel);
    applyReel();
  }

  if (!hasGsap || reduce) return; // everything below is motion only; content is already complete

  /* ---------------- Motion: chips, count-ups, reveals, compare sweep ---------------- */
  gsap.registerPlugin(ScrollTrigger);
  $$('.hm-mark', root).forEach((m) => {
    gsap.fromTo(m, { '--mk': 0 }, { '--mk': 1, duration: .7, ease: 'power2.out', scrollTrigger: { trigger: m, start: 'top 85%', once: true } });
  });
  $$('[data-count]', root).forEach((el) => {
    const to = +el.dataset.count, o = { v: 0 };
    el.textContent = '0';
    gsap.to(o, { v: to, duration: 1.1, ease: 'power1.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true }, onUpdate: () => { el.textContent = Math.round(o.v); } });
  });
  $$('.hm-head, .hm-stat, .hm-logos, .hm-list, .hm-tile, .hm-tabs, .hm-start__col, .hm-plan, .hm-faq, .hm-form-card, .pg-mod, .pg-media, .pg-int li, .pg-sec li, .pg-cta__inner', root).forEach((el) => {
    gsap.from(el, { autoAlpha: 0, y: 28, duration: .7, ease: 'power2.out', clearProps: 'transform', scrollTrigger: { trigger: el, start: 'top 90%', once: true } }); // clearProps keeps CSS hover lifts working
  });
  // the cursor "drags" the comparison once: from almost all "before" to mostly "after"
  if (compare && range) {
    const sweep = { v: 92 };
    setPos(92); range.value = 92;
    gsap.to(sweep, {
      v: 38, duration: 1.6, ease: 'power2.inOut', scrollTrigger: { trigger: compare, start: 'top 70%', once: true },
      onUpdate: () => { range.value = Math.round(sweep.v); setPos(sweep.v); },
    });
  }

  /* ---------------- A · the spine (desktop with motion) ---------------- */
  const svg = $('.hm-spine', root), cursor = $('.hm-cursor', root);
  const nodes = $$('.hm-node', root);
  const submit = $('[data-spine-end]', root) || $('.hm-submit', root); // where the spine ends (CTA)
  if (!submit || !nodes.length) return;
  const NS = 'http://www.w3.org/2000/svg';
  let st = null, built = false;

  function spline(pts) {
    let d = `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      d += ` C${(p1.x + (p2.x - p0.x) / 6).toFixed(1)} ${(p1.y + (p2.y - p0.y) / 6).toFixed(1)} ${(p2.x - (p3.x - p1.x) / 6).toFixed(1)} ${(p2.y - (p3.y - p1.y) / 6).toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return d;
  }

  function teardown() {
    if (st) { st.kill(); st = null; }
    svg.textContent = '';
    root.classList.remove('has-spine');
    nodes.forEach((n) => { n.classList.remove('is-lit'); n.style.translate = ''; });
    built = false;
  }

  function build() {
    teardown();
    root.classList.add('has-spine');
    const r = root.getBoundingClientRect();
    const rel = (el) => { const b = el.getBoundingClientRect(); return { x: b.left - r.left, y: b.top - r.top, w: b.width, h: b.height }; };
    // every node sits on one vertical line: the first node's x (centred heads are shifted onto it)
    const sx = rel(nodes[0]).x + rel(nodes[0]).w / 2;
    nodes.forEach((n) => { const b = rel(n); n.style.translate = `${(sx - (b.x + b.w / 2)).toFixed(1)}px 0`; });
    const pts = nodes.map((n) => { const b = rel(n); return { x: b.x + b.w / 2, y: b.y + b.h / 2 }; });
    const sb = rel(form && form.hidden && success ? success : submit);
    const W = r.width, H = r.height;
    svg.setAttribute('width', W); svg.setAttribute('height', H);

    const x0 = pts[0].x, last = pts[pts.length - 1];
    const end = { x: sb.x + sb.w + 14, y: sb.y + sb.h / 2 };            // inline-start (right) edge of the submit button
    const d = `M${x0} 0 L${last.x} ${last.y} ` + spline([last, { x: last.x, y: end.y - 90 }, { x: (last.x + end.x) / 2 + 40, y: end.y - 6 }, end]).replace(/^M[^C]+/, '');
    const track = document.createElementNS(NS, 'path'); track.setAttribute('class', 'hm-spine__track'); track.setAttribute('d', d); svg.appendChild(track);
    const line = document.createElementNS(NS, 'path'); line.setAttribute('class', 'hm-spine__line'); line.setAttribute('d', d); svg.appendChild(line);
    const len = line.getTotalLength();
    line.style.strokeDasharray = `${len} ${len}`; line.style.strokeDashoffset = len;
    const at = pts.map((p) => p.y);                                       // the first leg is vertical: length = y
    const tip = 36 * (10 / 120);

    const render = (p) => {
      const l = len * p;
      line.style.strokeDashoffset = len - l;
      const pt = line.getPointAtLength(l);
      gsap.set(cursor, { x: pt.x - tip, y: pt.y - tip });
      nodes.forEach((n, k) => n.classList.toggle('is-lit', l >= at[k] - 2));
    };
    st = ScrollTrigger.create({
      trigger: root, start: 'top 60%', end: () => `bottom-=${Math.max(0, H - end.y) + 20} 55%`,
      scrub: .6, onUpdate: (self) => render(self.progress),
    });
    render(st.progress);
    built = true;
  }

  let tid = 0;
  const schedule = () => { clearTimeout(tid); tid = setTimeout(() => { if (mq.matches) { build(); ScrollTrigger.refresh(); } }, 180); };
  const mq = matchMedia('(min-width: 1024px)');
  const ro = new ResizeObserver(() => { if (built || mq.matches) schedule(); });
  function apply() { if (mq.matches) { build(); ro.observe(root); } else { ro.disconnect(); teardown(); } }
  mq.addEventListener('change', apply);
  const go = () => { // QA: ?to=<section id> jumps there after layout (headless screenshots)
    apply();
    const t = params.get('to') && document.getElementById(params.get('to'));
    // wait for ScrollTrigger's own load-time refresh (it restores the previous scroll position)
    if (t) setTimeout(() => { ScrollTrigger.refresh(); window.scrollTo(0, t.getBoundingClientRect().top + window.scrollY + (+params.get('dy') || 0)); ScrollTrigger.update(); }, 400);
  };
  if (document.readyState === 'complete') go(); else window.addEventListener('load', go);
})();
