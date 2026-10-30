/* Раздел «Проекты»: общие функции страниц проекта и дизайнера — метатеги, плитки проектов, просмотр фото. */
window.PJ = (function () {
  const esc = HA.esc;
  // метатеги страницы — из данных раздела (перенесены со старого homeart.pro)
  function meta(title, description, image) {
    document.title = title;
    const set = (sel, v) => { const m = document.querySelector(sel); if (m && v) m.setAttribute('content', v) };
    set('meta[name="description"]', description);
    set('meta[property="og:title"]', title);
    set('meta[property="og:description"]', description);
    if (image) set('meta[property="og:image"]', new URL(image, location.href).href);
  }
  const tiles = list => list.map(p => `<a class="ptile" href="project.html?id=${encodeURIComponent(p.id)}">
    <div class="ptile__p">${p.photos[0] ? `<img loading="lazy" src="${p.photos[0]}" alt="${esc(p.title)}">` : ''}</div>
    <div class="ptile__b"><span class="ptile__t">${esc(p.title)}</span>${p.author ? `<span class="ptile__a">${esc(p.author)}</span>` : ''}</div></a>`).join('');
  // просмотр фото во весь экран: клик по фото с data-i
  function lightbox(photos) {
    const lb = document.getElementById('lb'); if (!lb || !photos.length) return;
    const t = document.getElementById('lbT'), c = document.getElementById('lbC');
    t.innerHTML = photos.map((s, i) => `<figure><img loading="lazy" src="${s}" alt="Фото ${i + 1}"></figure>`).join('');
    const idx = () => Math.round(t.scrollLeft / (t.clientWidth || 1));
    const go = i => { i = Math.max(0, Math.min(photos.length - 1, i)); t.scrollTo({ left: i * t.clientWidth }); c.textContent = `${i + 1} / ${photos.length}` };
    t.addEventListener('scroll', () => { c.textContent = `${idx() + 1} / ${photos.length}` }, { passive: true });
    document.getElementById('lbX').onclick = () => lb.close();
    document.getElementById('lbP').onclick = () => go(idx() - 1);
    document.getElementById('lbN').onclick = () => go(idx() + 1);
    lb.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') go(idx() - 1); if (e.key === 'ArrowRight') go(idx() + 1) });
    lb.addEventListener('close', () => { document.body.style.overflow = '' });
    document.getElementById('main').addEventListener('click', e => {
      const f = e.target.closest('[data-i]'); if (!f || typeof lb.showModal !== 'function') return;
      lb.showModal(); document.body.style.overflow = 'hidden'; go(+f.dataset.i);
    });
  }
  // баннер: фото сменяются сами каждые 5 секунд (как слайдер на старом сайте), точки — переход к фото, пауза при наведении
  function slider(root) {
    if (!root) return;
    const figs = [...root.querySelectorAll('figure')], dots = [...root.querySelectorAll('[data-s]')];
    if (figs.length < 2) return;
    let i = 0, t;
    const show = n => { i = (n + figs.length) % figs.length; figs.forEach((f, k) => f.classList.toggle('on', k === i)); dots.forEach((d, k) => d.classList.toggle('on', k === i)) };
    const still = matchMedia('(prefers-reduced-motion:reduce)').matches;
    const run = () => { clearInterval(t); if (!still) t = setInterval(() => show(i + 1), 5000) };
    dots.forEach(d => d.onclick = e => { e.stopPropagation(); show(+d.dataset.s); run() });
    root.addEventListener('mouseenter', () => clearInterval(t)); root.addEventListener('mouseleave', run);
    let x0 = null;
    root.addEventListener('touchstart', e => { x0 = e.touches[0].clientX }, { passive: true });
    root.addEventListener('touchend', e => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) { show(i + (dx < 0 ? 1 : -1)); run() } x0 = null });
    run();
  }
  return { meta, tiles, lightbox, slider };
})();
