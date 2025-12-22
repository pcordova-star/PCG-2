import { User } from "firebase/auth";

// Definimos los posibles roles de usuario en el sistema.
export type UserRole = "superadmin" | "admin_empresa" | "jefe_obra" | "prevencionista" | "cliente" | "none";

// Correos electrónicos que SIEMPRE tendrán el rol de superadministrador,
// independientemente de su configuración en Firestore o Custom Claims.
// Esta es la máxima prioridad.
export const SUPERADMIN_EMAILS = ["pauloandrescordova@gmail.com"];

/**
 * Determina el rol de un usuario basándose en un orden de prioridad:
 * 1. Correo electrónico maestro (SUPERADMIN_EMAILS).
 * 2. Custom Claims en el token de autenticación.
 * 3. Campo 'role' en el documento del usuario en Firestore.
 *
 * @param user - El objeto de usuario de Firebase Auth.
 * @param userDoc - El documento del usuario desde la colección 'users' de Firestore.
 * @param tokenClaims - Los custom claims del token de ID del usuario.
 * @returns El rol del usuario como un string `UserRole`.
 */
export function resolveRole(user: User | null, userDoc?: any, tokenClaims?: { [key: string]: any }): UserRole {
  if (!user) {
    return "none";
  }

  const email = user.email?.toLowerCase().trim() || "";

  // 1. Prioridad máxima: correos maestros definidos en el código.
  if (SUPERADMIN_EMAILS.includes(email)) {
    return "superadmin";
  }

  // 2. Segunda prioridad: Custom Claims en el token de autenticación.
  // CORRECCIÓN: Usar la cadena 'superadmin' en minúsculas para consistencia.
  if (tokenClaims?.role === "superadmin") return "superadmin";

  // 3. Tercera prioridad: campo 'role' en el documento de Firestore.
  if (userDoc?.role === "superadmin") return "superadmin";
  if (userDoc?.role === "admin_empresa") return "admin_empresa";
  if (userDoc?.role === "jefe_obra") return "jefe_obra";
  if (userDoc?.role === "prevencionista") return "prevencionista";
  if (userDoc?.role === "cliente") return "cliente";
  
  // Si no se encuentra ningún rol, se devuelve 'none'.
  return "none";
}
