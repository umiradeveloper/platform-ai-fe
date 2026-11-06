// Next.js "standalone" tidak menyertakan /public dan /.next/static — salin agar
// `npm start` (node .next/standalone/server.js) bisa langsung dipakai di PM2 / VPS tanpa Docker.
import { cpSync, existsSync, rmSync } from 'node:fs';

const out = '.next/standalone';
if (!existsSync(out)) process.exit(0);
for (const [src, dst] of [['public', `${out}/public`], ['.next/static', `${out}/.next/static`]]) {
  rmSync(dst, { recursive: true, force: true });
  cpSync(src, dst, { recursive: true });
}
console.log('✓ public & static disalin ke .next/standalone');
