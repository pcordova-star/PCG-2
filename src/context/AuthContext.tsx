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
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { UserRole } from "@/lib/roles";
import { AppUser } from "@/types/pcg";


/**
 * Asegura que exista un documento en /users/{uid} para un usuario autenticado.
 * Si no existe, lo crea con datos básicos. Esto es crucial para la consistencia
 * de los datos en la plataforma.
 * @param firebaseUser - El objeto de usuario de Firebase Auth.
 */
async function ensureUserDocForAuthUser(firebaseUser: User) {
  const userRef = doc(firebaseDb, "users", firebaseUser.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    // Si el documento no existe, lo creamos con valores por defecto.
    const newUserDoc: Omit<AppUser, "id"> = {
      nombre: firebaseUser.displayName || firebaseUser.email || "Usuario sin nombre",
      email: firebaseUser.email!,
      role: "none",
      empresaId: null,
      activo: true, // Por defecto, los nuevos usuarios están activos
      createdAt: serverTimestamp(),
    };
    try {
      await setDoc(userRef, newUserDoc);
      console.log(`Documento creado para el nuevo usuario: ${firebaseUser.uid}`);
    } catch (error) {
      console.error("Error al crear el documento del usuario en Firestore:", error);
    }
  }
}


type AuthContextValue = {
  user: User | null;
  role: UserRole;
  companyId: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

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
        
        try {
            await ensureUserDocForAuthUser(firebaseUser);
            const idTokenResult = await firebaseUser.getIdTokenResult(true);
            const claims = idTokenResult.claims;

            // Primero, intentar obtener desde los claims
            let userRole = (claims.role as UserRole) || 'none';
            let userCompanyId = (claims.companyId as string) || null;

            // Si los claims no son suficientes, consultar Firestore como fallback
            if (userRole === 'none' || !userCompanyId) {
                const userDocRef = doc(firebaseDb, "users", firebaseUser.uid);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    const userDocData = userDocSnap.data() as AppUser;
                    if (userRole === 'none') {
                        userRole = (userDocData.role as UserRole) || 'none';
                    }
                    if (!userCompanyId) {
                        userCompanyId = userDocData.empresaId || null;
                    }
                }
            }

            setRole(userRole);
            setCompanyId(userCompanyId);
            setUser(firebaseUser);
            
            // Redirección explícita si el usuario está logueado y en la página de login
            if (pathname.startsWith('/login/usuario')) {
                 router.replace('/dashboard');
            }

        } catch (error) {
            console.error("Error al procesar el token de autenticación (posiblemente expirado):", error);
            setUser(null);
            setRole("none");
            setCompanyId(null);
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
