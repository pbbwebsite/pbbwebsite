> **Catatan versi:** Dokumen ini merujuk pada iterasi sebelumnya. Untuk perilaku terbaru, multi-event CMS, urutan migration, pengujian, dan batasan verifikasi, gunakan `MULTI-EVENT-UPGRADE-REPORT-ID.md` dan `OWNER-GUIDE-ID.md` (v1.9.0).

# Status Implementasi CMS, Visual, dan Ticketing — PBB v1.8.1 Follow-up

## Perubahan dalam paket ini

- Memperluas tab **Tiket & Penjualan** pada CMS yang sudah ada: aktif/nonaktif, nama acara, deskripsi, poster, tanggal/waktu acara, lokasi, jenis tiket, harga, kapasitas, batas pembelian 1–5 tiket, dan waktu mulai/akhir penjualan.
- Semua konfigurasi tersebut disimpan melalui alur CMS GitHub yang sudah ada dan dibaca ulang oleh fungsi server. Tidak perlu mengedit `content.json` manual untuk mengubah pengaturan tiket.
- Validasi server membatasi harga dan kapasitas, memvalidasi tanggal ISO, menolak periode penjualan terbalik, dan hanya menerima URL poster HTTPS atau path lokal.
- Halaman publik menampilkan poster, jenis tiket, detail acara, dan membatasi jumlah pembelian sesuai nilai CMS. Harga tetap dihitung ulang di server.
- Fungsi pembuatan order menyelaraskan kapasitas konfigurasi dengan inventaris Supabase lewat RPC atomik; perubahan kapasitas yang lebih kecil dari jumlah yang sudah dialokasikan ditolak.
- Pesanan pending yang sudah melewati `expires_at` dibersihkan sebelum reservasi baru, dengan update bersyarat untuk menghindari pelepasan kapasitas ganda.
- Menambahkan migration lanjutan `202610270002_ticket_capacity_config.sql` untuk instalasi yang sudah menjalankan migration ticketing awal.
- CMS utama menyediakan tautan langsung ke panel pesanan dan check-in.
- Upload gambar melalui CMS diperluas untuk foto program, pelatih, event, logo, poster tiket, dan sampul video (JPEG/PNG/WebP, maksimal 4 MB); gambar program kini dirender di halaman program.
- Lapisan visual dirapikan: scene 3D global diturunkan drastis, glow/overlay dekoratif dikurangi, kartu konten dibuat lebih solid, ticker tidak lagi miring, dan kontras teks ditingkatkan.
- Webhook ticketing memakai klaim email atomik (`pending/failed` → `sending`) dan status retry `failed`, untuk mencegah dua webhook paralel mengirim email yang sama. Ditambahkan migration `202610270003_ticket_email_claim.sql` dengan timestamp percobaan dan klaim stale setelah 5 menit.
- Memperbaiki bug deklarasi `reserved` yang sebelumnya tersapu oleh komentar satu baris, sehingga penanganan kegagalan reservasi dapat berjalan sebagaimana dimaksud.

## Tes yang dijalankan pada source paket

- `npm test`: **61 lulus, 0 gagal** (termasuk tes baru untuk readability, upload CMS, rendering gambar program, dan klaim email atomik).
- `npm run check`: **lulus** untuk sintaks fungsi Netlify yang tercakup.
- `npm run build`: **lulus pemeriksaan struktural**. Ini bukan bundling produksi atau uji browser.
- `node --check admin/admin.js` dan file JavaScript frontend: dijalankan terpisah sebelum pengemasan.
- Arsip ZIP diuji integritasnya setelah dibuat.

## Batasan penting yang belum terselesaikan

Paket ini **belum production-ready** dan belum memenuhi seluruh mandat multi-event end-to-end:

1. CMS ticketing saat ini mengelola **satu konfigurasi acara aktif**, bukan CRUD banyak acara dengan jenis tiket/kapasitas terpisah untuk tiap acara.
2. Tidak ada akses ke akun pemilik Netlify, Supabase, Midtrans, GitHub, atau Resend di sesi ini. Migration harus diterapkan di proyek Supabase pemilik; autentikasi nyata, webhook, email, dan deployment belum dapat diverifikasi.
3. Rekonsiliasi status gateway otomatis belum dijadwalkan. Penjualan live harus tetap nonaktif sampai staging lulus.
4. Email kini memakai klaim atomik per order dan dapat dicoba ulang saat webhook dipanggil ulang; ini belum merupakan durable outbox terpisah dengan worker terjadwal. Email yang gagal tetap membutuhkan webhook ulang atau proses operasional untuk dicoba kembali.
5. Retry terjadwal/backoff, audit log ticketing menyeluruh, refund end-to-end, pembatalan tiket lewat CMS, dan lampiran PDF email belum selesai. PDF saat ini dibuat pengguna lewat fitur Cetak/Simpan PDF pada halaman tiket.
6. Belum dilakukan uji concurrency nyata pada Supabase, pengujian browser lintas perangkat, atau transaksi sandbox melalui akun merchant.

## Konfigurasi dan aktivasi

- Tetap set `TICKETING_ENABLED=false` sampai konfigurasi dan pengujian staging selesai.
- Simpan `MIDTRANS_SERVER_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `CMS_SESSION_SECRET`, dan `GITHUB_TOKEN` hanya di environment server Netlify.
- Terapkan migration `202610270001_ticketing.sql` bila belum pernah diterapkan, kemudian `202610270002_ticket_capacity_config.sql` dan `202610270003_ticket_email_claim.sql`. Jika migrasi organisasi juga digunakan, jalankan dua migration organisasi terlebih dahulu sesuai panduan Supabase.
- Isi detail acara dan harga lewat CMS. Jangan mengaktifkan penjualan sebelum akun merchant resmi, URL webhook, sender email terverifikasi, dan pengujian E2E selesai.
