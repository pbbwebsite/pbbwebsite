# Laporan perbaikan regresi — Persatuan Boxing Bogor v1.9.1

## Temuan yang ditangani

1. **Urutan tampil opsional** — CMS otomatis memberi nilai urutan berikutnya ketika item baru disimpan tanpa angka urutan. Server juga menormalisasi `order` yang hilang/null ke indeks item sebelum validasi. Harga tiket baru dimulai kosong (bukan 0) agar pengelola memasukkan harga yang disengaja.
2. **Filter status acara tiket** — status `published` yang aktif dipetakan ke filter Aktif; `draft`, `closed`, dan `cancelled` dipetakan ke status tersembunyi/ditutup yang sesuai.
3. **Perubahan antar-tab** — pindah tab tidak lagi membuang seluruh perubahan yang belum disimpan. Nilai formulir CMS disinkronkan ke draft memori dan tetap menunggu tombol Simpan perubahan.
4. **Pesanan ganda** — setelah server membuat pesanan, formulir pembelian dikunci/disembunyikan dan pemilih acara dinonaktifkan. Respons ambigu dengan nomor pesanan juga mengunci checkout agar pengguna tidak menagih ulang tanpa rekonsiliasi.
5. **QR tiket di layar** — setelah pembayaran terverifikasi, QR per tiket ditampilkan langsung pada halaman, selain disertakan dalam tata letak cetak/PDF.
6. **Polling status** — polling berhenti pada status terminal `paid`, `failed`, `expired`, atau `cancelled`; pesanan baru hanya dapat dimulai lewat aksi eksplisit setelah status gagal/kedaluwarsa.
7. **Pesan konfigurasi pembayaran** — UI membedakan konfigurasi gateway/server yang belum lengkap dari acara yang memang belum dibuka. Validasi harga/kapasitas dari pembacaan konfigurasi memberi pesan spesifik yang aman.
8. **Judul utama beranda** — penggantian teks mempertahankan elemen `<em>` pada baris tengah dan `<span>` pada baris ketiga, agar gaya outline judul tidak hilang setelah konten dimuat.
9. **Pesan login** — pesan gagal login Data Organisasi dan Pesanan Tiket ditampilkan di bagian login yang terlihat.
10. **Navigasi tiket** — `tiket.html` memuat `cms-bind.js`; navigasi masuk/keluar halaman tiket memakai navigasi browser normal agar handler checkout tidak tertinggal pada DOM Barba yang telah diganti.
11. **Sitemap** — halaman `tiket.html` masuk dalam sitemap yang dibuat saat build. Halaman 404 sengaja tidak dimasukkan ke sitemap karena bukan halaman konten yang dapat diindeks.
12. **Suara default** — jika properti `kineticSound` belum ada di konten lama, checkbox CMS menganggap suara aktif secara konsisten dengan default runtime.

## Validasi lokal

- `npm test`: **65/65 tes lulus**.
- `npm run check`: pemeriksaan sintaks fungsi Netlify lulus.
- `npm run build`: pemeriksaan struktur, JSON, tautan lokal, marker aksesibilitas dasar, dan sintaks JavaScript lulus.

## Batasan verifikasi

`npm run build` adalah pemeriksaan struktural, bukan bundling produksi. Tes lokal tidak memverifikasi transaksi Midtrans, Supabase produksi, pengiriman email, deployment Netlify, atau perilaku library animasi dari CDN ketika internet tersedia. Uji browser end-to-end pada deployment sandbox tetap diperlukan sebelum pembayaran live.
