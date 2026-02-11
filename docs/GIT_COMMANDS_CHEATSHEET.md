# Git Commands Cheatsheet

This document provides a quick reference for common Git commands used in this project.

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

- **Agregar un archivo específico al área de preparación (staging):**
  ```bash
  git add <nombre_del_archivo>
  ```

- **Agregar TODOS los archivos modificados y nuevos al área de preparación:**
  ```bash
  git add .
  ```

- **Confirmar tus cambios (commit):**
  ```bash
  git commit -m "Un mensaje claro y descriptivo de tus cambios"
  ```
  * **Buenas prácticas para mensajes de commit:**
    *   Usa el imperativo (ej: "Agrega feature X" en vez de "Agregué feature X").
    *   Sé breve pero descriptivo.
    *   Si el cambio es complejo, considera un cuerpo de mensaje más largo.

### 3. **Trabajar con Repositorios Remotos**

- **Listar tus repositorios remotos:**
  ```bash
  git remote -v
  ```

- **Agregar un nuevo repositorio remoto (ej. desde GitHub):**
  ```bash
  git remote add origin <URL_DEL_REPOSITORIO>
  ```

- **Subir (push) tus cambios a la rama principal (main):**
  ```bash
  git push -u origin main
  ```
  * El flag `-u` se usa la primera vez para establecer la rama de seguimiento. Las siguientes veces, puedes usar solo `git push`.

- **Subir cambios a otra rama:**
  ```bash
  git push origin <nombre_de_la_rama>
  ```

### 4. **Trabajar con Ramas (Branches)**

- **Listar todas las ramas locales:**
  ```bash
  git branch
  ```

- **Crear una nueva rama:**
  ```bash
  git branch <nombre_de_la_nueva_rama>
  ```

- **Cambiar a una rama existente:**
  ```bash
  git checkout <nombre_de_la_rama>
  ```

- **Crear una nueva rama y cambiar a ella inmediatamente:**
  ```bash
  git checkout -b <nombre_de_la_nueva_rama>
  ```

- **Fusionar (merge) una rama con tu rama actual:**
  ```bash
  # Primero, asegúrate de estar en la rama que recibirá los cambios (ej. main)
  git checkout main

  # Luego, ejecuta el merge
  git merge <nombre_de_la_rama_a_fusionar>
  ```

### 5. **Actualizar y Sincronizar**

- **Descargar los cambios del repositorio remoto (sin fusionar):**
  ```bash
  git fetch origin
  ```

- **Descargar y fusionar los cambios de la rama actual desde el remoto:**
  ```bash
  git pull origin main
  ```
  * `git pull` es una combinación de `git fetch` y `git merge`.

### 6. **Configuración de Infraestructura Externa**

- **Política de Ciclo de Vida en Storage (Limpieza automática):**
  - **Fecha de Configuración:** 16/11/2025
  - **Servicio:** Google Cloud Storage
  - **Bucket:** `pcg-2-8bf1b.appspot.com`
  - **Regla:**
    - **Acción:** Borrar
    - **Condición:** Edad del objeto es mayor a **30 días**.
    - **Filtros (Prefijos):**
        - `comparacion-planos/`
        - `inducciones/`
  - **Propósito:** Eliminar automáticamente los archivos de análisis de comparación de planos y los audios de inducciones contextuales después de 30 días para controlar costos de almacenamiento.