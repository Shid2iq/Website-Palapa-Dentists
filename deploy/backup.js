// Backup database + foto. Contoh:
//   node deploy/backup.js /var/backups/palapa
// Membuat: palapa-YYYY-MM-DD.json (seluruh tabel database) dan folder uploads-YYYY-MM-DD, lalu menghapus backup yang lebih tua dari 14 hari.
// Koneksi MySQL dibaca dari file .env. Aman dijalankan saat server berjalan. (Alternatif: mysqldump, lihat MIGRASI-MYSQL.md)
const fs = require('fs'), path = require('path');
try { const ef = path.join(__dirname, '..', '.env'); if (fs.existsSync(ef)) for (const ln of fs.readFileSync(ef, 'utf8').split(/\r?\n/)) { const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/.exec(ln); if (m && !ln.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2'); } } catch (e) { /* .env tidak wajib */ }
const db = require('../db');
const DATA = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const OUT = process.argv[2] || path.join(DATA, '..', 'backup');
const KEEP_DAYS = Number(process.env.KEEP_DAYS || 14);
const day = new Date().toISOString().slice(0, 10);
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const out = { format: 2, engine: 'mysql', created: new Date().toISOString(), tables: {} };
  for (const x of await db.all('SHOW TABLES')) {
    const t = Object.values(x)[0]; if (t === 'sessions') continue;
    const ddl = (await db.get('SHOW CREATE TABLE `' + t + '`'))['Create Table'];
    const columns = (await db.all('SHOW COLUMNS FROM `' + t + '`')).map(c => c.Field);
    out.tables[t] = { ddl, columns, rows: (await db.all('SELECT * FROM `' + t + '`')).map(r => columns.map(c => r[c])) };
  }
  await db.close();
  fs.writeFileSync(path.join(OUT, `palapa-${day}.json`), JSON.stringify(out, (k, v) => (v && v.type === 'Buffer' && Array.isArray(v.data)) ? { $b64: Buffer.from(v.data).toString('base64') } : v));
  const up = path.join(DATA, 'uploads');
  if (fs.existsSync(up)) fs.cpSync(up, path.join(OUT, `uploads-${day}`), { recursive: true });
  const limit = Date.now() - KEEP_DAYS * 864e5;
  for (const f of fs.readdirSync(OUT)) {
    const p = path.join(OUT, f);
    if (/^(palapa|uploads)-\d{4}-\d{2}-\d{2}/.test(f) && fs.statSync(p).mtimeMs < limit) fs.rmSync(p, { recursive: true, force: true });
  }
  console.log('Backup selesai:', OUT, day);
})().catch(e => { console.error('Backup GAGAL:', e.message); process.exit(1); });
