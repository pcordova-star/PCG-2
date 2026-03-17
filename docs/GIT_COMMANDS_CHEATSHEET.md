
# Git Commands Cheatsheet - PCG 2.0

Este documento es una referencia rápida para los comandos de Git utilizados en este proyecto, optimizados para el flujo de trabajo con **Firebase App Hosting**.

---

### 1. Flujo de Trabajo para Publicar Cambios (Despliegue)

En **App Hosting**, el despliegue es automático cada vez que subes cambios a la rama principal (`main`).

1.  **Revisar cambios:**
    ```bash
    git status
    ```
2.  **Preparar archivos:**
    ```bash
    git add .
    ```
3.  **Confirmar cambios:**
    ```bash
    git commit -m "Descripción de lo que hiciste"
    ```
4.  **Desplegar:**
    ```bash
    git push origin main
    ```

---

### 2. Gestión de Secretos y Permisos (App Hosting)

Si el build de App Hosting falla diciendo que no puede resolver un secreto (como `GOOGLE_GENAI_API_KEY`):

1.  **Crear el secreto:** Ve a la consola de Firebase > App Hosting > Tu Backend > Configuración. Añade el secreto ahí.
2.  **Otorgar acceso vía CLI (Recomendado):**
    ```bash
    firebase apphosting:secrets:grantaccess GOOGLE_GENAI_API_KEY --backend pcg-2-backend
    ```
    *(Reemplaza `pcg-2-backend` por el nombre de tu backend si es distinto)*.

---

### 3. Comandos de Inspección y Sincronización

- **Ver dónde está el repositorio remoto:**
  ```bash
  git remote -v
  ```
- **Descargar cambios del servidor:**
  ```bash
  git pull origin main
  ```
- **Ver historial de commits:**
  ```bash
  git log --oneline
  ```

---

### 4. Solución de Problemas Comunes

- **Error de compilación:** Si el build falla en App Hosting, revisa los logs en la consola de Firebase. Usualmente se debe a errores de sintaxis o secretos sin permisos.
- **Conflictos al hacer pull:** Si el servidor tiene cambios que tú no tienes, usa:
  ```bash
  git pull --rebase origin main
  ```
