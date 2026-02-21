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

# ── Install nginx-agent from packages.nginx.org (OSS public repo) ────────────
# We install the package only — no registration at build time.
# The agent registers with NGINX One at runtime via NGINX_AGENT_SERVER_TOKEN
# (injected from the K8s Secret nginx-one-token).
# packages.nginx.org is public; no client cert required.
# The base NIC image already ships /usr/share/keyrings/nginx-archive-keyring.gpg.
RUN set -eux; \
    apt-get update -qq; \
    apt-get install -y --no-install-recommends curl ca-certificates lsb-release; \
    OS_ID=$(. /etc/os-release && echo "${ID}"); \
    CODENAME=$(lsb_release -cs); \
    printf "deb [signed-by=/usr/share/keyrings/nginx-archive-keyring.gpg] \
https://packages.nginx.org/nginx-agent/${OS_ID} ${CODENAME} agent\n" \
        > /etc/apt/sources.list.d/nginx-agent.list; \
    apt-get update -qq; \
    apt-get install -y --no-install-recommends nginx-agent; \
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
