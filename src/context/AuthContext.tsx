// src/context/AuthContext.tsx
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
import { firebaseAuth, firebaseDb } from "@/lib/firebaseClient"; // Se importa firebaseAuth directamente
import { useRouter } from "next/navigation";
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

async function ensureUserDocForAuthUser(user: User, invitation?: UserInvitation | null): Promise<AppUser | null> {
    const userDocRef = doc(firebaseDb, "users", user.uid);
    let userDocSnap = await getDoc(userDocRef);
    
    // Si ya existe un perfil con empresaId, no hacemos nada más.
    if (userDocSnap.exists() && userDocSnap.data().empresaId) {
        return { id: userDocSnap.id, ...userDocSnap.data() } as AppUser;
    }

    const emailLower = user.email!.toLowerCase().trim();

    // Flujo 1: El usuario viene de un enlace de invitación
    if (invitation) {
        const newUserProfile: Omit<AppUser, 'id'> = {
            email: emailLower,
            nombre: user.displayName || user.email!.split('@')[0],
            empresaId: invitation.empresaId,
            role: invitation.roleDeseado,
            createdAt: serverTimestamp(),
        };

        const batch = writeBatch(firebaseDb);
        batch.set(userDocRef, newUserProfile, { merge: true });
        // Actualizamos la invitación a aceptada
        const invitationRef = doc(firebaseDb, "invitacionesUsuarios", invitation.id!);
        batch.update(invitationRef, { estado: "aceptada" });
        await batch.commit();

        return { id: user.uid, ...newUserProfile } as AppUser;
    }

    // Flujo 2: El usuario hace login normal, buscamos si hay una invitación para él
    const invitationsRef = collection(firebaseDb, "invitacionesUsuarios");
    const q = query(
        invitationsRef,
        where("email", "==", emailLower),
        where("estado", "==", "pendiente")
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
        };

        const batch = writeBatch(firebaseDb);
        batch.set(userDocRef, newUserProfile, { merge: true });
        batch.update(firstInvitation.ref, { estado: "aceptada" });
        await batch.commit();

        return { id: user.uid, ...newUserProfile } as AppUser;
    }

    // Flujo 3: Si no hay invitación y el documento no existe, creamos uno básico.
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

    // Si el documento existe pero sin empresa (y no hay invitación), lo devolvemos como está.
    return { id: userDocSnap.id, ...userDocSnap.data() } as AppUser;
}

export { ensureUserDocForAuthUser };


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
            // No pasamos invitación aquí, el login normal la busca por sí solo.
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
