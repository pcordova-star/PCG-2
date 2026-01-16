# Plan Operativo: Activación, Monitoreo y Mantenimiento - Módulo "Comparación de Planos"

**Versión:** 1.0  
**Fecha:** 2025-11-15  
**Estado:** Plan Operativo Definido

Este documento técnico contiene el plan operativo para la activación controlada, el monitoreo, la observabilidad y el mantenimiento del módulo de **Comparación de Planos**. Su objetivo es garantizar un despliegue seguro, medible y estable en un entorno de producción.

---

## 1. Plan de Activación Gradual (Rollout)

La activación del módulo se realizará por etapas para minimizar riesgos y validar la estabilidad en un entorno real con carga controlada.

### 1.1. Fases del Rollout

*   **Etapa 1: Piloto Interno (24-48 horas)**
    *   **Activación:** Habilitar el flag `feature_plan_comparison_enabled: true` únicamente para una empresa interna de QA (`empresaId: "pcg_qa"`).
    *   **Usuarios:** Solo roles `superadmin` y `admin_empresa`.
    *   **Objetivo:** Validar el pipeline E2E con casos de prueba reales y monitorear la infraestructura base sin impacto en clientes.
    *   **Métrica de Avance:** Tasa de éxito del pipeline > 98%. Latencia promedio < 15s.

*   **Etapa 2: Piloto con Cliente Seleccionado (72 horas)**
    *   **Activación:** Habilitar el flag para una empresa cliente seleccionada (`empresaId: "cliente_beta_01"`).
    *   **Usuarios:** Roles `admin_empresa` y `jefe_obra`.
    *   **Objetivo:** Monitorear el rendimiento y costos bajo uso real pero limitado. Recopilar feedback directo del cliente.
    *   **Métrica de Avance:** Tasa de error < 5%. Costo por análisis dentro del umbral proyectado.

*   **Etapa 3: Expansión Controlada (1 semana)**
    *   **Activación:** Habilitar el flag para un grupo de 5 a 10 empresas seleccionadas.
    *   **Objetivo:** Validar la escalabilidad y el comportamiento del sistema con una carga moderada y diversa.
    *   **Métrica de Avance:** Mantener KPIs de rendimiento y costos estables con el aumento de la carga.

*   **Etapa 4: Activación General (Bajo Demanda)**
    *   **Activación:** El módulo se considera estable y se habilita para nuevos clientes como parte de un plan comercial.

### 1.2. Condiciones para Congelar el Rollout
El proceso de activación se detendrá inmediatamente si se detecta cualquiera de las siguientes condiciones:
-   Tasa de error del pipeline > 10% en cualquier etapa.
-   Latencia promedio de análisis > 30 segundos de forma sostenida.
-   Impacto negativo medible en el rendimiento de otros módulos de la plataforma.
-   Costos de IA que superen en un 20% las proyecciones.

---

## 2. Estrategia de Monitoreo

El monitoreo se centrará en la salud de los endpoints, la performance del pipeline de IA y los costos asociados.

### 2.1. Indicadores Clave (KPIs)
-   **Tasa de Error por Endpoint:**
    -   `POST /api/comparacion-planos/upload`: debe ser < 2%.
    -   `POST /api/comparacion-planos/analizar`: debe ser < 5% (fallos de IA incluidos).
    -   `GET /api/comparacion-planos/estado/[jobId]`: debe ser < 1%.
-   **Latencia del Pipeline de IA:**
    -   **P50 (Mediana):** < 10 segundos.
    -   **P95 (Percentil 95):** < 20 segundos.
-   **Latencia por Flow de IA:**
    -   `runDiffFlow`: < 5 segundos.
    -   `runCubicacionFlow`: < 7 segundos.
    -   `runImpactosFlow`: < 8 segundos.
-   **Tasa de Fallo por Flow de IA:**
    -   `IA_DIFF_FAILED`: < 3%.
    -   `IA_CUBICACION_FAILED`: < 4%.
    -   `IA_IMPACTOS_FAILED`: < 5%.
-   **Estado de los Jobs:**
    -   Número de jobs en estado `error`.
    -   Número de jobs "atascados" en estados intermedios por más de 2 minutos.

### 2.2. Herramientas
-   **Cloud Logging:** Para filtrar errores por `endpoint` y `jobId`.
-   **Firestore Console:** Para observar el estado de la colección `comparacionPlanosJobs`.
-   **Google Cloud Monitoring:** Para crear dashboards con las métricas de latencia y error.

---

## 3. Estrategia de Observabilidad

Para diagnosticar problemas, cada `job` debe ser trazable a lo largo de todo su ciclo de vida.

### 3.1. Trazabilidad por `jobId`
-   Todos los logs generados en el backend (API y flows IA) **deben** incluir el `jobId` como un campo estructurado.
-   Esto permite filtrar todos los eventos relacionados con un análisis específico en Cloud Logging.

### 3.2. Métricas por Etapa (Logging Estructurado)
Se deben registrar las siguientes métricas en cada ejecución exitosa del pipeline `/analizar`:
```json
{
  "jobId": "...",
  "metrics": {
    "pdf_conversion_time_ms": 1200,
    "storage_upload_time_ms": 800,
    "ia_diff_duration_ms": 2500,
    "ia_diff_tokens_in": 15000,
    "ia_diff_tokens_out": 800,
    "ia_cubicacion_duration_ms": 4100,
    "ia_cubicacion_tokens_in": 16000,
    "ia_cubicacion_tokens_out": 1200,
    "ia_impactos_duration_ms": 5200,
    "ia_impactos_tokens_in": 18000,
    "ia_impactos_tokens_out": 2500,
    "pipeline_duration_total_ms": 13800
  }
}
```

### 3.3. Detección de Cuellos de Botella
-   El análisis de las métricas anteriores permitirá identificar si una etapa específica (ej. `ia_impactos_duration_ms`) está causando la mayor parte de la latencia.
-   Un aumento en `pdf_conversion_time_ms` puede indicar problemas con archivos PDF complejos.

---

## 4. Alertas y Umbrales

Se deben configurar alertas automáticas en Google Cloud Monitoring para notificar al equipo de desarrollo ante las siguientes condiciones:

-   **`Error Rate > 15% (5 min)`**: Si la tasa de error en `/api/comparacion-planos/analizar` supera el 15% durante 5 minutos.
-   **`IA Latency > 25s (P95)`**: Si el percentil 95 de la latencia total del pipeline supera los 25 segundos.
-   **`Consecutive IA Failures >= 3`**: Si se registran 3 logs de error consecutivos con el mismo `errorCode` (ej. `IA_DIFF_FAILED`).
-   **`Stalled Jobs > 5`**: Si hay más de 5 jobs que permanecen en un estado intermedio (`processing`, `analyzing-*`) por más de 3 minutos.
-   **`Cost Spike > 20%`**: Si el costo diario proyectado de la API de Google AI para este módulo aumenta un 20% sin un aumento proporcional en el número de jobs.

---

## 5. Procedimiento de Rollback (Desactivación de Emergencia)

Si se detecta un problema crítico, el módulo puede ser desactivado de forma segura siguiendo estos pasos:

1.  **Desactivar el Feature Flag:** En Firestore, para todas las empresas afectadas, establecer el campo `feature_plan_comparison_enabled` en `false`.
2.  **Verificar Acceso:** Confirmar que los usuarios de esas empresas ya no vean la tarjeta del módulo en el dashboard y que cualquier intento de acceder a las URLs del módulo resulte en la página de "Acceso Denegado".
3.  **Monitorear API:** Asegurarse de que los endpoints de la API del módulo dejen de recibir tráfico y comiencen a devolver errores `403 Forbidden`.
4.  **No se requiere rollback de base de datos o storage**, ya que el módulo opera en colecciones y carpetas aisladas. Los jobs y archivos existentes permanecerán intactos pero inaccesibles desde la UI.

---

## 6. Métricas de Éxito para Activación Completa

La activación global del módulo se considerará exitosa y segura cuando se cumplan las siguientes métricas de forma sostenida durante al menos una semana con la Etapa 3 del rollout:

-   **Tasa de Error Total del Pipeline:** < 2%.
-   **Tasa de Éxito del Análisis IA:** > 95% de los jobs finalizan en estado `completed`.
-   **Latencia Promedio (P50):** Entre 8 y 12 segundos.
-   **Estabilidad de Jobs:** Menos del 1% de los jobs terminan en estado `error`.
-   **Costos de IA:** Estables y predecibles, dentro del margen definido por análisis.

---

## 7. Checklist de Estabilidad Pre-Lanzamiento

-   [ ] **Upload:** Estable y maneja PDF/JPG/PNG sin fallos.
-   [ ] **Conversión PDF:** Estable, rápida (< 2s) y optimiza imágenes correctamente.
-   [ ] **Flow Diff:** Robusto, siempre devuelve JSON válido.
-   [ ] **Flow Cubicación:** Robusto, siempre devuelve JSON válido.
-   [ ] **Flow Impactos:** Robusto, siempre devuelve JSON válido y maneja contexto.
-   [ ] **UI de Resultados:** Renderiza todas las secciones (Resumen, Diff, Cubicación, Impactos) correctamente con datos reales.
-   [ ] **Acciones de UI:** Los botones "Reanalizar", "Descargar JSON" y "Descargar PDF" son funcionales.
-   [ ] **Permisos:** La validación de acceso funciona correctamente en las páginas y APIs.
-   [ ] **Aislamiento:** No se detectan efectos secundarios en otros módulos de la plataforma.
-   [ ] **Resiliencia:** El pipeline maneja errores de IA (ej. reintentos) y fallos de red sin dejar jobs en estados corruptos.
