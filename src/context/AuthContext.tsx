"use client";

import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User,
  IdTokenResult,
} from "firebase/auth";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { firebaseAuth, firebaseDb } from "../lib/firebaseClient";
import { useRouter } from "next/navigation";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { resolveRole, UserRole } from "@/lib/roles";


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

  useEffect(() => {
    const unsub = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      setLoading(true);
      setUser(firebaseUser);

      if (firebaseUser) {
        try {
            const idTokenResult: IdTokenResult = await firebaseUser.getIdTokenResult(true);
            const claims = idTokenResult.claims;
            
            // Obtener el documento del usuario desde Firestore
            const userDocRef = doc(firebaseDb, "users", firebaseUser.uid);
            const userDocSnap = await getDoc(userDocRef);
            let userDocData = null;

            if (userDocSnap.exists()) {
                userDocData = userDocSnap.data();
            } else {
                 // Si no existe, creamos un registro básico.
                 // Esto es útil para nuevos usuarios o para consistencia de datos.
                const newUserDoc = {
                    email: firebaseUser.email,
                    nombre: firebaseUser.displayName || firebaseUser.email,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                };
                await setDoc(userDocRef, newUserDoc);
                userDocData = newUserDoc;
            }

            // Centralizamos la lógica de roles usando la nueva función
            const resolvedUserRole = resolveRole(firebaseUser, userDocData, claims);
            setRole(resolvedUserRole);
            setCompanyId(claims.companyId || userDocData?.companyIdPrincipal || null);

        } catch (error) {
            console.error("Error al obtener datos del usuario:", error);
            setRole("none");
            setCompanyId(null);
        }

      } else {
        setRole("none");
        setCompanyId(null);
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  async function login(email: string, password: string) {
    await signInWithEmailAndPassword(firebaseAuth, email, password);
    // El onAuthStateChanged se encargará del resto (obtener token, doc, y resolver rol)
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
