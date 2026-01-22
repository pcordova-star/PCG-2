// src/context/AuthContext.tsx
"use client";

import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User,
} from "firebase/auth";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { firebaseAuth, firebaseDb } from "@/lib/firebaseClient";
import { useRouter, usePathname } from "next/navigation";
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, limit, writeBatch, getDocs } from "firebase/firestore";
import { UserRole } from "@/lib/roles";
import { AppUser, UserInvitation, Company } from "@/types/pcg";


async function activateUserFromInvitation(firebaseUser: User): Promise<{role: UserRole, companyId: string | null}> {
  const db = firebaseDb;
  const email = firebaseUser.email?.toLowerCase().trim();

  if (!email) return { role: 'none', companyId: null };

  const q = query(
    collection(db, "invitacionesUsuarios"),
    where("email", "==", email),
    where("estado", "==", "pendiente_auth"),
    limit(1)
  );

  const invitationSnap = await getDocs(q);

  if (invitationSnap.empty) {
    console.log(`No hay invitación pendiente para ${email}.`);
    return { role: 'none', companyId: null };
  }

  const invitationDoc = invitationSnap.docs[0];
  const invitationData = invitationDoc.data() as UserInvitation;

  const userRef = doc(db, "users", firebaseUser.uid);
  const batch = writeBatch(db);

  // 1. Crear/actualizar el documento del usuario
  batch.set(userRef, {
    nombre: invitationData.nombre || firebaseUser.displayName,
    email: email,
    role: invitationData.roleDeseado,
    empresaId: invitationData.empresaId,
    activo: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });

  // 2. Actualizar la invitación
  batch.update(invitationDoc.ref, {
    estado: "activado",
    uid: firebaseUser.uid,
    activatedAt: serverTimestamp(),
  });

  await batch.commit();

  console.log(`Usuario ${email} activado con rol ${invitationData.roleDeseado} en empresa ${invitationData.empresaId}.`);
  return { role: invitationData.roleDeseado, companyId: invitationData.empresaId };
}

/**
 * Lógica de Bootstrap solo para desarrollo.
 * Crea el documento del superadmin si no existe.
 */
async function bootstrapSuperAdmin(firebaseUser: User): Promise<void> {
    if (process.env.NODE_ENV !== 'development' || firebaseUser.email !== 'pauloandrescordova@gmail.com') {
        return;
    }

    const userDocRef = doc(firebaseDb, "users", firebaseUser.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
        console.warn(`[Bootstrap] Creando documento para superadmin: ${firebaseUser.email}`);
        await setDoc(userDocRef, {
            nombre: "Super Admin",
            email: firebaseUser.email,
            role: "superadmin",
            empresaId: null, // Superadmin no pertenece a una empresa
            activo: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
    }
}


type AuthContextValue = {
  user: User | null;
  role: UserRole;
  companyId: string | null;
  company: Company | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>("none");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsub = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      if (firebaseUser) {
        
        await bootstrapSuperAdmin(firebaseUser);

        const userDocRef = doc(firebaseDb, "users", firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        let userRole: UserRole = 'none';
        let userCompanyId: string | null = null;
        let mustChangePassword = false;
        
        if (userDocSnap.exists()) {
            const userData = userDocSnap.data() as AppUser;
            if (userData.role && userData.empresaId !== undefined) {
                userRole = userData.role;
                userCompanyId = userData.empresaId;
                mustChangePassword = userData.mustChangePassword === true;
            }
        }
        
        // La activación desde invitación se mantiene como fallback
        if (userRole === 'none') {
            const activationResult = await activateUserFromInvitation(firebaseUser);
            userRole = activationResult.role;
            userCompanyId = activationResult.companyId;
            mustChangePassword = true; // Forzar cambio de contraseña al activar
        }

        setRole(userRole);
        setCompanyId(userCompanyId);
        setUser(firebaseUser);
        
        // --- Lógica de redirección centralizada ---
        const isChangingPassword = pathname === '/cambiar-password';
        
        if (mustChangePassword && !isChangingPassword) {
            router.replace('/cambiar-password');
        } else if (!mustChangePassword) {
            if (userRole === 'none') {
                router.replace('/sin-acceso');
            } else if (pathname.startsWith('/login') || pathname === '/' || isChangingPassword) {
               const targetPath = userRole === 'cliente' ? '/cliente' : userRole === 'contratista' ? '/cumplimiento/contratista' : '/dashboard';
               router.replace(targetPath);
            }
        }
        
      } else {
        setUser(null);
        setRole("none");
        setCompanyId(null);
        setCompany(null);
      }
      setLoading(false);
    });

    return () => unsub();
  }, [router, pathname]);

  useEffect(() => {
    if (companyId) {
        const companyRef = doc(firebaseDb, "companies", companyId);
        const unsub = onAuthStateChanged(firebaseAuth, user => {
            if(user) {
                getDoc(companyRef).then(docSnap => {
                    if (docSnap.exists()) {
                        setCompany({ id: docSnap.id, ...docSnap.data() } as Company);
                    } else {
                        setCompany(null);
                    }
                });
            }
        });
        return () => unsub();
    } else {
        setCompany(null);
    }
}, [companyId]);

  async function login(email: string, password: string) {
    try {
        await signInWithEmailAndPassword(firebaseAuth, email, password);
    } catch (err: any) {
        if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
            throw new Error("Credenciales inválidas. Por favor, revisa tu correo y contraseña.");
        } else if (err.code === 'auth/too-many-requests') {
            throw new Error("Demasiados intentos fallidos. Por seguridad, el acceso desde este dispositivo ha sido bloqueado temporalmente.");
        } else {
            console.error("Error de login no manejado:", err);
            throw new Error("Ocurrió un error inesperado al iniciar sesión.");
        }
    }
  }

  async function logout() {
    try {
      await signOut(firebaseAuth);
      setUser(null);
      setRole("none");
      setCompanyId(null);
      setCompany(null);
      router.push('/');
    } catch (error) {
      console.error("Error al cerrar sesión", error);
    }
  }

  const value: AuthContextValue = {
    user,
    role,
    companyId,
    company,
    loading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
