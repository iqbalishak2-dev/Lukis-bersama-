// pwa.js - menjadikan Lukis Bersama boleh dipasang sebagai app (PWA).
// Dipanggil dengan: require('./pwa');  (di bahagian atas server.js)
const http = require('http');
const zlib = require('zlib');

// ---- Ikon PNG dijana dalam kod (tiada fail gambar diperlukan) ----
const CRC = (() => {
  const t = [];
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
function crc32(buf) { let c = 0xffffffff; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function makePng(size) {
  const cov = (d, r) => Math.max(0, Math.min(1, r - d + 0.5));
  const bg = [232, 89, 12];
  const layers = [ // [dx, dy, jejari, warna] dalam unit saiz
    [0, 0, 0.30, [255, 255, 255]],
    [0.13, 0.12, 0.06, bg],
    [-0.13, -0.06, 0.045, [224, 49, 49]],
    [-0.03, -0.15, 0.045, [252, 196, 25]],
    [0.09, -0.12, 0.045, [28, 126, 214]],
    [-0.14, 0.07, 0.045, [47, 158, 68]]
  ];
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      let col = bg.slice();
      for (const [dx, dy, r, c] of layers) {
        const d = Math.hypot(x + 0.5 - size * (0.5 + dx), y + 0.5 - size * (0.5 + dy));
        const a = cov(d, r * size);
        if (a > 0) col = col.map((v, i) => v * (1 - a) + c[i] * a);
      }
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = col[0]; raw[o + 1] = col[1]; raw[o + 2] = col[2]; raw[o + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))
  ]);
}
const iconCache = {};
const icon = n => iconCache[n] || (iconCache[n] = makePng(n));

const MANIFEST = JSON.stringify({
  name: 'Lukis Bersama',
  short_name: 'Lukis',
  description: 'Lukis dan teka bersama rakan secara masa nyata',
  lang: 'ms',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  orientation: 'portrait',
  background_color: '#faf7f2',
  theme_color: '#e8590c',
  icons: [
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
  ]
});

const SW = `
const C = 'lukis-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;
  if (r.mode === 'navigate') {
    e.respondWith(
      fetch(r).then(res => { const cp = res.clone(); caches.open(C).then(c => c.put('/shell', cp)); return res; })
        .catch(() => caches.match('/shell').then(x => x || new Response('Tiada sambungan internet. Game ini perlukan internet untuk main bersama.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })))
    );
  }
});
`;

function handle(req, res) {
  if (req.method !== 'GET') return false;
  const p = req.url.split('?')[0];
  if (p === '/manifest.webmanifest') {
    res.writeHead(200, { 'Content-Type': 'application/manifest+json', 'Cache-Control': 'no-cache' });
    res.end(MANIFEST); return true;
  }
  if (p === '/sw.js') {
    res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'no-cache' });
    res.end(SW); return true;
  }
  const sizes = { '/icon-192.png': 192, '/icon-512.png': 512, '/apple-touch-icon.png': 180 };
  if (sizes[p]) {
    res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' });
    res.end(icon(sizes[p])); return true;
  }
  return false;
}

// Pasang ke http.createServer supaya laluan PWA dikendalikan sebelum pelayan utama.
const orig = http.createServer;
http.createServer = function (...args) {
  const i = args.findIndex(a => typeof a === 'function');
  if (i >= 0) {
    const h = args[i];
    args[i] = (req, res) => { if (!handle(req, res)) h(req, res); };
  }
  return orig.apply(http, args);
};
