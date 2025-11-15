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
  useCallback,
} from "react";
import { firebaseAuth, firebaseDb } from "../lib/firebaseClient";
import { useRouter } from "next/navigation";
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs, writeBatch } from "firebase/firestore";
import { resolveRole, UserRole } from "@/lib/roles";
import { AppUser } from "@/types/pcg";


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
    
    if (userDocSnap.exists() && userDocSnap.data().empresaId) {
        // El usuario ya existe y tiene una empresa asignada, devolvemos sus datos.
        return { id: userDocSnap.id, ...userDocSnap.data() } as AppUser;
    }

    // Si el usuario no existe o no tiene empresa, buscamos una invitación pendiente.
    const emailLower = user.email!.toLowerCase().trim();
    const invitationsRef = collection(firebaseDb, "invitacionesUsuarios");
    const q = query(
        invitationsRef,
        where("email", "==", emailLower),
        where("estado", "==", "pendiente")
    );
    const invitationSnapshot = await getDocs(q);

    if (!invitationSnapshot.empty) {
        // Encontramos una invitación, la usamos para crear/actualizar el perfil del usuario.
        const invitation = invitationSnapshot.docs[0];
        const invitationData = invitation.data();
        
        const newUserProfile: Omit<AppUser, 'id'> = {
            email: emailLower,
            nombre: user.displayName || user.email!.split('@')[0],
            empresaId: invitationData.empresaId,
            role: invitationData.roleDeseado,
            createdAt: serverTimestamp(),
        };

        const batch = writeBatch(firebaseDb);
        batch.set(userDocRef, newUserProfile, { merge: true });
        batch.update(invitation.ref, { estado: "aceptada" });
        await batch.commit();

        return { id: user.uid, ...newUserProfile } as AppUser;
    }

    // Si no hay invitación y el documento no existe, creamos uno básico sin rol/empresa.
    if (!userDocSnap.exists()) {
        const newUserProfile: Omit<AppUser, 'id'> = {
            email: emailLower,
            nombre: user.displayName || user.email!.split('@')[0],
            empresaId: null,
            role: "none",
            createdAt: serverTimestamp(),
        };
        await setDoc(userDocRef, newUserProfile);
        return { id: user.uid, ...newUserProfile } as AppUser;
    }

    // Si el documento existe pero sin empresa, lo devolvemos como está.
    return { id: userDocSnap.id, ...userDocSnap.data() } as AppUser;
}


export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>("none");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
            const userDoc = await ensureUserDocForAuthUser(firebaseUser);
            const idTokenResult = await firebaseUser.getIdTokenResult(true);
            const resolvedUserRole = resolveRole(firebaseUser, userDoc, idTokenResult.claims);
            
            setRole(resolvedUserRole);
            setCompanyId(userDoc?.empresaId || null);
        } catch (error) {
            console.error("Error al procesar el login del usuario:", error);
            setRole("none");
            setCompanyId(null);
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
