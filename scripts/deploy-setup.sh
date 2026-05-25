#!/usr/bin/env bash
# deploy-setup.sh — Cài đặt lần đầu trên server mới (CloudPanel + PM2)
# Dùng: bash scripts/deploy-setup.sh
set -euo pipefail

# ── Cấu hình ──────────────────────────────────────────────────────────────────
VPS_USER="root"
VPS_HOST=""
DOMAIN=""
APP_PORT=""
SITE_USER=""
REPO_URL="https://github.com/dangngocbinh/dang-bai-tu-dong-opa.git"
APP_DIR=""   # tự điền sau khi có SITE_USER và DOMAIN

# ── Đọc tham số ───────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case $1 in
    --host)    VPS_HOST="$2";   shift 2 ;;
    --domain)  DOMAIN="$2";     shift 2 ;;
    --port)    APP_PORT="$2";   shift 2 ;;
    --user)    SITE_USER="$2";  shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# ── Validate ───────────────────────────────────────────────────────────────────
for var in VPS_HOST DOMAIN APP_PORT SITE_USER; do
  if [[ -z "${!var}" ]]; then
    echo "❌ Thiếu --${var,,}. Dùng:"
    echo "   bash scripts/deploy-setup.sh --host <ip> --domain <domain> --port <port> --user <site_user>"
    exit 1
  fi
done

APP_DIR="/home/$SITE_USER/htdocs/$DOMAIN"
SITE_PASS="$(openssl rand -hex 16)"
DB_NAME="${SITE_USER}_db"
DB_USER="${SITE_USER}_user"
DB_PASS="$(openssl rand -hex 24)"

echo ""
echo "══════════════════════════════════════════════════"
echo "  Deploy: $DOMAIN → $VPS_HOST"
echo "  App port: $APP_PORT  |  Site user: $SITE_USER"
echo "══════════════════════════════════════════════════"
echo ""

SSH="ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_HOST"

# ── 1. Kiểm tra CloudPanel ─────────────────────────────────────────────────────
echo "▶ Kiểm tra CloudPanel..."
$SSH "clpctl --version" > /dev/null
echo "  ✓ CloudPanel OK"

# ── 2. Tạo site reverse proxy ──────────────────────────────────────────────────
echo "▶ Tạo site CloudPanel..."
$SSH "clpctl site:add:reverse-proxy \
  --domainName=$DOMAIN \
  --reverseProxyUrl='http://127.0.0.1:$APP_PORT' \
  --siteUser=$SITE_USER \
  --siteUserPassword='$SITE_PASS'"
echo "  ✓ Site tạo xong (pass Linux user: $SITE_PASS)"

# ── 3. Cài PostgreSQL nếu chưa có ─────────────────────────────────────────────
echo "▶ Kiểm tra PostgreSQL..."
PG_RUNNING=$($SSH "ss -tlnp | grep 5432 | wc -l")
if [[ "$PG_RUNNING" -eq 0 ]]; then
  echo "  Chưa có PostgreSQL, đang cài..."
  $SSH "apt-get update -qq && apt-get install -y postgresql postgresql-contrib 2>&1 | tail -3"
fi
echo "  ✓ PostgreSQL OK"

# ── 4. Tạo DB và user ──────────────────────────────────────────────────────────
echo "▶ Tạo database..."
$SSH "sudo -u postgres psql -c \"CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';\" 2>/dev/null || true"
$SSH "sudo -u postgres psql -c \"CREATE DATABASE $DB_NAME OWNER $DB_USER;\" 2>/dev/null || true"
$SSH "sudo -u postgres psql -c \"GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;\""
echo "  ✓ Database: $DB_NAME / user: $DB_USER"

# ── 5. Clone repo ──────────────────────────────────────────────────────────────
echo "▶ Clone repo..."
$SSH "cd $APP_DIR && git clone $REPO_URL . 2>&1 | tail -3"
echo "  ✓ Repo cloned"

# ── 6. Tạo .env ───────────────────────────────────────────────────────────────
echo "▶ Tạo .env từ .env.production.example..."
if [[ ! -f .env.production.example ]]; then
  echo "  ⚠ Không tìm thấy .env.production.example — bỏ qua bước này"
  echo "  → Tạo .env thủ công tại $APP_DIR/.env trước khi chạy deploy"
else
  # Copy .env.production.example lên server và thay thế các placeholder
  scp .env.production.example "$VPS_USER@$VPS_HOST:$APP_DIR/.env"
  $SSH "sed -i 's|__DATABASE_URL__|postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME|g' $APP_DIR/.env"
  $SSH "sed -i 's|__NEXTAUTH_URL__|https://$DOMAIN|g' $APP_DIR/.env"
  $SSH "sed -i 's|__NEXT_PUBLIC_APP_URL__|https://$DOMAIN|g' $APP_DIR/.env"
  $SSH "echo 'AUTH_TRUST_HOST=true' >> $APP_DIR/.env"
  echo "  ✓ .env tạo xong"
fi

# ── 7. Cài PM2 nếu chưa có ────────────────────────────────────────────────────
echo "▶ Kiểm tra PM2..."
PM2_OK=$($SSH "command -v pm2 && echo ok || echo no")
if [[ "$PM2_OK" != "ok" ]]; then
  echo "  Cài PM2..."
  $SSH "npm install -g pm2 2>&1 | tail -3"
fi
echo "  ✓ PM2 OK"

# ── 8. Install + Build + Start ────────────────────────────────────────────────
echo "▶ Install dependencies..."
$SSH "cd $APP_DIR && npm install --legacy-peer-deps 2>&1 | tail -3"

echo "▶ Push DB schema..."
$SSH "cd $APP_DIR && npx prisma db push 2>&1 | tail -5"

echo "▶ Build..."
$SSH "cd $APP_DIR && npm run build 2>&1 | tail -5"

echo "▶ Start PM2..."
APP_NAME="${SITE_USER}"
$SSH "cd $APP_DIR && pm2 delete $APP_NAME 2>/dev/null; pm2 start npm --name $APP_NAME -- start -- -p $APP_PORT && pm2 save"

# ── 9. SSL ────────────────────────────────────────────────────────────────────
echo "▶ Cài SSL Let's Encrypt..."
$SSH "clpctl lets-encrypt:install:certificate --domainName=$DOMAIN"
echo "  ✓ SSL OK"

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════════════"
echo "  ✅ Deploy xong!"
echo "  URL:     https://$DOMAIN"
echo "  DB:      postgresql://$DB_USER:<pass>@localhost:5432/$DB_NAME"
echo "  PM2:     pm2 restart $APP_NAME"
echo "  Logs:    ssh $VPS_USER@$VPS_HOST \"pm2 logs $APP_NAME\""
echo ""
echo "  ⚠ Lưu lại thông tin DB:"
echo "    DB_NAME=$DB_NAME"
echo "    DB_USER=$DB_USER"
echo "    DB_PASS=$DB_PASS"
echo "══════════════════════════════════════════════════"
