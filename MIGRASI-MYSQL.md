# Migrasi database: SQLite → MySQL / MariaDB

Dokumen ini menjelaskan langkah mengganti database website Palapa dari SQLite (`palapa.db`) ke MySQL atau MariaDB.

## Yang berubah
| Sebelum | Sesudah |
|---|---|
| Database = file `data/palapa.db` | Database = server MySQL/MariaDB (nama bawaan: `palapa`) |
| `better-sqlite3` (sinkron) | `mysql2` (async), lewat file `db.js` |
| Backup lengkap berisi `palapa.db` | Backup lengkap berisi `database.json` (semua tabel) |
| Foto di `data/uploads/` | **Tetap** di `data/uploads/` (foto tidak masuk database) |

File yang diganti/ditambah: `server.js`, `db.js` (baru), `chat.js`, `patients.js`, `ai.js`, `seeds.js`, `package.json`, `deploy/create-admin.js`, `deploy/backup.js`, `deploy/restore-full.js`, `deploy/migrate-sqlite-to-mysql.js` (baru), `.env.example` (baru).

Modul `seeds.js`, `chat.js`, `patients.js`, dan `ai.js` juga sudah dikonversi ke versi async MySQL (ikut di paket ini). `public/chat-widget.js` dan `public/index.html` tidak perlu diubah: keduanya hanya kode di browser dan memakai API yang sama.

Hasil pengujian (MariaDB 10.11, setara MySQL): login dan akun, data (tambah/ubah/hapus), janji temu, chat pasien dan balasan admin (termasuk notifikasi langsung), data pasien dan pengingat kontrol, impor massal, asisten AI (dengan API tiruan), data awal FAQ/Katalog pada database kosong, backup dan pemulihan, 30 perubahan bersamaan tanpa data hilang, serta migrasi data contoh dari SQLite yang hasilnya identik.

## Langkah 1 — Siapkan MySQL
Pasang MySQL 8 atau MariaDB 10.6+ (Windows: MySQL Installer atau XAMPP; Ubuntu: `sudo apt install mariadb-server`). Lalu buat database dan akun:
```sql
CREATE DATABASE palapa CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'palapa'@'localhost' IDENTIFIED BY 'GANTI_PASSWORD_KUAT';
GRANT ALL PRIVILEGES ON palapa.* TO 'palapa'@'localhost';
FLUSH PRIVILEGES;
```
(Bila akun punya hak `CREATE`, database juga dibuat otomatis saat server pertama kali jalan.)

## Langkah 2 — Isi pengaturan koneksi
Salin `.env.example` menjadi `.env` di folder yang sama dengan `server.js`, lalu isi `DB_USER`, `DB_PASS`, `DB_NAME`. **Jangan** unggah `.env` ke GitHub.

## Langkah 3 — Pasang paket
```
npm install
npm install better-sqlite3     # hanya untuk migrasi di langkah 5, boleh dihapus sesudahnya
```

## Langkah 4 — Hentikan server lama & cadangkan
Hentikan server, lalu salin folder `data/` (berisi `palapa.db` dan `uploads/`) ke tempat aman. File `palapa.db` **tidak diubah** oleh proses migrasi, jadi bisa dipakai lagi kalau perlu kembali ke SQLite.

## Langkah 5 — Pindahkan data
```
node deploy/migrate-sqlite-to-mysql.js data/palapa.db --kosongkan
```
Skrip menyalin semua tabel (konten, akun admin beserta peran, janji temu, dan tabel chat/pasien bila ada), lalu menampilkan jumlah baris di SQLite dan di MySQL. Pastikan angkanya sama. Sesi login tidak ikut, jadi semua orang perlu login ulang.

## Langkah 6 — Jalankan & periksa
```
npm start
```
Pesan "Palapa Dentists berjalan … (database MySQL: palapa)" berarti koneksi berhasil. Cek: login admin, daftar dokter, buka halaman Departments, tambah satu data uji lalu hapus.

Lupa password admin? `ADMIN_USER=admin ADMIN_PASS=passwordbaru node deploy/create-admin.js`

## Backup & pemulihan
- **Dari dashboard:** menu Backup → "Backup lengkap" menghasilkan ZIP berisi `database.json` + foto.
- **Pulihkan ZIP:** hentikan server, lalu `node deploy/restore-full.js FILE.zip`. Salinan database sebelumnya disimpan otomatis di `data/backup-sebelum-pulih/`.
- **Terjadwal:** `node deploy/backup.js /lokasi/backup` (JSON + foto, menyimpan 14 hari). Alternatif bawaan MySQL: `mysqldump -u palapa -p palapa > palapa.sql`.
- ZIP backup lama (berisi `palapa.db`) tidak dipulihkan langsung; `restore-full.js` akan mengekstraknya dan menunjukkan perintah migrasi.

## Bila ada masalah
| Pesan | Penyebab | Solusi |
|---|---|---|
| `Username atau password MySQL salah` | `DB_USER`/`DB_PASS` salah | Periksa `.env` |
| `Server MySQL tidak menjawab` | MySQL belum jalan / port salah | Jalankan MySQL, cek `DB_HOST`, `DB_PORT` |
| `Unknown database` | Database belum dibuat | Jalankan perintah SQL di Langkah 1 |
| `Database sedang bermasalah` (503) di browser | Koneksi MySQL terputus | Lihat log server, restart MySQL |
| Baris di MySQL ≠ SQLite | Migrasi terhenti | Jalankan ulang migrasi dengan `--kosongkan` |

## Catatan teknis
- Tabel inti: `docs`, `users`, `sessions`; kolom `rid` menjaga urutan data seperti sebelumnya.
- Username dan ID dokumen tetap peka huruf besar/kecil, seperti di SQLite.
- Pengubahan data (PATCH) dan pemulihan backup memakai transaksi, sehingga dua perubahan bersamaan tidak saling menimpa.
