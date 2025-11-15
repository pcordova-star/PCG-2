// src/types/pcg.ts

import { Timestamp } from "firebase/firestore";
import { UserRole } from "@/lib/roles";

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
 * Este tipo se usa principalmente para mostrar datos, el 'role' se obtiene de 'AppUser'.
 */
export interface CompanyUser {
  id?: string;
  uid: string;
  email: string;
  nombre: string;
  role: UserRole;
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
  role: UserRole;
  empresaId: string | null;
  createdAt: Date | Timestamp;
}

/**
 * Representa una invitación para unirse a una empresa.
 * Almacenada en la colección `invitacionesUsuarios`.
 */
export interface UserInvitation {
    id?: string;
    email: string;
    empresaId: string;
    roleDeseado: UserRole;
    estado: "pendiente" | "aceptada" | "revocada";
    creadoPorUid: string;
    createdAt: Date | Timestamp;
}
