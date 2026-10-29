/* ============================================================================
   PERSATUAN BOXING BOGOR — MOTION+  (v1.7.0)
   assets/js/motion-plus.js · dimuat PALING AKHIR (setelah kinetic.js)
   ----------------------------------------------------------------------------
   Add-on. Tidak mengubah logika HTML, routing, CMS, Supabase, atau Netlify
   Functions. Semua efek dipasang lewat hook Barba, event, dan observer.
   Bila skrip ini gagal / GSAP tidak ada / pengguna memilih reduced-motion,
   file ini keluar lebih awal dan situs berjalan seperti v1.6.3.

   Peta  1 config · 2 util · 3 Lenis berbobot · 4 gerbang animasi · 5 preloader
         6 intro hero · 7 tirai transisi · 8 marquee hero · 9 image reveal
         10 magnet · 11 observer & boot
   ========================================================================== */
(function () {
  'use strict';

  if (window.__PBB_MOTION_PLUS__) return;
  const doc = document;
  const root = doc.documentElement;
  const gsap = window.gsap;
  const reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  if (!gsap || reduced) return;
  window.__PBB_MOTION_PLUS__ = true;
  root.classList.add('mx');

  /* ══ 1 · CONFIG — semua angka yang perlu di-tuning ada di sini ═════════════ */
  const MX = {
    /* lerp lebih kecil = scroll lebih "berat" & meluncur lebih lama */
    lenis: { lerp: 0.075, wheelMultiplier: 0.85, touchMultiplier: 1.1 },
    preloader: {
      minMs: 1300,                 /* layar tertahan minimal ini */
      maxMs: 3500,                 /* batas darurat: tidak pernah menahan lebih lama */
      words: [[0, 'PEMANASAN'], [25, 'LOMPAT TALI'], [55, 'SHADOW BOXING'], [85, 'NAIK RING'], [100, 'BEL BERBUNYI!']]
    },
    curtain: { cover: 0.42, reveal: 0.5 },
    marquee: {
      rows: [
        { text: 'BOGOR BOXING',     dir: -1, speed: 0.55, kind: 'outline' },
        { text: 'PERSATUAN BOXING', dir:  1, speed: 0.38, kind: 'solid' }
      ],
      boost: 0.42                  /* seberapa kuat scroll mempercepat / membalik arah */
    },
    reveal: '.photo-strip img, .gallery-item, .event-poster, .coach-portrait, .video-frame',
    magnet: [
      { sel: '.btn, .nav-cta',          k: 0.36, max: 14, pad: 30 },
      { sel: '.line-link, .text-link',  k: 0.28, max: 9,  pad: 22 },
      { sel: '.nav a:not(.nav-cta)',    k: 0.22, max: 6,  pad: 12 },
      { sel: '.brand',                  k: 0.10, max: 5,  pad: 10 }
    ],
    logo: 'assets/img/logo-pbb-cutout.webp',
    labels: { '': 'BERANDA', index: 'BERANDA', about: 'TENTANG', programs: 'PROGRAM', coaches: 'PELATIH', schedule: 'JADWAL', competitions: 'EVENT', gallery: 'GALERI', contact: 'KONTAK' }
  };

  /* ══ 2 · UTIL ═════════════════════════════════════════════════════════════ */
  const state = { preloading: false };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const container = () => doc.querySelector('[data-barba="container"]') || doc.querySelector('main');
  const fine = !!(window.matchMedia && window.matchMedia('(hover:hover) and (pointer:fine)').matches);
  const nextFrame = fn => requestAnimationFrame(() => requestAnimationFrame(fn));
  function el(tag, cls, html) {
    const n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function pageLabel(data) {
    const p = (data && data.next && data.next.url && data.next.url.path) || '';
    const name = p.split('?')[0].split('#')[0].split('/').pop().replace(/\.html$/, '');
    return MX.labels[name] || '';
  }

  /* ══ 3 · LENIS BERBOBOT ═══════════════════════════════════════════════════
     app.js membuat instance Lenis di DOMContentLoaded lewat `new window.Lenis`.
     Kita bungkus konstruktornya: opsi inersia diganti, instance disimpan di
     window.pbbLenis. Hapus file ini -> Lenis kembali ke setelan lama. */
  (function patchLenis() {
    const Base = window.Lenis;
    if (!Base || Base.__mx) return;
    try {
      class PBBLenis extends Base {
        constructor(opts) {
          /* duration: undefined -> Lenis memakai lerp (inersia), bukan kurva durasi */
          super(Object.assign({}, opts, MX.lenis, { duration: undefined }));
          window.pbbLenis = this;
          if (state.preloading) this.stop();
        }
      }
      PBBLenis.__mx = true;
      window.Lenis = PBBLenis;
    } catch (err) { /* Lenis tetap memakai setelan bawaan app.js */ }
  })();

  /* ══ 4 · GERBANG ANIMASI ══════════════════════════════════════════════════
     Animasi masuk (image reveal, intro hero) menunggu sampai preloader / tirai
     benar-benar terbuka, supaya tidak habis terputar di balik penutup. */
  const gate = { open: true, queue: [], timer: 0 };
  function closeGate() {
    gate.open = false;
    clearTimeout(gate.timer);
    gate.timer = setTimeout(openGate, 6000);          /* pengaman: tidak pernah macet */
  }
  function openGate() {
    if (gate.open) return;
    gate.open = true;
    clearTimeout(gate.timer);
    introHero();
    gate.queue.splice(0).forEach(fn => { try { fn(); } catch (e) { /* abaikan */ } });
  }
  const whenOpen = fn => (gate.open ? fn() : gate.queue.push(fn));

  /* ══ 5 · PRELOADER 0–100% ═════════════════════════════════════════════════ */
  function takeoverPreloader() {
    const node = doc.querySelector('.loader');
    if (!node || root.classList.contains('no-loader')) return;
    let seen = false;
    try { seen = !!sessionStorage.getItem('pbb_loaded'); sessionStorage.setItem('pbb_loaded', '1'); } catch (e) { /* abaikan */ }
    if (seen) return;                                   /* app.js menghapusnya seperti biasa */

    state.preloading = true;
    root.classList.add('pbb-preloading');
    closeGate();

    /* ganti nama kelas SEBELUM runLoader() milik app.js berjalan -> ia tidak menemukan apa-apa */
    node.className = 'pbb-pre';
    node.setAttribute('role', 'status');
    node.setAttribute('aria-label', 'Memuat Persatuan Boxing Bogor');
    node.innerHTML =
      '<div class="pbb-pre__top"><span class="pbb-pre__mark">PBB<i>.</i></span><span>RONDE 1</span></div>' +
      '<div class="pbb-pre__mid"><div class="pbb-pre__word" data-word>PEMANASAN</div></div>' +
      '<div class="pbb-pre__bottom">' +
        '<div class="pbb-pre__count" aria-hidden="true"><span class="pbb-pre__num"><b class="z">0</b><b class="z">0</b><b>0</b></span><span class="pbb-pre__pct">%</span></div>' +
        '<div class="pbb-pre__ropes" aria-hidden="true"><i></i><i></i><i></i></div>' +
        '<div class="pbb-pre__foot"><span>DIBANGUN DENGAN DISIPLIN</span><span>PERSATUAN BOXING BOGOR</span></div>' +
      '</div>';

    const digits = [...node.querySelectorAll('.pbb-pre__num b')];
    const wordEl = node.querySelector('[data-word]');
    let word = MX.preloader.words[0][1];

    /* ---- sinyal pemuatan nyata ---- */
    const ms = { dom: doc.readyState !== 'loading', fonts: false, hero: false, content: !window.PBBContent, load: doc.readyState === 'complete', kinetic: false };
    const weight = { dom: 10, fonts: 20, hero: 20, content: 20, load: 15, kinetic: 15 };
    (doc.fonts && doc.fonts.ready ? doc.fonts.ready : Promise.resolve()).then(() => { ms.fonts = true; }, () => { ms.fonts = true; });
    const img = doc.querySelector('main img');
    if (!img || img.complete) ms.hero = true;
    else { img.addEventListener('load', () => { ms.hero = true; }, { once: true }); img.addEventListener('error', () => { ms.hero = true; }, { once: true }); }
    window.addEventListener('pbb:content', () => { ms.content = true; }, { once: true });
    if (!ms.load) window.addEventListener('load', () => { ms.load = true; }, { once: true });
    const contentFetched = () => performance.getEntriesByType('resource').some(e => e.name.indexOf('/data/content.json') > -1 && e.responseEnd > 0);
    const real = () => {
      if (!ms.content && contentFetched()) ms.content = true;
      if (!ms.kinetic) {
        if (root.classList.contains('kinetic-ready')) ms.kinetic = true;
        else if (ms.load && !window.__PBB_KINETIC__) ms.kinetic = true;   /* mesin 3D tidak jalan -> jangan ditunggu */
      }
      return Object.keys(ms).reduce((sum, k) => sum + (ms[k] ? weight[k] : 0), 0);
    };

    /* ---- penghitung ---- */
    const t0 = performance.now();
    let shown = 0;
    let ended = false;
    function paint(v) {
      const n = Math.round(v);
      const s = String(n).padStart(3, '0');
      digits.forEach((d, i) => {
        d.textContent = s[i];
        d.classList.toggle('z', i < 2 && /^0+$/.test(s.slice(0, i + 1)));
      });
      node.style.setProperty('--p', (v / 100).toFixed(3));
      let w = MX.preloader.words[0][1];
      MX.preloader.words.forEach(pair => { if (v >= pair[0]) w = pair[1]; });
      if (w !== word) {
        word = w; wordEl.textContent = w;
        wordEl.classList.remove('is-swap'); void wordEl.offsetWidth; wordEl.classList.add('is-swap');
      }
    }
    function tick() {
      if (ended) return;
      const elapsed = performance.now() - t0;
      const timeCap = Math.min(100, (elapsed / MX.preloader.minMs) * 100);
      const target = elapsed > MX.preloader.maxMs ? 100 : Math.min(real(), timeCap);
      shown += (target - shown) * 0.14;
      if (target >= 100 && shown > 99.2) shown = 100;
      paint(shown);
      if (shown >= 100) { ended = true; gsap.ticker.remove(tick); finish(); }
    }

    function finish() {
      node.classList.add('is-bell');
      const top = node.querySelector('.pbb-pre__top');
      const bottom = node.querySelector('.pbb-pre__bottom');
      const mid = node.querySelector('.pbb-pre__mid');
      const done = () => {
        node.remove();
        root.classList.remove('pbb-preloading');
        state.preloading = false;
        if (window.ScrollTrigger) window.ScrollTrigger.refresh();
        if (window.pbbLenis) window.pbbLenis.resize();
      };
      gsap.timeline({ onComplete: done })
        .to({}, { duration: 0.28 })                                         /* tahan "100%" sejenak */
        .add(() => {
          root.classList.remove('pbb-preloading');                          /* title 3D di kinetic.js menunggu ini */
          if (window.pbbLenis) window.pbbLenis.start();
          window.dispatchEvent(new Event('pbb:preloader-exit'));
        })
        .to([top, mid, bottom], { yPercent: -18, opacity: 0, duration: 0.55, ease: 'power3.in', stagger: 0.04 }, '<')
        .to(node, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.85, ease: 'power4.inOut' }, '<0.12')
        .add(openGate, '<0.35');
    }

    paint(0);
    gsap.ticker.add(tick);
    /* pengaman terakhir: apa pun yang terjadi, overlay tidak boleh tertinggal */
    setTimeout(() => { if (node.isConnected) { gsap.ticker.remove(tick); ended = true; node.remove(); root.classList.remove('pbb-preloading'); state.preloading = false; if (window.pbbLenis) window.pbbLenis.start(); openGate(); } }, MX.preloader.maxMs + 2500);
  }

  /* ══ 6 · INTRO HERO — diputar ulang saat penutup terbuka ══════════════════ */
  function introHero() {
    const main = container();
    if (!main) return;
    const lines = main.querySelectorAll('.hero-copy > *, .page-hero > *, .contact-copy > *, .hero-side-note');
    if (lines.length) {
      gsap.killTweensOf(lines);
      gsap.fromTo(lines, { y: 48, opacity: 0 }, { y: 0, opacity: 1, duration: 0.95, ease: 'power3.out', stagger: 0.07, clearProps: 'transform,opacity' });
    }
    /* klip dipasang pada <img>, bukan pada .hero-photo -> sudut potong (clip-path CSS) tetap utuh */
    const photo = main.querySelector('.hero-photo img');
    if (photo) {
      gsap.killTweensOf(photo);
      gsap.fromTo(photo, { clipPath: 'inset(0% 100% 0% 0%)', scale: 1.16 }, { clipPath: 'inset(0% 0% 0% 0%)', scale: 1, duration: 1.3, ease: 'power4.inOut', delay: 0.08, clearProps: 'clipPath,transform' });
    }
  }

  /* ══ 7 · TIRAI TRANSISI (Barba, lewat hook global) ════════════════════════ */
  let curtain = null, cols = null, brand = null, labelEl = null, failsafe = 0;
  function buildCurtain() {
    if (curtain) return;
    const strips = n => new Array(n + 1).join('<i></i>');
    curtain = el('div', 'mx-curtain',
      '<div class="mx-curtain__layer mx-curtain__layer--red">' + strips(5) + '</div>' +
      '<div class="mx-curtain__layer mx-curtain__layer--ink">' + strips(5) + '</div>' +
      '<div class="mx-curtain__brand"><img src="' + MX.logo + '" alt="" width="346" height="279" decoding="async"><span class="mx-curtain__label"></span></div>');
    curtain.setAttribute('aria-hidden', 'true');
    doc.body.append(curtain);
    cols = {
      red: [...curtain.querySelectorAll('.mx-curtain__layer--red i')],
      ink: [...curtain.querySelectorAll('.mx-curtain__layer--ink i')]
    };
    brand = curtain.querySelector('.mx-curtain__brand');
    labelEl = curtain.querySelector('.mx-curtain__label');
    const warm = new Image(); warm.src = MX.logo;       /* logo siap sebelum tirai pertama menutup */
  }
  function cover(label) {
    buildCurtain();
    closeGate();
    gsap.killTweensOf([cols.red, cols.ink, brand]);
    labelEl.textContent = label || '';
    curtain.classList.add('is-on');
    gsap.set([cols.red, cols.ink], { scaleY: 0, transformOrigin: '50% 100%' });
    gsap.set(brand, { opacity: 0, y: 22, scale: 0.92 });
    clearTimeout(failsafe);
    failsafe = setTimeout(() => { reveal(); }, 7000);   /* transisi gagal di tengah jalan -> tirai tetap dibuka */
    const d = MX.curtain.cover;
    return new Promise(resolve => {
      gsap.timeline({ onComplete: resolve })
        .to(cols.red, { scaleY: 1, duration: d, ease: 'power4.inOut', stagger: { each: 0.04, from: 'center' } })
        .to(cols.ink, { scaleY: 1, duration: d, ease: 'power4.inOut', stagger: { each: 0.04, from: 'center' } }, 0.1)
        .to(brand, { opacity: 1, y: 0, scale: 1, duration: 0.34, ease: 'power3.out' }, d * 0.75);
    });
  }
  function reveal() {
    if (!curtain || !curtain.classList.contains('is-on')) { openGate(); return Promise.resolve(); }
    clearTimeout(failsafe);
    gsap.killTweensOf([cols.red, cols.ink, brand]);
    const d = MX.curtain.reveal;
    return new Promise(resolve => {
      gsap.timeline({
        onComplete: () => {
          curtain.classList.remove('is-on');
          gsap.set([cols.red, cols.ink], { clearProps: 'transform' });
          resolve();
        }
      })
        .to(brand, { opacity: 0, y: -18, duration: 0.2, ease: 'power2.in' })
        .set(cols.ink, { transformOrigin: '50% 0%' }, 0.06)
        .to(cols.ink, { scaleY: 0, duration: d, ease: 'power4.inOut', stagger: { each: 0.04, from: 'edges' } }, 0.06)
        .set(cols.red, { transformOrigin: '50% 0%' }, 0.16)
        .to(cols.red, { scaleY: 0, duration: d, ease: 'power4.inOut', stagger: { each: 0.04, from: 'edges' } }, 0.16)
        .add(openGate, 0.3);                            /* konten mulai beranimasi saat tirai separuh terbuka */
    });
  }
  function revealWhenRendered() {
    let fired = false;
    const go = () => { if (fired) return; fired = true; window.removeEventListener('mx:rendered', go); setTimeout(reveal, 60); };
    window.addEventListener('mx:rendered', go);
    setTimeout(go, 1400);                                /* render CMS lambat -> tetap buka tirai */
  }
  function bindBarba() {
    if (!window.barba || !window.barba.hooks) return;
    /* app.js memanggil PBBContent.render() setelah transisi; kita beri tahu kapan selesai */
    if (window.PBBContent && !window.PBBContent.__mx && typeof window.PBBContent.render === 'function') {
      const orig = window.PBBContent.render.bind(window.PBBContent);
      window.PBBContent.render = function () {
        return Promise.resolve(orig.apply(null, arguments)).finally(() => window.dispatchEvent(new Event('mx:rendered')));
      };
      window.PBBContent.__mx = true;
    }
    try {
      /* hook global dijalankan SEBELUM hook transisi milik app.js dan ditunggu (await) oleh Barba */
      window.barba.hooks.beforeLeave(data => cover(pageLabel(data)));
      window.barba.hooks.after(() => { revealWhenRendered(); observePage(); scan(); });
    } catch (err) { /* tanpa hook: transisi crossfade lama tetap berjalan */ }
    window.addEventListener('pageshow', e => { if (e.persisted && curtain) { curtain.classList.remove('is-on'); openGate(); } });
  }

  /* ══ 8 · MARQUEE RAKSASA (hero) ═══════════════════════════════════════════
     Dua baris teks raksasa meluncur berlawanan arah; scroll mempercepat dan,
     saat scroll ke atas, membalik arah. Berhenti saat hero di luar layar. */
  function initMarquee(scope) {
    const hero = scope.querySelector('.hero');
    if (!hero || hero.__mxMarquee) return;
    hero.__mxMarquee = true;
    const wrap = el('div', 'mx-marquee');
    wrap.setAttribute('aria-hidden', 'true');
    const rows = MX.marquee.rows.map(cfg => {
      const row = el('div', 'mx-marquee__row mx-marquee__row--' + cfg.kind);
      const track = el('div', 'mx-marquee__track');
      row.append(track); wrap.append(row);
      return { cfg, track, x: 0, seg: 0 };
    });
    hero.prepend(wrap);

    function fill() {
      rows.forEach(r => {
        const piece = r.cfg.text + ' <span style="font-size:.5em;vertical-align:.35em">✳</span>';
        r.track.innerHTML = '<span class="mx-marquee__item">' + piece + '</span>';
        r.seg = r.track.firstChild.offsetWidth || 1;
        const copies = Math.ceil(hero.clientWidth / r.seg) + 2;
        r.track.innerHTML = new Array(copies + 1).join('<span class="mx-marquee__item">' + piece + '</span>');
        r.x = -(r.seg * (r.cfg.dir < 0 ? 0 : 1));        /* titik awal beda agar kedua baris tidak sejajar */
      });
    }
    fill();
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(() => { if (hero.isConnected) fill(); });
    let rz = 0;
    window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (hero.isConnected) fill(); }, 200); }, { passive: true });

    let lastY = window.scrollY, vel = 0, visible = true;
    const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { rootMargin: '120px' }) : null;
    if (io) io.observe(hero);
    const tick = (time, dt) => {
      if (!hero.isConnected) { gsap.ticker.remove(tick); if (io) io.disconnect(); return; }
      const y = window.scrollY;
      vel += ((y - lastY) - vel) * 0.12;                 /* kecepatan scroll yang dihaluskan */
      lastY = y;
      if (!visible) return;
      const f = Math.min(2.5, (dt || 16.7) / 16.7);
      rows.forEach(r => {
        if (!r.seg) return;
        r.x = gsap.utils.wrap(-r.seg, 0, r.x + r.cfg.dir * (r.cfg.speed + vel * MX.marquee.boost) * f);
        r.track.style.transform = 'translate3d(' + r.x.toFixed(2) + 'px,0,0)';
      });
    };
    gsap.ticker.add(tick);
  }

  /* ══ 9 · IMAGE REVEAL (clip-path, ScrollTrigger) ══════════════════════════ */
  function bindReveals(scope) {
    if (!window.ScrollTrigger) return;
    try { gsap.registerPlugin(window.ScrollTrigger); } catch (e) { /* sudah terdaftar */ }
    const fresh = [...scope.querySelectorAll(MX.reveal)].filter(n => !n.dataset.mxRv && n.getClientRects().length && !n.closest('[hidden]'));
    if (!fresh.length) return;
    fresh.forEach((n, i) => {
      n.dataset.mxRv = '1';
      gsap.set(n, { clipPath: i % 2 ? 'inset(0% 100% 0% 0%)' : 'inset(100% 0% 0% 0%)' });
    });
    window.ScrollTrigger.batch(fresh, {
      start: 'top 92%', once: true, interval: 0.08, batchMax: 4,
      onEnter: batch => whenOpen(() => gsap.to(batch, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.15, ease: 'power4.inOut', stagger: 0.1, clearProps: 'clipPath' }))
    });
  }

  /* ══ 10 · MAGNET (tombol & menu) ══════════════════════════════════════════ */
  function initMagnet() {
    if (!fine) return;
    const store = new WeakMap();
    const mouse = { x: -999, y: -999 };
    let raf = 0;
    function step() {
      raf = 0;
      let busy = false;
      MX.magnet.forEach(group => {
        doc.querySelectorAll(group.sel).forEach(n => {
          if (n.disabled) return;
          let s = store.get(n);
          if (!s) { s = { x: 0, y: 0 }; store.set(n, s); }
          const r = n.getBoundingClientRect();
          const bx = r.left - s.x, by = r.top - s.y;        /* posisi asli tanpa pergeseran magnet */
          const inside = mouse.x > bx - group.pad && mouse.x < bx + r.width + group.pad && mouse.y > by - group.pad && mouse.y < by + r.height + group.pad;
          const tx = inside ? clamp((mouse.x - (bx + r.width / 2)) * group.k, -group.max, group.max) : 0;
          const ty = inside ? clamp((mouse.y - (by + r.height / 2)) * group.k, -group.max, group.max) : 0;
          s.x += (tx - s.x) * 0.18; s.y += (ty - s.y) * 0.18;
          if (Math.abs(s.x) < 0.05 && Math.abs(s.y) < 0.05 && !inside) {
            if (s.on) { n.style.removeProperty('--mx'); n.style.removeProperty('--my'); s.on = false; s.x = s.y = 0; }
          } else {
            n.style.setProperty('--mx', s.x.toFixed(2) + 'px'); n.style.setProperty('--my', s.y.toFixed(2) + 'px'); s.on = true; busy = true;
          }
        });
      });
      if (busy) raf = requestAnimationFrame(step);
    }
    doc.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      mouse.x = e.clientX; mouse.y = e.clientY;
      if (!raf) raf = requestAnimationFrame(step);
    }, { passive: true });
    doc.addEventListener('pointerleave', () => { mouse.x = mouse.y = -999; if (!raf) raf = requestAnimationFrame(step); });
  }

  /* ══ 11 · OBSERVER & BOOT ═════════════════════════════════════════════════
     Konten CMS dirender setelah DOMContentLoaded dan setelah tiap transisi Barba,
     jadi elemen baru dipindai ulang (idempotent) lewat MutationObserver. */
  let mo = null;
  function scan() {
    const main = container();
    if (!main) return;
    try { initMarquee(main); } catch (e) { console.warn('[PBB motion+] marquee dilewati', e); }
    try { bindReveals(main); } catch (e) { console.warn('[PBB motion+] reveal dilewati', e); }
  }
  const schedule = (() => { let f = 0; return () => { if (f) return; f = requestAnimationFrame(() => { f = 0; scan(); }); }; })();
  function observePage() {
    const main = container();
    if (!main || !('MutationObserver' in window)) return;
    if (mo) mo.disconnect();
    mo = new MutationObserver(schedule);
    mo.observe(main, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
  }

  /* preloader harus mengambil alih SEKARANG (sebelum DOMContentLoaded -> runLoader milik app.js) */
  try { takeoverPreloader(); } catch (err) {
    console.warn('[PBB motion+] preloader dilewati', err);
    const stuck = doc.querySelector('.pbb-pre');
    if (stuck) stuck.remove();
    root.classList.remove('pbb-preloading'); state.preloading = false; openGate();
  }

  function boot() {
    try { bindBarba(); } catch (e) { /* abaikan */ }
    try { initMagnet(); } catch (e) { /* abaikan */ }
    observePage();
    scan();
    window.addEventListener('pbb:content', schedule);
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot); else boot();
})();
