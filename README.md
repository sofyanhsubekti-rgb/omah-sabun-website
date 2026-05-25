# Omah Sabun Website

Website statis sederhana untuk katalog produk Omah Sabun, program reseller, dan tombol chat ke WhatsApp Omah Sabun.

## Nomor WhatsApp

Nomor sudah diset di `script.js`:

```js
const WA_NUMBER = "6282323340408";
```

## Cara pakai cepat

1. Ekstrak file ZIP ini.
2. Buka `index.html` di browser.
3. Upload semua file ke hosting/cPanel/Netlify/Vercel/GitHub Pages.
4. Website langsung aktif karena tidak perlu build.

## Struktur file

```txt
omah-sabun-website/
├── index.html
├── style.css
├── script.js
├── logo.css
├── catalog-dynamic.css
├── assets/
│   ├── logo-omah-sabun.svg
│   ├── favicon-omah-sabun.svg
│   └── favicon.svg
└── README.md
```

## Edit produk

Produk utama sudah terhubung ke Google Sheet CSV. Jika Sheet tidak terbaca, website akan memakai data cadangan di `script.js`.

## Rekomendasi domain

- omahsabun.id
- omahsabun.com
- katalog.omahsabun.id
- order.omahsabun.id

## Deploy ke Netlify

1. Login Netlify.
2. Klik "Add new site" lalu "Deploy manually".
3. Drag folder `omah-sabun-website`.
4. Selesai.

## Deploy ke cPanel

1. Buka File Manager.
2. Masuk folder `public_html`.
3. Upload isi folder `omah-sabun-website`.
4. Pastikan `index.html` ada di dalam `public_html`.

## Catatan pengembangan berikutnya

Tahap berikutnya bisa ditambah:
- harga khusus reseller,
- form daftar reseller,
- tracking order,
- integrasi n8n dan CRM,
- SEO lokal.
