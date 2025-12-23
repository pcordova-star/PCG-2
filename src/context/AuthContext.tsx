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
import { firebaseAuth, firebaseDb } from "@/lib/firebaseClient"; // Se importa firebaseAuth directamente
import { useRouter, usePathname } from "next/navigation";
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs, writeBatch } from "firebase/firestore";
import { resolveRole, UserRole } from "@/lib/roles";
import { AppUser, UserInvitation } from "@/types/pcg";


type AuthContextValue = {
  user: User | null;
  role: UserRole;
  companyId: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function ensureUserDocForAuthUser(user: User): Promise<AppUser | null> {
    const userDocRef = doc(firebaseDb, "users", user.uid);
    let userDocSnap = await getDoc(userDocRef);
    
    // Si ya existe un perfil con empresaId, no hacemos nada más.
    if (userDocSnap.exists() && userDocSnap.data().empresaId) {
        return { id: userDocSnap.id, ...userDocSnap.data() } as AppUser;
    }

    const emailLower = user.email!.toLowerCase().trim();

    // Buscamos si hay una invitación aceptada (no pendiente) para este correo.
    const invitationsRef = collection(firebaseDb, "invitacionesUsuarios");
    const q = query(
        invitationsRef,
        where("email", "==", emailLower),
        where("estado", "==", "aceptada") // Importante: solo las aceptadas
    );
    const invitationSnapshot = await getDocs(q);

    if (!invitationSnapshot.empty) {
        const firstInvitation = invitationSnapshot.docs[0];
        const invitationData = firstInvitation.data() as UserInvitation;
        
        const newUserProfile: Omit<AppUser, 'id'> = {
            email: emailLower,
            nombre: user.displayName || user.email!.split('@')[0],
            empresaId: invitationData.empresaId,
            role: invitationData.roleDeseado,
            createdAt: serverTimestamp(),
            activo: true,
        };

        const batch = writeBatch(firebaseDb);
        batch.set(userDocRef, newUserProfile, { merge: true });
        
        await batch.commit();

        userDocSnap = await getDoc(userDocRef);
        return { id: user.uid, ...userDocSnap.data() } as AppUser;
    }

    if (!userDocSnap.exists()) {
        const newUserProfile: Omit<AppUser, 'id'> = {
            email: emailLower,
            nombre: user.displayName || user.email!.split('@')[0],
            empresaId: null,
            role: "none",
            createdAt: serverTimestamp(),
            activo: true,
        };
        await setDoc(userDocRef, newUserProfile);
        userDocSnap = await getDoc(userDocRef);
        return { id: user.uid, ...userDocSnap.data() } as AppUser;
    }
    
    return { id: userDocSnap.id, ...userDocSnap.data() } as AppUser;
}



export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>("none");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsub = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
            // Forzar refresco del token para obtener los claims más recientes.
            const idTokenResult = await firebaseUser.getIdTokenResult(true);
            const claims = idTokenResult.claims;

            // Determinar rol EXCLUSIVAMENTE desde los claims.
            const userRole = (claims.role as UserRole) || 'none';
            setRole(userRole);
            
            // Asignar companyId desde los claims si existe.
            setCompanyId((claims.companyId as string) || null);
            
            // Lógica de redirección para cambio de contraseña
            if (claims.mustChangePassword === true) {
              if (pathname !== '/cambiar-password') {
                router.replace('/cambiar-password');
              }
            }
            
        } catch (error) {
            console.error("Error al procesar el token de autenticación:", error);
            setRole("none");
            setCompanyId(null);
            // Si falla, es más seguro desloguear al usuario para evitar inconsistencias.
            await signOut(firebaseAuth);
        }
      } else {
        setUser(null);
        setRole("none");
        setCompanyId(null);
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  async function login(email: string, password: string) {
    await signInWithEmailAndPassword(firebaseAuth, email, password);
    // onAuthStateChanged se encargará del resto
  }

  async function logout() {
    try {
      await signOut(firebaseAuth);
      setUser(null);
      setRole("none");
      setCompanyId(null);
      router.push('/');
    } catch (error) {
      console.error("Error al cerrar sesión", error);
    }
  }

  const value: AuthContextValue = {
    user,
    role,
    companyId,
    loading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider");
  }
  return ctx;
}
