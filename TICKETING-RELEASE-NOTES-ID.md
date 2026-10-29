> **Catatan versi:** Dokumen ini merujuk pada iterasi sebelumnya. Untuk perilaku terbaru, multi-event CMS, urutan migration, pengujian, dan batasan verifikasi, gunakan `MULTI-EVENT-UPGRADE-REPORT-ID.md` dan `OWNER-GUIDE-ID.md` (v1.9.0).

# Release notes — v1.8.0 Ticketing

Fitur baru ditambahkan ke situs Persatuan Boxing Bogor tanpa mengganti desain/fitur lama:
- Menu Beli Tiket dan halaman pemesanan responsif.
- Form nama, alamat, HP, email, jumlah tiket, dan total dari konfigurasi server.
- Netlify Functions untuk membuat pesanan QRIS Midtrans, memverifikasi notifikasi pembayaran, membaca status pesanan, dan mengirim email tiket.
- Tiket digital dengan QR token acak, opsi cetak/simpan PDF dari browser, dan check-in panitia via dashboard admin dengan sesi admin platform.
- Skema Supabase terpisah, RLS tanpa akses publik langsung, kuota atomik, dan tes regresi.

## Hasil tes lokal
- `npm test`: 52 tes lulus, 0 gagal.
- `npm run check`: lulus untuk seluruh fungsi Netlify termasuk tiket.
- `npm run build`: pemeriksaan struktur, tautan lokal, JSON, aksesibilitas dasar, dan sintaks lulus.

## Belum diverifikasi
Tidak ada koneksi ke akun Supabase/Midtrans/Resend milik pemilik di lingkungan ini. Migration belum dijalankan pada database nyata; pembayaran sandbox/produksi, email nyata, check-in kamera di browser, dan deployment Netlify belum diuji. Fitur tiket tetap OFF secara default sampai konfigurasi merchant, environment variables, migration, dan uji staging diselesaikan.
