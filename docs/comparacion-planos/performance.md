# Estrategia de Performance, Escalabilidad y Costos - Módulo "Comparación de Planos"

Este documento define la estrategia técnica para asegurar que el módulo de Comparación de Planos sea eficiente, robusto y económicamente sostenible en un entorno de producción, manteniendo su aislamiento del resto del sistema PCG.

## 1. Optimización de Performance

El objetivo es minimizar la latencia percibida por el usuario y reducir la carga en los servicios de backend.

- **Procesamiento en el Cliente (Client-Side)**:
  - **Conversión de PDF a JPEG**: La conversión de archivos PDF a imágenes JPEG se realizará directamente en el navegador del usuario. Esto elimina la necesidad de un endpoint de servidor para esta tarea, reduciendo la carga del backend y los costos de cómputo.
  - **Optimización de Imágenes**: Antes de la subida, las imágenes (ya sea convertidas desde PDF o subidas directamente) serán redimensionadas y comprimidas en el cliente para asegurar que no excedan los umbrales de tamaño y resolución.

- **Ejecución de IA Atómica**:
  - Cada flujo de IA (`Diff`, `Cubicación`, `Impactos`) se ejecutará como un paso discreto y atómico. Esto permite un mejor seguimiento del progreso, un manejo de errores más granular y la posibilidad de reintentar solo las etapas que fallen.
  - Se evitarán bucles o cadenas de llamadas complejas dentro de un mismo prompt para mantener la predictibilidad y el control.

- **Evitar Regeneraciones**:
  - Un análisis completado (`status: "completed"`) no se podrá volver a ejecutar sobre el mismo `jobId`. Para un nuevo análisis, se deberá crear un nuevo job. Esto previene costos inesperados y mantiene la inmutabilidad de los resultados.

## 2. Escalabilidad

La arquitectura está diseñada para manejar un crecimiento en el número de usuarios y análisis simultáneos.

- **Aislamiento de Jobs**:
  - Cada análisis es un `job` independiente, representado por un único documento en Firestore (`comparacionPlanosJobs/{jobId}`).
  - Los archivos de cada job se almacenan en carpetas aisladas en Storage (`/comparacion-planos/{jobId}/...`).
  - Esta estructura previene conflictos de datos y permite que los jobs se procesen en paralelo sin interferencias.

- **Endpoints Idempotentes**:
  - Los endpoints de API se diseñarán para ser idempotentes siempre que sea posible. Por ejemplo, si se llama al endpoint de análisis (`/api/analizar`) múltiples veces para un job que ya está en `processing`, no se iniciarán nuevos procesos.

- **Diseño Asincrónico**:
  - El análisis principal de IA es un proceso asincrónico. El frontend inicia el job y luego consulta su estado (`polling`), desacoplando la interfaz de usuario del procesamiento pesado del backend.
  - **Futuro**: Esta arquitectura permite escalar fácilmente a sistemas de colas más robustos como Cloud Tasks o Workflows para gestionar picos de demanda, sin cambiar la lógica fundamental del job.

## 3. Control de Costos (IA y Servicios)

Se implementarán varias capas de control para mantener los costos operativos predecibles y bajos.

- **Selección de Modelos IA**:
  - Se priorizará el uso de modelos eficientes y de bajo costo como `gemini-1.5-flash` para las tareas de análisis. Los modelos más potentes (`pro`) se reservarán solo para las etapas que requieran un razonamiento más complejo (ej. Árbol de Impactos).

- **Optimización de Entradas (Inputs)**:
  - **Reducción de Tokens**: Las imágenes se pre-procesarán en el cliente a una resolución controlada (ver sección 5) para reducir drásticamente el número de tokens de entrada para los modelos multimodales.
  - **Prompts Eficientes**: Los prompts se diseñarán para ser concisos y directos, solicitando únicamente la salida JSON estructurada para minimizar los tokens de salida.

- **Límites de Uso (Diseño futuro)**:
  - Se podrá implementar un sistema de cuotas a nivel de empresa (`companies/{companyId}`). Un contador en el documento de la empresa podría registrar el número de análisis mensuales, permitiendo limitar el uso según el plan contratado.

- **Reintentos Controlados**:
  - La lógica de reintento para flujos de IA fallidos será limitada (ej. máximo 1 reintento automático) para evitar bucles costosos. El usuario podrá iniciar un reintento manual si el error persiste.

## 4. Optimización del Pipeline

El flujo de trabajo desde la perspectiva del usuario debe ser ágil y responsivo.

- **Respuesta Inmediata**: Los endpoints de `upload` y `analizar` (inicio) devolverán una respuesta inmediata (`< 1-2s`) para que el frontend pueda pasar a la pantalla de progreso sin esperar.
- **Tiempos de Ejecución Acotados**: La ejecución completa del pipeline de IA en el backend no debería superar el `timeout` definido (ver sección 5).
- **Lectura Rápida de Estado**: El endpoint de estado (`/api/estado/[jobId]`) realizará una lectura directa y simple del documento del job en Firestore, asegurando una respuesta de baja latencia para el polling.

## 5. Límites y Umbrales

Para garantizar la estabilidad y el control de costos, se definirán los siguientes límites:

- **Tamaño Máximo de Archivo (Upload)**: 15 MB por archivo (PDF o imagen).
- **Resolución Máxima de Imagen (Pre-procesamiento)**: 2000px en el lado más largo.
- **Tiempo Máximo de Análisis IA (por flow)**: 45 segundos.
- **Timeout Total del Job (Cloud Function)**: 5 minutos.

## 6. Monitoreo (Diseño Futuro)

Para la mejora continua y el diagnóstico de problemas, se propone registrar las siguientes métricas (sin implementar ahora):

- Una subcolección en `comparacionPlanosJobs/{jobId}/logs` podría almacenar eventos con `timestamp`.
- **Eventos a registrar**:
  - `job_created`
  - `upload_complete`
  - `analysis_started`
  - `flow_diff_completed` (con `duration_ms`)
  - `flow_cubicacion_completed` (con `duration_ms`)
  - `flow_impactos_completed` (con `duration_ms`)
  - `job_completed` (con `total_duration_ms`)
  - `job_failed` (con `error_code` y `stage`)

Estos datos permitirán construir un dashboard de monitoreo para identificar cuellos de botella, tasas de error y costos por análisis.
