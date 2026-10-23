// Lukis Bersama - pelayan tanpa pakej tambahan.
// Jalankan: node server.js   (buka http://localhost:3000)
const http = require('http');
const PORT = process.env.PORT || 3000;
const PAGE = String.raw`<!DOCTYPE html>
<html lang="ms">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Lukis Bersama</title>
<style>
:root{--bg:#faf7f2;--surface:#fff;--text:#2a2622;--muted:#7a7167;--accent:#e8590c;--line:#e4ddd2;
box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#1c1a18;--surface:#2a2724;--text:#f0ebe3;--muted:#a1978a;--accent:#ff8a4c;--line:#3d3833;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#1c1a18;--surface:#2a2724;--text:#f0ebe3;--muted:#a1978a;--accent:#ff8a4c;--line:#3d3833;color-scheme:dark}
html{scroll-padding-top:env(safe-area-inset-top,0px)}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font-family:system-ui,-apple-system,"Segoe UI",sans-serif;display:flex;flex-direction:column;align-items:center;gap:10px;padding:12px;min-height:100vh}
h1{font-size:1.2rem;margin:0}
header{width:100%;max-width:560px;display:flex;justify-content:space-between;align-items:center;gap:8px}
#tema{width:100%;max-width:560px;background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;gap:8px}
#tema b{color:var(--accent);font-size:1.1rem}
#players{display:flex;gap:4px;align-items:center;font-size:.85rem;color:var(--muted)}
.dot{width:14px;height:14px;border-radius:50%;border:2px solid var(--surface);box-shadow:0 0 0 1px var(--line)}
.dot.me{box-shadow:0 0 0 2px var(--text)}
#wrap{width:100%;max-width:560px;aspect-ratio:1;background:#fff;border:1px solid var(--line);border-radius:14px;overflow:hidden;touch-action:none}
canvas{width:100%;height:100%;display:block;touch-action:none}
.bar{width:100%;max-width:560px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;justify-content:center}
.sw{width:34px;height:34px;border-radius:50%;border:3px solid var(--surface);box-shadow:0 0 0 1px var(--line);cursor:pointer;padding:0}
.sw.on{box-shadow:0 0 0 3px var(--text)}
button.t{background:var(--surface);color:var(--text);border:1px solid var(--line);border-radius:10px;padding:9px 14px;font-size:.9rem;cursor:pointer}
button.t:active{background:var(--line)}
input[type=range]{width:110px;accent-color:var(--accent)}
#st{font-size:.78rem;color:var(--muted);text-align:center}
</style>
</head>
<body>
<header><h1>🎨 Lukis Bersama</h1><div id="players"></div></header>
<div id="tema"><span>Tema: <b id="tw">Bebas!</b></span><button class="t" id="nt">🎲 Tema baru</button></div>
<div id="wrap"><canvas id="c" width="1000" height="1000"></canvas></div>
<div class="bar" id="cols"></div>
<div class="bar">
<input type="range" id="sz" min="2" max="40" value="8" aria-label="Saiz berus">
<button class="t" id="er">🧽 Pemadam</button>
<button class="t" id="cl">🗑️ Kosongkan</button>
</div>
<div id="st">Menyambung… (anda boleh lukis sendirian dahulu)</div>
<script>
const TEMA=["Rumah","Kucing","Pantai","Roket","Pokok","Robot","Gunung","Nasi lemak","Kapal","Monster comel","Bandar","Taman"];
const COLS=["#222222","#e03131","#f76707","#fcc419","#2f9e44","#1c7ed6","#9c36b5","#e64980"];
const cv=document.getElementById('c'),ctx=cv.getContext('2d');
ctx.lineCap='round';ctx.lineJoin='round';
const CID=Math.random().toString(36).slice(2);
let color=COLS[Math.floor(Math.random()*COLS.length)],erase=false,drawing=false,last=null,buf=[];
const sz=document.getElementById('sz');
function seg(s){ctx.strokeStyle=s.e?'#ffffff':s.c;ctx.lineWidth=s.w;ctx.beginPath();ctx.moveTo(s.a,s.b);ctx.lineTo(s.x,s.y);ctx.stroke();}
function pos(e){const r=cv.getBoundingClientRect();return[(e.clientX-r.left)/r.width*1000,(e.clientY-r.top)/r.height*1000];}
function post(m){m.cid=CID;fetch('/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(m)}).catch(()=>{});}
cv.addEventListener('pointerdown',e=>{drawing=true;cv.setPointerCapture(e.pointerId);last=pos(e);add(last,last);});
cv.addEventListener('pointermove',e=>{if(!drawing)return;const p=pos(e);add(last,p);last=p;});
['pointerup','pointercancel'].forEach(n=>cv.addEventListener(n,()=>{drawing=false;flush();}));
function add(p,q){const s={a:Math.round(p[0]),b:Math.round(p[1]),x:Math.round(q[0]),y:Math.round(q[1]),c:color,w:+sz.value,e:erase?1:0};seg(s);buf.push(s);}
function flush(){while(buf.length){post({t:'lukis',s:buf.splice(0,60)});}}
setInterval(flush,70);
const cols=document.getElementById('cols');
COLS.forEach(c=>{const b=document.createElement('button');b.className='sw';b.style.background=c;b.setAttribute('aria-label',c);
 b.onclick=()=>{color=c;erase=false;mark();};cols.appendChild(b);});
function mark(){[...cols.children].forEach((b,i)=>b.classList.toggle('on',!erase&&COLS[i]===color));}
mark();
document.getElementById('er').onclick=()=>{erase=!erase;mark();};
function setTema(w){document.getElementById('tw').textContent=w;}
function clearC(){ctx.fillStyle='#fff';ctx.fillRect(0,0,1000,1000);}
clearC();
document.getElementById('nt').onclick=()=>{const w=TEMA[Math.floor(Math.random()*TEMA.length)];setTema(w);post({t:'tema',w});};
let clT=null;const clB=document.getElementById('cl');
clB.onclick=()=>{if(!clT){clB.textContent='⚠️ Ketuk lagi untuk sahkan';clT=setTimeout(()=>{clT=null;clB.textContent='🗑️ Kosongkan';},3000);return;}
 clearTimeout(clT);clT=null;clB.textContent='🗑️ Kosongkan';clearC();post({t:'padam'});};
function setCount(n){document.getElementById('players').textContent=n+' pemain';
 document.getElementById('st').textContent=n>1?'Dalam talian bersama '+(n-1)+' orang lain. Lukis sekarang!':'Anda seorang sahaja. Kongsi pautan supaya rakan boleh sertai.';}
function valid(s){return s&&[s.a,s.b,s.x,s.y,s.w].every(Number.isFinite)&&/^#[0-9a-f]{6}$/i.test(s.c||'');}
function connect(){
 const es=new EventSource('/events?cid='+CID);
 es.onmessage=ev=>{let m;try{m=JSON.parse(ev.data);}catch(e){return;}
  if(m.t==='init'){clearC();(m.strokes||[]).forEach(s=>{if(valid(s))seg(s);});if(m.tema)setTema(m.tema);}
  else if(m.t==='lukis'){if(m.cid===CID)return;(m.s||[]).forEach(s=>{if(valid(s))seg(s);});}
  else if(m.t==='padam'){if(m.cid!==CID)clearC();}
  else if(m.t==='tema'){if(m.cid!==CID&&typeof m.w==='string')setTema(m.w.slice(0,40));}
  else if(m.t==='count')setCount(m.n);};
 es.onerror=()=>{document.getElementById('st').textContent='Terputus, cuba sambung semula…';};
}
connect();
</script>
</body>
</html>
`;

const clients = new Map();   // cid -> res
let strokes = [];            // sejarah lukisan
let tema = '';
const MAX_STROKES = 80000;

function send(res, obj) { res.write('data: ' + JSON.stringify(obj) + '\n\n'); }
function broadcast(obj) { for (const res of clients.values()) send(res, obj); }
const num = v => typeof v === 'number' && isFinite(v);
const okSeg = s => s && [s.a, s.b, s.x, s.y, s.w].every(num) && /^#[0-9a-f]{6}$/i.test(s.c || '');

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (req.method === 'GET' && url.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(PAGE);
  }
  if (req.method === 'GET' && url.pathname === '/events') {
    const cid = (url.searchParams.get('cid') || '').slice(0, 32);
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' });
    send(res, { t: 'init', strokes, tema });
    clients.set(cid, res);
    broadcast({ t: 'count', n: clients.size });
    req.on('close', () => { if (clients.get(cid) === res) clients.delete(cid); broadcast({ t: 'count', n: clients.size }); });
    return;
  }
  if (req.method === 'POST' && url.pathname === '/send') {
    let body = '';
    req.on('data', d => { body += d; if (body.length > 30000) req.destroy(); });
    req.on('end', () => {
      res.writeHead(204); res.end();
      let m; try { m = JSON.parse(body); } catch (e) { return; }
      const cid = String(m.cid || '').slice(0, 32);
      if (m.t === 'lukis' && Array.isArray(m.s)) {
        const s = m.s.slice(0, 60).filter(okSeg).map(s => ({ a: s.a, b: s.b, x: s.x, y: s.y, c: s.c, w: Math.min(60, Math.max(1, s.w)), e: s.e ? 1 : 0 }));
        if (!s.length) return;
        strokes.push(...s);
        if (strokes.length > MAX_STROKES) strokes = strokes.slice(-MAX_STROKES);
        broadcast({ t: 'lukis', s, cid });
      } else if (m.t === 'padam') { strokes = []; broadcast({ t: 'padam', cid }); }
      else if (m.t === 'tema' && typeof m.w === 'string') { tema = m.w.slice(0, 40); broadcast({ t: 'tema', w: tema, cid }); }
    });
    return;
  }
  res.writeHead(404); res.end('Tiada');
}).listen(PORT, () => console.log('Lukis Bersama berjalan di port ' + PORT));

setInterval(() => { for (const res of clients.values()) res.write(': ping\n\n'); }, 25000);
