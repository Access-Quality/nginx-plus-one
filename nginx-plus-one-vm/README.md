# NGINX Plus EC2 + NGINX One (Terraform Cloud + GitHub Actions)

Este repositorio aprovisiona una instancia EC2 en AWS usando Terraform Cloud (ejecución local), instala NGINX Plus y la registra en NGINX One mediante GitHub Actions.

## Requisitos

- Organización y token de Terraform Cloud.
- Credenciales de AWS con permisos para crear EC2, grupos de seguridad y pares de llaves.
- Credenciales de NGINX Plus (certificado/llave del repo) y licencia de NGINX Plus (jwt/llave).
- Llave de data plane de NGINX One.

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

## Workflows

- Deploy: [.github/workflows/nginx-plus-ec2.yml](.github/workflows/nginx-plus-ec2.yml)
- Destroy: [.github/workflows/nginx-plus-ec2-destroy.yml](.github/workflows/nginx-plus-ec2-destroy.yml)

Ejecuta cada workflow manualmente desde GitHub Actions.

## Terraform

La configuración de Terraform está en [terraform/nginx-plus-ec2](terraform/nginx-plus-ec2).

- Crea una instancia EC2 (Ubuntu 24.04).
- Usa la VPC y subred por defecto.
- Crea un grupo de seguridad para SSH/HTTP/HTTPS.
- Genera un par de llaves EC2 a partir de una llave pública SSH dinámica.

## NGINX Plus + NGINX One

Los pasos de instalación y registro están en [scripts/install-nginx-plus.sh](scripts/install-nginx-plus.sh):

- Agrega el repo de NGINX Plus (jammy) e instala NGINX Plus.
- Configura los archivos de licencia en `/etc/nginx/license.jwt` y `/etc/nginx/license.key`.
- Habilita la API de NGINX Plus en `127.0.0.1:8080`.
- Instala e inicia el NGINX Agent con `DATA_PLANE_KEY`.

## Apps de Cine

El workflow de deploy instala dos apps Node.js en la instancia cine:

- `Cine` (OMDb) en el puerto `3000`.
- `Cine TMDB` (The Movie Database) en el puerto `3001`.

Ambas se despliegan mediante [.github/workflows/nginx-plus-ec2.yml](.github/workflows/nginx-plus-ec2.yml) y se gestionan con servicios systemd.

El workflow construye cada app en un job separado (`build-cine-omdb` y `build-cine-tmdb`) y luego despliega ambos artefactos a la misma VM cine en `deploy-cine`.

NGINX Plus las enruta por hostname:

- `cine.example.com` → Cine (OMDb, puerto 3000)
- `cine-tmdb.example.com` → Cine TMDB (puerto 3001)

## Notas

- El CIDR de SSH se establece al IP público del runner de GitHub Actions en tiempo de ejecución.
- Si necesitas una VPC o subred específica, actualiza la configuración de Terraform.

## Solución de problemas

- Repo de NGINX Plus 400/403: verifica los secrets `NGINX_REPO_CRT` y `NGINX_REPO_KEY`, y que la llave coincida con el certificado.
- El servicio de NGINX falla por error de licencia: verifica los secrets `LICENSE_JWT` y `LICENSE_KEY` y que pertenezcan a la misma suscripción.
- La instancia no aparece en NGINX One: confirma que `DATA_PLANE_KEY` es correcto y espera unos minutos tras iniciar el agente.
- No hay métricas en NGINX One: confirma que la API está habilitada en `127.0.0.1:8080` y que NGINX se recargó correctamente.

## Verificación

En la instancia EC2:

```bash
systemctl status nginx --no-pager
systemctl status nginx-agent --no-pager
curl -I http://localhost
```

## Pruebas de bloqueo WAF

Usa la IP pública de la instancia más un header `Host` explícito.

Prueba 1 (debe pasar):

```bash
curl -i -H "Host: cine.example.com" "http://<PUBLIC_IP>/"
```

Prueba 2 (debe ser bloqueada):

```bash
curl -i -H "Host: cine.example.com" "http://<PUBLIC_IP>/?id=1%20OR%201%3D1--"
```

Si no ves un bloqueo, revisa los logs en la instancia:

```bash
sudo tail -n 200 /var/log/nginx/error.log | egrep -i "APP_PROTECT|app_protect|violation|blocked" || true
```

## Actualizar la política WAF

Para usar una política WAF diferente, reemplaza el archivo scripts/cinex-policy.json con el contenido de la nueva política exportada desde la consola de NGINX One (F5 DCS).

- Puedes descargar/exportar la política desde la consola de NGINX One (F5 DCS) en formato JSON.
- Guarda ese contenido en scripts/cinex-policy.json antes de ejecutar el workflow de despliegue.
- El pipeline copiará automáticamente la política a la instancia y la aplicará en NGINX Plus.
