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
  const setPoster = n => {                     // обложка: <picture> на телефоне берёт вертикальную, поэтому меняем и её
    const src = sec.querySelector('.hx__view source');
    if (src) src.srcset = `img/hero/poster-${n}-p.jpg${Q}`;
    poster.src = `img/hero/poster-${n}.jpg${Q}`;
  };
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

  // сам ролик (компьютер / телефон вертикально / узкое окно) выбран в index.html через <source media>:
  // браузер начинает качать и запускает его ещё до этого скрипта
  let vRaf = 0;
  function vTick() {
    vRaf = 0;
    if (!vid.duration) return;
    show(clamp(vid.currentTime / vid.duration));
    if (!vid.paused && !vid.ended) vRaf = requestAnimationFrame(vTick);
  }
  const onPlaying = () => { sec.classList.add('hx--live'); setBtn(null); if (!vRaf) vRaf = requestAnimationFrame(vTick) };
  vid.addEventListener('playing', onPlaying);
  vid.addEventListener('timeupdate', () => { if (vid.duration) show(clamp(vid.currentTime / vid.duration)) });
  // по окончании держим финальный кадр картинкой — некоторые браузеры после конца видео показывают пустоту
  vid.addEventListener('ended', () => { setPoster('end'); sec.classList.remove('hx--live'); show(1); setBtn('Собрать ещё раз') });
  // скрытая вкладка откладывает автозапуск — запускаем, когда её открыли
  document.addEventListener('visibilitychange', () => { if (!document.hidden && vid.paused && !vid.ended && !reduced) play() });
  vid.muted = true;                            // iOS запускает сам только беззвучное видео
  function play() {
    const pr = vid.play();
    // браузер не дал запустить сам (режим энергосбережения, встроенный браузер мессенджера) —
    // запускаем от первого касания или нажатия в любом месте страницы; кнопка остаётся запасным вариантом
    if (pr && pr.catch) pr.catch(() => {
      setBtn('Смотреть, как собирается');
      const go = () => { ['touchstart', 'pointerdown', 'keydown'].forEach(e => removeEventListener(e, go, true)); if (vid.paused && !vid.ended) { setBtn(null); vid.play().catch(() => setBtn('Смотреть, как собирается')) } };
      ['touchstart', 'pointerdown', 'keydown'].forEach(e => addEventListener(e, go, { capture: true, passive: true }));
    });
  }
  btn.addEventListener('click', () => { if (vid.ended) vid.currentTime = 0; setBtn(null); play() });

  if (reduced) {                               // «меньше движения»: финальный кадр и текст, без ролика
    sec.classList.add('hx--static');
    setPoster('end');
    vid.autoplay = false; vid.pause();
    vid.querySelectorAll('source').forEach(s => s.remove()); vid.load();
    show(1);
  } else {
    show(0);
    if (!vid.paused && vid.readyState >= 3) onPlaying();   // ролик уже идёт — запустился до скрипта
    else play();
  }

  /* ── «Нам доверяют»: на прокрутке стопка отпечатков с именами раскладывается в стену, после сборки — заголовок ── */
  const trust = document.getElementById('trust');
  if (trust) {
    const wall = trust.querySelector('.trust__cols'), stage = trust.querySelector('.trust__stage');
    const hint = trust.querySelector('.trust__hint'), title = trust.querySelector('.trust__title'), foot = trust.querySelector('.trust__foot');
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
      shown.forEach(f => { f.style.transform = f._tf = ''; wall.append(f) });
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
      vars = {}; cur = target(); paint(cur);
    }
    // прокрутка → прогресс блока; на экран идёт сглаженный прогресс (cur): колесо мыши крутит ступеньками,
    // а снимки мягко догоняют за ~0,1 с. Стили пишутся только при изменении — вне блока ничего не трогаем.
    const target = () => clamp(-trust.getBoundingClientRect().top / (trust.offsetHeight - stage.offsetHeight));
    let cur = 0, vars = {}, raf = 0, tPrev = 0;
    const setVar = (el, key, name, v) => { if (vars[key] !== v) { vars[key] = v; el.style.setProperty(name, v) } };
    function paint(p) {
      shown.forEach((f, i) => {
        const k = 1 - ease(clamp((p - .04 - f._s) / .28));   // последний снимок встаёт к 80% прокрутки
        const tf = k ? `translate(${(f._dx * k).toFixed(1)}px,${(f._dy * k).toFixed(1)}px) rotate(${(f._rot * k).toFixed(2)}deg) scale(${(1 - .24 * k).toFixed(4)})` : '';
        if (f._tf !== tf) { f._tf = tf; f.style.transform = tf }
        setVar(f, 'pk' + i, '--pk', Math.min(1, k * 3).toFixed(3));   // рамка и имя видны до последней трети пути
        if (f._set !== !k) { f._set = !k; f.classList.toggle('is-set', !k) }
      });
      // переменные — прямо тем, кто их читает, а не всему блоку: иначе Safari пересчитывает стили всех снимков
      const tp = clamp((p - .7) / .16).toFixed(3);
      if (vars.tp !== tp) { vars.tp = tp; [wall, title, foot].forEach(el => el.style.setProperty('--tp', tp)) }
      setVar(hint, 'hp', '--hp', (1 - clamp(p / .12)).toFixed(3));
      if (vars.done !== p > .86) { vars.done = p > .86; trust.classList.toggle('done', vars.done) }
    }
    function tick(now) {
      const t = target(), dt = Math.min(64, now - (tPrev || now - 16));
      tPrev = now;
      cur += (t - cur) * (1 - Math.exp(-dt / 90));
      if (Math.abs(t - cur) < .0004) cur = t;
      paint(cur);
      raf = cur === t ? 0 : requestAnimationFrame(tick);
      if (!raf) tPrev = 0;
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
    if (!reduced) addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(tick) }, { passive: true });

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


/* «Залипание» на блоках при прокрутке (только компьютер). Пока Вы крутите — страница едет свободно, без рывков;
   когда прокрутка остановилась между блоками — плавно доезжает до блока в ту сторону, куда крутили.
   Внутри блоков выше экрана («Нам доверяют») прокрутка свободная. «Что мы берём на себя» и «Записаться на визит» —
   по центру экрана под шапкой; подвал — конец страницы. Любое касание колеса, трекпада или клавиши останавливает доводку. */
(function () {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const wide = matchMedia('(min-width: 861px)');
  // где страница может стоять: [от, до] для каждого блока (у блока выше экрана — весь его ход)
  function stops() {
    const vh = innerHeight, y0 = scrollY, end = document.documentElement.scrollHeight - vh, out = [];
    const H = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hh')) || 0;
    const top = el => el.getBoundingClientRect().top + y0;
    document.querySelectorAll('.hx,.tm,.kdsec,.trust,.ac').forEach(el => { const t = top(el); out.push([t, t + Math.max(0, el.offsetHeight - vh)]) });
    document.querySelectorAll('.ob>.wrap,.obv__in').forEach(el => {
      const t = top(el) - H, h = el.offsetHeight + H, c = t + (h - vh) / 2;
      out.push(h > vh ? [t, t + h - vh] : [c, c]);
    });
    out.push([end, end]);
    return out.map(s => s.map(v => Math.max(0, Math.min(end, v)))).sort((a, b) => a[0] - b[0]);
  }
  const ease = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  let last = scrollY, dir = 0, timer = 0, anim = 0, mine = false, kbd = false;
  function glide(to) {
    const from = scrollY, d = to - from, dur = Math.min(800, Math.max(380, 300 + Math.abs(d) * .35));
    let t0 = 0; mine = true;
    const step = now => {
      t0 = t0 || now; const k = Math.min(1, (now - t0) / dur);
      scrollTo(0, from + d * ease(k));
      if (k < 1) anim = requestAnimationFrame(step);
      else { anim = 0; setTimeout(() => { mine = false; last = scrollY }, 80) }
    };
    anim = requestAnimationFrame(step);
  }
  function settle() {
    if (!wide.matches || anim) return;
    const p = scrollY, S = stops();
    if (S.some(([a, b]) => p >= a - 1 && p <= b + 1)) return;   // и так стоит на блоке
    const prev = S.filter(s => s[1] < p).pop(), next = S.find(s => s[0] > p);
    if (!prev || !next) return;
    const back = p - prev[1], fwd = next[0] - p, nudge = kbd ? 0 : 48;   // случайный сдвиг колесом меньше 48 px — обратно
    glide(dir > 0 ? (back < nudge ? prev[1] : next[0]) : dir < 0 ? (fwd < nudge ? next[0] : prev[1]) : (back < fwd ? prev[1] : next[0]));
  }
  addEventListener('scroll', () => {
    if (mine) return;
    const y = scrollY; if (y !== last) dir = Math.sign(y - last); last = y;
    clearTimeout(timer); timer = setTimeout(settle, 140);
  }, { passive: true });
  const take = k => () => { kbd = k; if (anim) { cancelAnimationFrame(anim); anim = 0; mine = false; last = scrollY } };
  ['wheel', 'touchstart', 'pointerdown'].forEach(e => addEventListener(e, take(false), { passive: true }));
  addEventListener('keydown', take(true));
})();
