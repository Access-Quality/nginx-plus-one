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

# ── Install nginx-agent from NGINX Plus private repo (pkgs.nginx.com) ────────
# Requires client cert/key (nginx-repo.crt / nginx-repo.key) injected via
# BuildKit secrets so credentials are never baked into the image.
# pkgs.nginx.com/nginx-agent only publishes Ubuntu packages; 'ubuntu jammy'
# .deb packages install correctly on Debian 12 (bookworm).
RUN --mount=type=secret,id=nginx_crt,dst=/etc/ssl/nginx/nginx-repo.crt,mode=0444 \
    --mount=type=secret,id=nginx_key,dst=/etc/ssl/nginx/nginx-repo.key,mode=0444 \
    set -eux; \
    apt-get update -qq; \
    apt-get install -y --no-install-recommends ca-certificates apt-transport-https gnupg wget; \
    # Client-cert config for apt to authenticate with pkgs.nginx.com
    printf 'Acquire::https::pkgs.nginx.com::SslCert "/etc/ssl/nginx/nginx-repo.crt";\nAcquire::https::pkgs.nginx.com::SslKey  "/etc/ssl/nginx/nginx-repo.key";\n' \
        > /etc/apt/apt.conf.d/90nginx; \
    # Signing key (already binary in base image; write to a separate file)
    wget -qO /tmp/nginx_signing.key https://cs.nginx.com/static/keys/nginx_signing.key; \
    cp /tmp/nginx_signing.key /usr/share/keyrings/nginx-agent-keyring.gpg; \
    rm -f /tmp/nginx_signing.key; \
    # nginx-agent is only published for Ubuntu on pkgs.nginx.com;
    # jammy .deb packages are compatible with Debian 12 (bookworm).
    printf 'deb [signed-by=/usr/share/keyrings/nginx-agent-keyring.gpg] https://pkgs.nginx.com/nginx-agent/ubuntu jammy agent\n' \
        > /etc/apt/sources.list.d/nginx-agent.list; \
    apt-get update -qq; \
    apt-get install -y --no-install-recommends nginx-agent; \
    # Remove apt credential snippet — must NOT be baked into the final image
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
