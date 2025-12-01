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
  createdAt: Date | Timestamp;
  updatedAt?: Date | Timestamp;
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
  role: RolInvitado | 'superadmin' | 'none';
  empresaId: string | null;
  createdAt: Date | Timestamp;
  activo?: boolean;
  eliminado?: boolean;
  eliminadoAt?: Date | Timestamp;
}


export type RolInvitado = "admin_empresa" | "jefe_obra" | "prevencionista" | "cliente";
/**
 * Representa una invitación para unirse a una empresa.
 * Almacenada en la colección `invitacionesUsuarios`.
 */
export interface UserInvitation {
    id?: string;
    email: string;
    empresaId: string;
    empresaNombre: string;
    roleDeseado: RolInvitado;
    estado: "pendiente" | "aceptada" | "revocada";
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
}

export interface IPERRegistro {
  id: string;
  correlativo?: number;
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
};

export type CharlaEstado = "borrador" | "realizada" | "programada" | "cancelada";

export interface FirmaAsistente {
  trabajadorId?: string;
  nombre: string;
  rut?: string;
  cargo?: string;
  firmaUrl?: string;
  firmadoEn?: string; // ISO
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
  planAccionId?: string;
  investigacionId?: string; // Nuevo campo
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
