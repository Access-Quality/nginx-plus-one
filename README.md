# Monorepo nginx-plus-one

Este directorio contiene varios proyectos relacionados con NGINX Plus y NGINX One.

- Cada subdirectorio representa un proyecto independiente.
- Los archivos y carpetas del proyecto original ahora están en nginx-plus-one-vm/.

## Estructura

- nginx-plus-one-vm/: Proyecto original (VM, Terraform, scripts, workflows)
- Otros proyectos: Agrega nuevos subdirectorios aquí

## GitHub Secrets

Configure these secrets at the repository level (used across all projects):

| Secret                  | Required by                     |
| ----------------------- | ------------------------------- |
| `TFC_TOKEN`             | All workflows (Terraform Cloud) |
| `TFC_ORG`               | All workflows (Terraform Cloud) |
| `AWS_ACCESS_KEY_ID`     | All workflows                   |
| `AWS_SECRET_ACCESS_KEY` | All workflows                   |
| `NGINX_REPO_CRT`        | `eks-deploy`, `nginx-plus-ec2`  |
| `NGINX_REPO_KEY`        | `eks-deploy`, `nginx-plus-ec2`  |
| `LICENSE_JWT`           | `eks-deploy`, `nginx-plus-ec2`  |
| `LICENSE_KEY`           | `nginx-plus-ec2`                |
| `DATA_PLANE_KEY`        | `eks-deploy`, `nginx-plus-ec2`  |
| `OMDB_API_KEY`          | `eks-deploy`                    |
| `TMDB_API_KEY`          | `eks-deploy`, `nginx-plus-ec2`  |

### Secret contents

- `NGINX_REPO_CRT`: contents of your NGINX Plus repo `.crt` file.
- `NGINX_REPO_KEY`: contents of your NGINX Plus repo `.key` file.
- `LICENSE_JWT`: contents of your NGINX Plus license `.jwt` file.
- `LICENSE_KEY`: contents of your NGINX Plus license `.key` file.
- `DATA_PLANE_KEY`: NGINX One data plane key.

## Cómo agregar nuevos proyectos

1. Crea un nuevo directorio para tu proyecto.
2. Añade scripts, infra, workflows y documentación específica.
3. Usa los secrets de GitHub Actions globales o específicos según necesidad.

## Push/Pull

Usa git push/pull desde la raíz para todo el monorepo.

---

Este README es general para el monorepo. Cada proyecto puede tener su propio README interno.
