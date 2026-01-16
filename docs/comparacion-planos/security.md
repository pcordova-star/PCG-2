# Estrategia de Seguridad - Módulo "Comparación de Planos"

Este documento define la estrategia de seguridad para el módulo de Comparación de Planos, asegurando que su operación sea robusta, segura y esté aislada del resto de la plataforma PCG.

## 1. Validación de Archivos (Upload)

El endpoint de subida (`/api/comparacion-planos/create`) debe aplicar validaciones estrictas en el servidor antes de aceptar cualquier archivo.

-   **Extensiones Permitidas**: Solo se aceptarán `application/pdf`, `image/jpeg`, y `image/png`. Cualquier otro `Content-Type` será rechazado.
-   **Tamaño Máximo**: Se impondrá un límite estricto de **15 MB** por archivo. Las subidas que excedan este tamaño serán rechazadas con un error `413 Payload Too Large`.
-   **Validación de PDFs**:
    -   **Número de Páginas**: Los PDFs se limitarán a un máximo de 10 páginas. Si un PDF tiene más, se rechazará para evitar un consumo excesivo de recursos en la conversión.
    -   **Contenido Malicioso**: Se analizará la estructura del PDF para detectar y rechazar archivos que contengan scripts (JavaScript), acciones complejas o contenido incrustado no gráfico.
-   **Sanitización de Nombres**: Los nombres de los archivos serán normalizados y sanitizados antes de ser almacenados para prevenir ataques de path traversal.

## 2. Permisos y Control de Acceso

El acceso al módulo y a sus recursos (jobs) estará protegido en múltiples capas.

-   **Acceso al Módulo**:
    -   **Frontend**: La interfaz del módulo solo será visible si el `company` del usuario autenticado tiene el flag `feature_plan_comparison_enabled: true`.
    -   **Backend**: Todos los endpoints de la API (`/create`, `/analizar`, `/status`) verificarán este mismo flag en el documento de la empresa del usuario en cada llamada.
-   **Roles Permitidos**: Solo los usuarios con roles `superadmin`, `admin_empresa`, y `jefe_obra` podrán crear y ejecutar análisis. Roles como `prevencionista` o `cliente` no tendrán acceso.
-   **Acceso Directo por URL**: Se impedirá el acceso a las páginas del módulo (ej. `/[jobId]/resultado`) si el usuario no tiene los permisos adecuados, redirigiendo a una página de acceso denegado o al dashboard.

## 3. Seguridad e Integridad del Job

Cada `job` es un recurso aislado y debe ser protegido.

-   **Pertenencia del Job**: Al consultar el estado de un job (`/api/comparacion-planos/status/[jobId]`), la API verificará que el `empresaId` del job coincida con el `companyId` del usuario que realiza la consulta. Esto previene que un usuario de la empresa A pueda ver los jobs de la empresa B.
-   **Inmutabilidad de Resultados**: Un job con estado `completed` no podrá ser re-analizado. Cualquier intento de llamar a `/api/comparacion-planos/analizar` sobre un job completado será rechazado.
-   **Transiciones de Estado Válidas**: El backend validará cada cambio de estado contra la FSM definida. Si se intenta una transición inválida (ej. de `uploaded` a `completed`), el job se marcará como `error`.

## 4. Seguridad de la Interacción con IA

Se mitigarán los riesgos asociados a la interacción con modelos de lenguaje.

-   **Sanitización de Entradas**: Aunque el único input de usuario es el plano, cualquier metadata textual futura será sanitizada para evitar inyección de prompts.
-   **Límites de Imagen**: Antes de enviar las imágenes a la IA, se redimensionarán a la resolución máxima permitida (ej. 2000px) para controlar los tokens de entrada.
-   **Validación de Salida JSON**:
    -   La respuesta del modelo de IA **debe** ser un JSON válido. Se usará un `try-catch` al parsear `JSON.parse()`.
    -   Si el JSON es inválido o corrupto, el job transicionará a `error` con un código `AI_INVALID_JSON`.
    -   Si la estructura del JSON no coincide con el schema Zod/TypeScript esperado (`ComparacionPlanosOutput`), el job también transicionará a `error`.
-   **Manejo de Timeouts**: Los flujos de IA tendrán un timeout definido (ej. 60 segundos). Si el modelo no responde a tiempo, el job se marcará como `error` con código `AI_TIMEOUT`.

## 5. Protección Contra Abuso (Throttling y Rate Limiting)

Para evitar el uso excesivo y controlar costos, se implementarán límites a nivel de API (diseño conceptual).

-   **Límite de Creación de Jobs**: Se podría limitar el número de análisis que una empresa puede crear por día (ej. 100 análisis/día).
-   **Frecuencia de Análisis**: Un mismo usuario no podrá llamar al endpoint `/analizar` más de una vez cada 5 segundos para prevenir cargas innecesarias.
-   **Backoff Exponencial**: En caso de errores repetidos en un mismo job (ej. reintentos fallidos), el sistema podría aplicar un tiempo de espera creciente antes de permitir un nuevo intento.

## 6. Logging y Auditoría

Cada acción crítica será registrada para futura auditoría (diseño conceptual).

-   Una subcolección `logs` dentro de cada documento de `comparacionPlanosJobs/{jobId}` podría almacenar eventos con `timestamp`:
    -   `job_created (user, ip)`
    -   `analysis_started (user)`
    -   `flow_completed (flowName, duration_ms, token_count)`
    -   `job_failed (errorCode, errorMessage)`
    -   `job_completed`

## 7. Aislamiento del Módulo

Esta estrategia es exclusiva para `comparacion-planos` y no afecta otros módulos.

-   Las reglas de Firestore se aplicarán específicamente a la colección `comparacionPlanosJobs`.
-   Las reglas de Storage se aplicarán a la ruta `/comparacion-planos/`.
-   Los nuevos endpoints y flujos de IA son independientes y no tienen dependencias con el cubicador existente.