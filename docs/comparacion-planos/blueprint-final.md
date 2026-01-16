# Blueprint Final del Módulo: Comparación de Planos

**Versión:** 1.0  
**Fecha:** 2025-11-15  
**Estado:** Diseño Completado

Este documento consolida la arquitectura, diseño y estrategia completa para el desarrollo e implementación del módulo de **Comparación de Planos** dentro de la plataforma PCG. Su objetivo es servir como guía maestra para asegurar un desarrollo aislado, seguro y eficiente.

---

## 1. Arquitectura General

### 1.1. Objetivo del Módulo
Permitir a los usuarios comparar dos versiones de un plano (A y B) para detectar automáticamente diferencias, analizar el impacto en la cubicación y entender las consecuencias técnicas en las distintas especialidades de la obra.

### 1.2. Flujo Completo del Proceso (Pipeline)
1.  **Upload:** El usuario sube dos archivos (Plano A y Plano B) a través de la interfaz.
2.  **Creación del Job:** El sistema crea un `job` en Firestore con un ID único y estado `pending-upload`.
3.  **Procesamiento de Archivos:** Los archivos se suben a Firebase Storage en una carpeta aislada (`/comparacion-planos/{jobId}/`) y se convierten a un formato estándar (JPEG). El estado del job cambia a `uploaded`.
4.  **Inicio del Análisis (Asincrónico):** El usuario (o el sistema) dispara el análisis. El estado del job cambia a `processing`.
5.  **Ejecución de Flujos IA:** Un endpoint de backend ejecuta secuencialmente tres flujos de IA:
    -   **Diff Técnico:** Compara visualmente los planos. Estado → `analyzing-diff`.
    -   **Cubicación Diferencial:** Estima variaciones de cantidad. Estado → `analyzing-cubicacion`.
    -   **Árbol de Impactos:** Analiza consecuencias en cascada. Estado → `generating-impactos`.
6.  **Consolidación y Finalización:** Los resultados de los tres flujos se guardan en el documento del job en Firestore. El estado final cambia a `completed`.
7.  **Consulta de Resultados:** El frontend consulta el estado del job periódicamente (`polling`). Cuando está `completed` o `error`, muestra la pantalla de resultados correspondiente.

### 1.3. Reglas de Aislamiento
-   **Sin Dependencias Cruzadas:** El módulo no debe importar ni depender de la lógica de otros módulos existentes (ej. Cubicador actual, Módulo PREMIUM).
-   **Firestore Aislado:** Todas las operaciones de base de datos se limitan a la nueva colección `comparacionPlanosJobs`.
-   **Storage Aislado:** Todos los archivos se almacenan en la ruta dedicada `/comparacion-planos/`.
-   **UI Aislada:** Todos los componentes y páginas residen en sus propias carpetas y solo se integran al dashboard principal mediante una tarjeta condicional.

---

## 2. Estructura de Carpetas
```
/src
├── /app
│   ├── /api/comparacion-planos/
│   │   ├── /upload/route.ts
│   │   ├── /analizar/route.ts
│   │   └── /estado/[jobId]/route.ts
│   └── /comparacion-planos/
│       ├── /upload/page.tsx
│       ├── /[jobId]/page.tsx
│       └── /[jobId]/resultado/page.tsx
├── /components/comparacion-planos/
│   ├── UploadPlanesForm.tsx
│   ├── AnalisisProgreso.tsx
│   ├── ResumenEjecutivo.tsx
│   ├── ResultadoDiffTecnico.tsx
│   ├── ResultadoCubicacion.tsx
│   └── ResultadoArbolImpactos.tsx
├── /lib/comparacion-planos/
│   ├── types.ts
│   ├── fsm.ts
│   ├── firestore.ts
│   ├── storage.ts
│   ├── ... (flows IA)
/docs
└── /comparacion-planos/
    ├── blueprint-final.md
    ├── deployment.md
    ├── performance.md
    ├── security.md
    └── testing.md
```

---

## 3. FSM (Máquina de Estados)
-   **Archivo:** `src/lib/comparacion-planos/fsm.ts`
-   **Estados Válidos:** `pending-upload`, `uploaded`, `processing`, `analyzing-diff`, `analyzing-cubicacion`, `generating-impactos`, `completed`, `error`.
-   **Transiciones:** Lineal desde `pending-upload` hasta `completed`. Cualquier estado puede transicionar a `error`.

---

## 4. Contratos y Tipos
-   **Archivo:** `src/lib/comparacion-planos/types.ts`
-   **Interfaces Principales:**
    -   `ComparacionPlanosInput`: Define las entradas para el flujo de IA (dos data URIs).
    -   `ComparacionPlanosOutput`: Define la estructura JSON de salida de la IA, con `diffTecnico`, `cubicacionDiferencial` y `arbolImpactos`.
    -   `ImpactoNode`: Define la estructura recursiva para el árbol de impactos.
    -   `ComparacionPlanosJob`: Estructura del documento en Firestore.
    -   `ComparacionError`: Formato estandarizado para errores.

---

## 5. Prompts IA
-   **Ubicación:** `src/ai/comparacion-planos/prompts/`
-   **`diffPrompt.txt`**: Experto en interpretación de planos para detectar diferencias visuales.
-   **`cubicacionPrompt.txt`**: Experto en cubicación para detectar variaciones de cantidad.
-   **`impactosPrompt.txt`**: Jefe de Proyectos para analizar efectos en cascada entre especialidades.

---

## 6. Flujos IA
-   **Ubicación:** `src/ai/comparacion-planos/flows/`
-   `runDiffFlow`, `runCubicacionFlow`, `runImpactosFlow`: Funciones placeholder que encapsularán la lógica de Genkit para cada prompt.

---

## 7. Endpoints API
-   **`POST /api/comparacion-planos/upload`**: Recibe archivos, crea el job en Firestore, sube archivos a Storage y actualiza el estado a `uploaded`.
-   **`POST /api/comparacion-planos/analizar`**: Inicia el pipeline asincrónico, ejecutando los flujos de IA secuencialmente y actualizando el estado del job en Firestore.
-   **`GET /api/comparacion-planos/estado/[jobId]`**: Consulta y devuelve el estado actual y los resultados (o error) de un job específico.

---

## 8. Integración con Firestore
-   **Colección:** `comparacionPlanosJobs`
-   **Documento ID:** `jobId` (UUID)
-   **Campos del Documento:** `jobId`, `empresaId`, `userId`, `createdAt`, `updatedAt`, `status`, `planoA_storagePath`, `planoB_storagePath`, `errorMessage`, `results`.

---

## 9. Integración con Storage
-   **Ruta Base:** `/comparacion-planos/`
-   **Estructura por Job:** `/comparacion-planos/{jobId}/A.jpg` y `/comparacion-planos/{jobId}/B.jpg`.

---

## 10. UI/UX
-   **Pantallas:**
    1.  `.../upload`: Formulario de subida de planos.
    2.  `.../[jobId]`: Vista de progreso en tiempo real (polling).
    3.  `.../[jobId]/resultado`: Vista final con un resumen ejecutivo y los resultados detallados.
-   **Componentes Clave:** `UploadPlanesForm`, `AnalisisProgreso`, `ResumenEjecutivo`, `ResultadoDiffTecnico`, `ResultadoCubicacion`, `ResultadoArbolImpactos`.
-   **Dashboard:** Se integra mediante una tarjeta "PREMIUM" condicional, visible solo si la empresa tiene el flag `feature_plan_comparison_enabled: true`.

---

## 11. Seguridad
-   **Validación de Archivos:** Límites de tamaño (15MB), tipo (PDF, JPG, PNG) y contenido (rechazo de scripts).
-   **Permisos:** Acceso restringido por rol y por el feature flag `feature_plan_comparison_enabled` a nivel de empresa.
-   **Integridad del Job:** Verificación de pertenencia del `jobId` al `companyId` del usuario en cada operación.
-   **Seguridad IA:** Sanitización de entradas, validación de salidas JSON y timeouts.

---

## 12. Manejo de Errores
-   **Estructura:** `ComparacionError { code, message, details }`.
-   **Flujo:** Cualquier error en el pipeline (upload, conversión, IA, DB) transiciona el job a estado `error` y almacena el `ComparacionError` en el documento del job.
-   **UI:** Muestra un mensaje claro al usuario y ofrece una opción para reintentar.

---

## 13. Performance y Costos
-   **Optimización:** Conversión de PDFs a JPEG con resolución controlada (2000px máx.) para reducir tokens.
-   **Modelos IA:** Priorizar `gemini-1.5-flash` para eficiencia de costos.
-   **Escalabilidad:** Diseño asincrónico basado en jobs independientes que permite escalar a sistemas de colas (Cloud Tasks) si es necesario.
-   **Límites:** Definidos para tamaño de archivo, resolución y timeouts de ejecución para prevenir abusos y costos inesperados.

---

## 14. Testing
-   **Unit Tests:** FSM, validación de tipos y mocks de respuestas IA.
-   **Integration Tests:** Endpoints con mocks para Storage, Firestore y Genkit.
-   **IA Prompt Tests:** Sandbox para validar robustez y formato de las respuestas del modelo.
-   **Smoke Tests:** Flujo manual de navegación y renderizado básico.

---

## 15. Deployment y Rollback
-   **Pre-Deployment Checklist:** Verificación de aislamiento de código y dependencias.
-   **Staging:** Despliegue inicial en un entorno de pruebas réplica de producción para validación E2E con mocks.
-   **Activación Gradual:** Uso del feature flag `feature_plan_comparison_enabled` para activar el módulo primero a nivel interno y luego por cliente.
-   **Rollback Seguro:** Gracias al aislamiento, el rollback se simplifica a revertir los commits del módulo, sin necesidad de rollback de base de datos o storage.

