// Membuat akun admin, atau mengganti password akun yang sudah ada (berguna jika lupa password).
//   ADMIN_USER=admin ADMIN_PASS=passwordbaru node deploy/create-admin.js
//   tambahkan argumen --if-empty untuk hanya membuat akun bila belum ada akun sama sekali.
// Koneksi MySQL dibaca dari file .env di folder aplikasi (DB_HOST, DB_USER, DB_PASS, DB_NAME).
const fs = require('fs'), path = require('path');
try { const ef = path.join(__dirname, '..', '.env'); if (fs.existsSync(ef)) for (const ln of fs.readFileSync(ef, 'utf8').split(/\r?\n/)) { const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/.exec(ln); if (m && !ln.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2'); } } catch (e) { /* .env tidak wajib */ }
const bcrypt = require('bcryptjs'), db = require('../db');
const u = process.env.ADMIN_USER || '', p = process.env.ADMIN_PASS || '';
if (!/^[a-zA-Z0-9_.-]{3,30}$/.test(u)) { console.error('ADMIN_USER harus 3-30 karakter (huruf, angka, titik, strip, underscore).'); process.exit(1); }
if (p.length < 8 || p.length > 72) { console.error('ADMIN_PASS harus 8-72 karakter.'); process.exit(1); }
(async () => {
  await db.init();
  const n = (await db.get('SELECT COUNT(*) n FROM users')).n;
  if (process.argv.includes('--if-empty') && n > 0) { console.log('Sudah ada akun admin, dilewati.'); return; }
  const hash = bcrypt.hashSync(p, 12);
  if (await db.get('SELECT 1 FROM users WHERE username=?', [u])) {
    await db.run('UPDATE users SET hash=? WHERE username=?', [hash, u]);
    await db.run('DELETE FROM sessions WHERE username=?', [u]);
    console.log(`Password akun "${u}" diganti.`);
  } else {
    await db.run("INSERT INTO users(username,hash,created,role) VALUES(?,?,?,'admin')", [u, hash, Date.now()]);
    console.log(`Akun admin "${u}" dibuat.`);
  }
})().then(() => db.close()).catch(e => { console.error('Gagal: ' + e.message); process.exit(1); });
