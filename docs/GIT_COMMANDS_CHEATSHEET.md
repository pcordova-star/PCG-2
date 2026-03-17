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

### 2. Comandos de Inspección y Sincronización

- **Ver dónde está el repositorio remoto:**
  ```bash
  git remote -v
  ```
- **Descargar cambios del servidor (si trabajas en varios equipos):**
  ```bash
  git pull origin main
  ```
- **Ver historial de commits:**
  ```bash
  git log --oneline
  ```
- **Deshacer cambios locales no confirmados:**
  ```bash
  git checkout -- .
  ```

---

### 3. Gestión de Secretos y Configuración

Recuerda que si modificas `apphosting.yaml` para añadir nuevas variables de entorno o secretos:
1. Realiza el `git push` normal.
2. Asegúrate de que el secreto exista en la **Consola de Firebase > App Hosting > Configuración** o en **Google Cloud Secret Manager**.

---

### 4. Solución de Problemas Comunes

- **Error de compilación:** Si el build falla en App Hosting, revisa los logs en la consola de Firebase. Usualmente se debe a errores de sintaxis o variables de entorno faltantes.
- **Conflictos al hacer pull:** Si el servidor tiene cambios que tú no tienes, usa:
  ```bash
  git pull --rebase origin main
  ```
