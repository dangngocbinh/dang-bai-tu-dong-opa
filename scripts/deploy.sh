#!/usr/bin/env bash
# deploy.sh — Redeploy khi có code mới (pull + build + restart)
# Dùng: bash scripts/deploy.sh [--host <ip>] [--user <site_user>] [--domain <domain>]
set -euo pipefail

# ── Mặc định cho tu-dang-bai.mecode.pro ───────────────────────────────────────
VPS_USER="root"
VPS_HOST="test.dangngocbinh.com"
SITE_USER="tudangbai"
DOMAIN="tu-dang-bai.mecode.pro"
APP_PORT="5666"

while [[ $# -gt 0 ]]; do
  case $1 in
    --host)    VPS_HOST="$2";   shift 2 ;;
    --user)    SITE_USER="$2";  shift 2 ;;
    --domain)  DOMAIN="$2";     shift 2 ;;
    --port)    APP_PORT="$2";   shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

APP_DIR="/home/$SITE_USER/htdocs/$DOMAIN"
APP_NAME="$SITE_USER"
SSH="ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_HOST"

echo ""
echo "══════════════════════════════════════════════════"
echo "  Redeploy: $DOMAIN"
echo "  Host: $VPS_HOST  |  Dir: $APP_DIR"
echo "══════════════════════════════════════════════════"
echo ""

echo "▶ Pull code mới nhất..."
$SSH "cd $APP_DIR && git pull 2>&1 | tail -5"

echo "▶ Install dependencies..."
$SSH "cd $APP_DIR && npm install --legacy-peer-deps 2>&1 | tail -3"

echo "▶ Migrate DB..."
$SSH "cd $APP_DIR && npx prisma migrate deploy 2>&1 | tail -5" || \
$SSH "cd $APP_DIR && npx prisma db push 2>&1 | tail -5"

echo "▶ Build..."
$SSH "cd $APP_DIR && npm run build 2>&1 | tail -8"

echo "▶ Restart PM2..."
$SSH "pm2 restart $APP_NAME --update-env && pm2 save"

echo ""
echo "══════════════════════════════════════════════════"
echo "  ✅ Deploy xong → https://$DOMAIN"
echo "══════════════════════════════════════════════════"
echo ""

# Kiểm tra nhanh
sleep 2
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN/" || echo "000")
if [[ "$HTTP_CODE" == "2"* || "$HTTP_CODE" == "3"* ]]; then
  echo "  ✓ HTTP $HTTP_CODE — app đang chạy"
else
  echo "  ⚠ HTTP $HTTP_CODE — kiểm tra logs:"
  echo "    ssh $VPS_USER@$VPS_HOST \"pm2 logs $APP_NAME --lines 30\""
fi
