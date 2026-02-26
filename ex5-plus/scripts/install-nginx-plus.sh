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
if [[ -z "${DATA_PLANE_KEY:-}" ]]; then
  echo "ERROR: DATA_PLANE_KEY is required" >&2
  exit 1
fi

# ── System dependencies ───────────────────────────────────────────────────────
sudo apt-get update -qq
sudo apt-get install -y --no-install-recommends \
  apt-transport-https ca-certificates curl gnupg lsb-release wget netcat-openbsd

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

# ── Repository pinning — NGINX Plus R36 (Pin-Priority: 900) ─────────────────
# R36 P2 (2026-02-04): latest supported release, OSS 1.29.3 base, support until Nov 2027.
sudo tee /etc/apt/preferences.d/99nginx >/dev/null <<'EOF'
Package: *
Pin: origin pkgs.nginx.com
Pin-Priority: 900
EOF

sudo apt-get update -qq

# Remove the single-container app-protect package if it was previously installed
# (e.g. on a re-run after a prior failed attempt).  app-protect and
# app-protect-module-plus conflict: the former bundles the local compiler which
# must NOT be present in the Hybrid deployment.
if dpkg -l app-protect 2>/dev/null | grep -q '^ii'; then
  echo "Removing conflicting app-protect package before hybrid install..." >&2
  sudo apt-get remove -y app-protect || true
fi

# Install nginx-plus + the HYBRID module package (app-protect-module-plus).
# IMPORTANT: For the Hybrid deployment (NGINX on host + waf-enforcer/waf-config-mgr
# as Docker containers) the correct package is app-protect-module-plus, NOT
# app-protect.  The difference:
#   app-protect           = single-container package; bundles nginx-plus + module
#                           + local config_set_compiler in one image.
#   app-protect-module-plus = module only; no local compiler; policy compilation
#                           is delegated to the waf-config-mgr container.
# See: https://docs.nginx.com/waf/install/docker/#hybrid-configuration
sudo apt-get install -y "nginx-plus=36*" "app-protect-module-plus=36*"

# ── Ensure default logging profile exists ─────────────────────────────────────
# app-protect-module-plus installs /etc/app_protect/conf/log_all.json.
# Create a minimal fallback if it is absent so nginx -t does not fail.
sudo mkdir -p /etc/app_protect/conf
if [[ ! -f /etc/app_protect/conf/log_all.json ]]; then
  echo "log_all.json not found after package install — creating minimal fallback" >&2
  sudo tee /etc/app_protect/conf/log_all.json >/dev/null <<'EOF'
{
    "filter": {
        "request_type": "all"
    },
    "content": {
        "format": "default",
        "max_request_size": "any",
        "max_message_size": "5k"
    }
}
EOF
fi
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
sudo mkdir -p /etc/app_protect/conf
sudo chown -R 101:101 /opt/app_protect /etc/app_protect

# ── Configure Docker for NGINX private registry (TLS client certificate) ──────
# Per official docs: https://docs.nginx.com/waf/install/docker/#configure-docker-for-the-f5-container-registry
# Registry authentication uses mTLS (nginx-repo.crt / nginx-repo.key), NOT JWT.
sudo mkdir -p /etc/docker/certs.d/private-registry.nginx.com
sudo cp /etc/ssl/nginx/nginx-repo.crt /etc/docker/certs.d/private-registry.nginx.com/client.cert
sudo cp /etc/ssl/nginx/nginx-repo.key /etc/docker/certs.d/private-registry.nginx.com/client.key

# ── Derive NAP container image tag from installed module package ───────────────
# apt package version: NGINX_PLUS_REL+COMPONENT_VER-PKG_REV~CODENAME
#   e.g.  36+5.575.2-1~jammy
# Image tag: RELEASE_MAJOR.RELEASE_MINOR.PATCH  e.g.  5.11.2
# Mapping (changelog): component series 575 → release minor 11
# || true on every step prevents pipefail from triggering on grep no-match.
_apt_comp="$(dpkg -l app-protect-module-plus 2>/dev/null \
  | awk '/^ii/{print $3}' \
  | grep -oP '(?<=\+)\d+\.\d+\.\d+(?=-)' \
  || true)"
_nap_patch="${_apt_comp##*.}"
_nap_series="$(echo "${_apt_comp}" | grep -oP '^\d+\.\K\d+(?=\.\d)' || true)"
case "${_nap_series}" in
  575) _nap_minor=11 ;;
  576) _nap_minor=12 ;;
  *)   _nap_minor=""  ;;
esac
if [[ -n "${_nap_minor}" && -n "${_nap_patch}" ]]; then
  NAP_IMAGE_TAG="5.${_nap_minor}.${_nap_patch}"
else
  NAP_IMAGE_TAG="5.11.2"
  echo "WARNING: could not derive NAP image tag from '${_apt_comp}'; using fallback ${NAP_IMAGE_TAG}" >&2
fi
echo "Using NAP image tag: ${NAP_IMAGE_TAG}"

sudo docker pull "private-registry.nginx.com/nap/waf-enforcer:${NAP_IMAGE_TAG}"
sudo docker pull "private-registry.nginx.com/nap/waf-config-mgr:${NAP_IMAGE_TAG}"

# Tag locally for docker-compose simplicity (matches docker-compose.yaml image names)
sudo docker tag \
  "private-registry.nginx.com/nap/waf-enforcer:${NAP_IMAGE_TAG}" \
  nplus-v5-waf-enforcer:latest

sudo docker tag \
  "private-registry.nginx.com/nap/waf-config-mgr:${NAP_IMAGE_TAG}" \
  nplus-v5-waf-config-mgr:latest

# ── Deploy WAF containers via docker-compose ──────────────────────────────────
sudo mkdir -p /opt/nap-v5
sudo cp /tmp/docker-compose.yaml /opt/nap-v5/docker-compose.yaml
sudo docker compose -f /opt/nap-v5/docker-compose.yaml up -d

# ── Wait for waf-enforcer gRPC port to be ready ───────────────────────────────
# waf-enforcer must be listening on port 50000 before NGINX starts.
# NGINX's NAP module connects to it on startup to send the policy JSON;
# waf-config-mgr then compiles the bundle asynchronously.
echo "Waiting for waf-enforcer to be ready on port 50000..."
for i in $(seq 1 30); do
  if sudo docker inspect --format '{{.State.Running}}' waf-enforcer 2>/dev/null | grep -q true \
     && nc -z 127.0.0.1 50000 2>/dev/null; then
    echo "waf-enforcer is up (attempt $i)"
    break
  fi
  echo "  attempt $i/30 — not ready yet, sleeping 5s..."
  sleep 5
done

if ! nc -z 127.0.0.1 50000 2>/dev/null; then
  echo "ERROR: waf-enforcer not listening on port 50000 after 150s" >&2
  sudo docker compose -f /opt/nap-v5/docker-compose.yaml logs >&2
  exit 1
fi

# ── Start NGINX Plus ──────────────────────────────────────────────────────────
# NGINX connects to waf-enforcer, sends the policy JSON path, and waf-config-mgr
# compiles the policy bundle in the background. Worker processes start serving
# once the policy is fully compiled by the enforcer.
sudo nginx -t
sudo systemctl enable --now nginx
# Reload to trigger policy push to waf-enforcer now that workers are up
sudo systemctl reload nginx

# ── NGINX Agent v3.7.0 ───────────────────────────────────────────────────────
# v3.7.0 (2026-02-03): latest 3.x release; adds Alpine 3.23, OTel and AWS Fargate fixes.
# Pin explicitly — NGINX One Console requires Agent 3.x (full support from July 2025).
curl -fsSL https://agent.connect.nginx.com/nginx-agent/install \
  | sudo DATA_PLANE_KEY="$DATA_PLANE_KEY" sh -s -- -y --version 3.7.0

# Confirm pinned version is installed
agent_ver="$(nginx-agent --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -n1 || true)"
echo "NGINX Agent installed version: $agent_ver"
major="${agent_ver%%.*}"
if [[ -n "$major" && "$major" -lt 3 ]]; then
  echo "ERROR: nginx-agent major version is $major; 3.x is required" >&2
  exit 1
fi

sudo systemctl enable --now nginx-agent
