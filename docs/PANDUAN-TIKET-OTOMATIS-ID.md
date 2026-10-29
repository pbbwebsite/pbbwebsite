# Panduan aktivasi tiket otomatis PBB

Fitur tiket sengaja **OFF secara default**. Jangan mengaktifkan produksi sebelum langkah ini selesai.

## 1. Supabase

1. Buat/ pilih proyek Supabase milik organisasi dan gunakan staging lebih dulu.
2. Jalankan berurutan: `202610270001_ticketing.sql`, `202610270002_ticket_capacity_config.sql`, lalu `202610270003_ticket_email_claim.sql` setelah migration organisasi yang dibutuhkan. Jangan menjalankan ulang migration tanpa memeriksa status schema Supabase terlebih dahulu.
3. Pastikan tabel `ticket_orders`, `ticket_tickets`, `ticket_event_inventory` dan fungsi RPC terbentuk.
4. Kapasitas awal disiapkan untuk slug `pbb-event`, kapasitas 100. Atur kapasitas lewat SQL admin, misalnya:

```sql
update public.ticket_event_inventory
set capacity = 250, updated_at = now()
where event_slug = 'pbb-event';
```

Jangan menurunkan kapasitas di bawah `allocated_count`. Jika memakai slug berbeda, buat baris inventory dengan slug itu dan pastikan `TICKET_EVENT_SLUG` sama.

## 2. Environment variables Netlify

Isi di Site configuration → Environment variables (server-side only):

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` — jangan pernah ditaruh di frontend/Git.
- `TICKETING_ENABLED=false` selama uji coba.
- `TICKET_EVENT_TITLE`, `TICKET_EVENT_DESCRIPTION`, `TICKET_EVENT_DATE_LABEL`, `TICKET_EVENT_LOCATION`.
- `TICKET_EVENT_SLUG=pbb-event`.
- `TICKET_PRICE_IDR` sebagai angka rupiah bulat, tanpa pemisah ribuan.
- `MIDTRANS_SERVER_KEY` dari merchant resmi.
- `MIDTRANS_ENVIRONMENT=sandbox` dan `MIDTRANS_QRIS_ACQUIRER=gopay` untuk uji sandbox.
- `RESEND_API_KEY` dan `TICKET_EMAIL_FROM` setelah domain pengirim diverifikasi.

Jangan pernah menaruh client key atau server key di halaman HTML. Untuk produksi, ubah `MIDTRANS_ENVIRONMENT=production` hanya setelah pengujian sandbox dan aktivasi merchant diselesaikan.

## 3. Webhook pembayaran

Atur Payment Notification URL di dashboard Midtrans menjadi:

`https://DOMAIN-PBB-ANDA/.netlify/functions/ticket-webhook`

Gunakan URL HTTPS domain yang benar. Uji status settlement, expiry, cancel, signature salah, nominal tidak cocok, dan notifikasi berulang. Webhook harus dapat diakses publik oleh gateway, tetapi status pembayaran tetap diverifikasi menggunakan signature server-side.

## 4. Email dan PDF

Email otomatis dikirim setelah webhook pembayaran tervalidasi. Email memuat tautan akses privat ke halaman tiket. Pembeli dapat menekan **Cetak / Simpan PDF** pada halaman itu untuk menyimpan satu atau beberapa tiket sebagai PDF dari dialog cetak browser. Pastikan pengirim email dan domain tervalidasi serta lakukan tes ke Gmail dan alamat lain sebelum produksi.

## 5. Check-in

Panitia membuka `/admin/ticket-checkin.html`, login dengan `PLATFORM_ADMIN_PASSWORD` yang kuat, lalu memindai QR atau memasukkan token secara manual. Kamera memerlukan HTTPS dan izin kamera browser. Endpoint check-in memakai sesi admin platform dan mengubah status hanya dari `valid` ke `used`; pemindaian ulang ditolak.

## 6. Batasan dan release gate

- Migration belum dijalankan otomatis pada akun Supabase mana pun; pemilik proyek harus menerapkannya.
- Belum ada uji integrasi gateway nyata, email nyata, browser E2E, atau deployment live dari paket ini.
- Kegagalan pengiriman email disimpan sebagai status; retry terjadwal belum diimplementasikan. Pantau status email dan siapkan prosedur kirim ulang sebelum event besar.
- Tiket PDF dibuat melalui fungsi cetak browser, bukan lampiran PDF otomatis. Jika lampiran PDF email wajib, tambahkan generator PDF server-side dan uji ukuran/escaping konten.
- Lindungi data pribadi pemesan sesuai kebijakan retensi organisasi. Hapus/arsipkan data hanya sesuai aturan dan kebutuhan audit.
- Jangan mengaktifkan `TICKETING_ENABLED=true` sampai checklist pembayaran, kuota, email, check-in, backup, dan pemulihan lulus di staging.

## Mengelola tiket melalui CMS (tanpa mengedit kode)

1. Masuk ke `/admin/` menggunakan `CMS_ADMIN_PASSWORD`.
2. Buka tab **Tiket & Penjualan**.
3. Ubah nama acara, deskripsi, tanggal yang ditampilkan, lokasi, dan harga per tiket. Centang **Buka penjualan tiket** hanya setelah seluruh integrasi siap.
4. Tekan **Simpan perubahan**. CMS menyimpan `data/content.json` ke repository GitHub; jika repository terhubung ke Netlify, perubahan konten akan memicu deployment. Endpoint tiket membaca pengaturan ini dari CMS di sisi server.
5. Ada dua kunci aktivasi: centang CMS dan `TICKETING_ENABLED=true` pada environment Netlify. Jika salah satunya nonaktif, pembelian ditolak. Ini sengaja dibuat sebagai pengaman darurat.

Kunci Midtrans, Supabase service role, dan token GitHub tetap hanya disimpan di environment server. Jangan pernah memasukkannya ke form CMS atau file yang dipublikasikan.

**Batasan inventori saat ini:** kapasitas dan alokasi tiket tetap diatur pada tabel `ticket_event_inventory` Supabase. Harga dan informasi acara dapat diedit dari CMS; perubahan kapasitas perlu dilakukan melalui pengelolaan database sampai modul inventori admin tersedia. Penjualan tetap nonaktif secara default.

## Pembaruan v1.8.1 — admin pesanan dan pemeriksaan check-in

- Panel `/admin/ticket-orders.html` menggunakan sesi admin platform yang sama dengan check-in. Panel hanya membaca 500 pesanan terbaru, menyediakan pencarian/filter lokal dan ekspor CSV; tidak menyediakan tombol untuk mengubah status pembayaran.
- Check-in kini memeriksa status order `paid` di server sebelum menandai tiket digunakan. Perubahan status dilakukan dengan conditional update dari `valid` ke `used`, sehingga hanya satu permintaan bersamaan yang dapat mengklaim tiket.
- Webhook menolak mata uang non-IDR bila field mata uang dikirim dan menolak status transaksi yang tidak dikenal.
- Tombol keluar di kedua panel memanggil endpoint logout server.

## Batasan yang tetap harus dipahami

CMS saat ini mengelola **satu konfigurasi penjualan tiket** (`content.ticketing`), bukan CRUD banyak acara dan tipe tiket. Kapasitas masih dikelola lewat `ticket_event_inventory` di Supabase. Belum tersedia audit log khusus untuk seluruh tindakan ticketing, retry email terjadwal, rekonsiliasi gateway terjadwal, atau email dengan lampiran PDF. Ekspor CSV berisi data pribadi pemesan sehingga hanya admin berwenang yang boleh mengunduh dan menyimpannya secara aman. Panel pesanan membutuhkan migration Supabase ticketing dan environment server yang benar.
