"use client";

import React, { useState, useEffect, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Trash2, Edit, PlusCircle } from 'lucide-react';
import { firebaseDb } from '@/lib/firebaseClient';
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
  getDocs
} from 'firebase/firestore';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

// --- Tipos ---
type Obra = {
  id: string;
  nombreFaena: string;
};

export interface PersonalObra {
  id: string;
  obraId: string;
  rut: string;
  nombre: string;
  cargo: string;
  empresa: string;
  fechaIngreso: string;
  autorizado: boolean;
  observaciones?: string;
  creadoEn: Timestamp;
  actualizadoEn?: Timestamp;
}

// --- Componente Principal ---
export default function PersonalPage() {
  const [obras, setObras] = useState<Obra[]>([]);
  const [obraSeleccionadaId, setObraSeleccionadaId] = useState<string>("");
  const [personal, setPersonal] = useState<PersonalObra[]>([]);
  
  const [loadingObras, setLoadingObras] = useState(true);
  const [loadingPersonal, setLoadingPersonal] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentPersonal, setCurrentPersonal] = useState<Partial<PersonalObra> | null>(null);

  // Cargar Obras desde Firestore
  useEffect(() => {
    async function cargarObras() {
      setLoadingObras(true);
      try {
        const colRef = collection(firebaseDb, "obras");
        const q = query(colRef, orderBy("nombreFaena"));
        const snapshot = await getDocs(q);
        const data: Obra[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          nombreFaena: doc.data().nombreFaena ?? "",
        }));
        setObras(data);
        if (data.length > 0 && !obraSeleccionadaId) {
          setObraSeleccionadaId(data[0].id);
        }
      } catch (err) {
        console.error(err);
        setError("No se pudieron cargar las obras disponibles.");
      } finally {
        setLoadingObras(false);
      }
    }
    cargarObras();
  }, []);

  // Cargar personal en tiempo real
  useEffect(() => {
    if (!obraSeleccionadaId) {
      setPersonal([]);
      setLoadingPersonal(false);
      return;
    }

    setLoadingPersonal(true);
    const personalColRef = collection(firebaseDb, "obras", obraSeleccionadaId, "personal");
    const q = query(personalColRef, orderBy("creadoEn", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data: PersonalObra[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<PersonalObra, 'id'>),
        }));
        setPersonal(data);
        setLoadingPersonal(false);
      },
      (err) => {
        console.error(err);
        setError("Error al cargar el personal de la obra.");
        setLoadingPersonal(false);
      }
    );

    return () => unsubscribe();
  }, [obraSeleccionadaId]);

  const handleOpenDialog = (p: Partial<PersonalObra> | null = null) => {
    setCurrentPersonal(p || { 
        nombre: "",
        rut: "", 
        cargo: "",
        empresa: "", 
        fechaIngreso: new Date().toISOString().slice(0, 10),
        autorizado: false,
        observaciones: ""
    });
    setDialogOpen(true);
    setError(null);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (currentPersonal) {
      setCurrentPersonal({ ...currentPersonal, [e.target.name]: e.target.value });
    }
  };

  const handleCheckboxChange = (checked: boolean) => {
    if (currentPersonal) {
      setCurrentPersonal({ ...currentPersonal, autorizado: checked });
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentPersonal || !currentPersonal.nombre || !currentPersonal.rut || !currentPersonal.cargo || !currentPersonal.empresa || !currentPersonal.fechaIngreso) {
      setError("Todos los campos marcados con * son obligatorios.");
      return;
    }
    if (!obraSeleccionadaId) {
        setError("Debe seleccionar una obra.");
        return;
    }

    try {
      if (currentPersonal.id) {
        // Actualizar personal existente
        const docRef = doc(firebaseDb, "obras", obraSeleccionadaId, "personal", currentPersonal.id);
        await updateDoc(docRef, {
          ...currentPersonal,
          actualizadoEn: serverTimestamp(),
        });
      } else {
        // Crear nuevo personal
        const colRef = collection(firebaseDb, "obras", obraSeleccionadaId, "personal");
        await addDoc(colRef, {
          ...currentPersonal,
          obraId: obraSeleccionadaId,
          creadoEn: serverTimestamp(),
          actualizadoEn: serverTimestamp(),
        });
      }
      setDialogOpen(false);
      setCurrentPersonal(null);
    } catch (err) {
      console.error(err);
      setError("No se pudo guardar el registro del personal. Intente nuevamente.");
    }
  };

  const handleDelete = async (personalId: string) => {
    try {
      const docRef = doc(firebaseDb, "obras", obraSeleccionadaId, "personal", personalId);
      await deleteDoc(docRef);
    } catch (err) {
      console.error(err);
      setError("No se pudo eliminar el registro. Intente nuevamente.");
    }
  };

  if (loadingObras) {
      return <p className="text-muted-foreground">Cargando obras...</p>
  }
  
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold font-headline tracking-tight">Personal de Obra – PCG 2.0</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Gestione el plantel de trabajadores y su estado para cada obra. Los datos se guardan en tiempo real en Firestore.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Selector de Obra</CardTitle>
          <CardDescription>Seleccione una obra para gestionar su personal asignado.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-xs space-y-2">
            <Label htmlFor="obra-select">Obra seleccionada</Label>
            <Select value={obraSeleccionadaId} onValueChange={setObraSeleccionadaId}>
              <SelectTrigger id="obra-select">
                <SelectValue placeholder="Seleccione una obra" />
              </SelectTrigger>
              <SelectContent>
                {obras.map((obra) => (
                  <SelectItem key={obra.id} value={obra.id}>
                    {obra.nombreFaena}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1.5">
            <CardTitle>Personal Asignado en Obra</CardTitle>
            <CardDescription>
              {loadingPersonal ? "Cargando personal..." : `Mostrando ${personal.length} personas en la obra.`}
            </CardDescription>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Agregar Personal
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>RUT</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Fecha Ingreso</TableHead>
                  <TableHead>Autorizado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingPersonal ? (
                  <TableRow><TableCell colSpan={7} className="text-center h-24">Cargando...</TableCell></TableRow>
                ) : personal.length > 0 ? (
                  personal.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.nombre}</TableCell>
                      <TableCell>{p.rut}</TableCell>
                      <TableCell>{p.cargo}</TableCell>
                      <TableCell>{p.empresa}</TableCell>
                      <TableCell>{p.fechaIngreso}</TableCell>
                      <TableCell>
                        <Badge variant={p.autorizado ? 'default' : 'destructive'}>{p.autorizado ? 'Sí' : 'No'}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(p)}>
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
                                <AlertDialogTitle>¿Desea eliminar este registro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Se eliminará permanentemente a "{p.nombre}" de la obra. Esta acción no se puede deshacer.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(p.id)} className="bg-destructive hover:bg-destructive/90">
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={7} className="h-24 text-center">No hay personal registrado para esta obra.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {error && <p className="p-4 text-sm font-medium text-destructive">{error}</p>}
        </CardContent>
      </Card>
      
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{currentPersonal?.id ? 'Editar Personal' : 'Agregar Nuevo Personal'}</DialogTitle>
              <DialogDescription>
                Complete la información del trabajador para esta obra.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label htmlFor="nombre">Nombre*</Label><Input id="nombre" name="nombre" value={currentPersonal?.nombre || ''} onChange={handleFormChange} /></div>
                <div className="space-y-2"><Label htmlFor="rut">RUT*</Label><Input id="rut" name="rut" value={currentPersonal?.rut || ''} onChange={handleFormChange} /></div>
                <div className="space-y-2"><Label htmlFor="cargo">Cargo*</Label><Input id="cargo" name="cargo" value={currentPersonal?.cargo || ''} onChange={handleFormChange} /></div>
                <div className="space-y-2"><Label htmlFor="empresa">Empresa*</Label><Input id="empresa" name="empresa" value={currentPersonal?.empresa || ''} onChange={handleFormChange} /></div>
                <div className="space-y-2"><Label htmlFor="fechaIngreso">Fecha de Ingreso*</Label><Input id="fechaIngreso" name="fechaIngreso" type="date" value={currentPersonal?.fechaIngreso || ''} onChange={handleFormChange} /></div>
                <div className="flex items-center space-x-2 pt-6">
                    <Checkbox id="autorizado" checked={currentPersonal?.autorizado} onCheckedChange={(checked) => handleCheckboxChange(Boolean(checked))} />
                    <Label htmlFor="autorizado" className="font-medium">Autorizado para ingresar a la obra</Label>
                </div>
              </div>
              <div className="space-y-2">
                  <Label htmlFor="observaciones">Observaciones</Label>
                  <textarea id="observaciones" name="observaciones" value={currentPersonal?.observaciones || ''} onChange={handleFormChange} className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
              {error && <p className="text-sm font-medium text-destructive">{error}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit">Guardar Registro</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
