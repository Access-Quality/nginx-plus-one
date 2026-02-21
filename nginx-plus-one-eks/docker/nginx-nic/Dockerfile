# ──────────────────────────────────────────────────────────────────────────────
# NGINX Plus Ingress Controller + NAP WAF + NGINX Agent
# ──────────────────────────────────────────────────────────────────────────────
# The official F5 image already ships nginx-agent. No custom RUN layers needed.
#
# This file is used ONLY to pin the NIC version (ARG NIC_VERSION).
# The CI workflow reads that value, pulls the official image from
# private-registry.nginx.com via mTLS (NGINX_REPO_CRT / NGINX_REPO_KEY),
# retagging it and pushing to GHCR.
#
# NGINX One connection is configured via Helm chart values:
#   nginxAgent.enable=true
#   nginxAgent.endpointHost=agent.connect.nginx.com
#   nginxAgent.dataplaneKeySecretName=nginx-one-token  (key: dataplane.key)
#
# Ref: https://docs.nginx.com/nginx-one-console/k8s/add-nic/
# ──────────────────────────────────────────────────────────────────────────────
ARG NIC_VERSION=3.7.2

FROM private-registry.nginx.com/nginx-ic-nap/nginx-plus-ingress:${NIC_VERSION}
