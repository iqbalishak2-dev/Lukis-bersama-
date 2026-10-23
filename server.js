// Lukis Bersama v3 - mod meneka + simpan gambar + alat lukisan. Tanpa pakej tambahan.
// Jalankan: node server.js   (buka http://localhost:3000)
const http = require('http');
const fs = require('fs');
const path = require('path');
const PORT = process.env.PORT || 3000;
const ROUND = 80;   // saat setiap giliran
const REVEAL = 5;   // saat tunjuk jawapan
const SAVE_FILE = path.join(__dirname, 'canvas-save.json');
const WORDS = ["rumah","kucing","pantai","roket","pokok","robot","gunung","kapal","bandar","taman","payung","basikal","bulan","matahari","ikan","burung","kereta","pisang","buku","jam","kasut","topi","bunga","lampu","tangga","jambatan","gajah","harimau","durian","layang-layang","pelangi","telefon","kerusi","katil","pintu","tingkap","mangkuk","sudu","kuih","kopi"];
const PCOL = ["#e03131","#1c7ed6","#2f9e44","#f76707","#9c36b5","#e64980","#0b7285","#a16207"];

const PAGE = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

// ---------- Logik permainan ----------
const clients = new Map(); // cid -> {res,name,color}
const scoreMem = new Map();
let strokes = [], phase = 'lobby', order = [], roundNo = 0, drawer = null, word = '', endsAt = 0, revealT = null, dirty = false;
const guessed = new Set();
const MAX_STROKES = 80000;
const norm = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
const num = v => typeof v === 'number' && isFinite(v);
const okCol = c => /^#[0-9a-f]{6}$/i.test(c || '');
const validItem = s => s && typeof s.k === 'string' && s.k.length <= 48 && okCol(s.c) && (s.bg === 1 || [s.a, s.b, s.x, s.y, s.w].every(num));
const cleanItem = s => s.bg === 1
  ? { bg: 1, c: s.c, k: s.k }
  : { a: s.a, b: s.b, x: s.x, y: s.y, c: s.c, w: Math.min(60, Math.max(1, s.w)), e: s.e ? 1 : 0, k: s.k };
const sc = id => scoreMem.get(id) || 0;
const mine = (s, cid) => s.k.startsWith(cid + ':');

// muat lukisan tersimpan (jika ada)
try {
  const j = JSON.parse(fs.readFileSync(SAVE_FILE, 'utf8'));
  if (Array.isArray(j)) strokes = j.filter(validItem).map(cleanItem).slice(-MAX_STROKES);
} catch (e) {}
setInterval(() => {
  if (!dirty) return;
  dirty = false;
  fs.writeFile(SAVE_FILE, JSON.stringify(strokes), () => {});
}, 3000);

function sendTo(c, obj) { try { c.res.write('data: ' + JSON.stringify(obj) + '\n\n'); } catch (e) {} }
function broadcast(obj) { for (const c of clients.values()) sendTo(c, obj); }
function sys(m) { broadcast({ t: 'sys', m }); }
function stateObj() {
  const d = clients.get(drawer);
  return {
    t: 'state', phase, drawer, drawerName: d ? d.name : '',
    hint: word.split('').map(ch => ch === ' ' ? ' ' : '_').join(' '),
    left: phase === 'playing' ? Math.max(0, Math.round((endsAt - Date.now()) / 1000)) : 0,
    round: roundNo, rounds: order.length,
    players: [...clients].map(([id, c]) => ({ id, name: c.name, color: c.color, score: sc(id), guessed: guessed.has(id) }))
  };
}
function broadcastState() { broadcast(stateObj()); }
const canDrawNow = cid => phase === 'lobby' || (phase === 'playing' && cid === drawer);

function toLobby(msg) {
  clearTimeout(revealT);
  phase = 'lobby'; drawer = null; word = ''; guessed.clear(); strokes = []; dirty = true;
  broadcast({ t: 'padam', cid: '' });
  if (msg) sys(msg);
  broadcastState();
}
function endGame() {
  const ranked = [...clients].map(([id, c]) => ({ n: c.name, s: sc(id) })).sort((a, b) => b.s - a.s);
  const top = ranked.length ? ranked[0] : null;
  toLobby(top ? '🏆 Tamat! Pemenang: ' + top.n + ' (' + top.s + ' markah). Ketuk Mula main untuk ulang.' : 'Tamat!');
}
function nextTurn() {
  clearTimeout(revealT);
  if (clients.size < 2) return toLobby('Pemain tak cukup, kembali ke lobi.');
  while (roundNo < order.length) {
    const id = order[roundNo]; roundNo++;
    if (clients.has(id)) { drawer = id; return beginTurn(); }
  }
  endGame();
}
function beginTurn() {
  word = WORDS[Math.floor(Math.random() * WORDS.length)];
  guessed.clear(); strokes = []; dirty = true;
  endsAt = Date.now() + ROUND * 1000;
  phase = 'playing';
  broadcast({ t: 'padam', cid: '' });
  broadcastState();
  sendTo(clients.get(drawer), { t: 'word', w: word });
  sys('✏️ Giliran ' + clients.get(drawer).name + ' melukis! (' + roundNo + '/' + order.length + ')');
}
function endTurn() {
  if (phase !== 'playing') return;
  phase = 'reveal';
  sys('Perkataan tadi: ' + word.toUpperCase() + ' (ketuk 💾 sekarang kalau mahu simpan lukisan)');
  broadcastState();
  revealT = setTimeout(nextTurn, REVEAL * 1000);
}
function checkAll() {
  if (phase !== 'playing') return;
  const others = [...clients.keys()].filter(id => id !== drawer);
  if (others.length && others.every(id => guessed.has(id))) endTurn();
}

function handle(cid, m) {
  const c = clients.get(cid);
  if (!c) return;
  if (m.t === 'lukis' && Array.isArray(m.s)) {
    if (!canDrawNow(cid)) return;
    const s = m.s.slice(0, 60).filter(x => validItem(x) && mine(x, cid)).map(cleanItem);
    if (!s.length) return;
    strokes.push(...s); dirty = true;
    if (strokes.length > MAX_STROKES) strokes = strokes.slice(-MAX_STROKES);
    broadcast({ t: 'lukis', s, cid });
  } else if (m.t === 'padam') {
    if (!canDrawNow(cid)) return;
    strokes = []; dirty = true; broadcast({ t: 'padam', cid });
  } else if (m.t === 'undo') {
    if (!canDrawNow(cid)) return;
    let k = null;
    for (let i = strokes.length - 1; i >= 0; i--) { if (mine(strokes[i], cid)) { k = strokes[i].k; break; } }
    if (!k) return;
    strokes = strokes.filter(s => s.k !== k); dirty = true;
    broadcast({ t: 'undo', k });
  } else if (m.t === 'start') {
    if (phase !== 'lobby' || clients.size < 2) return;
    order = [...clients.keys()].sort(() => Math.random() - 0.5);
    roundNo = 0; scoreMem.clear();
    sys('Permainan bermula! Setiap pemain dapat satu giliran melukis.');
    nextTurn();
  } else if (m.t === 'guess' && typeof m.m === 'string') {
    const text = m.m.trim().slice(0, 60);
    if (!text) return;
    if (phase === 'playing') {
      const hit = norm(text) === norm(word);
      if (cid !== drawer && !guessed.has(cid) && hit) {
        const pts = Math.max(30, Math.round((endsAt - Date.now()) / (ROUND * 10)));
        scoreMem.set(cid, sc(cid) + pts);
        scoreMem.set(drawer, sc(drawer) + 20);
        guessed.add(cid);
        sys('✅ ' + c.name + ' meneka betul! (+' + pts + ')');
        broadcastState();
        return checkAll();
      }
      if ((cid === drawer || guessed.has(cid)) && norm(text).includes(norm(word))) return;
    }
    broadcast({ t: 'chat', n: c.name, m: text });
  }
}

function leave(cid, res) {
  const c = clients.get(cid);
  if (!c || c.res !== res) return;
  clients.delete(cid);
  if (phase !== 'lobby') {
    if (clients.size < 2) return toLobby('Pemain tak cukup, kembali ke lobi.');
    if (phase === 'playing' && cid === drawer) { sys(c.name + ' keluar.'); endTurn(); return; }
  }
  broadcastState();
  checkAll();
}

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (req.method === 'GET' && url.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(PAGE);
  }
  if (req.method === 'GET' && url.pathname === '/events') {
    const cid = (url.searchParams.get('cid') || '').slice(0, 32);
    const name = (url.searchParams.get('name') || 'Pemain').slice(0, 14).replace(/[<>]/g, '') || 'Pemain';
    if (!cid) { res.writeHead(400); return res.end(); }
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' });
    const color = PCOL[clients.size % PCOL.length];
    const me = { res, name, color };
    clients.set(cid, me);
    sendTo(me, { t: 'init', strokes });
    if (phase === 'playing' && cid === drawer) sendTo(me, { t: 'word', w: word });
    sys('👋 ' + name + ' masuk.');
    broadcastState();
    req.on('close', () => leave(cid, res));
    return;
  }
  if (req.method === 'POST' && url.pathname === '/send') {
    let body = '';
    req.on('data', d => { body += d; if (body.length > 30000) req.destroy(); });
    req.on('end', () => {
      res.writeHead(204); res.end();
      let m; try { m = JSON.parse(body); } catch (e) { return; }
      handle(String(m.cid || '').slice(0, 32), m);
    });
    return;
  }
  res.writeHead(404); res.end('Tiada');
}).listen(PORT, () => console.log('Lukis Bersama berjalan di port ' + PORT));

setInterval(() => {
  for (const c of clients.values()) { try { c.res.write(': ping\n\n'); } catch (e) {} }
  if (phase === 'playing' && Date.now() >= endsAt) endTurn();
}, 1000);
