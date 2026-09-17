# Cara Deploy: Kasir Toko Mobile

## Ringkasan
- Aplikasi web SPA (static, client-only)
- 7 file

## File proyek
- `index.html`
- `package.json`
- `public/manifest.json`
- `public/sw.js`
- `src/main.jsx`
- `src/styles.css`
- `vite.config.js`

## Langkah deploy

### Vercel
1. Buka https://vercel.com/new lalu import repo ini (atau drag-drop folder proyek).
2. Framework: Other / Static. Build command kosong, output directory: ./ (atau folder dist bila ada).
3. Klik Deploy, salin URL.

### Netlify
1. Buka https://app.netlify.com/drop, drag-drop folder proyek.
2. Netlify otomatis deploy, salin URL.

### VPS (nginx)
1. Upload folder proyek ke server (mis. /var/www/kasir-toko-mobile).
2. Arahkan root nginx ke folder tersebut.
3. Reload nginx.

## Catatan
- Karena client-only, tidak ada backend/API. Data tersimpan di browser (localStorage).
