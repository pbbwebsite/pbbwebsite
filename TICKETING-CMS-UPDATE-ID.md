> **Catatan versi:** Dokumen ini merujuk pada iterasi sebelumnya. Untuk perilaku terbaru, multi-event CMS, urutan migration, pengujian, dan batasan verifikasi, gunakan `MULTI-EVENT-UPGRADE-REPORT-ID.md` dan `OWNER-GUIDE-ID.md` (v1.9.0).

# Pembaruan CMS Tiket — v1.8.2

## Perubahan
- Menambahkan tab **Tiket & Penjualan** di `/admin/`.
- Pengurus dapat mengubah nama acara, deskripsi, tanggal, lokasi, harga, dan status buka/tutup penjualan melalui CMS.
- Pengaturan CMS disimpan ke `data/content.json` melalui alur GitHub CMS yang sudah ada.
- `ticket-config` dan `ticket-create-order` membaca pengaturan yang sama di sisi server, sehingga harga yang ditampilkan dan harga transaksi tidak lagi berbeda hanya karena variabel event lama belum diubah.
- Penjualan hanya aktif bila pengaturan CMS `active=true` dan environment Netlify `TICKETING_ENABLED=true`.
- Penjualan ditutup secara default dalam seed data.
- Upload gambar kini dapat digunakan dari CMS untuk logo, poster tiket, sampul video, program, pelatih, event, dan galeri (JPEG/PNG/WebP maks. 4 MB).
- Webhook pembayaran menggunakan klaim email atomik dan migration `202610270003_ticket_email_claim.sql` untuk mengurangi pengiriman email ganda saat webhook berulang.
- Rahasia gateway/database/token GitHub tidak dimasukkan ke browser atau CMS.

## Verifikasi lokal
- `npm test`: 61/61 tes lulus pada source setelah pembaruan.
- `npm run check`: lulus.
- `npm run build`: structural check lulus.

## Belum diverifikasi
- Login CMS terhadap konfigurasi Netlify/GitHub milik pengguna.
- Integrasi live Midtrans, webhook live, pengiriman email live, dan deployment Netlify.
- Browser/device QA dan transaksi end-to-end di lingkungan produksi.
- CMS tiket masih mengelola satu konfigurasi acara aktif; CRUD multi-event dengan inventaris terpisah belum tersedia.
- Kapasitas inventori disinkronkan ke `ticket_event_inventory` di Supabase melalui fungsi server, bukan CRUD inventaris multi-event dari CMS.

Penjualan tetap nonaktif sampai seluruh konfigurasi server dan pengujian sandbox selesai.
