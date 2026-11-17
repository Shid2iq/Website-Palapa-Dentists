# Mulai dari PANDUAN-SINGKAT.md (pemasangan satu perintah di Ubuntu)

# Palapa Dentists – Website + Admin

Website klinik dengan database SQLite, login username/password, dan upload foto.

## Menjalankan
```
npm install
ADMIN_USER=admin ADMIN_PASS=passwordkuat123 npm start
```
Buka http://localhost:3000. Login admin: http://localhost:3000/#/login

Kalau ADMIN_PASS tidak diisi, password acak dicetak di terminal saat pertama kali dijalankan.
Ganti password di dashboard: menu **Akun**. Klik **Isi data awal** di Dashboard saat pertama masuk.

## Penting saat dipasang di server
- Pakai HTTPS (misalnya lewat Nginx/Caddy atau hosting yang menyediakan SSL), lalu jalankan dengan `COOKIE_SECURE=1`.
- Backup folder `data/` secara rutin (berisi database `palapa.db` dan foto di `data/uploads`).
- Variabel opsional: `PORT`, `DATA_DIR`.
- Butuh Node.js 18 atau lebih baru.

## Struktur
- `server.js` – API, login (bcrypt + sesi di database), upload foto, batas percobaan login
- `public/index.html` – website dan dashboard admin
- `data/` – dibuat otomatis (database dan foto)

## Isi website yang bisa diatur dari dashboard
| Menu dashboard | Mengubah apa |
|---|---|
| Pengaturan Website | Teks dan foto Home, About Us, kontak, jam kerja, footer, link Facebook/Instagram |
| Artikel | Blog: tampil di Home (4 terbaru), halaman Blogs, halaman artikel, dan "Artikel lainnya" |
| Dokter | Halaman Our Dentists dan Timetable (foto, jadwal, tampil/sembunyi) |
| Layanan | Kartu layanan di Home dan Departments (nama, deskripsi, ikon/gambar, urutan) |
| Keunggulan | Empat kartu di About Us |
| Poin Mengapa Palapa | Daftar centang di Home |
| Sejarah | Timeline di About Us (judul, isi, foto) |
| Asuransi | Halaman Insurances (nama, keterangan, logo) |
| Janji | Permintaan janji dari formulir Contact |

Jika memperbarui dari versi sebelumnya: ganti `server.js` dan `public/index.html`, jalankan ulang server,
lalu login dan klik **Isi data awal** di Dashboard untuk mengisi bagian baru (data lama tidak ditimpa).

## Tambahan: Blog bersusun dan Jadwal Praktek
- **Artikel**: foto sampul, penulis, kategori, paragraf pembuka, lalu hingga **5 bagian**. Tiap bagian punya pilihan judul H1/H2/H3, isi paragraf, dan gambar opsional.
- **Jadwal Praktek** (menu admin): pilih hari, jam mulai/selesai, spesialis, dan nama dokter. Tampil di halaman Timetable per hari, berwarna per spesialis, dengan filter.

## Kelola akun admin
Menu **Akun** di dashboard: lihat daftar admin, tambah admin baru (username + password), reset password admin lain,
hapus akun, dan ganti password sendiri. Akun yang sedang dipakai tidak bisa dihapus, dan harus selalu ada minimal satu admin.
Semua admin punya akses penuh. Password minimal 8 karakter dan disimpan terenkripsi (bcrypt).

## Posisi foto
Di form yang punya foto (Dokter, Artikel dan gambar tiap bagian, Sejarah, serta foto "Mengapa Memilih" dan "Tentang" di Pengaturan Website)
muncul bingkai pratinjau. Geser foto di dalam bingkai (atau pakai slider kiri-kanan dan atas-bawah) untuk menentukan bagian yang tampil.
Posisi tersimpan bersama datanya (kolom `...pos`, contoh `30% 70%`) dan langsung dipakai di website.

## Pemasangan di server
Lihat **PANDUAN-INSTALASI.md** (hosting, database bersama, HTTPS, backup) dan folder `deploy/`.
Untuk Windows: **PANDUAN-WINDOWS.md** dan `deploy/windows/`.

## Berkas aplikasi
`server.js`, `chat.js` (chat pasien), `public/` (termasuk `chat-widget.js`), `deploy/` (termasuk `restore-full.js`). Saat memperbarui, salin semuanya kecuali folder `data`.
