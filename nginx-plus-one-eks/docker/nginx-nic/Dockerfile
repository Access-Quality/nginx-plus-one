# ──────────────────────────────────────────────────────────────────────────────
# NGINX Plus Ingress Controller + App Protect WAF + NGINX Agent
# ──────────────────────────────────────────────────────────────────────────────
# Base: official F5 NIC image with NAP WAF (Ubuntu 22.04 / x86_64).
# Adds nginx-agent so the instance registers in NGINX One (F5 DCS).
#
# Build args:
#   NIC_VERSION  – NGINX Plus IC tag (default: 3.7.2)
#
# Required BuildKit secrets (src=file):
#   nginx_crt  – content of nginx-repo.crt  (from GitHub Secret NGINX_REPO_CRT)
#   nginx_key  – content of nginx-repo.key  (from GitHub Secret NGINX_REPO_KEY)
#
# NGINX_AGENT_SERVER_TOKEN is injected at runtime via K8s Secret.
# ──────────────────────────────────────────────────────────────────────────────
ARG NIC_VERSION=3.7.2

FROM private-registry.nginx.com/nginx-ic-nap/nginx-plus-ingress:${NIC_VERSION}

USER root

# ── Install nginx-agent via the official NGINX One install script ─────────────
# Same approach used in install-nginx-plus.sh for the VM deployment.
# DATA_PLANE_KEY is intentionally empty at build time — the real token is
# injected at runtime via the NGINX_AGENT_SERVER_TOKEN env var (K8s Secret).
RUN --mount=type=secret,id=nginx_crt,dst=/etc/ssl/nginx/nginx-repo.crt,mode=0444 \
    --mount=type=secret,id=nginx_key,dst=/etc/ssl/nginx/nginx-repo.key,mode=0444 \
    set -eux; \
    apt-get update -qq; \
    apt-get install -y --no-install-recommends curl ca-certificates; \
    # Write apt client-cert config so pkgs.nginx.com authenticates correctly.
    # This must reference the secret-mounted paths, which are only available
    # during this RUN layer.
    printf 'Acquire::https::pkgs.nginx.com::SslCert "/etc/ssl/nginx/nginx-repo.crt";\nAcquire::https::pkgs.nginx.com::SslKey  "/etc/ssl/nginx/nginx-repo.key";\n' \
        > /etc/apt/apt.conf.d/90nginx; \
    # NGINX One official install script — handles OS/distro detection,
    # signing-key import, and repo setup automatically.
    curl -fsSL https://agent.connect.nginx.com/nginx-agent/install \
        | DATA_PLANE_KEY="" sh -s -- -y; \
    # Remove apt credential snippet so it is NOT baked into the final image
    rm -f /etc/apt/apt.conf.d/90nginx; \
    apt-get clean; \
    rm -rf /var/lib/apt/lists/*

# ── Configure nginx-agent ─────────────────────────────────────────────────────
COPY nginx-agent.conf /etc/nginx-agent/nginx-agent.conf

# ── Runtime directories owned by the nginx user (uid 101) ──────────────────-
RUN mkdir -p /var/log/nginx-agent /var/run/nginx-agent && \
    chown -R nginx:nginx \
        /var/log/nginx-agent \
        /var/run/nginx-agent \
        /etc/nginx-agent

# ── Custom entrypoint: starts nginx-agent then hands off to the IC binary ───
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

USER nginx

ENTRYPOINT ["/entrypoint.sh"]
