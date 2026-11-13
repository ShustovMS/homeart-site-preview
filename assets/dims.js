/* Размеры из каталога наличия → понятный вид: каждое измерение с новой строки, по-русски, в сантиметрах.
   «L 3340 D 960/1520 H 920»  →  Длина 334 · Ширина 96 / 152 · Высота 92 см
   «110*200 Н.76 / 95*110 Н.76 / 275*110 Н.76» → три элемента, у каждого свои строки.
   Не разобрали строку — возвращаем её как есть (raw), ничего не выдумываем.
   Ручные поправки для отдельных позиций — в data/card-format.js (поле dims). */
(function (root) {
  const NAME = { L: 'Длина', W: 'Ширина', H: 'Высота', O: 'Диаметр' };
  const RU = { 'длина': 'L', 'ширина': 'W', 'глубина': 'W', 'высота': 'H', 'диаметр': 'O' };
  const num = s => parseFloat(String(s).replace(',', '.'));

  // одна часть строки → {label, v:{L,W,H,O}} или null
  function part(src, type, unitHint) {
    let s = ' ' + src + ' ', label = '';
    const lab = s.match(/^\s*(спальное место|матрас)\s*/i);
    if (lab) { label = lab[1][0].toUpperCase() + lab[1].slice(1).toLowerCase(); s = s.slice(lab[0].length) }
    s = s.replace(/(\d),(\d)/g, '$1.$2').replace(/[НH]\s*\.?\s*(?=\d)/g, ' H ').replace(/[хx×*]/gi, ' x ')
      .replace(/Ø\s*/g, ' O ').replace(/\b([LDW])\s*\.?\s*(?=\d)/g, ' $1 ');
    for (const [w, k] of Object.entries(RU)) s = s.replace(new RegExp(w + '\\s*:?\\s*', 'ig'), ` ${k} `);
    const unit = /мм|mm/i.test(s) ? 'mm' : /см|cm|сm/i.test(s) ? 'cm' : unitHint;
    s = s.replace(/мм|mm|см|cm|сm/gi, ' ');
    if (/[а-яё]{3,}/i.test(s.replace(/\bx\b/g, ''))) return null;          // в части есть слова — это не размеры
    const v = {}, free = [];
    const re = /\b([LDWHO])?\s*(\d+(?:\.\d+)?(?:\s*\/\s*\d+(?:\.\d+)?)?)/g;
    let m, n = 0;
    while ((m = re.exec(s))) {
      const val = m[2].split('/').map(num); n++;
      if (m[1]) v[m[1] === 'D' ? 'W' : m[1]] = val; else free.push(val);
    }
    if (!n) return null;
    // без букв: длина × ширина × высота; у стола высота ~74 см может стоять второй (2800*740*1050)
    if (free.length === 3 && !v.H && /стол/i.test(type || '')) {
      const i = free.findIndex((x, j) => j && x[0] >= 680 && x[0] <= 780 || j && x[0] >= 68 && x[0] <= 78);
      if (i > 0) { v.H = free.splice(i, 1)[0] }
    }
    const keys = ['L', 'W', 'H'].filter(k => !v[k] && !(v.O && k !== 'H'));
    free.forEach((x, i) => { if (keys[i]) v[keys[i]] = x });
    if (free.length > keys.length) return null;
    return { label, v, unit };
  }

  function parse(raw, type) {
    if (!raw) return null;
    const tail = (raw.match(/(мм|mm|см|cm|сm)\s*\.?\s*$/i) || [])[1];
    const unitHint = tail ? (/м{2}|mm/i.test(tail) ? 'mm' : 'cm') : null;
    // части: «/» с пробелом с любой стороны или «;»; «960/1520» без пробелов — это два значения одного размера
    raw = raw.replace(/\(([^)]*)\)/g, ' / $1 ');   // «(матрас 180*200 см)» — отдельная часть
    let chunks = raw.split(/\s+\/\s*|\s*\/\s+|;/).map(x => x.trim()).filter(Boolean);
    const notes = [], parts = [];
    for (const c of chunks) {
      const p = part(c, type, unitHint);
      if (p) parts.push(p); else notes.push(c);
    }
    if (!parts.length) return { raw };
    // «Высота: 33 / Глубина: 15 / Ширина: 15» — по одному измерению в части → склеиваем
    if (parts.length > 1 && parts.every(p => Object.keys(p.v).length === 1 && !p.label)) {
      const v = {}; parts.forEach(p => Object.assign(v, p.v)); parts.splice(0, parts.length, { label: '', v, unit: parts[0].unit });
    }
    // единицы: указаны — берём; нет — по величине: больше 300 — миллиметры (у ковров — больше 1000)
    const all = parts.flatMap(p => Object.values(p.v).flat());
    const big = Math.max(...all);
    const rug = /ков[её]р/i.test(type || ''), guess = rug ? (big >= 1000 ? 'mm' : 'cm') : (big >= 300 ? 'mm' : 'cm');
    // буквы L/D — запись фабрики, единицы в ней одни; без букв в EXPO часто смешано: «2100х100 H67», «340 х 440 Н.51 см»
    const lettered = /\b[LD]\s*\d/.test(raw);
    const groups = parts.map((p, i) => {
      const pb = Math.max(...Object.values(p.v).flat());       // самое большое число этой части
      let u = p.unit || guess;
      if (u === 'cm' && !rug && pb >= 400) u = 'mm';           // «710 х 730 х 710 см» — на деле миллиметры
      const mixed = p.unit !== 'mm' && !lettered && pb >= 300;  // явные «мм» не трогаем
      const rows = [];
      for (const k of ['O', 'L', 'W', 'H']) {
        if (!p.v[k]) continue;
        const cm = p.v[k].map(x => u === 'mm' ? (mixed && x < 200 ? x : x / 10) : x);
        rows.push({ k, name: NAME[k], val: cm });
      }
      const label = p.label || (parts.filter(q => !q.label).length > 1 ? `Элемент ${parts.filter(q => !q.label).indexOf(p) + 1}` : '');
      return { label, rows };
    });
    return { groups, notes, raw };
  }

  const f = x => (Math.round(x * 10) / 10).toString().replace('.', ',');
  const val = r => r.val.map(f).join(' / ') + ' см';
  // одной строкой (для плиток и подсказок): «334 × 96/152 × 92 см»
  const short = d => !d || !d.groups ? (d && d.raw) || '' : d.groups.map(g => (g.label ? g.label + ': ' : '') +
    g.rows.map(r => (r.k === 'O' ? 'Ø ' : '') + r.val.map(f).join('/')).join(' × ') + ' см').join('; ');
  root.DIMS = { parse, val, short, fmt: f };
})(typeof window !== 'undefined' ? window : globalThis);
