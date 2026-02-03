// src/app/cumplimiento/admin/calendario/page.tsx
"use client";

import React, { useState, useEffect, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ComplianceCalendarMonth } from '@/types/pcg';
import { ChevronLeft, ChevronRight, Loader2, Edit, CalendarIcon, Lock, ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { UserRole } from '@/lib/roles';

interface EditMonthState {
  id: string;
  corteCarga: Date;
  limiteRevision: Date;
  fechaPago: Date;
}

async function fetchCalendarData(companyId: string, year: number, token: string) {
    const res = await fetch(`/api/mclp/calendar?companyId=${companyId}&year=${year}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to fetch calendar data');
    }
    return res.json();
}

async function updateCalendarMonth(companyId: string, year: number, monthId: string, data: any, token: string) {
    const res = await fetch('/api/mclp/calendar/update', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ companyId, year, monthId, data }),
    });
     if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update month');
    }
    return res.json();
}


function MonthCard({ month, onEdit, userRole }: { month: ComplianceCalendarMonth, onEdit: (month: ComplianceCalendarMonth) => void, userRole: UserRole }) {
  const isEditable = month.editable;
  const canEditRole = userRole === 'superadmin' || userRole === 'admin_empresa';

  return (
    <Card className={!isEditable ? 'bg-muted/50 border-dashed' : ''}>
      <CardHeader className="flex-row justify-between items-center pb-2">
        <CardTitle className="text-base font-bold">{new Date(month.id + '-02T00:00:00').toLocaleString('es-CL', { month: 'long', timeZone: 'UTC' }).toUpperCase()}</CardTitle>
        <Badge variant={isEditable ? 'default' : 'secondary'}>
          {isEditable ? 'Editable' : <><Lock className="h-3 w-3 mr-1"/>Bloqueado</>}
        </Badge>
      </CardHeader>
      <CardContent className="text-sm space-y-2">
        <div className="flex justify-between"><span>📥 Corte carga:</span><span className="font-semibold">{format(new Date(month.corteCarga), "dd 'de' MMM", { locale: es })}</span></div>
        <div className="flex justify-between"><span>🧐 Límite revisión:</span><span className="font-semibold">{format(new Date(month.limiteRevision), "dd 'de' MMM", { locale: es })}</span></div>
        <div className="flex justify-between"><span>💰 Fecha pago:</span><span className="font-semibold">{format(new Date(month.fechaPago), "dd 'de' MMM", { locale: es })}</span></div>
      </CardContent>
      <CardFooter>
        <Button size="sm" variant="outline" className="w-full" disabled={!isEditable || !canEditRole} onClick={() => onEdit(month)}>
            <Edit className="mr-2 h-4 w-4"/> Editar Fechas
        </Button>
      </CardFooter>
    </Card>
  );
}

function EditMonthDialog({ month, isOpen, onClose, onSave }: { month: EditMonthState | null, isOpen: boolean, onClose: () => void, onSave: (data: EditMonthState) => Promise<void>}) {
    const [localMonth, setLocalMonth] = useState<EditMonthState | null>(month);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if(month) {
            setLocalMonth(month);
        }
    }, [month]);

    if (!localMonth) return null;

    const handleDateChange = (field: keyof EditMonthState, date?: Date) => {
        if (date) {
            setLocalMonth(prev => prev ? {...prev, [field]: date} : null);
        }
    }

    const handleSaveChanges = async () => {
        setIsSaving(true);
        await onSave(localMonth);
        setIsSaving(false);
    }
    
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Editar Fechas de {new Date(localMonth.id + '-02T00:00:00').toLocaleString('es-CL', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label>Fecha de corte de carga</Label>
                        <Popover><PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left font-normal"><CalendarIcon className="mr-2 h-4 w-4"/>{format(localMonth.corteCarga, 'PPP', { locale: es })}</Button>
                        </PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={localMonth.corteCarga} onSelect={(d) => handleDateChange('corteCarga', d)} /></PopoverContent></Popover>
                    </div>
                     <div className="space-y-2">
                        <Label>Fecha límite de revisión</Label>
                        <Popover><PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left font-normal"><CalendarIcon className="mr-2 h-4 w-4"/>{format(localMonth.limiteRevision, 'PPP', { locale: es })}</Button>
                        </PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={localMonth.limiteRevision} onSelect={(d) => handleDateChange('limiteRevision', d)} /></PopoverContent></Popover>
                    </div>
                     <div className="space-y-2">
                        <Label>Fecha propuesta de pago</Label>
                        <Popover><PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left font-normal"><CalendarIcon className="mr-2 h-4 w-4"/>{format(localMonth.fechaPago, 'PPP', { locale: es })}</Button>
                        </PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={localMonth.fechaPago} onSelect={(d) => handleDateChange('fechaPago', d)} /></PopoverContent></Popover>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={onClose} disabled={isSaving}>Cancelar</Button>
                    <Button onClick={handleSaveChanges} disabled={isSaving}>
                        {isSaving && <Loader2 className="animate-spin mr-2"/>}
                        Guardar Cambios
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
    
    const [year, setYear] = useState(new Date().getFullYear());
    const [months, setMonths] = useState<ComplianceCalendarMonth[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingMonth, setEditingMonth] = useState<EditMonthState | null>(null);

    const loadCalendar = (targetYear: number) => {
        if (!companyId || !user) return;
        setLoading(true);
        startTransition(async () => {
            try {
                const token = await user.getIdToken();
                const data = await fetchCalendarData(companyId, targetYear, token);
                setMonths(data);
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Error', description: error.message });
                setMonths([]); // Limpiar en caso de error
            } finally {
                setLoading(false);
            }
        });
    }

    useEffect(() => {
        loadCalendar(year);
    }, [companyId, year, user]);

    const handleEditMonth = (month: ComplianceCalendarMonth) => {
        setEditingMonth({
            id: month.id,
            corteCarga: new Date(month.corteCarga),
            limiteRevision: new Date(month.limiteRevision),
            fechaPago: new Date(month.fechaPago)
        });
    }
    
    const handleSaveMonth = async (data: EditMonthState) => {
        if (!companyId || !user) return;

        if (data.corteCarga >= data.limiteRevision || data.limiteRevision >= data.fechaPago) {
            toast({ variant: 'destructive', title: 'Fechas inválidas', description: 'El orden debe ser: Corte Carga < Límite Revisión < Fecha Pago.' });
            return;
        }

        startTransition(async () => {
            try {
                const token = await user.getIdToken();
                await updateCalendarMonth(companyId, year, data.id, {
                    corteCarga: data.corteCarga.toISOString(),
                    limiteRevision: data.limiteRevision.toISOString(),
                    fechaPago: data.fechaPago.toISOString()
                }, token);
                toast({ title: 'Éxito', description: 'Fechas del mes actualizadas.' });
                setEditingMonth(null);
                loadCalendar(year); // Re-fetch
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
                        <h1 className="text-2xl font-bold">Calendario de Cumplimiento {year}</h1>
                        <p className="text-muted-foreground">Visualiza y edita las fechas clave de cada período mensual.</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => setYear(y => y-1)}><ChevronLeft/></Button>
                    <span className="font-bold text-lg w-24 text-center">{year}</span>
                    <Button variant="outline" size="icon" onClick={() => setYear(y => y+1)}><ChevronRight/></Button>
                </div>
            </header>

            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {Array.from({length: 12}).map((_, i) => <Skeleton key={i} className="h-48"/>)}
                </div>
            ) : months.length === 0 ? (
                 <Card className="text-center p-8">
                    <CardHeader>
                        <CardTitle>Calendario no generado</CardTitle>
                        <CardDescription>Parece que el calendario para el año {year} aún no se ha creado.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={() => loadCalendar(year)} disabled={isPending}>
                            {isPending && <Loader2 className="animate-spin mr-2"/>}
                            {isPending ? 'Creando...' : `Crear Calendario ${year}`}
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {months.map(month => <MonthCard key={month.id} month={month} onEdit={handleEditMonth} userRole={role} />)}
                </div>
            )}
            
            <EditMonthDialog 
                month={editingMonth} 
                isOpen={!!editingMonth}
                onClose={() => setEditingMonth(null)}
                onSave={handleSaveMonth}
            />
        </div>
    )
}
