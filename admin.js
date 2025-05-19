/* geeLogistics – Admin panel
   Bulk CSV import, edit dialog (attach photos), multi-delete, JSON export */

import { addItem, getAll, deleteItem }  from './db.js';
import { saveRates, store, calcTotals } from './app.js';

/* ---------- quick helpers ---------- */
const num = v => parseFloat(String(v).replace(',', '.')) || 0;
const key = s => s.trim().toLowerCase();
const $   = id => document.getElementById(id);

async function fileToDataURL (file) {
  return new Promise(res => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result);
    fr.readAsDataURL(file);
  });
}

/* ---------- element refs ---------- */
const els = {
  rateForm:       $('rateForm'),
  rmbRate:        $('rmbRate'),
  usdRate:        $('usdRate'),

  itemForm:       $('itemForm'),
  itemId:         $('itemId'),
  name:           $('name'),
  description:    $('description'),
  unitpriceRmb:   $('unitpriceRmb'),
  chinaShipRmb:   $('chinaShipRmb'),
  totalPriceRmb:  $('totalPriceRmb'),
  cbm:            $('cbm'),
  usdRateCbm:     $('usdRateCbm'),
  margin:         $('margin'),
  photos:         $('photos'),
  category:       $('category'),            // only if you have a category input

  csvInput:       $('csvInput'),
  exportJson:     $('exportJson'),
  deleteSelected: $('deleteSelected'),
  selectAll:      $('selectAll'),
  bulkImages:     $('bulkImages'),
  tableBody:      document.querySelector('#itemTable tbody')
};

/* =================  RATE SAVE  ================= */
els.rateForm.addEventListener('submit', e => {
  e.preventDefault();
  saveRates(+els.rmbRate.value, +els.usdRate.value);
  alert('Rates saved ✓');
});

/* =================  SINGLE ADD / EDIT  ================= */
els.itemForm.addEventListener('submit', async e => {
  e.preventDefault();

  const id       = els.itemId.value ? +els.itemId.value : undefined;
  const existing = id ? (await getAll()).find(i => i.id === id) || {} : {};

  const item = {
    ...existing,
    id,                                           // may be undefined
    name:         els.name.value.trim(),
    description:  els.description.value.trim(),
    unitpriceRmb: num(els.unitpriceRmb.value),
    chinaShipRmb: num(els.chinaShipRmb.value),
    totalPriceRmb: num(els.totalPriceRmb.value) || undefined,
    cbm:          num(els.cbm.value),
    usdRateCbm:   num(els.usdRateCbm.value),
    margin:       num(els.margin.value),
    category:     els.category?.value.trim() || existing.category
  };

  if (els.photos.files.length) {
    const newPix = await Promise.all([...els.photos.files].map(fileToDataURL));
    item.photos  = (item.photos || []).concat(newPix).slice(0, 5);
  }

  Object.assign(item, calcTotals(item));
  await addItem(item);

  els.itemForm.reset();
  els.totalPriceRmb.value = '';
  loadTable();
});

/* =================  CSV BULK IMPORT  ================= */
els.csvInput.addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;

  const text   = (await file.text()).replace(/^\uFEFF/, '');
  const lines  = text.trim().split(/\r?\n/);

  const header = lines.shift();
  const delim  = header.split(';').length > header.split(',').length ? ';' : ',';
  const heads  = header.split(delim).map(h => h.trim().toLowerCase());

  const all    = await getAll();
  const byId   = new Map(all.map(it => [String(it.id), it]));
  const byName = new Map(all.map(it => [key(it.name), it]));

  for (const line of lines) {
    if (!line.trim()) continue;
    const cells = line.split(delim).map(c => c.trim());
    const raw   = Object.fromEntries(heads.map((h, i) => [h, cells[i] ?? '']));

    let rec = raw.id ? byId.get(raw.id) : null;
    if (!rec) rec = byName.get(key(raw.name)) || {};

    Object.assign(rec, {
      id:            raw.id ? +raw.id : rec.id,
      name:          raw.name,
      description:   raw.description,
      unitpriceRmb:  num(raw.unitpricermb),
      chinaShipRmb:  num(raw.chinashiprmb),
      totalPriceRmb: num(raw.totalpricermb),
      cbm:           num(raw.cbm),
      usdRateCbm:    num(raw.usdratecbm),
      margin:        num(raw.margin),
      category:      raw.category || rec.category
    });

    // first photo slot from CSV (string)
    if (raw.photo) rec.photos = [raw.photo, ...(rec.photos || [])].slice(0, 5);

    Object.assign(rec, calcTotals(rec));
    await addItem(rec);
  }

  loadTable();
  alert('CSV import complete — rows added / updated.');
});

/* =================  EXPORT JSON  ================= */
els.exportJson.onclick = async () => {
  const blob = new Blob([JSON.stringify(await getAll(), null, 2)], {
    type: 'application/json'
  });
  const url = URL.createObjectURL(blob);
  Object.assign(document.createElement('a'), { href: url, download: 'items.json' }).click();
  URL.revokeObjectURL(url);
};

/* =================  BULK DELETE  ================= */
els.deleteSelected.onclick = async () => {
  const ids = [...document.querySelectorAll('.rowChk:checked')].map(c => +c.value);
  if (!ids.length || !confirm(`Delete ${ids.length} item(s)?`)) return;
  for (const id of ids) await deleteItem(id);
  loadTable();
};

/* =================  BULK IMAGE ASSIGN  ================= */
els.bulkImages?.addEventListener('change', async e => {
  const files = [...e.target.files];
  if (!files.length) return;

  const items = await getAll();
  const byId  = Object.fromEntries(items.map(it => [String(it.id), it]));

  await Promise.all(
    files.map(async f => {
      const m = f.name.match(/^(\d+)/);     // numeric prefix
      if (!m) return;
      const id = m[1];
      const it = byId[id];
      if (!it) return;

      const dataUrl = await fileToDataURL(f);
      it.photos = (it.photos || []).concat(dataUrl).slice(0, 5);
      await addItem(it);
    })
  );

  alert('Images processed ✓');
  e.target.value = '';
  loadTable();
});

/* =================  TABLE RENDER  ================= */
async function loadTable () {
  els.tableBody.innerHTML = '';
  const items = await getAll();

  items.forEach(it => {
    const thumb = it.photos?.[0]
      ? (it.photos[0].startsWith('data:')
          ? it.photos[0]
          : `images/${it.photos[0]}`)
      : '';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="checkbox" class="rowChk form-check-input" value="${it.id}"></td>
      <td>${thumb ? `<img src="${thumb}" class="thumb">` : '—'}</td>
      <td>${it.id}</td>
      <td>${it.name}</td>
      <td>${it.description}</td>
      <td>${it.unitpriceRmb}</td>
      <td>${it.chinaShipRmb}</td>
      <td>${it.totalPriceRmb}</td>
      <td>${it.cbm}</td>
      <td>${it.usdRateCbm}</td>
      <td>${it.margin}</td>
      <td>${it.category || '—'}</td>
      <td>${it.shippingUsd}</td>
      <td>${it.totalCostGhs}</td>
      <td class="fw-bold text-success">${it.saleGhs}</td>
      <td class="fw-bold text-primary">${it.profitGhs}</td>
      <td>
        <button class="btn btn-sm btn-warning me-1 editBtn" data-id="${it.id}">Edit</button>
        <button class="btn btn-sm btn-danger deleteBtn" data-id="${it.id}">×</button>
      </td>`;
    els.tableBody.appendChild(tr);
  });

  /* --- row actions --- */
  els.tableBody.querySelectorAll('.editBtn').forEach(btn => {
    btn.onclick = async () => {
      const it = (await getAll()).find(o => o.id === +btn.dataset.id);
      if (!it) return;
      Object.assign(els.itemId,        { value: it.id });
      Object.assign(els.name,          { value: it.name });
      Object.assign(els.description,   { value: it.description });
      Object.assign(els.unitpriceRmb,  { value: it.unitpriceRmb });
      Object.assign(els.chinaShipRmb,  { value: it.chinaShipRmb });
      Object.assign(els.totalPriceRmb, { value: it.totalPriceRmb });
      Object.assign(els.cbm,           { value: it.cbm });
      Object.assign(els.usdRateCbm,    { value: it.usdRateCbm });
      Object.assign(els.margin,        { value: it.margin });
      if (els.category) els.category.value = it.category || '';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
  });

  els.tableBody.querySelectorAll('.deleteBtn').forEach(btn => {
    btn.onclick = async () => {
      if (confirm('Delete this item?')) {
        await deleteItem(+btn.dataset.id);
        loadTable();
      }
    };
  });

  /* --- select-all / bulk-delete --- */
  const chks = els.tableBody.querySelectorAll('.rowChk');
  els.selectAll.checked = false;
  const toggle = () => { els.deleteSelected.disabled = ![...chks].some(c => c.checked); };
  els.selectAll.onclick = () => { chks.forEach(c => (c.checked = els.selectAll.checked)); toggle(); };
  chks.forEach(c => (c.onchange = toggle));
  toggle();
}

/* =================  INIT  ================= */
els.rmbRate.value = store.rmbRate;
els.usdRate.value = store.usdRate;
loadTable();
