/*
  OMAH SABUN WEBSITE CONFIG
  1) Ganti nomor WhatsApp di bawah dengan nomor admin, format internasional tanpa +.
     Nomor Omah Sabun: 6282323340408
  2) Untuk katalog Google Sheet:
     - Publish sheet ke CSV: File > Share > Publish to web > CSV
     - Tempel URL CSV di SHEET_CSV_URL.
     - Kolom yang didukung: nama/name/produk, kategori/category, harga/price,
       ukuran/size/kemasan, deskripsi/description, status/stok/stock.
*/
const OMAH_SABUN_CONFIG = {
  whatsappNumber: '6282323340408',
  sheetCsvUrl: '',
  businessName: 'Omah Sabun'
};

const fallbackProducts = [
  {
    nama: 'Sabun Cuci Serbaguna',
    kategori: 'Rumah Tangga',
    harga: 'Hubungi admin',
    ukuran: 'Kemasan menyesuaikan',
    deskripsi: 'Produk kebersihan serbaguna untuk kebutuhan rumah dan usaha.',
    status: 'Tersedia'
  },
  {
    nama: 'Pewangi Laundry',
    kategori: 'Laundry',
    harga: 'Hubungi admin',
    ukuran: 'Retail / grosir',
    deskripsi: 'Pilihan pewangi untuk kebutuhan laundry, reseller, dan stok rutin.',
    status: 'Tersedia'
  },
  {
    nama: 'Pembersih Lantai',
    kategori: 'Kebersihan Rumah',
    harga: 'Hubungi admin',
    ukuran: 'Retail / grosir',
    deskripsi: 'Cocok untuk rumah, kantor, toko, kos, dan area usaha.',
    status: 'Tersedia'
  }
];

const state = {
  products: [],
  filteredProducts: [],
  selected: new Map()
};

const selectors = {
  grid: document.getElementById('catalogGrid'),
  status: document.getElementById('catalogStatus'),
  search: document.getElementById('catalogSearch'),
  category: document.getElementById('categoryFilter'),
  cartLinks: document.querySelectorAll('[data-whatsapp-cart]'),
  whatsappLinks: document.querySelectorAll('[data-whatsapp-link]'),
  navToggle: document.querySelector('[data-nav-toggle]'),
  navMenu: document.querySelector('[data-nav-menu]')
};

document.addEventListener('DOMContentLoaded', init);

async function init() {
  document.getElementById('year').textContent = new Date().getFullYear();
  setupNavigation();
  setupRevealAnimation();
  setupWhatsAppLinks();
  await loadCatalog();
}

function setupNavigation() {
  if (!selectors.navToggle || !selectors.navMenu) return;
  selectors.navToggle.addEventListener('click', () => {
    const isOpen = selectors.navMenu.classList.toggle('is-open');
    selectors.navToggle.setAttribute('aria-expanded', String(isOpen));
  });

  selectors.navMenu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      selectors.navMenu.classList.remove('is-open');
      selectors.navToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

function setupRevealAnimation() {
  const items = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    items.forEach((item) => item.classList.add('is-visible'));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  items.forEach((item) => observer.observe(item));
}

function setupWhatsAppLinks() {
  const baseMessage = `Halo Admin ${OMAH_SABUN_CONFIG.businessName}, saya ingin bertanya tentang produk kebersihan, reseller, atau grosir.`;
  selectors.whatsappLinks.forEach((link) => {
    link.href = buildWhatsAppUrl(baseMessage);
    link.target = '_blank';
    link.rel = 'noopener';
  });
  selectors.cartLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      window.open(buildWhatsAppUrl(buildCartMessage()), '_blank', 'noopener');
    });
  });
}

async function loadCatalog() {
  setStatus('Memuat katalog...');
  try {
    const url = OMAH_SABUN_CONFIG.sheetCsvUrl.trim();
    if (!url) throw new Error('Google Sheet CSV belum diatur, memakai contoh katalog teks.');

    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error('Gagal mengambil data Google Sheet.');

    const csvText = await response.text();
    const rows = parseCSV(csvText);
    state.products = normalizeRows(rows);

    if (!state.products.length) throw new Error('Data katalog kosong.');
    setStatus(`${state.products.length} produk berhasil dimuat dari Google Sheet.`);
  } catch (error) {
    console.info(error.message);
    state.products = fallbackProducts;
    setStatus('Katalog contoh tampil. Hubungkan Google Sheet CSV di script.js untuk data asli.');
  }

  state.filteredProducts = [...state.products];
  populateCategoryFilter(state.products);
  bindCatalogEvents();
  renderCatalog();
}

function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let insideQuote = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && insideQuote && next === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      insideQuote = !insideQuote;
    } else if (char === ',' && !insideQuote) {
      row.push(cell.trim());
      cell = '';
    } else if ((char === '\n' || char === '\r') && !insideQuote) {
      if (cell || row.length) {
        row.push(cell.trim());
        rows.push(row);
      }
      row = [];
      cell = '';
      if (char === '\r' && next === '\n') i += 1;
    } else {
      cell += char;
    }
  }

  if (cell || row.length) {
    row.push(cell.trim());
    rows.push(row);
  }

  if (!rows.length) return [];
  const headers = rows.shift().map((header) => cleanKey(header));
  return rows.map((values) => {
    const item = {};
    headers.forEach((header, index) => {
      item[header] = values[index] || '';
    });
    return item;
  });
}

function normalizeRows(rows) {
  return rows
    .map((row, index) => ({
      id: row.id || `produk-${index}`,
      nama: pick(row, ['nama', 'name', 'produk', 'product', 'productname']) || 'Produk Omah Sabun',
      kategori: pick(row, ['kategori', 'category', 'jenis']) || 'Produk Kebersihan',
      harga: pick(row, ['harga', 'price', 'hargaecer', 'hargagrosir']) || 'Hubungi admin',
      ukuran: pick(row, ['ukuran', 'size', 'kemasan', 'volume', 'satuan']) || 'Retail / grosir',
      deskripsi: pick(row, ['deskripsi', 'description', 'keterangan', 'detail']) || 'Produk kebersihan untuk kebutuhan rumah dan usaha.',
      status: pick(row, ['status', 'stok', 'stock', 'availability']) || 'Cek stok'
    }))
    .filter((item) => item.nama && item.nama !== '-');
}

function cleanKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

function pick(row, keys) {
  for (const key of keys) {
    const normalized = cleanKey(key);
    if (row[normalized]) return row[normalized];
  }
  return '';
}

function populateCategoryFilter(products) {
  const categories = [...new Set(products.map((item) => item.kategori).filter(Boolean))].sort();
  selectors.category.innerHTML = '<option value="all">Semua kategori</option>';
  categories.forEach((category) => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    selectors.category.appendChild(option);
  });
}

function bindCatalogEvents() {
  selectors.search.addEventListener('input', filterCatalog);
  selectors.category.addEventListener('change', filterCatalog);
}

function filterCatalog() {
  const keyword = selectors.search.value.trim().toLowerCase();
  const category = selectors.category.value;

  state.filteredProducts = state.products.filter((item) => {
    const text = `${item.nama} ${item.kategori} ${item.deskripsi} ${item.status}`.toLowerCase();
    const matchKeyword = !keyword || text.includes(keyword);
    const matchCategory = category === 'all' || item.kategori === category;
    return matchKeyword && matchCategory;
  });

  renderCatalog();
}

function renderCatalog() {
  selectors.grid.innerHTML = '';

  if (!state.filteredProducts.length) {
    selectors.grid.innerHTML = '<div class="empty-state">Produk tidak ditemukan. Coba kata kunci lain atau chat admin via WhatsApp.</div>';
    return;
  }

  const fragment = document.createDocumentFragment();
  state.filteredProducts.forEach((product) => {
    fragment.appendChild(createProductCard(product));
  });
  selectors.grid.appendChild(fragment);
}

function createProductCard(product) {
  const card = document.createElement('article');
  card.className = 'product-card';
  card.innerHTML = `
    <div class="product-top">
      <span class="product-category">${escapeHTML(product.kategori)}</span>
    </div>
    <h3 class="product-name">${escapeHTML(product.nama)}</h3>
    <p class="product-desc">${escapeHTML(product.deskripsi)}</p>
    <div class="product-meta">
      <span>${escapeHTML(product.ukuran)}</span>
      <span>${escapeHTML(product.status)}</span>
    </div>
    <div class="product-price">
      <strong>${escapeHTML(product.harga)}</strong>
      <small>Harga dapat berubah</small>
    </div>
    <div class="product-actions">
      <button type="button" data-select-product="${escapeHTML(product.id)}">Pilih</button>
      <a href="${buildWhatsAppUrl(buildSingleProductMessage(product))}" target="_blank" rel="noopener">Order</a>
    </div>
  `;

  const button = card.querySelector('[data-select-product]');
  updateSelectButton(button, product);
  button.addEventListener('click', () => toggleProduct(product, button));
  return card;
}

function toggleProduct(product, button) {
  if (state.selected.has(product.id)) {
    state.selected.delete(product.id);
  } else {
    state.selected.set(product.id, product);
  }
  updateSelectButton(button, product);
  setStatus(`${state.selected.size} produk dipilih. Klik “Kirim Pilihan” untuk order via WhatsApp.`);
}

function updateSelectButton(button, product) {
  const selected = state.selected.has(product.id);
  button.classList.toggle('is-selected', selected);
  button.textContent = selected ? 'Terpilih' : 'Pilih';
}

function buildSingleProductMessage(product) {
  return `Halo Admin ${OMAH_SABUN_CONFIG.businessName}, saya ingin order/cek stok produk berikut:%0A%0A- ${product.nama}%0AKategori: ${product.kategori}%0AHarga: ${product.harga}%0AUkuran: ${product.ukuran}%0A%0AMohon info ketersediaan dan totalnya.`;
}

function buildCartMessage() {
  if (!state.selected.size) {
    return `Halo Admin ${OMAH_SABUN_CONFIG.businessName}, saya ingin bertanya dan order produk kebersihan. Mohon dibantu katalog, stok, dan harga grosir/reseller.`;
  }

  const list = [...state.selected.values()]
    .map((item, index) => `${index + 1}. ${item.nama} - ${item.ukuran} - ${item.harga}`)
    .join('%0A');

  return `Halo Admin ${OMAH_SABUN_CONFIG.businessName}, saya ingin order/cek stok produk berikut:%0A%0A${list}%0A%0AMohon info ketersediaan, harga terbaik, dan cara pengirimannya.`;
}

function buildWhatsAppUrl(message) {
  const number = OMAH_SABUN_CONFIG.whatsappNumber.replace(/\D/g, '');
  const encodedMessage = message.includes('%0A') ? message : encodeURIComponent(message);
  return `https://wa.me/${number}?text=${encodedMessage}`;
}

function setStatus(message) {
  selectors.status.textContent = message;
}

function escapeHTML(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
