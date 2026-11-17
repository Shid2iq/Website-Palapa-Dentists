'use strict';
// Lapisan database MySQL / MariaDB untuk Palapa Dentists (pengganti SQLite).
// Semua fungsi bersifat async. Pengaturan koneksi lewat file .env atau variabel lingkungan:
//   DB_HOST=127.0.0.1  DB_PORT=3306  DB_USER=palapa  DB_PASS=...  DB_NAME=palapa   (atau satu baris: DATABASE_URL=mysql://user:pass@host:3306/palapa)
//   DB_POOL=10 (jumlah koneksi maksimal)  DB_SSL=1 (aktifkan SSL bila server MySQL mewajibkan)
const mysql = require('mysql2/promise');

const NAME = process.env.DB_NAME || 'palapa';
function baseConfig() {
  let c;
  if (process.env.DATABASE_URL) {
    const u = new URL(process.env.DATABASE_URL);
    c = { host: u.hostname, port: Number(u.port) || 3306, user: decodeURIComponent(u.username), password: decodeURIComponent(u.password), database: u.pathname.replace(/^\//, '') || NAME };
  } else {
    c = { host: process.env.DB_HOST || '127.0.0.1', port: Number(process.env.DB_PORT) || 3306, user: process.env.DB_USER || 'palapa', password: process.env.DB_PASS || '', database: NAME };
  }
  return Object.assign(c, { charset: 'utf8mb4', timezone: 'Z', supportBigNumbers: true, bigNumberStrings: false, dateStrings: true, ssl: process.env.DB_SSL === '1' ? { rejectUnauthorized: false } : undefined });
}
const cfg = baseConfig();
const pool = mysql.createPool(Object.assign({}, cfg, { waitForConnections: true, connectionLimit: Number(process.env.DB_POOL) || 10, queueLimit: 0 }));

// Menerjemahkan sebagian kecil sintaks SQLite ke MySQL (membantu modul lama). Kode baru sebaiknya langsung memakai SQL MySQL.
function tr(sql) {
  let s = String(sql);
  if (!/OR IGNORE|OR REPLACE|ON CONFLICT|NOCASE|rowid|datetime\(|AUTOINCREMENT/i.test(s)) return s;
  s = s.replace(/INSERT\s+OR\s+IGNORE/gi, 'INSERT IGNORE').replace(/INSERT\s+OR\s+REPLACE/gi, 'REPLACE');
  s = s.replace(/ON\s+CONFLICT\s*\([^)]*\)\s*DO\s+NOTHING/gi, '');
  s = s.replace(/ON\s+CONFLICT\s*\([^)]*\)\s*DO\s+UPDATE\s+SET/gi, 'ON DUPLICATE KEY UPDATE').replace(/excluded\.(\w+)/gi, 'VALUES($1)');
  s = s.replace(/COLLATE\s+NOCASE/gi, 'COLLATE utf8mb4_general_ci').replace(/ORDER\s+BY\s+rowid/gi, 'ORDER BY rid');
  s = s.replace(/datetime\(\s*'now'\s*\)/gi, 'NOW()').replace(/AUTOINCREMENT/gi, 'AUTO_INCREMENT');
  return s;
}
const flat = a => (a.length === 1 && Array.isArray(a[0])) ? a[0] : a;
function api(conn) {
  const wait = () => (conn === pool ? db.init() : null);   // kueri di luar transaksi menunggu pembuatan tabel selesai (aman dipanggil modul saat startup)
  const o = {
    async all(sql, p) { await wait(); const [rows] = await conn.query(tr(sql), p || []); return rows; },
    async get(sql, p) { const rows = await o.all(sql, p); return rows[0]; },
    async run(sql, p) { await wait(); const [r] = await conn.query(tr(sql), p || []); return { changes: r.affectedRows, lastInsertRowid: r.insertId }; },
    async exec(sql) { await wait(); for (const st of String(sql).split(/;\s*(?:\r?\n|$)/).map(x => x.trim()).filter(Boolean)) await conn.query(tr(st)); },
    prepare(sql) { return { all: (...a) => o.all(sql, flat(a)), get: (...a) => o.get(sql, flat(a)), run: (...a) => o.run(sql, flat(a)) }; }   // bentuk mirip better-sqlite3, tetapi async
  };
  return o;
}
const db = api(pool);
db.pool = pool;
db.name = NAME;
// Transaksi: fn menerima objek dengan all/get/run/exec yang memakai SATU koneksi yang sama.
db.transaction = async fn => {
  await db.init();   // transaksi juga menunggu tabel siap (mis. dipanggil seeds.js saat startup)
  const conn = await pool.getConnection();
  try { await conn.beginTransaction(); const out = await fn(api(conn)); await conn.commit(); return out; }
  catch (e) { try { await conn.rollback(); } catch (x) { /* diabaikan */ } throw e; }
  finally { conn.release(); }
};
const CS = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';
const BIN = 'CHARACTER SET utf8mb4 COLLATE utf8mb4_bin';
let initP = null;
async function realInit() {
  try { await pool.query('SELECT 1'); }
  catch (e) {
    if (e.code === 'ER_BAD_DB_ERROR') {   // database belum dibuat: coba buat otomatis (butuh hak CREATE)
      const c = await mysql.createConnection(Object.assign({}, cfg, { database: undefined }));
      await c.query('CREATE DATABASE IF NOT EXISTS `' + NAME.replace(/`/g, '') + '` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'); await c.end();
    } else {
      const hint = e.code === 'ECONNREFUSED' ? 'Server MySQL tidak menjawab di ' + cfg.host + ':' + cfg.port + '. Pastikan MySQL berjalan dan DB_HOST/DB_PORT benar.'
        : e.code === 'ER_ACCESS_DENIED_ERROR' ? 'Username atau password MySQL salah (DB_USER / DB_PASS).' : e.message;
      throw new Error('Tidak bisa terhubung ke database MySQL: ' + hint);
    }
  }
  await pool.query(`CREATE TABLE IF NOT EXISTS docs(
    rid BIGINT NOT NULL AUTO_INCREMENT, col VARCHAR(64) ${BIN} NOT NULL, id VARCHAR(64) ${BIN} NOT NULL, data LONGTEXT NOT NULL,
    PRIMARY KEY(col,id), UNIQUE KEY docs_rid(rid)) ${CS}`);
  await pool.query(`CREATE TABLE IF NOT EXISTS users(
    rid BIGINT NOT NULL AUTO_INCREMENT, username VARCHAR(64) ${BIN} NOT NULL, hash VARCHAR(100) NOT NULL, created BIGINT NULL, role VARCHAR(20) NOT NULL DEFAULT 'admin',
    PRIMARY KEY(username), UNIQUE KEY users_rid(rid)) ${CS}`);
  await pool.query(`CREATE TABLE IF NOT EXISTS sessions(
    token VARCHAR(128) NOT NULL, username VARCHAR(64) ${BIN} NULL, exp BIGINT NULL,
    PRIMARY KEY(token), KEY sessions_exp(exp), KEY sessions_user(username)) ${CS}`);
}
db.init = () => (initP = initP || realInit());   // dijalankan sekali; panggilan berikutnya memakai hasil yang sama
db.close = () => pool.end();
module.exports = db;
