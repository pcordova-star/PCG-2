
# Plan de Implementación por Fases: Módulo de Noticias Contextuales

Este documento desglosa la implementación técnica y funcional del Módulo de Noticias Contextuales, basándose en el análisis previo. El objetivo es un despliegue gradual, comenzando con un MVP (Mínimo Producto Viable) que aporte valor inmediato y minimice riesgos, para luego escalar la funcionalidad.

---

### Fase 1: Implementación del MVP - "Motor de Correlación y Acción"

**Objetivo:** Crear el backend y la vista mínima para que un administrador pueda recibir una noticia procesada y ver la acción recomendada. El foco es la **calidad de la correlación**, no la automatización de la ingesta de noticias.

**Paso 1: Modelo de Datos (Firestore)**

*   **Colección `noticiasExternas`:**
    *   **Propósito:** Almacén central de noticias crudas.
    *   **Campos:** `tituloOriginal`, `fuente`, `url`, `fechaPublicacion`, `contenidoCrudo` (texto completo de la noticia).
    *   **Subcolección `analisisIA`:**
        *   **Propósito:** Contiene el resultado del procesamiento por IA.
        *   **Campos:** `resumen`, `especialidad` (array: 'Seguridad', 'Legal', 'Mercado'), `relevanciaGeografica` (array: 'RM', 'Nacional'), `entidadesPcgImpactadas` (array: 'admin_empresa', 'prevencionista'), `accionRecomendada` (string), `esCritica` (boolean).

*   **Colección `alertasNoticias`:**
    *   **Propósito:** Vincula un análisis de noticia con una empresa u obra específica.
    *   **Campos:** `analisisId`, `noticiaId`, `companyId`, `obraId`, `rolDestino`, `estado` ('pendiente', 'vista', 'archivada'), `fechaGeneracion`.

**Paso 2: Backend (Cloud Functions o API Routes)**

*   **Función `procesarNoticiaExterna` (Trigger de Firestore: al crear en `noticiasExternas`):**
    1.  **Input:** Nuevo documento en `noticiasExternas`.
    2.  **Lógica:**
        *   Llama a un flujo de Genkit (`analizarNoticiaFlow`) con el `contenidoCrudo` de la noticia.
        *   Este flujo de IA debe devolver un JSON con la estructura de `analisisIA`.
        *   La función guarda el resultado en la subcolección `noticiasExternas/{id}/analisisIA`.

*   **Función `distribuirAlertaNoticia` (Trigger de Firestore: al crear en `analisisIA`):**
    1.  **Input:** Nuevo documento de `analisisIA`.
    2.  **Lógica:**
        *   Lee `relevanciaGeografica` y `entidadesPcgImpactadas`.
        *   Busca en la base de datos todas las obras y empresas que coincidan con esos criterios.
        *   Por cada coincidencia, crea un nuevo documento en la colección `alertasNoticias`.

**Paso 3: Frontend (Componentes de Interfaz Mínimos)**

*   **Componente `WidgetAlertasNoticias`:**
    *   **Ubicación:** Se integra en el `/dashboard` principal.
    *   **Lógica:** Realiza una consulta a `alertasNoticias` donde el `companyId` coincida con el del usuario logueado y el `estado` sea 'pendiente'.
    *   **UI:** Muestra una lista simple de títulos de noticias. Cada ítem es un enlace a la página de detalle.

*   **Página `/alertas/noticias/{alertaId}`:**
    *   **Lógica:** Carga los datos de la alerta y su análisis de IA asociado.
    *   **UI:**
        *   Muestra el resumen de la noticia.
        *   **Destaca "Por qué es relevante para ti"** (ej: "Relevante para tus obras en la Región Metropolitana").
        *   **Muestra claramente la "Acción recomendada por la IA"**.
        *   Incluye un botón de acción principal (ej: "Crear Tarea en PCG") y un botón secundario ("Marcar como Leída").

**Paso 4: Entrada Manual (Para el MVP)**

*   La creación de documentos en la colección `noticiasExternas` se realizará **manualmente** a través de la consola de Firestore. Esto nos permite controlar la calidad del input y validar el motor de correlación sin construir aún un scraper automático.

---

### Fase 2: Escalabilidad y Personalización

**Objetivo:** Dar más control al usuario administrador y mejorar la interfaz de gestión.

*   **Paso 1: Panel de Gestión de Alertas:**
    *   Crear una nueva sección en la plataforma (`/gestion/noticias-contextuales`).
    *   Implementar una tabla que liste todas las alertas con filtros por estado, fecha y especialidad.
    *   Permite a un administrador ver qué usuarios han visto qué alertas.

*   **Paso 2: Feedback del Usuario:**
    *   En la página de detalle de la alerta, añadir botones "¿Fue útil esta alerta?" (Sí/No).
    *   Guardar este feedback para refinar los prompts de la IA en el futuro.

---

### Fase 3: Automatización y Proactividad

**Objetivo:** Automatizar la ingesta de noticias y hacer el sistema más proactivo.

*   **Paso 1: Motor de Ingesta (Scraper/API):**
    *   Crear una Cloud Function que se ejecute con un scheduler (ej: cada 6 horas).
    *   Esta función se conectará a APIs de noticias o realizará scraping de sitios predefinidos.
    *   Creará automáticamente los documentos en la colección `noticiasExternas`, activando todo el flujo de análisis y distribución.

*   **Paso 2: Notificaciones Push/Email:**
    *   Modificar la función `distribuirAlertaNoticia`.
    *   Si el análisis de una noticia resulta en `esCritica: true`, además de crear el documento en `alertasNoticias`, se debe enviar una notificación por email al usuario correspondiente.
