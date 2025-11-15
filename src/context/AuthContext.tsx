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
import { firebaseAuth } from "../lib/firebaseClient";
import { useRouter } from "next/navigation";

type CustomClaims = {
  role?: "SUPER_ADMIN" | "EMPRESA_ADMIN" | "JEFE_OBRA" | "PREVENCIONISTA" | "LECTOR_CLIENTE";
  companyId?: string | null;
  [key: string]: any;
};

type AuthContextValue = {
  user: User | null;
  customClaims: CustomClaims | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [customClaims, setCustomClaims] = useState<CustomClaims | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const idTokenResult: IdTokenResult = await firebaseUser.getIdTokenResult(true); // Forzar refresco
        setCustomClaims(idTokenResult.claims as CustomClaims);
      } else {
        setCustomClaims(null);
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  async function login(email: string, password: string) {
    await signInWithEmailAndPassword(firebaseAuth, email, password);
    // El onAuthStateChanged se encargará del resto
  }

  async function logout() {
    try {
      await signOut(firebaseAuth);
      setUser(null);
      setCustomClaims(null);
      router.push('/');
    } catch (error) {
      console.error("Error al cerrar sesión", error);
    }
  }

  const value: AuthContextValue = {
    user,
    customClaims,
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
