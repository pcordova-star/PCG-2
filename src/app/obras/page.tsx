"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { collection, addDoc, getDocs, Timestamp } from "firebase/firestore";
import { firebaseDb } from "../../lib/firebaseClient";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

type Obra = {
  id: string;
  nombreFaena: string;
  direccion: string;
  clienteEmail: string;
  // Estos campos pueden o no venir de Firestore, los mantenemos por compatibilidad de UI
  modulosActivos?: {
    operaciones: boolean;
    prevencion: boolean;
  };
};

export default function ObrasPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [obras, setObras] = useState<Obra[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    nombreFaena: "",
    direccion: "",
    clienteEmail: "",
  });
  const [creando, setCreando] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    async function cargarObras() {
      if (!user) return; // No cargar si no hay usuario
      try {
        setCargando(true);
        setError(null);

        const colRef = collection(firebaseDb, "obras");
        const snapshot = await getDocs(colRef);

        const data: Obra[] = snapshot.docs.map((doc) => {
          const d = doc.data();
          return {
            id: doc.id,
            nombreFaena: d.nombreFaena ?? "",
            direccion: d.direccion ?? "",
            clienteEmail: d.clienteEmail ?? "",
            // Simulamos modulos activos por ahora para mantener la UI
            modulosActivos: {
              operaciones: Math.random() > 0.5,
              prevencion: Math.random() > 0.5,
            }
          };
        });

        setObras(data);
      } catch (err) {
        console.error(err);
        setError("No se pudieron cargar las obras desde el servidor.");
      } finally {
        setCargando(false);
      }
    }

    cargarObras();
  }, [user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const { nombreFaena, direccion, clienteEmail } = form;

    if (!nombreFaena.trim() || !direccion.trim() || !clienteEmail.trim()) {
      setError("Todos los campos son obligatorios.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(clienteEmail)) {
      setError("El email del cliente no tiene un formato válido.");
      return;
    }

    setCreando(true);
    try {
      const colRef = collection(firebaseDb, "obras");
      const docRef = await addDoc(colRef, {
        nombreFaena: nombreFaena.trim(),
        direccion: direccion.trim(),
        clienteEmail: clienteEmail.trim(),
        creadoEn: Timestamp.now(),
      });

      const nuevaObra: Obra = {
        id: docRef.id,
        nombreFaena: nombreFaena.trim(),
        direccion: direccion.trim(),
        clienteEmail: clienteEmail.trim(),
        // Simulamos modulos activos para la nueva obra
         modulosActivos: {
            operaciones: true,
            prevencion: true,
        }
      };

      setObras((prev) => [nuevaObra, ...prev]);

      setForm({
        nombreFaena: "",
        direccion: "",
        clienteEmail: "",
      });
    } catch (err) {
      console.error(err);
      setError("No se pudo crear la obra. Intenta nuevamente.");
    } finally {
      setCreando(false);
    }
  }

  if (authLoading || !user) {
    return <p className="text-sm text-muted-foreground">Cargando sesión...</p>;
  }

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Cartera de Obras</h1>
        <p className="text-lg text-muted-foreground">
          Vista general de las obras en PCG 2.0. Desde aquí puedes ver los
          datos básicos, módulos activos y el link del panel del cliente.
        </p>
      </header>
      
      <Card>
        <CardHeader>
          <CardTitle>Crear Nueva Obra</CardTitle>
          <CardDescription>
            Agregue una nueva obra a la cartera. Se registrará en Firestore.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nombreFaena">Nombre de la Obra/Faena</Label>
                <Input id="nombreFaena" value={form.nombreFaena} onChange={e => setForm({...form, nombreFaena: e.target.value})} />
              </div>
               <div className="space-y-2">
                <Label htmlFor="direccion">Dirección</Label>
                <Input id="direccion" value={form.direccion} onChange={e => setForm({...form, direccion: e.target.value})} />
              </div>
               <div className="space-y-2">
                <Label htmlFor="clienteEmail">Email del Cliente</Label>
                <Input id="clienteEmail" type="email" value={form.clienteEmail} onChange={e => setForm({...form, clienteEmail: e.target.value})} />
              </div>
            </div>
            <Button type="submit" disabled={creando}>
              {creando ? "Creando obra..." : "Crear Obra"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-xl border bg-card text-card-foreground shadow-sm">
        {cargando && <p className="p-4 text-sm text-muted-foreground">Cargando obras desde Firestore...</p>}
        
        {!cargando && obras.length === 0 && (
          <p className="p-8 text-center text-sm text-muted-foreground">
            {error ? error : "No hay obras registradas en Firestore. ¡Crea la primera!"}
          </p>
        )}

        {!cargando && obras.length > 0 && (
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Obra / Faena</TableHead>
                <TableHead>Dirección</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Módulos Activos</TableHead>
                <TableHead>Panel Cliente</TableHead>
                <TableHead>Acciones</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {obras.map((obra) => {
                const clientPath = `/clientes/${obra.id}`;
                return (
                    <TableRow key={obra.id}>
                    <TableCell className="align-top">
                        <div className="font-semibold text-primary">
                        {obra.nombreFaena}
                        </div>
                        <div className="text-xs text-muted-foreground">
                        ID: {obra.id}
                        </div>
                    </TableCell>
                    <TableCell className="align-top">
                        <p className="text-sm">{obra.direccion}</p>
                    </TableCell>
                    <TableCell className="align-top">
                        <p className="text-sm font-mono">{obra.clienteEmail}</p>
                    </TableCell>
                    <TableCell className="align-top">
                        <div className="flex flex-col gap-1.5">
                        <Badge
                            variant={
                            obra.modulosActivos?.operaciones
                                ? "default"
                                : "secondary"
                            }
                            className={
                            obra.modulosActivos?.operaciones
                                ? "border-green-200 bg-green-100 text-green-800"
                                : ""
                            }
                        >
                            Operaciones
                        </Badge>
                        <Badge
                            variant={
                            obra.modulosActivos?.prevencion
                                ? "default"
                                : "secondary"
                            }
                            className={
                            obra.modulosActivos?.prevencion
                                ? "border-amber-200 bg-amber-100 text-amber-800"
                                : ""
                            }
                        >
                            Prevención
                        </Badge>
                        </div>
                    </TableCell>
                    <TableCell className="align-top">
                        <div className="flex flex-col gap-1">
                        <code className="rounded-lg border bg-muted/50 px-2 py-1 text-xs font-mono">
                            {clientPath}
                        </code>
                        <Button asChild variant="outline" size="sm" className="mt-1">
                            <Link href={clientPath}>Ver como cliente</Link>
                        </Button>
                        </div>
                    </TableCell>
                    <TableCell className="align-top">
                        <div className="flex flex-col gap-2">
                        <Button asChild variant="outline" size="sm">
                            <Link href={`/operaciones/programacion?obraId=${obra.id}`}>
                            Ir a Operaciones
                            </Link>
                        </Button>
                        <Button asChild variant="outline" size="sm">
                            <Link href={`/prevencion/ds44-subcontratos?obraId=${obra.id}`}>
                            Ir a Prevención
                            </Link>
                        </Button>
                        </div>
                    </TableCell>
                    </TableRow>
                );
                })}
            </TableBody>
            </Table>
        )}
      </div>
    </section>
  );
}
