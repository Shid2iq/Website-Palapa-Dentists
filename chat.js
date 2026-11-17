// ---------- Chat pasien <-> bagian pendaftaran (tanpa WhatsApp) ----------
// Bot menjawab pertanyaan umum di sisi browser (dari data website). Server hanya menyimpan percakapan
// yang pasien minta "dihubungkan ke pendaftaran", supaya admin bisa membalas dari dashboard.
// Versi MySQL: semua akses database memakai async/await.
const crypto = require('crypto');

const ENG = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';
const BIN = 'CHARACTER SET utf8mb4 COLLATE utf8mb4_bin';
// Struktur tabel (dipakai juga oleh skrip migrasi). Aman dijalankan berulang.
async function schema(db) {
  await db.exec(`CREATE TABLE IF NOT EXISTS chats(
    id VARCHAR(64) ${BIN} NOT NULL, tokh VARCHAR(64) NOT NULL, name VARCHAR(255) NULL, phone VARCHAR(40) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'menunggu', created BIGINT NULL, updated BIGINT NULL, seen BIGINT NOT NULL DEFAULT 0,
    PRIMARY KEY(id), KEY chats_updated(updated)) ${ENG};
  CREATE TABLE IF NOT EXISTS chat_msgs(
    id BIGINT NOT NULL AUTO_INCREMENT, chat VARCHAR(64) ${BIN} NOT NULL, who VARCHAR(20) NOT NULL, \`by\` VARCHAR(100) NULL, text TEXT NOT NULL, ts BIGINT NOT NULL,
    PRIMARY KEY(id), KEY chat_msgs_chat(chat,id)) ${ENG}`);
}

module.exports = function (app, db, { auth, csrf, limiter, siteBase }) {
  const ready = schema(db);
  const ah = f => (q, r, n) => Promise.resolve(f(q, r, n)).catch(n);

  // ----- Template pesan otomatis (diatur admin di menu Template Chatbot; kosong = pakai bawaan, kecuali auto_balas/akhir = nonaktif) -----
  const DEF = {
    terhubung: 'Percakapan dihubungkan ke bagian pendaftaran.',
    auto_balas: '',
    akhir: 'Terima kasih sudah menghubungi {nama_klinik}, {nama}! 😊\nJika masih ada pertanyaan, Anda bisa memulai chat baru kapan saja.\n\n{promo_aktif}\nSampai jumpa di klinik kami 🦷'
  };
  const OPTIONAL = new Set(['auto_balas', 'akhir']);
  // Nilai bawaan (sama dengan halaman Pengaturan Website) dipakai bila admin belum pernah menyimpan pengaturan
  const SDEF = { phone1: '081281116662', wa1: '081116613026', wa2: '081281116662', wd: '09:00 - 21:00', we: '08:00 - 21:00', addr: 'Jl. Palapa 1 No.4 Pasar Minggu, Jakarta 12520, Indonesia', email: 'reception@palapadentists.com', web: 'palapadentists.com' };
  const settings = async () => { try { const r = await db.get("SELECT data FROM docs WHERE col='settings' AND id='site'"); const s = r ? JSON.parse(r.data) : {}; const o = Object.assign({}, SDEF); for (const k of Object.keys(s)) if (s[k] !== '' && s[k] != null) o[k] = s[k]; const dd = String(o.phone1 || '').replace(/\D/g, '').replace(/^(62|0)/, ''); if (['217806291', '2129048890', '2129048891'].includes(dd)) o.phone1 = SDEF.phone1; return o; } catch (e) { return Object.assign({}, SDEF); } };
  async function promoLines(base) {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const L = (await db.all("SELECT id,data FROM docs WHERE col='promos'")).map(x => ({ id: x.id, ...JSON.parse(x.data) }))
        .filter(p => p.status === 'Aktif' && (p.kind || 'Promo') === 'Promo' && (!p.until || p.until >= today)).slice(0, 3);
      return L.length ? '🎁 Promo saat ini:\n' + L.map(p => '• ' + p.title + (base ? ' → ' + base + '/promo/' + p.id : '')).join('\n') + '\n' : '';
    } catch (e) { return ''; }
  }
  async function tpl(key, extra, q) {
    let t = DEF[key];
    try { const r = await db.get("SELECT data FROM docs WHERE col='bottpl' AND id=?", [key]); if (r) { const x = JSON.parse(r.data).text; if (typeof x === 'string') t = (OPTIONAL.has(key) || x.trim()) ? x : DEF[key]; } } catch (e) { }
    if (!t || !String(t).trim()) return '';
    const s = await settings(), base = q && siteBase ? siteBase(q) : '';
    const v = Object.assign({ nama_klinik: 'Palapa Dentists', alamat: s.addr || '', telepon: s.phone1 || '', whatsapp1: s.wa1 || '', whatsapp2: s.wa2 || '', email: s.email || '', website: s.web || '',
      jam_kerja: 'Senin–Jumat ' + (s.wd || '09:00 - 21:00') + ', Sabtu–Minggu ' + (s.we || '08:00 - 21:00'), promo_aktif: await promoLines(base), link_promo: base ? base + '/promo' : '' }, extra || {});
    return String(t).replace(/\{([a-z_0-9]+)\}/gi, (m, k) => (v[k] != null ? String(v[k]) : m)).replace(/\n{3,}/g, '\n\n').trim().slice(0, 1000);
  }

  const sha = s => crypto.createHash('sha256').update(String(s)).digest('hex');
  const str = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').slice(0, n);
  const CID = /^c[a-z0-9]{6,30}$/;
  const PHONE = /^[0-9+\-\s()]{6,20}$/;
  // c = db atau koneksi transaksi
  const addMsg = async (c, chat, who, by, text) => (await c.run('INSERT INTO chat_msgs(chat,who,`by`,text,ts) VALUES(?,?,?,?,?)', [chat, who, by, text, Date.now()])).lastInsertRowid;
  const touch = id => db.run('UPDATE chats SET updated=? WHERE id=?', [Date.now(), id]);
  const afterId = q => Math.max(0, parseInt(q.query.after, 10) || 0);
  const pub = m => ({ id: m.id, who: m.who, by: m.by || undefined, text: m.text, ts: m.ts });

  // Pasien hanya boleh membuka percakapan miliknya sendiri: id + token rahasia (disimpan di browser pasien)
  const visitor = ah(async (q, r, n) => {
    const id = q.params.id, tok = q.get('x-chat-token') || '';
    const row = CID.test(id) && tok ? await db.get('SELECT * FROM chats WHERE id=?', [id]) : null;
    const a = row && Buffer.from(row.tokh), b = Buffer.from(sha(tok));
    if (!row || a.length !== b.length || !crypto.timingSafeEqual(a, b)) return r.status(404).json({ error: 'Percakapan tidak ditemukan' });
    q.chat = row; n();
  });

  // ----- Pemberitahuan langsung ke dashboard (Server-Sent Events) -----
  // Browser memperlambat timer pada tab yang tersembunyi; dengan ini dashboard diberi tahu seketika saat ada pesan pasien.
  const sse = new Set();
  const ping = () => { for (const r of sse) { try { r.write('event: chat\ndata: 1\n\n'); } catch (e) { sse.delete(r); } } };
  app.get('/api/chats/stream', auth, (q, r) => {
    if (sse.size >= 100) return r.status(503).json({ error: 'Terlalu banyak sambungan' });
    r.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' });
    r.flushHeaders(); r.write('retry: 5000\n\n'); sse.add(r);
    const hb = setInterval(() => { try { r.write(': ping\n\n'); } catch (e) { clearInterval(hb); sse.delete(r); } }, 25000);
    q.on('close', () => { clearInterval(hb); sse.delete(r); });
  });

  // ----- Pasien -----
  app.post('/api/chat/start', csrf, limiter(10, 3600e3), ah(async (q, r) => {
    const b = q.body || {}, name = str(b.name, 60).trim(), phone = str(b.phone, 20).trim(), text = str(b.text, 1000).trim();
    if (!name) return r.status(400).json({ error: 'Nama wajib diisi' });
    if (!PHONE.test(phone)) return r.status(400).json({ error: 'Nomor telepon tidak valid' });
    const id = 'c' + Date.now().toString(36) + crypto.randomBytes(4).toString('hex'), token = crypto.randomBytes(24).toString('hex'), now = Date.now();
    const hub = await tpl('terhubung', { nama: name }, q), ab = await tpl('auto_balas', { nama: name }, q);
    await db.transaction(async t => {
      await t.run('INSERT INTO chats(id,tokh,name,phone,status,created,updated,seen) VALUES(?,?,?,?,?,?,?,0)', [id, sha(token), name, phone, 'menunggu', now, now]);
      if (hub) await addMsg(t, id, 'sys', null, hub);
      if (text) await addMsg(t, id, 'visitor', null, text);
      if (ab) await addMsg(t, id, 'admin', 'Otomatis', ab);
    });
    r.json({ id, token });
    ping();
  }));
  app.get('/api/chat/:id/msgs', visitor, ah(async (q, r) => {
    const rows = await db.all('SELECT * FROM chat_msgs WHERE chat=? AND id>? ORDER BY id LIMIT 200', [q.chat.id, afterId(q)]);
    r.json({ status: q.chat.status, msgs: rows.map(pub) });
  }));
  app.post('/api/chat/:id/msg', csrf, visitor, limiter(60, 600e3), ah(async (q, r) => {
    if (q.chat.status === 'selesai') return r.status(409).json({ error: 'Percakapan sudah ditutup' });
    const text = str((q.body || {}).text, 1000).trim();
    if (!text) return r.status(400).json({ error: 'Pesan kosong' });
    const id = await addMsg(db, q.chat.id, 'visitor', null, text); await touch(q.chat.id);
    r.json({ ok: true, id });
    ping();
  }));
  const closeChat = async (q, by) => {
    if (q.chat.status === 'selesai') return;
    const fin = await tpl('akhir', { nama: q.chat.name }, q);
    await db.transaction(async t => {
      await t.run("UPDATE chats SET status='selesai' WHERE id=?", [q.chat.id]);
      await addMsg(t, q.chat.id, 'sys', null, by);
      if (fin) await addMsg(t, q.chat.id, 'admin', 'Otomatis', fin);
      await t.run('UPDATE chats SET updated=? WHERE id=?', [Date.now(), q.chat.id]);
    });
  };
  app.post('/api/chat/:id/close', csrf, visitor, ah(async (q, r) => { await closeChat(q, 'Percakapan diakhiri oleh pasien.'); r.json({ ok: true }); }));

  // ----- Admin (harus login) -----
  app.get('/api/chats', auth, ah(async (q, r) => {
    const rows = await db.all(`SELECT c.*,
      (SELECT COUNT(*) FROM chat_msgs m WHERE m.chat=c.id AND m.who='visitor' AND m.id>c.seen) AS unread,
      (SELECT text FROM chat_msgs m WHERE m.chat=c.id AND m.who!='sys' ORDER BY m.id DESC LIMIT 1) AS last_text
      FROM chats c ORDER BY (c.status='selesai'), c.updated DESC LIMIT 200`);
    r.json(rows.map(c => ({ id: c.id, name: c.name, phone: c.phone, status: c.status, created: c.created, updated: c.updated, unread: Number(c.unread) || 0, last: (c.last_text || '').slice(0, 80) })));
  }));
  const adminChat = ah(async (q, r, n) => { const row = CID.test(q.params.id) && await db.get('SELECT * FROM chats WHERE id=?', [q.params.id]); if (!row) return r.status(404).json({ error: 'Percakapan tidak ditemukan' }); q.chat = row; n(); });
  app.get('/api/chats/:id/msgs', auth, adminChat, ah(async (q, r) => {
    const rows = await db.all('SELECT * FROM chat_msgs WHERE chat=? AND id>? ORDER BY id LIMIT 500', [q.chat.id, afterId(q)]);
    const mx = Number((await db.get('SELECT COALESCE(MAX(id),0) m FROM chat_msgs WHERE chat=?', [q.chat.id])).m) || 0;
    await db.run('UPDATE chats SET seen=? WHERE id=? AND seen<?', [mx, q.chat.id, mx]);
    r.json({ chat: { id: q.chat.id, name: q.chat.name, phone: q.chat.phone, status: q.chat.status }, msgs: rows.map(pub) });
  }));
  app.post('/api/chats/:id/msg', auth, csrf, adminChat, ah(async (q, r) => {
    if (q.chat.status === 'selesai') return r.status(409).json({ error: 'Percakapan sudah ditutup' });
    const text = str((q.body || {}).text, 1000).trim();
    if (!text) return r.status(400).json({ error: 'Pesan kosong' });
    await addMsg(db, q.chat.id, 'admin', q.user, text);
    await db.run("UPDATE chats SET status='aktif', updated=? WHERE id=?", [Date.now(), q.chat.id]);
    r.json({ ok: true });
  }));
  app.post('/api/chats/:id/close', auth, csrf, adminChat, ah(async (q, r) => { await closeChat(q, 'Percakapan ditutup oleh pendaftaran.'); r.json({ ok: true }); }));
  app.delete('/api/chats/:id', auth, csrf, adminChat, ah(async (q, r) => {
    await db.transaction(async t => { await t.run('DELETE FROM chat_msgs WHERE chat=?', [q.chat.id]); await t.run('DELETE FROM chats WHERE id=?', [q.chat.id]); });
    r.json({ ok: true });
  }));

  // Percakapan berisi nama dan nomor telepon pasien: hapus otomatis setelah 90 hari tidak aktif
  const purge = async () => { try { const old = Date.now() - 90 * 864e5; await db.run('DELETE FROM chat_msgs WHERE chat IN (SELECT id FROM chats WHERE updated<?)', [old]); await db.run('DELETE FROM chats WHERE updated<?', [old]); } catch (e) { } };
  setInterval(purge, 12 * 3600e3).unref();
  return ready.then(purge);   // server menunggu tabel siap sebelum membuka port
};
module.exports.schema = schema;
