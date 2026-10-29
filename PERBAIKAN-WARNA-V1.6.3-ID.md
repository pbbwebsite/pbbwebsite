# Perbaikan v1.6.3: Warna Brand PBB

Dasar: v1.6.2-FIXED. Hanya warna dan satu label yang berubah.

- Merah neon (`#ff2a4b`) diganti merah kulit logo (`#d9534f`) di CSS, shader, objek 3D, dan admin.
- Hitam kebiruan diganti hitam hangat (`#0b0a0a`); teks abu-abu kebiruan diganti abu hangat.
- `theme-color` semua halaman diseragamkan.
- Label ganda "BOXING" di header/footer dihapus (nama organisasi sudah memuat kata itu).
- Tes: 48/48 lulus. `npm run check` dan `npm run build` lulus. Uji browser produksi dan deploy Netlify belum dijalankan.
