# Monorepo nginx-plus-one

Este directorio contiene varios proyectos relacionados con NGINX Plus, WAF y NGINX One Agent.

- Cada subdirectorio representa un proyecto independiente.
- Los workflows están en el directorio .github/workflows.

- **Deploy Nginx Plus - WAF - Nginx One Agent en una VM en AWS.**

Implementa una instancia de Nginx Plus en una VM en AWS; también instala el Agente Nginx One y el WAF App Protect. Se puede monitorear tanto el tráfico y el uso de la instancia Nginx Plus en la consola Nginx One de F5 DCS

- **Deploy NGINX NIC/NAP-V5 in Azure.**
Implementa una instancia de Nginx Plus como Ingress Controller y el WAF App Protect en un cluster de Azure (AKS)

## Secrets de GitHub

Configura estos secrets en tu repositorio:

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
- `TMDB_API_KEY`

### Contenido de los secrets

- `TFC_TOKEN`: Token de acceso para autenticarte con Terraform Cloud.
- `TFC_ORG`: Nombre de la organización en Terraform Cloud donde se gestionan los workspaces.
- `AWS_ACCESS_KEY_ID`: ID de acceso de tu usuario de AWS con permisos para crear recursos.
- `AWS_SECRET_ACCESS_KEY`: Llave secreta asociada a tu usuario de AWS.
- `AWS_REGION`: Región de AWS donde se desplegarán los recursos (ejemplo: us-east-1).
- `NGINX_REPO_CRT`: Contenido del archivo `.crt` del repositorio de NGINX Plus (certificado para acceder al repo de paquetes).
- `NGINX_REPO_KEY`: Contenido del archivo `.key` del repositorio de NGINX Plus (llave privada para acceder al repo de paquetes).
- `LICENSE_JWT`: Contenido del archivo `.jwt` de licencia de NGINX Plus (token de licencia).
- `LICENSE_KEY`: Contenido del archivo `.key` de licencia de NGINX Plus (llave privada de la licencia).
- `DATA_PLANE_KEY`: Llave de data plane de NGINX One, necesaria para registrar la instancia en NGINX One.
- `TMDB_API_KEY`: API key de The Movie Database (TMDB), utilizada por la app Cine TMDB para consultar la base de datos de películas.

#### Cómo agregar nuevos proyectos

1. Crea un nuevo directorio para tu proyecto.
2. Añade scripts, infra, workflows y documentación específica.
3. Usa los secrets de GitHub Actions globales o específicos según necesidad.

##### Push/Pull

Usa git push/pull desde la raíz para todo el monorepo.

---

Este README es general para el monorepo. Cada proyecto puede tener su propio README interno.
