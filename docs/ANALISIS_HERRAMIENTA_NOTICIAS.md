
# Análisis de Herramienta: Noticias Contextuales en PCG

Este documento evalúa la incorporación de una herramienta de noticias del sector construcción a la plataforma PCG, desde la perspectiva de la Inteligencia Operacional (IO).

---

### 1. Problema Operacional a Resolver

La gestión de una obra es un sistema semi-aislado que sufre de una desconexión crónica entre el **macro-entorno** (cambios normativos, tendencias de fiscalización, crisis de suministros, fallos de mercado) y las **micro-decisiones** diarias en terreno.

Un administrador de obra o un prevencionista opera con la información que tiene *dentro* de la obra, pero a menudo reacciona tarde a factores externos que ya eran previsibles.

**Problemas concretos que esta desconexión genera:**
- **Incumplimiento normativo por desconocimiento:** Se enteran de una nueva regulación o criterio de fiscalización cuando ya están siendo inspeccionados.
- **Vulnerabilidades no anticipadas:** Un accidente grave en otra faena con una grúa similar no gatilla una revisión proactiva de los equipos propios.
- **Quiebres de stock imprevistos:** Una huelga portuaria o un problema con un proveedor de acero no se conecta con el cronograma de la obra hasta que el material no llega.
- **Decisiones de costo desinformadas:** Decisiones de compra se toman sin considerar una inminente alza en el precio de un material clave.

La herramienta de noticias contextuales no busca "informar por informar", sino **cerrar esta brecha**, transformando un evento externo en un *input* procesable para la gestión de la obra.

### 2. Evaluación de Aporte a la Inteligencia Operacional (IO)

La IO no es acumular datos, es conectar datos para generar criterio. En este contexto:

- **Un "feed de noticias" es RUIDO:** Una lista de titulares de diarios de construcción es una distracción. El usuario no tiene tiempo de leer y correlacionar 20 noticias diarias con sus 50 tareas pendientes. Esto **resta** IO porque aumenta la carga cognitiva.

- **Una "noticia contextualizada y accionable" es INTELIGENCIA:** Un sistema que procesa una noticia y la presenta de la siguiente forma **aporta** IO:
  > **Noticia:** "Dirección del Trabajo anuncia fiscalización enfocada en el uso de andamios y plataformas de trabajo en altura en la Región Metropolitana durante el próximo trimestre."
  >
  > **Contexto IO en PCG:**
  > - **Alerta gatillada para:** Obra "Edificio Central", ubicada en la RM.
  > - **Asociada a:** IPER-017 (Trabajos en altura).
  > - **Acción recomendada:** "Generar checklist de verificación de andamios" o "Programar charla de 5 minutos sobre uso de arnés de seguridad".
  > - **Dirigida a:** Prevencionista de la obra.

La herramienta solo aporta IO si actúa como un **motor de correlación y recomendación**, no como un simple agregador de contenidos.

### 3. Beneficios Operacionales Concretos

Si se implementa bajo condiciones estrictas (ver punto 7), los beneficios son directos y medibles:

- **Prevención Proactiva:** Permite pasar de una prevención reactiva (post-accidente) a una **predictiva**, basada en tendencias y eventos del sector. Una alerta sobre el colapso de un andamio en una obra ajena se convierte en una orden de inspección verificable en la propia.
- **Cumplimiento Normativo Dinámico:** Un cambio en el DS44 o un nuevo dictamen de la SUSESO puede gatillar automáticamente una tarea de "actualizar procedimiento X" o "revisar matriz de cumplimiento legal". Reduce la dependencia de que el prevencionista lea el Diario Oficial.
- **Planificación Resiliente:** Alertas sobre huelgas, escasez de materiales o cambios de precios permiten al Jefe de Obra **anticipar y ajustar** la planificación de compra y logística, en lugar de solo reaccionar a los quiebres de stock.
- **Gestión de Riesgos de Subcontratistas:** Una noticia sobre la insolvencia o problemas de seguridad de una empresa subcontratista a nivel nacional puede generar una alerta para revisar el estado de cumplimiento y pagos de esa misma empresa si está en la obra.

### 4. Riesgos Identificados

- **Sobrecarga Informativa (Ruido):** El riesgo principal. Si la herramienta no filtra y contextualiza agresivamente, se convertirá en un widget ignorado que consume recursos y distrae.
- **Irrelevancia Contextual:** Mostrar noticias sobre la minería del norte a un jefe de obra que construye viviendas en el sur es inútil y erosiona la confianza en la herramienta.
- **Distracción del Foco Operativo:** El equipo de obra debe estar enfocado en *su* operación. La herramienta podría desviar la atención hacia problemas externos que no tienen un impacto directo o accionable.
- **Fatiga de Alertas:** Un exceso de notificaciones "informativas" hará que las alertas críticas (ej. un hallazgo de seguridad) pierdan efectividad.

### 5. Criterios de Valor: ¿Cuándo una noticia es IO?

Una noticia solo debe ser procesada y mostrada en PCG si cumple **al menos uno** de estos criterios:

1.  **Es Conectable a un Objeto de Gestión PCG:** La noticia puede ser vinculada de forma lógica a una `obraId`, `subcontratistaId`, un `IPERRegistro` (por tipo de riesgo), o un `DocumentoCorporativo` (por normativa).
2.  **Es Accionable dentro de PCG:** El contenido de la noticia permite al sistema sugerir una acción concreta y trazable en la plataforma. Ejemplos: "generar checklist", "programar charla", "revisar presupuesto", "actualizar documento".
3.  **Es Relevante para un Rol Específico:** Una noticia sobre un cambio en la Ley de Subcontratación es crítica para el Administrador de Empresa, pero es ruido para un capataz. La distribución debe ser por perfil.
4.  **Tiene Pertinencia Geográfica:** Debe filtrar por región o comuna cuando el evento es localizado (ej. fiscalización, corte de suministro).

Una noticia que no cumple estos criterios es un simple "dato" y no debe ingresar al sistema como "inteligencia".

### 6. Impacto por Perfil de Usuario

- **Prevencionista:** **Alto valor.** Recibiría alertas de fiscalización, análisis de accidentes públicos, y cambios normativos directamente contextualizados a sus matrices IPER.
- **Administrador de Obra / Jefe de Terreno:** **Alto valor.** Le interesan noticias de mercado (precios de materiales), logística (huelgas portuarias, cortes de ruta), y laborales (nuevos dictámenes, negociaciones sindicales).
- **Gerente / Director (Dashboard Ejecutivo):** **Valor estratégico.** Recibiría un resumen de alto nivel sobre tendencias del mercado, proyectos de ley importantes, y la salud financiera de grandes actores del sector.
- **Mandante / Cliente:** **Bajo valor directo.** Para este perfil, la herramienta es probablemente ruido y no debería mostrarse. El cliente necesita ver el avance de *su* obra, no noticias del sector.

### 7. Conclusión y Condiciones de Implementación

**Conclusión: Sí, la herramienta debe existir.** Aporta un valor diferenciador y refuerza el concepto de Inteligencia Operacional de PCG, siempre y cuando se implemente bajo condiciones conceptuales estrictas.

**Condiciones Obligatorias para su Existencia:**

1.  **NO es un "Feed de Noticias":** Debe ser conceptualizado como un **"Motor de Contexto y Acción"**. Su función no es mostrar titulares, sino entregar alertas procesadas y accionables.
2.  **Procesamiento y Clasificación Obligatoria:** Cada noticia que ingresa al sistema debe ser analizada por una capa de IA o un sistema de reglas para clasificarla por:
    - Especialidad (Seguridad, Legal, Mercado, Logística).
    - Relevancia Geográfica.
    - Entidades PCG impactadas (roles, tipo de obra, etc.).
3.  **Accionabilidad es Mandatoria:** Cada alerta mostrada al usuario debe estar acompañada de una o más **sugerencias de acción concretas** que se puedan ejecutar dentro de PCG (ej: "Crear Tarea", "Revisar IPER", "Notificar a Subcontratista").
4.  **Personalización y Filtro por Rol:** La visibilidad debe ser estrictamente controlada por el rol del usuario y las obras que tiene asignadas. Lo que es señal para un prevencionista es ruido para un gerente.
5.  **Debe ser un Módulo Desactivable:** Debe ser una funcionalidad que se pueda activar o desactivar a nivel de empresa para evitar sobrecargar a clientes que no deseen este nivel de análisis contextual.
