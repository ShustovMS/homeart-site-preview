/* Каталог: общие детали для «Предметов» и «Фабрик» — панели фильтров и подсказки поиска. */
(function () {
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const norm = s => String(s || '').toLowerCase().replace(/ё/g, 'е');
  // выделяем совпадение жирным, не ломая разметку
  const hl = (text, q) => {
    const t = String(text ?? ''), i = q ? norm(t).indexOf(norm(q)) : -1;
    return i < 0 ? esc(t) : esc(t.slice(0, i)) + '<mark>' + esc(t.slice(i, i + q.length)) + '</mark>' + esc(t.slice(i + q.length));
  };
  const CHEV = '<svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M2 3.5l3 3 3-3"/></svg>';
  const X = '<svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M2 2l6 6M8 2l-6 6"/></svg>';

  /* ── выпадающая панель фильтра: одна открыта за раз, закрывается кликом мимо и Esc ── */
  let open = null;
  function closePop() {
    if (!open) return;
    open.pop.classList.remove('on'); open.btn.setAttribute('aria-expanded', 'false'); open = null;
  }
  function pop(btn, fill) {
    const was = open && open.btn === btn; closePop(); if (was) return;
    let el = document.getElementById('cxPop');
    if (!el) { el = document.createElement('div'); el.id = 'cxPop'; el.className = 'cx-pop'; el.setAttribute('role', 'dialog'); document.body.append(el) }
    fill(el);
    const r = btn.getBoundingClientRect();
    el.style.top = (r.bottom + 8) + 'px';
    el.style.left = Math.min(r.left, innerWidth - Math.min(340, innerWidth - 24) - 12) + 'px';
    el.classList.add('on'); btn.setAttribute('aria-expanded', 'true'); open = { btn, pop: el };
    const f = el.querySelector('input'); if (f && matchMedia('(pointer:fine)').matches) f.focus({ preventScroll: true });
  }
  document.addEventListener('click', e => { if (open && !open.pop.contains(e.target) && !open.btn.contains(e.target)) closePop() });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closePop() });
  addEventListener('scroll', () => { if (open && matchMedia('(min-width:761px)').matches) closePop() }, { passive: true });

  /* ── подсказки поиска: группы, ↑↓ и Enter ── */
  function suggest(input, box, groupsFor, onEnter) {
    let items = [], at = -1;
    const clear = input.closest('.cx-search').querySelector('.cx-search__x');
    function render() {
      const q = input.value.trim();
      if (clear) clear.hidden = !input.value;
      if (!q) { box.classList.remove('on'); return }
      const groups = groupsFor(q).filter(g => g.items.length);
      items = []; at = -1;
      box.innerHTML = groups.length ? groups.map(g => `<h5>${g.title}</h5>` + g.items.map(it => {
        items.push(it);
        const tag = it.href ? `a href="${it.href}"${it.ext ? ' target="_blank" rel="noopener"' : ''}` : 'button type="button"';
        return `<${tag} class="cx-sug__it" data-i="${items.length - 1}">${it.html}</${it.href ? 'a' : 'button'}>`;
      }).join('')).join('') + `<button type="button" class="cx-sug__it cx-sug__all" data-all>Показать всё по запросу «${esc(q)}»</button>`
        : `<div class="cx-sug__empty">Подсказок нет. Нажмите Enter — поищем по всем полям.</div>`;
      box.classList.add('on');
    }
    function move(d) {
      const els = box.querySelectorAll('.cx-sug__it'); if (!els.length) return;
      at = (at + d + els.length) % els.length;
      els.forEach((e, i) => e.classList.toggle('on', i === at)); els[at].scrollIntoView({ block: 'nearest' });
    }
    function pick(el) {
      if (el.hasAttribute('data-all')) { onEnter(input.value.trim()); box.classList.remove('on'); return }
      const it = items[+el.dataset.i]; if (!it) return;
      if (it.pick) { it.pick(); input.value = ''; render() }
    }
    input.addEventListener('input', render);
    input.addEventListener('focus', render);
    input.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); move(1) }
      else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1) }
      else if (e.key === 'Escape') { box.classList.remove('on'); input.blur() }
      else if (e.key === 'Enter') {
        e.preventDefault();
        const el = box.querySelectorAll('.cx-sug__it')[at];
        if (el && at >= 0) { el.tagName === 'A' ? el.click() : pick(el) }
        else { onEnter(input.value.trim()); box.classList.remove('on') }
      }
    });
    box.addEventListener('click', e => { const el = e.target.closest('button.cx-sug__it'); if (el) pick(el) });
    document.addEventListener('click', e => { if (!input.closest('.cx-search').contains(e.target)) box.classList.remove('on') });
    if (clear) clear.addEventListener('click', () => { input.value = ''; onEnter(''); render(); input.focus() });
    return { render };
  }

  window.CX = { esc, norm, hl, pop, closePop, suggest, CHEV, X };
})();
