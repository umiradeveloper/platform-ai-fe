import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Mode koneksi ke backend (dibaca saat BUILD):
//  1. NEXT_PUBLIC_API_URL diisi  → browser memanggil backend langsung (lintas domain, CORS + cookie).
//  2. NEXT_PUBLIC_API_URL kosong → browser memanggil /api/v1 di domain frontend, lalu Next.js
//     meneruskannya ke API_PROXY_TARGET (cocok untuk development & satu domain tanpa CORS).
const DIRECT = !!process.env.NEXT_PUBLIC_API_URL;
const PROXY_TARGET = (process.env.API_PROXY_TARGET || 'http://localhost:4000').replace(/\/+$/, '');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  outputFileTracingRoot: dirname(fileURLToPath(import.meta.url)),
  reactStrictMode: true,
  poweredByHeader: false,
  // Kompresi dimatikan agar SSE streaming tidak ter-buffer saat melewati proxy Next.
  compress: false,
  async rewrites() {
    return DIRECT ? [] : [{ source: '/api/:path*', destination: `${PROXY_TARGET}/api/:path*` }];
  },
};

export default nextConfig;
