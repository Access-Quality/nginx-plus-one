#!/usr/bin/env bash
# install-nginx-plus.sh - NAP v5 (decoupled) deployment
# Diff vs nginx-plus-ec2 version:
#   - NGINX Plus pinned to R34-R36 via apt preferences (Pin-Priority: 900)
#   - NGINX Agent 3.x explicitly installed
#   - App Protect WAF v5: enforcer + config-mgr run as Docker containers
#   - /opt/app_protect/{config,bd_config} with UID/GID 101:101
#   - app_protect_enforcer_address 127.0.0.1:50000 in nginx.conf
#   - Security logging to syslog:server=127.0.0.1:5140
set -euo pipefail

# ── Guards ────────────────────────────────────────────────────────────────────
for var in DATA_PLANE_KEY LICENSE_JWT; do
  if [[ -z "${!var:-}" ]]; then
    echo "ERROR: $var is required" >&2
    exit 1
  fi
done

# ── System dependencies ───────────────────────────────────────────────────────
sudo apt-get update -qq
sudo apt-get install -y --no-install-recommends \
  apt-transport-https ca-certificates curl gnupg lsb-release wget

codename="$(lsb_release -cs)"

# ── Docker CE ─────────────────────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | sudo gpg --yes --dearmor -o /etc/apt/keyrings/docker.gpg
  sudo chmod a+r /etc/apt/keyrings/docker.gpg

  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu ${codename} stable" \
    | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

  sudo apt-get update -qq
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
  sudo systemctl enable --now docker
fi

# Add ubuntu user to docker group to use docker without sudo
sudo usermod -aG docker ubuntu || true

# ── NGINX Plus repo & credentials ─────────────────────────────────────────────
sudo mkdir -p /etc/ssl/nginx /etc/nginx /etc/apt/keyrings

sudo mv /tmp/nginx-repo.crt /etc/ssl/nginx/nginx-repo.crt
sudo mv /tmp/nginx-repo.key /etc/ssl/nginx/nginx-repo.key
sudo mv /tmp/license.jwt    /etc/nginx/license.jwt
sudo mv /tmp/license.key    /etc/nginx/license.key

sudo chown root:root /etc/ssl/nginx/nginx-repo.crt /etc/ssl/nginx/nginx-repo.key
sudo chmod 644 /etc/ssl/nginx/nginx-repo.crt
sudo chmod 600 /etc/ssl/nginx/nginx-repo.key

sudo chown root:root /etc/nginx/license.jwt /etc/nginx/license.key
sudo chmod 644 /etc/nginx/license.jwt
sudo chmod 600 /etc/nginx/license.key

# APT SSL credentials for pkgs.nginx.com
sudo tee /etc/apt/apt.conf.d/90nginx >/dev/null <<'EOF'
Acquire::https::pkgs.nginx.com::SslCert "/etc/ssl/nginx/nginx-repo.crt";
Acquire::https::pkgs.nginx.com::SslKey  "/etc/ssl/nginx/nginx-repo.key";
EOF

sudo tee /etc/apt/apt.conf.d/99nginx-sandbox >/dev/null <<'EOF'
APT::Sandbox::User "root";
EOF

# GPG keys
curl -fsSL https://nginx.org/keys/nginx_signing.key \
  | sudo gpg --yes --dearmor -o /usr/share/keyrings/nginx-archive-keyring.gpg

curl -fsSL https://cs.nginx.com/static/keys/app-protect-security-updates.key \
  | sudo gpg --yes --dearmor -o /usr/share/keyrings/app-protect-security-updates.gpg

# Repositories
echo "deb [signed-by=/usr/share/keyrings/nginx-archive-keyring.gpg] \
https://pkgs.nginx.com/plus/ubuntu ${codename} nginx-plus" \
  | sudo tee /etc/apt/sources.list.d/nginx-plus.list

echo "deb [signed-by=/usr/share/keyrings/nginx-archive-keyring.gpg] \
https://pkgs.nginx.com/app-protect/ubuntu ${codename} nginx-plus" \
  | sudo tee /etc/apt/sources.list.d/nginx-app-protect.list

echo "deb [signed-by=/usr/share/keyrings/app-protect-security-updates.gpg] \
https://pkgs.nginx.com/app-protect-security-updates/ubuntu ${codename} nginx-plus" \
  | sudo tee /etc/apt/sources.list.d/app-protect-security-updates.list

# ── Repository pinning R34-R36 (Pin-Priority: 900) ───────────────────────────
sudo tee /etc/apt/preferences.d/99nginx >/dev/null <<'EOF'
Package: *
Pin: origin pkgs.nginx.com
Pin-Priority: 900
EOF

sudo apt-get update -qq

# ── NGINX Plus R34-R36 + App Protect module (v5.x) ───────────────────────────
# app-protect 5.x depends on nginx-plus R30+; pin priority ensures pkgs.nginx.com wins.
sudo apt-get install -y nginx-plus app-protect

# ── Load NAP module in nginx.conf ─────────────────────────────────────────────
if ! sudo grep -qF 'load_module modules/ngx_http_app_protect_module.so;' /etc/nginx/nginx.conf; then
  sudo sed -i '1iload_module modules/ngx_http_app_protect_module.so;' /etc/nginx/nginx.conf
fi

# ── NGINX One management API (write=on for remote management) ─────────────────
sudo tee /etc/nginx/conf.d/nginx-one-api.conf >/dev/null <<'EOF'
server {
    listen 127.0.0.1:8080;
    access_log off;

    location /api {
        api write=on;
    }
}
EOF

# ── NAP v5 runtime directories (UID/GID 101 = nginx inside containers) ────────
sudo mkdir -p /opt/app_protect/config /opt/app_protect/bd_config
sudo chown -R 101:101 /opt/app_protect

# ── Login to NGINX private registry using JWT ────────────────────────────────
# Username must be lowercase 'oauth2accesstoken' (case-sensitive)
echo "$LICENSE_JWT" \
  | sudo docker login private-registry.nginx.com -u oauth2accesstoken --password-stdin

# ── Pull WAF v5 Docker images ─────────────────────────────────────────────────
# waf-enforcer: the inspection engine (replaces in-process NAP v4 broker)
# waf-config-mgr: compiles policy JSON → .tgz bundles consumed by NGINX module
sudo docker pull private-registry.nginx.com/nginx-app-protect/waf-enforcer:latest
sudo docker pull private-registry.nginx.com/nginx-app-protect/waf-config-mgr:latest

# Tag locally for docker-compose simplicity (matches docker-compose.yaml image names)
sudo docker tag \
  private-registry.nginx.com/nginx-app-protect/waf-enforcer:latest \
  nplus-v5-waf-enforcer:latest

sudo docker tag \
  private-registry.nginx.com/nginx-app-protect/waf-config-mgr:latest \
  nplus-v5-waf-config-mgr:latest

# ── Deploy WAF containers via docker-compose ──────────────────────────────────
sudo mkdir -p /opt/nap-v5
sudo cp /tmp/docker-compose.yaml /opt/nap-v5/docker-compose.yaml
sudo docker compose -f /opt/nap-v5/docker-compose.yaml up -d

# ── Wait for waf-config-mgr to compile the cinex policy bundle ────────────────
echo "Waiting for cinex policy bundle to be compiled..."
for i in $(seq 1 30); do
  if sudo test -f /opt/app_protect/bd_config/cinex.tgz; then
    echo "Policy bundle ready: /opt/app_protect/bd_config/cinex.tgz"
    break
  fi
  echo "  attempt $i/30 — bundle not ready yet, sleeping 5s..."
  sleep 5
done

if ! sudo test -f /opt/app_protect/bd_config/cinex.tgz; then
  echo "ERROR: cinex.tgz was not produced by waf-config-mgr after 150s" >&2
  sudo docker compose -f /opt/nap-v5/docker-compose.yaml logs >&2
  exit 1
fi

# ── Start NGINX Plus ──────────────────────────────────────────────────────────
sudo nginx -t
sudo systemctl enable --now nginx
sudo systemctl reload nginx

# ── NGINX Agent 3.x ───────────────────────────────────────────────────────────
# Install script auto-detects the latest Agent 3.x when AGENT_VERSION is not set;
# set it explicitly to ensure we stay on 3.x as required by NGINX One Console.
curl -fsSL https://agent.connect.nginx.com/nginx-agent/install \
  | sudo DATA_PLANE_KEY="$DATA_PLANE_KEY" sh -s -- -y

# Confirm Agent 3.x is installed
agent_ver="$(nginx-agent --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -n1 || true)"
major="${agent_ver%%.*}"
if [[ -n "$major" && "$major" -lt 3 ]]; then
  echo "ERROR: nginx-agent major version is $major; 3.x is required" >&2
  exit 1
fi
echo "NGINX Agent version: $agent_ver"

sudo systemctl enable --now nginx-agent
