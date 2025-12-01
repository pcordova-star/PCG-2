// src/lib/pdf/translations/charlaReportTexts.ts

export const charlaReportTexts = {
  es: {
    title: "Acta de Charla Operativa / Capacitación",
    fileName: "acta_charla",
    page: "Página",
    
    // Campos Generales
    fieldObra: "Obra",
    fieldMandante: "Mandante",
    fieldContratista: "Contratista",
    fieldTema: "Tema de la Charla",
    fieldFecha: "Fecha de Realización",
    
    // Secciones
    sectionIperTitle: "Origen de la Charla (IPER)",
    sectionContentTitle: "Resumen de Temas Abordados",
    sectionAttendeesTitle: "Lista de Asistentes",
    
    // Campos IPER
    fieldIperId: "ID IPER",
    fieldIperTarea: "Tarea",
    fieldIperPeligro: "Peligro",
    fieldIperRiesgo: "Riesgo",
    fieldIperRiesgoInherente: "Riesgo Inherente (H/M)",
    fieldIperRiesgoResidual: "Riesgo Residual",
    
    // Contenido
    contentFromIperIntro: "La charla se centra en los riesgos identificados en el IPER para la tarea",
    contentFromIperPeligro: "Peligro principal",
    contentFromIperRiesgo: "Riesgo evaluado",
    contentFromIperControl: "Medida de control clave",

    // Asistentes
    tableAttendeesHeadName: "Nombre",
    tableAttendeesHeadId: "RUT/ID",
    tableAttendeesHeadPosition: "Cargo",
    tableAttendeesHeadDate: "Fecha Firma",
    tableAttendeesHeadSignature: "Firma",
    noAsistentes: "No existen asistentes registrados en esta charla.",
    noFirma: "Sin firma",
    errorFirma: "Error al cargar firma",
    
    // Genéricos
    noEspecificado: "No especificado",
    noDefinida: "No definida",
  },
  pt: {
    title: "Ata de Palestra Operacional / Capacitação",
    fileName: "ata_palestra",
    page: "Página",

    // Campos Generales
    fieldObra: "Obra",
    fieldMandante: "Contratante",
    fieldContratista: "Contratada",
    fieldTema: "Tema da Palestra",
    fieldFecha: "Data de Realização",
    
    // Secciones
    sectionIperTitle: "Origem da Palestra (IPER)",
    sectionContentTitle: "Resumo dos Tópicos Abordados",
    sectionAttendeesTitle: "Lista de Presença",

    // Campos IPER
    fieldIperId: "ID IPER",
    fieldIperTarea: "Tarefa",
    fieldIperPeligro: "Perigo",
    fieldIperRiesgo: "Risco",
    fieldIperRiesgoInherente: "Risco Inerente (H/M)",
    fieldIperRiesgoResidual: "Risco Residual",
    
    // Contenido
    contentFromIperIntro: "A palestra foca nos riscos identificados no IPER para a tarefa",
    contentFromIperPeligro: "Perigo principal",
    contentFromIperRiesgo: "Risco avaliado",
    contentFromIperControl: "Medida de controle chave",

    // Asistentes
    tableAttendeesHeadName: "Nome",
    tableAttendeesHeadId: "CPF/ID",
    tableAttendeesHeadPosition: "Cargo",
    tableAttendeesHeadDate: "Data Assinatura",
    tableAttendeesHeadSignature: "Assinatura",
    noAsistentes: "Não há participantes registrados nesta palestra.",
    noFirma: "Sem assinatura",
    errorFirma: "Erro ao carregar assinatura",
    
    // Genéricos
    noEspecificado: "Não especificado",
    noDefinida: "Não definida",
  }
};
