#!/bin/sh
# ──────────────────────────────────────────────────────────────────────────────
# Entrypoint: starts nginx-agent (background) then the NGINX Plus IC binary.
#
# NGINX_AGENT_SERVER_TOKEN must be set in the environment (injected from the
# "nginx-one-token" Kubernetes Secret by the Helm values / Deployment spec).
# ──────────────────────────────────────────────────────────────────────────────
set -e

echo "[entrypoint] NGINX Plus NIC + nginx-agent starting..."

# Validate that the NGINX One enrollment token is present
if [ -z "${NGINX_AGENT_SERVER_TOKEN}" ]; then
  echo "[entrypoint] WARNING: NGINX_AGENT_SERVER_TOKEN is not set." \
       "The instance will NOT register with NGINX One."
fi

# Launch nginx-agent in the background.
# The agent reads NGINX_AGENT_SERVER_TOKEN from the environment automatically.
nginx-agent &
AGENT_PID=$!
echo "[entrypoint] nginx-agent started (PID ${AGENT_PID})"

# Hand off to the NGINX Plus Ingress Controller binary.
# All arguments passed to this container (from Helm / K8s) are forwarded.
echo "[entrypoint] Executing /nginx-ingress $*"
exec /nginx-ingress "$@"
