// src/context/AuthContext.tsx
"use client";

import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User,
  updatePassword,
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
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, limit, writeBatch, getDocs, onSnapshot } from "firebase/firestore";
import { UserRole } from "@/lib/roles";
import { AppUser, UserInvitation, Company } from "@/types/pcg";


async function activateUserFromInvitation(firebaseUser: User): Promise<{role: UserRole, companyId: string | null, subcontractorId: string | null}> {
  const db = firebaseDb;
  const email = firebaseUser.email?.toLowerCase().trim();

  if (!email) return { role: 'none', companyId: null, subcontractorId: null };

  const q = query(
    collection(db, "invitacionesUsuarios"),
    where("email", "==", email),
    where("estado", "in", ["pendiente", "pendiente_auth"]),
    limit(1)
  );

  const invitationSnap = await getDocs(q);

  if (invitationSnap.empty) {
    console.log(`No hay invitación pendiente para ${email}.`);
    return { role: 'none', companyId: null, subcontractorId: null };
  }

  const invitationDoc = invitationSnap.docs[0];
  const invitationData = invitationDoc.data() as UserInvitation;

  const userRef = doc(db, "users", firebaseUser.uid);
  const batch = writeBatch(db);

  // 1. Crear/actualizar el documento del usuario con mustChangePassword: true
  batch.set(userRef, {
    nombre: invitationData.nombre || firebaseUser.displayName || email,
    email: email,
    role: invitationData.roleDeseado,
    empresaId: invitationData.empresaId,
    subcontractorId: invitationData.subcontractorId || null,
    activo: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    mustChangePassword: true, 
  }, { merge: true });

  // 2. Actualizar la invitación a 'activado'
  batch.update(invitationDoc.ref, {
    estado: "activado",
    uid: firebaseUser.uid,
    activatedAt: serverTimestamp(),
  });

  await batch.commit();

  console.log(`Usuario ${email} activado con rol ${invitationData.roleDeseado} en empresa ${invitationData.empresaId}. Se requiere cambio de contraseña.`);
  return { role: invitationData.roleDeseado, companyId: invitationData.empresaId, subcontractorId: invitationData.subcontractorId || null };
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
  subcontractorId: string | null;
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
  const [subcontractorId, setSubcontractorId] = useState<string | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(firebaseAuth, (firebaseUser) => {
        if (!firebaseUser) {
            setUser(null);
            setRole("none");
            setCompanyId(null);
            setSubcontractorId(null);
            setCompany(null);
            setLoading(false);
            const publicPages = ['/', '/login/usuario', '/login/cliente', '/accept-invite', '/terminos', '/sin-acceso'];
            if (!publicPages.includes(pathname) && !pathname.startsWith('/public')) {
                router.replace('/');
            }
            return;
        }

        setUser(firebaseUser);
        const userDocRef = doc(firebaseDb, "users", firebaseUser.uid);

        const unsubUserDoc = onSnapshot(userDocRef, async (userDocSnap) => {
            setLoading(true);
            let userRole: UserRole = 'none';
            let userCompanyId: string | null = null;
            let userSubcontractorId: string | null = null;
            let mustChangePassword = false;

            await bootstrapSuperAdmin(firebaseUser);

            if (userDocSnap.exists()) {
                const userData = userDocSnap.data() as AppUser;
                userRole = userData.role || 'none';
                userCompanyId = userData.empresaId || null;
                userSubcontractorId = userData.subcontractorId || null;
                mustChangePassword = !!userData.mustChangePassword;
            } else {
                // The user doc doesn't exist, try to activate from an invitation.
                // The onSnapshot will re-trigger once the document is created by activateUserFromInvitation.
                await activateUserFromInvitation(firebaseUser);
                // We don't return here. We let the snapshot listener run its course,
                // it will soon be re-invoked with the newly created document.
            }
            
            setRole(userRole);
            setCompanyId(userCompanyId);
            setSubcontractorId(userSubcontractorId);
            setLoading(false);

            const isPublicPage = ['/', '/login/usuario', '/login/cliente', '/accept-invite'].includes(pathname) || pathname.startsWith('/public');
            const isChangingPassword = pathname === '/cambiar-password';

            if (mustChangePassword) {
                if (!isChangingPassword) {
                    router.replace('/cambiar-password');
                }
            } else {
                if (userRole === 'none') {
                    if (pathname !== '/sin-acceso') router.replace('/sin-acceso');
                } else if (isPublicPage || isChangingPassword) {
                    const targetPath = userRole === 'cliente' ? '/cliente' : (userRole === 'contratista' ? '/cumplimiento/contratista' : '/dashboard');
                    router.replace(targetPath);
                }
            }
        }, (error) => {
            console.error("Error escuchando el documento del usuario:", error);
            setLoading(false);
            setUser(null);
            setRole('none');
            setSubcontractorId(null);
        });

        return () => unsubUserDoc();
    });

    return () => unsubAuth();
  }, [pathname, router]);


  useEffect(() => {
    if (companyId) {
        const companyRef = doc(firebaseDb, "companies", companyId);
        const unsub = onSnapshot(companyRef, (docSnap) => {
            if (docSnap.exists()) {
                setCompany({ id: docSnap.id, ...docSnap.data() } as Company);
            } else {
                setCompany(null);
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
      setSubcontractorId(null);
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
    subcontractorId,
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
