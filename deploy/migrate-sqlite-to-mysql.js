// Memindahkan SEMUA data dari database SQLite lama (palapa.db) ke MySQL/MariaDB. Aman diulang: data tujuan ditimpa per tabel.
//   1. Siapkan MySQL dan isi .env (DB_HOST, DB_USER, DB_PASS, DB_NAME), lihat MIGRASI-MYSQL.md
//   2. npm install better-sqlite3        (hanya dibutuhkan untuk migrasi ini; server sendiri tidak memakainya lagi)
//   3. node deploy/migrate-sqlite-to-mysql.js  [lokasi palapa.db]     (bawaan: DATA_DIR/palapa.db atau ./data/palapa.db)
//   Tambahkan --kosongkan untuk menghapus isi tabel tujuan lebih dulu (disarankan bila MySQL sudah pernah terisi).
// File palapa.db TIDAK diubah. Foto di folder uploads tetap di tempatnya (tidak dipindahkan ke database).
const fs = require('fs'), path = require('path');
try { const ef = path.join(__dirname, '..', '.env'); if (fs.existsSync(ef)) for (const ln of fs.readFileSync(ef, 'utf8').split(/\r?\n/)) { const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/.exec(ln); if (m && !ln.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2'); } } catch (e) { /* .env tidak wajib */ }
let Sqlite; try { Sqlite = require('better-sqlite3'); } catch (e) { console.error('Paket better-sqlite3 belum terpasang. Jalankan dulu:  npm install better-sqlite3'); process.exit(1); }
const db = require('../db');
const DATA = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const src = process.argv.slice(2).find(a => !a.startsWith('--')) || path.join(DATA, 'palapa.db');
if (!fs.existsSync(src)) { console.error('File SQLite tidak ditemukan: ' + src); process.exit(1); }
const KOSONG = process.argv.includes('--kosongkan');
const q = n => '`' + String(n).replace(/`/g, '') + '`';
const BIN = 'CHARACTER SET utf8mb4 COLLATE utf8mb4_bin';
function mapType(t) {
  t = String(t || '').toUpperCase();
  if (/INT/.test(t)) return 'BIGINT';
  if (/REAL|FLOA|DOUB|NUM|DEC/.test(t)) return 'DOUBLE';
  if (/BLOB/.test(t)) return 'LONGBLOB';
  return 'LONGTEXT';
}
(async () => {
  const s = new Sqlite(src, { readonly: true });
  await db.init();                                    // tabel inti: docs, users, sessions
  for (const m of ['chat', 'patients']) {             // tabel modul dibuat dengan struktur resminya (bukan tebakan) sebelum data disalin
    try { const mod = require('../' + m); if (mod && mod.schema) await mod.schema(db); } catch (e) { console.warn('  (skema ' + m + ' dilewati: ' + e.message + ')'); }
  }
  const tables = s.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(x => x.name);
  const core = ['docs', 'users', 'sessions'];
  let total = 0;
  for (const t of tables) {
    if (t === 'sessions') { console.log('- sessions: dilewati (semua orang cukup login ulang)'); continue; }
    const cols = s.prepare(`PRAGMA table_info(${q(t)})`).all();
    if (!core.includes(t)) {   // tabel modul (chat, pasien, dll): buat strukturnya bila belum ada
      const pk = cols.filter(c => c.pk).sort((a, b) => a.pk - b.pk);
      const defs = cols.map(c => {
        const isPk = pk.some(p => p.name === c.name), t0 = mapType(c.type);
        const single = pk.length === 1 && isPk, auto = single && /INT/i.test(c.type);
        let type = t0 === 'LONGTEXT' && isPk ? `VARCHAR(190) ${BIN}` : t0 === 'LONGTEXT' && /(^|_)(id|token|phone|username|email|code|key)$/i.test(c.name) ? 'VARCHAR(190)' : t0;
        return `${q(c.name)} ${type}${auto ? ' NOT NULL AUTO_INCREMENT' : c.notnull ? ' NOT NULL' : ' NULL'}`;
      });
      if (pk.length) defs.push(`PRIMARY KEY(${pk.map(p => q(p.name)).join(',')})`);
      await db.run(`CREATE TABLE IF NOT EXISTS ${q(t)} (${defs.join(', ')}) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    }
    if (KOSONG) await db.run(`DELETE FROM ${q(t)}`);
    const names = cols.map(c => c.name), rows = s.prepare(`SELECT * FROM ${q(t)}${core.includes(t) ? ' ORDER BY rowid' : ''}`).all();
    const upd = names.map(n => `${q(n)}=?`).join(',');   // upsert tanpa VALUES(): berjalan di MySQL 5.7/8/9 dan MariaDB
    for (const r of rows) {
      const vals = names.map(n => (r[n] === undefined ? null : r[n]));
      await db.run(`INSERT INTO ${q(t)} (${names.map(q).join(',')}) VALUES (${names.map(() => '?').join(',')}) ON DUPLICATE KEY UPDATE ${upd}`, vals.concat(vals));
    }
    const n = (await db.get(`SELECT COUNT(*) n FROM ${q(t)}`)).n;
    console.log(`- ${t}: ${rows.length} baris dari SQLite, ${n} baris di MySQL`); total += rows.length;
  }
  s.close(); await db.close();
  console.log(`\nSelesai: ${total} baris dipindahkan. Jalankan server dengan "npm start" dan cek di browser.`);
})().catch(e => { console.error('\nMigrasi GAGAL: ' + e.message); process.exit(1); });
