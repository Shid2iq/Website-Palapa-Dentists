// Muat file .env (opsional) di folder aplikasi: baris KEY=VALUE. Nilai yang sudah ada di lingkungan tidak ditimpa.
try {
  const ef = require('path').join(__dirname, '.env');
  if (require('fs').existsSync(ef)) for (const ln of require('fs').readFileSync(ef, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/.exec(ln); if (!m || ln.trim().startsWith('#')) continue;
    if (process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
} catch (e) { /* .env tidak wajib */ }
const express = require('express'), bcrypt = require('bcryptjs'), db = require('./db');   // db.js = MySQL/MariaDB (semua fungsi async)
const multer = require('multer'), crypto = require('crypto'), fs = require('fs'), path = require('path'), zlib = require('zlib');
const PORT = process.env.PORT || 3000;
const DATA = process.env.DATA_DIR || path.join(__dirname, 'data'), UP = path.join(DATA, 'uploads');
fs.mkdirSync(UP, { recursive: true });
const ROLES = ['admin', 'blogger', 'pendaftaran'];

// Nomor telepon lama (tiga nomor kantor) dibersihkan dari pengaturan setiap server dimulai; bila tidak ada nomor tersisa, dipakai WhatsApp 2.
// Pencocokan memakai digit, jadi format apa pun (+62 21 7806 291, (021) 7806 291, 021-7806291, dst) tetap dikenali. Nomor lain yang Anda isi sendiri tidak disentuh.
const APP_VERSION = '2026-10-21-r5';
const OLD_TAILS = ['217806291', '2129048890', '2129048891'];
const isOldPhone = v => { let d = String(v || '').replace(/\D/g, ''); d = d.startsWith('62') ? d.slice(2) : d.startsWith('0') ? d.slice(1) : d; return OLD_TAILS.includes(d); };
async function migratePhones() {
  try {
    const row = await db.get("SELECT data FROM docs WHERE col='settings' AND id='site'"); if (!row) return;
    const s = JSON.parse(row.data); let changed = false;
    for (const k of ['phone1', 'phone2', 'phone3']) if (s[k] && isOldPhone(s[k])) { s[k] = ''; changed = true; }
    if (changed) {
      if (!['phone1', 'phone2', 'phone3'].some(k => s[k])) s.phone1 = s.wa2 || '081281116662';
      await db.run("UPDATE docs SET data=? WHERE col='settings' AND id='site'", [JSON.stringify(s)]);
      console.log('Nomor telepon lama dibersihkan dari pengaturan. Telepon 1 sekarang: ' + (s.phone1 || '(kosong)'));
    }
  } catch (e) { /* tidak menghentikan server */ }
}
// Dijalankan sekali sebelum server menerima permintaan: membuat tabel, membersihkan nomor lama, dan membuat akun admin pertama
async function startup() {
  await db.init();
  await migratePhones();
  if (!(await db.get('SELECT 1 FROM users LIMIT 1'))) {   // Akun admin pertama
    const u = process.env.ADMIN_USER || 'admin';
    const p = process.env.ADMIN_PASS || crypto.randomBytes(9).toString('base64url');
    await db.run("INSERT INTO users(username,hash,created,role) VALUES(?,?,?,'admin')", [u, bcrypt.hashSync(p, 12), Date.now()]);
    console.log(`\n=== Akun admin dibuat ===\nusername: ${u}\npassword: ${p}\nSegera ganti di menu Akun setelah login.\n`);
  }
}
const PENDING = [];   // pekerjaan async modul (mis. pembuatan tabel) yang harus selesai sebelum server dibuka

const PUB = ['posts', 'doctors', 'insurances', 'departments', 'settings', 'features', 'history', 'points', 'schedule', 'promos', 'bottpl', 'faq', 'catalog', 'equipment', 'cases', 'awards', 'stats'], PRIV = ['appointments', 'blast', 'ai'], ALL = PUB.concat(PRIV);   // PRIV: hanya admin yang boleh membaca
const DUMMY = bcrypt.hashSync('dummy-password', 12);
const app = express();
app.disable('x-powered-by'); app.set('trust proxy', 1);
app.use((q, r, n) => {
  r.set({
    'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'same-origin',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://app-container.qlar.ai; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://app-asset.qlar.ai; frame-src https://www.google.com https://app.qlar.ai; frame-ancestors 'none'"
  });
  n();
});
app.use((q, r, n) => q.path === '/api/backup/import' ? n() : express.json({ limit: q.path.startsWith('/api/doc/') ? '1mb' : '200kb' })(q, r, n));

const cookie = q => Object.fromEntries((q.headers.cookie || '').split(';').map(s => s.trim().split('=')).filter(a => a[0]).map(a => [a[0], a[1]]));
const ah = f => (q, r, n) => Promise.resolve(f(q, r, n)).catch(n);   // tangkap error async agar masuk ke penangan error Express
const userOf = async q => { const t = cookie(q).pa; return t ? (await db.get('SELECT u.username, u.role FROM sessions s JOIN users u ON u.username=s.username WHERE s.token=? AND s.exp>?', [t, Date.now()])) || null : null; };
const auth = ah(async (q, r, n) => { const u = await userOf(q); if (!u) return r.status(401).json({ error: 'Silakan login' }); q.user = u.username; q.role = u.role || 'admin'; n(); });
// Batasi per peran: admin = semua; blogger = hanya artikel (+ unggah foto); pendaftaran = hanya chat pasien
const only = (...rs) => (q, r, n) => rs.includes(q.role) ? n() : r.status(403).json({ error: 'Akses ditolak untuk peran Anda' });
const chatAuth = (q, r, n) => auth(q, r, () => only('admin', 'pendaftaran')(q, r, n));
const csrf = (q, r, n) => q.get('x-req') === '1' ? n() : r.status(403).json({ error: 'Permintaan ditolak' });
const limiter = (max, ms) => { const m = new Map(); return (q, r, n) => { const now = Date.now(), a = m.get(q.ip) || { n: 0, t: now }; if (now - a.t > ms) { a.n = 0; a.t = now; } if (++a.n > max) return r.status(429).json({ error: 'Terlalu banyak percobaan, coba lagi nanti' }); m.set(q.ip, a); n(); }; };

app.get('/api/version', (q, r) => r.json({ version: APP_VERSION }));
app.get('/api/me', ah(async (q, r) => { const u = await userOf(q); r.json({ user: u ? u.username : null, role: u ? u.role : null }); }));
app.post('/api/login', csrf, limiter(8, 10 * 60e3), ah(async (q, r) => {
  const { username, password } = q.body || {};
  const u = await db.get('SELECT * FROM users WHERE username=?', [String(username || '')]);
  const ok = bcrypt.compareSync(String(password || ''), u ? u.hash : DUMMY);
  if (!u || !ok) return r.status(401).json({ error: 'Username atau password salah' });
  const t = crypto.randomBytes(32).toString('hex');
  await db.run('DELETE FROM sessions WHERE exp<?', [Date.now()]);
  await db.run('INSERT INTO sessions(token,username,exp) VALUES(?,?,?)', [t, u.username, Date.now() + 7 * 864e5]);
  r.cookie('pa', t, { httpOnly: true, sameSite: 'lax', secure: process.env.COOKIE_SECURE === '1', maxAge: 7 * 864e5, path: '/' });
  r.json({ user: u.username, role: u.role || 'admin' });
}));
app.post('/api/logout', csrf, ah(async (q, r) => { const t = cookie(q).pa; if (t) await db.run('DELETE FROM sessions WHERE token=?', [t]); r.clearCookie('pa', { path: '/' }); r.json({ ok: true }); }));
app.post('/api/password', auth, csrf, ah(async (q, r) => {
  const { old, nw } = q.body || {}, u = await db.get('SELECT * FROM users WHERE username=?', [q.user]);
  if (!bcrypt.compareSync(String(old || ''), u.hash)) return r.status(400).json({ error: 'Password lama salah' });
  if (String(nw || '').length < 8) return r.status(400).json({ error: 'Password baru minimal 8 karakter' });
  await db.run('UPDATE users SET hash=? WHERE username=?', [bcrypt.hashSync(String(nw), 12), q.user]);
  await db.run('DELETE FROM sessions WHERE username=? AND token!=?', [q.user, cookie(q).pa || '']);
  r.json({ ok: true });
}));


// ---------- Kelola akun admin ----------
const UN = /^[a-zA-Z0-9_.-]{3,30}$/;
const pwOk = p => typeof p === 'string' && p.length >= 8 && p.length <= 72;
app.get('/api/users', auth, only('admin'), ah(async (q, r) => r.json((await db.all('SELECT username,created,role FROM users ORDER BY rid')).map(u => ({ username: u.username, created: u.created, role: u.role, me: u.username === q.user })))));
app.post('/api/users', auth, only('admin'), csrf, limiter(20, 3600e3), ah(async (q, r) => {
  const { username, password, role } = q.body || {};
  if (!ROLES.includes(role)) return r.status(400).json({ error: 'Pilih peran: admin, blogger, atau pendaftaran' });
  if (!UN.test(String(username || ''))) return r.status(400).json({ error: 'Username 3-30 karakter: huruf, angka, titik, strip, atau underscore' });
  if (!pwOk(password)) return r.status(400).json({ error: 'Password 8-72 karakter' });
  if (await db.get('SELECT 1 FROM users WHERE username COLLATE utf8mb4_general_ci = ?', [username])) return r.status(409).json({ error: 'Username sudah dipakai' });
  await db.run('INSERT INTO users(username,hash,created,role) VALUES(?,?,?,?)', [username, bcrypt.hashSync(password, 12), Date.now(), role]);
  r.json({ ok: true });
}));
app.post('/api/users/:u/password', auth, only('admin'), csrf, limiter(20, 3600e3), ah(async (q, r) => {
  const u = q.params.u;
  if (!UN.test(u) || !(await db.get('SELECT 1 FROM users WHERE username=?', [u]))) return r.status(404).json({ error: 'Akun tidak ditemukan' });
  if (!pwOk((q.body || {}).password)) return r.status(400).json({ error: 'Password 8-72 karakter' });
  await db.run('UPDATE users SET hash=? WHERE username=?', [bcrypt.hashSync(q.body.password, 12), u]);
  await db.run('DELETE FROM sessions WHERE username=? AND token!=?', [u, cookie(q).pa || '']);
  r.json({ ok: true });
}));
app.patch('/api/users/:u', auth, only('admin'), csrf, ah(async (q, r) => {
  const u = q.params.u, role = (q.body || {}).role;
  if (!ROLES.includes(role)) return r.status(400).json({ error: 'Peran tidak valid' });
  if (u === q.user) return r.status(400).json({ error: 'Anda tidak bisa mengubah peran akun sendiri' });
  const t = UN.test(u) && await db.get('SELECT role FROM users WHERE username=?', [u]);
  if (!t) return r.status(404).json({ error: 'Akun tidak ditemukan' });
  await db.run('UPDATE users SET role=? WHERE username=?', [role, u]);
  await db.run('DELETE FROM sessions WHERE username=?', [u]);   // harus login ulang agar tampilannya mengikuti peran baru
  r.json({ ok: true });
}));
app.delete('/api/users/:u', auth, only('admin'), csrf, ah(async (q, r) => {
  const u = q.params.u;
  if (u === q.user) return r.status(400).json({ error: 'Anda tidak bisa menghapus akun yang sedang dipakai' });
  const t = UN.test(u) && await db.get('SELECT role FROM users WHERE username=?', [u]);
  if (!t) return r.status(404).json({ error: 'Akun tidak ditemukan' });
  if (t.role === 'admin' && (await db.get("SELECT COUNT(*) n FROM users WHERE role='admin'")).n <= 1) return r.status(400).json({ error: 'Minimal harus ada satu akun admin' });
  await db.run('DELETE FROM users WHERE username=?', [u]);
  await db.run('DELETE FROM sessions WHERE username=?', [u]);
  r.json({ ok: true });
}));

const ID = /^[a-zA-Z0-9_-]{1,40}$/;
function clean(o) {
  if (!o || typeof o !== 'object' || Array.isArray(o)) return null;
  const out = {};
  for (const [k, v] of Object.entries(o)) {
    if (k === 'id' || k === '__proto__' || k === 'constructor' || k === 'prototype' || !/^[a-zA-Z_][a-zA-Z0-9_]{0,29}$/.test(k)) continue;
    if (typeof v === 'string') out[k] = v.slice(0, 20000);
    else if (typeof v === 'boolean' || typeof v === 'number') out[k] = v;
  }
  for (const k of Object.keys(out)) if (/imgpos$/i.test(k) && !/^(100|[1-9]?\d)% (100|[1-9]?\d)%$/.test(String(out[k]))) delete out[k];
  for (const k of Object.keys(out)) if (/img$/i.test(k) && out[k] && !/^\/uploads\/[a-f0-9]{32}\.(jpg|png|webp)$/.test(out[k])) delete out[k];
  for (const k of Object.keys(out)) if (/pdf$/i.test(k) && out[k] && !/^\/uploads\/[a-f0-9]{32}\.pdf$/.test(out[k])) delete out[k];
  return out;
}
app.get('/api/col/:c', ah(async (q, r) => {
  const c = q.params.c;
  if (!ALL.includes(c)) return r.sendStatus(404);
  if (PRIV.includes(c)) { const uu = await userOf(q); if (!uu) return r.status(401).json({ error: 'Silakan login' }); if (!(uu.role === 'admin' || (c === 'blast' && uu.role === 'pendaftaran'))) return r.status(403).json({ error: 'Akses ditolak untuk peran Anda' }); }
  r.json((await db.all('SELECT id,data FROM docs WHERE col=? ORDER BY rid', [c])).map(x => ({ id: x.id, ...JSON.parse(x.data) })));
}));
const guard = (q, r, n) => (ALL.includes(q.params.c) && ID.test(q.params.id)) ? n() : r.sendStatus(404);
const docRole = (q, r, n) => (q.role === 'admin' || (q.role === 'blogger' && q.params.c === 'posts') || (q.role === 'pendaftaran' && ['blast', 'promos'].includes(q.params.c))) ? n() : r.status(403).json({ error: 'Akses ditolak untuk peran Anda' });
app.put('/api/doc/:c/:id', auth, csrf, guard, docRole, ah(async (q, r) => {
  const d = clean(q.body); if (!d) return r.sendStatus(400);
  const js = JSON.stringify(d);
  await db.run('INSERT INTO docs(col,id,data) VALUES(?,?,?) ON DUPLICATE KEY UPDATE data=?', [q.params.c, q.params.id, js, js]);
  r.json({ ok: true });
}));
app.patch('/api/doc/:c/:id', auth, csrf, guard, docRole, ah(async (q, r) => {
  const d = clean(q.body); if (!d) return r.sendStatus(400);
  const ok = await db.transaction(async t => {   // baca-ubah-simpan dalam satu transaksi agar dua perubahan bersamaan tidak saling menimpa
    const row = await t.get('SELECT data FROM docs WHERE col=? AND id=? FOR UPDATE', [q.params.c, q.params.id]);
    if (!row) return false;
    await t.run('UPDATE docs SET data=? WHERE col=? AND id=?', [JSON.stringify({ ...JSON.parse(row.data), ...d }), q.params.c, q.params.id]);
    return true;
  });
  if (!ok) return r.sendStatus(400);
  r.json({ ok: true });
}));
app.delete('/api/doc/:c/:id', auth, csrf, guard, docRole, ah(async (q, r) => { await db.run('DELETE FROM docs WHERE col=? AND id=?', [q.params.c, q.params.id]); r.json({ ok: true }); }));


// ---------- Chat pasien <-> bagian pendaftaran (modul chat.js) ----------
// Modul-modul ini harus memakai db.js versi MySQL (async). Bila sebuah modul mengembalikan Promise, server menunggunya sebelum dibuka.
for (const reg of [() => require('./seeds')(db), () => require('./chat')(app, db, { auth: chatAuth, csrf, limiter, siteBase }), () => require('./patients')(app, db, { chatAuth, auth, only, csrf, limiter }), () => require('./ai')(app, db, { auth, only, csrf, limiter, siteBase })]) {
  const p = reg(); if (p && typeof p.then === 'function') { p.catch(() => {}); PENDING.push(p); }   // kegagalan dilaporkan oleh startup (pesan yang jelas), bukan crash
}


// ---------- Kontak pasien untuk pengingat & promo (admin): dari janji temu dan chat ----------
const normPhone = p => { let d = String(p || '').replace(/\D/g, ''); if (d.startsWith('0')) d = '62' + d.slice(1); else if (d.startsWith('8')) d = '62' + d; return d; };
app.get('/api/contacts', auth, only('admin', 'pendaftaran'), ah(async (q, r) => {
  const m = new Map();
  const add = (phone, name, src, ts) => {
    const k = normPhone(phone); if (k.length < 8) return;
    const c = m.get(k) || { phone: k, name: '', src: [], last: 0 };
    if (name && (!c.name || ts >= c.last)) c.name = String(name).slice(0, 60);
    if (!c.src.includes(src)) c.src.push(src);
    c.last = Math.max(c.last, ts || 0); m.set(k, c);
  };
  for (const x of await db.all("SELECT data FROM docs WHERE col='appointments'")) {
    const d = JSON.parse(x.data); let ts = Number(d.created) || Date.parse(d.date) || 0;
    add(d.phone, d.name, 'janji', ts);
  }
  for (const c of await db.all('SELECT name,phone,updated FROM chats')) add(c.phone, c.name, 'chat', c.updated);
  r.json([...m.values()].sort((a, b) => a.last - b.last));
}));

// ---------- Backup dan pemulihan isi website (file JSON yang bisa dibaca dan diedit) ----------
// Format fleksibel: setiap bagian berisi daftar item apa adanya, jadi kolom/bagian baru yang ditambahkan nanti otomatis ikut
// ter-backup, dan backup lama tetap bisa dipulihkan walau tidak punya kolom/bagian baru tersebut.
const UPRE = /^\/uploads\/[a-f0-9]{32}\.(jpg|png|webp|pdf)$/;
function sniffExt(b) {
  if (b[0] === 0xFF && b[1] === 0xD8) return 'jpg';
  if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))) return 'png';
  if (b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP') return 'webp';
  return null;
}
async function exportObj(photos, appts) {
  const collections = {};
  for (const r of await db.all('SELECT col,id,data FROM docs ORDER BY rid')) {
    if (!appts && (r.col === 'appointments' || r.col === 'blast')) continue;
    (collections[r.col] = collections[r.col] || []).push({ id: r.id, ...JSON.parse(r.data) });
  }
  const files = {};
  if (photos) {
    const seen = new Set();
    for (const list of Object.values(collections)) for (const d of list) for (const v of Object.values(d)) if (typeof v === 'string' && UPRE.test(v)) seen.add(v);
    for (const p of seen) {
      const f = path.join(UP, path.basename(p));
      if (fs.existsSync(f)) { const ext = path.extname(p).slice(1); files[p] = `data:image/${ext === 'jpg' ? 'jpeg' : ext};base64,` + fs.readFileSync(f).toString('base64'); }
    }
  }
  return {
    app: 'palapa-dentists', format: 1, created: new Date().toISOString(),
    note: 'Backup isi website Palapa Dentists. Akun admin tidak disertakan. File ini boleh dibuka dan diedit dengan editor teks.',
    counts: Object.fromEntries(Object.entries(collections).map(([k, v]) => [k, v.length])),
    collections, files
  };
}
app.get('/api/backup/export', auth, only('admin'), ah(async (q, r) => {
  if (q.query.photos !== '0') {   // backup JSON memuat foto sebagai base64 di memori: batasi agar server tidak kehabisan RAM
    let sum = 0; for (const f of photoFiles()) { try { sum += fs.statSync(path.join(UP, f)).size; } catch (e) { /* diabaikan */ } }
    if (sum > 40e6) return r.status(413).json({ error: `Total foto ${Math.round(sum / 1048576)} MB terlalu besar untuk backup JSON. Matikan "Sertakan foto" atau gunakan Backup lengkap (.zip).` });
  }
  const obj = await exportObj(q.query.photos !== '0', q.query.appts !== '0');
  const d = new Date(), p2 = n => String(n).padStart(2, '0');
  const name = `palapa-backup-${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}-${p2(d.getHours())}${p2(d.getMinutes())}.json`;
  r.set({ 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': `attachment; filename="${name}"`, 'Cache-Control': 'no-store' });
  r.send(JSON.stringify(obj, null, 1));
}));
app.post('/api/backup/import', auth, only('admin'), csrf, express.json({ limit: '100mb' }), ah(async (q, r) => {
  const b = q.body;
  if (!b || typeof b !== 'object' || !b.collections || typeof b.collections !== 'object' || Array.isArray(b.collections))
    return r.status(400).json({ error: 'File ini bukan backup Palapa yang valid (bagian "collections" tidak ditemukan).' });
  const mode = q.query.mode === 'merge' ? 'merge' : 'replace';
  const report = { mode, collections: {}, ignored: [], files: { written: 0, skipped: 0 }, missingPhotos: 0 };
  try { // salinan pengaman isi saat ini sebelum diubah
    const dir = path.join(DATA, 'backup-sebelum-pulih'); fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `sebelum-pulih-${Date.now()}.json`), JSON.stringify(await exportObj(false, true)));
    for (const f of fs.readdirSync(dir).sort().slice(0, -10)) fs.rmSync(path.join(dir, f), { force: true });
  } catch (e) { /* salinan pengaman gagal tidak menghentikan pemulihan */ }
  const files = b.files && typeof b.files === 'object' && !Array.isArray(b.files) ? b.files : {};
  for (const [p, uri] of Object.entries(files)) {
    const m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(uri));
    if (!UPRE.test(p) || !m) { report.files.skipped++; continue; }
    const buf = Buffer.from(m[2], 'base64');
    if (sniffExt(buf) !== path.extname(p).slice(1)) { report.files.skipped++; continue; }
    fs.writeFileSync(path.join(UP, path.basename(p)), buf); report.files.written++;
  }
  const refs = new Set();
  try {
    await db.transaction(async t => {
      for (const [col, list] of Object.entries(b.collections)) {
        if (!ALL.includes(col) || !Array.isArray(list)) { report.ignored.push(col); continue; }   // bagian yang tidak dikenal dilewati, bukan error
        if (mode === 'replace') await t.run('DELETE FROM docs WHERE col=?', [col]);
        let n = 0, sk = 0;
        for (const it of list) {
          const id = it && typeof it === 'object' ? String(it.id == null ? '' : it.id) : '', d = clean(it);
          if (!ID.test(id) || !d) { sk++; continue; }
          const js = JSON.stringify(d);
          await t.run('INSERT INTO docs(col,id,data) VALUES(?,?,?) ON DUPLICATE KEY UPDATE data=?', [col, id, js, js]); n++;
          for (const v of Object.values(d)) if (typeof v === 'string' && UPRE.test(v)) refs.add(v);
        }
        report.collections[col] = { imported: n, skipped: sk };
      }
    });
  } catch (e) { return r.status(500).json({ error: 'Gagal memulihkan, data tidak diubah: ' + e.message }); }
  for (const p of refs) if (!fs.existsSync(path.join(UP, path.basename(p)))) report.missingPhotos++;
  r.json({ ok: true, ...report });
}));


// ---------- Backup lengkap (.zip): database + semua foto sebagai file (tanpa base64, tanpa pustaka tambahan) ----------
const CRC_T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = buf => { let c = 0xFFFFFFFF; for (let i = 0; i < buf.length; i++) c = CRC_T[(c ^ buf[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
const PHOTO = /^[a-f0-9]{32}\.(jpg|png|webp|pdf)$/;
async function streamZip(res, entries) {
  const d = new Date(), dt = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), dd = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  let off = 0; const cd = [];
  const write = buf => { off += buf.length; return res.write(buf) ? Promise.resolve() : new Promise(ok => res.once('drain', ok)); };
  for (const e of entries) {
    const raw = typeof e.data === 'function' ? e.data() : e.data, crc = crc32(raw);
    const body = e.deflate ? zlib.deflateRawSync(raw) : raw, method = e.deflate ? 8 : 0, name = Buffer.from(e.name, 'utf8');
    const h = Buffer.alloc(30);
    h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(e.deflate ? 20 : 10, 4); h.writeUInt16LE(0x0800, 6); h.writeUInt16LE(method, 8);
    h.writeUInt16LE(dt, 10); h.writeUInt16LE(dd, 12); h.writeUInt32LE(crc, 14); h.writeUInt32LE(body.length, 18); h.writeUInt32LE(raw.length, 22); h.writeUInt16LE(name.length, 26);
    cd.push({ name, crc, cs: body.length, us: raw.length, method, offset: off });
    await write(h); await write(name); await write(body);
  }
  const cdStart = off;
  for (const c of cd) {
    const h = Buffer.alloc(46);
    h.writeUInt32LE(0x02014b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(c.method ? 20 : 10, 6); h.writeUInt16LE(0x0800, 8); h.writeUInt16LE(c.method, 10);
    h.writeUInt16LE(dt, 12); h.writeUInt16LE(dd, 14); h.writeUInt32LE(c.crc, 16); h.writeUInt32LE(c.cs, 20); h.writeUInt32LE(c.us, 24); h.writeUInt16LE(c.name.length, 28); h.writeUInt32LE(c.offset, 42);
    await write(h); await write(c.name);
  }
  const eo = Buffer.alloc(22), cdSize = off - cdStart;
  eo.writeUInt32LE(0x06054b50, 0); eo.writeUInt16LE(cd.length, 8); eo.writeUInt16LE(cd.length, 10); eo.writeUInt32LE(cdSize, 12); eo.writeUInt32LE(cdStart, 16);
  await write(eo);
}
function photoFiles() { return fs.existsSync(UP) ? fs.readdirSync(UP).filter(f => PHOTO.test(f)) : []; }
app.get('/api/backup/info', auth, only('admin'), ah(async (q, r) => {
  const ph = photoFiles(); let pb = 0; for (const f of ph) { try { pb += fs.statSync(path.join(UP, f)).size; } catch (e) { /* diabaikan */ } }
  let dbb = 0; try { dbb = Number((await db.get('SELECT COALESCE(SUM(data_length+index_length),0) AS n FROM information_schema.tables WHERE table_schema=?', [db.name])).n) || 0; } catch (e) { /* diabaikan */ }
  r.json({ dbBytes: dbb, photos: ph.length, photoBytes: pb });
}));
// Salinan seluruh tabel database (tanpa token login) sebagai JSON: dasar backup lengkap. Struktur tabel (DDL) ikut disimpan.
async function dumpDb() {
  const out = { format: 2, engine: 'mysql', created: new Date().toISOString(), tables: {} };
  for (const x of await db.all('SHOW TABLES')) {
    const t = Object.values(x)[0]; if (t === 'sessions') continue;
    const ddl = (await db.get('SHOW CREATE TABLE `' + t + '`'))['Create Table'];
    const columns = (await db.all('SHOW COLUMNS FROM `' + t + '`')).map(c => c.Field);
    const rows = (await db.all('SELECT * FROM `' + t + '`')).map(row => columns.map(c => row[c]));
    out.tables[t] = { ddl, columns, rows };
  }
  return out;
}
app.get('/api/backup/full', auth, only('admin'), async (q, r) => {
  try {
    const ph = photoFiles(); let total = 0;
    for (const f of ph) total += fs.statSync(path.join(UP, f)).size;
    if (total > 3.5e9) return r.status(413).json({ error: 'Total foto lebih dari 3,5 GB, terlalu besar untuk satu file ZIP. Salin folder data langsung.' });
    const dbBuf = Buffer.from(JSON.stringify(await dumpDb(), (k, v) => (v && v.type === 'Buffer' && Array.isArray(v.data)) ? { $b64: Buffer.from(v.data).toString('base64') } : v), 'utf8');
    const now = new Date(), p2 = n => String(n).padStart(2, '0');
    const stamp = `${now.getFullYear()}-${p2(now.getMonth() + 1)}-${p2(now.getDate())}-${p2(now.getHours())}${p2(now.getMinutes())}`;
    const info = `BACKUP LENGKAP PALAPA DENTISTS\r\nDibuat : ${now.toISOString()} (UTC)\r\nIsi    : database.json (seluruh tabel database MySQL: konten, akun admin, janji temu, chat) dan folder uploads/ (${ph.length} foto)\r\n\r\nCara memulihkan:\r\n 1. Hentikan server.\r\n 2. Jalankan:  node deploy/restore-full.js NAMA-FILE-INI.zip\r\n    (koneksi MySQL dan DATA_DIR dibaca dari file .env, lihat MIGRASI-MYSQL.md)\r\n 3. Jalankan server lagi.\r\n\r\nPERHATIAN: berkas ini memuat akun admin (password terenkripsi) dan data pasien. Simpan di tempat aman.\r\n`;
    const entries = [{ name: 'INFO.txt', data: Buffer.from(info, 'utf8'), deflate: true }, { name: 'database.json', data: dbBuf, deflate: true }];
    for (const f of ph) entries.push({ name: 'uploads/' + f, data: () => fs.readFileSync(path.join(UP, f)), deflate: false });
    r.set({ 'Content-Type': 'application/zip', 'Content-Disposition': `attachment; filename="palapa-backup-lengkap-${stamp}.zip"`, 'Cache-Control': 'no-store' });
    await streamZip(r, entries); r.end();
  } catch (e) {
    if (!r.headersSent) r.status(500).json({ error: 'Gagal membuat backup lengkap: ' + e.message }); else r.destroy();
  }
});

// Pengunjung mengirim permintaan janji (tersimpan di database, hanya admin yang bisa membaca)
app.post('/api/appointments', csrf, limiter(5, 3600e3), ah(async (q, r) => {
  const b = q.body || {}, s = (v, n) => String(v || '').slice(0, n);
  if (!s(b.name, 80).trim() || !s(b.phone, 30).trim()) return r.status(400).json({ error: 'Nama dan telepon wajib diisi' });
  const id = 'a' + Date.now().toString(36) + crypto.randomBytes(3).toString('hex');
  await db.run('INSERT INTO docs(col,id,data) VALUES(?,?,?)', ['appointments', id, JSON.stringify({ name: s(b.name, 80), phone: s(b.phone, 30), svc: s(b.svc, 80), date: s(b.date, 20), status: 'Baru', created: Date.now() })]);
  r.json({ ok: true });
}));

// Upload foto (JPG / PNG / WebP, maks 5 MB; tipe dicek dari isi file)
const up = multer({ storage: multer.memoryStorage(), limits: { fileSize: 200 * 1024 * 1024, files: 1 } });   // PDF katalog (admin) sampai 200 MB (batas pengaman memori); foto tetap 5 MB
app.post('/api/upload', auth, only('admin', 'blogger', 'pendaftaran'), csrf, up.single('file'), (q, r) => {
  const b = q.file && q.file.buffer; if (!b) return r.status(400).json({ error: 'File tidak ada' });
  let ext = null;
  if (b[0] === 0xFF && b[1] === 0xD8) ext = 'jpg';
  else if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))) ext = 'png';
  else if (b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP') ext = 'webp';
  else if (b.subarray(0, 5).toString() === '%PDF-') { if (q.role !== 'admin') return r.status(403).json({ error: 'PDF hanya boleh diunggah admin' }); ext = 'pdf'; }
  if (!ext) return r.status(400).json({ error: 'Hanya JPG, PNG, WebP, atau PDF (admin)' });
  if (ext !== 'pdf' && b.length > 5 * 1024 * 1024) return r.status(400).json({ error: 'Foto maksimal 5 MB' });
  const n = crypto.randomBytes(16).toString('hex') + '.' + ext;
  fs.writeFileSync(path.join(UP, n), b);
  r.json({ url: '/uploads/' + n });
});

// ---------- SEO: judul, deskripsi, keyphrase, Open Graph, dan data terstruktur untuk Google ----------
const SEO_DEF = {
  metaTitle: 'Palapa Dentists – Klinik Gigi Spesialis Pasar Minggu, Jakarta Selatan',
  metaDesc: 'Klinik gigi spesialis di Pasar Minggu, Jakarta Selatan: dokter berpengalaman, peralatan modern, suasana nyaman, dan bekerja sama dengan berbagai asuransi.',
  keyphrase: 'dokter gigi spesialis pasar minggu', keywords: '', ogimg: '', logoimg: '', addr: '', phone1: '', email: '', fb: '', ig: ''
};
const HX = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function siteBase(q) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/+$/, '');
  const h = q.get('host') || '';
  return /^[a-zA-Z0-9.-]+(:\d+)?$/.test(h) ? `${q.protocol}://${h}` : 'http://localhost';
}
async function seoBlock(q, ov, pth) {
  const row = await db.get("SELECT data FROM docs WHERE col='settings' AND id='site'");
  const S = Object.assign({}, SEO_DEF, row ? JSON.parse(row.data) : {}, ov || {});
  const base = siteBase(q), abs = u => !u ? '' : /^https?:\/\//.test(u) ? u : base + (u[0] === '/' ? '' : '/') + u;
  const img = abs(S.ogimg || S.logoimg || '/logo.png');
  const kw = [S.keyphrase, S.keywords].filter(Boolean).join(', ');
  const ld = { '@context': 'https://schema.org', '@type': 'Dentist', name: 'Palapa Dentists', url: base + '/', description: S.metaDesc, image: img };
  { const ph = (!S.phone1 || isOldPhone(S.phone1)) ? '081281116662' : S.phone1; ld.telephone = String(ph).replace(/[\s-]+/g, '').replace(/^0/, '+62'); }
  if (S.email) ld.email = S.email;
  if (S.addr) ld.address = { '@type': 'PostalAddress', streetAddress: S.addr, addressCountry: 'ID' };
  if (kw) ld.keywords = kw;
  const same = [S.fb, S.ig].filter(u => /^https?:\/\//.test(u || '')); if (same.length) ld.sameAs = same;
  return `<!--SEO--><title>${HX(S.metaTitle)}</title>
<meta name="description" content="${HX(S.metaDesc)}">
${kw ? `<meta name="keywords" content="${HX(kw)}">\n` : ''}<link rel="canonical" href="${HX(base)}${pth || '/'}">
<meta property="og:type" content="website"><meta property="og:site_name" content="Palapa Dentists"><meta property="og:locale" content="id_ID">
<meta property="og:title" content="${HX(S.metaTitle)}"><meta property="og:description" content="${HX(S.metaDesc)}"><meta property="og:image" content="${HX(img)}"><meta property="og:url" content="${HX(base)}${pth || '/'}">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>${((ov && ov.__ld) || []).map(o => `\n<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`).join('')}
<!--/SEO-->`;
}
// Tautan promo yang enak dibagikan: /promo/ID  (judul, ringkasan, dan gambar promo muncul di pratinjau WhatsApp/Facebook)
app.get('/promo/:id', async (q, r, next) => {
  try {
    const id = q.params.id; if (!ID.test(id)) return next();
    const row = await db.get("SELECT data FROM docs WHERE col='promos' AND id=?", [id]);
    const p = row ? JSON.parse(row.data) : null;
    const html = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');
    const ov = p && p.status !== 'Draft' ? { metaTitle: `${p.title} – Palapa Dentists`, metaDesc: String(p.text || '').replace(/\{nama\}/g, 'Bapak/Ibu').replace(/\{nama_klinik\}/g, 'Palapa Dentists').replace(/\{[a-z_]+\}/g, '').replace(/\*\*/g, '').replace(/^\s*([-*•]|\d{1,3}[.)])\s+/gm, '').replace(/\s+/g, ' ').trim().slice(0, 155), ogimg: p.img || '', keyphrase: '', keywords: '' } : null;
    const blk = await seoBlock(q, ov, '/promo/' + id), out = html.replace(/<!--SEO-->[\s\S]*?<!--\/SEO-->/, () => blk);
    r.set({ 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' }).send(out);
  } catch (e) { next(); }
});
// Halaman FAQ yang terindeks Google: /faq (data terstruktur FAQPage + isi dasar untuk pratinjau)
app.get('/faq', async (q, r, next) => {
  try {
    const rows = (await db.all("SELECT data FROM docs WHERE col='faq'")).map(x => JSON.parse(x.data)).filter(x => x.status !== 'Sembunyi' && x.q && x.a).sort((a, b) => Number(a.ord || 0) - Number(b.ord || 0)).slice(0, 50);
    const s = Object.assign({ phone1: '081281116662', wa1: '081116613026', wa2: '081281116662', wd: '09:00 - 21:00', we: '08:00 - 21:00', addr: '', email: '', web: '' }, JSON.parse((await db.get("SELECT data FROM docs WHERE col='settings' AND id='site'") || { data: '{}' }).data));
    const base = siteBase(q), V = { nama_klinik: 'Palapa Dentists', alamat: s.addr, telepon: s.phone1, whatsapp1: s.wa1, whatsapp2: s.wa2, email: s.email, website: s.web, jam_kerja: `Senin–Jumat ${s.wd}, Sabtu–Minggu ${s.we}`, jam_senin_jumat: s.wd, jam_sabtu_minggu: s.we, link_kontrol: base + '/#/kontrol' };
    const ld = rows.length ? [{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: rows.map(x => ({ '@type': 'Question', name: x.q, acceptedAnswer: { '@type': 'Answer', text: String(x.a).replace(/\{([a-z_0-9]+)\}/gi, (m, k) => (V[k] != null ? V[k] : m)).replace(/\*\*/g, '') } })) }] : [];
    const html = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');
    const blk = await seoBlock(q, { metaTitle: 'FAQ – Pertanyaan yang Sering Ditanyakan | Palapa Dentists', metaDesc: 'Jawaban atas pertanyaan yang sering ditanyakan pasien Palapa Dentists: jam buka, janji temu, asuransi, biaya, dan perawatan gigi.', keyphrase: '', keywords: '', __ld: ld }, '/faq'), out = html.replace(/<!--SEO-->[\s\S]*?<!--\/SEO-->/, () => blk);
    r.set({ 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' }).send(out);
  } catch (e) { next(); }
});
app.get(['/', '/index.html'], async (q, r, next) => {
  try {
    const html = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');
    const blk = await seoBlock(q), out = html.replace(/<!--SEO-->[\s\S]*?<!--\/SEO-->/, () => blk);
    r.set({ 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' }).send(out);
  } catch (e) { next(); }
});
app.use('/uploads', express.static(UP, { maxAge: '7d', index: false, dotfiles: 'deny' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use((e, q, r, n) => {
  if (e && (e.sqlState || /^(ER_|PROTOCOL_|ECONN|ETIMEDOUT)/.test(String(e.code || '')))) { console.error('Kesalahan database:', e.message); return r.status(503).json({ error: 'Database sedang bermasalah, coba lagi sebentar.' }); }
  r.status(e.status === 413 ? 413 : 400).json({ error: q.path.startsWith('/api/backup') ? 'File backup rusak, bukan format JSON, atau lebih dari 100 MB.' : e.code === 'LIMIT_FILE_SIZE' ? 'Ukuran file terlalu besar' : 'Permintaan tidak valid' });
});
const HOST = process.env.HOST || '0.0.0.0';
let server;
startup().then(() => Promise.all(PENDING)).then(() => {
  server = app.listen(PORT, HOST, () => console.log(`Palapa Dentists berjalan di http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT} (database MySQL: ${db.name})`));
}).catch(e => { console.error('\nServer GAGAL dimulai: ' + e.message + '\n'); process.exit(1); });
// Saat dihentikan, tutup koneksi database dengan rapi
async function shutdown() { try { if (server) server.close(); await db.close(); } catch (e) { /* tetap keluar */ } process.exit(0); }
['SIGINT', 'SIGTERM', 'SIGBREAK'].forEach(sg => process.on(sg, shutdown));
