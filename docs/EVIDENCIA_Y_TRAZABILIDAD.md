# Módulo de Inducciones de Seguridad Contextuales: Gestión de Evidencia y Trazabilidad

Este documento define los principios operativos, legales y de responsabilidad para la evidencia generada por el módulo de Inducciones de Seguridad Contextuales con IA de la plataforma PCG.

## 1. ¿Qué se considera evidencia en este módulo?

- **Acto de Inducción:** El "acto" es una secuencia de tres eventos indivisibles: 1) La plataforma genera un texto de micro-inducción. 2) La plataforma presenta este texto al usuario. 3) El usuario realiza una acción explícita e inequívoca (ej: presionar un botón "Entendido y Acepto") para acusar recibo.
- **Elementos Registrados:** La evidencia es el registro digital que demuestra la ocurrencia de este acto. Debe documentar de forma fehaciente el `qué`, `quién`, `cuándo` y `dónde` del evento.

## 2. Datos mínimos de la evidencia

El registro digital inmutable ("Acta Digital de Entrega de Información") debe contener, como mínimo:

- **Identificación del Receptor:** UID, RUT, nombre completo y email del usuario.
- **Contexto de la Obra:** `obraId` y nombre de la obra.
- **Contenido de la Inducción:**
    - `inputUsuario`: La descripción textual de la tarea que el usuario ingresó y que sirvió como base para la IA.
    - `textoInduccionGenerado`: El contenido completo y exacto de la micro-inducción que se le mostró al usuario.
- **Trazabilidad del Acto (Timestamps):**
    - `fechaGeneracion`: Cuándo se generó el texto por la IA.
    - `fechaPresentacion`: Cuándo se mostró el contenido al usuario.
    - `fechaConfirmacion`: Cuándo el usuario confirmó la lectura.
- **Metadata de Auditoría:** Un ID único para la transacción (`jobId`) y el modelo de IA utilizado.

## 3. Valor de la evidencia

- **Para la Gestión Preventiva:**
    - **Refuerzo Continuo:** Prueba que la empresa realiza esfuerzos diarios y contextuales para mantener la conciencia del riesgo, más allá de la inducción inicial.
    - **Análisis de Tendencias:** Permite al Departamento de Prevención de Riesgos analizar qué tipo de tareas y riesgos se declaran con más frecuencia, orientando capacitaciones y controles más robustos.
    - **Auditoría de Calidad:** Facilita la revisión por parte del prevencionista sobre la pertinencia y calidad de las inducciones que la IA está generando.
- **Para Auditorías (Internas y Externas):**
    - Demuestra la existencia de un **sistema proactivo y documentado** para la gestión del riesgo operacional diario.
    - Aporta a la demostración de **diligencia debida** por parte del empleador, mostrando que se toman medidas adicionales para comunicar peligros.

## 4. Límites de la evidencia

- **QUÉ NO DEMUESTRA:**
    - **Comprensión:** El registro NO prueba que el trabajador haya comprendido el contenido, solo que se le presentó y que acusó recibo. La comprensión es un estado cognitivo no certificable por este medio.
    - **Competencia:** NO certifica que el trabajador esté capacitado o sea competente para realizar la tarea.
    - **Seguridad del Entorno:** NO es una prueba de que las condiciones de trabajo fueran seguras en ese momento.
- **QUÉ NO REEMPLAZA:**
    - La **Obligación de Informar (ODI)**, que es un acto legal formal, documentado y separado.
    - Los **Procedimientos de Trabajo Seguro (PTS)**.
    - La **supervisión directa y efectiva** en terreno.
- **QUÉ RESPONSABILIDADES NO TRANSFIERE:**
    - **NO transfiere el deber de control del empleador al trabajador.** La responsabilidad final por la seguridad sigue recayendo en la empresa y su línea de mando.

## 5. Principios de trazabilidad recomendados

- **Integridad:** El registro debe ser completo, almacenando tanto el `input` del usuario como el `output` exacto de la IA. Esto permite reconstruir el evento completo en caso de una auditoría o investigación.
- **Inmutabilidad:** Una vez creado, un registro de inducción no debe ser modificable. Cualquier corrección o re-inducción debe generar un nuevo registro, preservando el historial original.
- **Interconexión (Relacionalidad):** El registro de inducción debe estar vinculado (`foreign key`) al registro de **Control de Acceso** correspondiente. Esto crea una cadena de evidencia auditable: `[Registro de Acceso] -> [Registro de Inducción Contextual]`.
- **Conservación:** Los registros deben almacenarse por un período que cumpla con las políticas de retención de documentos de la empresa y la normativa legal aplicable a registros de seguridad.
