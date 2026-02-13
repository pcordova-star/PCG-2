// src/types/pcg.ts

import { Timestamp } from "firebase/firestore";

/**
 * Representa una empresa en la plataforma.
 * Almacenada en la colección `companies`.
 */
export interface Company {
  id: string;
  nombreFantasia: string;
  razonSocial: string;
  rut: string;
  giro?: string;
  direccion?: string;
  comuna?: string;
  ciudad?: string;
  telefonoContacto?: string;
  emailContacto?: string;
  baseMensual: number;
  valorPorUsuario: number;
  activa: boolean;
  feature_compliance_module_enabled?: boolean;
  feature_plan_analysis_enabled?: boolean;
  feature_plan_comparison_enabled?: boolean;
  feature_risk_prevention_enabled?: boolean;
  feature_operational_checklists_enabled?: boolean;
  feature_document_control_enabled?: boolean;
  feature_access_control_enabled?: boolean;
  feature_director_dashboard_enabled?: boolean;
  [key: string]: any; // Para permitir acceso dinámico a feature flags
}


/**
 * Representa un usuario dentro del contexto de una empresa específica.
 * Este tipo se usa principalmente para mostrar datos, el 'role' se obtiene de 'AppUser'.
 */
export interface CompanyUser {
  id?: string;
  uid: string;
  email: string;
  nombre: string;
  role: RolInvitado;
  obrasAsignadas: string[];
  activo: boolean;
}

/**
 * Representa un usuario a nivel global en la plataforma.
 * Almacenado en la colección `users`. Esta es la fuente de verdad para los roles.
 */
export interface AppUser {
  id?: string; // El ID del documento es el UID de Firebase Auth
  nombre: string;
  email: string;
  phone?: string;
  role: RolInvitado | 'superadmin' | 'none' | 'contratista'; // Se añade el nuevo rol
  empresaId: string | null;
  subcontractorId?: string; // ID de la empresa subcontratista a la que pertenece
  createdAt: Date | Timestamp;
  activo?: boolean;
  eliminado?: boolean;
  eliminadoAt?: Date | Timestamp;
  mustChangePassword?: boolean;
}


export type RolInvitado = "admin_empresa" | "jefe_obra" | "prevencionista" | "cliente" | "contratista" | "revisor_cumplimiento"; // Se añade el nuevo rol
/**
 * Representa una invitación para unirse a una empresa.
 * Almacenada en la colección `invitacionesUsuarios`.
 */
export interface UserInvitation {
    id?: string;
    email: string;
    nombre?: string;
    empresaId: string;
    empresaNombre: string;
    roleDeseado: RolInvitado;
    subcontractorId?: string;
    subcontractorNombre?: string;
    estado: "pendiente" | "aceptada" | "revocada" | "pendiente_auth" | "activado";
    creadoPorUid: string;
    createdAt: Date | Timestamp;
}

export interface Obra {
  id: string;
  nombreFaena: string;
  direccion?: string;
  clienteEmail?: string;
  mandanteRazonSocial?: string;
  mandanteRut?: string;
  jefeObraNombre?: string;
  prevencionistaNombre?: string;
  mutualidad?: string;
  empresaId: string;
  empresa?: {
    nombre: string;
  };
  fechaInicio?: string;
  fechaTermino?: string;
  dotacionProyectada?: number;
  adminContratoNombre?: string;
  avanceAcumulado?: number;
  ultimaActualizacion?: Timestamp | Date;
  creadoEn: Timestamp | Date;
  estado?: 'Activa' | 'Terminada' | 'Pausada' | 'Inactiva';
  // Campo añadido para el contexto de la IA
  tipoObra?: string;
}

export interface ActividadProgramada {
  id: string;
  obraId: string;
  nombreActividad: string;
  fechaInicio: string;
  fechaFin: string;
  precioContrato: number; 
  unidad: string;
  cantidad: number;
  avanceProgramado?: number;
};

export interface AvanceDiario {
  id: string;
  obraId: string;
  actividadId: string;
  fecha: { toDate: () => Date }; // Aseguramos que es un Timestamp de Firestore
  cantidadEjecutada?: number;
  porcentajeAvance?: number;
  comentario: string;
  fotos?: string[];
  visibleCliente: boolean;
  creadoPor: {
    uid: string;
    displayName: string;
  };
  tipoRegistro?: 'CANTIDAD' | 'FOTOGRAFICO';
};

export interface Presupuesto {
    id: string;
    nombre: string;
    fechaCreacion: Timestamp;
    items: any[];
};

export interface IPERRegistro {
  id: string;
  correlativo: number;
  obraId: string;
  obraNombre?: string;
  // Identificación
  tarea: string;
  zona: string;
  peligro: string;
  riesgo: string;
  categoriaPeligro: string;
  // Evaluación Inherente (con género)
  probabilidad_hombre: number;
  consecuencia_hombre: number;
  nivel_riesgo_hombre: number;
  probabilidad_mujer: number;
  consecuencia_mujer: number;
  nivel_riesgo_mujer: number;
  // Controles
  jerarquiaControl: string; 
  control_especifico_genero: string;
  responsable: string; plazo: string; 
  // Seguimiento
  estadoControl: string; 
  // Riesgo Residual
  probabilidad_residual: number; 
  consecuencia_residual: number; 
  nivel_riesgo_residual: number; 
  // Meta
  usa_componente_genero?: boolean;
  medidasControlExistentes: string;
  medidasControlPropuestas: string;
  responsableImplementacion: string;
  plazoImplementacion: string;
  fecha?: string;
  createdAt?: any;
  // Campos para compatibilidad con plantillas (pueden ser opcionales)
  peligroOtro?: string;
  riesgoOtro?: string;
  controlEspecificoGeneroOtro?: string;
  probabilidadHombre?: number;
  consecuenciaHombre?: number;
  probabilidadMujer?: number;
  consecuenciaMujer?: number;
  probabilidadResidual?: number;
  consecuenciaResidual?: number;
  // Campos de firma del prevencionista
  firmaPrevencionistaUrl?: string;
  firmaPrevencionistaNombre?: string;
  firmaPrevencionistaRut?: string;
  firmaPrevencionistaCargo?: string;
  firmaPrevencionistaFecha?: string; // ISO String
  firmaPrevencionistaUserId?: string;
};

export type CharlaEstado = "borrador" | "realizada" | "programada" | "cancelada";

export interface FirmaAsistente {
  trabajadorId?: string;
  nombre: string;
  rut: string;
  cargo?: string;
  firmaUrl?: string;
  firmadoEn?: string; // ISO
  firmadoPorUsuarioId?: string; // UID del prevencionista/admin que guarda
}

export type Charla = {
    id: string;
    obraId: string;
    obraNombre: string;
    iperId: string;
    iperIdRelacionado?: string; // Nuevo campo opcional
    titulo: string;
    tipo: "charla_iper" | "charla_induccion";
    fechaCreacion: Timestamp;
    creadaPorUid: string;
    generadaAutomaticamente: boolean;
    tarea: string;
    zonaSector?: string;
    peligro: string;
    riesgo: string;
    probHombres: number;
    consHombres: number;
    nivelHombres: number;
    probMujeres: number;
    consMujeres: number;
    nivelMujeres: number;
    controlGenero: string;
    estado: CharlaEstado;
    contenido: string;
    fechaRealizacion?: Timestamp;
    duracionMinutos?: number;
    participantesTexto?: string;
    asistentes?: FirmaAsistente[]; // Nuevo campo opcional
    observaciones?: string;
};

export type Criticidad = 'baja' | 'media' | 'alta';

export interface Hallazgo {
  id?: string;
  obraId: string;
  companyId: string;
  sector?: string;
  createdAt: Timestamp;
  createdBy: string;
  tipoRiesgo: string;
  descripcion: string;
  tipoHallazgoDetalle?: string;
  descripcionLibre?: string;
  accionesInmediatas: string[];
  responsableId: string;
  responsableNombre?: string;
  plazo: string;
  evidenciaUrl: string;
  criticidad: Criticidad;
  estado: 'abierto' | 'en_progreso' | 'cerrado';
  iperActividadId?: string;
  iperRiesgoId?: string;
  planDeAccion?: MedidaCorrectivaDetallada[];
  investigacionId?: string; 
  fichaFirmadaUrl?: string;
  fechaFichaFirmada?: Timestamp;
}

export interface MiembroEquipo {
    id: string;
    nombre: string;
    cargo: 'Supervisor' | 'Administrador de obra' | 'Prevencionista' | 'Capataz' | 'Comité Paritario';
}

export type EquipoResponsable = MiembroEquipo[];

export type OrigenAccion =
  | "IPER"
  | "INCIDENTE"
  | "OBSERVACION"
  | "hallazgo"
  | "OTRO";

export type EstadoAccion = "Pendiente" | "En progreso" | "Cerrada";

export type RegistroPlanAccion = {
  id: string;
  obraId: string;
  obraNombre?: string;
  origen: OrigenAccion;
  referencia: string; 
  descripcionAccion: string;
  responsable: string;
  plazo: string;
  estado: EstadoAccion;
  avance: string;
  observacionesCierre: string;
  fechaCreacion: string;
  creadoPor: string;
  createdAt?: any;
  hallazgoId?: string;
};

export type TipoIncidente =
  | "Accidente con tiempo perdido"
  | "Accidente sin tiempo perdido"
  | "Casi accidente"
  | "Daño a la propiedad";

export type GravedadIncidente = "Leve" | "Grave" | "Fatal potencial";

export type MetodoAnalisisIncidente = 'ishikawa_5p' | 'arbol_causas';

export interface NodoArbolCausas {
  id: string;
  parentId: string | null;
  tipo: 'hecho' | 'accion' | 'condicion';
  descripcionCorta: string;
  detalle?: string;
  esCausaInmediata?: boolean;
  esCausaBasica?: boolean;
}

export interface ArbolCausas {
  habilitado: boolean;
  raizId: string | null;
  nodos: Record<string, NodoArbolCausas>;
}

export interface MedidaCorrectivaDetallada {
  id: string;
  causaNodoId?: string | null; // id del NodoArbolCausas al que se asocia la medida (si aplica)
  descripcionAccion: string;
  responsable: string;
  fechaCompromiso: string; // ISO string
  estado: 'pendiente' | 'en_proceso' | 'cerrado';
  observaciones?: string;
}

export type RegistroIncidente = {
  id: string;
  obraId: string;
  obraNombre?: string;
  fecha: string; 
  lugar: string;
  tipoIncidente: TipoIncidente;
  gravedad: GravedadIncidente;
  descripcionHecho: string;
  actoInseguro: string;
  condicionInsegura: string;
  causasInmediatas: string;
  causasBasicas: string;
  analisisIshikawa: string;
  analisis5Porques: string;
  medidasCorrectivas: string;
  responsableSeguimiento: string;
  plazoCierre: string;
  estadoCierre: "Abierto" | "En seguimiento" | "Cerrado";
  createdAt?: any;
  origen?: string;
  hallazgoId?: string;
  // Campos del Árbol de Causas
  metodoAnalisis?: MetodoAnalisisIncidente;
  arbolCausas?: ArbolCausas;
  // Campos para el Plan de Acción
  medidasCorrectivasDetalladas?: MedidaCorrectivaDetallada[];
  // Campos Normativos para Accidentes
  lesionDescripcion?: string;
  parteCuerpoAfectada?: string;
  agenteAccidente?: string;
  mecanismoAccidente?: string;
  diasReposoMedico?: number | null;
  huboTiempoPerdido?: boolean | null;
  esAccidenteGraveFatal?: boolean | null;
};

// --- CHECKLISTS ---

// Tipos comunes para ítems de checklist
export type ChecklistItemType = "boolean" | "text" | "number" | "select";

export interface ChecklistItem {
    id: string;
    order: number;
    type: ChecklistItemType;
    label: string;
    required: boolean;
    options?: string[];
    allowComment?: boolean;
    allowPhoto?: boolean;
}

export interface ChecklistSection {
    id: string;
    title: string;
    order: number;
    items: ChecklistItem[];
}

// Plantillas de Checklists (obsoleta, usar OperationalChecklistTemplate)
export interface ChecklistTemplate {
    id: string;
    titulo: string;
    descripcion: string;
    categoria: "general" | "operaciones" | "prevencion";
    secciones: {
        id: string;
        titulo: string;
        items: {
            id: string;
            texto: string;
            tipo: "ok_nok_na" | "texto" | "numero" | "fecha";
        }[];
    }[];
    createdAt: Timestamp;
    createdBy: string;
}

// Plantillas de Checklists OPERACIONALES y DE SEGURIDAD (nueva estructura)
export interface OperationalChecklistTemplate {
    id?: string;
    companyId: string;
    titulo: string;
    descripcion: string;
    categoria: "general" | "operaciones" | "prevencion";
    status: 'draft' | 'active' | 'inactive';
    secciones: ChecklistSection[];
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
    createdBy?: string;
}

// Respuestas de Checklists OPERACIONALES
export interface OperationalChecklistRecord {
    id: string;
    companyId: string;
    obraId?: string;
    templateId: string;
    templateTitleSnapshot: string;
    filledByUid: string;
    filledByEmail: string;
    filledAt: Timestamp;
    header: {
        fecha: string;
        hora: string;
        sector: string;
        elemento: string;
        actividad: string;
        responsable: string;
        observaciones: string;
        evidenceUrls?: string[];
    };
    answers: Record<string, any>;
    signature?: {
        type: "typed" | "none";
        name: string;
        dataUrl?: string | null;
    };
    pdf?: {
        generated: boolean;
        url?: string;
        generatedAt?: Timestamp;
    };
    status: "submitted" | "reviewed";
}


// --- CUMPLIMIENTO ---

export interface Subcontratista {
    id: string;
    razonSocial: string;
    rut: string;
    representanteLegal: string;
    contactoPrincipal: {
        nombre: string;
        email: string;
        telefono: string;
    };
    userIds: string[]; // UIDs de los usuarios de este subcontratista
}

export interface ProgramaCumplimiento {
    id: string; // 'config'
    companyId: string;
    periodicidad: 'mensual';
    diaCorteCarga: number | null;
    diaLimiteRevision: number | null;
    diaPago: number | null;
}

export interface RequisitoDocumento {
    id: string;
    nombre: string;
    descripcion?: string;
    esObligatorio: boolean;
    activo: boolean;
}

export interface EntregaDocumento {
    id: string;
    periodo: string; // "YYYY-MM"
    requirementId: string;
    nombreDocumentoSnapshot: string;
    subcontratistaId: string;
    fileUrl: string;
    storagePath: string;
    fechaCarga: Timestamp;
    cargadoPorUid: string;
    estado: 'Cargado' | 'Aprobado' | 'Observado';
    comentario?: string;
    revision?: {
        id: string;
        fecha: Timestamp;
        revisadoPorUid: string;
        decision: 'Aprobado' | 'Observado';
        comentario?: string;
    };
}

export interface RevisionDocumento {
    id: string;
    fechaRevision: Timestamp;
    revisadoPorUid: string;
    decision: 'aprobado' | 'observado';
    comentario?: string;
}

export interface EstadoCumplimientoPeriodo {
    id: string; // "subcontratistaId_YYYY-MM"
    subcontratistaId: string;
    periodo: string; // "YYYY-MM"
    estado: 'Cumple' | 'No Cumple' | 'En Revisión' | 'Pendiente';
    fechaAsignacion: Timestamp;
    asignadoPorUid: string;
}

export interface CompliancePeriod {
  id: string;
  companyId: string;
  nombre: string;
  estado: 'Abierto para Carga' | 'En Revisión' | 'Cerrado';
  corteCarga: string; // ISO String
  limiteRevision: string; // ISO String
  fechaPago: string; // ISO String
  createdAt: Timestamp;
  updatedAt: Timestamp;
}


// RDI Types
export interface Rdi {
  id: string;
  companyId: string;
  obraId: string;
  correlativo: string;
  titulo: string;
  descripcion: string;
  tipo: "a_mandante" | "a_contratista" | "interna";
  especialidad: "arquitectura" | "estructuras" | "electrica" | "sanitaria" | "climatizacion" | "otra";
  prioridad: RdiPrioridad;
  estado: RdiEstado;
  solicitante: {
    userId: string;
    nombre: string;
    email: string;
    cargo?: string;
  };
  destinatario: {
    nombre: string;
    email: string;
    empresa?: string;
    cargo?: string;
  };
  planoId?: string | null;
  afectaPlazo: boolean;
  diasAumentoSolicitados?: number | null;
  diasAumentoAprobados?: number | null;
  fechaLimiteRespuesta?: Timestamp | null;
  plazoRespuestaDias?: number | null;
  paraCliente: boolean;
  respuestaTexto?: string | null;
  clienteRespondio: boolean;
  fechaRespuestaCliente?: Timestamp | null;
  adjuntos: RdiAdjunto[];
  tieneAdjuntos: boolean;
  emailClienteNotificado: boolean;
  fechaNotificacionEmail?: Timestamp | null;
  closedAt?: Timestamp | null;
  deleted: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  // Campos para Adicionales
  tieneAdicional?: boolean;
  adicionalId?: string;
  adicionalEstado?: 'borrador' | 'enviado' | 'aprobado' | 'rechazado';
  adicionalMontoTotal?: number;
}


export type RdiAdjuntoTipo = "imagen" | "pdf" | "otro";

export interface RdiAdjunto {
    id: string;
    nombreArchivo: string;
    tipo: RdiAdjuntoTipo;
    storagePath: string;
    downloadUrl: string;
    subidoPorUserId: string;
    fechaSubida: Timestamp;
}

// --- TIPOS PARA PREVENCIÓN / EMPRESAS CONTRATISTAS ---

export type TipoEmpresaPrevencion =
  | "MANDANTE"
  | "CONTRATISTA_PRINCIPAL"
  | "SUBCONTRATISTA"
  | "SERVICIOS";

export type EstadoEvaluacionEmpresa =
  | "POR_EVALUAR"
  | "APROBADA"
  | "APROBADA_CON_OBSERVACIONES"
  | "RECHAZADA";

export interface EmpresaContratista {
  id: string;
  obraId: string;
  razonSocial: string;
  rut: string;
  tipoEmpresa: TipoEmpresaPrevencion;
  representanteLegal: string;
  contactoNombre: string;
  contactoTelefono: string;
  contactoEmail: string;

  contratoMarco: boolean;
  certificadoMutual: boolean;
  certificadoCotizaciones: boolean;
  padronTrabajadores: boolean;
  reglamentoInterno: boolean;

  matrizRiesgos: boolean;
  procedimientosTrabajoSeguro: boolean;
  programaTrabajo: boolean;
  planEmergenciaPropio: boolean;
  registroCapacitacionInterna: boolean;

  actaReunionInicial: boolean;
  frecuenciaReuniones: string;
  compromisosEspecificos: string;

  estadoEvaluacion: EstadoEvaluacionEmpresa;
  observacionesGenerales: string;

  fechaEvaluacion: string;
  evaluador: string;
  fechaCreacion: Timestamp;
}

export interface AccesoRegistro {
  id: string;
  obraId: string;
  companyId: string;
  nombre: string;
  rut: string;
  empresa: string;
  motivo: string;
  archivoUrl: string;
  createdAt: { toDate: () => Date };
  induccionContextualId?: string;
}

// --- TIPOS PARA INDUCCIÓN CONTEXTUAL ---

export interface InduccionContextualRegistro {
  id: string;
  obraId: string;
  obraNombre: string;
  persona: {
    nombre: string;
    rut: string;
    empresa: string;
    tipo: 'trabajador' | 'subcontratista' | 'visita';
  };
  contexto: {
    descripcionTarea: string;
    duracionIngreso: 'visita breve' | 'jornada parcial' | 'jornada completa';
  };
  inductionText: string;
  audioPath: string;
  audioUrl?: string; // Se usará en el cliente para reproducir
  audioFormat: 'mp3';
  fechaGeneracion?: Timestamp;
  fechaPresentacion: Timestamp;
  fechaConfirmacion: Timestamp | null;
  jobId: string;
  iaModel: string;
  createdAt?: Timestamp;
}

// --- TIPO PARA SOPORTE ---
export interface SupportTicket {
  id?: string;
  userId: string;
  userEmail: string;
  userName: string;
  companyId: string | null;
  companyName?: string;
  category: "duda_funcional" | "reporte_error" | "sugerencia" | "problema_cuenta" | "otro";
  subject: string;
  description: string;
  status: 'abierto' | 'en_progreso' | 'cerrado';
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
