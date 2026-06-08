const OMAH_SABUN_CONFIG = {
  whatsappNumber: '6282323340408',
  sheetCsvUrl: '',
  appsScriptUrl: 'https://script.google.com/macros/s/AKfycbyMnORJAO92QQ-z5mhmT0nEVyi40W_NWjJ87E5VehhpwAbvJfptN6YMVTCOuD-1oOTY/exec',
  appsScriptSecret: 'omahsabun_naraya_2024',
  businessName: 'Omah Sabun'
};

const fallbackProducts = [
  { name: 'Sabun Cuci Piring', category: 'Rumah Tangga', price: 'Hubungi admin', size: 'Berbagai ukuran', stock: 'Ready', description: 'Untuk kebutuhan rumah, warung, dan usaha makanan.' },
  { name: 'Pembersih Lantai', category: 'Kebersihan Rumah', price: 'Hubungi admin', size: 'Berbagai ukuran', stock: 'Ready', description: 'Cocok untuk rumah, kantor, kos, toko, dan laundry.' },
  { name: 'Karbol Aromatic', category: 'Disinfektan', price: 'Hubungi admin', size: 'Berbagai ukuran', stock: 'Ready', description: 'Untuk menjaga area tetap bersih dan segar.' },
  { name: 'Pewangi Laundry', category: 'Laundry', price: 'Hubungi admin', size: 'Berbagai varian', stock: 'Cek stok', description: 'Untuk kebutuhan laundry dan pemakaian rumah tangga.' },
  { name: 'Detergen Cair', category: 'Laundry', price: 'Hubungi admin', size: 'Berbagai ukuran', stock: 'Cek stok', description: 'Stok rutin untuk kebutuhan cuci harian.' },
  { name: 'Paket Reseller / Grosir', category: 'Grosir', price: 'Konsultasi admin', size: 'Sesuai kebutuhan', stock: 'By request', description: 'Untuk toko, reseller, laundry, dan pembelian jumlah banyak.' }
];

let products = [];
let selectedItems = [];

const rupiahLike = value => value && value !== '-' ? value : 'Hubungi admin';
const clean = value => String(value || '').trim();
const waBase = () => `https://wa.me/${OMAH_SABUN_CONFIG.whatsappNumber}`;

function createWhatsAppUrl(message) {
  return `${waBase()}?text=${encodeURIComponent(message)}`;
}

function generalMessage() {
  return `Halo admin ${OMAH_SABUN_CONFIG.businessName}, saya mau tanya produk kebersihan.\n\nNama:\nAlamat lengkap pengiriman:\nProduk yang dicari:\nJumlah (dalam mL, contoh: 1000 mL):\nMetode Pembayaran: COD / QRIS / Transfer Bank\n\nTerima kasih.`;
}

function productMessage(product, qty = '') {
  return `Halo admin ${OMAH_SABUN_CONFIG.businessName}, saya mau order produk berikut.\n\nNama:\nAlamat lengkap pengiriman:\n\nProduk: ${product.name}${product.size ? ' - ' + product.size : ''}\nJumlah: ${qty || '(isi jumlah dalam mL)'}\nMetode Pembayaran: COD / QRIS / Transfer Bank\n\nTerima kasih.`;
}

function cartMessage() {
  const lines = selectedItems.map((item, index) => `${index + 1}. ${item.name}${item.size ? ' - ' + item.size : ''}\n   Jumlah: ${item.qty || '(isi jumlah dalam mL)'}`).join('\n');
  return `Halo admin ${OMAH_SABUN_CONFIG.businessName}, saya mau order beberapa produk.\n\nNama:\nAlamat lengkap pengiriman:\n\nDaftar produk:\n${lines || '-'}\n\nMetode Pembayaran: COD / QRIS / Transfer Bank\n\nTerima kasih.`;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && quoted && next === '"') { value += '"'; i++; continue; }
    if (char === '"') { quoted = !quoted; continue; }
    if (char === ',' && !quoted) { row.push(value); value = ''; continue; }
    if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') i++;
      row.push(value); value = '';
      if (row.some(cell => clean(cell))) rows.push(row);
      row = [];
      continue;
    }
    value += char;
  }
  row.push(value);
  if (row.some(cell => clean(cell))) rows.push(row);
  return rows;
}

function normalizeProduct(row, headers) {
  const data = {};
  headers.forEach((header, index) => data[header] = clean(row[index]));
  const pick = (...keys) => keys.map(k => data[k]).find(Boolean) || '';
  return {
    name: pick('nama', 'produk', 'product', 'name', 'nama produk'),
    category: pick('kategori', 'category', 'jenis'),
    price: rupiahLike(pick('harga', 'price', 'harga jual')),
    size: pick('ukuran', 'size', 'isi', 'kemasan'),
    stock: pick('stok', 'stock', 'status') || 'Cek stok',
    description: pick('deskripsi', 'description', 'keterangan', 'catatan')
  };
}

async function loadProducts() {
  const status = document.getElementById('catalogStatus');
  const csvUrl = clean(OMAH_SABUN_CONFIG.sheetCsvUrl);
  const asUrl = clean(OMAH_SABUN_CONFIG.appsScriptUrl);

  // Coba Apps Script dulu (sumber data utama)
  if (asUrl) {
    try {
      const res = await fetch(`${asUrl}?action=bunda&secret=${OMAH_SABUN_CONFIG.appsScriptSecret}&cmd=get_produk`, { cache: 'no-store' });
      const json = await res.json();
      if (json.status === 'ok' && Array.isArray(json.data) && json.data.length > 0) {
        products = json.data.map(p => ({
          name: clean(p.nama_produk || p.produk || ''),
          category: clean(p.kategori || 'Produk Omah Sabun'),
          price: p.harga_per_ml ? `Rp${Number(p.harga_per_ml).toLocaleString('id-ID')}/mL` : 'Hubungi admin',
          size: clean(p.varian || ''),
          stock: 'Ready',
          description: ''
        })).filter(p => p.name);
        if (products.length) {
          status.textContent = `Menampilkan ${products.length} produk.`;
          return;
        }
      }
    } catch (e) {
      console.warn('Apps Script tidak bisa dimuat, coba CSV:', e.message);
    }
  }

  // Fallback: CSV Google Sheet
  if (csvUrl) {
    try {
      const response = await fetch(csvUrl, { cache: 'no-store' });
      if (!response.ok) throw new Error('Gagal memuat Google Sheet');
      const text = await response.text();
      const rows = parseCsv(text);
      const headers = rows.shift().map(h => clean(h).toLowerCase());
      products = rows.map(row => normalizeProduct(row, headers)).filter(item => item.name);
      status.textContent = products.length ? `Menampilkan ${products.length} produk dari Google Sheet.` : 'Google Sheet terbaca, tetapi belum ada produk valid.';
      if (products.length) return;
    } catch (error) {
      console.error('CSV error:', error);
    }
  }

  // Fallback akhir: produk statis
  products = fallbackProducts;
  status.textContent = 'Menampilkan katalog produk.';
}

function setupCategories() {
  const select = document.getElementById('categoryFilter');
  const categories = [...new Set(products.map(item => item.category).filter(Boolean))].sort();
  select.innerHTML = '<option value="all">Semua kategori</option>' + categories.map(cat => `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`).join('');
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
}

function productCard(product, index) {
  return `
    <article class="product-card reveal is-visible">
      <div class="product-top">
        <div>
          <span class="product-category">${escapeHtml(product.category || 'Produk')}</span>
          <h3 class="product-name">${escapeHtml(product.name)}</h3>
        </div>
        <div class="product-price">${escapeHtml(product.price || 'Hubungi admin')}</div>
      </div>
      <p class="product-desc">${escapeHtml(product.description || 'Hubungi admin untuk detail produk, stok, dan harga terbaru.')}</p>
      <div class="product-meta">
        <span>${escapeHtml(product.size || 'Ukuran fleksibel')}</span>
        <span>${escapeHtml(product.stock || 'Cek stok')}</span>
      </div>
      <div class="qty-wrap">
        <label for="qty-${index}">Jumlah / kebutuhan</label>
        <input class="qty-input" id="qty-${index}" data-qty-index="${index}" type="text" placeholder="Contoh: 2 pcs, 1 dus, 5 liter" />
      </div>
      <div class="product-actions">
        <button class="btn btn-secondary btn-small" type="button" data-select-product="${index}">Pilih</button>
        <a class="btn btn-primary btn-small" href="#" data-order-product="${index}">Order</a>
      </div>
    </article>
  `;
}

function renderProducts() {
  const grid = document.getElementById('catalogGrid');
  const query = clean(document.getElementById('catalogSearch').value).toLowerCase();
  const category = document.getElementById('categoryFilter').value;
  const filtered = products.filter(item => {
    const text = `${item.name} ${item.category} ${item.description} ${item.size}`.toLowerCase();
    const matchQuery = !query || text.includes(query);
    const matchCategory = category === 'all' || item.category === category;
    return matchQuery && matchCategory;
  });
  grid.innerHTML = filtered.length ? filtered.map(productCard).join('') : '<div class="empty-state">Produk tidak ditemukan. Coba kata kunci lain atau hubungi admin WhatsApp.</div>';
}

function addToCart(index) {
  const product = products[index];
  const qty = clean(document.querySelector(`[data-qty-index="${index}"]`)?.value);
  const existing = selectedItems.find(item => item.name === product.name && item.size === product.size);
  if (existing) existing.qty = qty || existing.qty;
  else selectedItems.push({ ...product, qty });
  updateCartLink();
}

function updateCartLink() {
  let pill = document.querySelector('.cart-pill');
  if (!pill) {
    pill = document.createElement('a');
    pill.className = 'cart-pill';
    pill.href = '#';
    pill.setAttribute('data-whatsapp-cart', '');
    pill.innerHTML = '<span>0</span>Kirim Pilihan';
    document.body.appendChild(pill);
  }
  const count = selectedItems.length;
  pill.querySelector('span').textContent = count;
  pill.classList.toggle('is-visible', count > 0);
  const url = createWhatsAppUrl(count ? cartMessage() : generalMessage());
  document.querySelectorAll('[data-whatsapp-cart]').forEach(link => {
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener';
  });
}

function bindEvents() {
  document.querySelectorAll('[data-whatsapp-link]').forEach(link => {
    link.href = createWhatsAppUrl(generalMessage());
    link.target = '_blank';
    link.rel = 'noopener';
  });

  document.addEventListener('click', event => {
    const selectButton = event.target.closest('[data-select-product]');
    if (selectButton) {
      addToCart(Number(selectButton.dataset.selectProduct));
      selectButton.textContent = 'Dipilih ✓';
      setTimeout(() => selectButton.textContent = 'Pilih', 1100);
    }

    const orderLink = event.target.closest('[data-order-product]');
    if (orderLink) {
      const index = Number(orderLink.dataset.orderProduct);
      const qty = clean(document.querySelector(`[data-qty-index="${index}"]`)?.value);
      orderLink.href = createWhatsAppUrl(productMessage(products[index], qty));
      orderLink.target = '_blank';
      orderLink.rel = 'noopener';
    }
  });

  document.getElementById('catalogSearch')?.addEventListener('input', renderProducts);
  document.getElementById('categoryFilter')?.addEventListener('change', renderProducts);

  const toggle = document.querySelector('[data-nav-toggle]');
  const menu = document.querySelector('[data-nav-menu]');
  toggle?.addEventListener('click', () => {
    const open = menu.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
  });

  menu?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    menu.classList.remove('is-open');
    toggle?.setAttribute('aria-expanded', 'false');
  }));
}

function setupReveal() {
  const items = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    items.forEach(item => item.classList.add('is-visible'));
    return;
  }
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  items.forEach(item => observer.observe(item));
}

async function init() {
  document.getElementById('year').textContent = new Date().getFullYear();
  bindEvents();
  await loadProducts();
  setupCategories();
  renderProducts();
  updateCartLink();
  setupReveal();
}

document.addEventListener('DOMContentLoaded', init);
