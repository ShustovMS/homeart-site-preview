/* Главная · первый экран: шоурум собирается от чертежа до настоящего фото.
   Ролик играет сам при открытии (с плавным ускорением, ~11 с), по его ходу меняются подписи.
   Кнопка видна только когда ролик не идёт: после конца — «Собрать ещё раз», если браузер не дал запустить — «Смотреть». */
(function () {
  const F = window.HERO_FRAMES || {};
  const ACTS = [0, 0.301, 0.469, 0.679];    // начало подписей: проект, кухня, мебель, готово (по монтажу ролика, см. _build/hero_speed.py)
  const Q = F.v ? `?v=${F.v}` : '';         // метка версии ролика (img/hero/frames.js) — чтобы не брать старые файлы из кэша

  const sec = document.getElementById('hx');
  if (!sec) return;
  const vid = sec.querySelector('.hx__vid');
  const poster = sec.querySelector('.hx__poster');
  const btn = sec.querySelector('.hxbtn'), btnText = btn.querySelector('span');
  const caps = [...sec.querySelectorAll('.cap__b')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  let act = -1;

  function show(p) {
    let a = 0;
    ACTS.forEach((x, i) => { if (p >= x) a = i });
    if (a !== act) { act = a; caps.forEach((c, i) => c.classList.toggle('on', i === a)) }
  }
  function setBtn(label) {                     // label = null — спрятать
    btn.classList.toggle('on', !!label);
    if (label) { btn.hidden = false; btnText.textContent = label }
  }

  vid.autoplay = true;
  vid.src = `img/hero/scene-${innerWidth < 860 ? 'm' : 'd'}.mp4${Q}`;
  let vRaf = 0;
  function vTick() {
    vRaf = 0;
    if (!vid.duration) return;
    show(clamp(vid.currentTime / vid.duration));
    if (!vid.paused && !vid.ended) vRaf = requestAnimationFrame(vTick);
  }
  vid.addEventListener('playing', () => { sec.classList.add('hx--live'); setBtn(null); if (!vRaf) vRaf = requestAnimationFrame(vTick) });
  vid.addEventListener('timeupdate', () => { if (vid.duration) show(clamp(vid.currentTime / vid.duration)) });
  // по окончании держим финальный кадр картинкой — некоторые браузеры после конца видео показывают пустоту
  vid.addEventListener('ended', () => { poster.src = `img/hero/poster-end.jpg${Q}`; sec.classList.remove('hx--live'); show(1); setBtn('Собрать ещё раз') });
  // скрытая вкладка откладывает автозапуск — запускаем, когда её открыли
  document.addEventListener('visibilitychange', () => { if (!document.hidden && vid.paused && !vid.ended && !reduced) play() });
  function play() {
    const pr = vid.play();
    if (pr && pr.catch) pr.catch(() => setBtn('Смотреть, как собирается'));   // браузер запретил автозапуск — остаётся обложка и кнопка
  }
  btn.addEventListener('click', () => { if (vid.ended) vid.currentTime = 0; setBtn(null); play() });

  if (reduced) {                               // «меньше движения»: финальный кадр и текст, без ролика
    sec.classList.add('hx--static');
    poster.src = `img/hero/poster-end.jpg${Q}`;
    vid.removeAttribute('src');
    show(1);
  } else {
    show(0);
    play();
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

/* HOMEART Academy · лента фото: течёт сама (как «река» на странице кухонь), под курсором медленнее;
   листается трекпадом вбок, перетаскиванием мышью или пальцем — с инерцией. Вне экрана — стоит. */
(function () {
  const river = document.querySelector('.ac-river');
  if (!river) return;
  const t = river.querySelector('.ac-river__track');
  t.insertAdjacentHTML('beforeend', t.innerHTML.replace(/ alt="[^"]*"/g, ' alt="" aria-hidden="true"'));   // вторая копия — поток без шва
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SPEED = 24;                      // px в секунду
  let x = 0, v = 0, half = 1, hover = false, drag = null, seen = false, last = 0;
  const measure = () => { half = t.scrollWidth / 2 + 6 };   // 6 — половина зазора между копиями
  measure(); addEventListener('resize', measure);
  function frame(now) {
    const dt = Math.min(.05, (now - last) / 1000 || 0); last = now;
    if (!drag) {
      x -= (still ? 0 : SPEED * (hover ? .35 : 1)) * dt + v;
      v *= .9; if (Math.abs(v) < .05) v = 0;
    }
    x = ((x % half) - half) % half;
    t.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;
    if (seen || drag || v) requestAnimationFrame(frame); else last = 0;
  }
  const run = () => { if (!last) { last = performance.now(); requestAnimationFrame(frame) } };
  new IntersectionObserver(([e]) => { seen = e.isIntersecting; if (seen) { measure(); run() } }).observe(river);
  river.addEventListener('mouseenter', () => hover = true);
  river.addEventListener('mouseleave', () => hover = false);
  river.addEventListener('wheel', e => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;     // вертикальную прокрутку страницы не перехватываем
    e.preventDefault(); v += e.deltaX * .06; run();
  }, { passive: false });
  river.addEventListener('pointerdown', e => {
    drag = { lx: e.clientX }; v = 0;
    river.setPointerCapture(e.pointerId); river.classList.add('is-drag');
  });
  river.addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.lx; drag.lx = e.clientX; x += dx; drag.v = dx;
    t.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;
  });
  const end = () => { if (!drag) return; v = Math.max(-40, Math.min(40, -(drag.v || 0) * .9)); drag = null; river.classList.remove('is-drag'); run() };
  river.addEventListener('pointerup', end); river.addEventListener('pointercancel', end);
})();

/* Обязательства: карточка переворачивается по нажатию и остаётся перевёрнутой, пока не нажмут снова —
   успеете прочитать. Карточки въезжают по одной, когда доходят до экрана. */
(function () {
  const sec = document.getElementById('ob');
  if (!sec) return;
  sec.addEventListener('click', e => {
    const c = e.target.closest('.ob__t');
    if (c) c.setAttribute('aria-pressed', c.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
  });
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
  const items = [...sec.querySelectorAll('.ob__grid > li')];
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) } }), { rootMargin: '0px 0px -10% 0px' });
  sec.classList.add('is-reveal');
  items.forEach((li, i) => { li.style.transitionDelay = (i % 4) * 70 + 'ms'; io.observe(li) });
})();

