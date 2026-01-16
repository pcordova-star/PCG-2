# Estrategia de Deployment, Verificación y Rollback - Módulo "Comparación de Planos"

Este documento define el plan de despliegue seguro para el módulo de Comparación de Planos, garantizando que su integración no afecte la estabilidad de la plataforma PCG.

## 1. Pre-Deployment Checklist (Lista de Verificación Previa)

Antes de cualquier despliegue en un entorno compartido (staging o producción), se debe confirmar lo siguiente:

-   **Aislamiento de Código**:
    -   [ ] El módulo **no modifica** archivos existentes fuera de sus carpetas dedicadas.
    -   [ ] Todos los endpoints de la API están en la nueva ruta `/api/comparacion-planos/`.
    -   [ ] La base de datos utiliza una colección nueva y exclusiva: `comparacionPlanosJobs`.
    -   [ ] El almacenamiento de archivos se limita a la ruta `comparacion-planos/{jobId}/`.
    -   [ ] Los flujos de IA son independientes y no tienen dependencias con el cubicador existente.
-   **Validación de Contratos**:
    -   [ ] Las interfaces en `types.ts` son estables y han sido validadas.
    -   [ ] La Máquina de Estados Finitos (`fsm.ts`) define todas las transiciones posibles, incluido el estado de error.
    -   [ ] Los prompts de IA han sido probados en un sandbox (como Google AI Studio) y devuelven el formato JSON esperado.

## 2. Deployment en Entorno de Staging

El primer despliegue se realizará en un proyecto de Firebase/Vercel de `staging` que sea una réplica del entorno de producción.

-   **Pruebas de Smoke Obligatorias**:
    -   **Navegación**: El flujo `Upload` -> `Progreso` -> `Resultados` debe ser navegable, aunque los componentes solo muestren placeholders.
    -   **API Endpoints**: Cada endpoint (`/upload`, `/analizar`, `/estado/[jobId]`) debe estar desplegado y responder con el `placeholder` definido (ej. `200 OK` con un mensaje simple), sin lógica real.
    -   **Creación de Job**: Al llamar a la API de `upload` (manualmente o con una UI de prueba), se debe crear un documento vacío en Firestore (`comparacionPlanosJobs/{jobId}`) y una carpeta en Storage (`/comparacion-planos/{jobId}/`), confirmando el aislamiento.
    -   **Renderizado**: El componente de la tarjeta PREMIUM en el dashboard debe renderizarse correctamente según el flag de la empresa (simulado en staging).

## 3. Activación Gradual en Producción (Feature Flag)

El módulo se desplegará en producción, pero permanecerá inactivo para los usuarios finales.

-   **Paso 1: Deploy Apagado**: Desplegar el código con el feature flag `feature_plan_comparison_enabled` en `false` para todas las empresas en la base de datos de producción.
-   **Paso 2: Activación Interna**: Habilitar el flag (`true`) únicamente para la empresa interna de desarrollo/QA o para el usuario `superadmin`.
-   **Paso 3: Pruebas Internas en Producción**:
    -   Ejecutar un análisis de extremo a extremo con un job real (archivos de prueba).
    -   Verificar que los flujos de IA se ejecuten y que los resultados se almacenen correctamente en Firestore.
    -   Confirmar que no se generan costos inesperados en la API de Google AI.

## 4. Verificaciones Post-Deployment

Inmediatamente después del despliegue en producción (con el flag apagado), verificar:

-   **Logs de API**: Monitorear los logs de Vercel/Firebase para los nuevos endpoints, asegurando que no haya errores `500` ni tráfico inesperado.
-   **Dashboard Principal**: Confirmar que la plataforma sigue funcionando con normalidad y que el nuevo código no ha introducido regresiones.
-   **Creación de Job (manual)**: Realizar una llamada manual a la API de `upload` para un usuario de prueba interno. Verificar que se crea el job en Firestore y la carpeta en Storage sin errores.

## 5. Estrategia de Rollback Seguro

Gracias al diseño aislado, el rollback es un proceso de bajo riesgo.

-   **Condiciones para Rollback**: Se activará si se detecta cualquier impacto negativo en los módulos existentes de producción o si las verificaciones post-deployment fallan de manera crítica.
-   **Procedimiento de Rollback**:
    1.  Revertir el commit que contiene el nuevo módulo desde el repositorio de Git.
    2.  Realizar un nuevo deploy de la versión anterior.
    3.  **No se requiere rollback de base de datos ni de storage**, ya que el módulo opera sobre colecciones y carpetas nuevas y aisladas.
    4.  (Opcional) Eliminar manualmente la colección `comparacionPlanosJobs` de Firestore y la carpeta `/comparacion-planos/` de Storage.

## 6. Bloqueo de Activación a Clientes

El feature flag `feature_plan_comparison_enabled` solo se activará para empresas cliente cuando:

-   Todos los flujos de IA (`diff`, `cubicacion`, `impactos`) estén completamente implementados y probados.
-   La integración completa haya sido validada en el entorno de staging.
-   El modelo de costos haya sido aprobado por el equipo de negocio.