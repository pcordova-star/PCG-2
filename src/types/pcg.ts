// src/types/pcg.ts

import { Timestamp } from "firebase/firestore";

/**
 * Representa una empresa en la plataforma.
 * Almacenada en la colección `companies`.
 */
export interface Company {
  id: string;
  nombre: string;
  rut: string;
  plan: "basic" | "pro" | "enterprise";
  activa: boolean;
  createdAt: Date | Timestamp;
  updatedAt?: Date | Timestamp;
  ownerUid?: string;
}

/**
 * Representa un usuario dentro del contexto de una empresa específica.
 * Almacenado en la subcolección `companies/{companyId}/users`.
 */
export interface CompanyUser {
  id?: string; // El ID del documento puede ser el mismo que el UID de Auth
  uid: string;
  email: string;
  nombre: string;
  role: "EMPRESA_ADMIN" | "JEFE_OBRA" | "PREVENCIONISTA" | "LECTOR_CLIENTE";
  obrasAsignadas: string[]; // Array de IDs de obras
  activo: boolean;
}

/**
 * Representa un usuario a nivel global en la plataforma.
 * Almacenado en la colección `users`.
 */
export interface AppUser {
  id?: string; // El ID del documento es el UID de Firebase Auth
  nombre: string;
  email: string;
  phone?: string;
  isSuperAdmin: boolean;
  companyIdPrincipal?: string | null; // ID de la empresa principal a la que pertenece
  createdAt: Date | Timestamp;
}
