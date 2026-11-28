/* Only Molteni's photo viewer and detail tabs. Forms belong to site.js. */
(() => {
  'use strict';
  // Nested pages remain part of the Kitchen Division in the shared navigation.
  document.querySelectorAll('.nav a,.mnav a').forEach(a => {
    if (a.getAttribute('href') === (document.body.dataset.root || '') + 'kitchen.html') {
      a.classList.add('on');
      a.setAttribute('aria-current', 'page');
    }
  });

  const tabs = [...document.querySelectorAll('.mk-tab')];
  const images = [...document.querySelectorAll('.mk-tab-image')];
  const label = document.getElementById('physisTabLabel');
  tabs.forEach(tab => tab.addEventListener('click', () => {
    const index = tab.dataset.index;
    tabs.forEach(t => {
      const active = t === tab;
      t.classList.toggle('on', active);
      t.setAttribute('aria-pressed', String(active));
    });
    images.forEach(img => {
      const active = img.dataset.index === index;
      img.classList.toggle('is-active', active);
      img.tabIndex = active ? 0 : -1;
    });
    if (label) label.textContent = tab.dataset.label || '';
  }));
  images.forEach(img => { img.tabIndex = img.classList.contains('is-active') ? 0 : -1; });

  let viewer, origin, previousOverflow;
  const close = () => { if (viewer?.open) viewer.close(); };
  function show(image) {
    if (!viewer) {
      viewer = document.createElement('dialog');
      viewer.className = 'mk-lightbox';
      viewer.setAttribute('aria-label', 'Просмотр фотографии');
      const photo = document.createElement('img');
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-label', 'Закрыть фотографию');
      button.textContent = '×';
      button.addEventListener('click', close);
      viewer.append(photo, button);
      document.body.append(viewer);
      viewer.addEventListener('click', e => { if (e.target === viewer) close(); });
      viewer.addEventListener('close', () => {
        document.documentElement.style.overflow = previousOverflow;
        origin?.focus({ preventScroll: true });
      });
    }
    origin = image;
    previousOverflow = document.documentElement.style.overflow;
    const photo = viewer.querySelector('img');
    photo.src = image.currentSrc || image.src;
    photo.alt = image.alt;
    viewer.showModal();
    document.documentElement.style.overflow = 'hidden';
  }
  document.querySelectorAll('[data-lightbox]').forEach(image => {
    image.addEventListener('click', () => show(image));
    image.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(image); }
    });
  });
})();
