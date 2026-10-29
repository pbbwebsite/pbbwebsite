# Catatan Perbaikan Website Persatuan Boxing Bogor

## Perubahan pada source
- Mengurangi intensitas latar WebGL merah dan menghilangkan offset kanal biru pada efek chromatic aberration agar tidak menghasilkan bayangan biru.
- Mengubah lapisan latar CSS menjadi hitam polos dan membuat canvas dekoratif tidak menangkap klik/tap.
- Menambahkan guard desktop agar elemen `.reveal` tetap terbaca walau animasi atau WebGL gagal.
- Memperhalus overlay foto hero supaya foto dan teks lebih terbaca.
- Menambahkan pemeriksaan konfigurasi aman pada halaman CMS dan panel data organisasi. Pemeriksaan hanya menampilkan status konfigurasi, tidak pernah menampilkan nilai rahasia.
- Memperjelas bahwa panel data organisasi memakai `PLATFORM_ADMIN_PASSWORD` terpisah dari `CMS_ADMIN_PASSWORD`.
- Menambahkan regression tests untuk tampilan desktop, efek warna, dan diagnostik konfigurasi.

## Environment variables yang berbeda
CMS konten `/admin/`:
- `CMS_ADMIN_PASSWORD` (minimal 12 karakter)
- `CMS_SESSION_SECRET` (minimal 32 byte)
- `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_BRANCH` (opsional, default `main`), `GITHUB_TOKEN`

Panel data organisasi `/admin/platform.html`:
- `PLATFORM_ADMIN_PASSWORD` (minimal 16 karakter; berbeda dari password CMS)
- `CMS_SESSION_SECRET` (minimal 32 byte)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` atau `SUPABASE_SECRET_KEY`
- Dua migration SQL di `supabase/migrations/` harus dijalankan pada proyek Supabase yang sama.

Setelah mengubah environment variables di Netlify, lakukan redeploy agar Netlify Functions memakai konfigurasi terbaru. Jangan pernah memasukkan token GitHub atau kunci server Supabase ke HTML/JavaScript frontend.

## Verifikasi lokal
- `npm test`: PASS, 48/48
- `npm run check`: PASS
- `npm run build`: PASS (structural check; bukan production browser/integration test)
- Browser production dan deployment Netlify: NOT RUN dari lingkungan ini.
