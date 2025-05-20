/* geeLogistics – public shop UI (items.json only)
   • loads products from items.json
   • supports search, price-range, and category filters
   • supports dark mode toggle and WhatsApp ordering
*/

let allItems = [];

/* ---------- card renderer ---------- */
function card(it) {
  const price = it.saleGhs ?? it.salePrice ?? '—';

  const imgUrl = it.photos?.[0]
    ? it.photos[0]
    : `auto-images/${it.id}.jpg`; // fallback image by ID

  const waMsg = encodeURIComponent(
    `Hello geeLogistics, I’d like to order:\n\n🛒 *${it.name}*\n💵 Price: GHS ${price}\n\nPlease let me know the next steps.`
  );

  return `
    <div class="col-6 col-md-4 col-lg-3 mb-3">
      <div class="card h-100 shadow-sm">
        <img src="${imgUrl}" class="card-img-top" alt="${it.name}" onerror="this.src='default.png'">
        <div class="card-body p-2">
          <h6 class="card-title">${it.name}</h6>
          <p class="small text-muted">${it.description}</p>
          <p class="fw-bold mb-2">GHS ${price}</p>
          <a class="btn btn-success w-100"
             href="https://wa.me/message/ELHL6MNXBJ2ZN1?text=${waMsg}"
             target="_blank">
             Order via WhatsApp
          </a>
        </div>
      </div>
    </div>`;
}

/* ---------- filters ---------- */
function filterAndRender() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  const priceBand = document.getElementById('priceFilter').value;
  const category = document.getElementById('categoryFilter').value;

  const rows = allItems.filter(it => {
    const nameMatch = it.name.toLowerCase().includes(search);
    const price = it.saleGhs || 0;

    const priceMatch =
      priceBand === 'low' ? price < 100 :
      priceBand === 'mid' ? price >= 100 && price <= 500 :
      priceBand === 'high' ? price > 500 : true;

    const catMatch = category ? (it.category || 'General') === category : true;

    return nameMatch && priceMatch && catMatch;
  });

  document.getElementById('itemGrid').innerHTML =
    rows.length > 0
      ? rows.map(card).join('')
      : `<div class="text-muted">No matching items found.</div>`;
}

/* ---------- category selector ---------- */
function updateCategoryDropdown(items) {
  const cats = new Set(items.map(it => it.category || 'General'));
  const opts = [...cats].sort()
    .map(c => `<option value="${c}">${c}</option>`)
    .join('');
  document.getElementById('categoryFilter').innerHTML =
    `<option value="">All Categories</option>${opts}`;
}

/* ---------- dark-mode toggle ---------- */
document.getElementById('darkToggle').onclick = () => {
  document.body.classList.toggle('dark-mode');
  localStorage.setItem('darkMode',
    document.body.classList.contains('dark-mode'));
};

if (localStorage.getItem('darkMode') === 'true') {
  document.body.classList.add('dark-mode');
}

/* ---------- filter inputs ---------- */
document.getElementById('searchInput').oninput = filterAndRender;
document.getElementById('priceFilter').onchange = filterAndRender;
document.getElementById('categoryFilter').onchange = filterAndRender;

/* ---------- bootstrap app ---------- */
(async () => {
  try {
    const res = await fetch('./items.json'); // always use items.json
    if (!res.ok) throw new Error('HTTP ' + res.status);
    allItems = (await res.json()).filter(i => i.saleGhs);

    updateCategoryDropdown(allItems);
    filterAndRender();
  } catch (err) {
    console.error('Could not load items.json:', err);
    document.getElementById('itemGrid').innerHTML =
      `<div class="text-danger">Error loading shop items. Please try again later.</div>`;
  }
})();
