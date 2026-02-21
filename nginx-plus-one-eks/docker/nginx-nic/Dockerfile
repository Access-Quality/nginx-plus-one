# ──────────────────────────────────────────────────────────────────────────────
# NGINX Plus Ingress Controller + NAP WAF v5 + NGINX Agent
# ──────────────────────────────────────────────────────────────────────────────
# Pins the NIC version and embeds the pre-compiled NAP v5 WAF policy bundle.
#
# Build process (handled by CI):
#   1. CI reads COMPILER_VERSION and runs the waf-compiler image to compile
#      waf-policy.json → cine-waf.tgz in the build context.
#   2. CI pulls the base NIC image via mTLS (NGINX_REPO_CRT / NGINX_REPO_KEY).
#   3. docker build embeds the bundle into /etc/app_protect/bundles/.
#   4. Image is pushed to GHCR and referenced by Helm + VirtualServer Policy CRDs.
#
# NGINX One connection is configured via Helm chart values:
#   nginxAgent.enable=true
#   nginxAgent.endpointHost=agent.connect.nginx.com
#   nginxAgent.dataplaneKeySecretName=nginx-one-token  (key: dataplane.key)
#
# Ref: https://docs.nginx.com/nginx-ingress-controller/integrations/app-protect-waf-v5/
# ──────────────────────────────────────────────────────────────────────────────

# NIC image version — also determines which NAP WAF version is bundled.
ARG NIC_VERSION=5.3.4

# NAP WAF compiler version — must match the NAP module embedded in NIC_VERSION above.
# NIC 5.3.4  →  NAP WAF 5.11.2
# Update both together when upgrading NIC.
ARG COMPILER_VERSION=5.11.2

FROM private-registry.nginx.com/nginx-ic-nap/nginx-plus-ingress:${NIC_VERSION}

# Pre-compiled NAP v5 policy bundle (compiled in CI from waf-policy.json).
# NIC resolves bundle names to /etc/nginx/waf/bundles/ — NOT /etc/app_protect/bundles/
# which is the standalone NAP path. Use the NIC-specific path here.
USER root
RUN mkdir -p /etc/nginx/waf/bundles
COPY cine-waf.tgz /etc/nginx/waf/bundles/cine-waf.tgz
