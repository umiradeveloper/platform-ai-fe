# Umira AI — Frontend (Next.js)

Ini antarmuka chat dan dashboard admin **Umira AI Assistant Platform**, dengan tema logo Umira (teal
`#0A6079 → #02475A`, tembaga `#8B4A1C / #A8622C`). Frontend ini bisa berdiri sendiri dan terhubung ke
backend (`../backend`) lewat HTTP/SSE.

Kebutuhan: **Node.js 22** dan backend Umira AI yang sudah berjalan.

## Mulai cepat (Mac / development)

```bash
cp .env.example .env.local      # default: proxy ke http://localhost:4000
npm install
npm run dev                     # http://localhost:3000
```

## Cara terhubung ke backend

Pilih salah satu di `.env.local`. **Nilainya dibaca saat build**, jadi setelah mengubahnya jalankan
ulang `npm run build` (atau `npm run update`).

| Mode | `.env.local` | Kapan dipakai | Syarat di backend `.env` |
|---|---|---|---|
| **A. Langsung** | `NEXT_PUBLIC_API_URL=https://api.umira.id/api/v1` | Frontend dan backend di domain/server berbeda | `CORS_ORIGINS=https://ai.umira.id`. Beda site sama sekali → `COOKIE_SAMESITE=none` + HTTPS |
| **B. Proxy Next.js** | `NEXT_PUBLIC_API_URL=` (kosong) dan `API_PROXY_TARGET=http://<ip-backend>:4000` | Development, atau backend di jaringan internal yang tidak dibuka ke publik | Tidak perlu CORS |

Mode B juga bisa digantikan Nginx bila keduanya di satu server: aktifkan blok `/api/` di
`deploy/nginx-web.conf`.

## Production di Ubuntu VPS

```bash
# Mode A
sudo WEB_DOMAIN=ai.umira.id API_URL=https://api.umira.id/api/v1 bash scripts/setup-ubuntu.sh
# Mode B
sudo WEB_DOMAIN=ai.umira.id API_PROXY_TARGET=http://10.0.0.5:4000 bash scripts/setup-ubuntu.sh

sudo certbot --nginx -d ai.umira.id
```

Script memasang Node 22, PM2 (auto-start), dan Nginx (`deploy/nginx-web.conf`), lalu menjalankan build.

## Perintah

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Dev server (port 3000, atau `PORT=…`) |
| `npm run build` | Build standalone (`.next/standalone/server.js`) |
| `npm start` | Jalankan dengan PM2 (`umira-web`). Atur port/host: `PORT=3000 WEB_HOST=127.0.0.1 npm start` |
| `npm run restart` · `stop` · `logs` · `update` | Kelola PM2. `update` = install, build, restart |

## Halaman

| Route | Isi |
|---|---|
| `/login` `/register` `/forgot-password` `/reset-password` | Autentikasi |
| `/` `/c/[id]` | Chat: streaming, stop, regenerate, salin, Markdown + highlight kode, pilih model, jejak tool Hermes |
| `/settings` | Profil, ubah password, penggunaan token dan kuota harian |
| `/admin/*` | Overview, Pengguna, Model AI, Konfigurasi API, Penggunaan, Biaya, Log aktivitas, Pengaturan sistem |

## Struktur

```
src/app/          (auth)/ (main)/ admin/  — App Router
src/components/   chat/ (sidebar, chat-view, message, markdown, model-selector, prompt-input), admin/, ui/
src/lib/          api.ts (klien + refresh token), stream.ts (parser SSE), auth.tsx, chat-store.tsx
public/           logo Umira
deploy/           nginx-web.conf
```
