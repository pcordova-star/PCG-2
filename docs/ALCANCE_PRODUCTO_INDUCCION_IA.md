# Módulo de Inducciones de Seguridad Contextuales con IA: Alcance de Producto

Este documento define el alcance, límites y fases de implementación del módulo de IA para inducciones de seguridad en la plataforma PCG, según lo acordado en los Prompts de diseño N°1 a N°7.

---

### 1. ALCANCE MVP (Mínimo Producto Viable)

El MVP se centra en entregar valor inmediato y medible, con el mínimo riesgo operativo y legal.

- **Funcionalidades Mínimas:**
    1.  **Integración con Control de Acceso:** El módulo se activa como un paso obligatorio tras escanear el QR de acceso y completar el formulario de registro.
    2.  **Generación de Inducción por IA:** Utiliza el campo "Tarea a realizar hoy" para generar una micro-inducción de seguridad textual, breve y contextual.
    3.  **Flujo de Confirmación:** El usuario debe marcar explícitamente una casilla ("Declaro haber leído...") para poder finalizar el proceso. Sin esta acción, el acceso no se considera completado.
    4.  **Registro de Evidencia Inmutable:** Se crea un "Acta Digital de Entrega de Información" por cada inducción confirmada, almacenando `quién`, `cuándo`, `dónde`, `qué tarea declaró` y `qué texto se le mostró`.
    5.  **Manejo de Fallos de IA:** Si la IA falla, el sistema presenta un mensaje de seguridad genérico predefinido para no interrumpir el acceso y registra el fallo internamente.
    6.  **Auditoría de Solo Lectura:** El prevencionista/administrador tiene una vista en PCG para consultar todos los registros de inducción generados, incluyendo el texto exacto mostrado al usuario.

- **Casos de Uso Cubiertos por el MVP:**
    - Inducción diaria para trabajadores y subcontratistas recurrentes.
    - Inducción única para visitas esporádicas.
    - Refuerzo de seguridad para tareas no rutinarias declaradas al ingreso.

- **Datos Registrados como Evidencia (MVP):**
    - `userId`, `obraId`, `empresaId`.
    - `inputUsuario` (el texto exacto de la tarea que el usuario declaró).
    - `textoInduccionGenerado` (el contenido exacto de la micro-inducción).
    - `timestampGeneracion`, `timestampPresentacion`, `timestampConfirmacion`.
    - `iaModel` utilizado y `jobId` de la transacción.

### 2. ALCANCE PREMIUM / FASE POSTERIOR

Estas funcionalidades se considerarán para futuras versiones, una vez que el MVP esté validado y en operación estable. Pueden ser parte de un plan "Premium" o una actualización general.

1.  **Panel de Analítica para Prevencionistas:** Un dashboard que muestre tendencias, como las tareas de mayor riesgo declaradas, frecuencia de inducciones por obra, y análisis de la calidad de los inputs de los usuarios.
2.  **"Explicador Normativo" con IA:** Una herramienta donde el prevencionista pueda preguntar a la IA sobre artículos específicos de la normativa chilena (ej: "Explícame el Art. 21 del DS40") y recibir un resumen en lenguaje simple.
3.  **Conexión con Matriz IPER:** Una versión avanzada que intente correlacionar la "tarea declarada" por el usuario con un peligro específico de la matriz IPER de la obra para generar una inducción aún más precisa.
4.  **Personalización de Prompts por Obra:** Permitir que el prevencionista añada "reglas personalizadas" al prompt de la IA para una obra específica (ej: "En esta obra, siempre mencionar el riesgo de atropello por maquinaria pesada").
5.  **Soporte Multilingüe:** Generación de inducciones en otros idiomas (ej: inglés, portugués) para trabajadores extranjeros.
6.  **Notificaciones Proactivas:** Alertar al prevencionista si se detecta un número inusual de declaraciones de tareas de alto riesgo en un período corto.

### 3. FUNCIONALIDADES EXCLUIDAS (FUERA DE ALCANCE)

Este módulo, en ninguna de sus fases, realizará las siguientes acciones:

1.  **NO tomará decisiones de acceso:** Nunca aprobará o denegará el ingreso de una persona a la obra. Es un paso informativo, no un sistema de control o autorización.
2.  **NO reemplazará la ODI ni los PTS:** No sustituye ninguna obligación legal formal del empleador, como la "Obligación de Informar" o los "Procedimientos de Trabajo Seguro".
3.  **NO generará sanciones ni evaluará desempeño:** Los datos de las inducciones son para trazabilidad y mejora continua, no para medir o castigar a los trabajadores.
4.  **NO analizará documentos adjuntos:** No procesará PDFs, imágenes de planos ni otros archivos. Su única entrada de contexto de tarea es el campo de texto libre.
5.  **NO activará protocolos de emergencia:** No está conectado a sistemas de alarma ni de respuesta a incidentes.

### 4. CRITERIOS DE ÉXITO DEL MVP

Se considerará que el MVP es exitoso si se cumplen los siguientes indicadores:

- **Operativos:**
    1.  El flujo completo de inducción (desde el envío del formulario hasta la página de éxito) se completa en menos de 15 segundos en el 95% de los casos.
    2.  La tasa de fallos en la generación de inducciones por parte de la IA es inferior al 2%.
    3.  Se crea un registro de evidencia completo y correcto por cada inducción confirmada.
- **Cualitativos:**
    1.  Los prevencionistas perciben el registro de auditoría como una herramienta útil y fiable para demostrar la gestión preventiva diaria.
    2.  No se reciben quejas de los usuarios finales (trabajadores) sobre la complejidad o duración del flujo.
    3.  El sistema resiste intentos de "saltarse" la confirmación de lectura.
