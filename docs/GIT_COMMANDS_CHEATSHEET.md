# Git Commands Cheatsheet

This document provides a quick reference for common Git commands used in this project, now especially important for **Firebase App Hosting**.

---

### 1. **Setup y Configuración Inicial**

- **Configurar tu nombre de usuario:**
  ```bash
  git config --global user.name "Tu Nombre Completo"
  ```

- **Configurar tu email:**
  ```bash
  git config --global user.email "tu.email@example.com"
  ```

- **Inicializar un nuevo repositorio:**
  ```bash
  git init
  ```

### 2. **Comandos del Día a Día**

- **Ver el estado de tus cambios:**
  ```bash
  git status
  ```

- **Agregar archivos al área de preparación (staging):**
  ```bash
  git add .
  ```

- **Confirmar tus cambios (commit):**
  ```bash
  git commit -m "Descripción de los cambios"
  ```

### 3. **Trabajar con Repositorios Remotos (Clave para App Hosting)**

- **Saber a qué repositorio estás conectado:**
  ```bash
  git remote -v
  ```

- **Subir cambios a la nube (esto gatilla el despliegue automático):**
  ```bash
  git push origin main
  ```
  *Nota: En App Hosting, al hacer este push, Firebase detectará los cambios y actualizará tu sitio web automáticamente.*

### 4. **Gestión de Secretos en App Hosting**

Si agregas una nueva funcionalidad que usa una API Key o secreto:
1. Agrégala a `apphosting.yaml`.
2. Súbela a Git.
3. **Importante:** Debes crear el secreto manualmente en la Consola de Firebase > App Hosting > Configuración o en Google Cloud Secret Manager para que la app pueda leerlo.

### 5. **Actualizar desde el Remoto**

- **Descargar y fusionar los cambios más recientes:**
  ```bash
  git pull origin main
  ```

---

### Resumen del Flujo de Trabajo para Desplegar:
1. `git add .` (Prepara los cambios)
2. `git commit -m "mensaje"` (Guarda los cambios localmente)
3. `git push origin main` (Envía a la nube y despliega automáticamente)