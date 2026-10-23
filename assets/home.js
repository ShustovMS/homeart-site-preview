/* Главная · сцена «дизайн-проект собирается».
   Два режима:
   · ролик (по умолчанию) — видео играет само при открытии, прокрутка страницы на него не влияет;
   · сборка — клик по шкале этапов: сцена закрепляется, кадр = положение прокрутки (canvas),
     вниз проект собирается, вверх разбирается. Кнопка ▶ возвращает ролик с текущего места.
   В обоих режимах прогресс 0…1 управляет подписями и шкалой. */
(function () {
  const F = window.HERO_FRAMES || { count: 0 };
  const ACTS = [0, 0.318, 0.53, 0.795];     // начало этапа: проект, кухня, мебель, готово (6, 10, 15 с из 18,9 с ролика)
  const BOUNDS = [...ACTS, 1];
  const Q = F.v ? `?v=${F.v}` : '';         // метка версии ролика (img/hero/frames.js) — чтобы не брать старые файлы из кэша

  const sec = document.getElementById('hx');
  if (!sec) return;
  const stage = sec.querySelector('.hx__stage');
  const view = sec.querySelector('.hx__view');
  const vid = sec.querySelector('.hx__vid');
  const cv = sec.querySelector('.hx__cv');
  const poster = sec.querySelector('.hx__poster');
  const ctx = cv.getContext('2d');
  const playBtn = sec.querySelector('.hxst__play');
  const hintEl = sec.querySelector('.hxst__hint');
  const segs = [...sec.querySelectorAll('.seg')];
  const caps = [...sec.querySelectorAll('.cap__b')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const narrow = innerWidth < 860;

  let mode = 'video', prog = 0, act = -1, userPaused = false;

  /* ── подписи и шкала ── */
  function show(p) {
    prog = p;
    playBtn.style.setProperty('--p', (p * 100).toFixed(2));   // кольцо вокруг кнопки = ход ролика
    segs.forEach((s, i) => s.style.setProperty('--f', clamp((p - BOUNDS[i]) / (BOUNDS[i + 1] - BOUNDS[i])).toFixed(4)));
    let a = 0;
    ACTS.forEach((x, i) => { if (p >= x) a = i });
    if (a !== act) {
      act = a;
      caps.forEach((c, i) => c.classList.toggle('on', i === a));
      segs.forEach((s, i) => { s.classList.toggle('on', i === a); s.setAttribute('aria-current', i === a ? 'step' : 'false') });
    }
  }
  function setPlayIcon() {
    const playing = mode === 'video' && !vid.paused && !vid.ended;
    playBtn.classList.toggle('is-playing', playing);
    playBtn.classList.toggle('is-ended', mode === 'video' && vid.ended);
    playBtn.setAttribute('aria-label', playing ? 'Пауза' : mode === 'scrub' ? 'Смотреть роликом' : vid.ended ? 'Смотреть снова' : 'Смотреть');
  }
  const hint = on => { if (hintEl) hintEl.hidden = !on };   // «листайте» — только в режиме сборки

  /* ── режим «ролик» ── */
  vid.autoplay = true;
  vid.src = `img/hero/scene-${narrow ? 'm' : 'd'}.mp4${Q}`;
  let vRaf = 0;
  function vTick() {
    vRaf = 0;
    if (mode !== 'video' || !vid.duration) return;
    show(clamp(vid.currentTime / vid.duration));
    if (!vid.paused && !vid.ended) vRaf = requestAnimationFrame(vTick);
  }
  vid.addEventListener('playing', () => { sec.classList.add('hx--live'); setPlayIcon(); if (!vRaf) vRaf = requestAnimationFrame(vTick) });
  vid.addEventListener('pause', setPlayIcon);
  vid.addEventListener('timeupdate', () => { if (mode === 'video' && vid.duration) show(clamp(vid.currentTime / vid.duration)) });
  // по окончании держим финальный кадр картинкой — некоторые браузеры после конца видео показывают пустоту
  vid.addEventListener('ended', () => { poster.src = `img/hero/poster-end.jpg${Q}`; sec.classList.remove('hx--live'); show(1); setPlayIcon(); preload() });
  // скрытая вкладка откладывает автозапуск — запускаем, когда её открыли (если не ставили на паузу сами)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && mode === 'video' && vid.paused && !vid.ended && !userPaused && !reduced) vid.play().catch(() => {});
  });
  function playVideo(from) {
    mode = 'video';
    sec.classList.remove('hx--scrub');
    removeEventListener('scroll', schedule);
    if (from != null && vid.duration) vid.currentTime = Math.min(from, .999) * vid.duration;
    if (from != null && from >= .999) vid.currentTime = 0;
    hint(false);
    const pr = vid.play();
    if (pr && pr.catch) pr.catch(() => setPlayIcon());   // браузер запретил автозапуск — остаётся постер и кнопка ▶
    setPlayIcon();
  }

  /* ── режим «сборка»: кадры в canvas по прокрутке ── */
  const set = narrow ? 'm' : 'd';
  const imgs = new Array(F.count), ready = new Uint8Array(F.count);
  let want = 0, shown = -1, loading = false;
  function load(i) {
    if (imgs[i]) return;
    const im = new Image();
    im.decoding = 'async';
    im.onload = () => { ready[i] = 1; if (mode === 'scrub' && i === nearest(want)) draw(want) };
    im.src = `img/hero/${set}/${String(i).padStart(4, '0')}.webp${Q}`;
    imgs[i] = im;
  }
  function preload() {                         // сначала каждый 16-й кадр, потом всё плотнее
    if (loading || !F.count) return;
    loading = true;
    for (const n of [16, 8, 4, 2, 1]) for (let i = 0; i < F.count; i += n) load(i);
  }
  function nearest(i) {
    for (let d = 0; d < F.count; d++) {
      if (i - d >= 0 && ready[i - d]) return i - d;
      if (i + d < F.count && ready[i + d]) return i + d;
    }
    return -1;
  }
  function draw(i) {
    const k = nearest(i);
    if (k < 0 || k === shown) return;
    const im = imgs[k], cw = cv.width, ch = cv.height;
    const s = Math.max(cw / im.naturalWidth, ch / im.naturalHeight);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(im, (cw - im.naturalWidth * s) / 2, (ch - im.naturalHeight * s) / 2, im.naturalWidth * s, im.naturalHeight * s);
    shown = k;
    sec.classList.add('hx--cv');                // canvas показан — видео под ним можно прятать
  }
  let top = 0, span = 1;
  function measure() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = Math.round(view.clientWidth * dpr); cv.height = Math.round(view.clientHeight * dpr);
    const hdr = parseFloat(getComputedStyle(stage).top) || 0;
    top = sec.getBoundingClientRect().top + scrollY - hdr;
    span = Math.max(1, sec.offsetHeight - stage.clientHeight);
    shown = -1;
  }
  let raf = 0;
  const progress = () => clamp((scrollY - top) / span);
  function tick() { raf = 0; if (mode !== 'scrub') return; const p = progress(); want = Math.round(p * (F.count - 1)); draw(want); show(p) }
  function schedule() { if (!raf) raf = requestAnimationFrame(tick) }

  function scrubFrom(p) {
    if (!F.count) return;
    if (mode === 'video') vid.pause();
    mode = 'scrub';
    preload();
    // пока нужный кадр грузится, на экране остаётся текущий кадр видео
    sec.classList.add('hx--scrub');
    measure();
    want = Math.round(p * (F.count - 1));
    scrollTo({ top: top + span * p, behavior: 'instant' });
    draw(want); show(p);
    addEventListener('scroll', schedule, { passive: true });
    hint(true);
    setPlayIcon();
  }

  /* ── управление ── */
  segs.forEach((s, i) => s.addEventListener('click', e => {
    const r = s.getBoundingClientRect();
    const frac = clamp((e.clientX - r.left) / r.width);
    const p = e.detail === 0 ? BOUNDS[i] + .001 : BOUNDS[i] + frac * (BOUNDS[i + 1] - BOUNDS[i]);   // с клавиатуры — начало этапа
    if (mode === 'scrub') scrollTo({ top: top + span * p, behavior: 'smooth' });
    else scrubFrom(p);
  }));
  playBtn.addEventListener('click', () => {
    if (mode === 'scrub') { sec.classList.remove('hx--cv'); playVideo(prog); scrollTo({ top: Math.max(0, top), behavior: 'instant' }); return }
    if (vid.ended) playVideo(0);
    else if (vid.paused) { userPaused = false; playVideo() }
    else { userPaused = true; vid.pause() }
  });
  addEventListener('resize', () => { if (mode === 'scrub') { measure(); schedule() } });

  if (reduced) {                               // «меньше движения»: финальный кадр и текст, без ролика
    sec.classList.add('hx--static');
    poster.src = `img/hero/poster-end.jpg${Q}`;
    vid.removeAttribute('src');
    show(1);
  } else {
    show(0);
    playVideo();
  }

  /* ── «Нам доверяют»: на прокрутке стопка отпечатков с именами раскладывается в стену, после сборки — заголовок ── */
  const trust = document.getElementById('trust');
  if (trust) {
    const wall = trust.querySelector('.trust__cols'), stage = trust.querySelector('.trust__stage');
    const faces = [...wall.querySelectorAll('.face')];
    const clamp = v => Math.max(0, Math.min(1, v)), ease = x => 1 - Math.pow(1 - x, 3);
    let shown = [], W = innerWidth;

    // делим снимки по порядку на k рядов так, чтобы самый «длинный» ряд (сумма пропорций) был как можно короче — ряды выходят ровными
    function split(R, k) {
      const n = R.length, pre = [0];
      R.forEach(r => pre.push(pre[pre.length - 1] + r));
      const best = [pre.map(s => s)], cut = [[]];      // best[j][i]: лучший максимум для первых i снимков в j+1 рядах
      for (let j = 1; j < k; j++) {
        best[j] = [0]; cut[j] = [0];
        for (let i = 1; i <= n; i++) {
          let m = Infinity, c = 0;
          for (let t = j; t < i; t++) { const v = Math.max(best[j - 1][t], pre[i] - pre[t]); if (v < m) { m = v; c = t } }
          best[j][i] = m; cut[j][i] = c;
        }
      }
      const rows = [];
      for (let j = k - 1, i = n; j >= 0; j--) { const t = j ? cut[j][i] : 0; rows.unshift(R.slice(t, i).map((_, q) => t + q)); i = t }
      return rows;
    }
    // ровные ряды во всю ширину, снимки целиком; число рядов — чтобы стена заняла экран побольше;
    // если не влезает по высоте — стена уменьшается и встаёт по центру. Потом — откуда каждый снимок летит из стопки
    function lay() {
      shown = faces.slice(0, innerWidth <= 760 ? 12 : faces.length);
      wall.textContent = '';
      shown.forEach(f => { f.style.transform = ''; wall.append(f) });
      const full = wall.clientWidth, gap = Math.max(6, Math.min(10, innerWidth * .007)), maxH = innerHeight - (innerWidth <= 760 ? 230 : 200);
      const R = shown.map(f => { const im = f.querySelector('img'); return im.getAttribute('width') / im.getAttribute('height') });
      const fit = (rows, w) => rows.map(r => (w - gap * (r.length - 1)) / r.reduce((s, i) => s + R[i], 0));
      let best;
      for (let k = 1; k <= Math.min(8, shown.length); k++) {
        const rows = split(R, k), hs = fit(rows, full), total = hs.reduce((a, b) => a + b, 0) + gap * (rows.length - 1);
        const sc = Math.min(1, maxH / total), area = sc * sc * total * full;
        if (!best || area > best.area) best = { rows, sc, area };
      }
      const ww = full * best.sc, hs = fit(best.rows, ww);
      let y = 0;
      best.rows.forEach((r, ri) => {
        let x = (full - ww) / 2;
        r.forEach(i => {
          const fw = R[i] * hs[ri];
          Object.assign(shown[i].style, { left: x + 'px', top: y + 'px', width: fw + 'px', height: hs[ri] + 'px' });
          x += fw + gap;
        });
        y += hs[ri] + gap;
      });
      wall.style.height = (y - gap) + 'px';
      if (reduced) { shown.forEach(f => f.classList.add('is-set')); return }
      const w = wall.getBoundingClientRect(), cx = w.left + w.width / 2, cy = w.top + w.height / 2, N = shown.length;
      // порядок раскладки — вразброс, но снимки с именами лежат сверху стопки и улетают первыми
      const order = shown.map((f, i) => [f, (i * 11 + 5) % N]).sort((a, b) => !!b[0].querySelector('.face__name') - !!a[0].querySelector('.face__name') || a[1] - b[1]).map(e => e[0]);
      shown.forEach((f, i) => {
        const r = f.getBoundingClientRect(), o = order.indexOf(f);
        Object.assign(f, { _dx: cx - r.left - r.width / 2 + ((i * 29) % 17 - 8) * 2, _dy: cy - r.top - r.height / 2 + ((i * 41) % 13 - 6) * 2,
          _rot: ((i * 53) % 21 - 10) * 1.1, _s: o / N * .48 });
        f.style.zIndex = N - o;
      });
      paint();
    }
    function paint() {
      const p = clamp(-trust.getBoundingClientRect().top / (trust.offsetHeight - stage.offsetHeight));
      shown.forEach(f => {
        const k = 1 - ease(clamp((p - .04 - f._s) / .28));   // последний снимок встаёт к 80% прокрутки
        f.style.transform = k ? `translate(${f._dx * k}px,${f._dy * k}px) rotate(${f._rot * k}deg) scale(${1 - .24 * k})` : '';
        f.style.setProperty('--pk', Math.min(1, k * 3).toFixed(3));   // рамка и имя видны до последней трети пути
        f.classList.toggle('is-set', !k);
      });
      trust.style.setProperty('--tp', clamp((p - .7) / .16).toFixed(3));
      trust.style.setProperty('--hp', (1 - clamp(p / .12)).toFixed(3));
      trust.classList.toggle('done', p > .86);
    }
    lay();
    addEventListener('resize', () => { if (innerWidth !== W) { W = innerWidth; lay() } });
    // снимки видны уже в стопке — грузим заранее, за полтора экрана до блока
    if ('IntersectionObserver' in window) {
      const pre = new IntersectionObserver(es => {
        if (es.some(e => e.isIntersecting)) { faces.forEach(f => f.querySelector('img').loading = 'eager'); pre.disconnect() }
      }, { rootMargin: '150% 0px' });
      pre.observe(trust);
    }
    if (!reduced) {
      let rq = 0;
      addEventListener('scroll', () => { if (!rq) rq = requestAnimationFrame(() => { rq = 0; paint() }) }, { passive: true });
    }

    // на телефоне наведения нет: собранные снимки по очереди сами становятся цветными
    if (!reduced && !matchMedia('(hover: hover) and (pointer: fine)').matches) {
      let prev = null;
      setInterval(() => {
        if (prev) { prev.classList.remove('is-color'); }
        if (!trust.classList.contains('done')) { prev = null; return }
        const vis = shown.filter(f => {
          const r = f.getBoundingClientRect();
          return f !== prev && r.left >= 0 && r.right <= innerWidth && r.top >= innerHeight * .12 && r.bottom <= innerHeight * .9;
        });
        prev = vis[Math.floor(Math.random() * vis.length)] || null;
        if (prev) prev.classList.add('is-color');
      }, 2600);
    }
  }
})();
