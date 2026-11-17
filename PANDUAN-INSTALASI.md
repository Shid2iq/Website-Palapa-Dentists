# Panduan Pemasangan, Database Bersama, dan Hosting – Palapa Dentists

## 1. Konsep dulu (penting)

**Admin TIDAK perlu menginstal apa pun di PC atau laptop masing-masing.**

Aplikasi (server + database) dipasang **satu kali** di satu komputer server (VPS/hosting). Semua admin dan semua pengunjung hanya membuka alamat website lewat browser. Karena semuanya memakai server dan database yang sama, perubahan dari satu admin otomatis dilihat admin lain.

```
 PC Admin 1 ─┐
 Laptop Admin 2 ─┼──(internet, browser)──►  SERVER (Node.js)  ──►  palapa.db  (1 database)
 HP Admin 3 ─┘                                    ▲                 + folder foto
 Pengunjung ─────────────────────────────────────┘
```

**Jangan** menjalankan salinan aplikasi di setiap PC (datanya akan terpisah-pisah), dan **jangan** menaruh `palapa.db` di Google Drive/Dropbox/folder jaringan yang dibuka banyak PC (database bisa rusak).

## 2. Yang perlu disiapkan
- **VPS** Linux (Ubuntu 22.04 atau 24.04), minimal 1 vCPU, 1 GB RAM, disk 20 GB. Harus VPS, bukan shared hosting biasa, karena perlu menjalankan Node.js.
- **Domain** (misalnya palapadentists.com) dan akses ke pengaturan DNS-nya.
- File `palapa-website.zip`.
- Saran: uji dulu di subdomain (misalnya `baru.palapadentists.com`) sebelum mengganti website lama, supaya website lama tetap hidup selama pengujian.

## 3. Menyiapkan server (sekali saja)
Semua perintah dijalankan di server lewat SSH (`ssh root@IP_SERVER`).

```bash
# 1. Perbarui sistem
apt update && apt upgrade -y

# 2. Buat user khusus aplikasi
adduser palapa

# 3. Firewall: hanya SSH, HTTP, HTTPS
ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw enable

# 4. Pasang Node.js 20 dan Nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs nginx build-essential python3 unzip
```

## 4. Memasang aplikasi
Dari komputer Anda, kirim zip ke server: `scp palapa-website.zip palapa@IP_SERVER:~`

Lalu di server:

```bash
su - palapa
unzip palapa-website.zip
cd palapa && npm install --omit=dev
exit                      # kembali ke root

# Database dan foto disimpan di folder terpisah dari kode
mkdir -p /var/lib/palapa
cp /home/palapa/palapa/data/palapa.db /var/lib/palapa/
chown -R palapa:palapa /var/lib/palapa

# Konfigurasi
cp /home/palapa/palapa/deploy/palapa.env.example /etc/palapa.env
nano /etc/palapa.env      # isi ADMIN_PASS dengan password kuat
chmod 600 /etc/palapa.env

# Jalankan sebagai layanan (otomatis hidup lagi setelah server restart)
cp /home/palapa/palapa/deploy/palapa.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now palapa
systemctl status palapa   # harus "active (running)"
```

Setelah akun admin pertama terbentuk, buka lagi `/etc/palapa.env`, **hapus baris ADMIN_USER dan ADMIN_PASS**, lalu `systemctl restart palapa`.

Arti pengaturan di `/etc/palapa.env`:

| Variabel | Fungsi |
|---|---|
| `PORT` | Port aplikasi (3000), hanya dipakai di dalam server |
| `HOST=127.0.0.1` | Aplikasi hanya bisa diakses lewat Nginx, tidak langsung dari internet |
| `DATA_DIR` | Lokasi `palapa.db` dan folder foto |
| `COOKIE_SECURE=1` | Wajib saat memakai HTTPS |
| `ADMIN_USER`, `ADMIN_PASS` | Akun admin pertama (hanya dibaca saat database belum punya akun) |

## 5. Menghubungkan domain dan HTTPS
1. Di pengaturan DNS domain, buat **A record** `@` dan `www` yang mengarah ke IP server. Tunggu beberapa menit sampai beberapa jam.
2. Pasang konfigurasi Nginx:
   ```bash
   cp /home/palapa/palapa/deploy/nginx-palapa.conf /etc/nginx/sites-available/palapa
   nano /etc/nginx/sites-available/palapa     # ganti nama domain
   ln -s /etc/nginx/sites-available/palapa /etc/nginx/sites-enabled/palapa
   nginx -t && systemctl reload nginx
   ```
3. Pasang sertifikat HTTPS gratis:
   ```bash
   apt install -y certbot python3-certbot-nginx
   certbot --nginx -d palapadentists.com -d www.palapadentists.com
   ```
   Pembaruan sertifikat berjalan otomatis.
4. Buka `https://palapadentists.com`. Halaman login admin: `https://palapadentists.com/#/login`.

## 6. Cara admin memakai (tanpa instalasi)
1. Buka alamat website di browser (Chrome, Edge, atau Firefox) di PC, laptop, atau HP mana pun.
2. Klik **🔒 Login** dan masuk dengan akun masing-masing.
3. Tambahkan akun untuk tiap admin di menu **Akun** (satu akun per orang). Hapus akun orang yang sudah tidak bertugas.
4. Opsional: di Chrome, menu ⋮ → *Kirim, simpan, dan bagikan* → *Instal halaman sebagai aplikasi*, supaya dashboard punya ikon sendiri di desktop.

**Sinkronisasi antar admin:** semua data tersimpan di satu database di server. Saat dashboard terbuka, daftar data diperiksa ulang tiap ±15 detik, jadi perubahan admin lain muncul sendiri. Halaman Pengaturan Website dan Akun tidak diperbarui otomatis agar ketikan tidak hilang, jadi muat ulang halaman (F5) di sana. Jika dua admin menyunting item yang **sama** pada waktu yang sama, yang menyimpan terakhir yang berlaku. Tidak ada peringatan konflik.

## 7. Backup (wajib)
Yang perlu diamankan: `/var/lib/palapa/palapa.db` dan folder `/var/lib/palapa/uploads`.

```bash
# Sebagai root: siapkan folder backup
mkdir -p /var/backups/palapa && chown palapa:palapa /var/backups/palapa

# Sebagai user palapa (su - palapa): uji sekali
cd ~/palapa && DATA_DIR=/var/lib/palapa node deploy/backup.js /var/backups/palapa

# Jadwalkan tiap hari jam 02.00: jalankan "crontab -e" lalu tambahkan baris ini
0 2 * * * cd /home/palapa/palapa && DATA_DIR=/var/lib/palapa /usr/bin/node deploy/backup.js /var/backups/palapa
```

Backup disimpan 14 hari. **Salin juga ke tempat lain** (komputer kantor, Google Drive lewat `rclone`, atau fitur snapshot dari penyedia VPS), karena backup di server yang sama ikut hilang kalau server bermasalah.

**Memulihkan:**
```bash
systemctl stop palapa
cp /var/backups/palapa/palapa-TANGGAL.db /var/lib/palapa/palapa.db
cp -r /var/backups/palapa/uploads-TANGGAL/. /var/lib/palapa/uploads/
chown -R palapa:palapa /var/lib/palapa
systemctl start palapa
```

## 8. Memperbarui aplikasi di kemudian hari
1. Jalankan backup dulu.
2. Kirim zip baru, ekstrak ke folder sementara, lalu ganti **hanya** `server.js`, `public/`, dan `package.json` di `/home/palapa/palapa` (jangan menimpa `/var/lib/palapa`). Jalankan `npm install --omit=dev` bila `package.json` berubah.
3. `systemctl restart palapa`.

## 9. Alternatif jika belum punya VPS
- **Satu PC kantor sebagai server (jaringan lokal):** pasang Node.js di PC itu, jalankan `npm install` lalu `npm start`, dan admin lain membuka `http://IP-PC:3000` (cek IP dengan `ipconfig`). Izinkan port 3000 di Windows Firewall. **Jangan** set `COOKIE_SECURE=1` karena belum HTTPS. Cocok untuk uji coba, tidak cocok sebagai website umum karena bergantung pada PC yang harus menyala terus.
- **Layanan PaaS (Railway, Render, Fly.io, dan sejenisnya):** harus memakai *persistent volume/disk* yang dipasang ke folder `DATA_DIR`. Tanpa itu, database dan foto hilang setiap kali aplikasi di-deploy ulang.

## 10. Troubleshooting
| Masalah | Penyebab dan solusi |
|---|---|
| 502 Bad Gateway | Aplikasi mati. Cek `systemctl status palapa` dan `journalctl -u palapa -n 50` |
| Login selalu gagal setelah `COOKIE_SECURE=1` | Situs diakses lewat `http`. Pakai HTTPS atau hapus pengaturan itu (hanya untuk uji lokal) |
| Upload foto gagal (413) | Tambahkan `client_max_body_size 6m;` di Nginx |
| Semua admin lupa password | `systemctl stop palapa`, jalankan `sqlite3 /var/lib/palapa/palapa.db "DELETE FROM users;"` (perlu `apt install sqlite3`), isi `ADMIN_USER` dan `ADMIN_PASS` di `/etc/palapa.env`, lalu `systemctl start palapa` |
| Data tidak muncul di website | Login admin, buka Dashboard, klik **Isi data awal** |

## 11. Hal yang perlu diketahui
- **SQLite** cocok untuk satu server dengan beberapa admin dan ratusan pengunjung per hari. Bila nanti ada banyak server atau beban sangat besar, perlu pindah ke PostgreSQL/MySQL (butuh perubahan kode).
- Halaman website dimuat lewat JavaScript dengan alamat berbentuk `/#/blogs`. Mesin pencari seperti Google kurang optimal membaca model ini dibanding WordPress. Jika SEO penting, sebaiknya halaman publik dibuat dirender di server.
- Mengarahkan domain ke server baru akan **menggantikan** website WordPress lama. Simpan backup website lama sebelum pindah.
