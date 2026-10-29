# Laporan peningkatan v1.9.0 — CMS & Multi-event Ticketing

## Perubahan implementasi

- Menambahkan koleksi `ticketEvents` yang dikelola dari CMS dan validasi server-side untuk ID, slug unik, harga Rupiah bulat, kapasitas, batas pembelian, status publikasi, poster, dan jendela penjualan. Slug dikunci setelah acara dibuat karena menjadi kunci kuota/riwayat; penghapusan acara yang sudah memiliki pesanan ditolak agar audit tetap utuh.
- Menjaga kompatibilitas dengan `ticketing` lama. Data lama dimigrasikan secara aman sebagai draft agar pembukaan penjualan tidak terjadi otomatis.
- Menambahkan daftar acara publik dan pemilihan acara di halaman tiket. Checkout mengirim slug yang dipilih dan server membaca harga/kuota dari CMS, bukan mempercayai harga dari browser.
- Menyimpan snapshot acara pada setiap order (`event_slug`, `event_title`, tanggal, lokasi, jenis tiket) sehingga bukti pesanan tetap benar meskipun pengelola mengedit acara kemudian.
- Memisahkan reservasi dan pelepasan kapasitas menggunakan slug acara. Webhook memakai slug order yang tersimpan, bukan satu slug global.
- Menambahkan audit minimal notifikasi pembayaran yang sudah lolos validasi signature; penanganan refund membatalkan tiket yang masih valid dan melepaskan kuota sekali melalui transisi status bersyarat.
- Menampilkan acara pada panel pesanan dan memasukkan informasi acara ke ekspor CSV.
- Menambahkan aksi admin **Periksa gateway** untuk order `pending`: server memeriksa status melalui Midtrans Status API dan meneruskan hasil ke handler webhook yang sama. Respons checkout yang tidak pasti ditandai `gateway_status=unknown` dan tidak langsung melepas kuota; operator dapat merekonsiliasi order dari panel pesanan.
- Memperbarui panduan owner dan migration Supabase.

## Migration wajib

Urutan migrations untuk ticketing:

1. `202610270001_ticketing.sql`
2. `202610270002_ticket_capacity_config.sql`
3. `202610270003_ticket_email_claim.sql`
4. `202610270004_multi_event_ticketing.sql`

Jalankan di Supabase staging terlebih dahulu. Jangan mengaktifkan `TICKETING_ENABLED=true` sebelum seluruh migration berhasil dan tes sandbox lengkap.

## Verifikasi lokal

- `npm test`: 62/62 tes lulus.
- `npm run check`: pemeriksaan sintaks Netlify Functions lulus.
- `npm run build`: pemeriksaan struktur lulus.
- Pemeriksaan sintaks browser JavaScript dan skrip panel pesanan: lulus.
- Pemeriksaan build adalah structural check, bukan bundling produksi.

## Belum dapat diverifikasi dari lingkungan lokal

- Akses GitHub API dan deployment Netlify pada akun nyata.
- Supabase staging/prod, migration execution, RLS dan concurrency pada database nyata.
- Akun Midtrans sandbox/production, callback webhook publik, QRIS end-to-end, refund nyata, dan email Resend nyata.
- Uji browser lintas perangkat dan pengujian beban.

Pembayaran live harus tetap nonaktif sampai pengujian integrasi tersebut selesai. Status lokal yang hijau bukan bukti bahwa merchant, database, webhook, email, atau deployment eksternal telah berfungsi.
