# Menjalankan dan Meng-hosting di Windows

Aplikasi ini berjalan di Windows maupun Linux, karena dibuat dengan Node.js dan SQLite. Konsepnya sama dengan PANDUAN-INSTALASI.md: **satu server, satu database**, dan semua admin cukup memakai browser. Yang berbeda hanya perintah dan alat bantunya.

## Pilih skenario
| Skenario | Cocok untuk | Catatan |
|---|---|---|
| **A. Windows VPS / Windows Server** (akses lewat Remote Desktop) | Website umum, diakses semua orang | Lisensi Windows membuat sewa lebih mahal dan butuh RAM lebih besar (disarankan minimal 2 GB) |
| **B. PC/laptop Windows di kantor** | Uji coba, atau dashboard internal di jaringan kantor | PC harus menyala terus; kurang cocok untuk website umum |

## Langkah umum (skenario A dan B)
1. Pasang **Node.js LTS** dari https://nodejs.org (pilih installer Windows .msi, centang pilihan default).
2. Ekstrak `palapa-website.zip` ke `C:\palapa`.
3. Buka PowerShell:
   ```powershell
   cd C:\palapa
   npm install --omit=dev
   mkdir C:\palapa-data
   copy C:\palapa\data\palapa.db C:\palapa-data\
   ```
4. Uji jalan sekali (PowerShell memakai `$env:`, bukan `NAMA=nilai`):
   ```powershell
   $env:DATA_DIR="C:\palapa-data"
   $env:ADMIN_USER="admin"
   $env:ADMIN_PASS="GantiDenganPasswordKuat123"
   npm start
   ```
   Buka http://localhost:3000 lalu login di `/#/login`. Hentikan dengan Ctrl+C.

## Skenario B: dipakai di jaringan kantor
- Cari IP PC: `ipconfig` (lihat IPv4, misalnya 192.168.1.20).
- Izinkan port 3000 di Windows Firewall:
  `New-NetFirewallRule -DisplayName "Palapa" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow`
- Admin lain membuka `http://192.168.1.20:3000` dari browser masing-masing.
- Jangan set `COOKIE_SECURE=1` (belum HTTPS) dan jangan set `HOST` (agar bisa diakses dari PC lain).
- Agar jalan otomatis saat PC menyala, pakai NSSM seperti di bawah.

## Skenario A: Windows VPS untuk website umum
**1. Jalankan aplikasi sebagai layanan Windows (NSSM).**
Unduh NSSM dari https://nssm.cc, ekstrak, lalu di PowerShell (Run as Administrator):
```powershell
nssm install PalapaDentists "C:\Program Files\nodejs\node.exe" server.js
nssm set PalapaDentists AppDirectory C:\palapa
nssm set PalapaDentists AppEnvironmentExtra PORT=3000 HOST=127.0.0.1 DATA_DIR=C:\palapa-data COOKIE_SECURE=1 ADMIN_USER=admin ADMIN_PASS=GantiDenganPasswordKuat123
nssm set PalapaDentists Start SERVICE_AUTO_START
nssm start PalapaDentists
```
(Atau jalankan `nssm edit PalapaDentists` dan isi tab Environment lewat jendela.) Setelah login pertama, buka `nssm edit PalapaDentists`, hapus `ADMIN_USER` dan `ADMIN_PASS`, lalu `nssm restart PalapaDentists`.

**2. HTTPS dan domain memakai Caddy** (paling mudah, sertifikat gratis dan otomatis):
- Buat A record DNS (`@` dan `www`) ke IP VPS.
- Buka port 80 dan 443:
  `New-NetFirewallRule -DisplayName "Web" -Direction Inbound -Protocol TCP -LocalPort 80,443 -Action Allow`
  (dan pastikan juga di firewall/panel penyedia VPS).
- Unduh Caddy untuk Windows dari https://caddyserver.com/download, simpan sebagai `C:\caddy\caddy.exe`, dan salin `deploy\windows\Caddyfile` ke `C:\caddy\Caddyfile` (ganti nama domain).
- Jadikan layanan:
  ```powershell
  nssm install Caddy C:\caddy\caddy.exe "run --config C:\caddy\Caddyfile"
  nssm set Caddy Start SERVICE_AUTO_START
  nssm start Caddy
  ```
- Buka `https://domain-anda`. (Alternatif: IIS dengan URL Rewrite + ARR dan win-acme, tetapi pengaturannya lebih panjang.)

## Backup di Windows
Sesuaikan lokasi di `deploy\windows\backup.bat`, lalu jadwalkan harian jam 02.00:
```powershell
schtasks /create /tn "Palapa Backup" /tr "C:\palapa\deploy\windows\backup.bat" /sc daily /st 02:00
```
Salin folder backup juga ke tempat lain (flash disk, komputer lain, atau cloud).
Memulihkan: `nssm stop PalapaDentists`, ganti `C:\palapa-data\palapa.db` dengan file backup (dan salin isi folder `uploads-TANGGAL` ke `C:\palapa-data\uploads`), lalu `nssm start PalapaDentists`.

## Hal khusus Windows
- Windows Update bisa me-restart server. Karena layanan diatur `SERVICE_AUTO_START`, aplikasi hidup lagi sendiri, tetapi atur jam aktif Update agar tidak mengganggu jam praktik.
- Antivirus kadang memblokir Node atau Caddy. Jika situs tidak bisa diakses, periksa pengecualian antivirus dan firewall.
- Jangan simpan `palapa.db` di OneDrive/Dropbox/folder jaringan.
- Lupa password semua admin: hentikan layanan, hapus semua baris tabel `users` (pakai DB Browser for SQLite dari https://sqlitebrowser.org), set `ADMIN_USER` dan `ADMIN_PASS` lagi, lalu jalankan layanan.

## Backup lengkap di Windows
Unduh dari dashboard (menu Backup & Pulihkan → Backup lengkap .zip). Memulihkan: hentikan layanan (`nssm stop PalapaDentists`), lalu
```powershell
cd C:\palapa
$env:DATA_DIR="C:\palapa-data"
node deploy\restore-full.js C:\Users\Anda\Downloads\palapa-backup-lengkap-TANGGAL.zip
```
lalu `nssm start PalapaDentists`.
