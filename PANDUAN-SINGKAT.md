# Panduan Singkat: Website Terpublish dan Admin Mengolah Isi

## Jawaban untuk pertanyaan Anda
- **Apakah database tetap dipakai bersama jika memakai domain yang sudah ada?** Ya. Database ada di server tempat website dipasang, bukan di domain atau di PC admin. Semua admin membuka website yang sama, jadi otomatis memakai database yang sama. Perubahan satu admin langsung dilihat admin lain.
- **Linux atau Windows?** Pilih **Linux (Ubuntu)** untuk server. Hanya ini yang saya sediakan pemasangan otomatis satu perintah. Windows tetap bisa (lihat PANDUAN-WINDOWS.md), tetapi langkahnya lebih panjang. PC admin boleh Windows, Mac, atau HP: mereka hanya memakai browser dan tidak menginstal apa pun.

## Gambaran sederhana
```
Admin 1, Admin 2, Admin 3  ──(browser)──►  https://domainanda.com  ──►  1 SERVER  ──►  1 DATABASE
Pengunjung umum            ──(browser)──►  https://domainanda.com
```

## Yang disiapkan
1. **Server VPS baru** dengan Ubuntu 24.04 (atau 22.04), minimal 1 GB RAM. Setelah sewa, Anda mendapat **alamat IP** dan **password root** dari penyedia VPS. Server harus baru dan kosong, bukan hosting WordPress biasa.
2. **Domain yang sudah ada** dan akses ke pengaturan DNS-nya.
3. File **palapa-website.zip**.

## Langkah 1: Arahkan domain ke server
Di pengaturan DNS domain Anda, ubah **A record** untuk `@` dan `www` menjadi IP server baru.
- **Jangan ubah** record MX (email) atau record lain. Email domain tetap aman.
- Disarankan uji dulu memakai subdomain, misalnya `baru.palapadentists.com` (A record `baru` ke IP server). Website lama tetap hidup selama Anda menguji.

## Langkah 2: Kirim zip ke server dan pasang dengan satu perintah
Buka **PowerShell** (Windows 10/11) atau Terminal (Mac/Linux) di komputer Anda:

```
scp palapa-website.zip root@IP_SERVER:/root/
ssh root@IP_SERVER
```

Setelah masuk ke server, jalankan:

```
apt-get update && apt-get install -y unzip
unzip palapa-website.zip
cd palapa
bash deploy/install.sh palapadentists.com emailanda@gmail.com www
```

Ganti `palapadentists.com` dengan domain Anda dan email dengan email Anda (dipakai untuk sertifikat HTTPS). Tambahkan kata `www` di akhir hanya jika www juga sudah diarahkan ke server. Untuk subdomain, tulis tanpa `www`.

Skrip akan menanyakan **username dan password admin pertama**, lalu memasang semuanya sendiri: Node.js, web server, HTTPS (gembok), firewall, dan backup harian. Prosesnya beberapa menit.

## Langkah 3: Isi website
1. Buka `https://domainanda.com/#/login` dan masuk.
2. Di Dashboard, klik **Isi data awal** (sekali saja).
3. Ubah isi sesuai klinik Anda (lihat tabel di bawah).
4. Di menu **Akun**, tambahkan akun untuk admin lain, satu akun per orang.

## Admin mengolah apa
| Menu dashboard | Yang diubah |
|---|---|
| Pengaturan Website | Logo, teks Home dan About Us, foto, kontak, jam kerja, footer, Facebook/Instagram |
| Artikel | Blog dengan foto sampul dan hingga 5 bagian |
| Dokter | Foto dan data dokter |
| Jadwal Praktek | Jadwal dokter per hari dan jam |
| Layanan, Keunggulan, Poin, Sejarah, Asuransi | Isi bagian yang sama di website |
| Janji | Permintaan janji dari pengunjung |
| Akun | Tambah, reset, hapus admin |

## Setelah berjalan
- **Backup:** otomatis tiap hari jam 02.00 ke `/var/backups/palapa`. Salin juga ke tempat lain secara berkala.
- **Memperbarui aplikasi:** kirim zip baru (tanpa folder `data`), ekstrak, lalu jalankan lagi `bash deploy/install.sh ...` dengan perintah yang sama. Data tidak terhapus.
- **Lupa password semua admin:** di server jalankan
  `cd /home/palapa/palapa && DATA_DIR=/var/lib/palapa ADMIN_USER=admin ADMIN_PASS=passwordbaru123 node deploy/create-admin.js`
- **Masalah:** `journalctl -u palapa -n 50` menampilkan catatan aplikasi.

## Hal yang perlu diketahui
- **Isi website WordPress lama tidak pindah otomatis.** Artikel, foto, dan data dokter harus dimasukkan lewat dashboard.
- Setelah A record diarahkan ke server baru, website WordPress lama **tidak tampil lagi** di domain itu. Simpan backup-nya.
- Halaman website dimuat lewat JavaScript (alamat berbentuk `/#/blogs`), sehingga untuk SEO Google kurang optimal dibanding WordPress.
- Dua admin yang menyunting item yang sama bersamaan: yang menyimpan terakhir yang berlaku.

## SEO dan pencarian Google (Pengaturan Website → "SEO dan Pencarian Google")
- **Judul dan deskripsi** halaman utama diisi di sana. Server menyisipkannya langsung ke HTML, jadi terbaca Google dan pratinjau link WhatsApp/Facebook tanpa menjalankan JavaScript.
- Agar link kanonik dan gambar pratinjau memakai alamat yang benar, pastikan `/etc/palapa.env` berisi `SITE_URL=https://domainanda.com` (installer sudah menambahkannya). Setelah menambah baris ini: `systemctl restart palapa`.
- Setelah website online, daftarkan domain di **Google Search Console** agar hasil pencarian cepat diperbarui.
- Meta keywords tidak dipakai Google untuk peringkat. Yang paling berpengaruh: judul, deskripsi, dan isi halaman yang memuat keyphrase.
- Alamat dengan tanda `#` (mis. `/#/blogs`) dibaca Google sebagai satu halaman, jadi deskripsi per artikel belum tampil sebagai hasil pencarian terpisah.

## Backup dan pulihkan dari dashboard (menu 💾 Backup & Pulihkan)
**1. Backup lengkap (.zip), disarankan.** Berisi seluruh database (konten, akun admin, janji temu, percakapan chat) dan semua foto sebagai file. Ringan: 150 MB foto selesai dalam ±1 detik dengan memori server ±130 MB. Gunakan untuk memindahkan website ke komputer/server lain atau pemulihan total.

Memulihkan (server harus dihentikan dulu):
- Linux: `cd /home/palapa/palapa && DATA_DIR=/var/lib/palapa node deploy/restore-full.js ~/NAMA-FILE.zip`
- Windows (PowerShell): `cd C:\palapa; $env:DATA_DIR="C:\palapa-data"; node deploy\restore-full.js C:\Users\Anda\Downloads\NAMA-FILE.zip`
- Lalu jalankan server lagi.

Skrip ini memeriksa seluruh isi ZIP lebih dulu (kalau ada yang rusak, tidak ada yang diubah; tambahkan `--lanjut` untuk melewati foto yang rusak), menyimpan salinan database lama di `backup-sebelum-pulih/`, lalu mengganti database dan menyalin foto. Foto lain yang sudah ada tidak dihapus. Login lama otomatis tidak berlaku di server tujuan, tetapi akun admin dari backup tetap bisa dipakai.

**2. Backup konten (JSON).** Ringan dan bisa dibuka/diedit dengan editor teks. Berisi konten website (tanpa akun admin dan tanpa percakapan chat). Foto sebaiknya tidak disertakan (foto banyak membuat server kehabisan memori; di atas 40 MB ditolak otomatis).

**3. Pulihkan dari backup konten (JSON).** Mode *Ganti* (bagian yang ada di backup diganti seluruhnya) atau *Gabung* (item ber-ID sama diperbarui, yang lain tetap ada). Bagian yang tidak ada di backup tidak diubah, dan bagian yang belum dikenal dilewati tanpa error. Salinan pengaman dibuat otomatis.

**Memindahkan ke PC lain: jangan hanya menyalin `palapa.db`.** Foto ada di folder `uploads/`, dan perubahan terbaru bisa masih berada di file `palapa.db-wal`. Pakai Backup lengkap (.zip), atau hentikan server lalu salin seluruh folder `data`.

**Chat pendaftaran:** percakapan tersimpan di database (ikut backup lengkap) dan dihapus otomatis setelah 90 hari tidak aktif.

## Menulis artikel
- **Tanggal terbit:** isi kolom **Tanggal terbit** agar sama dengan tanggal di blog lama. Kalau dikosongkan, dipakai tanggal hari ini. Tanggal ini menentukan urutan artikel (terbaru di atas) dan tampil di kartu serta halaman artikel. Tanggal bisa diubah kapan saja lewat Edit.
- **Format teks:** di kolom paragraf pembuka dan isi tiap bagian, awali baris dengan `- ` untuk poin, `1. ` lalu `2. ` untuk nomor, dan bungkus kata dengan `**tebal**`. Arahannya ada di bawah kolom. Daftar bernomor yang dipisah baris kosong tetap melanjutkan nomornya. Isi artikel tampil rata kiri-kanan.
- **Foto sampul:** unggah gambar sebesar mungkin (sampai 2400 px). Pilih tampilan **Terpotong rapi** (posisinya bisa digeser) atau **Utuh sesuai ukuran asli**. Pengunjung bisa klik sampul (dan gambar di dalam artikel) untuk membuka penampil dengan zoom (tombol +/−, scroll, cubit, klik dua kali), geser, dan **layar penuh**.
- **Menuju artikel lain:** kotak **📌 Baca juga** (2 artikel, diacak tetapi diutamakan sekategori) muncul setelah bagian ke-2. Di akhir artikel ada tombol **Artikel sebelumnya / berikutnya**, bagian **Baca artikel lainnya**, dan tombol **Lihat semua artikel**. Draft tidak pernah ditampilkan.

## Peran akun (menu Akun)
Admin membuat akun dan memilih perannya:
- **Admin**: semua menu.
- **Blogger**: hanya menu **Artikel** (dan Akun untuk ganti password sendiri). Form artikel mulai dengan 5 bagian; tombol **+ Tambah bagian** menambah hingga 20 bagian.
- **Pendaftaran**: menu **Chat Pendaftaran**, **Promo** (tambah, edit, hapus, unggah gambar), **Blast & Pengingat**, dan Akun. Template Chatbot, Pengaturan, Dokter, Artikel, Janji temu, dan Backup tetap khusus admin.

Pembatasan dijaga di server, bukan hanya disembunyikan di tampilan. Mengubah peran membuat akun itu harus login ulang. Satu browser hanya menyimpan satu login; untuk dua peran di satu komputer, pakai profil browser atau jendela samaran yang berbeda.

## Pemberitahuan chat (Admin dan Pendaftaran)
Saat pasien mengirim pesan: **popup** muncul di pojok kanan atas, **nada dering** berbunyi (berulang sampai popup ditutup, maksimal ±30 detik), judul tab menjadi "(1) 💬 ...", dan bila tab tidak aktif muncul **notifikasi desktop**. Pemberitahuan dikirim langsung dari server, jadi tetap cepat saat tab di latar belakang. Browser baru mau bersuara setelah ada satu klik di halaman; bila belum, muncul pita kuning "Klik di sini untuk mengaktifkan nada dering". Nada dering bisa dimatikan dan dites lewat kotak kecil di sidebar. Di belakang Nginx, bagian `/api/chats/stream` perlu `proxy_buffering off` (sudah ada di `deploy/nginx-palapa.conf` dan installer).

## Template chatbot (menu 🤖 Template Chatbot, hanya admin)
18 template bisa diedit: sapaan, jawaban jadwal/layanan/asuransi/jam buka/janji/biaya/promo/keluhan, kalimat saat menunggu, catatan awal chat, **balasan otomatis pertama** (opsional), dan **pesan penutup setelah percakapan diakhiri**. Tulis variabel seperti `{nama}`, `{nama_klinik}`, `{jam_kerja}`, `{whatsapp1}`, `{promo_aktif}` (daftar variabel tampil di bawah tiap template). Ada tombol **Pratinjau** dan **Kembalikan bawaan**. Template yang dikosongkan memakai bawaan, kecuali balasan otomatis dan pesan penutup yang menjadi nonaktif.

## Promo, bagikan, dan blast pengingat
- Menu **🎁 Promo**: buat promo (judul, gambar, berlaku sampai, isi pesan). Promo **Aktif** tampil di Home dan halaman Promo, muncul sebagai topik di chatbot, dan bisa dibagikan pasien ke WhatsApp, Facebook, X, Telegram, atau disalin tautannya. Tautan `/promo/ID` menampilkan judul, ringkasan, dan gambar promo di pratinjau WhatsApp/Facebook. Jenis **Pengingat kontrol** tidak tampil di website.
- Menu **📣 Blast & Pengingat** (admin): daftar kontak diambil dari formulir janji temu dan chat (nomor yang sama digabung). Pilih pesan, saring (sumber, "terakhir kontak ≥ N bulan" untuk pengingat kontrol), lalu klik **Kirim WA** per pasien; pesan terisi nama dan tautan, dan dicatat **Terkirim**. Tombol **Berhenti** untuk pasien yang tidak mau menerima info, plus ekspor CSV. Pengiriman massal otomatis memerlukan WhatsApp Business API; di sini tiap pesan dikirim manual lewat WhatsApp Anda.

## Nomor WhatsApp
Isi **WhatsApp 1** dan **WhatsApp 2** di Pengaturan Website. Keduanya tampil di halaman Contact, footer, dan jawaban chatbot sebagai tautan langsung ke WhatsApp.

## File yang berubah pada versi ini
`server.js`, `chat.js`, `public/index.html`, `public/chat-widget.js`, `deploy/create-admin.js` (sekarang bisa membuat akun peran lain: `ADMIN_ROLE=blogger`), `deploy/nginx-palapa.conf`, `deploy/install.sh`. Restart server setelah mengganti file.

## Nomor telepon dan contoh siap pakai
- **Nomor telepon** di Contact, footer, chatbot, dan data Google kini memakai nomor WhatsApp 2 (081281116662). Tiga nomor lama otomatis diganti satu kali saat server dijalankan, hanya bila isinya masih persis nomor lama (nomor yang sudah Anda ubah sendiri tidak disentuh). Mengubahnya lagi: Pengaturan Website → Telepon 1, 2, 3.
- **Template chat:** di menu Template Chatbot, tiap template punya tombol **✨ Contoh ramah** dan **✨ Contoh formal**, plus tombol di atas halaman untuk mengisi semua sekaligus. Contoh hanya mengisi kolom; klik **Simpan semua template** untuk menerapkannya.
- **Promo dan blast:** di menu Promo (dan di halaman Blast bila masih kosong) ada tombol **Muat contoh promo** (4 promo) dan **Muat contoh pesan blast & pengingat** (5 pesan: kontrol 6 bulan, follow-up setelah tindakan, pengingat jadwal, minta ulasan, ajakan kembali). Semua contoh berstatus **Draft** dan berjudul "CONTOH –"; angka seperti XX% dan [tanggal] harus Anda sesuaikan dulu. Klik tombolnya lagi tidak menggandakan contoh.

## Tawaran promo di chat (menu Promo)
Chatbot dan chat pendaftaran bisa menawarkan promo yang cocok dengan kata pasien, tidak hanya di akhir sesi.
- Di form promo ada tiga kolom: **Tawarkan promo ini di chat** (Ya/Tidak), **Kata kunci pemicu** (pisahkan koma, mis. `karang gigi, scaling, gigi kuning`), dan **Kalimat tawaran** (opsional; kosong = diambil dari isi pesan). Hanya promo berstatus **Aktif**, jenis **Promo**, dan belum kedaluwarsa yang ditawarkan.
- Saat kata pasien cocok, muncul **kartu tawaran** di chat dengan tombol **Lihat promo**, **Saya tertarik**, dan **Tidak, terima kasih**. Menekan "Saya tertarik" mengirim pesan ke petugas ("Saya tertarik dengan promo: ..."), jadi petugas langsung tahu apa yang diminati. Kalau pasien masih bicara dengan bot, formulir hubungkan ke pendaftaran terbuka dengan pesan itu sudah terisi.
- Aturan: maksimal **2 tawaran per sesi**, promo yang sama tidak diulang, dan **keluhan gawat darurat** (bengkak, demam, berdarah, nyeri hebat, dst) tidak pernah diberi tawaran; bot menyarankan IGD. Jangan memakai kata gawat seperti "berdarah" sebagai kata kunci.
- Saat pasien menunggu petugas dan belum ada tawaran lain, muncul satu **tawaran umum** ("Sambil menunggu...") sekitar 7 detik setelah chat dimulai.
- Kata-katanya diatur di menu **Template Chatbot** (4 template baru: tawaran sesuai keluhan, tawaran umum, pesan "Saya tertarik", balasan bot). Mengosongkan templat tawaran sesuai keluhan atau tawaran umum menonaktifkannya.
- Di halaman daftar Promo ada kotak **🧪 Uji tawaran promo**: ketik kalimat pasien untuk melihat promo mana yang akan muncul dan bagaimana kartunya.
- Menambah dan mengedit promo: tombol **Tambah** dan **Edit** di menu Promo (admin). Contoh promo bawaan kini sudah berisi kata kunci.

## Petugas mengirim promo manual di chat
Di balasan Chat Pendaftaran (admin dan pendaftaran) ada tombol **🎁 Promo** di samping Kirim.
- **Saran otomatis:** bila kata pasien cocok dengan kata kunci sebuah promo, muncul pita hijau "💡 Promo yang cocok dengan percakapan" dengan tombol **Kirim kartu**. Pita tidak muncul untuk keluhan gawat darurat dan untuk promo yang sudah dikirim.
- **Tombol 🎁 Promo** membuka daftar semua promo yang aktif (yang cocok diberi tanda 💡 dan diurutkan paling atas). Pilih **🎁 Kirim kartu** (pasien menerima kartu dengan tombol Lihat promo, Saya tertarik, Tidak, terima kasih) atau **✏️ Isi ke balasan** (teks promo dan tautan dimasukkan ke kolom balasan untuk Anda edit lalu kirim sebagai teks biasa).
- Bila pasien menekan **Saya tertarik**, pesan "Saya tertarik dengan promo: ..." langsung masuk ke chat. Kartu yang sudah dijawab pasien tetap tersimpan walau halaman dimuat ulang. Kartu dari petugas menggantikan tawaran otomatis untuk promo yang sama, jadi pasien tidak melihat dua kartu.
- Kata-kata kartu petugas diatur di Template Chatbot ("Kartu promo yang dikirim petugas").

## Kalau tawaran promo tidak muncul
1. Buka menu **Promo**, ketik kalimat pasien di kotak **🧪 Uji tawaran promo**. Kotak ini menampilkan **alasan untuk setiap promo** (masih Draft, jenis Pengingat kontrol, kedaluwarsa, opsi chat = Tidak, kata kunci kosong, atau kata kunci tidak cocok), serta apakah template tawaran aktif dan `chat-widget.js` terbaru sudah terpasang.
2. Pastikan promo: status **Aktif**, jenis **Promo**, "Tawarkan promo ini di chat" = **Ya**, belum kedaluwarsa, dan **kata kunci** cocok dengan kata pasien (pencocokan dari awal kata; `periksa gigi` cocok dengan "mau periksa gigi" dan "periksa giginya").
3. Di sidebar dashboard (dekat nama akun) harus tertulis "Versi 2026-10-12-r4" **tanpa peringatan merah**. Peringatan merah berarti `server.js` atau `chat-widget.js` belum diganti. Setelah mengganti file, restart server dan tekan **Ctrl+F5** di semua tab.
4. Halaman pasien kini mengambil data promo dan template terbaru setiap kali chat dibuka dan setiap pasien mengirim pesan, jadi perubahan admin langsung dipakai tanpa muat ulang. Riwayat "sudah ditawarkan" untuk chat bot hanya di memori halaman (hilang saat dimuat ulang); untuk chat langsung disimpan per percakapan.

## Pasien & Recall (kode rekam medis dan pengingat kontrol)
Menu **🗂️ Pasien & Recall** untuk admin dan Pendaftaran. Tujuannya mengajak pasien kontrol lagi tanpa bergantung pada WhatsApp.
- **Data pasien** (hanya yang perlu): kode RM, nama, telepon, email, tanggal lahir, kunjungan terakhir, jarak kontrol (3 sampai 24 bulan), dan **persetujuan** menerima pengingat. **Jangan menulis catatan medis.** Kode RM harus unik; sistem menolak kode ganda dan menyebut nama pemiliknya.
- **Tambah satu per satu** (tombol **+ Tambah pasien**) atau **⬆ Impor CSV** dari Excel (simpan sebagai CSV). Kolom: kode RM, nama, telepon, email, tanggal lahir, kunjungan terakhir, jarak (bulan); pemisah koma atau titik koma, tanggal 2025-03-20 atau 20/03/2025. Impor tidak mengisi persetujuan; petugas mencatatnya saat pasien setuju. **⬇ Ekspor CSV** mengunduh daftar sesuai filter.
- **Daftar kerja recall:** filter bawaan **Perlu dihubungi** (jadwal kontrol sudah lewat atau ≤30 hari), urut dari yang paling terlambat. Filter lain: Terlambat, Segera, Aman, Tanpa data, Berhenti, Semua, plus pencarian nama, kode RM, telepon, email.
- **Tombol Hubungi:** pilih pesan (pesan standar atau pesan jenis "Pengingat kontrol" dari menu Promo), lalu **📞 Telepon**, **✉️ Email**, atau **💬 WhatsApp**. Email dan WhatsApp hanya aktif bila pasien **sudah setuju** dan punya kontaknya; telepon boleh selama pasien belum meminta berhenti. Setiap klik tercatat ("dihubungi via ..."), lalu catat hasilnya: Akan datang, Tidak diangkat, Menolak, Sudah kontrol, atau Berhenti menerima pengingat.
- **Datang hari ini:** mencatat kunjungan hari ini dan menghitung ulang jadwal kontrol.
- **Hapus pasien:** hanya admin (permintaan penghapusan data).
- **Pasien mengecek sendiri tanpa akun:** halaman **Cek Jadwal Kontrol** (menu footer "Cek Jadwal Kontrol", alamat `/#/kontrol`, juga dijawab chatbot). Pasien mengisi kode RM dan tanggal lahir (jadi tanggal lahir wajib diisi agar pasien bisa memakainya). Yang tampil hanya nama depan, kunjungan terakhir, dan jadwal kontrol; tidak pernah telepon, email, atau nama lengkap. Pengamanan: pesan gagal selalu sama (RM tidak bisa ditebak), 5 kegagalan mengunci kode RM itu selama 1 jam, dan ada batas per alamat IP. Pasien juga bisa menekan **Berhenti menerima pengingat**.
- **Backup:** data pasien ikut di **Backup lengkap (.zip)**. Backup JSON konten website **tidak** memuat data pasien (sengaja, karena sensitif). Simpan file backup di tempat aman.
- **File yang perlu diganti/ditambah:** `server.js`, **`patients.js` (BARU, letakkan di folder yang sama dengan `server.js`)**, `public/index.html`, `public/chat-widget.js`. Restart server setelahnya.
- **Catatan hukum:** data kesehatan tergolong data pribadi yang sensitif. Pastikan klinik memiliki persetujuan pasien dan kebijakan pengelolaan data, dan konsultasikan dengan pihak yang berwenang di klinik.

## Pembaruan besar (Oktober 2026): daftar fitur baru
**File yang diganti atau ditambah** (semua di folder `palapa-website\palapa\`): `server.js`, `chat.js`, `patients.js`, **`ai.js` (BARU)**, **`seeds.js` (BARU)**, `public\index.html`, `public\chat-widget.js`, `deploy\restore-full.js`. Restart server, lalu Ctrl+F5.

- **Beranda:** slogan baru "Dipercaya 40 tahun, dirawat ahlinya.", pita angka (menu Angka Beranda), tim dokter, prestasi, dan perjalanan sejarah. Teks slogan lama yang belum Anda ubah diganti otomatis; teks yang sudah Anda ubah sendiri tidak disentuh.
- **Menu atas:** About Us (Tentang Kami, Sejarah, Prestasi) dan **Lainnya** (Katalog, FAQ, **Cek Kontrol**, Promo). Di ponsel semua ada di menu burger.
- **Sejarah klinik** (menu Sejarah): isi tahun, judul, cerita, dan foto. Urutan otomatis menurut tahun.
- **Prestasi** (menu Prestasi), **Katalog** (menu Katalog; PDF katalog diunggah di Pengaturan Website), **FAQ** (menu FAQ; alamat `/faq` terindeks Google), **Dokter dan Asuransi urut abjad A sampai Z** (gelar tidak dihitung).
- **Departments (tampilan baru)** berupa akordion: tentang layanan, tindakan yang tersedia, **alat dan mesin yang digunakan** (menu Alat & Teknologi), dan **kasus sebelum/sesudah** (menu Kasus Perawatan; hanya tampil bila izin pasien dicentang). Isi tentang layanan dan tindakan diambil dari file desain Anda dan bisa diedit di menu Layanan & Spesialisasi.
- **Timetable (tampilan baru):** pilih hari dan departemen, lencana hijau "Sedang praktik", dan jadwal per dokter lewat tombol di popup dokter.
- **Contact:** tombol Petunjuk arah ke reel Instagram (ubah di Pengaturan Website) dan tombol **Qiscus** (isi tautan kanal Qiscus di Pengaturan; kosong = disembunyikan dari pengunjung).
- **Asisten AI** (menu Asisten AI): chat menjawab pertanyaan klinik dan keluhan secara umum. **Cara mengaktifkan:** buat file `.env` di folder yang sama dengan `server.js` berisi satu baris `ANTHROPIC_API_KEY=kunci-anda` (kunci dari console.anthropic.com), lalu restart server. Kunci hanya di server. Pemakaian dibatasi per hari (diatur di menu Asisten AI); keluhan gawat darurat dijawab baku dengan anjuran ke IGD tanpa memanggil AI. Pesan pasien diproses oleh penyedia AI, jadi pasien diberi tahu bahwa ini AI dan bukan diagnosis. Fitur ini belum diuji dengan kunci asli; uji lewat kotak "Coba tanya" di menu Asisten AI.
- **Gambar UI untuk buku panduan:** `galeri-ui-website.pdf` dan `gambar-ui-website.zip`.
