/* HOMEART — портал для дизайнеров · общий скрипт сайта (рабочая версия к запуску).
   Шапка, подвал, заявка на звонок. Личного кабинета на запуске нет (фаза 2):
   все посетители — гости, закрытые действия (3D, технички, просчёт) превращаются в заявку менеджеру. */
(function () {
  const ROOT = document.body.dataset.root || '';
  const PAGE = document.body.dataset.page || '';
  const LEVELS = ['guest', 'member', 'partner'];
  const LABEL = { guest: 'Гость', member: 'Участник', partner: 'Партнёр' };

  /* ── хранилище: браузер может запретить его (приватный режим) — работаем и без него ── */
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v) } catch (e) { return d } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)) } catch (e) { } }
  };
  const qs = new URLSearchParams(location.search);
  const BOT = 'https://t.me/homeart_interior_bot';   // HOMEART Community: анкета участника и доступ в группу анонсов

  const level = () => 'guest';
  const rank = l => LEVELS.indexOf(l);
  const has = need => !need || rank(level()) >= rank(need);

  /* ── форматирование ── */
  const MON = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  const MONS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  const WD = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
  const fmt = {
    rub: n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ₽',
    from: n => 'от ' + fmt.rub(n),
    eur: n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' €',
    date: s => { if (!s) return ''; const d = new Date(s + 'T12:00'); return d.getDate() + ' ' + MON[d.getMonth()] },
    dateY: s => { if (!s) return ''; const d = new Date(s + 'T12:00'); return d.getDate() + ' ' + MON[d.getMonth()] + ' ' + d.getFullYear() },
    day: s => new Date(s + 'T12:00').getDate(),
    mon: s => MONS[new Date(s + 'T12:00').getMonth()],
    wd: s => WD[new Date(s + 'T12:00').getDay()],
    short: s => { if (!s) return ''; const d = new Date(s + 'T12:00'); return String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0') },
    plural: (n, a, b, c) => { const m = n % 100, k = n % 10; return n + ' ' + (m >= 11 && m <= 14 ? c : k === 1 ? a : k >= 2 && k <= 4 ? b : c) },
  };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const initials = n => n.split(' ').map(w => w[0]).join('').slice(0, 2);
  const factory = id => (window.FACTORIES || []).find(f => f.id === id);
  // бренд из EXPO → карточка фабрики, если она есть в каталоге фабрик
  const BRAND_ALIAS = { 'CARL HANSEN': 'CARL HANSEN & SØN' };
  const norm = s => String(s || '').toUpperCase().replace(/[^A-Z0-9А-Я&]/g, '');
  const brandFactory = b => (window.FACTORIES || []).find(f => norm(f.name) === norm(BRAND_ALIAS[b] || b) || norm(f.name) === norm(b));
  const person = id => (window.TEAM || []).find(t => t.id === id);
  const TIERS = ['Средний', 'Выше среднего', 'Высокий', 'Люкс'];
  function tier(level, src) {
    const n = TIERS.indexOf(level) + 1;
    const dots = [1, 2, 3, 4].map(i => `<b class="${i <= n ? 'on' : ''}"></b>`).join('');
    const pre = src === 'предварительно' ? ' <em title="Уровень предварительный — требует проверки">предв.</em>' : '';
    return `<span class="tier" title="Ценовой уровень: ${esc(level)}"><i>${dots}</i>${esc(level)}${pre}</span>`;
  }
  const LOCK = '<svg class="lock" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="3" y="7" width="10" height="7" rx="1.5"/><path d="M5.5 7V5a2.5 2.5 0 015 0v2"/></svg>';
  const needBadge = () => '';   // уровней доступа на запуске нет

  /* ── шапка ── */
  const FILE = location.pathname.split('/').pop() || 'index.html', STOCK = /[?&]stock=1/.test(location.search);
  const ORDER = FILE === 'product-card.html' && /[?&]id=[tb]-/.test(location.search);   // карточка «под заказ» (t- с прежнего сайта, b- из базы) — раздел «Каталог», не «Наличие»
  const NAV = [
    { k: 'stock', t: 'Наличие', href: 'catalog.html?stock=1', on: () => (FILE === 'catalog.html' && STOCK) || ['product.html', 'product-card.html'].includes(FILE) && !ORDER },
    { k: 'kitchen', t: 'Кухни и системы хранения', h: '<span>Кухни и системы</span> <span>хранения</span>', href: 'kitchen.html', on: () => FILE === 'kitchen.html' },   // h — в шапке: на средних экранах в две строки
    { k: 'catalog', t: 'Каталог', href: 'catalog.html', on: () => (FILE === 'catalog.html' && !STOCK) || ['factories.html', 'factory.html'].includes(FILE) || ORDER },   // ведёт в каталог предметов
    { k: 'events', t: 'Академия', href: 'events.html' },
    { k: 'projects', t: 'Проекты', href: 'projects.html' },
    { k: 'showroom', t: 'Шоурум', href: 'showroom.html', also: ['services'], dd: [
      ['showroom.html', 'Шоурум', 'Пространство для ваших встреч'],
      ['services.html', 'Как мы работаем', 'От подбора до сборки'],
    ] },
  ];
  const isOn = n => n.on ? n.on() : PAGE === n.k || (n.also || []).includes(PAGE);   // страницы каталога делят data-page — пункт узнаём по файлу
  const PHONE = '+7 925 602-14-43';
  const TEL = 'tel:+79256021443';
  const IG = 'https://www.instagram.com/homeart_showroom', TG = 'https://t.me/homeart_interior';
  /* соцсети — иконками, без названий (шапка и мобильное меню) */
  const SOC = `<a href="${IG}" target="_blank" rel="noopener" aria-label="HOMEART в Instagram"><img src="${ROOT}assets/social/instagram.png" alt=""></a><a href="${TG}" target="_blank" rel="noopener" aria-label="HOMEART в Telegram"><svg viewBox="0 0 26 26" aria-hidden="true"><circle cx="13" cy="13" r="13" fill="#2AABEE"/><path d="M6.3 12.7l11.3-4.4c.5-.2 1 .1.8.9l-1.9 9c-.1.6-.5.8-1 .5l-2.9-2.1-1.4 1.3c-.2.2-.3.3-.6.3l.2-2.9 5.4-4.9c.2-.2 0-.3-.3-.1l-6.7 4.2-2.9-.9c-.6-.2-.6-.6.1-.9z" fill="#fff"/></svg></a>`;

  function renderHeader() {
    const el = document.getElementById('hdr'); if (!el) return;
    const nav = NAV.map(n => n.dd
      ? `<div class="nav__dd ${isOn(n) ? 'on' : ''}"><a href="${ROOT + n.href}" aria-haspopup="true">${n.t}
           <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M2 3.5l3 3 3-3"/></svg></a>
           <div class="nav__menu">${n.dd.map(([h, t, s]) => `<a href="${h[0] === '#' ? h : ROOT + h}">${t}<small>${s}</small></a>`).join('')}</div></div>`
      : `<a href="${ROOT + n.href}" class="${isOn(n) ? 'on' : ''}${n.h ? ' nav__2' : ''}">${n.h || n.t}</a>`).join('');
    const me = `<button type="button" class="btn btn--sm" data-call="Шапка: обсудить проект">Обсудить проект</button>`;
    const OVER = !!document.querySelector('[data-hdr-over]');
    el.innerHTML = `<header class="hdr" data-tone="${OVER ? 'dark' : 'light'}"><div class="wrap hdr__in">
        <a href="${ROOT}index.html" class="logo" aria-label="HOMEART, на главную"><img src="${ROOT}assets/logo/homeart-mark-${OVER ? 'white' : 'black'}.png" alt="HOMEART" width="917" height="135"></a>
        <nav class="nav" aria-label="Основная навигация">${nav}</nav>
        <div class="hdr__act">
          <a class="hdr__call" href="${TEL}" aria-label="Позвонить: ${PHONE}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2"/></svg>
            <span>${PHONE}</span></a>
          <div class="hdr__soc">${SOC}</div>
          <div class="hdr__me">${me}</div>
          <button type="button" class="burger" aria-label="Меню" aria-expanded="false" onclick="this.setAttribute('aria-expanded', document.getElementById('mnav').classList.toggle('on'))"><span></span></button>
        </div></div></header>
      <nav class="mnav" id="mnav" aria-label="Меню">
        ${NAV.map(n => n.dd ? `<a href="${ROOT + n.href}">${n.t}</a>` + n.dd.filter(([, t]) => t !== n.t).map(([h, t]) => `<a class="sub" href="${h[0] === '#' ? h : ROOT + h}">${t}</a>`).join('') : `<a href="${ROOT + n.href}">${n.t}</a>`).join('')}
        <a href="${ROOT}contacts.html">Контакты</a>
        <a href="#" data-call="Мобильное меню">Обсудить проект</a>
        <a href="${BOT}" target="_blank" rel="noopener">Стать участником HOMEART Academy</a>
        <div class="mnav__soc">${SOC}</div>
      </nav>`;
  }

  // шапка-хамелеон: по трём точкам на средней линии шапки смотрим, что под ней — светлое или тёмное (фото и видео считаем тёмным)
  function headerTone() {
    const wrap = document.getElementById('hdr'), hdr = wrap && wrap.querySelector('.hdr'); if (!hdr) return;
    const logo = hdr.querySelector('.logo img'), mnav = document.getElementById('mnav');
    // идём по слоям под точкой сверху вниз до непрозрачного фона; фото и видео считаем тёмными
    // только на первом экране (data-hdr-over) — фото товаров в списках не перекрашивают шапку
    const lumAt = (x, y) => {
      for (const el of document.elementsFromPoint(x, y)) {
        if (wrap.contains(el) || el.closest('[data-hdr-skip]')) continue;   // data-hdr-skip — декор (поле точек и т. п.), смотрим фон под ним
        if (/^(IMG|VIDEO|CANVAS)$/.test(el.tagName)) { if (el.closest('[data-hdr-over]')) return 0; continue; }
        const m = getComputedStyle(el).backgroundColor.match(/[\d.]+/g);
        if (m && (m.length < 4 || +m[3] > .5)) return (.2126 * m[0] + .7152 * m[1] + .0722 * m[2]) / 255;
      }
      return 1;
    };
    const darkAt = (x, y) => lumAt(x, y) < .5 ? 1 : 0;
    function tick() {
      const y = hdr.offsetHeight / 2, open = mnav && mnav.classList.contains('on');
      const dark = !open && darkAt(innerWidth * .2, y) + darkAt(innerWidth * .5, y) + darkAt(innerWidth * .8, y) >= 2;
      hdr.classList.toggle('is-scrolled', scrollY > 8);
      if (hdr.dataset.tone !== (dark ? 'dark' : 'light')) {
        hdr.dataset.tone = dark ? 'dark' : 'light';
        logo.src = logo.src.replace(/mark-(white|black)/, dark ? 'mark-white' : 'mark-black');
      }
    }
    let settle;   // и ещё раз, когда прокрутка остановилась: страница могла перестроиться (ролик на главной)
    addEventListener('scroll', () => { tick(); clearTimeout(settle); settle = setTimeout(tick, 180); }, { passive: true });
    addEventListener('resize', tick);
    addEventListener('load', tick);
    hdr.querySelector('.burger').addEventListener('click', () => setTimeout(tick));
    tick();
  }

  function renderFooter() {
    const el = document.getElementById('ftr'); if (!el) return;
    el.innerHTML = `<footer class="foot"><div class="wrap">
      <div class="foot__g">
        <div><a href="${ROOT}index.html" class="logo" aria-label="HOMEART, на главную"><img src="${ROOT}assets/logo/homeart-full-white.png" alt="HOMEART — Interior Showroom &amp; Project Partner" width="949" height="205"></a>
          <p class="foot__slogan">Больше чем шоурум. Комплектация интерьера для дизайнеров и архитекторов с 2009 года.</p></div>
        <div><h4>Каталог</h4><a href="${ROOT}catalog.html">Каталог предметов</a><a href="${ROOT}catalog.html?stock=1">В наличии</a><a href="${ROOT}factories.html">Каталог фабрик</a>
          <a href="${ROOT}kitchen.html">Кухни и системы хранения</a><a href="${ROOT}factories.html?tab=decor">Аксессуары и декор</a><a href="https://adh.homeart.pro/" target="_blank" rel="noopener">Искусство ↗</a></div>
        <div><h4>Дизайнерам</h4><a href="${ROOT}services.html">Как мы работаем</a><a href="${ROOT}projects.html">Проекты</a>
          <a href="${ROOT}events.html">Академия</a><a href="${BOT}" target="_blank" rel="noopener">Стать участником</a></div>
        <div><h4>Каналы</h4><div class="foot__soc">${SOC}</div><a href="${BOT}" target="_blank" rel="noopener">HOMEART Academy</a></div>
        <div><h4>Шоурум</h4><a href="${ROOT}showroom.html">Москва, 3-я Фрунзенская, 1</a><a href="${TEL}">${PHONE}</a>
          <a href="mailto:mos@homeart.pro">mos@homeart.pro</a><a href="${ROOT}contacts.html">Контакты</a></div>
      </div>
      <div class="foot__bar"><span>© 2026 HOMEART</span><nav class="foot__docs" aria-label="Документы"><a href="${ROOT}privacy.html">Политика конфиденциальности</a><a href="${ROOT}cookies.html">Политика использования cookies</a><a href="${ROOT}user-agreement.html">Пользовательское соглашение</a>
        <a href="${ROOT}personal-data.html">Согласие на обработку персональных данных</a><a href="${ROOT}messages.html">Согласие на получение сообщений</a></nav></div>
    </div></footer>`;
  }

  /* ── закрытые блоки: на запуске без регистрации — по запросу через менеджера ── */
  function applyLocks(scope) {
    (scope || document).querySelectorAll('[data-need][data-gate]').forEach(el => {
      let card = el.previousElementSibling && el.previousElementSibling.classList.contains('lockcard') ? el.previousElementSibling : null;
      el.hidden = true;
      if (!card) { card = document.createElement('div'); card.className = 'lockcard lockcard--open'; el.parentNode.insertBefore(card, el) }
      card.innerHTML = `<div><b>${esc(el.dataset.gate || 'По запросу')}</b>
        <p>Пришлём по запросу: оставьте телефон — менеджер свяжется и отправит материалы.</p>
        <button type="button" class="btn btn--sm btn--line" data-call="${esc(el.dataset.gate || 'Запрос материалов')}">Запросить</button></div>`;
    });
  }
  const ACT_LABEL = { '3d': 'Запрос 3D-модели', tech: 'Запрос технички', calc: 'Запрос просчёта', samples: 'Образцы к встрече',
    save: 'Сохранить', enroll: 'Запись', watch: 'Запись эфира', room: 'Бронь переговорной' };
  const intentOf = (act, what) => act && ACT_LABEL[act] ? `${ACT_LABEL[act]}${what ? ': ' + what : ''}` : (what || '');

  let toastT;
  function toast(html) {
    let t = document.getElementById('toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t) }
    t.innerHTML = html; t.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 4800);
  }

  /* ── модальные окна ── */
  function modal(html) {
    let m = document.getElementById('modal');
    if (!m) {
      m = document.createElement('div'); m.id = 'modal'; m.className = 'modal';
      m.innerHTML = '<div class="modal__box" role="dialog" aria-modal="true"><button type="button" class="modal__x" aria-label="Закрыть" data-close>×</button><div id="modalBody"></div></div>';
      document.body.appendChild(m);
      m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-close]')) closeModal() });
    }
    document.getElementById('modalBody').innerHTML = html;
    m.classList.add('on'); document.body.style.overflow = 'hidden';
    const f = m.querySelector('input,button:not(.modal__x)'); if (f) setTimeout(() => f.focus(), 30);
  }
  function closeModal() { const m = document.getElementById('modal'); if (m) m.classList.remove('on'); document.body.style.overflow = '' }

  /* заявка менеджеру — без регистрации (ТЗ §4.10): имя, любой контакт одной строкой, комментарий */
  function callback(ctx) {
    const page = document.title.replace(' — HOMEART', '').replace(' · HOMEART', '');
    const context = ctx && ctx !== page ? `${page} · ${ctx}` : page;
    modal(`<h2>Связаться с HOMEART</h2>
      <p class="muted small">Ответим на вопросы по проекту, позиции или фабрике.</p>
      <form class="form" id="cbForm" novalidate style="margin-top:14px">
        <input type="hidden" name="context" value="${esc(context)}">
        <div class="fld"><label for="cbName">Имя <i>*</i></label><input id="cbName" name="name" autocomplete="name"><div class="err">Укажите имя</div></div>
        <div class="fld"><label for="cbContact">Как с вами связаться <i>*</i></label><input id="cbContact" name="contact" autocomplete="off" placeholder="Телефон, Telegram или email"><div class="err">Укажите телефон, Telegram или email</div></div>
        <div class="fld"><label for="cbCom">Комментарий</label><textarea id="cbCom" name="comment" rows="3" placeholder="Например: подобрать диван в гостиную, нужен просчёт по спецификации"></textarea></div>
        <input name="website" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0">
        <button class="btn btn--block" type="submit">Отправить заявку</button>
        <p class="small" id="cbFail" role="alert" hidden style="margin:10px 0 0;color:var(--claret)">Не удалось отправить заявку. Попробуйте ещё раз или позвоните: <a href="${TEL}" style="border-bottom:1px solid">${PHONE}</a>.</p>
        <label class="chk cb-agree" id="cbAgreeL"><input type="checkbox" id="cbAgree" checked><span>Согласен на <a href="${ROOT}personal-data.html" target="_blank" style="border-bottom:1px solid">обработку персональных данных</a> и с <a href="${ROOT}privacy.html" target="_blank" style="border-bottom:1px solid">политикой конфиденциальности</a></span></label>
      </form>`);
    const form = document.getElementById('cbForm');
    form.addEventListener('submit', e => {
      e.preventDefault();
      const ok = [validate('cbName', v => v.trim().length > 1), validate('cbContact', v => v.trim().length > 3)].every(Boolean);
      const ag = document.getElementById('cbAgree').checked;
      document.getElementById('cbAgreeL').classList.toggle('bad', !ag);
      if (!ok || !ag) return;
      // заявка уходит в сервис форм на нашем сервере (_server/forms): пока только сохраняется, AmoCRM и почту подключим позже
      const btn = form.querySelector('[type=submit]'), fail = document.getElementById('cbFail'), f = new FormData(form);
      const body = { name: f.get('name'), contact: f.get('contact'), comment: f.get('comment'), context, website: f.get('website'),
        consent: true, page: location.href, ...visit() };
      btn.disabled = true; btn.textContent = 'Отправляем…'; fail.hidden = true;
      fetch('/api/lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        .then(r => r.json().catch(() => ({})).then(d => { if (!r.ok || !d.ok) throw new Error(r.status) }))
        .then(() => {
          toCalltouch(body);
          document.getElementById('modalBody').innerHTML = `<div class="done"><div class="done__i">✓</div><h2>Спасибо, заявка отправлена</h2>
            <p>Свяжемся с вами в рабочее время.</p>
            <button type="button" class="btn btn--line" data-close style="margin-top:18px">Закрыть</button></div>`;
        })
        .catch(() => { btn.disabled = false; btn.textContent = 'Отправить заявку'; fail.hidden = false });
    });
  }
  // Яндекс.Метрика и Calltouch — те же счётчики, что на прежнем сайте (Тильда); только на боевом адресе homeart.pro,
  // чтобы тестовый new.homeart.pro не портил статистику. Грузятся через 1,5 с после загрузки — не мешают ролику на главной.
  const PROD = /^(www\.)?homeart\.pro$/.test(location.hostname), YM = 100652507, CT = '8y9dpc6o';
  function counters() {
    if (!PROD) return;
    (function (m, e, t, r, i, k, a) { m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments) }; m[i].l = 1 * new Date();
      k = e.createElement(t), a = e.getElementsByTagName(t)[0], k.async = 1, k.src = r, a.parentNode.insertBefore(k, a) })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js', 'ym');
    window.ym(YM, 'init', { clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: true });
    (function (w, d, n, c) { w.CalltouchDataObject = n; w[n] = function () { w[n].callbacks.push(arguments) }; if (!w[n].callbacks) w[n].callbacks = [];
      w[n].loaded = false; w[n].counters = [c]; const s = d.createElement('script'); s.async = true;
      s.src = 'https://mod.calltouch.ru/' + (typeof Array.prototype.find === 'function' ? 'init-min.js' : 'init.js') + '?id=' + c; d.head.append(s) })(window, document, 'ct', CT);
  }
  // заявка → Calltouch (как на прежнем сайте): Calltouch заводит сделку в AmoCRM. Нужен телефон или почта —
  // заявка только с Telegram туда не уйдёт (она всё равно есть в Google-таблице)
  function toCalltouch(b) {
    if (!PROD || typeof window.ct !== 'function') return;
    try {
      const p = window.ct('calltracking_params', CT) || {}, c = String(b.contact || '').trim();
      const email = /\S+@\S+\.\S+/.test(c) ? c : '', phone = !email && c.replace(/\D/g, '').length >= 10 ? c : '';
      if (!p.siteId || (!phone && !email)) return;
      const d = { fio: b.name, phoneNumber: phone, email, subject: 'Заявка с ' + location.hostname, requestUrl: location.href,
        sessionId: p.sessionId, comment: [b.context, b.comment].filter(Boolean).join(' — ') };
      fetch(`https://api.calltouch.ru/calls-service/RestAPI/requests/${p.siteId}/register/`, { method: 'POST', mode: 'no-cors', keepalive: true,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: Object.keys(d).filter(k => d[k]).map(k => k + '=' + encodeURIComponent(d[k])).join('&') }).catch(() => {});
    } catch (e) {}
  }
  // откуда пришёл посетитель: метки рекламы (utm_*) и адрес-источник — запоминаем с первой страницы визита,
  // потому что заявку часто оставляют уже на другой странице
  function visit() {
    const K = 'ha-visit';
    try { const s = sessionStorage.getItem(K); if (s) return JSON.parse(s) } catch (e) {}
    const q = new URLSearchParams(location.search), v = { referrer: document.referrer && !document.referrer.startsWith(location.origin) ? document.referrer : '' };
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(k => { if (q.get(k)) v[k] = q.get(k) });
    try { sessionStorage.setItem(K, JSON.stringify(v)) } catch (e) {}
    return v;
  }
  function validate(id, test) {
    const i = document.getElementById(id), ok = test(i.value);
    i.closest('.fld').classList.toggle('bad', !ok); return ok;
  }

  /* ── обработка кликов ── */
  document.addEventListener('click', e => {
    const call = e.target.closest('[data-call]');
    if (call) { e.preventDefault(); callback(call.dataset.call); return }
    // 3D, технички, просчёт, образцы и прочие «закрытые» действия — заявка менеджеру с контекстом
    const el = e.target.closest('[data-need]:not([data-gate]), [data-act]');
    if (!el) return;
    e.preventDefault();
    callback(intentOf(el.dataset.act, el.dataset.what || el.textContent.trim()));
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal() });

  window.HA = { ROOT, level, has, fmt, esc, initials, factory, brandFactory, person, tier, needBadge, LOCK, toast, modal, closeModal,
    callback, applyLocks, store, LABEL, qs, PHONE, TEL, BOT };

  // баннер cookies: при первом заходе, внизу экрана; «Принять» — запоминаем на год и больше не показываем (на всех страницах).
  // Сайт им не перекрывается — можно листать и нажимать как обычно. Нет памяти браузера (приватный режим) — запомним в cookie.
  function cookieBar() {
    const KEY = 'ha-cookies', ok = () => { try { if (localStorage.getItem(KEY)) return true } catch (e) {} return /(^|; )ha_cookies=1/.test(document.cookie) };
    if (ok()) return;
    const bar = document.createElement('div');
    bar.className = 'ckbar'; bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'Файлы cookie');
    bar.innerHTML = `<p class="ckbar__long">Мы используем файлы cookie, чтобы сайт работал корректно и становился удобнее. Продолжая пользоваться сайтом, Вы соглашаетесь с <a href="${ROOT}cookies.html">политикой использования cookies</a>.</p>
      <p class="ckbar__short">Мы используем cookie. Продолжая пользоваться сайтом, Вы соглашаетесь с <a href="${ROOT}cookies.html">политикой cookies</a>.</p>
      <button type="button" class="btn btn--light btn--sm">Принять</button>`;
    bar.querySelector('button').addEventListener('click', () => {
      try { localStorage.setItem(KEY, new Date().toISOString().slice(0, 10)) } catch (e) {}
      document.cookie = 'ha_cookies=1; max-age=31536000; path=/; SameSite=Lax';
      bar.classList.remove('on'); setTimeout(() => bar.remove(), 400);
    });
    document.body.append(bar);
    setTimeout(() => bar.classList.add('on'), 900);   // чуть позже первого экрана — не мешает ролику и заголовку
  }

  renderHeader(); renderFooter(); headerTone(); cookieBar(); visit();
  if (document.readyState === 'complete') setTimeout(counters, 1500); else addEventListener('load', () => setTimeout(counters, 1500));   // visit() — запомнить метки рекламы с первой страницы
  let booted = false;
  const boot = () => { if (booted) return; booted = true; applyLocks() };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else setTimeout(boot, 0);
})();
