// Lukis Bersama v2 - mod meneka + nama + markah. Tanpa pakej tambahan.
// Jalankan: node server.js   (buka http://localhost:3000)
const http = require('http');
const PORT = process.env.PORT || 3000;
const ROUND = 80;   // saat setiap giliran
const REVEAL = 5;   // saat tunjuk jawapan
const WORDS = ["rumah","kucing","pantai","roket","pokok","robot","gunung","kapal","bandar","taman","payung","basikal","bulan","matahari","ikan","burung","kereta","pisang","buku","jam","kasut","topi","bunga","lampu","tangga","jambatan","gajah","harimau","durian","layang-layang","pelangi","telefon","kerusi","katil","pintu","tingkap","mangkuk","sudu","kuih","kopi"];
const PCOL = ["#e03131","#1c7ed6","#2f9e44","#f76707","#9c36b5","#e64980","#0b7285","#a16207"];

const PAGE = String.raw`<!DOCTYPE html>
<html lang="ms">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Lukis Bersama</title>
<style>
:root{--bg:#faf7f2;--surface:#fff;--text:#2a2622;--muted:#7a7167;--accent:#e8590c;--line:#e4ddd2;
padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
@media (prefers-color-scheme:dark){:root{--bg:#1c1a18;--surface:#2a2724;--text:#f0ebe3;--muted:#a1978a;--accent:#ff8a4c;--line:#3d3833;color-scheme:dark}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font-family:system-ui,-apple-system,"Segoe UI",sans-serif;display:flex;flex-direction:column;align-items:center;gap:10px;padding:12px;min-height:100vh}
h1{font-size:1.2rem;margin:0}
.w{width:100%;max-width:560px}
#info{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:10px 14px;font-weight:600;display:flex;justify-content:space-between;align-items:center;gap:8px}
#pl{display:flex;gap:6px;flex-wrap:wrap}
.chip{background:var(--surface);border:1px solid var(--line);border-radius:99px;padding:4px 10px;font-size:.8rem;display:flex;align-items:center;gap:6px}
.chip i{width:10px;height:10px;border-radius:50%;display:inline-block}
#wrap{aspect-ratio:1;background:#fff;border:1px solid var(--line);border-radius:14px;overflow:hidden;touch-action:none}
#wrap.lock{opacity:.85;outline:3px dashed var(--line);outline-offset:-3px}
canvas{width:100%;height:100%;display:block;touch-action:none}
.bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;justify-content:center}
.sw{width:32px;height:32px;border-radius:50%;border:3px solid var(--surface);box-shadow:0 0 0 1px var(--line);cursor:pointer;padding:0}
.sw.on{box-shadow:0 0 0 3px var(--text)}
button.t{background:var(--surface);color:var(--text);border:1px solid var(--line);border-radius:10px;padding:9px 14px;font-size:.9rem;cursor:pointer}
button.p{background:var(--accent);color:#fff;border:0;border-radius:10px;padding:9px 16px;font-size:.95rem;font-weight:600;cursor:pointer}
input[type=range]{width:100px;accent-color:var(--accent)}
#log{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:8px 12px;height:130px;overflow-y:auto;font-size:.88rem;display:flex;flex-direction:column;gap:3px}
#log .sys{color:var(--accent);font-weight:600}
#log b{color:var(--muted)}
.row{display:flex;gap:8px}
.row input{flex:1;min-width:0;border:1px solid var(--line);background:var(--surface);color:var(--text);border-radius:10px;padding:10px 12px;font-size:1rem}
#ov{position:fixed;inset:0;background:var(--bg);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:24px;z-index:9}
#ov input{border:1px solid var(--line);background:var(--surface);color:var(--text);border-radius:10px;padding:12px;font-size:1.1rem;width:100%;max-width:300px;text-align:center}
</style>
</head>
<body>
<div id="ov"><h1 style="font-size:1.6rem">🎨 Lukis Bersama</h1><div>Siapa nama anda?</div><input id="nm" maxlength="14" placeholder="Nama anda" autocomplete="off"><button class="p" id="go">Masuk</button></div>
<h1>🎨 Lukis Bersama</h1>
<div class="w" id="pl"></div>
<div class="w" id="info"><span id="it">Menyambung…</span><button class="p" id="st" style="display:none">Mula main</button></div>
<div class="w" id="wrap"><canvas id="c" width="1000" height="1000"></canvas></div>
<div class="w bar" id="cols"></div>
<div class="w bar">
<input type="range" id="sz" min="2" max="40" value="8" aria-label="Saiz berus">
<button class="t" id="er">🧽 Pemadam</button>
<button class="t" id="cl">🗑️ Kosongkan</button>
</div>
<div class="w" id="log"></div>
<div class="w row"><input id="ch" maxlength="60" placeholder="Teka / sembang di sini…" autocomplete="off"><button class="p" id="sd">Hantar</button></div>
<script>
const COLS=["#222222","#e03131","#f76707","#fcc419","#2f9e44","#1c7ed6","#9c36b5","#e64980"];
const cv=document.getElementById('c'),ctx=cv.getContext('2d');
ctx.lineCap='round';ctx.lineJoin='round';
const CID=Math.random().toString(36).slice(2);
let NAME='',color=COLS[0],erase=false,drawing=false,last=null,buf=[],S={phase:'lobby',players:[],drawer:null},wordMine='',ends=0;
const sz=document.getElementById('sz'),wrap=document.getElementById('wrap');
function canDraw(){return S.phase==='lobby'||(S.phase==='playing'&&S.drawer===CID);}
function seg(s){ctx.strokeStyle=s.e?'#ffffff':s.c;ctx.lineWidth=s.w;ctx.beginPath();ctx.moveTo(s.a,s.b);ctx.lineTo(s.x,s.y);ctx.stroke();}
function pos(e){const r=cv.getBoundingClientRect();return[(e.clientX-r.left)/r.width*1000,(e.clientY-r.top)/r.height*1000];}
function post(m){m.cid=CID;fetch('/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(m)}).catch(()=>{});}
cv.addEventListener('pointerdown',e=>{if(!canDraw())return;drawing=true;cv.setPointerCapture(e.pointerId);last=pos(e);add(last,last);});
cv.addEventListener('pointermove',e=>{if(!drawing)return;const p=pos(e);add(last,p);last=p;});
['pointerup','pointercancel'].forEach(n=>cv.addEventListener(n,()=>{drawing=false;flush();}));
function add(p,q){const s={a:Math.round(p[0]),b:Math.round(p[1]),x:Math.round(q[0]),y:Math.round(q[1]),c:color,w:+sz.value,e:erase?1:0};seg(s);buf.push(s);}
function flush(){while(buf.length){post({t:'lukis',s:buf.splice(0,60)});}}
setInterval(flush,70);
const cols=document.getElementById('cols');
COLS.forEach(c=>{const b=document.createElement('button');b.className='sw';b.style.background=c;b.setAttribute('aria-label',c);b.onclick=()=>{color=c;erase=false;mark();};cols.appendChild(b);});
function mark(){[...cols.children].forEach((b,i)=>b.classList.toggle('on',!erase&&COLS[i]===color));}
mark();
document.getElementById('er').onclick=()=>{erase=!erase;mark();};
function clearC(){ctx.fillStyle='#fff';ctx.fillRect(0,0,1000,1000);}
clearC();
let clT=null;const clB=document.getElementById('cl');
clB.onclick=()=>{if(!canDraw())return;if(!clT){clB.textContent='⚠️ Ketuk lagi';clT=setTimeout(()=>{clT=null;clB.textContent='🗑️ Kosongkan';},3000);return;}
 clearTimeout(clT);clT=null;clB.textContent='🗑️ Kosongkan';clearC();post({t:'padam'});};
const log=document.getElementById('log');
function line(txt,cls,who){const d=document.createElement('div');if(cls)d.className=cls;if(who){const b=document.createElement('b');b.textContent=who+': ';d.appendChild(b);}d.appendChild(document.createTextNode(txt));log.appendChild(d);while(log.children.length>60)log.removeChild(log.firstChild);log.scrollTop=log.scrollHeight;}
function sendChat(){const i=document.getElementById('ch');const m=i.value.trim();if(!m)return;i.value='';post({t:'guess',m});}
document.getElementById('sd').onclick=sendChat;
document.getElementById('ch').addEventListener('keydown',e=>{if(e.key==='Enter')sendChat();});
document.getElementById('st').onclick=()=>post({t:'start'});
function renderState(){
 const pl=document.getElementById('pl');pl.innerHTML='';
 S.players.forEach(p=>{const d=document.createElement('span');d.className='chip';const i=document.createElement('i');i.style.background=p.color;d.appendChild(i);
  d.appendChild(document.createTextNode(p.name+(p.id===CID?' (anda)':'')+(p.id===S.drawer&&S.phase==='playing'?' ✏️':'')+(p.guessed?' ✅':'')+' · '+p.score));pl.appendChild(d);});
 document.getElementById('st').style.display=(S.phase==='lobby'&&S.players.length>=2)?'':'none';
 wrap.classList.toggle('lock',!canDraw());
 if(S.phase!=='playing'||S.drawer!==CID)wordMine='';
 tick();}
function tick(){const el=document.getElementById('it');
 if(S.phase==='lobby')el.textContent=S.players.length<2?'Menunggu pemain lain… lukis bebas dahulu':'Semua sedia? Ketuk Mula main';
 else if(S.phase==='playing'){const left=Math.max(0,Math.ceil((ends-Date.now())/1000));
  el.textContent=S.drawer===CID?('Lukis: '+wordMine.toUpperCase()+' · '+left+'s'):((S.drawerName||'')+' melukis · '+S.hint+' · '+left+'s');}
 else el.textContent='Giliran seterusnya sebentar lagi…';}
setInterval(tick,500);
function valid(s){return s&&[s.a,s.b,s.x,s.y,s.w].every(Number.isFinite)&&/^#[0-9a-f]{6}$/i.test(s.c||'');}
function connect(){
 const es=new EventSource('/events?cid='+CID+'&name='+encodeURIComponent(NAME));
 es.onmessage=ev=>{let m;try{m=JSON.parse(ev.data);}catch(e){return;}
  if(m.t==='init'){clearC();(m.strokes||[]).forEach(s=>{if(valid(s))seg(s);});}
  else if(m.t==='lukis'){if(m.cid===CID)return;(m.s||[]).forEach(s=>{if(valid(s))seg(s);});}
  else if(m.t==='padam'){if(m.cid!==CID)clearC();}
  else if(m.t==='state'){S=m;ends=Date.now()+(m.left||0)*1000;renderState();}
  else if(m.t==='word'){wordMine=String(m.w||'');tick();}
  else if(m.t==='chat')line(m.m,'',m.n);
  else if(m.t==='sys')line(m.m,'sys');};
 es.onerror=()=>{document.getElementById('it').textContent='Terputus, cuba sambung semula…';};
}
const nm=document.getElementById('nm');
try{nm.value=localStorage.getItem('lb_name')||'';}catch(e){}
function go(){NAME=(nm.value.trim()||('Pemain'+Math.floor(Math.random()*90+10))).slice(0,14);try{localStorage.setItem('lb_name',NAME);}catch(e){}
 document.getElementById('ov').style.display='none';connect();}
document.getElementById('go').onclick=go;
nm.addEventListener('keydown',e=>{if(e.key==='Enter')go();});
</script>
</body>
</html>
`;

// ---------- Logik permainan ----------
const clients = new Map(); // cid -> {res,name,color}
const scoreMem = new Map();
let strokes = [], phase = 'lobby', order = [], roundNo = 0, drawer = null, word = '', endsAt = 0, revealT = null;
const guessed = new Set();
const MAX_STROKES = 80000;
const norm = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
const num = v => typeof v === 'number' && isFinite(v);
const okSeg = s => s && [s.a, s.b, s.x, s.y, s.w].every(num) && /^#[0-9a-f]{6}$/i.test(s.c || '');
const sc = id => scoreMem.get(id) || 0;

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

function toLobby(msg) {
  clearTimeout(revealT);
  phase = 'lobby'; drawer = null; word = ''; guessed.clear(); strokes = [];
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
  guessed.clear(); strokes = [];
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
  sys('Perkataan tadi: ' + word.toUpperCase());
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
    if (!(phase === 'lobby' || (phase === 'playing' && cid === drawer))) return;
    const s = m.s.slice(0, 60).filter(okSeg).map(s => ({ a: s.a, b: s.b, x: s.x, y: s.y, c: s.c, w: Math.min(60, Math.max(1, s.w)), e: s.e ? 1 : 0 }));
    if (!s.length) return;
    strokes.push(...s);
    if (strokes.length > MAX_STROKES) strokes = strokes.slice(-MAX_STROKES);
    broadcast({ t: 'lukis', s, cid });
  } else if (m.t === 'padam') {
    if (!(phase === 'lobby' || (phase === 'playing' && cid === drawer))) return;
    strokes = []; broadcast({ t: 'padam', cid });
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
      // jangan bocorkan jawapan
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
