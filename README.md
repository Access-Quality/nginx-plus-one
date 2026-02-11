# NGINX Plus EC2 + NGINX One (Terraform Cloud + GitHub Actions)

This repository provisions an AWS EC2 instance with Terraform Cloud (local execution), installs NGINX Plus, and registers it with NGINX One using GitHub Actions.

## Requirements

- Terraform Cloud organization and token.
- AWS credentials with permissions to create EC2, security groups, and key pairs.
- NGINX Plus credentials (repo cert/key) and NGINX Plus license (jwt/key).
- NGINX One data plane key.

## GitHub Secrets

Configure these secrets in your repository:

- `TFC_TOKEN`
- `TFC_ORG`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `NGINX_REPO_CRT`
- `NGINX_REPO_KEY`
- `LICENSE_JWT`
- `LICENSE_KEY`
- `DATA_PLANE_KEY`

### Secret contents

- `NGINX_REPO_CRT`: contents of your NGINX Plus repo `.crt` file.
- `NGINX_REPO_KEY`: contents of your NGINX Plus repo `.key` file.
- `LICENSE_JWT`: contents of your NGINX Plus license `.jwt` file.
- `LICENSE_KEY`: contents of your NGINX Plus license `.key` file.
- `DATA_PLANE_KEY`: NGINX One data plane key.

## Workflows

- Deploy: [.github/workflows/nginx-plus-ec2.yml](.github/workflows/nginx-plus-ec2.yml)
- Destroy: [.github/workflows/nginx-plus-ec2-destroy.yml](.github/workflows/nginx-plus-ec2-destroy.yml)

Run each workflow manually from GitHub Actions.

## Terraform

Terraform configuration lives in [terraform/nginx-plus-ec2](terraform/nginx-plus-ec2).

- Creates an EC2 instance (Ubuntu 24.04).
- Uses the default VPC and a default subnet.
- Creates a security group for SSH/HTTP/HTTPS.
- Generates an EC2 key pair from a dynamic SSH public key.

## NGINX Plus + NGINX One

Installation and registration steps are in [scripts/install-nginx-plus.sh](scripts/install-nginx-plus.sh):

- Adds the NGINX Plus repo (jammy), installs NGINX Plus.
- Configures license files at `/etc/nginx/license.jwt` and `/etc/nginx/license.key`.
- Enables NGINX Plus API on `127.0.0.1:8080`.
- Installs and starts the NGINX Agent with `DATA_PLANE_KEY`.

## Notes

- The SSH CIDR is set to the GitHub Actions runner public IP at runtime.
- If you need a specific VPC or subnet, update the Terraform configuration.

## Troubleshooting

- NGINX Plus repo 400/403: verify `NGINX_REPO_CRT` and `NGINX_REPO_KEY` secrets, and that the repo key matches the cert.
- NGINX service fails with license error: verify `LICENSE_JWT` and `LICENSE_KEY` secrets and that they belong to the same subscription.
- Instance not showing in NGINX One: confirm `DATA_PLANE_KEY` is correct and allow a few minutes after agent start.
- No metrics in NGINX One: confirm the API is enabled on `127.0.0.1:8080` and NGINX reloaded successfully.

## Verification

On the EC2 instance:

```bash
systemctl status nginx --no-pager
systemctl status nginx-agent --no-pager
curl -I http://localhost
```
# nginx-plus-one
