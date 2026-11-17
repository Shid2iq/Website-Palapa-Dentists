/* Chat Palapa Dentists: bot FAQ untuk pasien + "Hubungkan ke pendaftaran" + panel balasan di dashboard admin.
   Dimuat setelah script utama di index.html, memakai fungsi/variabel globalnya (esc, api, toast, D, st, data, dp, route, adm, VIEW, render). */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  window.WIDGET_VER = '2026-10-21-r7';
  var LS = 'palapaChat';
  function store(v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(LS) || 'null'); if (v === null) localStorage.removeItem(LS); else localStorage.setItem(LS, JSON.stringify(v)); } catch (e) { } return null; }
  function hm(ts) { var d = new Date(ts), p = function (n) { return (n < 10 ? '0' : '') + n; }, t = p(d.getHours()) + ':' + p(d.getMinutes()); return new Date().toDateString() === d.toDateString() ? t : p(d.getDate()) + '/' + p(d.getMonth() + 1) + ' ' + t; }
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function nearBottom(e) { return e.scrollHeight - e.scrollTop - e.clientHeight < 80; }
  function beep() { try { var C = window.AudioContext || window.webkitAudioContext, c = new C(), o = c.createOscillator(), g = c.createGain(); o.connect(g); g.connect(c.destination); o.frequency.value = 880; g.gain.setValueAtTime(.15, c.currentTime); g.gain.exponentialRampToValueAtTime(.001, c.currentTime + .35); o.start(); o.stop(c.currentTime + .36); } catch (e) { } }

  /* ====================== CSS ====================== */
  var css = document.createElement('style');
  css.textContent = [
    '#cw{position:fixed;right:18px;bottom:calc(18px + env(safe-area-inset-bottom,0px));z-index:900;font-family:Inter,system-ui,sans-serif}',
    '#cwb{width:60px;height:60px;border-radius:50%;border:0;background:var(--navy);color:#fff;font-size:26px;cursor:pointer;box-shadow:0 8px 24px rgba(13,33,80,.35);position:relative}',
    '#cwb:hover{transform:translateY(-2px)}#cwb .dot{position:absolute;top:-2px;right:-2px;min-width:20px;height:20px;border-radius:10px;background:var(--red);color:#fff;font:700 11px/20px Inter,sans-serif;padding:0 5px}',
    '#cwp{position:absolute;right:0;bottom:72px;width:370px;max-width:calc(100vw - 24px);height:560px;max-height:calc(100vh - 110px);background:var(--card);color:var(--text);border:1px solid var(--line);border-radius:22px;box-shadow:0 18px 50px rgba(13,33,80,.28);display:flex;flex-direction:column;overflow:hidden}',
    '#cwp[hidden]{display:none}',
    '.cwh{background:var(--navy);color:#fff;padding:14px 16px;display:flex;align-items:center;gap:10px}.cwh b{display:block;font:800 16px "Bricolage Grotesque",Inter,sans-serif}.cwh small{opacity:.75;font-size:12px}.cwh .sp{flex:1}',
    '.cwh a,.cwh button{background:rgba(255,255,255,.14);color:#fff;border:0;border-radius:999px;width:34px;height:34px;font-size:16px;cursor:pointer;display:grid;place-items:center;text-decoration:none}',
    '#cwm{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:8px;background:var(--bg)}',
    '.cwi{max-width:84%;padding:9px 13px;border-radius:16px;font-size:14px;line-height:1.45;white-space:pre-wrap;word-wrap:break-word}',
    '.cwi.bot,.cwi.staff{background:var(--card);border:1px solid var(--line);border-bottom-left-radius:4px;align-self:flex-start}',
    '.cwi.me{background:var(--blue);color:#fff;border-bottom-right-radius:4px;align-self:flex-end}',
    '.cwi small{display:block;font-size:10.5px;opacity:.65;margin-top:3px}.cwi .by{font-weight:600;font-size:11px;color:var(--blue);display:block;margin-bottom:2px}',
    '.cwo{align-self:flex-start;max-width:92%;background:var(--card);border:1.5px solid var(--lime);border-radius:16px;padding:11px 13px;font-size:13.5px;line-height:1.5}.cwo .ot{display:block;white-space:pre-wrap}.cwo .oa{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px}.cwo .oa a,.cwo .oa button{border:1.5px solid var(--blue);color:var(--blue);background:transparent;border-radius:999px;padding:5px 11px;font:600 12px Inter,sans-serif;cursor:pointer;text-decoration:none}.cwo .oa button.y{background:var(--lime);border-color:var(--lime);color:#14270a}.cwo .od{font-size:12px;color:var(--mute);font-weight:600}',
    '.cws{align-self:center;font-size:12px;color:var(--mute);text-align:center;padding:4px 10px;background:var(--soft);border-radius:999px;max-width:92%}',
    '#cwq{display:flex;flex-wrap:wrap;gap:6px;padding:8px 12px;border-top:1px solid var(--line);background:var(--card)}#cwq:empty{display:none}',
    '#cwq button{border:1.5px solid var(--blue);color:var(--blue);background:transparent;border-radius:999px;padding:6px 12px;font:600 12.5px Inter,sans-serif;cursor:pointer}#cwq button.pri{background:var(--lime);border-color:var(--lime);color:#14270a}',
    '#cwf,#cwh{display:flex;gap:8px;padding:10px 12px;border-top:1px solid var(--line);background:var(--card)}',
    '#cwf input,#cwh input,#cwh textarea{flex:1;min-width:0;border:1.5px solid var(--line);border-radius:12px;padding:10px 12px;font:14px Inter,sans-serif;background:var(--bg);color:var(--text)}',
    '#cwf button,#cwh button.go{border:0;border-radius:12px;background:var(--navy);color:#fff;padding:0 16px;font:700 14px Inter,sans-serif;cursor:pointer}#cwf button:disabled{opacity:.5}',
    '#cwh{flex-direction:column}#cwh label{font-size:12px;color:var(--mute);display:grid;gap:4px}#cwh .row{display:flex;gap:8px}#cwh .row button{flex:1;padding:11px}#cwh button.go{background:var(--lime);color:#14270a}#cwh button.x{border:1.5px solid var(--line);background:transparent;color:var(--text);border-radius:12px;font:600 14px Inter,sans-serif;cursor:pointer}',
    '#cwe{color:var(--red);font-size:12px;min-height:0}',
    '@media(max-width:480px){#cwp{position:fixed;right:8px;left:8px;bottom:calc(88px + env(safe-area-inset-bottom,0px));width:auto;max-width:none;height:calc(100vh - 130px)}}',
    /* admin */
    '.chx{display:grid;grid-template-columns:320px 1fr;gap:16px;height:calc(100vh - 190px);min-height:420px}@media(max-width:900px){.chx{grid-template-columns:1fr;height:auto}}',
    '.chl,.chc{background:var(--card);border:1px solid var(--line);border-radius:22px;overflow:hidden;display:flex;flex-direction:column}.chl{overflow-y:auto}',
    '.chi{display:block;width:100%;text-align:left;border:0;border-bottom:1px solid var(--line);background:transparent;color:var(--text);padding:13px 16px;cursor:pointer;font:14px Inter,sans-serif}.chi:hover,.chi.on{background:var(--soft)}',
    '.chi b{display:flex;justify-content:space-between;gap:8px}.chi span.l{display:block;color:var(--mute);font-size:12.5px;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.chi em{font-style:normal;font-size:11px;color:var(--mute)}',
    '.chb,.chn{display:inline-block;min-width:20px;height:20px;border-radius:10px;background:var(--red);color:#fff;font:700 11px/20px Inter,sans-serif;padding:0 6px;text-align:center;margin-left:6px}',
    '.chs{font-size:11px;font-weight:700;border-radius:999px;padding:2px 8px;background:var(--soft);color:var(--blue)}.chs.w{background:#fff1c9;color:#8a5a00}.chs.d{background:var(--line);color:var(--mute)}',
    '.chc .hd{padding:14px 18px;border-bottom:1px solid var(--line);display:flex;gap:10px;align-items:center;flex-wrap:wrap}.chc .hd .sp{flex:1}.chc .hd b{font-size:16px}',
    '.chc .ms{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:8px;background:var(--bg);min-height:240px}',
    '.chc form{display:flex;gap:8px;padding:12px;border-top:1px solid var(--line)}.chc form textarea{flex:1;border:1.5px solid var(--line);border-radius:12px;padding:10px 12px;font:14px Inter,sans-serif;resize:none;background:var(--bg);color:var(--text)}',
    '.chc .ph{flex:1;display:grid;place-items:center;color:var(--mute);padding:30px;text-align:center}'
  ].join('\n');
  document.head.appendChild(css);

  /* ====================== WIDGET PASIEN ====================== */
  var W = { ai: null, aiHist: [], offers: [], interest: '', open: false, id: null, token: null, last: 0, status: null, msgs: [], bot: [], form: false, unread: 0, sending: false, n: 0 };
  var box = el('div'); box.id = 'cw';
  box.innerHTML = '<div id="cwp" hidden role="dialog" aria-label="Chat Palapa Dentists"><div class="cwh"><div><b>Palapa Dentists</b><small id="cwst">Asisten virtual &amp; pendaftaran</small></div><span class="sp"></span><a id="cwtel" href="#" title="Telepon klinik" aria-label="Telepon klinik">📞</a><button id="cwx" aria-label="Tutup chat">✕</button></div><div id="cwm" aria-live="polite"></div><div id="cwq"></div><div id="cwfoot"></div></div><button id="cwb" aria-label="Buka chat">💬</button>';
  document.body.appendChild(box);

  function S() { try { return st(); } catch (e) { return {}; } }
  function tel() { return String(S().phone1 || '').replace(/[^0-9+]/g, ''); }

  function addBot(text, acts) { W.bot.push({ who: 'bot', text: text, acts: acts || [] }); }
  var MENU = [['📅 Jadwal dokter', 'jadwal'], ['🦷 Layanan', 'layanan'], ['🏥 Asuransi', 'asuransi'], ['🕒 Jam buka & lokasi', 'jam'], ['📝 Buat janji', 'janji'], ['🗓️ Jadwal kontrol', 'kontrol'], ['❓ FAQ', 'faq'], ['💬 Hubungi pendaftaran', 'staff']];
  function menu() { var m = MENU.slice(); if (typeof activePromos === 'function' && activePromos().length) m.splice(4, 0, ['🎁 Promo', 'promo']); return m; }
  /* ----- tawaran promo di chat (kata kunci diatur admin di menu Promo; teks diatur di Template Chatbot) ----- */
  var PM_RE = /\n?\[\[promo:([A-Za-z0-9_-]{1,40})\]\]\s*$/;
  var CARDK = 'pa_cards';
  function cards() { try { return JSON.parse(localStorage.getItem(CARDK) || '{}'); } catch (e) { return {}; } }
  function setCard(k, v) { try { var c = cards(); c[k] = v; localStorage.setItem(CARDK, JSON.stringify(c)); } catch (e) { } }
  var OFFKEY = 'pa_offered', MAXOFF = 2;
  // Riwayat tawaran: percakapan bot hanya di memori (hilang saat halaman dimuat ulang, sama seperti isi chat bot); chat langsung disimpan per percakapan.
  function offered() { if (W.id) { try { return JSON.parse(localStorage.getItem('pa_off_' + W.id) || '[]'); } catch (e) { return []; } } return W.offBot || []; }
  function markOffered(id) { if (W.id) { try { var l = offered(); l.push(id); localStorage.setItem('pa_off_' + W.id, JSON.stringify(l)); } catch (e) { } } else (W.offBot = W.offBot || []).push(id); }
  // Halaman pasien tidak punya polling seperti dashboard; promo dan template diambil ulang agar perubahan admin langsung dipakai.
  function freshPromos(force) {
    if (!force && Date.now() - (W.pf || 0) < 1500) return Promise.resolve(); W.pf = Date.now();
    return Promise.all(['promos', 'bottpl'].map(function (c) { return fetch('/api/col/' + c, { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (l) { if (l && typeof D !== 'undefined') D[c] = l; }); })).catch(function () { });
  }
  function promoById(id) { return (data('promos') || []).filter(function (p) { return p.id === id; })[0]; }
  function addOffer(p, txt) {
    markOffered(p.id); var o = { who: 'offer', promoId: p.id, text: txt, state: 'open' };
    if (W.id) W.offers.push({ at: W.msgs.length, o: o }); else W.bot.push(o);
  }
  function maybeOffer(v) {
    if (typeof promoMatch !== 'function' || offered().length >= MAXOFF) return;
    if ((typeof isUrgent === 'function' && isUrgent(v)) || intent(v) === 'keluhan') return;
    var m = promoMatch(v, offered()); if (!m) return;
    var txt = botT('tawaran_promo', offerVars(m.p)); if (txt) addOffer(m.p, txt);
  }
  async function generalOffer() {
    await freshPromos();
    if (typeof chatPromos !== 'function' || offered().length) return;
    var L = chatPromos(); if (!L.length) return; var p = L[Math.floor(Math.random() * L.length)];
    var txt = botT('tawaran_umum', offerVars(p)); if (txt) { addOffer(p, txt); if (W.open) renderPanel(); else { W.unread++; setBadge(); } }
  }
  function offerCard(o) {
    var d = el('div', 'cwo'); if (o.staff) d.appendChild(el('span', 'by', 'Pendaftaran')); d.appendChild(el('span', 'ot', o.text)); var a = el('div', 'oa');
    if (o.state === 'open') {
      var l = el('a', '', '🎁 Lihat promo'); l.href = '/promo/' + o.promoId; l.target = '_blank'; l.rel = 'noopener'; a.appendChild(l);
      var y = el('button', 'y', '✅ Saya tertarik'); y.dataset.act = 'offer-yes'; y.dataset.p = o.promoId; if (o.msgId) y.dataset.m = o.msgId; a.appendChild(y);
      var n = el('button', '', 'Tidak, terima kasih'); n.dataset.act = 'offer-no'; n.dataset.p = o.promoId; if (o.msgId) n.dataset.m = o.msgId; a.appendChild(n);
    } else a.appendChild(el('span', 'od', '✔ Diteruskan ke pendaftaran'));
    d.appendChild(a); return d;
  }
  function findOffer(id) {
    var all = W.bot.filter(function (x) { return x.who === 'offer'; }).concat(W.offers.map(function (z) { return z.o; }));
    return all.filter(function (o) { return o.promoId === id && o.state === 'open'; })[0];
  }
  function offerAct(yes, id, msgId) {
    if (msgId) {   // kartu yang dikirim petugas
      setCard(msgId, yes ? 'yes' : 'no'); var pp = promoById(id);
      if (yes) { var tx = pp ? botT('tawaran_minat', offerVars(pp)) : 'Saya tertarik dengan promo yang dikirim'; W.skipOffer = true; renderPanel(); sendLive(tx); } else renderPanel();
      return;
    }
    var o = findOffer(id), p = promoById(id); if (!o || !p) return;
    if (!yes) { o.state = 'no'; renderPanel(); return; }
    o.state = 'yes'; var txt = botT('tawaran_minat', offerVars(p));
    if (W.id) { renderPanel(); W.skipOffer = true; sendLive(txt); return; }
    W.bot.push({ who: 'me', text: txt }); addBot(botT('tawaran_lanjut', offerVars(p))); W.interest = txt; W.form = true; renderPanel();
  }

  /* ----- Asisten AI (jawaban dari server; kunci API tidak pernah ada di browser) ----- */
  var EMERG = /darurat|gawat|(per|pen)darahan hebat|darah (tidak|ga|gak|nggak|belum) (mau )?(berhenti|henti)|(wajah|pipi|leher|mata|bibir|lidah|rahang)[^.!?]{0,25}bengkak|bengkak[^.!?]{0,30}(wajah|pipi|leher|mata|menyebar|sulit|demam)|demam (tinggi|dan bengkak)|sulit (menelan|bernapas|napas|buka mulut)|sesak|pingsan|kecelakaan|patah (rahang|tulang)|nyeri hebat|sakit (banget|sekali|parah)/i;
  function isEmergency(t) { return EMERG.test(String(t || '')); }
  var RULEI = { jadwal: 1, layanan: 1, asuransi: 1, jam: 1, janji: 1, kontrol: 1, promo: 1, biaya: 1, faq: 1 };
  function loadAI() {
    if (W.aiLoaded) return; W.aiLoaded = true;
    fetch('/api/ai/status', { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      if (!j) return; W.ai = j; window.AIINFO = j;
      if (j.on && !W.id && W.bot.length === 1 && W.bot[0].who === 'bot' && !W.aiGreeted) { W.aiGreeted = true; W.bot[0].text = botT('sapaan_ai'); W.bot[0].acts = menu(); }
      if (W.open) renderPanel();
    }).catch(function () { });
  }
  function afterAnswer(v) { freshPromos().then(function () { if (W.id) return; var n0 = W.bot.length; maybeOffer(v); if (W.bot.length !== n0) renderPanel(); }); }
  function userSay(v) {
    var it = intent(v), useAI = W.ai && W.ai.on && !isEmergency(v) && it !== 'staff' && !(RULEI[it] && v.length <= 40);
    if (!useAI) { answer(it, v); renderPanel(); afterAnswer(v); return; }
    askAI(v, it);
  }
  async function askAI(v, it) {
    W.bot.push({ who: 'bot', text: 'Sedang mengetik…', typing: true, acts: [] }); renderPanel();
    try {
      var r = await fetch('/api/ai/chat', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Req': '1' }, credentials: 'same-origin', body: JSON.stringify({ messages: W.aiHist.concat([{ role: 'user', content: v }]).slice(-10) }) });
      var j = await r.json().catch(function () { return {}; });
      W.bot = W.bot.filter(function (x) { return !x.typing; });
      if (!r.ok) throw j;
      W.aiHist.push({ role: 'user', content: v }, { role: 'assistant', content: j.reply }); W.aiHist = W.aiHist.slice(-10);
      W.bot.push({ who: 'bot', ai: true, text: j.reply, acts: j.handoff ? [['💬 Hubungi pendaftaran', 'staff'], ['📝 Buat janji', 'janji'], ['📅 Jadwal dokter', 'jadwal']] : menu() });
      renderPanel(); afterAnswer(v);
    } catch (e) {
      W.bot = W.bot.filter(function (x) { return !x.typing; });
      if (e && (e.code === 'off' || e.code === 'limit')) W.ai.on = false;
      addBot('Maaf, asisten AI sedang tidak tersedia. Berikut jawaban otomatis kami:'); answer(it, v); renderPanel(); afterAnswer(v);
    }
  }
  function greet() { addBot(botT('sapaan'), menu()); }

  function schedText(onlyToday) {
    var D7 = window.DAYS || ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'], today = D7[(new Date().getDay() + 6) % 7];
    var l = data('schedule').slice().sort(function (a, b) { return D7.indexOf(a.day) - D7.indexOf(b.day); });
    if (onlyToday) l = l.filter(function (x) { return x.day === today; });
    if (!l.length) return botT('jadwal_kosong');
    var lines = l.map(function (x) { return '• ' + x.day + ' ' + x.start + '–' + x.end + ' · ' + x.spec + '\n   ' + x.doctor; }).join('\n');
    return onlyToday ? botT('jadwal_hari_ini', { hari: today, daftar_jadwal: lines }) : botT('jadwal', { daftar_jadwal: lines });
  }
  function answer(a, raw) {
    var s = S();
    if (a === 'jadwal') addBot(schedText(/hari ini/i.test(raw || '')), [['💬 Hubungi pendaftaran', 'staff'], ['📝 Buat janji', 'janji']]);
    else if (a === 'layanan') { var n = dp().map(function (x) { return x[0]; }); addBot(n.length ? botT('layanan', { daftar_layanan: n.map(function (x) { return '• ' + x; }).join('\n') }) : 'Silakan hubungi pendaftaran untuk info layanan.', [['💬 Hubungi pendaftaran', 'staff'], ['📅 Jadwal dokter', 'jadwal']]); }
    else if (a === 'asuransi') { var ins = data('insurances').map(function (x) { return x.name; }).filter(Boolean); addBot(ins.length ? botT('asuransi', { daftar_asuransi: ins.map(function (x) { return '• ' + x; }).join('\n') }) : 'Silakan tanyakan daftar asuransi ke pendaftaran.', [['💬 Hubungi pendaftaran', 'staff']]); }
    else if (a === 'jam') addBot(botT('jam'), [['📅 Jadwal dokter', 'jadwal'], ['💬 Hubungi pendaftaran', 'staff']]);
    else if (a === 'janji') addBot(botT('janji'), [['Buka formulir janji', 'form'], ['💬 Hubungi pendaftaran', 'staff']]);
    else if (a === 'faq') addBot(botT('faq'), [['💬 Hubungi pendaftaran', 'staff']]);
    else if (a === 'kontrol') addBot(botT('kontrol'), [['💬 Hubungi pendaftaran', 'staff'], ['📝 Buat janji', 'janji']]);
    else if (a === 'promo') addBot(activePromos().length ? botT('promo') : botT('promo_kosong'), [['💬 Hubungi pendaftaran', 'staff'], ['📝 Buat janji', 'janji']]);
    else if (a === 'biaya') addBot(botT('biaya'), [['💬 Hubungi pendaftaran', 'staff']]);
    else if (a === 'keluhan') addBot(botT('keluhan'), [['💬 Hubungi pendaftaran', 'staff'], ['📅 Jadwal dokter', 'jadwal']]);
    else if (a === 'form') { location.hash = '#/contact'; if (window.innerWidth < 600) closePanel(); }
    else if (a === 'staff') { W.form = true; addBot(botT('hubungkan')); }
    else { var fq = typeof faqMatch === 'function' ? faqMatch(raw) : null; if (fq) addBot(botFill(fq.a) + '\n\nLihat semua pertanyaan: ' + location.origin + '/faq', menu()); else addBot(botT('tidak_paham'), menu()); }
  }
  function intent(t) {
    t = t.toLowerCase();
    if (/darurat|gawat|berdarah|pendarahan|perdarahan|bengkak|demam|nyeri hebat|sakit (banget|sekali|parah)|kecelakaan|patah/.test(t)) return 'keluhan';
    if (/pendaftaran|petugas|operator|resepsionis|admin|manusia|orang asli|cs\b|customer service/.test(t)) return 'staff';
    if (/\bfaq\b|pertanyaan (umum|yang sering|sering)/.test(t)) return 'faq';
    if (/kontrol|recall|rekam medis|\brm\b|no\.? ?rm/.test(t)) return 'kontrol';
    if (/promo|diskon|potongan|penawaran|voucher/.test(t)) return 'promo';
    if (/biaya|harga|tarif|berapa/.test(t)) return 'biaya';
    if (/janji|booking|reservasi|daftar|antrian|antrean/.test(t)) return 'janji';
    if (/asuransi|bpjs|cashless|polis|inhealth|prudential|allianz/.test(t)) return 'asuransi';
    if (/jadwal|dokter|praktek|praktik/.test(t)) return 'jadwal';
    if (/jam|buka|tutup|alamat|lokasi|dimana|di mana|peta|telepon|telp/.test(t)) return 'jam';
    if (/layanan|perawatan|scaling|karang gigi|behel|kawat|tambal|cabut|implan|veneer|saluran akar|gigi palsu|anak/.test(t)) return 'layanan';
    return null;
  }

  function renderPanel() {
    var m = $('cwm'), keep = nearBottom(m) || !m.childNodes.length, q = $('cwq'), foot = $('cwfoot'), live = !!W.id;
    m.innerHTML = '';
    var list = live ? W.msgs : W.bot;
    var staffCards = {}; if (live) W.msgs.forEach(function (x) { if (x.who === 'admin') { var q = PM_RE.exec(x.text); if (q) staffCards[q[1]] = 1; } });   // kartu dari petugas menggantikan tawaran otomatis untuk promo yang sama
    function drawOffers(pos) { W.offers.forEach(function (z) { if (z.at === pos && z.o.state !== 'no' && !staffCards[z.o.promoId]) m.appendChild(offerCard(z.o)); }); }
    if (live) drawOffers(0);
    list.forEach(function (x, ix) {
      if (x.who === 'offer') { if (x.state !== 'no') m.appendChild(offerCard(x)); return; }
      if (live && x.who === 'admin') {
        var pm = PM_RE.exec(x.text);
        if (pm) { var ck = W.id + ':' + x.id, stc = cards()[ck]; if (stc !== 'no') { if (offered().indexOf(pm[1]) < 0) markOffered(pm[1]); m.appendChild(offerCard({ who: 'offer', promoId: pm[1], text: x.text.replace(PM_RE, ''), state: stc === 'yes' ? 'yes' : 'open', msgId: ck, staff: true })); } drawOffers(ix + 1); return; }
      }
      if (x.who === 'sys') { m.appendChild(el('div', 'cws', x.text)); if (live) drawOffers(ix + 1); return; }
      var cls = live ? (x.who === 'visitor' ? 'me' : 'staff') : (x.who === 'me' ? 'me' : 'bot'), b = el('div', 'cwi ' + cls);
      if (live && x.who === 'admin') b.appendChild(el('span', 'by', 'Pendaftaran'));
      if (!live && x.ai) b.appendChild(el('span', 'by', '🤖 ' + ((W.ai && W.ai.name) || 'Asisten AI')));
      if (x.typing) b.classList.add('typ');
      b.appendChild(document.createTextNode(x.text));
      if (live) b.appendChild(el('small', '', hm(x.ts)));
      m.appendChild(b);
      if (live) drawOffers(ix + 1);
    });
    q.innerHTML = '';
    if (!live && !W.form) {
      var last = W.bot.filter(function (x) { return x.who === 'bot'; }).slice(-1)[0];
      ((last && last.acts) || []).forEach(function (a) { var b = el('button', a[1] === 'staff' ? 'pri' : '', a[0]); b.dataset.act = a[1]; q.appendChild(b); });
    }
    if (live && W.status === 'menunggu') m.appendChild(el('div', 'cws', botT('menunggu')));
    if (live && W.status !== 'selesai') { var eb = el('button', '', 'Akhiri percakapan'); eb.dataset.act = 'end'; q.appendChild(eb); }
    if (live && W.status === 'selesai') { var nb = el('button', '', '↻ Mulai percakapan baru'); nb.dataset.act = 'new'; q.appendChild(nb); }
    $('cwst').textContent = live ? (W.status === 'aktif' ? 'Terhubung dengan pendaftaran' : W.status === 'selesai' ? 'Percakapan ditutup' : 'Menunggu petugas pendaftaran…') : (W.ai && W.ai.on ? 'Asisten AI · info umum, bukan diagnosis' : 'Asisten virtual & pendaftaran');
    foot.innerHTML = '';
    if (!live && W.form) {
      foot.innerHTML = '<form id="cwh" autocomplete="on"><label>Nama<input name="name" maxlength="60" required autocomplete="name"></label><label>Nomor telepon<input name="phone" type="tel" maxlength="20" required autocomplete="tel" placeholder="08xxxxxxxxxx"></label><label>Pesan pertama (opsional)<textarea name="text" rows="2" maxlength="1000"></textarea></label><div id="cwe"></div><div class="row"><button type="button" class="x" data-act="cancel">Batal</button><button class="go" type="submit">Mulai chat</button></div></form>';
    } else if (live && W.status === 'selesai') { /* tidak ada input */ }
    else foot.innerHTML = '<form id="cwf"><input name="t" maxlength="1000" autocomplete="off" placeholder="' + (live ? 'Tulis pesan untuk pendaftaran…' : 'Tanya jadwal, layanan, asuransi…') + '" aria-label="Pesan"><button>Kirim</button></form>';
    if (!live && W.form && W.interest) { var ta = foot.querySelector('textarea[name=text]'); if (ta && !ta.value) ta.value = W.interest; }
    if (keep) m.scrollTop = m.scrollHeight;
  }
  function setBadge() { var b = $('cwb'), d = b.querySelector('.dot'); if (d) d.remove(); if (W.unread > 0) b.appendChild(el('span', 'dot', String(W.unread))); }
  function openPanel() { loadAI(); freshPromos(true).then(function () { if (W.open && !W.id && W.bot.length <= 1) { /* menu bot ikut menyesuaikan tombol Promo */ var g = W.bot[0]; if (g && g.acts) { g.acts = menu(); renderPanel(); } } }); W.open = true; W.unread = 0; $('cwp').hidden = false; setBadge(); if (!W.id && !W.bot.length) greet(); $('cwtel').href = tel() ? 'tel:' + tel() : '#'; $('cwtel').style.display = tel() ? '' : 'none'; renderPanel(); if (W.id) pollLive(); var i = $('cwp').querySelector('input[name=t],input[name=name]'); if (i && window.innerWidth > 600) i.focus(); }
  window.openChat = function () { if (!W.open) openPanel(); };
  function closePanel() { W.open = false; $('cwp').hidden = true; }

  async function pollLive() {
    if (!W.id || W.busy) return; W.busy = true;
    try {
      var r = await fetch('/api/chat/' + W.id + '/msgs?after=' + W.last, { headers: { 'X-Chat-Token': W.token }, credentials: 'same-origin' });
      if (r.status === 404) { store(null); W.id = null; W.token = null; W.msgs = []; W.last = 0; W.status = null; if (W.open) renderPanel(); return; }
      if (!r.ok) return;
      var j = await r.json(), changed = j.status !== W.status, fresh = j.msgs || [];
      W.status = j.status;
      if (fresh.length) { fresh.forEach(function (x) { W.msgs.push(x); W.last = Math.max(W.last, x.id); }); if (!W.open) { var staff = fresh.filter(function (x) { return x.who === 'admin'; }).length; if (staff) { W.unread += staff; setBadge(); beep(); } } }
      if ((fresh.length || changed) && W.open) renderPanel();
    } catch (e) { } finally { W.busy = false; }
  }
  setInterval(function () { if (!W.id || document.hidden) return; if (W.status === 'selesai' && !W.open) return; if (W.open || ++W.n % 5 === 0) pollLive(); }, 3000);

  async function sendLive(text) {
    if (W.sending || !text.trim()) return; W.sending = true;
    var btn = $('cwf') && $('cwf').querySelector('button'); if (btn) btn.disabled = true;
    try {
      var r = await fetch('/api/chat/' + W.id + '/msg', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Req': '1', 'X-Chat-Token': W.token }, body: JSON.stringify({ text: text }) });
      var j = await r.json().catch(function () { return {}; });
      if (!r.ok) toast(j.error || 'Pesan gagal terkirim'); else { await pollLive(); if (!W.skipOffer) { await freshPromos(); maybeOffer(text); } W.skipOffer = false; }
    } catch (e) { toast('Koneksi bermasalah, coba lagi'); }
    W.sending = false; renderPanel(); var i = $('cwf') && $('cwf').querySelector('input'); if (i) i.focus();
  }
  async function startLive(f) {
    var err = $('cwe'), btn = f.querySelector('button.go'); btn.disabled = true; err.textContent = '';
    try {
      var ctx = W.bot.filter(function (x) { return x.who === 'me'; }).map(function (x) { return x.text; }).slice(-3).join(' | '), first = f.elements.text.value.trim();
      var j = await api('POST', '/api/chat/start', { name: f.elements.name.value, phone: f.elements.phone.value, text: first || (ctx ? 'Topik sebelumnya di bot: ' + ctx : '') });
      W.id = j.id; W.token = j.token; W.last = 0; W.msgs = []; W.offers = []; W.status = 'menunggu'; W.form = false; store({ id: j.id, token: j.token });
      var wasInterest = !!W.interest; W.interest = ''; (W.offBot || []).forEach(markOffered); W.offBot = [];
      await pollLive(); if (!wasInterest) { await freshPromos(); maybeOffer(first); } renderPanel();
      setTimeout(function () { if (W.id && W.status === 'menunggu') generalOffer(); }, 7000);
    } catch (e) { err.textContent = e.msg || 'Gagal memulai chat, coba lagi'; btn.disabled = false; }
  }

  box.addEventListener('click', function (e) {
    var t = e.target.closest('button,a'); if (!t) return;
    if (t.id === 'cwb') { W.open ? closePanel() : openPanel(); return; }
    if (t.id === 'cwx') { closePanel(); return; }
    var a = t.dataset.act; if (!a) return;
    if (a === 'offer-yes' || a === 'offer-no') { offerAct(a === 'offer-yes', t.dataset.p, t.dataset.m); return; }
    if (a === 'cancel') { W.form = false; W.interest = ''; renderPanel(); return; }
    if (a === 'end') { if (W.id && confirm('Akhiri percakapan dengan pendaftaran?')) { fetch('/api/chat/' + W.id + '/close', { method: 'POST', credentials: 'same-origin', headers: { 'X-Req': '1', 'X-Chat-Token': W.token } }).then(pollLive); } return; }
    if (a === 'new') { store(null); W.id = null; W.token = null; W.msgs = []; W.last = 0; W.status = null; W.bot = []; W.offers = []; W.offBot = []; W.interest = ''; greet(); renderPanel(); return; }
    W.bot.push({ who: 'me', text: t.textContent }); answer(a); renderPanel();
  });
  box.addEventListener('submit', function (e) {
    var f = e.target; e.preventDefault();
    if (f.id === 'cwh') { startLive(f); return; }
    if (f.id === 'cwf') {
      var v = f.elements.t.value.trim(); if (!v) return; f.elements.t.value = '';
      if (W.id) { sendLive(v); return; }
      W.bot.push({ who: 'me', text: v }); userSay(v);
    }
  });

  var saved = store(); if (saved && saved.id && saved.token) { W.id = saved.id; W.token = saved.token; pollLive(); }

  /* ====================== PANEL ADMIN ====================== */
  var CH = { list: [], cur: null, curInfo: null, last: 0, unread: -1, draft: '', loaded: false };
  window.chatV = function () { return '<div class="top"><div><h1>Chat Pendaftaran</h1><p>Balas pasien yang meminta dihubungkan ke pendaftaran. Halaman ini memperbarui diri otomatis.</p></div></div><div class="chx"><div class="chl" id="chl"></div><div class="chc" id="chc"></div></div>'; };
  function onChat() { return typeof adm !== 'undefined' && adm && route().p === 'admin' && typeof VIEW !== 'undefined' && VIEW === 'chat' && $('chl'); }
  function badge() {
    var b = document.querySelector('.side button[data-id="chat"]'); if (!b) return;
    var o = b.querySelector('.chb'); if (o) o.remove();
    if (CH.unread > 0) b.appendChild(el('span', 'chb', String(CH.unread)));
  }
  function stLabel(s) { return s === 'menunggu' ? ['Menunggu', 'w'] : s === 'aktif' ? ['Aktif', ''] : ['Selesai', 'd']; }
  function drawList() {
    var L = $('chl'); if (!L) return; L.innerHTML = '';
    if (!CH.list.length) { L.appendChild(el('div', 'ph', CH.loaded ? 'Belum ada percakapan.' : 'Memuat…')); L.lastChild.style.cssText = 'padding:30px;color:var(--mute);text-align:center'; return; }
    CH.list.forEach(function (c) {
      var b = el('button', 'chi' + (c.id === CH.cur ? ' on' : '')), s = stLabel(c.status);
      b.dataset.ch = 'open'; b.dataset.id = c.id;
      var h = el('b'); h.appendChild(el('span', '', c.name)); var r = el('span'); r.appendChild(el('span', 'chs ' + s[1], s[0])); if (c.unread) r.appendChild(el('span', 'chn', String(c.unread))); h.appendChild(r);
      b.appendChild(h); b.appendChild(el('span', 'l', (c.last || '(belum ada pesan)').replace(PM_RE, ''))); b.appendChild(el('em', '', c.phone + ' · ' + hm(c.updated)));
      L.appendChild(b);
    });
  }
  function drawConv() {
    var C = $('chc'); if (!C) return;
    if (!CH.cur || !CH.curInfo) { C.innerHTML = '<div class="ph">Pilih percakapan di sebelah kiri.</div>'; return; }
    var i = CH.curInfo, s = stLabel(i.status);
    C.innerHTML = '';
    var hd = el('div', 'hd'); hd.appendChild(el('b', '', i.name)); var a = el('a', '', '📞 ' + i.phone); a.href = 'tel:' + i.phone.replace(/[^0-9+]/g, ''); a.style.color = 'var(--blue)'; hd.appendChild(a); hd.appendChild(el('span', 'chs ' + s[1], s[0])); hd.appendChild(el('span', 'sp'));
    if (i.status !== 'selesai') { var cb = el('button', 'btn sm', 'Tutup percakapan'); cb.dataset.ch = 'close'; hd.appendChild(cb); }
    var db_ = el('button', 'btn sm red', 'Hapus'); db_.dataset.ch = 'del'; hd.appendChild(db_);
    C.appendChild(hd);
    var ms = el('div', 'ms'); ms.id = 'chm'; C.appendChild(ms);
    var sg = el('div', 'chsg'); sg.id = 'chsg'; C.appendChild(sg);
    if (i.status !== 'selesai') {
      var f = document.createElement('form'); f.id = 'chf';
      f.innerHTML = '<textarea name="t" rows="2" maxlength="1000" placeholder="Tulis balasan… (Enter kirim, Shift+Enter baris baru)"></textarea><button class="btn pb" type="button" data-ch="promo" title="Kirim promo ke pasien">🎁 Promo</button><button class="btn lime" type="submit">Kirim</button>';
      f.elements.t.value = CH.draft; C.appendChild(f);
    }
    (CH.msgs || []).forEach(addMsgEl); ms.scrollTop = ms.scrollHeight; drawSugg();
  }
  function visitorText() { return (CH.msgs || []).filter(function (x) { return x.who === 'visitor'; }).map(function (x) { return x.text; }).join(' '); }
  function sentPromoIds() { var o = []; (CH.msgs || []).forEach(function (x) { if (x.who === 'admin') { var m = PM_RE.exec(x.text); if (m) o.push(m[1]); } }); return o; }
  function drawSugg() {
    var sg = $('chsg'); if (!sg) return; sg.innerHTML = ''; sg.style.display = 'none';
    if (!CH.curInfo || CH.curInfo.status === 'selesai' || typeof promoMatch !== 'function') return;
    var vt = visitorText(); if (!vt || (typeof isUrgent === 'function' && isUrgent(vt))) return;
    var m = promoMatch(vt, sentPromoIds()); if (!m) return;
    sg.style.display = ''; sg.appendChild(el('span', '', '💡 Promo yang cocok dengan percakapan: ')); sg.appendChild(el('b', '', m.p.title)); sg.appendChild(el('span', 'hit', ' (kata: ' + m.hits.join(', ') + ')'));
    var b = el('button', 'btn sm lime', 'Kirim kartu'); b.dataset.ch = 'promosend'; b.dataset.id = m.p.id; sg.appendChild(b);
    var b2 = el('button', 'btn sm', 'Lihat semua promo'); b2.dataset.ch = 'promo'; sg.appendChild(b2);
  }
  function promoDialog() {
    if (!CH.curInfo) return; var d = $('dlg'); if (!d) return;
    var L = typeof activePromos === 'function' ? activePromos() : [], sent = sentPromoIds(), vt = visitorText(), urg = typeof isUrgent === 'function' && isUrgent(vt);
    var rows = L.map(function (p) { var sc = (!urg && typeof promoScore === 'function') ? promoScore(p, vt) : { score: 0, hits: [] }; return { p: p, sc: sc }; }).sort(function (a, b) { return b.sc.score - a.sc.score; });
    var h = '<div class="dd"><button class="x" data-a="close" aria-label="Tutup">✕</button><h2 style="margin-bottom:4px">Kirim promo ke ' + esc(CH.curInfo.name) + '</h2><span class="note">Kartu muncul di chat pasien dengan tombol Lihat promo dan Saya tertarik.</span>';
    if (!rows.length) h += '<p style="margin:18px 0 0;color:var(--mute)">Belum ada promo yang aktif. Admin bisa membuatnya di menu Promo (status Aktif).</p>';
    rows.forEach(function (r) {
      h += '<div class="prow"><div><b>' + esc(r.p.title) + '</b>' + (r.sc.score ? ' <span class="pill g">💡 Cocok</span>' : '') + (sent.indexOf(r.p.id) >= 0 ? ' <span class="pill">sudah dikirim</span>' : '') + '<p>' + esc(pitchOf(r.p)) + '</p><small style="color:var(--mute)">' + esc(untilTxt(r.p)) + '</small></div><div class="pa"><button class="btn sm lime" data-ch="promosend" data-id="' + esc(r.p.id) + '">🎁 Kirim kartu</button><button class="btn sm" data-ch="promoins" data-id="' + esc(r.p.id) + '">✏️ Isi ke balasan</button></div></div>';
    });
    d.innerHTML = h + '</div>'; d.showModal();
  }
  function promoText(p) { var t = botT('tawaran_petugas', offerVars(p)) || p.title; return t.slice(0, 900); }
  async function sendPromoCard(id) {
    var p = (typeof D !== 'undefined' ? D.promos : []).filter(function (x) { return x.id === id; })[0]; if (!p || !CH.cur) return;
    var d = $('dlg'); if (d && d.open) d.close();
    try { await api('POST', '/api/chats/' + CH.cur + '/msg', { text: promoText(p) + '\n[[promo:' + p.id + ']]' }); await loadCur(false); if (CH.curInfo && CH.curInfo.status !== 'aktif') await loadCur(true); drawSugg(); chatTick(); toast('Kartu promo terkirim ke pasien ✓'); }
    catch (x) { toast(x.msg || 'Gagal mengirim promo'); }
  }
  function insertPromo(id) {
    var p = (typeof D !== 'undefined' ? D.promos : []).filter(function (x) { return x.id === id; })[0]; if (!p) return;
    var d = $('dlg'); if (d && d.open) d.close();
    var t = document.querySelector('#chf textarea'); if (!t) return;
    var txt = promoText(p) + '\n' + promoUrl(p.id); t.value = (t.value ? t.value + '\n' : '') + txt; CH.draft = t.value; t.focus(); toast('Teks promo dimasukkan ke balasan. Edit lalu kirim.');
  }
  function addMsgEl(x) {
    var ms = $('chm'); if (!ms) return;
    if (x.who === 'sys') { ms.appendChild(el('div', 'cws', x.text)); return; }
    var b = el('div', 'cwi ' + (x.who === 'admin' ? 'me' : 'staff'));
    if (x.who === 'admin' && x.by) b.appendChild(el('span', 'by', x.by)), b.lastChild.style.color = '#dfe9ff';
    var pmm = x.who === 'admin' && PM_RE.exec(x.text);
    if (pmm) { b.appendChild(el('span', 'by', '🎁 Kartu promo dikirim')); b.lastChild.style.color = '#dfe9ff'; }
    b.appendChild(document.createTextNode(pmm ? x.text.replace(PM_RE, '') : x.text)); b.appendChild(el('small', '', hm(x.ts))); ms.appendChild(b);
  }
  async function loadCur(initial) {
    if (!CH.cur) return;
    try {
      var j = await api('GET', '/api/chats/' + CH.cur + '/msgs?after=' + (initial ? 0 : CH.last));
      if (CH.cur !== j.chat.id) return;
      var was = CH.curInfo && CH.curInfo.status; CH.curInfo = j.chat;
      if (initial) CH.msgs = [];
      var ms = $('chm'), stick = ms ? nearBottom(ms) : true, incoming = false;
      j.msgs.forEach(function (x) { CH.msgs.push(x); CH.last = Math.max(CH.last, x.id); if (!initial) { if (x.who === 'visitor') incoming = true; addMsgEl(x); } });
      if (initial || was !== j.chat.status) drawConv(); else { drawSugg(); if (ms && stick && j.msgs.length) ms.scrollTop = ms.scrollHeight; }
      if (incoming && document.hidden) beep();
    } catch (e) { if (e.code === 404) { CH.cur = null; CH.curInfo = null; drawConv(); } }
  }
  /* ====================== NOTIFIKASI PESAN BARU: popup + nada dering ====================== */
  var NT = { ctx: null, timer: null, prev: {}, first: true };
  function attending() { return !document.hidden && (typeof document.hasFocus !== 'function' || document.hasFocus()); }   // petugas benar-benar sedang melihat halaman ini
  function chatRole() { return typeof me !== 'undefined' && me && (me.role === 'admin' || me.role === 'pendaftaran'); }
  function soundOn() { try { return localStorage.getItem('palapaSound') !== '0'; } catch (e) { return true; } }
  function setSound(on) { try { localStorage.setItem('palapaSound', on ? '1' : '0'); } catch (e) { } }
  function ensureCtx() {
    if (!NT.ctx) { try { var C = window.AudioContext || window.webkitAudioContext; if (C) NT.ctx = new C(); } catch (e) { } }
    if (NT.ctx && NT.ctx.state === 'suspended') { try { NT.ctx.resume(); } catch (e) { } }
    return NT.ctx;
  }
  function tone(f, t0, dur, vol) {
    var c = NT.ctx; if (!c) return;
    var o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.value = f; o.connect(g); g.connect(c.destination);
    var t = c.currentTime + t0; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || .32, t + .02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.start(t); o.stop(t + dur + .02);
  }
  function ringOnce() { // "ding-dong" tiga kali
    if (!ensureCtx() || NT.ctx.state !== 'running') return false;
    [0, .62, 1.24].forEach(function (b) { tone(784, b, .24); tone(659, b + .27, .3); });
    return true;
  }
  function stopRing() { if (NT.timer) { clearInterval(NT.timer); NT.timer = null; } }
  function startRing(loop) {
    if (!soundOn()) return; ringOnce(); if (loop === false || NT.timer) return;
    var n = 0; NT.timer = setInterval(function () { if (++n >= 10 || !soundOn()) return stopRing(); ringOnce(); }, 3200);   // berulang ±30 detik atau sampai popup ditutup
  }
  function ntHide() { stopRing(); var n = $('nt'); if (n) n.remove(); }
  function ntShow(fresh, tot) {
    var n = $('nt'); if (!n) { n = el('div'); n.id = 'nt'; n.setAttribute('role', 'alert'); document.body.appendChild(n); }
    var c = fresh[0], many = fresh.length > 1; n.innerHTML = '';
    var h = el('div', 'h'); h.appendChild(el('span', 'bell', '🔔')); h.appendChild(el('span', '', many ? 'Pesan baru dari ' + fresh.length + ' pasien' : 'Pesan baru dari ' + c.name)); n.appendChild(h);
    n.appendChild(el('p', '', many ? fresh.map(function (x) { return x.name; }).slice(0, 4).join(', ') + (fresh.length > 4 ? ', …' : '') : (c.last || 'Pasien ingin dihubungi.')));
    n.appendChild(el('small', '', tot + ' pesan belum dibaca · ' + c.phone));
    var a = el('div', 'acts'), o = el('button', 'btn lime', 'Buka chat'); o.dataset.ch = 'ntopen'; o.dataset.id = c.id; o.type = 'button';
    var x = el('button', 'btn gh', 'Tutup'); x.dataset.ch = 'ntclose'; x.type = 'button'; a.appendChild(o); a.appendChild(x); n.appendChild(a);
  }
  function desktopNotify(c) {
    if (!('Notification' in window) || Notification.permission !== 'granted' || attending()) return;
    try { var nn = new Notification('Pesan baru dari ' + c.name, { body: c.last || 'Pesan baru dari pasien', tag: 'palapa-chat', renotify: true }); nn.onclick = function () { window.focus(); nn.close(); }; } catch (e) { }
  }
  function setTitle(tot) { if (route().p === 'admin') document.title = (tot > 0 ? '(' + tot + ') 💬 ' : '') + 'Admin – Palapa Dentists'; }
  function ntBar() { // pengingat bila browser belum mengizinkan suara (belum ada klik di halaman ini)
    var need = chatRole() && adm && soundOn() && route().p === 'admin' && (!NT.ctx || NT.ctx.state !== 'running'), b = $('ntb');
    if (need && !b) { b = el('button', '', '🔔 Klik di sini untuk mengaktifkan nada dering'); b.id = 'ntb'; b.type = 'button'; document.body.appendChild(b); }
    else if (!need && b) b.remove();
  }
  ['click', 'keydown', 'touchstart'].forEach(function (ev) { document.addEventListener(ev, function () { ensureCtx(); setTimeout(ntBar, 60); }, { passive: true }); });
  window.sndBox = function () {
    var on = soundOn(), p = ('Notification' in window) ? Notification.permission : 'denied';
    return '<div class="sndc"><button data-ch="snd" type="button">' + (on ? '🔔 Nada dering: ON' : '🔕 Nada dering: OFF') + '</button><button data-ch="sndtest" type="button">▶ Tes nada dering</button>' + (p === 'default' ? '<button data-ch="ntf" type="button">🖥️ Aktifkan notifikasi desktop</button>' : '') + '</div>';
  };
  var ntCss = document.createElement('style');
  ntCss.textContent = '#nt{position:fixed;top:16px;right:16px;z-index:1100;width:min(380px,calc(100vw - 24px));background:var(--navy);color:#fff;border-radius:22px;padding:16px 18px;box-shadow:0 24px 60px rgba(7,15,36,.55);border:1px solid rgba(255,255,255,.18);animation:ntin .25s ease-out}@keyframes ntin{from{transform:translateY(-12px);opacity:0}to{transform:none;opacity:1}}#nt .h{display:flex;gap:10px;align-items:center;font:800 16px "Bricolage Grotesque",Inter,sans-serif}#nt .bell{display:inline-block;animation:ntr 1s ease-in-out infinite}@keyframes ntr{0%,100%{transform:rotate(0)}20%{transform:rotate(-18deg)}40%{transform:rotate(16deg)}60%{transform:rotate(-10deg)}80%{transform:rotate(8deg)}}#nt p{margin:8px 0 6px;color:#dbe6fb;font-size:14px;word-break:break-word}#nt small{display:block;color:#9fb0d0;font-size:12px;margin-bottom:12px}#nt .acts{display:flex;gap:8px}#nt .btn.gh{border:1.5px solid rgba(255,255,255,.4);color:#fff;background:transparent}@media (prefers-reduced-motion:reduce){#nt,#nt .bell{animation:none}}#ntb{position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:1090;background:#fff4c2;color:#6b4c00;border:0;border-radius:99px;padding:9px 18px;font:600 13px Inter,sans-serif;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.25)}.sndc{display:grid;gap:4px;margin:10px 0 4px}.sndc button{font-size:12.5px!important;padding:8px 12px!important}';
  document.head.appendChild(ntCss);
  var pCss = document.createElement('style');
  pCss.textContent = '.cwi.typ{opacity:.7;font-style:italic}.cwi .by{display:block;font-size:11px;font-weight:700;opacity:.8;margin-bottom:2px}.chsg{display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:10px 14px;background:#f1fadc;border-top:1px solid var(--line);font-size:13.5px}.chsg .hit{color:var(--mute);font-size:12.5px}#chf .pb{align-self:flex-end;white-space:nowrap}.prow{display:flex;gap:14px;align-items:flex-start;justify-content:space-between;padding:12px 0;border-top:1px solid var(--line);margin-top:12px}.prow p{margin:4px 0;color:var(--mute);font-size:13px;line-height:1.5}.prow .pa{display:flex;flex-direction:column;gap:6px;flex-shrink:0}.cwo .by{display:block;font-weight:600;font-size:11px;color:var(--blue);margin-bottom:2px}';
  document.head.appendChild(pCss);

  function ntStream() { // sambungan langsung: tick dijalankan seketika saat server memberi tahu ada pesan pasien
    var on = typeof adm !== 'undefined' && adm && chatRole();
    if (!on) { if (NT.es) { try { NT.es.close(); } catch (e) { } NT.es = null; } return; }
    if (NT.es || !window.EventSource) return;
    try { NT.es = new EventSource('/api/chats/stream'); NT.es.addEventListener('chat', function () { chatTick(); }); } catch (e) { NT.es = null; }
  }
  async function chatTick() {
    ntStream();
    if (typeof adm === 'undefined' || !adm || !chatRole()) return;
    try {
      if (onChat() && CH.cur && attending()) await loadCur(false);   // jangan menandai terbaca bila tab tersembunyi / tidak difokus
      var l = await api('GET', '/api/chats'), tot = l.reduce(function (n, c) { return n + c.unread; }, 0);
      var fresh = l.filter(function (c) { return c.unread > (NT.prev[c.id] || 0); }).sort(function (a, b) { return b.updated - a.updated; });
      if (fresh.length && route().p === 'admin') { ntShow(fresh, tot); startRing(!NT.first); desktopNotify(fresh[0]); }
      NT.prev = {}; l.forEach(function (c) { NT.prev[c.id] = c.unread; }); NT.first = false;
      if (tot === 0) ntHide();
      setTitle(tot); ntBar();
      CH.list = l; CH.unread = tot; CH.loaded = true; badge(); if (onChat()) drawList();
    } catch (e) { }
  }
  setInterval(chatTick, 4000);
  async function openChat(id) { CH.cur = id; CH.last = 0; CH.draft = ''; CH.curInfo = null; drawList(); await loadCur(true); chatTick(); var t = document.querySelector('#chf textarea'); if (t) t.focus(); }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-ch]'); if (!b) return;
    var a = b.dataset.ch;
    if (a === 'ntopen') { var id = b.dataset.id; ntHide(); if (onChat()) openChat(id); else { location.hash = '#/admin/chat'; setTimeout(function () { openChat(id); }, 350); } }
    else if (a === 'ntclose') ntHide();
    else if (a === 'snd') { var on = !soundOn(); setSound(on); b.textContent = on ? '🔔 Nada dering: ON' : '🔕 Nada dering: OFF'; if (!on) stopRing(); else { ensureCtx(); startRing(false); } ntBar(); }
    else if (a === 'sndtest') { ensureCtx(); if (!ringOnce()) toast('Browser belum mengizinkan suara. Klik halaman ini sekali lalu coba lagi.'); else toast('🔔 Tes nada dering'); }
    else if (a === 'ntf') { if ('Notification' in window) Notification.requestPermission().then(function (p) { toast(p === 'granted' ? 'Notifikasi desktop aktif' : 'Notifikasi desktop tidak diizinkan'); if (b.parentNode) b.remove(); }); }
    else if (a === 'promo') promoDialog();
    else if (a === 'promosend') sendPromoCard(b.dataset.id);
    else if (a === 'promoins') insertPromo(b.dataset.id);
    else if (a === 'open') openChat(b.dataset.id);
    else if (a === 'close' && CH.cur) confirmD('Tutup percakapan ini? Pasien tidak bisa membalas lagi.', async function () { try { await api('POST', '/api/chats/' + CH.cur + '/close'); await loadCur(true); chatTick(); } catch (x) { toast('Gagal menutup'); } });
    else if (a === 'del' && CH.cur) confirmD('Hapus percakapan ini beserta semua pesannya?', async function () { try { await api('DELETE', '/api/chats/' + CH.cur); CH.cur = null; CH.curInfo = null; drawConv(); chatTick(); toast('Dihapus'); } catch (x) { toast('Gagal menghapus'); } });
  });
  document.addEventListener('input', function (e) { if (e.target.form && e.target.form.id === 'chf') CH.draft = e.target.value; });
  document.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey && e.target.form && e.target.form.id === 'chf' && e.target.tagName === 'TEXTAREA') { e.preventDefault(); e.target.form.requestSubmit(); } });
  document.addEventListener('submit', async function (e) {
    if (e.target.id !== 'chf') return; e.preventDefault();
    var f = e.target, t = f.elements.t.value.trim(); if (!t || !CH.cur) return;
    f.querySelector('button[type=submit]').disabled = true;
    try { await api('POST', '/api/chats/' + CH.cur + '/msg', { text: t }); f.elements.t.value = ''; CH.draft = ''; await loadCur(false); if (CH.curInfo && CH.curInfo.status !== 'aktif') await loadCur(true); chatTick(); }
    catch (x) { toast(x.msg || 'Gagal mengirim'); }
    f.querySelector('button[type=submit]') && (f.querySelector('button[type=submit]').disabled = false);
  });

  /* ====================== Kaitan dengan render() situs ====================== */
  function sync() {
    var p = route().p; box.style.display = (p === 'admin' || p === 'login') ? 'none' : '';
    if (onChat()) { drawList(); drawConv(); chatTick(); }
    badge();
  }
  if (typeof render === 'function') { var _r = render; window.render = render = function () { _r.apply(this, arguments); sync(); }; }
  sync();
})();
