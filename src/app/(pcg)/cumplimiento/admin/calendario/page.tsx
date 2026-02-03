// src/app/(pcg)/cumplimiento/admin/calendario/page.tsx
"use client";

import React, { useState, useEffect, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { CompliancePeriod } from '@/types/pcg';
import { Loader2, Edit, Calendar as CalendarIcon, ArrowLeft, PlusCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { UserRole } from '@/lib/roles';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";


interface EditPeriodState {
  id?: string;
  nombre: string;
  corteCarga: Date;
  limiteRevision: Date;
  fechaPago: Date;
}

const initialPeriodState: EditPeriodState = {
    nombre: '',
    corteCarga: new Date(),
    limiteRevision: new Date(),
    fechaPago: new Date(),
};

async function fetchPeriods(companyId: string, token: string) {
    const res = await fetch(`/api/mclp/calendar?companyId=${companyId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to fetch periods');
    }
    return res.json();
}

async function savePeriod(companyId: string, data: EditPeriodState, token: string) {
    const isEditing = !!data.id;
    const url = isEditing ? '/api/mclp/calendar/update' : '/api/mclp/calendar';
    const body = isEditing ? { companyId, periodId: data.id, data } : { companyId, ...data };
    
    const res = await fetch(url, {
        method: 'POST', // La ruta de update también usa POST por simplicidad en la transición
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body),
    });
     if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Failed to ${isEditing ? 'update' : 'create'} period`);
    }
    return res.json();
}

function EditPeriodDialog({ period, isOpen, onClose, onSave }: { period: EditPeriodState | null, isOpen: boolean, onClose: () => void, onSave: (data: EditPeriodState) => Promise<void>}) {
    const [localPeriod, setLocalPeriod] = useState<EditPeriodState | null>(period);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setLocalPeriod(period);
    }, [period]);

    if (!localPeriod) return null;

    const handleDateChange = (field: keyof EditPeriodState, date?: Date) => {
        if (date) {
            setLocalPeriod(prev => prev ? {...prev, [field]: date} : null);
        }
    }
    
    const handleTextChange = (field: keyof EditPeriodState, value: string) => {
        setLocalPeriod(prev => prev ? {...prev, [field]: value } : null);
    }

    const handleSaveChanges = async () => {
        setIsSaving(true);
        await onSave(localPeriod);
        setIsSaving(false);
    }
    
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{localPeriod.id ? 'Editar Período' : 'Crear Nuevo Período'}</DialogTitle>
                    <DialogDescription>Define el nombre y las fechas clave para este ciclo de cumplimiento.</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label>Nombre del Período</Label>
                        <Input value={localPeriod.nombre} onChange={e => handleTextChange('nombre', e.target.value)} placeholder="Ej: Enero 2024 - Quincena 1"/>
                    </div>
                    <div className="space-y-2">
                        <Label>Fecha de corte de carga</Label>
                        <Popover><PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left font-normal"><CalendarIcon className="mr-2 h-4 w-4"/>{format(localPeriod.corteCarga, 'PPP', { locale: es })}</Button>
                        </PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={localPeriod.corteCarga} onSelect={(d) => handleDateChange('corteCarga', d)} initialFocus /></PopoverContent></Popover>
                    </div>
                     <div className="space-y-2">
                        <Label>Fecha límite de revisión</Label>
                        <Popover><PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left font-normal"><CalendarIcon className="mr-2 h-4 w-4"/>{format(localPeriod.limiteRevision, 'PPP', { locale: es })}</Button>
                        </PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={localPeriod.limiteRevision} onSelect={(d) => handleDateChange('limiteRevision', d)} /></PopoverContent></Popover>
                    </div>
                     <div className="space-y-2">
                        <Label>Fecha propuesta de pago</Label>
                        <Popover><PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left font-normal"><CalendarIcon className="mr-2 h-4 w-4"/>{format(localPeriod.fechaPago, 'PPP', { locale: es })}</Button>
                        </PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={localPeriod.fechaPago} onSelect={(d) => handleDateChange('fechaPago', d)} /></PopoverContent></Popover>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={onClose} disabled={isSaving}>Cancelar</Button>
                    <Button onClick={handleSaveChanges} disabled={isSaving}>
                        {isSaving && <Loader2 className="animate-spin mr-2"/>}
                        Guardar Período
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default function CalendarioMclpPage() {
    const { companyId, user, role } = useAuth();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    
    const [periods, setPeriods] = useState<CompliancePeriod[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingPeriod, setEditingPeriod] = useState<EditPeriodState | null>(null);

    const loadPeriods = () => {
        if (!companyId || !user) return;
        setLoading(true);
        startTransition(async () => {
            try {
                const token = await user.getIdToken();
                const data = await fetchPeriods(companyId, token);
                setPeriods(data);
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Error', description: error.message });
                setPeriods([]);
            } finally {
                setLoading(false);
            }
        });
    }

    useEffect(() => {
        loadPeriods();
    }, [companyId, user]);

    const handleEditPeriod = (period: CompliancePeriod) => {
        setEditingPeriod({
            id: period.id,
            nombre: period.nombre,
            corteCarga: new Date(period.corteCarga),
            limiteRevision: new Date(period.limiteRevision),
            fechaPago: new Date(period.fechaPago)
        });
    }

    const handleCreatePeriod = () => {
        setEditingPeriod(initialPeriodState);
    }
    
    const handleSavePeriod = async (data: EditPeriodState) => {
        if (!companyId || !user) return;

        if (data.corteCarga >= data.limiteRevision || data.limiteRevision >= data.fechaPago) {
            toast({ variant: 'destructive', title: 'Fechas inválidas', description: 'El orden debe ser: Corte Carga < Límite Revisión < Fecha Pago.' });
            return;
        }

        startTransition(async () => {
            try {
                const token = await user.getIdToken();
                await savePeriod(companyId, data, token);
                toast({ title: 'Éxito', description: 'Período guardado correctamente.' });
                setEditingPeriod(null);
                loadPeriods(); // Re-fetch
            } catch (error: any) {
                 toast({ variant: 'destructive', title: 'Error', description: error.message });
            }
        });
    }

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm" asChild>
                        <Link href="/cumplimiento/admin">
                            <ArrowLeft className="mr-2 h-4 w-4"/>Volver
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">Calendario de Períodos de Cumplimiento</h1>
                        <p className="text-muted-foreground">Crea y edita los ciclos de cumplimiento (quincenas, mensual, etc.).</p>
                    </div>
                </div>
                {(role === 'superadmin' || role === 'admin_empresa') && (
                    <Button onClick={handleCreatePeriod}>
                        <PlusCircle className="mr-2 h-4 w-4"/>
                        Crear Nuevo Período
                    </Button>
                )}
            </header>

            <Card>
                <CardHeader>
                    <CardTitle>Períodos Registrados</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? <Skeleton className="h-48 w-full"/> : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nombre del Período</TableHead>
                                    <TableHead>Corte de Carga</TableHead>
                                    <TableHead>Límite Revisión</TableHead>
                                    <TableHead>Fecha de Pago</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {periods.length === 0 ? (
                                    <TableRow><TableCell colSpan={6} className="text-center h-24">No hay períodos creados. ¡Crea el primero!</TableCell></TableRow>
                                ) : periods.map(period => (
                                    <TableRow key={period.id}>
                                        <TableCell className="font-medium">{period.nombre}</TableCell>
                                        <TableCell>{format(new Date(period.corteCarga), "dd/MM/yyyy")}</TableCell>
                                        <TableCell>{format(new Date(period.limiteRevision), "dd/MM/yyyy")}</TableCell>
                                        <TableCell>{format(new Date(period.fechaPago), "dd/MM/yyyy")}</TableCell>
                                        <TableCell><Badge variant={period.estado === 'Cerrado' ? 'secondary' : 'default'}>{period.estado}</Badge></TableCell>
                                        <TableCell className="text-right">
                                            {(role === 'superadmin' || role === 'admin_empresa') && (
                                                <Button size="sm" variant="outline" onClick={() => handleEditPeriod(period)} disabled={period.estado === 'Cerrado'}>
                                                    <Edit className="mr-2 h-4 w-4"/> Editar
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
            
            <EditPeriodDialog 
                period={editingPeriod} 
                isOpen={!!editingPeriod}
                onClose={() => setEditingPeriod(null)}
                onSave={handleSavePeriod}
            />
        </div>
    )
}
