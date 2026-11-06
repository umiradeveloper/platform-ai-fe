#!/usr/bin/env bash
# Setup FRONTEND Umira AI di Ubuntu 22.04/24.04: Node 22, PM2, Nginx.
# Jalankan dari folder frontend, pilih salah satu:
#   (A) backend di domain lain:   sudo WEB_DOMAIN=ai.umira.id API_URL=https://api.umira.id/api/v1 bash scripts/setup-ubuntu.sh
#   (B) lewat proxy Next.js:      sudo WEB_DOMAIN=ai.umira.id API_PROXY_TARGET=http://10.0.0.5:4000 bash scripts/setup-ubuntu.sh
# Opsional: NO_NGINX=1, APP_USER=<pemilik folder>
set -euo pipefail
cd "$(dirname "$0")/.."
DIR="$(pwd)"
APP_USER="${APP_USER:-${SUDO_USER:-$(stat -c %U "$DIR")}}"
WEB_DOMAIN="${WEB_DOMAIN:-_}"
step() { printf "\n\033[1;36m▶ %s\033[0m\n" "$*"; }
as_app() { sudo -u "$APP_USER" -H bash -lc "cd '$DIR' && $*"; }

[ "$(id -u)" -eq 0 ] || { echo "Jalankan dengan sudo"; exit 1; }

step "Paket sistem"
apt-get update -y
apt-get install -y curl ca-certificates
[ "${NO_NGINX:-0}" = "1" ] || apt-get install -y nginx
if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 22 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
command -v pm2 >/dev/null || npm i -g pm2

step ".env.local"
if [ ! -f .env.local ]; then
  as_app "cp .env.example .env.local"
fi
[ -n "${API_URL:-}" ] && as_app "sed -i 's#^NEXT_PUBLIC_API_URL=.*#NEXT_PUBLIC_API_URL=${API_URL}#' .env.local"
[ -n "${API_PROXY_TARGET:-}" ] && as_app "sed -i 's#^API_PROXY_TARGET=.*#API_PROXY_TARGET=${API_PROXY_TARGET}#' .env.local"
grep -E '^(NEXT_PUBLIC_API_URL|API_PROXY_TARGET)=' .env.local

step "Install & build"
as_app "npm install && npm run build"

step "PM2 (auto-start saat boot)"
BIND=127.0.0.1; [ "${NO_NGINX:-0}" = "1" ] && BIND=0.0.0.0
as_app "WEB_HOST=$BIND pm2 start ecosystem.config.cjs --update-env && pm2 save"
env PATH="$PATH" pm2 startup systemd -u "$APP_USER" --hp "$(getent passwd "$APP_USER" | cut -d: -f6)" >/dev/null

if [ "${NO_NGINX:-0}" != "1" ]; then
  step "Nginx (${WEB_DOMAIN})"
  sed "s/server_name _;/server_name ${WEB_DOMAIN};/" deploy/nginx-web.conf > /etc/nginx/sites-available/umira-web
  ln -sf /etc/nginx/sites-available/umira-web /etc/nginx/sites-enabled/umira-web
  [ "$WEB_DOMAIN" = "_" ] && rm -f /etc/nginx/sites-enabled/default
  nginx -t && systemctl reload nginx
fi

cat <<TXT

✅ Frontend berjalan.
 - Pastikan backend .env → CORS_ORIGINS & APP_URL = URL frontend ini (mode A).
 - HTTPS: sudo apt install -y certbot python3-certbot-nginx && sudo certbot --nginx -d ${WEB_DOMAIN}
 - Mengubah .env.local? Jalankan: npm run update
TXT
