// src/app/obras/page.tsx
"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy, serverTimestamp, Timestamp, writeBatch, where } from "firebase/firestore";
import { firebaseDb } from "@/lib/firebaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Edit, Trash2, PlusCircle, Link as LinkIcon, DollarSign, ArrowLeft, MessageSquare } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";


type Obra = {
  id: string;
  nombreFaena: string;
  direccion: string;
  clienteEmail: string;
  creadoEn: Timestamp | Date;
  mandanteRazonSocial: string;
  mandanteRut: string;
  jefeObraNombre: string;
  prevencionistaNombre: string;
  mutualidad?: string;
  empresaId: string;
};


// Nueva función para borrar subcolecciones
async function deleteSubcollection(db: any, collectionPath: string) {
    const collectionRef = collection(db, collectionPath);
    const q = query(collectionRef);
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
        return;
    }
    
    const batch = writeBatch(db);
    snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });
    
    await batch.commit();
}


export default function ObrasPage() {
  const { user, role, companyId, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [obras, setObras] = useState<Obra[]>([]);
  const [cargandoObras, setCargandoObras] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentObra, setCurrentObra] = useState<Partial<Obra> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const canManageObras = role === 'superadmin' || role === 'admin_empresa' || role === 'prevencionista';


  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login/usuario");
      return;
    }
    if (!loading && user && role === 'cliente') {
        router.replace('/cliente');
        return;
    }

  }, [loading, user, role, router]);

  useEffect(() => {
    if (loading || !user) return; // Esperar a que la autenticación esté lista
    if (role !== 'superadmin' && !companyId) {
        setCargandoObras(false);
        // No mostrar error si simplemente no hay companyId, podría ser un estado válido.
        // El usuario simplemente no verá obras.
        return;
    }


    async function cargarObras() {
      try {
        setCargandoObras(true);
        setError(null);

        const colRef = collection(firebaseDb, "obras");
        let q;

        if (role === 'superadmin') {
            // Superadmin ve todas las obras
            q = query(colRef, orderBy("creadoEn", "desc"));
        } else {
            // Usuarios de empresa solo ven obras de su empresa
            q = query(colRef, where("empresaId", "==", companyId), orderBy("creadoEn", "desc"));
        }
        
        const snapshot = await getDocs(q);

        const data: Obra[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        } as Obra));

        setObras(data);
      } catch (err: any) {
        console.error(err);
        setError("No se pudieron cargar las obras desde el servidor.");
        toast({ variant: "destructive", title: "Error al cargar obras", description: "Verifica los permisos de lectura en Firestore." });
      } finally {
        setCargandoObras(false);
      }
    }

    cargarObras();
  }, [user, loading, role, companyId, toast]);
  
  const handleOpenDialog = (obra: Partial<Obra> | null = null) => {
    if (!companyId && role !== 'superadmin') {
        toast({ variant: 'destructive', title: 'Error', description: 'No se puede crear una obra sin una empresa asignada.' });
        return;
    }
    setCurrentObra(obra || { 
      nombreFaena: "", 
      direccion: "", 
      clienteEmail: "",
      mandanteRazonSocial: "",
      mandanteRut: "",
      jefeObraNombre: "",
      prevencionistaNombre: "",
      mutualidad: "",
      empresaId: companyId || '',
    });
    setDialogOpen(true);
    setError(null);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (currentObra) {
      setCurrentObra({ ...currentObra, [e.target.name]: e.target.value });
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentObra || !currentObra.nombreFaena || !currentObra.direccion || !currentObra.clienteEmail) {
      setError("Todos los campos con * son obligatorios.");
      return;
    }
    
    if (!currentObra.empresaId) {
        setError("La obra debe estar asociada a una empresa.");
        return;
    }

    setIsSaving(true);
    const obraData = {
      nombreFaena: currentObra.nombreFaena,
      direccion: currentObra.direccion,
      clienteEmail: currentObra.clienteEmail,
      mandanteRazonSocial: currentObra.mandanteRazonSocial || "",
      mandanteRut: currentObra.mandanteRut || "",
      jefeObraNombre: currentObra.jefeObraNombre || "",
      prevencionistaNombre: currentObra.prevencionistaNombre || "",
      mutualidad: currentObra.mutualidad || "",
      empresaId: currentObra.empresaId,
    };

    try {
      if (currentObra.id) {
        // Actualizar obra existente
        const docRef = doc(firebaseDb, "obras", currentObra.id);
        await updateDoc(docRef, obraData);
        setObras(obras.map(o => o.id === currentObra!.id ? { ...o, ...currentObra, ...obraData } as Obra : o));
        toast({ title: "Obra actualizada", description: `La obra "${obraData.nombreFaena}" ha sido actualizada.` });
      } else {
        // Crear nueva obra
        const colRef = collection(firebaseDb, "obras");
        const docRef = await addDoc(colRef, {
          ...obraData,
          creadoEn: serverTimestamp(),
        });
        const nuevaObra: Obra = {
          id: docRef.id,
          ...obraData,
          creadoEn: new Date(),
        };
        setObras([nuevaObra, ...obras]);
        toast({ title: "Obra creada", description: `La obra "${obraData.nombreFaena}" ha sido creada.` });
      }
      setDialogOpen(false);
      setCurrentObra(null);
    } catch (err: any) {
      console.error(err);
      setError("No se pudo guardar la obra. Intenta nuevamente.");
      toast({ variant: "destructive", title: "Error al guardar", description: "No se pudo guardar la obra. Revisa los permisos." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (obraId: string) => {
    try {
      // Borrar subcolecciones en paralelo
      const subcollections = [
        "actividades",
        "avancesDiarios",
        "estadosDePago",
        "empresasSubcontratistasDs44",
        "ds44MandanteObra",
      ];

      await Promise.all(
        subcollections.map(sub => deleteSubcollection(firebaseDb, `obras/${obraId}/${sub}`))
      );

      // Borrar el documento principal de la obra
      const docRef = doc(firebaseDb, "obras", obraId);
      await deleteDoc(docRef);

      setObras(obras.filter(o => o.id !== obraId));
      toast({ title: "Obra eliminada", description: "La obra y todos sus datos asociados han sido eliminados." });
    } catch (err: any) {
      console.error(err);
      setError("No se pudo eliminar la obra y sus datos asociados. Intenta nuevamente.");
      toast({ variant: "destructive", title: "Error al eliminar", description: "No se pudo eliminar la obra. Revisa los permisos." });
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Cargando sesión...</p>;
  }

  if (!user || (role !== 'superadmin' && !companyId)) {
    return <p className="text-sm text-muted-foreground">No tienes permisos para ver este módulo o tu empresa no está configurada.</p>;
  }

  return (
    <section className="space-y-6">
       <Button asChild variant="outline" size="sm">
          <Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" />Volver al Dashboard</Link>
      </Button>

      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold">Gestión de Obras</h2>
          <p className="text-sm text-muted-foreground">
            Crea, edita y gestiona las obras.
          </p>
        </div>
        {canManageObras && (
            <Button onClick={() => handleOpenDialog()}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Crear Nueva Obra
            </Button>
        )}
      </header>

      {error && <p className="text-sm font-medium text-destructive">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Obras Registradas</CardTitle>
          <CardDescription>
            {cargandoObras ? "Cargando obras..." : `Mostrando ${obras.length} obras.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre Faena</TableHead>
                  <TableHead>Administrador de obra</TableHead>
                  <TableHead>Prevencionista</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cargandoObras ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">Cargando...</TableCell>
                  </TableRow>
                ) : obras.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                      No hay obras registradas aún.
                    </TableCell>
                  </TableRow>
                ) : (
                  obras.map((obra) => (
                    <TableRow key={obra.id}>
                      <TableCell className="font-medium">
                        {obra.nombreFaena}
                      </TableCell>
                      <TableCell>{obra.jefeObraNombre}</TableCell>
                      <TableCell>{obra.prevencionistaNombre}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {role !== 'prevencionista' && (
                            <Button variant="secondary" size="sm" asChild>
                              <Link href={`/operaciones/presupuestos?obraId=${obra.id}`}>
                                <DollarSign className="mr-2 h-3 w-3" />
                                Crear Itemizado
                              </Link>
                            </Button>
                          )}
                           <Button variant="outline" size="sm" asChild>
                            <Link href={`/cliente/obras/${obra.id}?preview=true`} target="_blank">
                              <LinkIcon className="mr-2 h-3 w-3" />
                              Ver Panel Cliente
                            </Link>
                          </Button>
                          {canManageObras && (
                            <>
                              <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(obra)}>
                                <Edit className="h-4 w-4" />
                                <span className="sr-only">Editar</span>
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                    <Trash2 className="h-4 w-4" />
                                    <span className="sr-only">Eliminar</span>
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>¿Estás seguro de que deseas eliminar esta obra?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta acción no se puede deshacer. Se eliminará permanentemente la obra &quot;{obra.nombreFaena}&quot; y todos sus datos asociados (actividades, avances, etc.).
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(obra.id)} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{currentObra?.id ? "Editar Obra" : "Crear Nueva Obra"}</DialogTitle>
              <DialogDescription>
                {currentObra?.id ? "Modifica los detalles de la obra y haz clic en Guardar." : "Completa los detalles para registrar una nueva obra."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nombreFaena">Nombre Faena*</Label>
                <Input id="nombreFaena" name="nombreFaena" value={currentObra?.nombreFaena || ""} onChange={handleFormChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="direccion">Dirección*</Label>
                <Input id="direccion" name="direccion" value={currentObra?.direccion || ""} onChange={handleFormChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clienteEmail">Email Cliente*</Label>
                <Input id="clienteEmail" name="clienteEmail" type="email" value={currentObra?.clienteEmail || ""} onChange={handleFormChange} required />
              </div>
               <div className="space-y-2">
                <Label htmlFor="jefeObraNombre">Administrador de obra</Label>
                <Input id="jefeObraNombre" name="jefeObraNombre" value={currentObra?.jefeObraNombre || ""} onChange={handleFormChange} />
              </div>
               <div className="space-y-2">
                <Label htmlFor="prevencionistaNombre">Nombre Prevencionista</Label>
                <Input id="prevencionistaNombre" name="prevencionistaNombre" value={currentObra?.prevencionistaNombre || ""} onChange={handleFormChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mandanteRazonSocial">Razón Social Mandante</Label>
                <Input id="mandanteRazonSocial" name="mandanteRazonSocial" value={currentObra?.mandanteRazonSocial || ""} onChange={handleFormChange} />
              </div>
               <div className="space-y-2">
                <Label htmlFor="mandanteRut">RUT Mandante</Label>
                <Input id="mandanteRut" name="mandanteRut" value={currentObra?.mandanteRut || ""} onChange={handleFormChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mutualidad">Mutualidad</Label>
                <Input id="mutualidad" name="mutualidad" value={currentObra?.mutualidad || ""} onChange={handleFormChange} />
              </div>
              {error && <p className="col-span-full text-sm font-medium text-destructive">{error}</p>}
            </div>
            <DialogFooter>
               <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Guardando..." : "Guardar Obra"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
