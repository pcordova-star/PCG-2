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
