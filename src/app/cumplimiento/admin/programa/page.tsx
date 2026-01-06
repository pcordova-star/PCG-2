// src/app/cumplimiento/admin/programa/page.tsx
"use client";

import React, { useState, useEffect, useTransition } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import Link from "next/link";
import { ArrowLeft, PlusCircle, Edit, Save, Loader2 } from "lucide-react";
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ProgramaCumplimiento, RequisitoDocumento } from '@/types/pcg';
import { 
    getComplianceProgramAction, 
    updateComplianceProgramAction,
    listRequirementsAction,
    createRequirementAction,
    updateRequirementAction,
    deactivateRequirementAction
} from '@/lib/mclp/actions';

const initialRequirementState: Omit<RequisitoDocumento, 'id'> = {
    nombre: '',
    descripcion: '',
    esObligatorio: true,
    activo: true,
};

export default function ProgramaCumplimientoPage() {
  const { companyId, role } = useAuth();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [program, setProgram] = useState<ProgramaCumplimiento | null>(null);
  const [requirements, setRequirements] = useState<RequisitoDocumento[]>([]);
  const [loading, setLoading] = useState(true);

  const [isReqModalOpen, setIsReqModalOpen] = useState(false);
  const [currentReq, setCurrentReq] = useState<Partial<RequisitoDocumento>>(initialRequirementState);
  
  useEffect(() => {
    if (!companyId) return;

    setLoading(true);
    startTransition(async () => {
        const programResult = await getComplianceProgramAction(companyId);
        if (programResult.success && programResult.data) {
            setProgram(programResult.data);
        } else {
            toast({ variant: 'destructive', title: 'Error', description: programResult.error });
        }
        
        const reqsResult = await listRequirementsAction(companyId);
        if (reqsResult.success && reqsResult.data) {
            setRequirements(reqsResult.data);
        } else {
             toast({ variant: 'destructive', title: 'Error', description: reqsResult.error });
        }
        setLoading(false);
    });
  }, [companyId, toast]);

  const handleProgramSave = () => {
    if (!program || !companyId) return;
    startTransition(async () => {
        const result = await updateComplianceProgramAction(companyId, {
            diaCorteCarga: program.diaCorteCarga,
            diaLimiteRevision: program.diaLimiteRevision,
            diaPago: program.diaPago,
        });
        if (result.success) {
            toast({ title: 'Éxito', description: 'Programa actualizado correctamente.' });
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
    });
  };

  const handleReqSave = () => {
    if (!companyId || !currentReq.nombre) {
        toast({ variant: 'destructive', title: 'Error', description: 'El nombre del requisito es obligatorio.' });
        return;
    }
    startTransition(async () => {
        let result;
        if (currentReq.id) {
            result = await updateRequirementAction(companyId, currentReq.id, {
                nombre: currentReq.nombre!,
                descripcion: currentReq.descripcion,
                esObligatorio: currentReq.esObligatorio,
            });
        } else {
            result = await createRequirementAction(companyId, {
                nombre: currentReq.nombre!,
                descripcion: currentReq.descripcion,
                esObligatorio: !!currentReq.esObligatorio,
            });
        }
        
        if (result.success) {
            toast({ title: 'Éxito', description: `Requisito ${currentReq.id ? 'actualizado' : 'creado'}.` });
            setIsReqModalOpen(false);
            // Refetch requirements
            const reqsResult = await listRequirementsAction(companyId);
            if(reqsResult.data) setRequirements(reqsResult.data);
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
    });
  };
  
  const handleReqDeactivate = (reqId: string) => {
    if (!companyId) return;
     startTransition(async () => {
        const result = await deactivateRequirementAction(companyId, reqId);
        if (result.success) {
            toast({ title: 'Requisito desactivado' });
            const reqsResult = await listRequirementsAction(companyId);
            if(reqsResult.data) setRequirements(reqsResult.data);
        } else {
             toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
     });
  };

  if (loading && !program) {
      return <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin mr-2" /> Cargando configuración...</div>
  }

  return (
    <div className="space-y-6">
       <header className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
            <Link href="/cumplimiento/admin">
                <ArrowLeft />
            </Link>
        </Button>
        <div>
            <h1 className="text-2xl font-bold">Configuración del Programa de Cumplimiento</h1>
            <p className="text-muted-foreground">Define las fechas clave y los documentos requeridos para tus subcontratistas.</p>
        </div>
      </header>
      
      <Card>
        <CardHeader>
          <CardTitle>Fechas Clave del Período</CardTitle>
          <CardDescription>Establece los días del mes para cada hito. Ej: Día 25 para corte de carga.</CardDescription>
        </CardHeader>
        <CardContent>
            {program ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="dia-corte">Día de Corte para Carga de Documentos</Label>
                        <Input id="dia-corte" type="number" min="1" max="31" value={program.diaCorteCarga || ''} onChange={(e) => setProgram({...program, diaCorteCarga: Number(e.target.value)})} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="dia-revision">Día Límite para Revisión</Label>
                        <Input id="dia-revision" type="number" min="1" max="31" value={program.diaLimiteRevision || ''} onChange={(e) => setProgram({...program, diaLimiteRevision: Number(e.target.value)})} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="dia-pago">Día Propuesto de Pago</Label>
                        <Input id="dia-pago" type="number" min="1" max="31" value={program.diaPago || ''} onChange={(e) => setProgram({...program, diaPago: Number(e.target.value)})} />
                    </div>
                </div>
            ) : <p>Cargando programa...</p>}
        </CardContent>
        <CardFooter>
            <Button onClick={handleProgramSave} disabled={isPending}>
                {isPending && <Loader2 className="animate-spin mr-2"/>}
                Guardar Fechas
            </Button>
        </CardFooter>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
            <div>
                <CardTitle>Documentos Requeridos</CardTitle>
                <CardDescription>Documentación que los subcontratistas deben presentar en cada período.</CardDescription>
            </div>
            <Button onClick={() => { setCurrentReq(initialRequirementState); setIsReqModalOpen(true); }}><PlusCircle className="mr-2"/> Nuevo Requisito</Button>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead>¿Es Obligatorio?</TableHead>
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
                <DialogTitle>{currentReq.id ? 'Editar Requisito' : 'Nuevo Requisito'}</DialogTitle>
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
                    {currentReq.id ? 'Guardar Cambios' : 'Crear Requisito'}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
