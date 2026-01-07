// src/app/cumplimiento/admin/programa/page.tsx
"use client";

import React, { useState, useEffect, useTransition } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import Link from "next/link";
import { ArrowLeft, PlusCircle, Edit, Loader2, Info } from "lucide-react";
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { RequisitoDocumento } from '@/types/pcg';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const initialRequirementState: Omit<RequisitoDocumento, 'id' | 'createdAt' | 'updatedAt'> = {
    nombre: '',
    descripcion: '',
    esObligatorio: true,
    activo: true,
};

async function fetchRequirements(companyId: string) {
    const res = await fetch(`/api/mclp/requirements?companyId=${companyId}`);
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to fetch requirements');
    }
    return res.json();
}

async function saveRequirement(companyId: string, req: Partial<RequisitoDocumento>) {
    const method = req.id ? 'PUT' : 'POST';
    const res = await fetch(`/api/mclp/requirements`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, requirement: req }),
    });
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to save requirement');
    }
    return res.json();
}


export default function RequerimientosCumplimientoPage() {
  const { companyId } = useAuth();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [requirements, setRequirements] = useState<RequisitoDocumento[]>([]);
  const [loading, setLoading] = useState(true);

  const [isReqModalOpen, setIsReqModalOpen] = useState(false);
  const [currentReq, setCurrentReq] = useState<Partial<RequisitoDocumento>>(initialRequirementState);
  
  const loadRequirements = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const data = await fetchRequirements(companyId);
      setRequirements(data);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequirements();
  }, [companyId]);

  const handleReqSave = () => {
    if (!companyId || !currentReq.nombre) {
        toast({ variant: 'destructive', title: 'Error', description: 'El nombre del requisito es obligatorio.' });
        return;
    }
    startTransition(async () => {
        try {
            await saveRequirement(companyId, currentReq);
            toast({ title: 'Éxito', description: `Requisito ${currentReq.id ? 'actualizado' : 'creado'}.` });
            setIsReqModalOpen(false);
            await loadRequirements(); // Re-fetch data
        } catch(error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    });
  };

  if (loading) {
      return <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin mr-2" /> Cargando configuración...</div>
  }

  return (
    <div className="space-y-6">
       <header className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
            <Link href="/cumplimiento/admin">
                <ArrowLeft className="mr-2 h-4 w-4"/>Volver
            </Link>
        </Button>
        <div>
            <h1 className="text-2xl font-bold">Requerimientos de Cumplimiento</h1>
            <p className="text-muted-foreground">Define la lista maestra de documentos que los subcontratistas deben presentar.</p>
        </div>
      </header>
      
       <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-700" />
          <AlertTitle className="text-blue-900">Gestión de Fechas</AlertTitle>
          <AlertDescription className="text-blue-800">
            Las fechas clave del programa (corte de carga, revisión y pago) ahora se administran en la sección de <Button variant="link" asChild className="p-0 h-auto text-blue-800"><Link href="/cumplimiento/admin/calendario">Calendario Anual</Link></Button>.
          </AlertDescription>
        </Alert>

      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
            <div>
                <CardTitle>Listado de Documentos Requeridos</CardTitle>
                <CardDescription>Esta lista se solicitará a todos los subcontratistas en cada período de cumplimiento.</CardDescription>
            </div>
            <Button onClick={() => { setCurrentReq(initialRequirementState); setIsReqModalOpen(true); }}><PlusCircle className="mr-2"/> Nuevo Requerimiento</Button>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Nombre del Documento</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead>Obligatorio</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                        <TableRow><TableCell colSpan={4} className="text-center">Cargando requisitos...</TableCell></TableRow>
                    ) : requirements.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-center h-24">No hay requisitos definidos.</TableCell></TableRow>
                    ) : (
                        requirements.map(req => (
                            <TableRow key={req.id}>
                                <TableCell className="font-medium">{req.nombre}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">{req.descripcion}</TableCell>
                                <TableCell>{req.esObligatorio ? 'Sí' : 'No'}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" onClick={() => { setCurrentReq(req); setIsReqModalOpen(true); }}><Edit className="h-4 w-4"/></Button>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
      
      <Dialog open={isReqModalOpen} onOpenChange={setIsReqModalOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{currentReq.id ? 'Editar Requerimiento' : 'Nuevo Requerimiento'}</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <div className="space-y-2">
                    <Label>Nombre del Documento*</Label>
                    <Input value={currentReq.nombre || ''} onChange={e => setCurrentReq(p => ({...p, nombre: e.target.value}))} />
                </div>
                <div className="space-y-2">
                    <Label>Descripción Breve</Label>
                    <Input value={currentReq.descripcion || ''} onChange={e => setCurrentReq(p => ({...p, descripcion: e.target.value}))} />
                </div>
                <div className="flex items-center space-x-2">
                    <Switch id="es-obligatorio" checked={currentReq.esObligatorio} onCheckedChange={c => setCurrentReq(p => ({...p, esObligatorio: c}))} />
                    <Label htmlFor="es-obligatorio">Este documento es obligatorio para cumplir</Label>
                </div>
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={() => setIsReqModalOpen(false)}>Cancelar</Button>
                <Button onClick={handleReqSave} disabled={isPending}>
                     {isPending && <Loader2 className="animate-spin mr-2"/>}
                    {currentReq.id ? 'Guardar Cambios' : 'Crear Requerimiento'}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
