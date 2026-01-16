# Plan de Mantenimiento y Roadmap - Módulo "Comparación de Planos"

**Versión:** 1.0  
**Fecha:** 2025-11-15  
**Estado:** Planificación Inicial

Este documento técnico define la estrategia de mantenimiento, el versionamiento, la hoja de ruta de mejoras y los riesgos operativos del módulo de **Comparación de Planos**. Su objetivo es garantizar la sostenibilidad, seguridad y evolución del módulo a largo plazo.

---

## 1. Plan de Mantenimiento Trimestral

Se establece una rutina de revisión trimestral para asegurar la salud y eficiencia del módulo.

-   **Revisión de Conversión PDF → JPEG:**
    -   [ ] Validar calidad de las imágenes generadas.
    -   [ ] Probar compatibilidad con nuevas versiones de navegadores y librerías PDF.
    -   [ ] Medir latencia promedio de conversión en el cliente.
-   **Revisión de Firebase Storage:**
    -   [ ] Analizar crecimiento del bucket `/comparacion-planos/`.
    -   [ ] Implementar política de ciclo de vida para archivar o eliminar jobs antiguos (> 12 meses) si es necesario.
-   **Revisión de Costos y Uso de IA:**
    -   [ ] Auditar costos de la API de Google AI asociados al módulo.
    -   [ ] Medir tokens promedio de entrada/salida por cada flow (Diff, Cubicación, Impactos).
    -   [ ] Comparar costos con las proyecciones y ajustar si hay desviaciones.
-   **Revisión de Errores y Latencias:**
    -   [ ] Analizar logs en busca de errores recurrentes (`IA_DIFF_FAILED`, `IA_CUBICACION_FAILED`, `IA_IMPACTOS_FAILED`, `PDF_CONVERSION_FAILED`).
    -   [ ] Medir latencia P50 y P95 de cada flow de IA y del pipeline completo.
    -   [ ] Identificar jobs atascados (`stalled`) o que terminaron en estado `error`.
-   **Revisión de Permisos y Seguridad:**
    -   [ ] Validar que solo empresas con el flag habilitado pueden acceder.
    -   [ ] Verificar que los roles permitidos siguen siendo los correctos.

---

## 2. Estrategia de Versionamiento (SemVer)

El módulo seguirá un versionamiento semántico (SemVer) para gestionar su evolución de forma predecible.

-   **v1.0.x (Patch):** Correcciones de bugs menores que no afectan la funcionalidad principal. No requieren cambios en la UI ni en los contratos de datos.
-   **v1.1.0 (Minor):** Mejoras de UI, optimizaciones de performance, o ajustes en los prompts de IA que no alteran la estructura de salida.
-   **v1.2.0 (Minor):** Ajustes en los prompts que *mejoran* pero no rompen la estructura del JSON de salida (ej. añadir un campo opcional).
-   **v1.3.0 (Minor):** Incorporación de nuevos componentes visuales (ej. gráficos, filtros avanzados) que no alteran el pipeline.
-   **v2.0.0 (Major):** Cambios que rompen la compatibilidad.
    -   Modificación de la estructura de salida de los flows de IA.
    -   Integración de nuevos modelos de análisis (ej. análisis multicapa).
    -   Cambios profundos en la arquitectura del pipeline.

**Documentación de Cambios:** Cada nueva versión (minor o major) debe ir acompañada de una actualización en el `CHANGELOG.md` del módulo.

---

## 3. Catálogo de Mejoras Futuras (Roadmap Técnico)

-   [ ] **Análisis Multicapa:** Permitir comparar un set de planos (Arquitectura + Estructura + Electricidad) para detectar interferencias entre especialidades.
-   [ ] **Bounding Boxes:** Mejorar el `diffTecnico` para que la IA devuelva coordenadas (bounding boxes) de las diferencias, permitiendo resaltarlas visualmente en la UI.
-   [ ] **Exportación PDF Profesional:** Generar un PDF con portada, logos de la empresa, y firmas digitales.
-   [ ] **Visualización Avanzada del Árbol de Impactos:** Usar una librería como D3.js para renderizar el árbol de forma más interactiva.
-   [ ] **Histórico de Análisis:** Crear un panel por obra que liste todos los análisis de comparación realizados.
-   [ ] **Notificaciones Asincrónicas:** Enviar un correo electrónico al usuario cuando un análisis largo haya finalizado.
-   [ ] **Integración con RDI y Hallazgos:** Permitir crear un RDI o un hallazgo directamente desde un ítem del resultado del análisis.
-   [ ] **Versión Móvil Simplificada:** Crear una vista optimizada para móviles que muestre solo el Resumen Ejecutivo.

---

## 4. Seguridad y Auditoría

-   **Revisión Trimestral de Accesos:**
    -   [ ] Validar que solo los roles autorizados (`admin_empresa`, `jefe_obra`, `superadmin`) pueden usar el módulo.
    -   [ ] Auditar la lista de empresas con `feature_plan_comparison_enabled: true` para asegurar que coincida con los contratos comerciales.
-   **Logs de Auditoría (Diseño Futuro):**
    -   Crear una subcolección `auditLogs` en cada job para registrar eventos clave: `job_created`, `analysis_started`, `analysis_completed`, `analysis_failed`.
    -   Registrar qué administrador habilita o deshabilita el feature flag para una empresa.

---

## 5. Performance y Escalabilidad a Largo Plazo

-   **Escalabilidad IA:** Si la demanda aumenta, migrar la ejecución de los flows de IA de un endpoint síncrono a un sistema de colas (ej. Cloud Tasks) para manejar picos de carga.
-   **Optimización de Tokens:** Revisar y refinar los prompts de IA cada 6 meses para reducir la cantidad de tokens sin perder calidad en la respuesta.
-   **Evaluación de Nuevos Modelos:** Cada 6 meses, evaluar si nuevos modelos de Gemini (o de otros proveedores) ofrecen un mejor balance de costo/performance para este caso de uso.
-   **Latencia Objetivo:** Mantener una latencia P95 para el pipeline completo por debajo de los 20 segundos.

---

## 6. Riesgos Operativos y Mitigaciones

| Riesgo                               | Mitigación                                                                                                     |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| **Cambios en modelos IA**            | Versionar prompts y tener una suite de tests de regresión para validar la estructura de salida.                  |
| **Aumento de costos IA**             | Monitoreo constante de tokens, optimización de prompts, y evaluar modelos más eficientes (ej. `flash`).            |
| **Planos de gran tamaño/complejidad**| Limitar el tamaño de subida a 15MB y la resolución de la imagen a 1600px.                                         |
| **Errores de OCR (futuro)**          | Usar modelos multimodales que lean la imagen directamente, evitando dependencia de OCR.                           |
| **Saturación de Storage**            | Implementar políticas de ciclo de vida en Storage para archivar o eliminar jobs antiguos.                         |
| **Jobs en cola por mucho tiempo**    | Implementar timeouts estrictos en las funciones y migrar a Cloud Tasks si el volumen de análisis simultáneos crece. |

---

## 7. Roadmap de Crecimiento (6–18 Meses)

-   **Próximos 6 Meses:**
    -   **UI Mejorada:** Visualización del árbol de impactos con D3.js.
    -   **PDF Profesional:** Implementación del exportador a PDF con branding de la empresa.
    -   **Panel de Históricos:** Vista de todos los análisis realizados por obra.
-   **Próximos 12 Meses:**
    -   **Integración con Módulos:** Crear RDIs o Hallazgos directamente desde un resultado del análisis.
    -   **Bounding Boxes:** Implementar la detección visual de cambios sobre el plano.
-   **Próximos 18 Meses:**
    -   **Análisis Multidisciplinario:** Permitir la comparación de planos de distintas especialidades para detectar interferencias.
    -   **Análisis Automático:** Opción para que el sistema detecte automáticamente una nueva versión de un plano en el gestor documental y sugiera una comparación.
