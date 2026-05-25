const WA_NUMBER = "6282323340408";

// Isi dengan link CSV Google Sheet setelah Sheet dibuat dan dipublish.
// Format contoh: https://docs.google.com/spreadsheets/d/e/XXXX/pub?output=csv
const GOOGLE_SHEET_CSV_URL = "";

const fallbackProducts = [
  { name: "DARA Sabun Cuci Piring", category: "Dapur", size: "300 ml / 450 ml / 1 Liter", scent: "Jeruk nipis / Lemon", price: "Mulai Rp5.000", desc: "Formula busa melimpah untuk membersihkan lemak dan sisa makanan di peralatan dapur.", badge: "Best Seller", icon: "🧽", image: "" },
  { name: "DARA Sabun Cuci Tangan", category: "Personal Care", size: "250 ml / 500 ml", scent: "Buah segar", price: "Mulai Rp8.000", desc: "Lembut di tangan, wangi segar, cocok untuk rumah, warung, kantor, dan tempat usaha.", badge: "Rumah Tangga", icon: "🫧", image: "" },
  { name: "DARA Sabun Pel Lantai", category: "Lantai", size: "500 ml / 1 Liter", scent: "Floral / Lemon", price: "Mulai Rp10.000", desc: "Membersihkan lantai sekaligus memberi aroma segar untuk ruangan harian.", badge: "Harian", icon: "🪣", image: "" },
  { name: "DARA Karbol Aromatic Pine", category: "Disinfektan Rumah", size: "500 ml / 1 Liter", scent: "Pine", price: "Mulai Rp12.000", desc: "Karbol wangi pine untuk kamar mandi, area luar, saluran air, dan area yang perlu higienis.", badge: "Aromatic", icon: "🌲", image: "" },
  { name: "DARA Detergen Cair", category: "Laundry", size: "1 Liter", scent: "Fresh clean", price: "Mulai Rp15.000", desc: "Detergen cair praktis untuk kebutuhan cuci pakaian keluarga dan usaha laundry kecil.", badge: "Laundry", icon: "👕", image: "" },
  { name: "DARA Pewangi Laundry", category: "Laundry", size: "500 ml / 1 Liter", scent: "Fresh / Floral", price: "Mulai Rp12.000", desc: "Memberikan aroma segar lebih tahan lama untuk pakaian setelah dicuci.", badge: "Wangi", icon: "🌸", image: "" },
  { name: "DARA Pembersih Keramik", category: "Kamar Mandi", size: "500 ml / 1 Liter", scent: "Clean scent", price: "Mulai Rp15.000", desc: "Untuk membantu membersihkan noda pada keramik kamar mandi dan area basah.", badge: "Kuat", icon: "🚿", image: "" },
  { name: "DARA Pembersih Kaca", category: "Rumah & Usaha", size: "500 ml", scent: "Fresh", price: "Mulai Rp10.000", desc: "Cocok untuk kaca rumah, etalase warung, meja kaca, dan permukaan mengkilap.", badge: "Etalase", icon: "🪟", image: "" }
];

let products = [...fallbackProducts];

function waLink(message) {
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message)}`;
}

const waMessages = {
  general: "Halo Omah Sabun, saya ingin tanya katalog produk.",
  reseller: "Halo Omah Sabun, saya ingin daftar reseller. Tolong kirim syarat, paket awal, dan daftar harga reseller.",
  order: "Halo Omah Sabun, saya ingin order produk Omah Sabun.",
  grosir: "Halo Omah Sabun, saya ingin tanya harga grosir dan pengiriman."
};

function setWhatsAppLinks() {
  document.querySelectorAll("[data-wa]").forEach((element) => {
    const key = element.dataset.wa;
    element.href = waLink(waMessages[key] || waMessages.general);
  });
}

function parseCSV(text) {
  const rows = [];
  let row = [];
  let value = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && insideQuotes && next === '"') {
      value += '"';
      i += 1;
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === "," && !insideQuotes) {
      row.push(value.trim());
      value = "";
    } else if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (value || row.length) {
        row.push(value.trim());
        rows.push(row);
        row = [];
        value = "";
      }
      if (char === "\r" && next === "\n") i += 1;
    } else {
      value += char;
    }
  }

  if (value || row.length) {
    row.push(value.trim());
    rows.push(row);
  }

  return rows;
}

function normalizeProduct(row) {
  return {
    name: row.name || row.nama_produk || row.produk || "",
    category: row.category || row.kategori || "Umum",
    size: row.size || row.ukuran || "",
    scent: row.scent || row.aroma || "",
    price: row.price || row.harga || "",
    desc: row.desc || row.deskripsi || row.keterangan || "",
    badge: row.badge || row.label || "Ready",
    icon: row.icon || row.ikon || "🫧",
    image: row.image || row.foto || row.gambar || ""
  };
}

async function loadProductsFromSheet() {
  if (!GOOGLE_SHEET_CSV_URL) return;

  try {
    const response = await fetch(`${GOOGLE_SHEET_CSV_URL}${GOOGLE_SHEET_CSV_URL.includes("?") ? "&" : "?"}cache=${Date.now()}`);
    if (!response.ok) throw new Error("CSV tidak bisa dibaca");

    const rows = parseCSV(await response.text());
    const headers = rows.shift().map((header) => header.trim().toLowerCase());
    const sheetProducts = rows
      .map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] || ""])))
      .map(normalizeProduct)
      .filter((product) => product.name);

    if (sheetProducts.length) products = sheetProducts;
  } catch (error) {
    console.warn("Katalog Google Sheet gagal dimuat. Menggunakan katalog fallback.", error);
  }
}

function productCard(product) {
  const message = `Halo Omah Sabun, saya ingin tanya produk: ${product.name}.`;
  const media = product.image
    ? `<img class="product-image" src="${product.image}" alt="${product.name}" loading="lazy" />`
    : `<div class="product-icon" aria-hidden="true">${product.icon || "🫧"}</div>`;

  return `
    <article class="product-card">
      <div class="product-top">
        ${media}
        <span class="badge">${product.badge || "Ready"}</span>
      </div>
      <h3>${product.name}</h3>
      <p>${product.desc}</p>
      <div class="product-meta">
        <span><b>Kategori:</b> ${product.category}</span>
        <span><b>Ukuran:</b> ${product.size}</span>
        <span><b>Aroma:</b> ${product.scent}</span>
        <span><b>Harga:</b> ${product.price}</span>
      </div>
      <a class="btn btn-primary" href="${waLink(message)}" target="_blank" rel="noopener">Tanya Produk</a>
    </article>
  `;
}

function renderCategories() {
  const select = document.getElementById("categorySelect");
  const currentValue = select.value || "Semua";
  const categories = ["Semua", ...new Set(products.map((product) => product.category).filter(Boolean))];
  select.innerHTML = categories
    .map((category) => `<option value="${category}">${category === "Semua" ? "Semua kategori" : category}</option>`)
    .join("");
  select.value = categories.includes(currentValue) ? currentValue : "Semua";
}

function renderProducts() {
  const query = document.getElementById("searchInput").value.toLowerCase();
  const category = document.getElementById("categorySelect").value;
  const grid = document.getElementById("productGrid");

  const filtered = products.filter((product) => {
    const matchesCategory = category === "Semua" || product.category === category;
    const haystack = `${product.name} ${product.category} ${product.size} ${product.scent} ${product.desc}`.toLowerCase();
    return matchesCategory && haystack.includes(query);
  });

  grid.innerHTML = filtered.length
    ? filtered.map(productCard).join("")
    : `<p class="empty-state">Produk tidak ditemukan. Coba kata kunci lain atau chat WhatsApp Omah Sabun.</p>`;
}

function initMenu() {
  const button = document.getElementById("menuButton");
  const links = document.getElementById("navLinks");

  button.addEventListener("click", () => links.classList.toggle("open"));
  links.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => links.classList.remove("open"));
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("year").textContent = new Date().getFullYear();
  setWhatsAppLinks();
  await loadProductsFromSheet();
  renderCategories();
  renderProducts();
  initMenu();

  document.getElementById("searchInput").addEventListener("input", renderProducts);
  document.getElementById("categorySelect").addEventListener("change", renderProducts);
});
