#!/usr/bin/env bash
# Pemasangan otomatis Palapa Dentists di server Ubuntu 22.04/24.04 yang BARU dan kosong.
# Jalankan sebagai root dari dalam folder proyek:
#     bash deploy/install.sh NAMA_DOMAIN EMAIL_ANDA [www]
# Contoh:  bash deploy/install.sh palapadentists.com saya@gmail.com www
#   (kata "www" ditambahkan bila www.namadomain juga sudah diarahkan ke server)
# Menjalankan ulang skrip ini = memperbarui aplikasi (data tidak disentuh).
set -euo pipefail
DRY="${DRYRUN:-0}"
run() { if [ "$DRY" = 1 ]; then echo "  + $*"; else "$@"; fi; }
put() { if [ "$DRY" = 1 ]; then echo "  [tulis file] $1"; cat >/dev/null; else cat > "$1"; fi; }
say() { echo; echo "==> $*"; }

DOMAIN="${1:-}"; EMAIL="${2:-}"; WWW="${3:-}"
[ "$DRY" = 1 ] || [ "$(id -u)" -eq 0 ] || { echo "Jalankan sebagai root: sudo bash deploy/install.sh domain email"; exit 1; }
[[ "$DOMAIN" =~ ^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]] || { echo "Pemakaian: bash deploy/install.sh namadomain.com email@anda.com [www]"; exit 1; }
[[ "$EMAIL" =~ ^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$ ]] || { echo "Email tidak valid. Pemakaian: bash deploy/install.sh namadomain.com email@anda.com [www]"; exit 1; }
command -v apt-get >/dev/null || { echo "Skrip ini hanya untuk Ubuntu/Debian."; exit 1; }

SRC="$(cd "$(dirname "$0")/.." && pwd)"
APP=/home/palapa/palapa; DATA=/var/lib/palapa; BK=/var/backups/palapa
NAMES="$DOMAIN"; CERT_NAMES="-d $DOMAIN"
if [ "$WWW" = "www" ]; then NAMES="$DOMAIN www.$DOMAIN"; CERT_NAMES="-d $DOMAIN -d www.$DOMAIN"; fi

# --- akun admin pertama (hanya ditanyakan bila belum ada akun) ---
AUSER="${ADMIN_USER:-}"; APASS="${ADMIN_PASS:-}"
if [ -z "$APASS" ] && [ "$DRY" != 1 ] && [ ! -s "$DATA/palapa.db" ]; then
  read -r -p "Username admin pertama [admin]: " AUSER; AUSER="${AUSER:-admin}"
  while true; do
    read -r -s -p "Password admin (minimal 8 karakter): " APASS; echo
    read -r -s -p "Ulangi password: " P2; echo
    [ "$APASS" = "$P2" ] && [ "${#APASS}" -ge 8 ] && break
    echo "Password tidak sama atau kurang dari 8 karakter. Coba lagi."
  done
fi
AUSER="${AUSER:-admin}"

say "1/7 Memasang paket yang dibutuhkan"
export DEBIAN_FRONTEND=noninteractive
run apt-get update -y
run apt-get install -y curl ca-certificates gnupg unzip nginx ufw build-essential python3 certbot python3-certbot-nginx

say "2/7 Memasang Node.js"
if command -v node >/dev/null && [ "$(node -p 'process.versions.node.split(".")[0]')" -ge 18 ]; then
  echo "Node.js sudah ada: $(node -v)"
else
  if [ "$DRY" = 1 ]; then echo "  + curl NodeSource setup_20.x | bash; apt-get install -y nodejs"; else
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -; apt-get install -y nodejs; fi
fi
NODE_BIN="$(command -v node || echo /usr/bin/node)"

say "3/7 Menyalin aplikasi dan memasang komponen"
id palapa >/dev/null 2>&1 || run adduser --system --group --home /home/palapa --shell /bin/bash palapa
run mkdir -p "$APP" "$DATA" "$BK"
if [ "$SRC" != "$APP" ]; then
  run cp -r "$SRC/server.js" "$SRC/chat.js" "$SRC/patients.js" "$SRC/ai.js" "$SRC/seeds.js" "$SRC/package.json" "$SRC/package-lock.json" "$SRC/public" "$SRC/deploy" "$APP/"
fi
if [ ! -s "$DATA/palapa.db" ] && [ -f "$SRC/data/palapa.db" ]; then run cp "$SRC/data/palapa.db" "$DATA/palapa.db"; fi
run chown -R palapa:palapa /home/palapa "$DATA" "$BK"
if [ "$DRY" = 1 ]; then echo "  + (sebagai user palapa) cd $APP && npm install --omit=dev"; else
  runuser -u palapa -- bash -c "cd '$APP' && npm install --omit=dev --no-audit --no-fund"; fi

say "4/7 Membuat akun admin"
if [ -z "${APASS:-}" ]; then
  echo "Database sudah ada, akun admin tidak diubah."
elif [ "$DRY" = 1 ]; then echo "  + node deploy/create-admin.js --if-empty (user: $AUSER)"
else
  runuser -u palapa -- env DATA_DIR="$DATA" ADMIN_USER="$AUSER" ADMIN_PASS="$APASS" "$NODE_BIN" "$APP/deploy/create-admin.js" --if-empty
fi

say "5/7 Menjalankan aplikasi sebagai layanan"
put /etc/palapa.env <<ENVEOF
PORT=3000
HOST=127.0.0.1
DATA_DIR=$DATA
COOKIE_SECURE=1
SITE_URL=https://$DOMAIN
ENVEOF
run chmod 600 /etc/palapa.env
put /etc/systemd/system/palapa.service <<SVCEOF
[Unit]
Description=Palapa Dentists website
After=network.target

[Service]
User=palapa
WorkingDirectory=$APP
EnvironmentFile=/etc/palapa.env
ExecStart=$NODE_BIN server.js
Restart=always
RestartSec=3
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
SVCEOF
run systemctl daemon-reload
run systemctl enable palapa
run systemctl restart palapa
if [ "$DRY" != 1 ]; then
  ok=0; for i in $(seq 1 20); do curl -fs http://127.0.0.1:3000/api/me >/dev/null 2>&1 && { ok=1; break; }; sleep 1; done
  [ "$ok" = 1 ] || { echo "Aplikasi belum berjalan. Lihat: journalctl -u palapa -n 50"; exit 1; }
  echo "Aplikasi berjalan."
fi

say "6/7 Mengatur web server (Nginx) dan firewall"
put /etc/nginx/sites-available/palapa <<NGEOF
server {
    listen 80;
    server_name $NAMES;
    client_max_body_size 6m;
    location /api/chats/stream {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_buffering off;
        proxy_read_timeout 1h;
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGEOF
run rm -f /etc/nginx/sites-enabled/default
run ln -sf /etc/nginx/sites-available/palapa /etc/nginx/sites-enabled/palapa
run nginx -t
run systemctl reload nginx
SSHP="22"; if [ "$DRY" != 1 ] && command -v sshd >/dev/null; then SSHP="$(sshd -T 2>/dev/null | awk '/^port /{print $2; exit}')"; SSHP="${SSHP:-22}"; fi
run ufw allow "${SSHP}/tcp"; run ufw allow 80/tcp; run ufw allow 443/tcp; run ufw --force enable

say "7/7 HTTPS (gembok) dan backup harian"
PUBIP=""; DNSIP=""
if [ "$DRY" != 1 ]; then
  PUBIP="$(curl -fs --max-time 8 https://api.ipify.org || true)"; DNSIP="$(getent ahostsv4 "$DOMAIN" | awk '{print $1; exit}' || true)"
fi
HTTPS=skip
if [ "$DRY" = 1 ]; then echo "  + certbot --nginx $CERT_NAMES -m $EMAIL --agree-tos -n --redirect"; HTTPS=dry
elif [ -n "$PUBIP" ] && [ -n "$DNSIP" ] && [ "$PUBIP" != "$DNSIP" ]; then
  echo "PERHATIAN: $DOMAIN mengarah ke $DNSIP, bukan ke server ini ($PUBIP). HTTPS dilewati."
elif certbot --nginx $CERT_NAMES -m "$EMAIL" --agree-tos --no-eff-email --redirect -n; then HTTPS=ok
else echo "Sertifikat HTTPS gagal dibuat (biasanya DNS belum siap)."; fi
put /etc/cron.d/palapa-backup <<CREOF
0 2 * * * palapa cd $APP && DATA_DIR=$DATA $NODE_BIN deploy/backup.js $BK >> /var/log/palapa-backup.log 2>&1
CREOF
run chmod 644 /etc/cron.d/palapa-backup

echo
echo "=================== SELESAI ==================="
if [ "$HTTPS" = ok ] || [ "$HTTPS" = dry ]; then echo "Website : https://$DOMAIN"; echo "Login   : https://$DOMAIN/#/login"
else echo "Website : http://${PUBIP:-IP_SERVER}  (HTTPS belum aktif)"
     echo "Setelah DNS $DOMAIN mengarah ke server ini, jalankan:"; echo "  certbot --nginx $CERT_NAMES -m $EMAIL --agree-tos --redirect"; fi
echo "Admin   : $AUSER (password yang Anda isi tadi)"
echo "Backup  : otomatis tiap hari jam 02.00 ke $BK (salin juga ke tempat lain)"
echo "Langkah berikutnya: login, buka Dashboard, klik 'Isi data awal', lalu tambah akun admin lain di menu Akun."
