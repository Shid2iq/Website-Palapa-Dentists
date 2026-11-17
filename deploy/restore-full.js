// Memulihkan BACKUP LENGKAP (.zip dari dashboard) ke MySQL/MariaDB. HENTIKAN SERVER dulu.
//   Linux  : node deploy/restore-full.js ~/palapa-backup-lengkap-....zip
//   Windows: node deploy\\restore-full.js C:\\...\\palapa-backup-lengkap-....zip
// Koneksi MySQL dan DATA_DIR dibaca dari file .env di folder aplikasi.
// Yang dilakukan: memeriksa seluruh isi ZIP (CRC) LEBIH DULU, menyimpan salinan database saat ini di backup-sebelum-pulih/,
// mengganti isi tabel dengan isi backup, lalu menyalin foto ke uploads/. Foto lain yang sudah ada tidak dihapus.
// Tambahkan --lanjut untuk tetap memulihkan dan melewati foto yang rusak (database yang rusak selalu membatalkan pemulihan).
// Backup LAMA (berisi palapa.db dari versi SQLite) tidak dipulihkan langsung: skrip ini mengekstrak palapa.db lalu menunjukkan perintah migrasi.
const fs = require('fs'), path = require('path'), zlib = require('zlib');
try { const ef = path.join(__dirname, '..', '.env'); if (fs.existsSync(ef)) for (const ln of fs.readFileSync(ef, 'utf8').split(/\r?\n/)) { const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/.exec(ln); if (m && !ln.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^([\'"])(.*)\1$/, '$2'); } } catch (e) { /* .env tidak wajib */ }
const db = require('../db');
const file = process.argv[2];
if (!file || !fs.existsSync(file)) { console.error('Pemakaian: node deploy/restore-full.js FILE.zip  (file tidak ditemukan)'); process.exit(1); }
const DATA = process.env.DATA_DIR || path.join(__dirname, '..', 'data'), UP = path.join(DATA, 'uploads');
const T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = T[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
const fd = fs.openSync(file, 'r'), size = fs.fstatSync(fd).size;
const rd = (pos, len) => { const b = Buffer.alloc(len); fs.readSync(fd, b, 0, len, pos); return b; };
// cari "end of central directory"
const tail = rd(Math.max(0, size - 66000), Math.min(size, 66000)); let e = -1;
for (let i = tail.length - 22; i >= 0; i--) if (tail.readUInt32LE(i) === 0x06054b50) { e = i; break; }
if (e < 0) { console.error('Bukan file ZIP yang valid (atau rusak).'); process.exit(1); }
const n = tail.readUInt16LE(e + 10), cdSize = tail.readUInt32LE(e + 12), cdOff = tail.readUInt32LE(e + 16);
const cd = rd(cdOff, cdSize), items = []; let p = 0;
for (let i = 0; i < n; i++) {
  if (cd.readUInt32LE(p) !== 0x02014b50) { console.error('Daftar isi ZIP rusak.'); process.exit(1); }
  const method = cd.readUInt16LE(p + 10), crc = cd.readUInt32LE(p + 16), cs = cd.readUInt32LE(p + 20), us = cd.readUInt32LE(p + 24), nl = cd.readUInt16LE(p + 28), el = cd.readUInt16LE(p + 30), cl = cd.readUInt16LE(p + 32), off = cd.readUInt32LE(p + 42);
  items.push({ name: cd.slice(p + 46, p + 46 + nl).toString('utf8').replace(/\\/g, '/'), method, crc, cs, us, off }); p += 46 + nl + el + cl;
}
function extract(it) {
  const h = rd(it.off, 30); if (h.readUInt32LE(0) !== 0x04034b50) throw new Error('header rusak: ' + it.name);
  const data = rd(it.off + 30 + h.readUInt16LE(26) + h.readUInt16LE(28), it.cs);
  const out = it.method === 0 ? data : it.method === 8 ? zlib.inflateRawSync(data) : null;
  if (!out) throw new Error('metode kompresi tidak didukung: ' + it.name);
  if (crc32(out) !== it.crc) throw new Error('CRC tidak cocok (file rusak): ' + it.name);
  return out;
}

const jsonItem = items.find(i => /(^|\/)database\.json$/.test(i.name));
const oldDb = items.find(i => /(^|\/)palapa\.db$/.test(i.name));
if (!jsonItem && oldDb) {
  fs.mkdirSync(DATA, { recursive: true });
  const out = path.join(DATA, 'palapa-dari-backup.db');
  try { fs.writeFileSync(out, extract(oldDb)); } catch (err) { console.error('Pemulihan dibatalkan: ' + err.message); process.exit(1); }
  console.log('Ini backup LAMA dari versi SQLite. Database diekstrak ke: ' + out + '\nPindahkan ke MySQL dengan:\n  node deploy/migrate-sqlite-to-mysql.js "' + out + '" --kosongkan\n(foto di dalam ZIP ini bisa disalin manual ke folder uploads/).');
  process.exit(0);
}
if (!jsonItem) { console.error('database.json tidak ada di dalam ZIP. Ini bukan backup lengkap Palapa.'); process.exit(1); }
const LANJUT = process.argv.includes('--lanjut');
const photos = items.filter(i => /(^|\/)uploads\/[a-f0-9]{32}\.(jpg|png|webp|pdf)$/.test(i.name));   // nama lain (termasuk "../") diabaikan
const badPhotos = new Set(); let dump;
try { dump = JSON.parse(extract(jsonItem).toString('utf8')); if (!dump || dump.format !== 2 || !dump.tables || typeof dump.tables !== 'object') throw new Error('format database.json tidak dikenali'); }
catch (err) { console.error('Pemulihan dibatalkan, data lama tidak diubah: ' + err.message); process.exit(1); }
for (const it of photos) { try { extract(it); } catch (err) { badPhotos.add(it); console.error('  foto rusak: ' + it.name + ' (' + err.message + ')'); } }
if (badPhotos.size && !LANJUT) { console.error(`Pemulihan dibatalkan, data lama tidak diubah: ${badPhotos.size} foto di dalam ZIP rusak. Jalankan lagi dengan --lanjut untuk melewati foto yang rusak.`); process.exit(1); }
const q = n => '`' + String(n).replace(/`/g, '') + '`';
const unb64 = v => (v && typeof v === 'object' && v.$b64 !== undefined) ? Buffer.from(v.$b64, 'base64') : v;
const strip = o => JSON.stringify(o, (k, v) => (v && v.type === 'Buffer' && Array.isArray(v.data)) ? { $b64: Buffer.from(v.data).toString('base64') } : v);
(async () => {
  await db.init();
  fs.mkdirSync(UP, { recursive: true });
  let safety = null;   // salinan pengaman database saat ini
  try {
    const cur = { format: 2, engine: 'mysql', created: new Date().toISOString(), tables: {} };
    for (const x of await db.all('SHOW TABLES')) {
      const t = Object.values(x)[0]; if (t === 'sessions') continue;
      const columns = (await db.all('SHOW COLUMNS FROM ' + q(t))).map(c => c.Field);
      cur.tables[t] = { ddl: (await db.get('SHOW CREATE TABLE ' + q(t)))['Create Table'], columns, rows: (await db.all('SELECT * FROM ' + q(t))).map(r => columns.map(c => r[c])) };
    }
    const dir = path.join(DATA, 'backup-sebelum-pulih'); fs.mkdirSync(dir, { recursive: true });
    safety = path.join(dir, `db-sebelum-restore-${Date.now()}.json`);
    fs.writeFileSync(safety, strip(cur));
  } catch (err) { console.error('Salinan pengaman database lama gagal (' + err.message + '). Pemulihan dibatalkan agar data lama aman.'); process.exit(1); }
  for (const [t, d] of Object.entries(dump.tables)) {   // pastikan semua tabel ada (struktur diambil dari backup)
    if (t === 'sessions' || !d || !Array.isArray(d.columns) || !Array.isArray(d.rows)) continue;
    if (d.ddl && /^CREATE TABLE/i.test(d.ddl)) await db.run(d.ddl.replace(/^CREATE TABLE/i, 'CREATE TABLE IF NOT EXISTS'));
  }
  let docs = 0, users = 0;
  try {
    await db.transaction(async tx => {
      for (const [t, d] of Object.entries(dump.tables)) {
        if (t === 'sessions' || !d || !Array.isArray(d.columns) || !Array.isArray(d.rows)) continue;
        await tx.run('DELETE FROM ' + q(t));
        const cols = d.columns.map(q).join(','), ph = d.columns.map(() => '?').join(',');
        for (const r of d.rows) await tx.run(`INSERT INTO ${q(t)} (${cols}) VALUES (${ph})`, r.map(unb64));
        if (t === 'docs') docs = d.rows.length; if (t === 'users') users = d.rows.length;
      }
      await tx.run('DELETE FROM sessions');
    });
  } catch (err) { console.error('Pemulihan database GAGAL, data lama dikembalikan otomatis: ' + err.message); process.exit(1); }
  let ok = 0, bad = 0;
  for (const it of photos) { if (badPhotos.has(it)) { bad++; continue; } try { fs.writeFileSync(path.join(UP, path.basename(it.name)), extract(it)); ok++; } catch (err) { bad++; console.error('  foto dilewati: ' + err.message); } }
  console.log(`Selesai. Database dipulihkan (${docs} data, ${users} akun admin). Foto dipulihkan: ${ok}${bad ? ', gagal: ' + bad : ''}.`);
  if (safety) console.log('Salinan database sebelumnya: ' + safety);
  console.log('Sekarang jalankan server kembali.');
  await db.close();
})().catch(e => { console.error('Pemulihan GAGAL: ' + e.message); process.exit(1); });
