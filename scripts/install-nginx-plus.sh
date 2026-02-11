#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATA_PLANE_KEY:-}" ]]; then
  echo "DATA_PLANE_KEY is required" >&2
  exit 1
fi

sudo mkdir -p /etc/ssl/nginx /etc/nginx /etc/apt/keyrings

sudo mv /tmp/nginx-repo.crt /etc/ssl/nginx/nginx-repo.crt
sudo mv /tmp/nginx-repo.key /etc/ssl/nginx/nginx-repo.key
sudo mv /tmp/license.jwt /etc/nginx/license.jwt
sudo mv /tmp/license.key /etc/nginx/license.key

sudo chown root:root /etc/ssl/nginx/nginx-repo.crt /etc/ssl/nginx/nginx-repo.key
sudo chmod 600 /etc/ssl/nginx/nginx-repo.key
sudo chmod 644 /etc/ssl/nginx/nginx-repo.crt

sudo chown root:root /etc/nginx/license.jwt /etc/nginx/license.key
sudo chmod 600 /etc/nginx/license.key
sudo chmod 644 /etc/nginx/license.jwt

sudo tee /etc/apt/apt.conf.d/90nginx >/dev/null <<'EOF'
Acquire::https::pkgs.nginx.com::SslCert "/etc/ssl/nginx/nginx-repo.crt";
Acquire::https::pkgs.nginx.com::SslKey  "/etc/ssl/nginx/nginx-repo.key";
EOF

sudo tee /etc/apt/apt.conf.d/99nginx-sandbox >/dev/null <<'EOF'
APT::Sandbox::User "root";
EOF

sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg

curl -fsSL https://nginx.org/keys/nginx_signing.key | sudo gpg --dearmor -o /etc/apt/keyrings/nginx.gpg

echo "deb [signed-by=/etc/apt/keyrings/nginx.gpg] https://pkgs.nginx.com/plus/ubuntu jammy nginx-plus" | \
  sudo tee /etc/apt/sources.list.d/nginx-plus.list

sudo apt-get update
sudo apt-get install -y nginx-plus

sudo tee /etc/nginx/conf.d/nginx-one-api.conf >/dev/null <<'EOF'
server {
    listen 127.0.0.1:8080;
    access_log off;

    location /api {
        api write=on;
    }
}
EOF

sudo nginx -t
sudo systemctl enable --now nginx
sudo systemctl reload nginx

curl https://agent.connect.nginx.com/nginx-agent/install | \
  sudo DATA_PLANE_KEY="$DATA_PLANE_KEY" sh -s -- -y

sudo systemctl enable --now nginx-agent
