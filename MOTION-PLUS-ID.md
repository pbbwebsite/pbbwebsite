# Motion+ v1.7.0 — Upgrade visual & transisi (add-on)

Lapisan ini ditambahkan di atas v1.6.3 tanpa menulis ulang apa pun. Struktur HTML, routing, CMS, Supabase, dan Netlify Functions tidak diubah. Bila `motion-plus.js` gagal dimuat, GSAP tidak ada, atau pengunjung memakai *reduced motion*, situs berjalan seperti v1.6.3.

## 1. Temuan analisis: v1.6.3 sudah punya sebagian besar mesinnya

Prompt awal mengasumsikan situs belum memakai GSAP, Lenis, dan Barba. Ternyata ketiganya sudah ada, jadi yang dikerjakan adalah **celah** yang nyata:

| Tugas | Kondisi v1.6.3 | Yang dilakukan Motion+ |
|---|---|---|
| 1. Smooth scroll | Lenis aktif, tetapi berbasis `duration` (terasa ringan, bukan berbobot) | Konstruktor Lenis dibungkus: `lerp 0.075` (inersia), `wheelMultiplier 0.85`. `#anchor` tetap jalan |
| 2. Transisi halaman | Barba aktif, tetapi tirai **dimatikan** CSS (`.transition-curtain{display:none!important}`), hanya crossfade | Tirai 5 kolom merah lalu hitam + logo PBB + nama halaman tujuan, lewat hook global Barba |
| 3a. Marquee hero | Hanya pita merah searah | Dua baris teks raksasa berlawanan arah; scroll mempercepat, scroll ke atas membalik arah |
| 3b. Image reveal | Hanya fade-up umum | Clip-path reveal bergantian arah + stagger (galeri, foto strip, poster, pelatih, video) |
| 3c. Hover | Gerak 3 px | Magnet 14 px (tombol), 9 px (link), 6 px (menu), plus isian "bone" saat hover tombol |
| 4. Preloader | Bar tipis, tanpa angka, ~0,85 dtk | Angka 0–100% bergaya tinju, status ronde, tali ring sebagai progress, tahan minimal 1,3 dtk |

## 2. File yang berubah

**Baru**
- `assets/css/motion-plus.css`
- `assets/js/motion-plus.js`
- `assets/img/logo-pbb-cutout.webp` (logo tanpa latar putih, untuk tirai)

**Disisipi (tambah saja)**
- Semua 9 halaman `.html` di root (`index`, `about`, `programs`, `coaches`, `schedule`, `competitions`, `gallery`, `contact`, `404`): 1 `<link>` dan 1 `<script>`.
- `assets/js/app.js`: 2 baris pengaman di transisi Barba. Keduanya hanya aktif jika `.mx-curtain.is-on` ada; tanpa tirai, perilaku lama persis.
- `assets/js/kinetic.js`: `revealTitle()` menahan judul 3D sampai preloader mulai terbuka (tanpa preloader, tidak berpengaruh).
- `scripts/build-check.mjs` (mewajibkan file baru) dan `package.json` (versi 1.7.0).

## 3. Cara memasang manual (bila tidak memakai zip)

1. Salin tiga file baru di atas ke folder yang sama.
2. Di **setiap** `.html` root, tepat setelah `<link rel="stylesheet" href="assets/css/style.css">` tambahkan:
   `<link rel="stylesheet" href="assets/css/motion-plus.css">`
3. Di **setiap** `.html` root, tepat setelah `<script defer src="assets/js/kinetic.js"></script>` tambahkan:
   `<script defer src="assets/js/motion-plus.js"></script>`
   (Harus paling akhir, karena membungkus Lenis dan mengambil alih preloader sebelum `app.js` berjalan.)
4. `assets/js/app.js`, fungsi transisi `leave`: setelah baris `document.body.setAttribute('aria-busy', 'true');` tambahkan
   `if (document.querySelector('.mx-curtain.is-on')) return;`
5. `assets/js/app.js`, fungsi `enter`: sebelum baris `data.next.container.style.opacity = '0';` tambahkan
   `if (document.querySelector('.mx-curtain.is-on')) { data.next.container.style.opacity = ''; return; }`
6. `assets/js/kinetic.js`, awal fungsi `revealTitle()`: tambahkan blok `if (root.classList.contains('pbb-preloading')) { ... return; }` (lihat file ini untuk isinya).
7. Jalankan `npm test`, `npm run check`, `npm run build`, lalu deploy.

## 4. Menyetel rasa gerak

Semua angka ada di objek `MX` di bagian atas `assets/js/motion-plus.js`:

- `lenis.lerp`: lebih kecil = lebih berat (0.06 sangat berat, 0.1 ringan).
- `preloader.minMs` / `maxMs`: lama tahan minimal / batas darurat.
- `curtain.cover` / `curtain.reveal`: kecepatan tirai.
- `marquee.rows`: teks, arah, kecepatan; `marquee.boost`: pengaruh scroll.
- `magnet`: kekuatan, jarak maksimum, dan jangkauan tiap kelompok elemen.
- `reveal`: daftar selector yang mendapat clip-path reveal.

## 5. Membatalkan

Hapus 1 `<link>` dan 1 `<script>` Motion+ dari tiap halaman. Dua baris pengaman di `app.js` dan blok di `kinetic.js` tidak berbahaya bila dibiarkan.

## 6. Yang sudah diuji dan yang belum

Diuji di Chromium headless dengan library CDN diarahkan ke salinan lokal (GSAP 3.12.5, Barba 2.10.3, Lenis 1.1.20, Three r128): preloader 0–100% lalu keluar, tirai menutup/membuka dan konten halaman benar, tombol Back, link `#anchor`, magnet tetap meneruskan klik, reveal galeri selesai, tanpa error JavaScript, serta skenario gagal (tanpa `motion-plus.js`/CSS, tanpa GSAP/Barba/Lenis, semua CDN mati) dan *reduced motion*. `npm test` (48 tes) dan `npm run build` lulus.

**Belum diverifikasi, wajib dicek sebelum tayang:**
- Perangkat asli (terutama HP Android kelas menengah ke bawah). Mesin WebGL v8 sudah berat; angka preloader berbagi *main thread* dengannya dan bisa tersendat saat judul 3D disusun.
- Tampilan dengan font asli Barlow Condensed (di uji tanpa Google Fonts, jadi huruf tampak lebih lebar daripada aslinya).
- Deploy Netlify sungguhan, Lighthouse, dan perilaku di Safari iOS.
