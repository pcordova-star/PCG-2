// src/lib/pdf/translations/accidentReportTexts.ts

export const accidentReportTexts = {
  es: {
    title: "Informe de Investigación de Accidente",
    headerId: "ID Investigación",
    footer: "Informe de Investigación de Accidente",
    page: "Página",
    fileName: "informe_accidente",
    
    // Portada
    fieldFechaAccidente: "Fecha del Accidente",
    fieldType: "Tipo de Suceso",
    fieldSeverity: "Gravedad",
    fieldGenerationDate: "Fecha de Generación",
    
    // Secciones
    section1: "1. Datos Generales del Accidente",
    section2: "2. Descripción Objetiva del Hecho",
    section3: "3. Análisis de Causas (Árbol de Causas)",
    section4: "4. Plan de Acción / Medidas Correctivas",

    // Campos Sección 1
    fieldLugar: "Lugar del Accidente",
    fieldLesion: "Lesión Producida",
    fieldParteCuerpo: "Parte del Cuerpo Afectada",
    fieldAgente: "Agente del Accidente",
    fieldMecanismo: "Mecanismo del Accidente",
    fieldTiempoPerdido: "¿Hubo Tiempo Perdido?",
    fieldDiasReposo: "Días de Reposo Médico",
    fieldGraveFatal: "¿Accidente Grave/Fatal?",
    
    // Valores y labels
    yes: "Sí",
    no: "No",
    noRegistrado: "No registrado",
    rootNodeDefault: "Accidente investigado",
    noTree: "No se ha definido un árbol de causas para esta investigación.",
    noImmediateCauses: "No se registraron causas inmediatas.",
    noBasicCauses: "No se registraron causas básicas.",
    planAccionSinMedidas: "No existen medidas correctivas registradas.",
    
    // Títulos de columnas de tablas
    tableDatosHeadCampo: "Campo",
    tableDatosHeadValor: "Valor",
    tableCausasHeadTipo: "Tipo",
    tableCausasHeadDescripcion: "Descripción",
    tableCausasHeadDetalle: "Detalle",
    tableCausasHeadNivel: "Nivel",
    tablePlanHeadAccion: "Acción",
    tablePlanHeadCausa: "Causa Asociada",
    tablePlanHeadResponsable: "Responsable",
    tablePlanHeadPlazo: "Fecha Límite",
    tablePlanHeadEstado: "Estado",

    // Niveles del árbol de causas
    levelHechoPrincipal: "Hecho Principal",
    levelCausaInmediata: "Causa Inmediata",
    levelCausaBasica: "Causa Básica",
  },
  pt: {
    title: "Relatório de Investigação de Acidente",
    headerId: "ID da Investigação",
    footer: "Relatório de Investigação de Acidente",
    page: "Página",
    fileName: "relatorio_acidente",
    
    // Portada
    fieldFechaAccidente: "Data do Acidente",
    fieldType: "Tipo de Evento",
    fieldSeverity: "Gravidade",
    fieldGenerationDate: "Data de Geração",

    // Secciones
    section1: "1. Dados Gerais do Acidente",
    section2: "2. Descrição Objetiva do Evento",
    section3: "3. Análise de Causas (Árvore de Causas)",
    section4: "4. Plano de Ação / Medidas Corretivas",
    
    // Campos Sección 1
    fieldLugar: "Local do Acidente",
    fieldLesion: "Lesão Produzida",
    fieldParteCuerpo: "Parte do Corpo Atingida",
    fieldAgente: "Agente do Acidente",
    fieldMecanismo: "Mecanismo do Acidente",
    fieldTiempoPerdido: "Houve Afastamento?",
    fieldDiasReposo: "Dias de Afastamento Médico",
    fieldGraveFatal: "Acidente Grave/Fatal?",

    // Valores y labels
    yes: "Sim",
    no: "Não",
    noRegistrado: "Não registrado",
    rootNodeDefault: "Acidente investigado",
    noTree: "Não foi definida uma árvore de causas para esta investigação.",
    noImmediateCauses: "Não foram registradas causas imediatas.",
    noBasicCauses: "Não foram registradas causas básicas.",
    planAccionSinMedidas: "Não existem medidas corretivas registradas.",
    
    // Títulos de columnas de tablas
    tableDatosHeadCampo: "Campo",
    tableDatosHeadValor: "Valor",
    tableCausasHeadTipo: "Tipo",
    tableCausasHeadDescripcion: "Descrição",
    tableCausasHeadDetalle: "Detalhe",
    tableCausasHeadNivel: "Nível",
    tablePlanHeadAccion: "Ação",
    tablePlanHeadCausa: "Causa Associada",
    tablePlanHeadResponsable: "Responsável",
    tablePlanHeadPlazo: "Prazo Final",
    tablePlanHeadEstado: "Estado",

    // Niveles del árbol de causas
    levelHechoPrincipal: "Fato Principal",
    levelCausaInmediata: "Causa Imediata",
    levelCausaBasica: "Causa Básica",
  }
};
