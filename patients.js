// Data pasien untuk recall (pengingat kontrol).
// Hanya menyimpan data minimum: kode rekam medis, nama, kontak, tanggal lahir, kunjungan terakhir, jarak kontrol, persetujuan.
// TIDAK ada catatan medis. Akses petugas: admin dan pendaftaran. Penghapusan: hanya admin.
// Versi MySQL: semua akses database memakai async/await.
const crypto = require('crypto');

const ENG = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';
// Struktur tabel (dipakai juga oleh skrip migrasi). Aman dijalankan berulang.
async function schema(db) {
  await db.exec(`CREATE TABLE IF NOT EXISTS patients(
    id VARCHAR(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL, rm VARCHAR(30) NOT NULL, name VARCHAR(255) NOT NULL, phone VARCHAR(40) NULL, email VARCHAR(255) NULL, dob VARCHAR(10) NULL,
    last_visit VARCHAR(10) NULL, interval_m INT NULL DEFAULT 6, consent TINYINT NULL DEFAULT 0, consent_at BIGINT NULL, consent_by VARCHAR(100) NULL,
    stop TINYINT NULL DEFAULT 0, contacted BIGINT NULL, contacted_by VARCHAR(100) NULL, created BIGINT NULL, created_by VARCHAR(100) NULL, updated BIGINT NULL, updated_by VARCHAR(100) NULL,
    PRIMARY KEY(id), UNIQUE KEY patients_rm(rm), KEY patients_name(name)) ${ENG};
  CREATE TABLE IF NOT EXISTS patient_log(
    id BIGINT NOT NULL AUTO_INCREMENT, pid VARCHAR(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL, ts BIGINT NULL, \`by\` VARCHAR(100) NULL, channel VARCHAR(20) NULL, result VARCHAR(30) NULL, note VARCHAR(255) NULL,
    PRIMARY KEY(id), KEY pl_pid(pid)) ${ENG}`);
}

module.exports = function (app, db, { chatAuth, auth, only, csrf, limiter }) {
  const ready = schema(db);
  const ah = f => (q, r, n) => Promise.resolve(f(q, r, n)).catch(n);

  // ---------- tanggal (hanya tanggal, zona WIB) ----------
  const today = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
  const validDate = s => {
    if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    const d = new Date(s + 'T00:00:00Z'); return !isNaN(d) && d.toISOString().slice(0, 10) === s;
  };
  const addMonths = (s, m) => {
    const [y, mo, d] = s.split('-').map(Number); const t = new Date(Date.UTC(y, mo - 1 + m, 1));
    const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
    t.setUTCDate(Math.min(d, last)); return t.toISOString().slice(0, 10);
  };
  const diffDays = (a, b) => Math.round((Date.parse(a + 'T00:00:00Z') - Date.parse(b + 'T00:00:00Z')) / 864e5);
  const dueOf = p => (p.last_visit && validDate(p.last_visit)) ? addMonths(p.last_visit, p.interval_m || 6) : null;

  // ---------- pembersihan masukan ----------
  const clean = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
  const normRm = v => clean(v, 30).toUpperCase();
  const RM_OK = /^[A-Z0-9][A-Z0-9./-]{0,29}$/;
  const EMAIL_OK = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
  function parse(b, partial) {
    const o = {}, err = [];
    if (!partial || b.rm !== undefined) { const rm = normRm(b.rm); if (!RM_OK.test(rm)) err.push('Kode RM wajib diisi (huruf, angka, titik, garis, atau garis miring; maksimal 30 karakter)'); else o.rm = rm; }
    if (!partial || b.name !== undefined) { const n = clean(b.name, 80); if (!n) err.push('Nama wajib diisi'); else o.name = n; }
    if (b.phone !== undefined) { const p = clean(b.phone, 20); if (p && p.replace(/\D/g, '').length < 8) err.push('Nomor telepon tidak valid'); else o.phone = p; }
    if (b.email !== undefined) { const e = clean(b.email, 100).toLowerCase(); if (e && !EMAIL_OK.test(e)) err.push('Email tidak valid'); else o.email = e; }
    if (b.dob !== undefined) { const d = clean(b.dob, 10); if (d && (!validDate(d) || d > today())) err.push('Tanggal lahir tidak valid'); else o.dob = d; }
    if (b.last_visit !== undefined) { const d = clean(b.last_visit, 10); if (d && (!validDate(d) || d > today())) err.push('Tanggal kunjungan terakhir tidak valid (tidak boleh di masa depan)'); else o.last_visit = d; }
    if (b.interval_m !== undefined) { const m = parseInt(b.interval_m, 10); if (!(m >= 1 && m <= 60)) err.push('Jarak kontrol harus 1 sampai 60 bulan'); else o.interval_m = m; }
    if (b.consent !== undefined) o.consent = b.consent ? 1 : 0;
    return { o, err };
  }
  const ID = () => crypto.randomBytes(6).toString('hex');
  const view = p => ({
    id: p.id, rm: p.rm, name: p.name, phone: p.phone || '', email: p.email || '', dob: p.dob || '', last_visit: p.last_visit || '', interval_m: p.interval_m || 6,
    due: dueOf(p), consent: !!p.consent, consent_at: p.consent_at || null, consent_by: p.consent_by || '', stop: !!p.stop, contacted: p.contacted || null, contacted_by: p.contacted_by || '', updated: p.updated || null
  });
  const addLog = (pid, by, channel, result, note) => db.run('INSERT INTO patient_log(pid,ts,`by`,channel,result,note) VALUES(?,?,?,?,?,?)', [pid, Date.now(), by, channel, result, note || '']);
  const getP = id => db.get('SELECT * FROM patients WHERE id=?', [id]);

  // ---------- petugas (admin + pendaftaran) ----------
  app.get('/api/patients', chatAuth, ah(async (q, r) => r.json((await db.all('SELECT * FROM patients ORDER BY name LIMIT 20000')).map(view))));

  app.post('/api/patients', chatAuth, csrf, ah(async (q, r) => {
    const { o, err } = parse(q.body || {}, false); if (err.length) return r.status(400).json({ error: err[0] });
    const ex = await db.get('SELECT name FROM patients WHERE rm=?', [o.rm]);
    if (ex) return r.status(409).json({ error: 'Kode RM ' + o.rm + ' sudah terdaftar atas nama ' + ex.name });
    const id = ID(), now = Date.now(), consent = o.consent ? 1 : 0;
    await db.run('INSERT INTO patients(id,rm,name,phone,email,dob,last_visit,interval_m,consent,consent_at,consent_by,created,created_by,updated,updated_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [id, o.rm, o.name, o.phone || '', o.email || '', o.dob || '', o.last_visit || '', o.interval_m || 6, consent, consent ? now : null, consent ? q.user : null, now, q.user, now, q.user]);
    r.json(view(await getP(id)));
  }));

  app.put('/api/patients/:id', chatAuth, csrf, ah(async (q, r) => {
    const p = await getP(q.params.id); if (!p) return r.status(404).json({ error: 'Pasien tidak ditemukan' });
    const { o, err } = parse(q.body || {}, true); if (err.length) return r.status(400).json({ error: err[0] });
    if (o.rm && o.rm !== p.rm) { const ex = await db.get('SELECT name FROM patients WHERE rm=? AND id!=?', [o.rm, p.id]); if (ex) return r.status(409).json({ error: 'Kode RM ' + o.rm + ' sudah terdaftar atas nama ' + ex.name }); }
    const n = Object.assign({}, p, o);
    if (o.consent !== undefined && o.consent !== p.consent) { n.consent_at = o.consent ? Date.now() : null; n.consent_by = o.consent ? q.user : null; }
    if (q.body && q.body.stop !== undefined) n.stop = q.body.stop ? 1 : 0;
    await db.run('UPDATE patients SET rm=?,name=?,phone=?,email=?,dob=?,last_visit=?,interval_m=?,consent=?,consent_at=?,consent_by=?,stop=?,updated=?,updated_by=? WHERE id=?',
      [n.rm, n.name, n.phone || '', n.email || '', n.dob || '', n.last_visit || '', n.interval_m || 6, n.consent ? 1 : 0, n.consent_at || null, n.consent_by || null, n.stop ? 1 : 0, Date.now(), q.user, p.id]);
    r.json(view(await getP(p.id)));
  }));

  app.post('/api/patients/:id/visit', chatAuth, csrf, ah(async (q, r) => {
    const p = await getP(q.params.id); if (!p) return r.status(404).json({ error: 'Pasien tidak ditemukan' });
    const d = (q.body && q.body.date) ? String(q.body.date) : today(); if (!validDate(d) || d > today()) return r.status(400).json({ error: 'Tanggal kunjungan tidak valid' });
    await db.run('UPDATE patients SET last_visit=?,updated=?,updated_by=? WHERE id=?', [d, Date.now(), q.user, p.id]);
    await addLog(p.id, q.user, 'langsung', 'sudah_kontrol', 'Kunjungan ' + d);
    r.json(view(await getP(p.id)));
  }));

  const CH = ['telepon', 'email', 'whatsapp', 'sms', 'langsung', 'lainnya'], RS = ['dihubungi', 'akan_datang', 'tidak_diangkat', 'menolak', 'berhenti', 'sudah_kontrol'];
  app.post('/api/patients/:id/log', chatAuth, csrf, ah(async (q, r) => {
    const p = await getP(q.params.id); if (!p) return r.status(404).json({ error: 'Pasien tidak ditemukan' });
    const b = q.body || {}, channel = CH.includes(b.channel) ? b.channel : 'lainnya', result = RS.includes(b.result) ? b.result : 'dihubungi', note = clean(b.note, 120);
    await addLog(p.id, q.user, channel, result, note);
    await db.run('UPDATE patients SET contacted=?,contacted_by=?,updated=?,updated_by=? WHERE id=?', [Date.now(), q.user, Date.now(), q.user, p.id]);
    if (result === 'berhenti') await db.run('UPDATE patients SET stop=1 WHERE id=?', [p.id]);
    if (result === 'sudah_kontrol') await db.run('UPDATE patients SET last_visit=? WHERE id=?', [today(), p.id]);
    r.json(view(await getP(p.id)));
  }));

  app.get('/api/patients/:id/log', chatAuth, ah(async (q, r) => r.json(await db.all('SELECT ts,`by`,channel,result,note FROM patient_log WHERE pid=? ORDER BY id DESC LIMIT 20', [q.params.id]))));

  app.delete('/api/patients/:id', auth, only('admin'), csrf, ah(async (q, r) => {
    await db.transaction(async t => { await t.run('DELETE FROM patient_log WHERE pid=?', [q.params.id]); await t.run('DELETE FROM patients WHERE id=?', [q.params.id]); });
    r.json({ ok: true });
  }));

  // Impor massal (CSV diurai di browser). Persetujuan TIDAK diisi lewat impor; petugas mencatatnya sendiri saat pasien setuju.
  app.post('/api/patients/import', chatAuth, csrf, ah(async (q, r) => {
    const rows = Array.isArray(q.body && q.body.rows) ? q.body.rows : null, upd = !!(q.body && q.body.update);
    if (!rows) return r.status(400).json({ error: 'Data impor tidak valid' });
    if (rows.length > 5000) return r.status(400).json({ error: 'Maksimal 5000 baris per impor' });
    let added = 0, updated = 0, skipped = 0; const errors = [];
    await db.transaction(async t => {
      for (let i = 0; i < rows.length; i++) {
        const { o, err } = parse(Object.assign({}, rows[i], { consent: undefined }), false);
        if (err.length) { skipped++; if (errors.length < 20) errors.push({ row: i + 1, msg: err[0] }); continue; }
        const ex = await t.get('SELECT * FROM patients WHERE rm=?', [o.rm]), now = Date.now();
        if (!ex) {
          await t.run('INSERT INTO patients(id,rm,name,phone,email,dob,last_visit,interval_m,consent,created,created_by,updated,updated_by) VALUES(?,?,?,?,?,?,?,?,0,?,?,?,?)',
            [ID(), o.rm, o.name, o.phone || '', o.email || '', o.dob || '', o.last_visit || '', o.interval_m || 6, now, q.user, now, q.user]); added++;
        } else if (upd) {
          const n = Object.assign({}, ex); for (const k of ['name', 'phone', 'email', 'dob', 'last_visit', 'interval_m']) if (o[k] !== undefined && o[k] !== '') n[k] = o[k];
          await t.run('UPDATE patients SET name=?,phone=?,email=?,dob=?,last_visit=?,interval_m=?,updated=?,updated_by=? WHERE id=?', [n.name, n.phone || '', n.email || '', n.dob || '', n.last_visit || '', n.interval_m || 6, now, q.user, ex.id]); updated++;
        } else skipped++;
      }
    });
    r.json({ added, updated, skipped, errors });
  }));

  // ---------- publik: pasien mengecek jadwal kontrol (tanpa akun) ----------
  // Pengamanan: kode RM + tanggal lahir, batas percobaan per IP dan per kode RM, jawaban gagal selalu sama, dan hanya data minimum yang dikembalikan.
  const fails = new Map();
  const locked = k => { const f = fails.get(k); if (!f) return false; if (Date.now() - f.t > 3600e3) { fails.delete(k); return false; } return f.n >= 5; };
  const fail = k => { const f = fails.get(k) || { n: 0, t: Date.now() }; f.n++; fails.set(k, f); };
  setInterval(() => { const now = Date.now(); for (const [k, f] of fails) if (now - f.t > 3600e3) fails.delete(k); }, 600e3).unref();
  const NOTFOUND = 'Data tidak ditemukan. Periksa kode RM dan tanggal lahir, atau hubungi pendaftaran.';
  async function verify(q, r) {
    const rm = normRm(q.body && q.body.rm), dob = clean(q.body && q.body.dob, 10), key = rm || '-';
    if (locked(key)) { r.status(429).json({ error: 'Terlalu banyak percobaan untuk kode ini. Coba lagi nanti atau hubungi pendaftaran.' }); return null; }
    const p = RM_OK.test(rm) && validDate(dob) ? await db.get('SELECT * FROM patients WHERE rm=?', [rm]) : null;
    if (!p || !p.dob || p.dob !== dob) { fail(key); r.status(404).json({ error: NOTFOUND }); return null; }
    fails.delete(key); return p;
  }
  app.post('/api/recall/check', csrf, limiter(15, 10 * 60e3), ah(async (q, r) => {
    const p = await verify(q, r); if (!p) return;
    const due = dueOf(p), first = String(p.name).split(' ')[0];
    const state = p.stop ? 'berhenti' : !due ? 'tanpa' : diffDays(due, today()) < 0 ? 'terlambat' : diffDays(due, today()) <= 30 ? 'segera' : 'aman';
    r.json({ first: first.charAt(0).toUpperCase() + first.slice(1).toLowerCase(), last_visit: p.last_visit || '', due: due || '', days: due ? diffDays(due, today()) : null, state, stop: !!p.stop });
  }));
  app.post('/api/recall/stop', csrf, limiter(15, 10 * 60e3), ah(async (q, r) => {
    const p = await verify(q, r); if (!p) return;
    await db.run('UPDATE patients SET stop=1,updated=? WHERE id=?', [Date.now(), p.id]); await addLog(p.id, 'pasien (website)', 'lainnya', 'berhenti', '');
    r.json({ ok: true });
  }));
  return ready;   // server menunggu tabel siap sebelum membuka port
};
module.exports.schema = schema;
