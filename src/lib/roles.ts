import { User } from "firebase/auth";

// Definimos los posibles roles de usuario en el sistema.
export type UserRole = "superadmin" | "admin" | "jefeObra" | "cliente" | "none";

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
export function resolveRole(user: User | null, userDoc?: any, tokenClaims?: any): UserRole {
  if (!user) {
    return "none";
  }

  const email = user.email?.toLowerCase().trim() || "";

  // 1. Prioridad máxima: correos maestros definidos en el código.
  if (SUPERADMIN_EMAILS.includes(email)) {
    return "superadmin";
  }

  // 2. Segunda prioridad: Custom Claims en el token de autenticación.
  // Usamos 'SUPER_ADMIN' y 'EMPRESA_ADMIN' para mantener compatibilidad con el backend (Cloud Functions, Firestore Rules).
  if (tokenClaims?.role === "SUPER_ADMIN") return "superadmin";
  if (tokenClaims?.role === "EMPRESA_ADMIN") return "admin";
  if (tokenClaims?.role === "JEFE_OBRA") return "jefeObra";
  if (tokenClaims?.role === "LECTOR_CLIENTE") return "cliente";

  // 3. Tercera prioridad: campo 'role' en el documento de Firestore.
  // Esto puede ser útil para roles que no se manejan con claims o para overrides.
  if (userDoc?.role === "superadmin" || userDoc?.isSuperAdmin === true) return "superadmin";
  if (userDoc?.role === "admin") return "admin";
  if (userDoc?.role === "jefeObra") return "jefeObra";
  if (userDoc?.role === "cliente") return "cliente";
  
  // Si no se encuentra ningún rol, se devuelve 'none'.
  return "none";
}
