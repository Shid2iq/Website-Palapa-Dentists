// Data awal FAQ, Katalog, dan Angka Beranda: dimasukkan ke database SATU KALI saat server pertama dijalankan
// (supaya halaman /faq, pengetahuan Asisten AI, dan admin langsung memakai data yang sama). Setelah itu sepenuhnya diatur admin.
const FAQ = [
 [
  "Jam berapa klinik buka?",
  "Jam praktek kami: Senin–Jumat {jam_senin_jumat}, Sabtu–Minggu {jam_sabtu_minggu}. Jadwal tiap dokter dapat dilihat di halaman Timetable.",
  "Umum"
 ],
 [
  "Di mana lokasi klinik?",
  "{alamat}. Petunjuk arah dalam bentuk video tersedia di halaman Contact.",
  "Umum"
 ],
 [
  "Bagaimana cara membuat janji?",
  "Ada tiga cara: isi formulir janji temu di halaman Contact, chat dengan kami lewat tombol chat di pojok kanan bawah, atau hubungi pendaftaran di telepon {telepon} / WhatsApp {whatsapp1} atau {whatsapp2}.",
  "Janji & Pendaftaran"
 ],
 [
  "Apakah klinik menerima asuransi?",
  "Kami bekerja sama dengan beberapa asuransi; daftarnya ada di halaman Insurances. Untuk memastikan polis dan jenis penjaminan Anda berlaku, silakan konfirmasi ke pendaftaran sebelum datang.",
  "Biaya & Asuransi"
 ],
 [
  "Berapa biaya perawatannya?",
  "Biaya bergantung pada kondisi gigi dan hasil pemeriksaan dokter, sehingga tidak bisa dipastikan lewat chat. Pendaftaran dapat membantu memberi gambaran awal.",
  "Biaya & Asuransi"
 ],
 [
  "Seberapa sering saya harus kontrol?",
  "Umumnya kontrol gigi rutin dianjurkan setiap 6 bulan, atau sesuai anjuran dokter Anda. Pasien lama dapat mengecek jadwal kontrol sendiri di {link_kontrol} dengan kode rekam medis dan tanggal lahir.",
  "Kontrol & Pasca perawatan"
 ],
 [
  "Apakah ada dokter gigi untuk anak?",
  "Ada. Lihat departemen Perawatan Gigi Anak / Pedodontic di halaman Our Dentists dan Timetable. Kami berusaha membuat suasana nyaman dan ramah anak.",
  "Anak"
 ],
 [
  "Apa yang perlu dibawa saat pertama kali datang?",
  "Bawa identitas diri dan kartu asuransi bila menggunakan asuransi. Sampaikan juga riwayat alergi, penyakit yang sedang diderita, dan obat yang rutin dikonsumsi agar dokter dapat merawat dengan aman.",
  "Janji & Pendaftaran"
 ],
 [
  "Saya takut ke dokter gigi, apakah bisa dibantu?",
  "Tentu. Sampaikan rasa takut Anda kepada dokter atau petugas sebelum perawatan. Klinik kami berusaha menghadirkan suasana homey dan tenang, dan dokter akan menjelaskan setiap langkah sebelum dimulai.",
  "Umum"
 ]
];
const STATS = [["40+", "Tahun melayani keluarga Indonesia"], ["40", "Dokter gigi dan spesialis"], ["7", "Bidang spesialisasi dalam satu klinik"], ["Terbaik", "Lulusan universitas terbaik di Indonesia"]];
const CAT = [
 [
  "Pemeriksaan dan Konsultasi Gigi",
  "Perawatan Gigi Umum",
  "Pemeriksaan kondisi gigi dan mulut, penjelasan hasil, dan rencana perawatan yang sesuai kebutuhan Anda."
 ],
 [
  "Pembersihan Karang Gigi (Scaling)",
  "Periodontic",
  "Membersihkan karang gigi dan plak untuk menjaga kesehatan gusi dan mencegah gigi goyang."
 ],
 [
  "Tambal Gigi",
  "Endodontic",
  "Menutup gigi berlubang dengan bahan tambalan agar gigi dapat berfungsi kembali."
 ],
 [
  "Perawatan Saluran Akar",
  "Endodontic",
  "Perawatan untuk mempertahankan gigi yang jaringan saraf di dalamnya terinfeksi atau rusak."
 ],
 [
  "Pemasangan Behel (Ortodonti)",
  "Orthodontic",
  "Merapikan susunan gigi dan memperbaiki gigitan dengan perawatan ortodonti yang direncanakan dokter spesialis."
 ],
 [
  "Cabut Gigi dan Tindakan Bedah Mulut",
  "Oral Surgery",
  "Tindakan pencabutan gigi dan bedah ringan di area mulut oleh dokter bedah mulut."
 ],
 [
  "Gigi Tiruan",
  "Prosthodontic",
  "Penggantian gigi yang hilang dengan gigi tiruan agar fungsi kunyah dan penampilan kembali baik."
 ],
 [
  "Perawatan Gigi Anak",
  "Pedodontic",
  "Pemeriksaan dan perawatan gigi untuk anak dengan pendekatan yang ramah dan menenangkan."
 ]
];
const DEPTX = {"Endodontic": {"tag": "Spesialisasi Kedokteran Gigi yang menangani perawatan saraf dan saluran akar gigi secara mendalam", "about": "Merupakan sebuah cabang ilmu kedokteran gigi yang bertujuan untuk mempertahankan gigi selama mungkin di dalam mulut. Layanan dari bidang spesialis ini melingkupi penambalan pada gigi berlubang, restorasi mahkota, onlay, dan inlay, serta perawatan saluran akar gigi yang terlalu dalam hingga mencapai daerah saraf gigi. Perawatan saluran akar gigi/rawat saraf gigi ini dapat dilakukan dalam sekali kunjungan atau beberapa kali kunjungan. Seringkali perawatan yang dilakukan memerlukan perawatan ulang di kemudian hari.\n\nOleh karena itu diperlukan seorang ahli konservasi gigi yang lebih berhati-hati dalam menangani kasus-kasus infeksi gigi. Dokter gigi bergelar Sp.KG ini juga dibekali keterampilan untuk pemutihan gigi dari dalam mahkota (intra corona) dan dari luar mahkota (ekstra corona). Gigi yang sudah mengalami kematian pada sarafnya biasanya mengalami perubahan warna menjadi lebih gelap, kasus ini dapat diatasi dengan pemutihan intra corona.", "notet": "", "note": "", "treat": "Perawatan Saluran Akar (PSA) Gigi\nPenambalan\nCrown\nScaling\nVeneer\nBleaching Intra Corona\nPemasangan Pin\nDesentisisasi Dentin\nInsisi Abses"}, "Orthodontic": {"tag": "Spesialisasi Kedokteran Gigi yang menangani pemasangan kawat gigi untuk meratakan posisi gigi", "about": "Merupakan sebuah cabang ilmu kedokteran gigi yang mempelajari perawatan ketidakharmonisan gigi. Spesialis ini fokus dalam memperbaiki posisi gigi yang tidak teratur agar fungsi kunyah berfungsi dengan benar dan struktur wajah terlihat seimbang.\n\nOleh karena itu diperlukan seseorang yang ahli dalam bidang Ortodonti dalam menangani masalah tersebut. Dokter yang dapat menangani kasus tersebut adalah dokter gigi spesialis Orthodontic, yang bergelar Sp. Ort.\n\nDalam kasus tersebut, spesialis ini mengarahkan pemasangan kabel gigi atau yang sering disebut behel untuk meratakan gigi. Namun sebelum pemasangan, akan dilakukan konsultasi terlebih dahulu terkait kondisi gigi pasien, cara mendapatkan posisi gigi yang ideal, dan lama perawatan yang disesuaikan dengan kondisi gigi pasien hingga mendapatkan posisi gigi yang teratur atau ideal. Rata-rata lama perawatan yang dilakukan membutuhkan waktu bulanan hingga tahunan, tergantung dari parah atau tidaknya susunan gigi yang akan dirapihkan.", "notet": "Di Palapa Dentists", "note": "Palapa Dentists menyediakan beberapa jenis kawat gigi yang dapat dipilih oleh pasien, yaitu kawat gigi konvensional (menggunakan karet), invisalign/aligners (mengikuti bentuk gigi), dan Damon Clear.", "treat": "Pemasangan Kawat Gigi/Brackets\nRetainer\nOrtho Lepasan"}, "Oral Surgery": {"tag": "Spesialisasi Kedokteran Gigi yang khusus menangani pembedahan di area oral (mulut) dan rahang", "about": "Merupakan spesialisasi bedah dalam kedokteran gigi yang dilakukan pada area mulut (oral) dan rahang bawah.\n\nSpesialis ini fokus pada masalah-masalah seperti impaksi gigi (gigi yang tumbuh miring), implan gigi, masalah sendi rahang (pertumbuhan rahang yang tidak merata), patah tulang pada area wajah atau rahang bawah yang menyebabkan gangguan pada fungsi mulut, dan bibir sumbing.\n\nTindakan pembedahan pada area mulut haruslah dilakukan oleh seorang dokter gigi spesialis bedah mulut yang bergelar Sp. BM.", "notet": "Di Palapa Dentists", "note": "Pembedahan yang dilakukan memiliki prosedur tertentu dalam praktiknya. Di Dokter Gigi Palapa, pasien akan diarahkan untuk berkonsultasi terlebih dahulu dengan Dokter Umum (Dokter Gigi Umum). Konsultasi ini bertujuan untuk melihat seberapa parah masalah kondisi mulut (oral) pasien. Jika diperlukan melakukan pembedahan, pasien akan dirujuk ke spesialis Bedah Mulut untuk melanjutkan perawatannya.", "treat": "Odontectomy\nEkstrasi Komplikasi\nPencabutan Gigi\nFlap Operation\nBonegraf\nApexreseksi\nFrenulectomy\nAlveolectomy\nEksisi (Pengangkatan Mucocele)\nImplan Gigi"}, "Prosthodontic": {"tag": "Spesialisasi Kedokteran Gigi yang menangani pemasangan gigi palsu pada area gigi yang tanggal", "about": "Merupakan cabang ilmu kedokteran gigi yang fokus pada perawatan gangguan gigi yang parah, seperti gigi yang lepas, karies gigi, gigi retak atau patah. Tujuan dari spesialis Prostodonsia seringkali dikaitkan dengan kecantikan, karena selain untuk memperbaiki fungsi kunyah dan bicara, juga memperbaiki estetika mulut dalam hal penampilan.\n\nLayanan dari spesialis ini adalah pemasangan gigi palsu (lepas-pasang) pada bagian gigi yang telah tanggal, crown, bridge, inlay, onlay, tambalan gigi, serta protesis gigi. Pemasangan gigi palsu hanya dapat dilakukan oleh dokter gigi spesialis Prosthodontic yang bergelar Sp. Pros.", "notet": "Di Palapa Dentists", "note": "Tipe gigi palsu yang disediakan di Palapa Dentists cukup beragam, yaitu tipe akrilik, tipe falplast (lentur), dan tipe GTSKL (Gigi Tiruan Sementara Kerangka Logam). Penggantian gigi palsu bersifat tahunan, tergantung pada pemakaian gigi palsu sebelumnya.", "treat": "Pemasangan Gigi Palsu (Falplast, Akrilik, Gigi Tiruan Sementara Kerangka Logam)\nImplan Gigi\nCrown\nBridge\nPemasangan Pin"}, "Periodontic": {"tag": "Spesialisasi Kedokteran Gigi yang menangani permasalahan jaringan penyangga gigi", "about": "Merupakan spesialisasi kedokteran gigi yang menangani masalah jaringan penyangga gigi seperti gusi, tulang, dan struktur lain terkait gigi. Periodontik menangani masalah gigi terkait penyakit gusi yang sangat parah, seperti gusi berdarah, bau mulut, gigi yang berpindah, gigi yang goyang karena karang gigi yang terlalu dalam atau berada di bawah gusi. Dokter gigi yang mengambil spesialisasi ini disebut Periodontis atau dokter gigi bergelar Sp. Perio.\n\nLayanan dari spesialis ini berupa pembersihan secara menyeluruh pada jaringan penyangga gigi, seperti gingivektomi (membuang jaringan gusi yang sakit), couterisasi (memotong gusi menggunakan alat), dan ablasi (menghilangkan warna kehitaman pada gusi akibat rokok). Pembersihan ini dilakukan untuk menghindari berkembangnya bakteri dan rusaknya struktur gigi di dalam mulut.", "notet": "Di Palapa Dentists", "note": "Di Palapa Dentists, pasien bisa langsung menemui Spesialis Periodontik atau menunggu referensi dari Spesialis Konservasi Gigi terkait masalah jaringan penyangga gigi yang dialami.", "treat": "Pemasangan Pin\nGingivektomi\nSplinting\nBonegraf\nFlap Operation\nFlap Gingiva\nCrown Lengthening\nAblasi\nScaling\nPenambalan"}, "Pedodontic": {"tag": "Spesialisasi Kedokteran Gigi yang khusus menangani segala permasalahan gigi pada anak-anak", "about": "Merupakan cabang ilmu kedokteran gigi yang khusus melakukan perawatan gigi pada pasien anak-anak di bawah umur 15 tahun. Di Palapa Dokter Gigi, rata-rata usia pasien anak-anak yang melakukan perawatan berada pada usia dua sampai dua belas tahun. Dokter gigi yang khusus menangani pasien anak-anak biasa disebut sebagai Dokter Spesialis Kedokteran Gigi Anak bergelar Sp. KGA.\n\nDokter gigi anak memegang peranan penting dalam menangani pertumbuhan gigi pada anak, seperti memadukan pertumbuhan gigi susu pada anak agar pertumbuhan gigi permanen berjalan lancar serta mengajarkan cara menjaga kesehatan mulut yang benar.\n\nDokter gigi anak fokus pada perawatan gigi berlubang, gigi susu yang tanggal, dan gigi susu yang memerlukan perawatan saluran akar. Pada kasus gigi berlubang, perawatan hanya dilakukan dalam satu kali kunjungan, sedangkan kasus gigi yang memerlukan perawatan saluran akar membutuhkan perawatan secara berkala.", "notet": "", "note": "", "treat": "Perawatan Saluran Akar (PSA) Gigi Susu\nCabut Gigi Susu\nMetal Crown\nCelluloid Crown\nSpace Maintainer\nScaling\nPenambalan\nOrtho Lepasan"}, "_umum": {"tag": "Spesialisasi Kedokteran Gigi yang menangani pemeriksaan gigi secara general pada anak-anak dan dewasa", "about": "General Practicioner Dentists atau yang sering disebut Dokter Gigi Umum merupakan seseorang yang telah menyelesaikan pendidikan dokter gigi selama kurang lebih lima tahun. Dokter Gigi Umum akan memberikan diagnosa, pemeriksaan, dan pengobatan gigi, mulut, dan rahang bawah secara umum.", "notet": "Di Palapa Dentists", "note": "Di Palapa Dentists, pada umumnya, pasien akan diarahkan ke dokter gigi umum terlebih dahulu, jika dokter gigi umum menemukan masalah gigi yang memerlukan tindakan lebih lanjut, maka pasien akan dirujuk ke spesialis yang tersedia.", "treat": "Konsultasi\nScaling\nPenambalan\nBleaching"}};
module.exports = async function (db) {
  const has = async (t, c) => !!(await t.get('SELECT 1 FROM docs WHERE col=? LIMIT 1', [c]));
  const done = async (t, id) => !!(await t.get("SELECT 1 FROM docs WHERE col='meta' AND id=?", [id]));
  const mark = (t, id) => t.run("INSERT INTO docs(col,id,data) VALUES('meta',?,?) ON DUPLICATE KEY UPDATE data=?", [id, '{"done":true}', '{"done":true}']);
  const put = (t, c, id, o) => t.run('INSERT IGNORE INTO docs(col,id,data) VALUES(?,?,?)', [c, id, JSON.stringify(o)]);
  try {
    await db.transaction(async t => {
      if (!(await done(t, 'seed_faq'))) { if (!(await has(t, 'faq'))) for (let i = 0; i < FAQ.length; i++) await put(t, 'faq', 's' + (i + 1), { q: FAQ[i][0], a: FAQ[i][1], cat: FAQ[i][2], status: 'Tampil', ord: String(i + 1) }); await mark(t, 'seed_faq'); }
      if (!(await done(t, 'seed_stats'))) { if (!(await has(t, 'stats'))) for (let i = 0; i < STATS.length; i++) await put(t, 'stats', 's' + (i + 1), { num: STATS[i][0], label: STATS[i][1], ord: String(i + 1) }); await mark(t, 'seed_stats'); }
      if (!(await done(t, 'seed_catalog'))) {
        if (!(await has(t, 'catalog'))) {
          const deps = (await t.all("SELECT data FROM docs WHERE col='departments'")).map(r => JSON.parse(r.data).name || '');
          const dn = k => deps.find(n => n.indexOf(k) >= 0) || '';
          for (let i = 0; i < CAT.length; i++) await put(t, 'catalog', 's' + (i + 1), { title: CAT[i][0], dept: dn(CAT[i][1]), desc: CAT[i][2], price: '', status: 'Tampil', ord: String(i + 1) });
        }
        await mark(t, 'seed_catalog');
      }
    });
    // Isi halaman Departments (tentang layanan, tindakan tersedia): hanya mengisi departemen yang kolomnya masih kosong, satu kali
    await db.transaction(async t => {
      if (await done(t, 'seed_dept_content')) return;
      for (const r of await t.all("SELECT id,data FROM docs WHERE col='departments'")) {
        const d = JSON.parse(r.data); if (d.about !== undefined || d.treat !== undefined) continue;
        const n = String(d.name || ''); let f = null;
        for (const k of Object.keys(DEPTX)) if (k !== '_umum' && n.indexOf(k) >= 0) { f = DEPTX[k]; break; }
        if (!f && (n.indexOf('Umum') >= 0 || n.indexOf('General') >= 0)) f = DEPTX._umum;
        if (f) await t.run('UPDATE docs SET data=? WHERE col=? AND id=?', [JSON.stringify(Object.assign(d, f)), 'departments', r.id]);
      }
      await mark(t, 'seed_dept_content');
    });
  } catch (e) { console.warn('Data awal FAQ/Katalog dilewati:', e.message); }
};
