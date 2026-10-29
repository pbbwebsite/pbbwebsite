# Perbaikan v1.9.2

## Login & CMS
- Kata sandi tidak lagi gagal karena spasi tersembunyi (autofill, tempel dari catatan, nilai variabel Netlify).
- Refresh halaman CMS / Data Organisasi memulihkan sesi yang masih berlaku; tidak perlu login ulang.
- Saat sesi habis, form login muncul kembali dengan pesan jelas dan draft yang belum disimpan tetap aman.
- Tombol Masuk dinonaktifkan selama proses agar klik ganda tidak menghabiskan jatah percobaan.
- Batas percobaan: 8 kali, kunci 5 menit (sebelumnya 5 kali / 10 menit), dan tidak lagi dipakai bersama semua pengunjung bila header IP tidak ada.
- Pemeriksaan asal permintaan memperhitungkan `x-forwarded-host`, sehingga login/simpan tidak ditolak 403 di balik domain kustom/proxy.

## Tampilan
- Penyebab judul beranda hilang dan meninggalkan lubang kosong: CSS "readability pass" menurunkan kanvas 3D ke opasitas 7,5% sementara judul HTML disembunyikan saat judul 3D aktif. Sekarang judul selalu berupa teks CSS yang tajam; mesh judul 3D tidak digambar.
- Judul hero dikecilkan agar foto dan teks terlihat di layar pertama.
- Catatan vertikal hero tidak lagi terpecah menjadi dua kolom.

## Catatan
Sandbox tidak punya akses ke CDN (Three.js, GSAP, Barba, Lenis), jadi jalur animasi penuh belum bisa saya lihat. Perbaikan hero ditentukan dari kode dan CSS; mohon cek di deployment. Acara tiket "PBB Boxing Series Halloween" berstatus draft di `data/content.json`, jadi halaman tiket menampilkan "belum ada acara" sampai dipublikasikan lewat CMS.
