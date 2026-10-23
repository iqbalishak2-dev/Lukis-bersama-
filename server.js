// Lukis Bersama v4 - bilik berasingan dengan kod, mod meneka, alat lukisan. Tanpa pakej tambahan.
// Jalankan: node server.js   (buka http://localhost:3000)
const http = require('http');
const fs = require('fs');
const path = require('path');
const PORT = process.env.PORT || 3000;
const ROUND = 80;        // saat setiap giliran
const REVEAL = 5;        // saat tunjuk jawapan
const MAX_PLAYERS = 12;  // pemain setiap bilik
const MAX_ROOMS = 200;
const IDLE_MS = 10 * 60 * 1000; // bilik kosong dipadam selepas 10 minit
const WORDS = ["rumah","kucing","pantai","roket","pokok","robot","gunung","kapal","bandar","taman","payung","basikal","bulan","matahari","ikan","burung","kereta","pisang","buku","jam","kasut","topi","bunga","lampu","tangga","jambatan","gajah","harimau","durian","layang-layang","pelangi","telefon","kerusi","katil","pintu","tingkap","mangkuk","sudu","kuih","kopi"];
const PCOL = ["#e03131","#1c7ed6","#2f9e44","#f76707","#9c36b5","#e64980","#0b7285","#a16207"];
const ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const PAGE = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

const MAX_STROKES = 80000;
const norm = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
const num = v => typeof v === 'number' && isFinite(v);
const okCol = c => /^#[0-9a-f]{6}$/i.test(c || '');
const validItem = s => s && typeof s.k === 'string' && s.k.length <= 48 && okCol(s.c) && (s.bg === 1 || [s.a, s.b, s.x, s.y, s.w].every(num));
const cleanItem = s => s.bg === 1
  ? { bg: 1, c: s.c, k: s.k }
  : { a: s.a, b: s.b, x: s.x, y: s.y, c: s.c, w: Math.min(60, Math.max(1, s.w)), e: s.e ? 1 : 0, k: s.k };
const mine = (s, cid) => s.k.startsWith(cid + ':');

// ---------- Bilik ----------
const rooms = new Map();
function newCode() {
  for (;;) {
    let c = '';
    for (let i = 0; i < 4; i++) c += ALPHA[Math.floor(Math.random() * ALPHA.length)];
    if (!rooms.has(c)) return c;
  }
}
function armIdle(R) {
  clearTimeout(R.idleT);
  R.idleT = setTimeout(() => {
    if (R.clients.size === 0) { clearTimeout(R.revealT); rooms.delete(R.code); }
  }, IDLE_MS);
}
function makeRoom() {
  const R = {
    code: newCode(), clients: new Map(), scoreMem: new Map(), guessed: new Set(),
    strokes: [], phase: 'lobby', order: [], roundNo: 0, drawer: null, word: '', endsAt: 0, revealT: null, idleT: null
  };
  rooms.set(R.code, R);
  armIdle(R);
  return R;
}
const sc = (R, id) => R.scoreMem.get(id) || 0;

function sendTo(c, obj) { try { c.res.write('data: ' + JSON.stringify(obj) + '\n\n'); } catch (e) {} }
function broadcast(R, obj) { for (const c of R.clients.values()) sendTo(c, obj); }
function sys(R, m) { broadcast(R, { t: 'sys', m }); }
function stateObj(R) {
  const d = R.clients.get(R.drawer);
  return {
    t: 'state', phase: R.phase, drawer: R.drawer, drawerName: d ? d.name : '',
    hint: R.word.split('').map(ch => ch === ' ' ? ' ' : '_').join(' '),
    left: R.phase === 'playing' ? Math.max(0, Math.round((R.endsAt - Date.now()) / 1000)) : 0,
    round: R.roundNo, rounds: R.order.length,
    players: [...R.clients].map(([id, c]) => ({ id, name: c.name, color: c.color, score: sc(R, id), guessed: R.guessed.has(id) }))
  };
}
function broadcastState(R) { broadcast(R, stateObj(R)); }
const canDrawNow = (R, cid) => R.phase === 'lobby' || (R.phase === 'playing' && cid === R.drawer);

function toLobby(R, msg) {
  clearTimeout(R.revealT);
  R.phase = 'lobby'; R.drawer = null; R.word = ''; R.guessed.clear(); R.strokes = [];
  broadcast(R, { t: 'padam', cid: '' });
  if (msg) sys(R, msg);
  broadcastState(R);
}
function endGame(R) {
  const ranked = [...R.clients].map(([id, c]) => ({ n: c.name, s: sc(R, id) })).sort((a, b) => b.s - a.s);
  const top = ranked.length ? ranked[0] : null;
  toLobby(R, top ? '🏆 Tamat! Pemenang: ' + top.n + ' (' + top.s + ' markah). Ketuk Mula main untuk ulang.' : 'Tamat!');
}
function nextTurn(R) {
  clearTimeout(R.revealT);
  if (R.clients.size < 2) return toLobby(R, 'Pemain tak cukup, kembali ke lobi.');
  while (R.roundNo < R.order.length) {
    const id = R.order[R.roundNo]; R.roundNo++;
    if (R.clients.has(id)) { R.drawer = id; return beginTurn(R); }
  }
  endGame(R);
}
function beginTurn(R) {
  R.word = WORDS[Math.floor(Math.random() * WORDS.length)];
  R.guessed.clear(); R.strokes = [];
  R.endsAt = Date.now() + ROUND * 1000;
  R.phase = 'playing';
  broadcast(R, { t: 'padam', cid: '' });
  broadcastState(R);
  sendTo(R.clients.get(R.drawer), { t: 'word', w: R.word });
  sys(R, '✏️ Giliran ' + R.clients.get(R.drawer).name + ' melukis! (' + R.roundNo + '/' + R.order.length + ')');
}
function endTurn(R) {
  if (R.phase !== 'playing') return;
  R.phase = 'reveal';
  sys(R, 'Perkataan tadi: ' + R.word.toUpperCase() + ' (ketuk 💾 sekarang kalau mahu simpan lukisan)');
  broadcastState(R);
  R.revealT = setTimeout(() => nextTurn(R), REVEAL * 1000);
}
function checkAll(R) {
  if (R.phase !== 'playing') return;
  const others = [...R.clients.keys()].filter(id => id !== R.drawer);
  if (others.length && others.every(id => R.guessed.has(id))) endTurn(R);
}

function handle(R, cid, m) {
  const c = R.clients.get(cid);
  if (!c) return;
  if (m.t === 'lukis' && Array.isArray(m.s)) {
    if (!canDrawNow(R, cid)) return;
    const s = m.s.slice(0, 60).filter(x => validItem(x) && mine(x, cid)).map(cleanItem);
    if (!s.length) return;
    R.strokes.push(...s);
    if (R.strokes.length > MAX_STROKES) R.strokes = R.strokes.slice(-MAX_STROKES);
    broadcast(R, { t: 'lukis', s, cid });
  } else if (m.t === 'padam') {
    if (!canDrawNow(R, cid)) return;
    R.strokes = []; broadcast(R, { t: 'padam', cid });
  } else if (m.t === 'undo') {
    if (!canDrawNow(R, cid)) return;
    let k = null;
    for (let i = R.strokes.length - 1; i >= 0; i--) { if (mine(R.strokes[i], cid)) { k = R.strokes[i].k; break; } }
    if (!k) return;
    R.strokes = R.strokes.filter(s => s.k !== k);
    broadcast(R, { t: 'undo', k });
  } else if (m.t === 'start') {
    if (R.phase !== 'lobby' || R.clients.size < 2) return;
    R.order = [...R.clients.keys()].sort(() => Math.random() - 0.5);
    R.roundNo = 0; R.scoreMem.clear();
    sys(R, 'Permainan bermula! Setiap pemain dapat satu giliran melukis.');
    nextTurn(R);
  } else if (m.t === 'guess' && typeof m.m === 'string') {
    const text = m.m.trim().slice(0, 60);
    if (!text) return;
    if (R.phase === 'playing') {
      const hit = norm(text) === norm(R.word);
      if (cid !== R.drawer && !R.guessed.has(cid) && hit) {
        const pts = Math.max(30, Math.round((R.endsAt - Date.now()) / (ROUND * 10)));
        R.scoreMem.set(cid, sc(R, cid) + pts);
        R.scoreMem.set(R.drawer, sc(R, R.drawer) + 20);
        R.guessed.add(cid);
        sys(R, '✅ ' + c.name + ' meneka betul! (+' + pts + ')');
        broadcastState(R);
        return checkAll(R);
      }
      if ((cid === R.drawer || R.guessed.has(cid)) && norm(text).includes(norm(R.word))) return;
    }
    broadcast(R, { t: 'chat', n: c.name, m: text });
  }
}

function leave(R, cid, res) {
  const c = R.clients.get(cid);
  if (!c || c.res !== res) return;
  R.clients.delete(cid);
  if (R.clients.size === 0) armIdle(R);
  if (R.phase !== 'lobby') {
    if (R.clients.size < 2) return toLobby(R, 'Pemain tak cukup, kembali ke lobi.');
    if (R.phase === 'playing' && cid === R.drawer) { sys(R, c.name + ' keluar.'); endTurn(R); return; }
  }
  broadcastState(R);
  checkAll(R);
}

function json(res, obj) {
  res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}
const codeOf = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (req.method === 'GET' && url.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
    return res.end(PAGE);
  }
  if (req.method === 'GET' && url.pathname === '/baru') {
    if (rooms.size >= MAX_ROOMS) return json(res, { ok: false, m: 'Pelayan penuh, cuba sebentar lagi.' });
    return json(res, { ok: true, code: makeRoom().code });
  }
  if (req.method === 'GET' && url.pathname === '/cek') {
    const R = rooms.get(codeOf(url.searchParams.get('room')));
    if (!R) return json(res, { ok: false, m: 'Bilik tidak dijumpai. Semak kod.' });
    if (R.clients.size >= MAX_PLAYERS) return json(res, { ok: false, m: 'Bilik penuh.' });
    return json(res, { ok: true });
  }
  if (req.method === 'GET' && url.pathname === '/events') {
    const R = rooms.get(codeOf(url.searchParams.get('room')));
    const cid = (url.searchParams.get('cid') || '').slice(0, 32);
    const name = (url.searchParams.get('name') || 'Pemain').slice(0, 14).replace(/[<>]/g, '') || 'Pemain';
    if (!R || !cid) { res.writeHead(404); return res.end(); }
    if (R.clients.size >= MAX_PLAYERS && !R.clients.has(cid)) { res.writeHead(403); return res.end(); }
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' });
    clearTimeout(R.idleT);
    const me = { res, name, color: PCOL[R.clients.size % PCOL.length] };
    R.clients.set(cid, me);
    sendTo(me, { t: 'init', strokes: R.strokes });
    if (R.phase === 'playing' && cid === R.drawer) sendTo(me, { t: 'word', w: R.word });
    sys(R, '👋 ' + name + ' masuk.');
    broadcastState(R);
    req.on('close', () => leave(R, cid, res));
    return;
  }
  if (req.method === 'POST' && url.pathname === '/send') {
    let body = '';
    req.on('data', d => { body += d; if (body.length > 30000) req.destroy(); });
    req.on('end', () => {
      res.writeHead(204); res.end();
      let m; try { m = JSON.parse(body); } catch (e) { return; }
      const R = rooms.get(codeOf(m.room));
      if (R) handle(R, String(m.cid || '').slice(0, 32), m);
    });
    return;
  }
  res.writeHead(404); res.end('Tiada');
}).listen(PORT, () => console.log('Lukis Bersama berjalan di port ' + PORT));

setInterval(() => {
  const now = Date.now();
  for (const R of rooms.values()) {
    for (const c of R.clients.values()) { try { c.res.write(': ping\n\n'); } catch (e) {} }
    if (R.phase === 'playing' && now >= R.endsAt) endTurn(R);
  }
}, 1000);
