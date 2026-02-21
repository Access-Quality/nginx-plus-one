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

# ── Install nginx-agent from NGINX private package repo ──────────────────────
RUN --mount=type=secret,id=nginx_crt,dst=/etc/ssl/nginx/nginx-repo.crt,mode=0444 \
    --mount=type=secret,id=nginx_key,dst=/etc/ssl/nginx/nginx-repo.key,mode=0444 \
    set -eux; \
    apt-get update -qq; \
    apt-get install -y --no-install-recommends \
        ca-certificates apt-transport-https gnupg lsb-release wget; \
    # Import NGINX signing key
    wget -qO- https://cs.nginx.com/static/keys/nginx_signing.key \
        | gpg --dearmor -o /usr/share/keyrings/nginx-archive-keyring.gpg; \
    # Add nginx-agent package repo (authenticated via nginx-repo.crt / .key)
    printf "deb [signed-by=/usr/share/keyrings/nginx-archive-keyring.gpg] \
https://pkgs.nginx.com/nginx-agent/ubuntu %s agent\n" "$(lsb_release -cs)" \
        > /etc/apt/sources.list.d/nginx-agent.list; \
    # Download apt config snippet that injects the client cert for apt-get
    wget -q \
        --certificate=/etc/ssl/nginx/nginx-repo.crt \
        --private-key=/etc/ssl/nginx/nginx-repo.key \
        -O /etc/apt/apt.conf.d/90nginx \
        https://cs.nginx.com/static/files/90nginx; \
    apt-get update -qq; \
    apt-get install -y --no-install-recommends nginx-agent; \
    # Clean up – remove apt credential snippet so it is NOT baked into the image
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
