# Lukis Bersama — PWA untuk GitHub + Render

Pakej ini menambah pemasangan PWA pada aplikasi Lukis Bersama yang anda berikan, tanpa menggantikan keseluruhan HTML atau fungsi permainan.

## Fail dalam ZIP
- `manifest.webmanifest`
- `sw.js`
- `icons/icon-192.png`
- `icons/icon-512.png`
- `PWA-INSTALL-CODE.js` — kod butang pemasangan yang perlu menggantikan blok PWA lama di hujung `index.html`.

## A. Muat naik fail ke GitHub
Letakkan `manifest.webmanifest`, `sw.js` dan folder `icons` di root projek yang sama aras dengan `index.html`.

## B. Pastikan bahagian `<head>` mempunyai
HTML anda sudah ada pautan manifest ini, jadi kekalkan:
```html
<link rel="manifest" href="/manifest.webmanifest">
<meta name="theme-color" content="#e8590c">
<link rel="apple-touch-icon" href="/icons/icon-192.png">
```
Saya syorkan tukar apple-touch-icon ke `/icons/icon-192.png` seperti di atas. Tag iOS sedia ada boleh dikekalkan.

## C. Gantikan blok PWA lama
Di hujung `index.html`, cari komen `// PWA` dan padam dari baris itu hingga sebelum `</script>`. Jangan padam `</script>` atau kod permainan sebelumnya.
Salin kandungan `PWA-INSTALL-CODE.js` ke tempat blok lama itu.

## D. Commit dan Render
1. Commit semua fail dan perubahan HTML ke branch yang Render deploy.
2. Tunggu deploy berjaya.
3. Semak URL berikut dengan domain Render anda:
   - `/manifest.webmanifest`
   - `/sw.js`
   - `/icons/icon-192.png`
   - `/icons/icon-512.png`
4. Semua mesti terbuka tanpa 404.
5. Buka aplikasi dalam Chrome Android, refresh dan tekan `Pasang sebagai app`. Jika Chrome belum sedia menawarkan prompt, butang memberi arahan menu Chrome sebagai alternatif.

## Perhatian penting
- Hosting mesti menggunakan HTTPS (Render biasanya menyediakan HTTPS).
- PWA tidak boleh menjadikan permainan multiplayer berfungsi tanpa internet; endpoint `/events`, `/send`, `/baru`, `/cek` perlu kekal live.
- Jika ada Service Worker lama, selepas deploy buka Chrome → Site settings → Storage → Clear data untuk domain ini, kemudian buka semula.
- iPhone/iPad: buka menggunakan Safari → Share → Add to Home Screen.
